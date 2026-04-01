const StudentChatPage = (() => {
  const DISCIPLINE_COLORS = {
    'Geografia': '#10b981',
    'Português': '#3b82f6',
    'Matemática': '#f59e0b',
    'História': '#8b5cf6',
    'Ciências': '#06b6d4',
    'Inglês': '#ec4899',
    'Arte': '#f97316',
    'Educação Física': '#84cc16'
  };
  const DISCIPLINE_ICONS = {
    'Geografia': 'fa-globe-americas',
    'Português': 'fa-book-open',
    'Matemática': 'fa-calculator',
    'História': 'fa-landmark',
    'Ciências': 'fa-flask',
    'Inglês': 'fa-language',
    'Arte': 'fa-palette',
    'Educação Física': 'fa-running'
  };

  const state = {
    disciplines: [],
    selectedDiscipline: null,
    sessionId: null,
    sourceDocumentIds: [],
    messages: [],
    sending: false,
    lastResponseId: null
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (_e) {
      return '';
    }
  }

  function getSchoolId() {
    return sessionStorage.getItem('SCHOOL_ID') || '';
  }

  async function apiJson(url, options = {}) {
    const schoolId = getSchoolId();
    const headers = {
      'Content-Type': 'application/json',
      'x-school-id': schoolId,
      ...(options.headers || {})
    };
    try {
      const token = await window.getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (_e) {
      // Student chat works without full auth too
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({ ok: false, error: 'Resposta inválida do servidor.' }));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || 'Falha na requisição.');
    }
    return payload;
  }

  function getDisciplineColor(name) {
    return DISCIPLINE_COLORS[name] || '#64748b';
  }

  function getDisciplineIcon(name) {
    return DISCIPLINE_ICONS[name] || 'fa-book';
  }

  // --- Render disciplines ---
  function renderDisciplines() {
    const container = document.getElementById('sc-discipline-list');
    if (!container) return;

    if (!state.disciplines.length) {
      container.innerHTML = `
        <div class="sc-empty-disciplines">
          <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
          <div class="small">Nenhuma disciplina com conteúdo publicado.</div>
          <div class="small text-muted mt-1">Os professores precisam publicar materiais para ativar o chat.</div>
        </div>`;
      return;
    }

    container.innerHTML = state.disciplines.map((d) => {
      const isActive = state.selectedDiscipline?.subject === d.subject;
      const color = getDisciplineColor(d.subject);
      const icon = getDisciplineIcon(d.subject);
      return `
        <div class="sc-discipline-item${isActive ? ' active' : ''}" data-subject="${escapeHtml(d.subject)}">
          <div class="d-flex align-items-center gap-2" style="gap:10px;">
            <div class="sc-discipline-icon" style="background:${color};">
              <i class="fas ${icon}"></i>
            </div>
            <div style="min-width:0;">
              <div class="font-weight-bold" style="font-size:.88rem;">${escapeHtml(d.subject)}</div>
              <div class="text-muted" style="font-size:.72rem;">${d.materials.length} material(is)</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // --- Select discipline ---
  async function selectDiscipline(subject) {
    const discipline = state.disciplines.find((d) => d.subject === subject);
    if (!discipline) return;

    state.selectedDiscipline = discipline;
    state.sourceDocumentIds = discipline.source_document_ids || [];
    state.sessionId = null;
    state.messages = [];
    state.lastResponseId = null;

    renderDisciplines();

    // Update header
    const title = document.getElementById('sc-chat-title');
    const badge = document.getElementById('sc-chat-badge');
    if (title) title.innerHTML = `<i class="fas ${getDisciplineIcon(subject)} mr-1" style="color:${getDisciplineColor(subject)};"></i>${escapeHtml(subject)}`;
    if (badge) { badge.textContent = `${discipline.materials.length} material(is)`; badge.style.display = ''; }

    // Show chat UI
    const welcome = document.getElementById('sc-welcome');
    const messages = document.getElementById('sc-messages');
    const inputArea = document.getElementById('sc-input-area');
    const actions = document.getElementById('sc-actions');
    const infoCard = document.getElementById('sc-info-card');
    if (welcome) welcome.style.display = 'none';
    if (messages) { messages.style.display = 'flex'; messages.innerHTML = ''; }
    if (inputArea) inputArea.style.display = '';
    if (actions) actions.style.display = 'flex';
    if (infoCard) infoCard.style.display = '';

    // Create session
    try {
      const result = await apiJson('/api/student-chat/session', {
        method: 'POST',
        body: JSON.stringify({
          school_id: getSchoolId(),
          discipline: subject,
          student_name: 'Aluno EJA'
        })
      });
      state.sessionId = result.session_id;

      // Welcome message from the assistant
      addMessage('assistant', `Olá! Sou o assistente de **${escapeHtml(subject)}**. Estou aqui para ajudar com dúvidas sobre o conteúdo dessa disciplina. O que você gostaria de saber?`);
    } catch (error) {
      addMessage('system', 'Erro ao iniciar a sessão. Tente novamente.');
      console.error('Erro ao criar sessão:', error);
    }

    // Focus input
    const input = document.getElementById('sc-input');
    if (input) input.focus();
  }

  // --- Messages ---
  function addMessage(role, text, extra = {}) {
    const msg = {
      role,
      text,
      time: new Date().toISOString(),
      responseId: extra.responseId || null,
      sources: extra.sources || [],
      feedback: null
    };
    state.messages.push(msg);
    renderMessage(msg, state.messages.length - 1);
    scrollToBottom();
  }

  function renderMessage(msg, index) {
    const container = document.getElementById('sc-messages');
    if (!container) return;

    const cssClass = msg.role === 'user' ? 'sc-msg-user' : msg.role === 'assistant' ? 'sc-msg-assistant' : 'sc-msg-system';
    const formattedText = formatMessageText(msg.text);

    let sourcesHtml = '';
    if (msg.sources && msg.sources.length) {
      sourcesHtml = `<div class="sc-sources">${msg.sources.map((s) =>
        `<span class="sc-source-pill"><i class="fas fa-book-open"></i>${escapeHtml(s.title)} (${s.similarity}%)</span>`
      ).join('')}</div>`;
    }

    let feedbackHtml = '';
    if (msg.role === 'assistant' && msg.responseId) {
      feedbackHtml = `
        <div class="sc-feedback" data-index="${index}">
          <button class="sc-feedback-btn" data-type="helpful" title="Útil"><i class="fas fa-thumbs-up"></i></button>
          <button class="sc-feedback-btn" data-type="not_helpful" title="Não útil"><i class="fas fa-thumbs-down"></i></button>
        </div>`;
    }

    const div = document.createElement('div');
    div.className = `sc-msg ${cssClass}`;
    div.setAttribute('data-index', index);
    div.innerHTML = `
      <div>${formattedText}</div>
      ${sourcesHtml}
      ${feedbackHtml}
      <div class="sc-msg-time">${formatTime(msg.time)}</div>`;
    container.appendChild(div);
  }

  function formatMessageText(text) {
    let formatted = escapeHtml(text);
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  function showTyping() {
    const container = document.getElementById('sc-messages');
    if (!container) return;
    const existing = container.querySelector('.sc-typing');
    if (existing) return;

    const div = document.createElement('div');
    div.className = 'sc-typing';
    div.innerHTML = '<div class="sc-typing-dot"></div><div class="sc-typing-dot"></div><div class="sc-typing-dot"></div>';
    container.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    const container = document.getElementById('sc-messages');
    if (!container) return;
    const typing = container.querySelector('.sc-typing');
    if (typing) typing.remove();
  }

  function scrollToBottom() {
    const container = document.getElementById('sc-messages');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  // --- Send message ---
  async function sendMessage() {
    if (state.sending) return;
    if (!state.sessionId || !state.selectedDiscipline) return;

    const input = document.getElementById('sc-input');
    const text = (input?.value || '').trim();
    if (!text) return;

    input.value = '';
    updateCharCount();
    autoResizeInput();

    addMessage('user', text);
    state.sending = true;
    updateSendButton();
    showTyping();

    try {
      const result = await apiJson('/api/student-chat/message', {
        method: 'POST',
        body: JSON.stringify({
          school_id: getSchoolId(),
          session_id: state.sessionId,
          message: text,
          discipline: state.selectedDiscipline.subject,
          source_document_ids: state.sourceDocumentIds
        })
      });

      hideTyping();
      state.lastResponseId = result.response_id || null;
      addMessage('assistant', result.response || 'Sem resposta.', {
        responseId: result.response_id,
        sources: result.sources || []
      });

      if (!result.has_context && !result.handled_by_safety_policy) {
        addMessage('system', 'Não encontrei conteúdo relevante nos materiais. Considere clicar em "Falar com Professor".');
      }
    } catch (error) {
      hideTyping();
      addMessage('system', `Erro: ${error.message}`);
    } finally {
      state.sending = false;
      updateSendButton();
      if (input) input.focus();
    }
  }

  function updateSendButton() {
    const btn = document.getElementById('sc-send-btn');
    if (!btn) return;
    btn.disabled = state.sending;
    btn.innerHTML = state.sending
      ? '<i class="fas fa-spinner fa-spin"></i>'
      : '<i class="fas fa-paper-plane"></i>';
  }

  // --- Feedback ---
  async function submitFeedback(index, feedbackType) {
    const msg = state.messages[index];
    if (!msg || !msg.responseId || msg.feedback === feedbackType) return;

    msg.feedback = feedbackType;

    // Update UI
    const msgEl = document.querySelector(`.sc-msg[data-index="${index}"]`);
    if (msgEl) {
      const buttons = msgEl.querySelectorAll('.sc-feedback-btn');
      buttons.forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === feedbackType);
      });
    }

    try {
      await apiJson('/api/student-chat/feedback', {
        method: 'POST',
        body: JSON.stringify({
          school_id: getSchoolId(),
          session_id: state.sessionId,
          response_id: msg.responseId,
          feedback_type: feedbackType
        })
      });
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
    }
  }

  // --- Escalate ---
  async function escalateToTeacher() {
    if (!state.sessionId || !state.selectedDiscipline) return;

    const lastUserMsg = [...state.messages].reverse().find((m) => m.role === 'user');

    try {
      const result = await Swal.fire({
        title: 'Falar com Professor',
        text: 'Deseja enviar uma solicitação ao professor dessa disciplina? Ele será notificado e poderá ver sua dúvida.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim, solicitar ajuda',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f59e0b'
      });
      if (!result.isConfirmed) return;

      await apiJson('/api/student-chat/escalate', {
        method: 'POST',
        body: JSON.stringify({
          school_id: getSchoolId(),
          session_id: state.sessionId,
          response_id: state.lastResponseId || '',
          discipline: state.selectedDiscipline.subject,
          student_message: lastUserMsg?.text || ''
        })
      });

      addMessage('system', '✅ Solicitação enviada! O professor será notificado e poderá responder em breve.');

      await Swal.fire({
        title: 'Solicitação enviada!',
        text: 'O professor da disciplina foi notificado. Você pode continuar tirando dúvidas com o assistente enquanto aguarda.',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#10b981'
      });
    } catch (error) {
      addMessage('system', 'Erro ao enviar solicitação. Tente novamente.');
      console.error('Erro ao escalar:', error);
    }
  }

  // --- New session ---
  async function startNewSession() {
    if (!state.selectedDiscipline) return;
    await selectDiscipline(state.selectedDiscipline.subject);
  }

  // --- Input helpers ---
  function updateCharCount() {
    const input = document.getElementById('sc-input');
    const counter = document.getElementById('sc-char-count');
    if (input && counter) {
      const len = (input.value || '').length;
      counter.textContent = len > 0 ? `${len}/2000` : '';
    }
  }

  function autoResizeInput() {
    const input = document.getElementById('sc-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  // --- Load disciplines ---
  async function loadDisciplines() {
    try {
      const result = await apiJson('/api/student-chat/disciplines');
      state.disciplines = result.disciplines || [];
      renderDisciplines();
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      const container = document.getElementById('sc-discipline-list');
      if (container) {
        container.innerHTML = `
          <div class="sc-empty-disciplines">
            <i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
            <div class="small text-danger">Erro ao carregar disciplinas.</div>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="StudentChatPage.reload()">Tentar novamente</button>
          </div>`;
      }
    }
  }

  // --- Event bindings ---
  function bindEvents() {
    // Discipline click
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.sc-discipline-item');
      if (item) {
        const subject = item.getAttribute('data-subject');
        if (subject) selectDiscipline(subject);
      }
    });

    // Send button
    const sendBtn = document.getElementById('sc-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    // Enter to send
    const input = document.getElementById('sc-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      input.addEventListener('input', () => {
        updateCharCount();
        autoResizeInput();
      });
    }

    // Feedback
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.sc-feedback-btn');
      if (btn) {
        const container = btn.closest('.sc-feedback');
        const index = parseInt(container?.getAttribute('data-index'), 10);
        const type = btn.getAttribute('data-type');
        if (!isNaN(index) && type) submitFeedback(index, type);
      }
    });

    // Escalate
    const escalateBtn = document.getElementById('sc-escalate-btn');
    if (escalateBtn) escalateBtn.addEventListener('click', escalateToTeacher);

    // New session
    const newSessionBtn = document.getElementById('sc-new-session-btn');
    if (newSessionBtn) newSessionBtn.addEventListener('click', startNewSession);
  }

  // --- Init ---
  async function init() {
    bindEvents();
    await loadDisciplines();
  }

  // Public API
  return {
    init,
    reload: loadDisciplines
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  StudentChatPage.init();
});

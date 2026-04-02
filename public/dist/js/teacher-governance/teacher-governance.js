const TeacherGovernancePage = (() => {
  const state = {
    sessions: [],
    selectedSessionId: null,
    summary: null,
    incidents: []
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(value) {
    if (!value) return '-';
    try { return new Date(value).toLocaleString('pt-BR'); } catch (_e) { return value; }
  }

  function formatDate(value) {
    if (!value) return '-';
    try { return new Date(value).toLocaleDateString('pt-BR'); } catch (_e) { return value; }
  }

  function statusLabel(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'OPEN') return 'Aberta';
    if (s === 'WAITING_HUMAN') return 'Aguardando professor';
    if (s === 'RESOLVED') return 'Resolvida';
    if (s === 'CLOSED') return 'Encerrada';
    return status || 'Desconhecido';
  }

  function statusPillClass(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'OPEN') return 'gov-pill gov-pill-open';
    if (s === 'WAITING_HUMAN') return 'gov-pill gov-pill-waiting';
    if (s === 'RESOLVED' || s === 'CLOSED') return 'gov-pill gov-pill-resolved';
    return 'gov-pill';
  }

  async function apiJson(url) {
    const token = await window.getAccessToken();
    const schoolId = sessionStorage.getItem('SCHOOL_ID') || '';
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-school-id': schoolId
        }
      });
    } catch (error) {
      if (error instanceof TypeError) throw new Error('Nao foi possivel conectar ao servidor.');
      throw error;
    }
    const payload = await response.json().catch(() => ({ ok: false, error: 'Resposta invalida do servidor.' }));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Falha na requisicao.');
    return payload;
  }

  // ---- Summary / KPIs ----

  async function loadSummary() {
    try {
      const payload = await apiJson('/api/teacher-governance/summary');
      state.summary = payload.summary;
      renderStats(payload.summary);
      renderDisciplines(payload.summary.top_disciplines || []);
      populateDisciplineFilter(payload.summary.top_disciplines || []);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  }

  function renderStats(s) {
    const container = document.getElementById('gov-stats');
    if (!container) return;

    const cards = [
      { value: s.total_sessions, label: 'Sessoes de chat', icon: 'fas fa-comments text-primary' },
      { value: s.open_sessions, label: 'Sessoes ativas', icon: 'fas fa-spinner text-info' },
      { value: s.total_responses, label: 'Respostas da IA', icon: 'fas fa-robot text-success' },
      { value: s.avg_confidence + '%', label: 'Confianca media', icon: 'fas fa-bullseye text-purple', color: s.avg_confidence >= 60 ? '#166534' : s.avg_confidence >= 30 ? '#92400e' : '#991b1b' },
      { value: s.feedback_helpful, label: 'Feedback positivo', icon: 'fas fa-thumbs-up text-success' },
      { value: s.feedback_not_helpful + s.feedback_incorrect, label: 'Feedback negativo', icon: 'fas fa-thumbs-down text-danger' },
      { value: s.fallback_count, label: 'Sem resposta (fallback)', icon: 'fas fa-question-circle text-warning' },
      { value: s.safety_block_count, label: 'Bloqueios de seguranca', icon: 'fas fa-shield-alt text-danger' },
      { value: s.open_incidents, label: 'Incidentes abertos', icon: 'fas fa-exclamation-triangle text-warning' },
      { value: s.escalations, label: 'Pedidos "Falar com Prof"', icon: 'fas fa-hand-paper text-info' }
    ];

    container.innerHTML = cards.map((c) => `
      <div class="gov-stat">
        <div class="stat-value" ${c.color ? `style="color:${c.color}"` : ''}><i class="${c.icon} mr-1" style="font-size:.9rem"></i>${escapeHtml(String(c.value))}</div>
        <div class="stat-label">${escapeHtml(c.label)}</div>
      </div>
    `).join('');
  }

  function renderDisciplines(disciplines) {
    const container = document.getElementById('gov-disciplines-chart');
    if (!container) return;
    if (!disciplines.length) {
      container.innerHTML = '<div class="gov-empty">Nenhuma disciplina consultada ainda.</div>';
      return;
    }
    const maxCount = Math.max(...disciplines.map((d) => d.count), 1);
    container.innerHTML = disciplines.map((d) => `
      <div class="gov-discipline-bar">
        <span class="bar-label">${escapeHtml(d.name)}</span>
        <div class="bar-fill" style="width: ${Math.round((d.count / maxCount) * 100)}%"></div>
        <span class="bar-count">${d.count}</span>
      </div>
    `).join('');
  }

  function populateDisciplineFilter(disciplines) {
    const select = document.getElementById('gov-filter-discipline');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Todas</option>' +
      disciplines.map((d) => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
    if (current) select.value = current;
  }

  // ---- Sessions ----

  async function loadSessions() {
    try {
      const params = new URLSearchParams();
      const discipline = document.getElementById('gov-filter-discipline')?.value || '';
      const status = document.getElementById('gov-filter-status')?.value || '';
      const studentName = document.getElementById('gov-filter-student')?.value || '';
      const dateFrom = document.getElementById('gov-filter-from')?.value || '';
      const dateTo = document.getElementById('gov-filter-to')?.value || '';

      if (discipline) params.set('discipline', discipline);
      if (status) params.set('status', status);
      if (studentName) params.set('student_name', studentName);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const qs = params.toString();
      const payload = await apiJson('/api/teacher-governance/sessions' + (qs ? '?' + qs : ''));
      state.sessions = payload.sessions || [];
      renderSessionList();
    } catch (error) {
      console.error('Erro ao carregar sessoes:', error);
      const container = document.getElementById('gov-session-list');
      if (container) container.innerHTML = '<div class="gov-empty">Falha ao carregar sessoes.</div>';
    }
  }

  function renderSessionList() {
    const container = document.getElementById('gov-session-list');
    const countBadge = document.getElementById('gov-session-count');
    if (!container) return;
    if (countBadge) countBadge.textContent = state.sessions.length;

    if (!state.sessions.length) {
      container.innerHTML = '<div class="gov-empty">Nenhuma sessao encontrada com esses filtros.</div>';
      return;
    }

    container.innerHTML = state.sessions.map((s) => `
      <div class="gov-session ${s.id === state.selectedSessionId ? 'active' : ''}" data-id="${escapeHtml(s.id)}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>${escapeHtml(s.student_name)}</strong>
            <div class="text-muted small mt-1">${escapeHtml(s.discipline)} &middot; ${formatDateTime(s.opened_at)}</div>
          </div>
          <span class="${statusPillClass(s.status)}">${escapeHtml(statusLabel(s.status))}</span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.gov-session').forEach((el) => {
      el.addEventListener('click', () => {
        state.selectedSessionId = el.dataset.id;
        renderSessionList();
        loadSessionDetail(el.dataset.id);
      });
    });
  }

  // ---- Session detail ----

  async function loadSessionDetail(sessionId) {
    const container = document.getElementById('gov-chat-detail');
    if (!container) return;
    container.innerHTML = '<div class="gov-empty">Carregando conversa...</div>';

    try {
      const payload = await apiJson(`/api/teacher-governance/sessions/${sessionId}`);
      renderChatDetail(payload);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      container.innerHTML = '<div class="gov-empty">Falha ao carregar a conversa.</div>';
    }
  }

  function renderChatDetail(payload) {
    const container = document.getElementById('gov-chat-detail');
    if (!container) return;

    const messages = payload.messages || [];
    const responses = payload.responses || {};
    const incidents = payload.incidents || [];

    if (!messages.length) {
      container.innerHTML = '<div class="gov-empty">Nenhuma mensagem nesta sessao.</div>';
      return;
    }

    container.innerHTML = messages.map((m) => {
      const isUser = m.role === 'user';
      const bubbleClass = isUser ? 'gov-chat-user' : 'gov-chat-assistant';
      let metaHtml = `<div class="gov-chat-meta">${escapeHtml(m.actor)} &middot; ${formatDateTime(m.created_at)}</div>`;

      if (!isUser) {
        // Find if any response has feedback for this message
        const responseEntries = Object.entries(responses);
        for (const [_rId, rData] of responseEntries) {
          if (rData.feedback && rData.feedback.length) {
            const feedbackBadges = rData.feedback.map((f) => {
              if (f.type === 'helpful') return '<span class="badge badge-success">Util</span>';
              if (f.type === 'not_helpful') return '<span class="badge badge-warning">Nao util</span>';
              if (f.type === 'incorrect') return '<span class="badge badge-danger">Incorreto</span>';
              return '';
            }).join('');
            metaHtml += `<div class="gov-chat-feedback">${feedbackBadges}</div>`;
          }
          if (rData.source_title) {
            metaHtml += `<div class="gov-chat-meta"><i class="fas fa-book-open mr-1"></i>Fonte: ${escapeHtml(rData.source_title)}</div>`;
          }
          if (rData.confidence != null) {
            const pct = Math.round((rData.confidence || 0) * 100);
            metaHtml += `<div class="gov-chat-meta"><i class="fas fa-bullseye mr-1"></i>Confianca: ${pct}%</div>`;
          }
          if (rData.fallback) {
            metaHtml += '<div class="gov-chat-meta text-warning"><i class="fas fa-exclamation-circle mr-1"></i>Sem contexto no material</div>';
          }
          if (rData.mode === 'AUTOMATIC_LIMITED') {
            metaHtml += '<div class="gov-chat-meta text-danger"><i class="fas fa-shield-alt mr-1"></i>Bloqueio de seguranca</div>';
          }
        }
      }

      return `<div class="gov-chat-bubble ${bubbleClass}">${escapeHtml(m.text)}${metaHtml}</div>`;
    }).join('');

    // Render session incidents in the incident section too
    if (incidents.length) {
      renderSessionIncidents(incidents);
    }
  }

  // ---- Incidents ----

  async function loadIncidents() {
    try {
      const payload = await apiJson('/api/teacher-governance/incidents?status=OPEN');
      state.incidents = payload.incidents || [];
      renderIncidents();
    } catch (error) {
      console.error('Erro ao carregar incidentes:', error);
    }
  }

  function renderIncidents() {
    const container = document.getElementById('gov-incident-list');
    const countBadge = document.getElementById('gov-incident-count');
    if (!container) return;
    if (countBadge) countBadge.textContent = state.incidents.length;

    if (!state.incidents.length) {
      container.innerHTML = '<div class="gov-empty">Nenhum incidente aberto.</div>';
      return;
    }

    container.innerHTML = state.incidents.map((i) => `
      <div class="gov-incident-card sev-${String(i.severity || 'low').toLowerCase()}" data-session-id="${escapeHtml(i.consultation_id || '')}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>${escapeHtml(i.topic || 'Incidente')}</strong>
            <div class="text-muted small mt-1">${escapeHtml(i.discipline || '')} &middot; ${formatDateTime(i.opened_at)}</div>
            ${i.student_message ? `<div class="small mt-1 text-dark">"${escapeHtml(i.student_message.slice(0, 120))}"</div>` : ''}
          </div>
          <div class="d-flex flex-column align-items-end" style="gap:4px">
            <span class="gov-pill gov-pill-escalation">${escapeHtml(i.type === 'STUDENT_ESCALATION' ? 'Falar com Prof' : i.type)}</span>
            <span class="gov-pill">${escapeHtml(i.status)}</span>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.gov-incident-card').forEach((el) => {
      el.addEventListener('click', () => {
        const sessionId = el.dataset.sessionId;
        if (sessionId) {
          state.selectedSessionId = sessionId;
          renderSessionList();
          loadSessionDetail(sessionId);
        }
      });
    });
  }

  function renderSessionIncidents(incidents) {
    const container = document.getElementById('gov-incident-list');
    const countBadge = document.getElementById('gov-incident-count');
    if (!container) return;
    if (countBadge) countBadge.textContent = incidents.length;

    container.innerHTML = incidents.map((i) => `
      <div class="gov-incident-card sev-${String(i.severity || 'low').toLowerCase()}">
        <strong>${escapeHtml(i.topic || 'Incidente')}</strong>
        <div class="text-muted small">${escapeHtml(i.type === 'STUDENT_ESCALATION' ? 'Escalonamento do aluno' : i.type)} &middot; ${escapeHtml(i.severity)} &middot; ${escapeHtml(i.status)}</div>
        <div class="small mt-1">${formatDateTime(i.opened_at)}</div>
      </div>
    `).join('');
  }

  // ---- Init ----

  function bindEvents() {
    document.getElementById('gov-refresh-btn')?.addEventListener('click', () => {
      loadAll();
    });
    document.getElementById('gov-filter-apply')?.addEventListener('click', () => {
      loadSessions();
    });
    document.getElementById('gov-filter-status')?.addEventListener('change', () => {
      loadSessions();
    });
  }

  async function loadAll() {
    await Promise.all([loadSummary(), loadSessions(), loadIncidents()]);
  }

  async function init() {
    bindEvents();
    await loadAll();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const checkReady = setInterval(() => {
      if (typeof window.getAccessToken === 'function') {
        clearInterval(checkReady);
        init().catch((err) => console.error('Erro ao iniciar painel de governanca:', err));
      }
    }, 150);
  });

  return { init, loadAll };
})();

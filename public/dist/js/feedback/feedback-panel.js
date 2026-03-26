const FeedbackPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const TYPE_LABELS = { helpful: 'Positivo', not_helpful: 'Nao util', incorrect: 'Incorreto' };
  const TYPE_BADGE = { helpful: 'fb-badge-helpful', not_helpful: 'fb-badge-not_helpful', incorrect: 'fb-badge-incorrect' };
  const TYPE_CARD = { helpful: 'feedback-helpful', not_helpful: 'feedback-not_helpful', incorrect: 'feedback-incorrect' };
  const TYPE_ICON = { helpful: 'fa-thumbs-up', not_helpful: 'fa-thumbs-down', incorrect: 'fa-times-circle' };

  let allFeedbacks = [];

  async function ensureAuthenticatedContext() {
    if (typeof window.initSession === 'function') {
      const sessionInfo = await window.initSession();
      if (!sessionInfo) throw new Error('session_init_failed');
    }
  }

  async function getAuthHeaders() {
    const token = await window.getAccessToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function truncate(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    return text.substring(0, maxLen) + '...';
  }

  function renderFeedbackCard(fb) {
    const typeBadge = `<span class="fb-badge ${TYPE_BADGE[fb.feedback_type] || TYPE_BADGE.helpful}"><i class="fas ${TYPE_ICON[fb.feedback_type] || TYPE_ICON.helpful} mr-1"></i>${TYPE_LABELS[fb.feedback_type] || fb.feedback_type}</span>`;
    const schoolLabel = fb.school_name ? ` &middot; <i class="fas fa-school"></i> ${escapeHtml(fb.school_name)}` : '';
    const assistantLabel = fb.assistant_key ? `<span class="feedback-meta ml-2"><i class="fas fa-robot"></i> ${escapeHtml(fb.assistant_key)}</span>` : '';
    const confidenceLabel = fb.confidence_score != null ? `<span class="feedback-meta ml-2"><i class="fas fa-signal"></i> ${Number(fb.confidence_score * 100).toFixed(0)}%</span>` : '';
    const sourceLabel = fb.supporting_source_title ? `<span class="feedback-meta ml-2"><i class="fas fa-book"></i> ${escapeHtml(truncate(fb.supporting_source_title, 40))}</span>` : '';

    let correctionBadge = '';
    if (fb.feedback_type === 'incorrect') {
      correctionBadge = fb.has_correction
        ? ' <span class="fb-badge fb-badge-corrected"><i class="fas fa-check mr-1"></i>Corrigido</span>'
        : ' <span class="fb-badge fb-badge-pending"><i class="fas fa-clock mr-1"></i>Pendente</span>';
    }

    let responsePreview = '';
    if (fb.response_text) {
      responsePreview = `<div class="feedback-response-preview"><i class="fas fa-robot mr-1 text-muted"></i>${escapeHtml(truncate(fb.response_text, 200))}</div>`;
    }

    let commentHtml = '';
    if (fb.comment) {
      commentHtml = `<div class="feedback-meta mt-2"><i class="fas fa-comment mr-1"></i>${escapeHtml(truncate(fb.comment, 150))}</div>`;
    }

    return `<div class="feedback-card ${TYPE_CARD[fb.feedback_type] || TYPE_CARD.helpful}" data-feedback-id="${fb.id}" onclick="FeedbackPanelPage.viewFeedback('${fb.id}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          ${typeBadge}${correctionBadge}
          <div class="mt-1">${assistantLabel}${confidenceLabel}${sourceLabel}</div>
        </div>
        <div class="feedback-meta text-right">
          ${formatDate(fb.created_at)}${schoolLabel}
        </div>
      </div>
      ${responsePreview}
      ${commentHtml}
      <div class="feedback-meta mt-1">
        <i class="fas fa-user mr-1"></i>${escapeHtml(fb.created_by || 'Cidadao')}
      </div>
    </div>`;
  }

  function renderList(feedbacks) {
    const container = document.getElementById('feedback-list');
    const countLabel = document.getElementById('feedback-count-label');
    countLabel.textContent = feedbacks.length + ' feedback' + (feedbacks.length !== 1 ? 's' : '');
    if (!feedbacks.length) {
      container.innerHTML = '<div class="feedback-empty"><i class="fas fa-comment-slash fa-2x mb-2 d-block"></i>Nenhum feedback encontrado.</div>';
      return;
    }
    container.innerHTML = feedbacks.map(renderFeedbackCard).join('');
  }

  function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const pendingOnly = document.getElementById('filter-pending-only').checked;
    let filtered = [...allFeedbacks];
    if (type) filtered = filtered.filter(f => f.feedback_type === type);
    if (pendingOnly) filtered = filtered.filter(f => f.feedback_type === 'incorrect' && !f.has_correction);
    renderList(filtered);
  }

  async function loadFeedbacks() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/feedback?_t=' + Date.now(), { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar feedbacks.');
    allFeedbacks = data.feedbacks || [];
    applyFilters();
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/feedback/stats/summary?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) return;
      const s = data.stats || {};
      document.getElementById('stat-helpful').textContent = s.helpful ?? '-';
      document.getElementById('stat-not-helpful').textContent = s.not_helpful ?? '-';
      document.getElementById('stat-incorrect').textContent = s.incorrect ?? '-';
      document.getElementById('stat-positive-rate').textContent = s.positive_rate != null ? s.positive_rate + '%' : '-';
      document.getElementById('stat-pending').textContent = s.pending_correction ?? '-';
    } catch (e) {
      console.warn('Erro ao carregar stats de feedback:', e);
    }
  }

  async function viewFeedback(id) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/feedback/${id}`, { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar feedback.');

      const fb = data.feedback;
      const resp = fb.response || {};
      const evidence = fb.evidence || [];

      const typeBadge = `<span class="fb-badge ${TYPE_BADGE[fb.feedback_type] || TYPE_BADGE.helpful}"><i class="fas ${TYPE_ICON[fb.feedback_type] || TYPE_ICON.helpful} mr-1"></i>${TYPE_LABELS[fb.feedback_type] || fb.feedback_type}</span>`;

      let correctionBadge = '';
      if (fb.feedback_type === 'incorrect') {
        correctionBadge = resp.corrected_at
          ? ` <span class="fb-badge fb-badge-corrected"><i class="fas fa-check mr-1"></i>Corrigido por ${escapeHtml(resp.corrected_by || '-')} em ${formatDate(resp.corrected_at)}</span>`
          : ' <span class="fb-badge fb-badge-pending"><i class="fas fa-clock mr-1"></i>Pendente de correcao</span>';
      }

      let responseHtml = '';
      if (resp.response_text) {
        responseHtml = `<hr><p class="font-weight-bold mb-1"><i class="fas fa-robot mr-1"></i>Resposta da IA</p>
          <div class="feedback-response-preview">${escapeHtml(resp.response_text)}</div>
          <div class="feedback-meta mt-2">
            ${resp.confidence_score != null ? '<i class="fas fa-signal mr-1"></i>Confianca: ' + Number(resp.confidence_score * 100).toFixed(0) + '% &middot; ' : ''}
            ${resp.response_mode ? 'Modo: ' + escapeHtml(resp.response_mode) + ' &middot; ' : ''}
            ${resp.fallback_to_human ? '<span class="text-warning"><i class="fas fa-hand-paper mr-1"></i>Fallback humano</span> &middot; ' : ''}
            Entregue em ${formatDate(resp.delivered_at)}
          </div>`;
      }

      let sourceHtml = '';
      if (resp.supporting_source_title) {
        sourceHtml = `<div class="mt-2"><p class="font-weight-bold mb-1"><i class="fas fa-book mr-1"></i>Fonte Utilizada</p>
          <p class="mb-1">${escapeHtml(resp.supporting_source_title)}</p>
          ${resp.supporting_source_excerpt ? '<p class="feedback-meta" style="font-style:italic;">"' + escapeHtml(truncate(resp.supporting_source_excerpt, 300)) + '"</p>' : ''}
          ${resp.supporting_source_version_label ? '<p class="feedback-meta">Versao: ' + escapeHtml(resp.supporting_source_version_label) + '</p>' : ''}
        </div>`;
      }

      let evidenceHtml = '';
      if (evidence.length) {
        evidenceHtml = '<hr><p class="font-weight-bold mb-2"><i class="fas fa-search mr-1"></i>Evidencias de Recuperacao</p>' +
          evidence.map(ev => `<div class="evidence-item">
            <div class="ev-title">${escapeHtml(ev.source_title || 'Fonte institucional')}${ev.used_as_primary ? ' <span class="badge badge-info">Principal</span>' : ''}</div>
            ${ev.source_excerpt ? '<div class="ev-excerpt">"' + escapeHtml(truncate(ev.source_excerpt, 250)) + '"</div>' : ''}
            ${ev.relevance_score != null ? '<div class="feedback-meta mt-1">Relevancia: ' + Number(ev.relevance_score * 100).toFixed(0) + '%</div>' : ''}
          </div>`).join('');
      }

      let commentHtml = '';
      if (fb.comment) {
        commentHtml = `<hr><p class="font-weight-bold mb-1"><i class="fas fa-comment mr-1"></i>Comentario do Avaliador</p>
          <p>${escapeHtml(fb.comment)}</p>`;
      }

      document.getElementById('feedbackDetailTitle').textContent = TYPE_LABELS[fb.feedback_type] || 'Feedback';
      document.getElementById('feedbackDetailBody').innerHTML = `
        <div class="mb-3">${typeBadge}${correctionBadge}</div>
        <p class="feedback-meta"><i class="fas fa-clock mr-1"></i>Registrado em ${formatDate(fb.created_at)}</p>
        <p class="feedback-meta"><i class="fas fa-user mr-1"></i>${escapeHtml(fb.created_by || 'Cidadao')}</p>
        ${fb.school_name ? '<p class="feedback-meta"><i class="fas fa-school mr-1"></i>' + escapeHtml(fb.school_name) + '</p>' : ''}
        ${responseHtml}
        ${sourceHtml}
        ${evidenceHtml}
        ${commentHtml}
      `;

      $('#feedbackDetailModal').modal('show');
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function init() {
    try {
      await ensureAuthenticatedContext();

      document.getElementById('filter-type').addEventListener('change', applyFilters);
      document.getElementById('filter-pending-only').addEventListener('change', applyFilters);

      await Promise.all([loadFeedbacks(), loadStats()]);

      document.getElementById('feedback-loading').style.display = 'none';
      document.getElementById('feedback-root').style.display = '';
    } catch (err) {
      console.error('FeedbackPanelPage init error:', err);
      document.getElementById('feedback-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar o painel de feedback. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return { viewFeedback };
})();

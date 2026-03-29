const HandoffQueuePanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const STATUS_LABELS = { WAITING_HUMAN: 'Aguardando Humano', OPEN: 'Aberta', IN_PROGRESS: 'Em Andamento', RESOLVED: 'Resolvida', CLOSED: 'Fechada' };
  const STATUS_BADGE = { WAITING_HUMAN: 'badge-hq-waiting_human', OPEN: 'badge-hq-open', IN_PROGRESS: 'badge-hq-in_progress' };
  const STATUS_CARD = { WAITING_HUMAN: 'hq-st-waiting_human', OPEN: 'hq-st-open', IN_PROGRESS: 'hq-st-in_progress' };

  let allItems = [];

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

  function formatWait(minutes) {
    if (minutes == null) return '-';
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + 'h ' + (m ? m + 'min' : '');
  }

  function waitClass(minutes) {
    if (minutes >= 60) return 'hq-wait-urgent';
    if (minutes >= 30) return 'hq-wait-warning';
    return 'hq-wait-normal';
  }

  function truncate(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    return text.substring(0, maxLen) + '...';
  }

  function renderCard(item) {
    const stBadge = `<span class="hq-badge ${STATUS_BADGE[item.status] || ''}">${STATUS_LABELS[item.status] || item.status}</span>`;
    const schoolLabel = item.school_name ? ` &middot; <i class="fas fa-school"></i> ${escapeHtml(item.school_name)}` : '';
    const waitLabel = `<span class="${waitClass(item.wait_minutes)}"><i class="fas fa-clock mr-1"></i>${formatWait(item.wait_minutes)}</span>`;

    let responsePreview = '';
    if (item.last_response && item.last_response.response_text) {
      const conf = item.last_response.confidence_score != null ? ` (confianca: ${Math.round(item.last_response.confidence_score * 100)}%)` : '';
      responsePreview = `<div class="hq-meta mt-2" style="font-style:italic;"><i class="fas fa-robot mr-1"></i>${escapeHtml(truncate(item.last_response.response_text, 150))}${conf}</div>`;
    }

    const fallbackBadge = item.last_response && item.last_response.fallback_to_human
      ? ' <span class="badge badge-danger ml-1"><i class="fas fa-exclamation-triangle mr-1"></i>Fallback</span>' : '';

    return `<div class="hq-card ${STATUS_CARD[item.status] || ''}" onclick="HandoffQueuePanelPage.viewConsultation('${item.id}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>${stBadge}${fallbackBadge}</div>
        <div class="hq-meta text-right">${waitLabel}${schoolLabel}</div>
      </div>
      <div class="mt-2"><strong>${escapeHtml(item.primary_topic || 'Sem topico')}</strong></div>
      ${responsePreview}
      <div class="hq-meta mt-1">
        <i class="fas fa-user mr-1"></i>${escapeHtml(item.requester_name || 'Desconhecido')}
        &middot; <i class="fas fa-calendar-alt mr-1"></i>${formatDate(item.opened_at)}
        ${item.channel ? ' &middot; <i class="fas fa-comments mr-1"></i>' + escapeHtml(item.channel) : ''}
      </div>
    </div>`;
  }

  function renderList(items) {
    const container = document.getElementById('hq-list');
    const countLabel = document.getElementById('hq-count-label');
    countLabel.textContent = items.length + ' conversa' + (items.length !== 1 ? 's' : '');
    if (!items.length) {
      container.innerHTML = '<div class="hq-empty"><i class="fas fa-check-double fa-2x mb-2 d-block"></i>Nenhuma conversa na fila.</div>';
      return;
    }
    container.innerHTML = items.map(renderCard).join('');
  }

  function applyFilters() {
    const status = document.getElementById('filter-status').value;
    let filtered = [...allItems];
    if (status) filtered = filtered.filter(i => i.status === status);
    renderList(filtered);
  }

  async function loadQueue() {
    const headers = await getAuthHeaders();
    const status = document.getElementById('filter-status').value || '';
    const url = '/api/handoff-queue?status=' + encodeURIComponent(status) + '&_t=' + Date.now();
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar fila.');
    allItems = data.queue || [];
    renderList(allItems);
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/handoff-queue/stats?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) return;
      const s = data.stats || {};
      document.getElementById('stat-waiting').textContent = s.waiting ?? '-';
      document.getElementById('stat-open').textContent = s.open ?? '-';
      document.getElementById('stat-in-progress').textContent = s.in_progress ?? '-';
      document.getElementById('stat-resolved-today').textContent = s.resolved_today ?? '-';
      document.getElementById('stat-avg-wait').textContent = s.avg_wait_minutes != null ? s.avg_wait_minutes : '-';
    } catch (e) {
      console.warn('Failed to load handoff queue stats:', e);
    }
  }

  function viewConsultation(consultationId) {
    const modal = $('#hqDetailModal');
    const body = document.getElementById('hqDetailBody');
    const footer = document.getElementById('hqDetailFooter');
    body.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-success"></div></div>';
    footer.innerHTML = '<button class="btn btn-secondary" data-dismiss="modal">Fechar</button>';
    modal.modal('show');

    const item = allItems.find(i => i.id === consultationId);
    if (!item) {
      body.innerHTML = '<div class="alert alert-warning">Conversa nao encontrada.</div>';
      return;
    }

    const lr = item.last_response;
    let responseSection = '';
    if (lr) {
      const confLabel = lr.confidence_score != null ? Math.round(lr.confidence_score * 100) + '%' : '-';
      responseSection = `
        <hr>
        <h6><i class="fas fa-robot mr-1"></i>Ultima Resposta da IA</h6>
        <div class="row mb-2">
          <div class="col-sm-4"><strong>Assistente:</strong> ${escapeHtml(lr.assistant_key || '-')}</div>
          <div class="col-sm-4"><strong>Confianca:</strong> ${confLabel}</div>
          <div class="col-sm-4"><strong>Modo:</strong> ${escapeHtml(lr.response_mode || '-')}</div>
        </div>
        ${lr.fallback_to_human ? '<div class="alert alert-danger py-1 px-2 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>IA solicitou fallback para humano</div>' : ''}
        ${lr.response_text ? '<div class="p-3 bg-light border rounded mb-3" style="white-space:pre-wrap;max-height:200px;overflow-y:auto;">' + escapeHtml(lr.response_text) + '</div>' : ''}
      `;
    }

    body.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Status:</strong> <span class="hq-badge ${STATUS_BADGE[item.status] || ''}">${STATUS_LABELS[item.status] || item.status}</span></p>
          <p><strong>Topico:</strong> ${escapeHtml(item.primary_topic || '-')}</p>
          <p><strong>Canal:</strong> ${escapeHtml(item.channel || '-')}</p>
          <p><strong>Assistente:</strong> ${escapeHtml(item.assigned_assistant_key || '-')}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Solicitante:</strong> ${escapeHtml(item.requester_name || '-')}</p>
          <p><strong>Escola:</strong> ${escapeHtml(item.school_name || '-')}</p>
          <p><strong>Aberta em:</strong> ${formatDate(item.opened_at)}</p>
          <p><strong>Tempo de espera:</strong> <span class="${waitClass(item.wait_minutes)}">${formatWait(item.wait_minutes)}</span></p>
        </div>
      </div>
      ${responseSection}
    `;

    footer.innerHTML = '<button class="btn btn-secondary" data-dismiss="modal">Fechar</button>';
  }

  async function init() {
    try {
      if (typeof window.initSession === 'function') {
        const sessionInfo = await window.initSession();
        if (!sessionInfo) throw new Error('session_init_failed');
      }

      document.getElementById('filter-status').addEventListener('change', () => {
        loadQueue();
      });

      await Promise.all([loadQueue(), loadStats()]);

      document.getElementById('hq-loading').style.display = 'none';
      document.getElementById('hq-root').style.display = '';
    } catch (err) {
      console.error('HandoffQueuePanelPage init error:', err);
      document.getElementById('hq-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar a fila de atendimento. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return { viewConsultation };
})();

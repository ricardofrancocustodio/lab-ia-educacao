const IncidentsPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const MANAGE_ROLES = new Set(['superadmin', 'network_manager', 'auditor']);
  const SEVERITY_LABELS = { CRITICAL: 'Critica', HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baixa' };
  const SEVERITY_BADGE = { CRITICAL: 'badge-sev-critical', HIGH: 'badge-sev-high', MEDIUM: 'badge-sev-medium', LOW: 'badge-sev-low' };
  const SEVERITY_CARD = { CRITICAL: 'incident-sev-critical', HIGH: 'incident-sev-high', MEDIUM: 'incident-sev-medium', LOW: 'incident-sev-low' };
  const STATUS_LABELS = { OPEN: 'Aberto', IN_REVIEW: 'Em Revisao', RESOLVED: 'Resolvido', DISMISSED: 'Descartado' };
  const STATUS_BADGE = { OPEN: 'badge-st-open', IN_REVIEW: 'badge-st-in_review', RESOLVED: 'badge-st-resolved', DISMISSED: 'badge-st-dismissed' };

  let allIncidents = [];
  let effectiveRole = '';
  let canManage = false;

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

  function renderIncidentCard(inc) {
    const sevBadge = `<span class="incident-badge ${SEVERITY_BADGE[inc.severity] || SEVERITY_BADGE.LOW}">${SEVERITY_LABELS[inc.severity] || inc.severity}</span>`;
    const stBadge = `<span class="incident-badge ${STATUS_BADGE[inc.status] || STATUS_BADGE.OPEN}">${STATUS_LABELS[inc.status] || inc.status}</span>`;
    const schoolLabel = inc.school_name ? ` &middot; <i class="fas fa-school"></i> ${escapeHtml(inc.school_name)}` : '';
    const topicLabel = inc.topic ? `<span class="incident-meta ml-2"><i class="fas fa-tag"></i> ${escapeHtml(inc.topic)}</span>` : '';
    const typeLabel = inc.incident_type ? `<span class="incident-meta ml-2">${escapeHtml(inc.incident_type)}</span>` : '';

    return `<div class="incident-card ${SEVERITY_CARD[inc.severity] || SEVERITY_CARD.LOW}" data-incident-id="${inc.id}" onclick="IncidentsPanelPage.viewIncident('${inc.id}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          <span class="font-weight-bold" style="font-size:1.02rem; color:#17324d;">${escapeHtml(inc.incident_type || 'Incidente')}</span>
          ${topicLabel}
          <div class="mt-1">${sevBadge} ${stBadge}${typeLabel ? '' : ''}</div>
        </div>
        <div class="incident-meta text-right">
          ${formatDate(inc.opened_at)}${schoolLabel}
        </div>
      </div>
      <div class="incident-meta mt-2">
        <i class="fas fa-user mr-1"></i>${escapeHtml(inc.opened_by || 'Sistema')}
        ${inc.resolved_at ? ' &middot; <i class="fas fa-check-circle text-success mr-1"></i>Resolvido em ' + formatDate(inc.resolved_at) : ''}
      </div>
    </div>`;
  }

  function renderList(incidents) {
    const container = document.getElementById('incidents-list');
    const countLabel = document.getElementById('incident-count-label');
    countLabel.textContent = incidents.length + ' incidente' + (incidents.length !== 1 ? 's' : '');
    if (!incidents.length) {
      container.innerHTML = '<div class="incident-empty"><i class="fas fa-shield-alt fa-2x mb-2 d-block"></i>Nenhum incidente encontrado.</div>';
      return;
    }
    container.innerHTML = incidents.map(renderIncidentCard).join('');
  }

  function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const severity = document.getElementById('filter-severity').value;
    let filtered = [...allIncidents];
    if (status) filtered = filtered.filter(i => i.status === status);
    if (severity) filtered = filtered.filter(i => i.severity === severity);
    renderList(filtered);
  }

  async function loadIncidents() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/incidents?_t=' + Date.now(), { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar incidentes.');
    allIncidents = data.incidents || [];
    applyFilters();
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/incidents/stats/summary?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) return;
      const s = data.stats || {};
      document.getElementById('stat-open').textContent = s.open ?? '-';
      document.getElementById('stat-review').textContent = s.in_review ?? '-';
      document.getElementById('stat-critical').textContent = s.critical_open ?? '-';
      document.getElementById('stat-resolved').textContent = s.resolved ?? '-';
      document.getElementById('stat-avg-hours').textContent = s.avg_resolution_hours ?? '-';
    } catch (e) {
      console.warn('Erro ao carregar stats de incidentes:', e);
    }
  }

  async function viewIncident(id) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/incidents/${id}`, { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar incidente.');

      const inc = data.incident;
      const sevBadge = `<span class="incident-badge ${SEVERITY_BADGE[inc.severity] || SEVERITY_BADGE.LOW}">${SEVERITY_LABELS[inc.severity] || inc.severity}</span>`;
      const stBadge = `<span class="incident-badge ${STATUS_BADGE[inc.status] || STATUS_BADGE.OPEN}">${STATUS_LABELS[inc.status] || inc.status}</span>`;

      let detailsHtml = '';
      if (inc.details && typeof inc.details === 'object') {
        const entries = Object.entries(inc.details);
        if (entries.length) {
          detailsHtml = '<hr><p class="font-weight-bold mb-2">Detalhes</p><table class="table table-sm table-bordered"><tbody>' +
            entries.map(([k, v]) => `<tr><td class="font-weight-bold" style="width:35%">${escapeHtml(k)}</td><td>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</td></tr>`).join('') +
            '</tbody></table>';
        }
      }

      let resolutionHtml = '';
      if (inc.resolved_at) {
        resolutionHtml = `<hr><p class="font-weight-bold mb-1">Resolucao</p>
          <p class="incident-meta"><i class="fas fa-user mr-1"></i>${escapeHtml(inc.resolved_by || '-')} &middot; ${formatDate(inc.resolved_at)}</p>
          ${inc.resolution_notes ? '<p>' + escapeHtml(inc.resolution_notes) + '</p>' : ''}`;
      }

      document.getElementById('incidentDetailTitle').textContent = inc.incident_type || 'Incidente';
      document.getElementById('incidentDetailBody').innerHTML = `
        <div class="mb-3">${sevBadge} ${stBadge}</div>
        <p class="incident-meta"><i class="fas fa-clock mr-1"></i>Aberto em ${formatDate(inc.opened_at)}</p>
        <p class="incident-meta"><i class="fas fa-user mr-1"></i>Reportado por ${escapeHtml(inc.opened_by || 'Sistema')}</p>
        ${inc.topic ? '<p class="incident-meta"><i class="fas fa-tag mr-1"></i>Topico: ' + escapeHtml(inc.topic) + '</p>' : ''}
        ${inc.school_name ? '<p class="incident-meta"><i class="fas fa-school mr-1"></i>' + escapeHtml(inc.school_name) + '</p>' : ''}
        ${detailsHtml}
        ${resolutionHtml}
      `;

      const footer = document.getElementById('incidentDetailFooter');
      if (canManage && (inc.status === 'OPEN' || inc.status === 'IN_REVIEW')) {
        footer.style.display = '';
        footer.innerHTML = `
          ${inc.status === 'OPEN' ? '<button class="btn btn-sm btn-outline-info" onclick="IncidentsPanelPage.updateStatus(\'' + inc.id + '\', \'IN_REVIEW\')"><i class="fas fa-search mr-1"></i>Iniciar Revisao</button>' : ''}
          <button class="btn btn-sm btn-outline-success" onclick="IncidentsPanelPage.updateStatus('${inc.id}', 'RESOLVED')"><i class="fas fa-check mr-1"></i>Resolver</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="IncidentsPanelPage.updateStatus('${inc.id}', 'DISMISSED')"><i class="fas fa-times mr-1"></i>Descartar</button>
        `;
      } else {
        footer.style.display = 'none';
        footer.innerHTML = '';
      }

      $('#incidentDetailModal').modal('show');
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function updateStatus(id, newStatus) {
    let resolutionNotes = '';
    if (newStatus === 'RESOLVED' || newStatus === 'DISMISSED') {
      const { value } = await Swal.fire({
        title: newStatus === 'RESOLVED' ? 'Resolver incidente' : 'Descartar incidente',
        input: 'textarea',
        inputLabel: 'Notas de resolucao (opcional)',
        inputPlaceholder: 'Descreva a resolucao ou motivo...',
        showCancelButton: true,
        confirmButtonText: newStatus === 'RESOLVED' ? 'Resolver' : 'Descartar',
        cancelButtonText: 'Cancelar'
      });
      if (value === undefined) return;
      resolutionNotes = value || '';
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/incidents/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus, resolution_notes: resolutionNotes })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao atualizar status.');

      $('#incidentDetailModal').modal('hide');
      Swal.fire({ icon: 'success', title: 'Status atualizado', timer: 1500, showConfirmButton: false });
      await Promise.all([loadIncidents(), loadStats()]);
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function init() {
    try {
      await ensureAuthenticatedContext();
      effectiveRole = sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('USER_ROLE') || '';
      canManage = MANAGE_ROLES.has(effectiveRole);

      document.getElementById('filter-status').addEventListener('change', applyFilters);
      document.getElementById('filter-severity').addEventListener('change', applyFilters);

      await Promise.all([loadIncidents(), loadStats()]);

      document.getElementById('incidents-loading').style.display = 'none';
      document.getElementById('incidents-root').style.display = '';
    } catch (err) {
      console.error('IncidentsPanelPage init error:', err);
      document.getElementById('incidents-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar o painel de incidentes. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return { viewIncident, updateStatus };
})();

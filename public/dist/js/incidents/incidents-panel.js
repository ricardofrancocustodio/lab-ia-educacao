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

      let assignedHtml = '';
      if (inc.assigned_to) {
        assignedHtml = `<p class="incident-meta"><i class="fas fa-user-check mr-1" style="color:#1565c0;"></i>Atribuido a: <strong>${escapeHtml(inc.assigned_to)}</strong>${inc.assigned_at ? ' &middot; ' + formatDate(inc.assigned_at) : ''}</p>`;
      }

      const qs = inc.quarantine_status || {};
      const quarantineBadge = qs.quarantined
        ? `<span class="incident-badge" style="background:#6c3483;color:#fff;"><i class="fas fa-lock mr-1"></i>Em quarentena</span>`
        : '';
      let quarantineInfoHtml = '';
      if (qs.quarantined) {
        quarantineInfoHtml = `<hr><div class="alert alert-warning mb-0 py-2 px-3" style="border-left:4px solid #6c3483;">
          <p class="mb-1 font-weight-bold" style="color:#6c3483;"><i class="fas fa-lock mr-1"></i>Resposta em Quarentena</p>
          <p class="incident-meta mb-0"><i class="fas fa-user mr-1"></i>${escapeHtml(qs.quarantined_by || '-')} &middot; ${formatDate(qs.quarantined_at)}</p>
          ${qs.reason ? '<p class="mb-0 mt-1 small">' + escapeHtml(qs.reason) + '</p>' : ''}
        </div>`;
      }

      // Contexto de diagnostico: pergunta original, resposta da IA, evidencias
      let diagnosticHtml = '';
      if (inc.original_question || inc.response) {
        const resp = inc.response || {};
        const confidencePct = resp.confidence_score != null ? (resp.confidence_score * 100).toFixed(0) : null;
        const confidenceColor = confidencePct != null ? (confidencePct >= 70 ? '#28a745' : confidencePct >= 40 ? '#ffc107' : '#dc3545') : '#6c757d';
        const modeLabels = { AUTOMATIC: 'Automatico', MANUAL: 'Manual', HYBRID: 'Hibrido' };

        diagnosticHtml = `<hr>
          <p class="font-weight-bold mb-2" style="color:#0d47a1;"><i class="fas fa-microscope mr-1"></i>Contexto de Diagnostico</p>`;

        if (inc.original_question) {
          diagnosticHtml += `<div class="mb-3 p-2" style="background:#e8f5e9; border-left:4px solid #43a047; border-radius:4px;">
            <p class="mb-1 small font-weight-bold" style="color:#2e7d32;"><i class="fas fa-question-circle mr-1"></i>Pergunta Original do Cidadao</p>
            <p class="mb-0">${escapeHtml(inc.original_question)}</p>
          </div>`;
        }

        if (resp.response_text) {
          diagnosticHtml += `<div class="mb-3 p-2" style="background:#e3f2fd; border-left:4px solid #1565c0; border-radius:4px;">
            <p class="mb-1 small font-weight-bold" style="color:#1565c0;"><i class="fas fa-robot mr-1"></i>Resposta da IA
              ${confidencePct != null ? '<span class="ml-2" style="color:' + confidenceColor + ';font-weight:600;">' + confidencePct + '% confianca</span>' : ''}
              ${resp.response_mode ? '<span class="ml-2 text-muted">' + (modeLabels[resp.response_mode] || resp.response_mode) + '</span>' : ''}
              ${resp.fallback_to_human ? '<span class="ml-2" style="color:#e65100;"><i class="fas fa-hand-paper mr-1"></i>Fallback humano</span>' : ''}
            </p>
            <p class="mb-0" style="white-space:pre-wrap;">${escapeHtml(resp.response_text)}</p>
          </div>`;
        }

        if (resp.corrected_at) {
          diagnosticHtml += `<div class="mb-3 p-2" style="background:#fff3e0; border-left:4px solid #ef6c00; border-radius:4px;">
            <p class="mb-1 small font-weight-bold" style="color:#ef6c00;"><i class="fas fa-pen mr-1"></i>Correcao Registrada</p>
            <p class="mb-0 incident-meta"><i class="fas fa-user mr-1"></i>${escapeHtml(resp.corrected_by || '-')} &middot; ${formatDate(resp.corrected_at)}</p>
          </div>`;
        }

        if (resp.supporting_source_title) {
          diagnosticHtml += `<div class="mb-2 p-2" style="background:#f3e5f5; border-left:4px solid #7b1fa2; border-radius:4px;">
            <p class="mb-1 small font-weight-bold" style="color:#7b1fa2;"><i class="fas fa-book mr-1"></i>Fonte Principal Usada</p>
            <p class="mb-0 font-weight-bold small">${escapeHtml(resp.supporting_source_title)}</p>
            ${resp.supporting_source_excerpt ? '<p class="mb-0 small text-muted mt-1" style="white-space:pre-wrap;">' + escapeHtml(resp.supporting_source_excerpt) + '</p>' : ''}
            ${resp.supporting_source_version_label ? '<p class="mb-0 small text-muted">Versao: ' + escapeHtml(resp.supporting_source_version_label) + '</p>' : ''}
          </div>`;
        }
      }

      // Evidencias / chunks recuperados
      let evidenceHtml = '';
      if (inc.evidence && inc.evidence.length) {
        evidenceHtml = `<hr>
          <p class="font-weight-bold mb-2" style="color:#4a148c;"><i class="fas fa-layer-group mr-1"></i>Fontes e Evidencias Recuperadas (${inc.evidence.length})</p>`;
        inc.evidence.forEach((ev, idx) => {
          const relPct = ev.relevance_score != null ? (ev.relevance_score * 100).toFixed(0) : null;
          const primaryTag = ev.used_as_primary ? '<span class="badge badge-sm" style="background:#7b1fa2;color:#fff;font-size:0.7rem;">Principal</span>' : '';
          evidenceHtml += `<div class="mb-2 p-2" style="background:#fafafa; border:1px solid #e0e0e0; border-radius:4px;">
            <div class="d-flex justify-content-between align-items-start">
              <span class="small font-weight-bold">${idx + 1}. ${escapeHtml(ev.source_title || 'Sem titulo')}</span>
              <span>${primaryTag} ${relPct != null ? '<span class="small text-muted ml-1">' + relPct + '% relevancia</span>' : ''}</span>
            </div>
            ${ev.source_excerpt ? '<p class="mb-0 mt-1 small text-muted" style="white-space:pre-wrap;">' + escapeHtml(ev.source_excerpt) + '</p>' : ''}
          </div>`;
        });
      }

      // L16: Trilha de auditoria vinculada
      let auditTrailHtml = '';
      if (inc.audit_events && inc.audit_events.length) {
        const auditSevColors = { CRITICAL: '#dc3545', HIGH: '#e65100', MEDIUM: '#ffc107', LOW: '#6c757d', INFO: '#17a2b8' };
        auditTrailHtml = `<hr>
          <p class="font-weight-bold mb-2" style="color:#37474f;"><i class="fas fa-history mr-1"></i>Trilha de Auditoria (${inc.audit_events.length})</p>`;
        inc.audit_events.forEach(evt => {
          const sevColor = auditSevColors[evt.severity] || '#6c757d';
          auditTrailHtml += `<div class="mb-2 p-2" style="background:#f5f5f5; border-left:3px solid ${sevColor}; border-radius:4px;">
            <div class="d-flex justify-content-between align-items-start">
              <span class="small font-weight-bold">${escapeHtml(evt.event_type)}</span>
              <span class="small text-muted">${formatDate(evt.created_at)}</span>
            </div>
            <p class="mb-0 small">${escapeHtml(evt.summary)}</p>
            <p class="mb-0 small text-muted"><i class="fas fa-user mr-1"></i>${escapeHtml(evt.actor_name || '-')} (${escapeHtml(evt.actor_type || '-')})</p>
          </div>`;
        });
      }

      document.getElementById('incidentDetailTitle').textContent = inc.incident_type || 'Incidente';
      document.getElementById('incidentDetailBody').innerHTML = `
        <div class="mb-3">${sevBadge} ${stBadge} ${quarantineBadge}</div>
        <p class="incident-meta"><i class="fas fa-clock mr-1"></i>Aberto em ${formatDate(inc.opened_at)}</p>
        <p class="incident-meta"><i class="fas fa-user mr-1"></i>Reportado por ${escapeHtml(inc.opened_by || 'Sistema')}</p>
        ${inc.topic ? '<p class="incident-meta"><i class="fas fa-tag mr-1"></i>Topico: ' + escapeHtml(inc.topic) + '</p>' : ''}
        ${inc.school_name ? '<p class="incident-meta"><i class="fas fa-school mr-1"></i>' + escapeHtml(inc.school_name) + '</p>' : ''}
        ${assignedHtml}
        ${diagnosticHtml}
        ${evidenceHtml}
        ${auditTrailHtml}
        ${detailsHtml}
        ${resolutionHtml}
        ${quarantineInfoHtml}
      `;

      const footer = document.getElementById('incidentDetailFooter');
      if (canManage && (inc.status === 'OPEN' || inc.status === 'IN_REVIEW')) {
        const quarantineBtn = inc.response_id
          ? (qs.quarantined
            ? `<button class="btn btn-sm btn-outline-secondary" onclick="IncidentsPanelPage.toggleQuarantine('${inc.id}', true)"><i class="fas fa-unlock mr-1"></i>Remover Quarentena</button>`
            : `<button class="btn btn-sm" style="border-color:#6c3483;color:#6c3483;" onclick="IncidentsPanelPage.toggleQuarantine('${inc.id}', false)"><i class="fas fa-lock mr-1"></i>Quarentena</button>`)
          : '';
        footer.style.display = '';
        footer.innerHTML = `
          ${inc.status === 'OPEN' ? '<button class="btn btn-sm btn-outline-info" onclick="IncidentsPanelPage.updateStatus(\'' + inc.id + '\', \'IN_REVIEW\')"><i class="fas fa-search mr-1"></i>Iniciar Revisao</button>' : ''}
          ${quarantineBtn}
          <button class="btn btn-sm btn-outline-primary" onclick="IncidentsPanelPage.assignIncident('${inc.id}')"><i class="fas fa-user-plus mr-1"></i>Atribuir</button>
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
      Swal.fire({ icon: 'success', title: 'Status atualizado', timer: 1200, showConfirmButton: false });
      await Promise.all([loadIncidents(), loadStats()]);

      // L10: Prompt to send resolution to knowledge base
      if (newStatus === 'RESOLVED' && resolutionNotes && resolutionNotes.trim().length > 0) {
        const { isConfirmed } = await Swal.fire({
          title: 'Enviar resolucao para base de conhecimento?',
          text: 'Deseja cadastrar esta resolucao como fonte de conhecimento para futuras respostas?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sim, enviar',
          cancelButtonText: 'Nao'
        });
        if (isConfirmed) {
          try {
            const kbRes = await fetch(`/api/incidents/${id}/knowledge-source`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ notes: resolutionNotes })
            });
            const kbData = await kbRes.json();
            if (!kbRes.ok || kbData.ok === false) throw new Error(kbData.error || 'Falha ao criar fonte de conhecimento.');
            Swal.fire({ icon: 'success', title: 'Resolucao enviada para base de conhecimento!', timer: 1800, showConfirmButton: false });
          } catch (err) {
            Swal.fire('Erro', err.message, 'error');
          }
        }
      }
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

  async function toggleQuarantine(incidentId, isCurrentlyQuarantined) {
    if (isCurrentlyQuarantined) {
      const { isConfirmed } = await Swal.fire({
        title: 'Remover quarentena',
        text: 'A resposta voltara a ser visivel normalmente. Deseja continuar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Remover quarentena',
        cancelButtonText: 'Cancelar'
      });
      if (!isConfirmed) return;
      try {
        const headers = await getAuthHeaders();
        const r = await fetch(`/api/incidents/${incidentId}/quarantine`, {
          method: 'PUT', headers, body: JSON.stringify({ undo: true })
        });
        const d = await r.json();
        if (!r.ok || d.ok === false) throw new Error(d.error || 'Falha ao remover quarentena.');
        $('#incidentDetailModal').modal('hide');
        Swal.fire({ icon: 'success', title: 'Quarentena removida', timer: 1500, showConfirmButton: false });
        await Promise.all([loadIncidents(), loadStats()]);
      } catch (err) { Swal.fire('Erro', err.message, 'error'); }
    } else {
      const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Colocar em quarentena',
        html: '<p class="text-muted mb-2">A resposta sera sinalizada como contida. Descreva o motivo.</p>',
        input: 'textarea',
        inputPlaceholder: 'Motivo da quarentena...',
        showCancelButton: true,
        confirmButtonText: 'Aplicar quarentena',
        confirmButtonColor: '#6c3483',
        cancelButtonText: 'Cancelar',
        inputValidator: (val) => { if (!val || !val.trim()) return 'Informe o motivo da quarentena.'; }
      });
      if (!isConfirmed) return;
      try {
        const headers = await getAuthHeaders();
        const r = await fetch(`/api/incidents/${incidentId}/quarantine`, {
          method: 'PUT', headers, body: JSON.stringify({ reason })
        });
        const d = await r.json();
        if (!r.ok || d.ok === false) throw new Error(d.error || 'Falha ao aplicar quarentena.');
        $('#incidentDetailModal').modal('hide');
        Swal.fire({ icon: 'success', title: 'Resposta em quarentena', text: 'A resposta foi contida.', timer: 2000, showConfirmButton: false });
        await Promise.all([loadIncidents(), loadStats()]);
      } catch (err) { Swal.fire('Erro', err.message, 'error'); }
    }
  }

  async function assignIncident(incidentId) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/users/managed?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar usuarios.');

      const users = (data.users || []).filter(u => u.active !== false);
      const options = {};
      users.forEach(u => { options[u.name || u.email] = `${u.name || u.email} (${u.role})`; });

      const { value: selectedName, isConfirmed } = await Swal.fire({
        title: 'Atribuir incidente',
        input: 'select',
        inputOptions: { '': '-- Sem atribuicao --', ...options },
        inputPlaceholder: 'Selecione um responsavel',
        showCancelButton: true,
        confirmButtonText: 'Atribuir',
        cancelButtonText: 'Cancelar'
      });
      if (!isConfirmed) return;

      const assignRes = await fetch(`/api/incidents/${incidentId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ assigned_to: selectedName || '' })
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok || assignData.ok === false) throw new Error(assignData.error || 'Falha ao atribuir incidente.');

      $('#incidentDetailModal').modal('hide');
      Swal.fire({ icon: 'success', title: selectedName ? 'Incidente atribuido' : 'Atribuicao removida', timer: 1500, showConfirmButton: false });
      await Promise.all([loadIncidents(), loadStats()]);
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  return { viewIncident, updateStatus, toggleQuarantine, assignIncident };
})();

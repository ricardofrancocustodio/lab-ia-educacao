const CorrectionsPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const STATUS_LABELS = { SUBMITTED: 'Submetida', IN_REVIEW: 'Em Revisao', APPROVED: 'Aprovada', APPLIED: 'Aplicada', REJECTED: 'Rejeitada' };
  const STATUS_BADGE = { SUBMITTED: 'badge-corr-submitted', IN_REVIEW: 'badge-corr-in_review', APPROVED: 'badge-corr-approved', APPLIED: 'badge-corr-applied', REJECTED: 'badge-corr-rejected' };
  const STATUS_CARD = { SUBMITTED: 'corr-st-submitted', IN_REVIEW: 'corr-st-in_review', APPROVED: 'corr-st-approved', APPLIED: 'corr-st-applied', REJECTED: 'corr-st-rejected' };
  const TYPE_LABELS = { wrong_information: 'Informacao incorreta', outdated_content: 'Conteudo desatualizado', hallucination: 'Alucinacao da IA', inappropriate_tone: 'Tom inadequado', wrong_source: 'Fonte errada', incomplete_answer: 'Resposta incompleta', other: 'Outro' };
  const ROOT_CAUSE_LABELS = { outdated_knowledge_source: 'Fonte desatualizada', missing_knowledge_source: 'Fonte ausente', prompt_issue: 'Problema no prompt', model_hallucination: 'Alucinacao do modelo', wrong_retrieval: 'Recuperacao incorreta', ambiguous_question: 'Pergunta ambigua', other: 'Outro' };
  const ACTION_LABELS = { update_source: 'Atualizar fonte', create_source: 'Criar nova fonte', suspend_source: 'Suspender fonte', adjust_prompt: 'Ajustar prompt', no_action: 'Nenhuma acao', other: 'Outra' };

  const ACT_ROLES = new Set(['superadmin', 'network_manager', 'content_curator']);
  let allCorrections = [];
  let effectiveRole = '';
  let canAct = false;
  let currentUserId = '';

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

  function renderCorrectionCard(c) {
    const stBadge = `<span class="corr-badge ${STATUS_BADGE[c.status] || STATUS_BADGE.SUBMITTED}">${STATUS_LABELS[c.status] || c.status}</span>`;
    const typeBadge = c.correction_type ? `<span class="corr-meta ml-2"><i class="fas fa-tag"></i> ${escapeHtml(TYPE_LABELS[c.correction_type] || c.correction_type)}</span>` : '';
    const schoolLabel = c.school_name ? ` &middot; <i class="fas fa-school"></i> ${escapeHtml(c.school_name)}` : '';

    let responsePreview = '';
    if (c.response_text) {
      responsePreview = `<div class="corr-meta mt-2" style="font-style:italic;"><i class="fas fa-robot mr-1"></i>${escapeHtml(truncate(c.response_text, 150))}</div>`;
    }

    const feedbackInfo = c.feedback ? `<span class="corr-meta ml-2"><i class="fas fa-comment-dots"></i> ${escapeHtml(c.feedback.feedback_type || '')}</span>` : '';

    return `<div class="corr-card ${STATUS_CARD[c.status] || STATUS_CARD.SUBMITTED}" onclick="CorrectionsPanelPage.viewCorrection('${c.id}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          ${stBadge}${typeBadge}${feedbackInfo}
        </div>
        <div class="corr-meta text-right">
          ${formatDate(c.submitted_at)}${schoolLabel}
        </div>
      </div>
      ${responsePreview}
      <div class="corr-meta mt-1">
        <i class="fas fa-user mr-1"></i>${escapeHtml(c.submitted_by || 'Desconhecido')}
        ${c.root_cause ? ' &middot; <i class="fas fa-search"></i> ' + escapeHtml(ROOT_CAUSE_LABELS[c.root_cause] || c.root_cause) : ''}
      </div>
    </div>`;
  }

  function renderList(corrections) {
    const container = document.getElementById('corr-list');
    const countLabel = document.getElementById('corr-count-label');
    countLabel.textContent = corrections.length + ' correcao' + (corrections.length !== 1 ? 'es' : '');
    if (!corrections.length) {
      container.innerHTML = '<div class="corr-empty"><i class="fas fa-check-double fa-2x mb-2 d-block"></i>Nenhuma correcao encontrada.</div>';
      return;
    }
    container.innerHTML = corrections.map(renderCorrectionCard).join('');
  }

  function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const type = document.getElementById('filter-type').value;
    let filtered = [...allCorrections];
    if (status) filtered = filtered.filter(c => c.status === status);
    if (type) filtered = filtered.filter(c => c.correction_type === type);
    renderList(filtered);
  }

  async function loadCorrections() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/corrections?_t=' + Date.now(), { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar correcoes.');
    allCorrections = data.corrections || [];
    applyFilters();
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/corrections/stats/summary?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) return;
      const s = data.stats || {};
      document.getElementById('stat-submitted').textContent = s.submitted ?? '-';
      document.getElementById('stat-in-review').textContent = s.in_review ?? '-';
      document.getElementById('stat-approved').textContent = s.approved ?? '-';
      document.getElementById('stat-applied').textContent = s.applied ?? '-';
      document.getElementById('stat-rejected').textContent = s.rejected ?? '-';
      document.getElementById('stat-avg-hours').textContent = s.avg_resolution_hours != null ? s.avg_resolution_hours + 'h' : '-';
    } catch (e) {
      console.warn('Failed to load correction stats:', e);
    }
  }

  async function viewCorrection(correctionId) {
    const modal = $('#corrDetailModal');
    const body = document.getElementById('corrDetailBody');
    const footer = document.getElementById('corrDetailFooter');
    body.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = '<button class="btn btn-secondary" data-dismiss="modal">Fechar</button>';
    modal.modal('show');

    const corr = allCorrections.find(c => c.id === correctionId);
    if (!corr) {
      body.innerHTML = '<div class="alert alert-warning">Correcao nao encontrada.</div>';
      return;
    }

    const isSelfSubmission = corr.submitted_by_user_id === currentUserId;

    // Build timeline
    let timeline = '';
    const events = [];
    if (corr.submitted_at) events.push({ icon: 'fa-paper-plane text-info', label: 'Submetida', by: corr.submitted_by, at: corr.submitted_at });
    if (corr.reviewed_at) events.push({ icon: 'fa-eye text-warning', label: 'Revisada', by: corr.reviewed_by, at: corr.reviewed_at, notes: corr.review_notes });
    if (corr.approved_at) events.push({ icon: 'fa-check text-success', label: 'Aprovada', by: corr.approved_by, at: corr.approved_at, notes: corr.approval_notes });
    if (corr.rejected_at) events.push({ icon: 'fa-times text-danger', label: 'Rejeitada', by: corr.rejected_by, at: corr.rejected_at, notes: corr.rejection_reason });
    if (corr.applied_at) events.push({ icon: 'fa-check-double text-primary', label: 'Aplicada', by: corr.applied_by, at: corr.applied_at, notes: corr.applied_notes, dest: corr.applied_destination });

    if (events.length) {
      timeline = '<h6 class="mt-3 mb-2"><i class="fas fa-history mr-1"></i>Linha do Tempo</h6><ul class="corr-timeline">';
      for (const e of events) {
        timeline += `<li><i class="fas ${e.icon} mr-1"></i><strong>${e.label}</strong> por ${escapeHtml(e.by || '?')} em ${formatDate(e.at)}`;
        if (e.notes) timeline += `<br><small class="text-muted">${escapeHtml(e.notes)}</small>`;
        if (e.dest) timeline += `<br><small class="text-muted">Destino: ${escapeHtml(e.dest)}</small>`;
        timeline += '</li>';
      }
      timeline += '</ul>';
    }

    body.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Status:</strong> <span class="corr-badge ${STATUS_BADGE[corr.status]}">${STATUS_LABELS[corr.status] || corr.status}</span></p>
          <p><strong>Tipo:</strong> ${escapeHtml(TYPE_LABELS[corr.correction_type] || corr.correction_type || '-')}</p>
          <p><strong>Causa Raiz:</strong> ${escapeHtml(ROOT_CAUSE_LABELS[corr.root_cause] || corr.root_cause || '-')}</p>
          <p><strong>Acao Recomendada:</strong> ${escapeHtml(ACTION_LABELS[corr.recommended_action] || corr.recommended_action || '-')}</p>
          ${corr.action_details ? `<p><strong>Detalhes da Acao:</strong> ${escapeHtml(corr.action_details)}</p>` : ''}
        </div>
        <div class="col-md-6">
          <p><strong>Submetida por:</strong> ${escapeHtml(corr.submitted_by || '-')}</p>
          <p><strong>Data:</strong> ${formatDate(corr.submitted_at)}</p>
          <p><strong>Escola:</strong> ${escapeHtml(corr.school_name || '-')}</p>
          ${corr.feedback ? `<p><strong>Feedback:</strong> ${escapeHtml(corr.feedback.feedback_type || '-')} ${corr.feedback.comment ? '— ' + escapeHtml(truncate(corr.feedback.comment, 100)) : ''}</p>` : ''}
        </div>
      </div>
      <hr>
      <h6><i class="fas fa-edit mr-1"></i>Resposta Corrigida</h6>
      <div class="p-3 bg-light border rounded mb-3" style="white-space:pre-wrap;">${escapeHtml(corr.corrected_answer || 'Nao informada')}</div>
      ${corr.justification ? `<h6><i class="fas fa-align-left mr-1"></i>Justificativa</h6><p>${escapeHtml(corr.justification)}</p>` : ''}
      ${corr.response_text ? `<h6><i class="fas fa-robot mr-1"></i>Resposta Original da IA</h6><div class="p-3 bg-light border rounded mb-3" style="white-space:pre-wrap;max-height:200px;overflow-y:auto;">${escapeHtml(corr.response_text)}</div>` : ''}
      ${timeline}
      <div id="kb-changes-section"></div>
    `;

    // G4: Load KB changes for APPLIED corrections
    if (corr.status === 'APPLIED') {
      loadKbChanges(corr.id);
    }

    // Action buttons
    let actions = '<button class="btn btn-secondary" data-dismiss="modal">Fechar</button>';
    if (canAct && !isSelfSubmission) {
      if (corr.status === 'SUBMITTED') {
        actions += ' <button class="btn btn-warning" onclick="CorrectionsPanelPage.transitionCorrection(\'' + corr.id + '\', \'review\')"><i class="fas fa-eye mr-1"></i>Iniciar Revisao</button>';
      }
      if (corr.status === 'IN_REVIEW') {
        actions += ' <button class="btn btn-success" onclick="CorrectionsPanelPage.transitionCorrection(\'' + corr.id + '\', \'approve\')"><i class="fas fa-check mr-1"></i>Aprovar</button>';
        actions += ' <button class="btn btn-danger" onclick="CorrectionsPanelPage.transitionCorrection(\'' + corr.id + '\', \'reject\')"><i class="fas fa-times mr-1"></i>Rejeitar</button>';
      }
      if (corr.status === 'APPROVED') {
        actions += ' <button class="btn btn-primary" onclick="CorrectionsPanelPage.transitionCorrection(\'' + corr.id + '\', \'apply\')"><i class="fas fa-check-double mr-1"></i>Aplicar</button>';
      }
    }
    if (canAct && corr.status === 'APPLIED') {
      actions += ' <button class="btn btn-info" onclick="CorrectionsPanelPage.addKbChange(\'' + corr.id + '\')"><i class="fas fa-database mr-1"></i>Registrar Mudanca na Base</button>';
    }
    footer.innerHTML = actions;
  }

  const KB_CHANGE_LABELS = { content_updated: 'Conteudo atualizado', source_created: 'Fonte criada', source_suspended: 'Fonte suspensa', prompt_adjusted: 'Prompt ajustado', embedding_refreshed: 'Embeddings atualizados', faq_updated: 'FAQ atualizado', other: 'Outro' };

  async function loadKbChanges(correctionId) {
    const section = document.getElementById('kb-changes-section');
    if (!section) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/corrections/' + correctionId + '/kb-changes?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) return;
      const changes = data.kb_changes || [];
      if (!changes.length) {
        section.innerHTML = '<div class="alert alert-light border mt-3"><i class="fas fa-info-circle mr-1"></i>Nenhuma mudanca na base registrada para esta correcao.</div>';
        return;
      }
      let html = '<hr><h6 class="mt-3 mb-2"><i class="fas fa-database mr-1 text-primary"></i>Mudancas na Base de Conhecimento (' + changes.length + ')</h6>';
      for (const ch of changes) {
        html += '<div class="p-2 mb-2 border rounded bg-light"><div class="d-flex justify-content-between"><span class="badge badge-primary">' + escapeHtml(KB_CHANGE_LABELS[ch.change_type] || ch.change_type) + '</span><small class="text-muted">' + formatDate(ch.applied_at) + '</small></div>';
        html += '<p class="mb-1 mt-1">' + escapeHtml(ch.change_description) + '</p>';
        if (ch.source_title) html += '<small class="text-muted"><i class="fas fa-file-alt mr-1"></i>' + escapeHtml(ch.source_title) + '</small><br>';
        html += '<small class="text-muted">Por: ' + escapeHtml(ch.applied_by) + '</small>';
        if (ch.before_snapshot || ch.after_snapshot) {
          html += '<details class="mt-1"><summary class="text-muted" style="cursor:pointer;font-size:.82rem;">Ver antes/depois</summary>';
          if (ch.before_snapshot) html += '<div class="mt-1"><strong>Antes:</strong><div class="p-2 bg-white border rounded" style="white-space:pre-wrap;max-height:100px;overflow-y:auto;font-size:.8rem;">' + escapeHtml(ch.before_snapshot) + '</div></div>';
          if (ch.after_snapshot) html += '<div class="mt-1"><strong>Depois:</strong><div class="p-2 bg-white border rounded" style="white-space:pre-wrap;max-height:100px;overflow-y:auto;font-size:.8rem;">' + escapeHtml(ch.after_snapshot) + '</div></div>';
          html += '</details>';
        }
        html += '</div>';
      }
      section.innerHTML = html;
    } catch (e) {
      console.warn('Failed to load KB changes:', e);
    }
  }

  async function addKbChange(correctionId) {
    const changeTypes = Object.entries(KB_CHANGE_LABELS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('');
    const result = await Swal.fire({
      title: 'Registrar Mudanca na Base',
      html: '<div class="text-left"><div class="form-group"><label>Tipo de mudanca</label><select id="swal-change-type" class="form-control">' + changeTypes + '</select></div><div class="form-group"><label>Descricao da mudanca *</label><textarea id="swal-change-desc" class="form-control" rows="3" placeholder="Descreva o que foi alterado na base de conhecimento..."></textarea></div><div class="form-group"><label>Conteudo anterior (opcional)</label><textarea id="swal-before" class="form-control" rows="2" placeholder="Snapshot do conteudo antes"></textarea></div><div class="form-group"><label>Conteudo novo (opcional)</label><textarea id="swal-after" class="form-control" rows="2" placeholder="Snapshot do conteudo depois"></textarea></div></div>',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const desc = document.getElementById('swal-change-desc').value.trim();
        if (!desc) { Swal.showValidationMessage('Descricao obrigatoria.'); return false; }
        return {
          change_type: document.getElementById('swal-change-type').value,
          change_description: desc,
          before_snapshot: document.getElementById('swal-before').value.trim() || null,
          after_snapshot: document.getElementById('swal-after').value.trim() || null
        };
      }
    });
    if (result.isDismissed || !result.value) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/corrections/' + correctionId + '/kb-changes', { method: 'POST', headers, body: JSON.stringify(result.value) });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao registrar.');
      Swal.fire({ icon: 'success', title: 'Mudanca registrada', text: 'Rastreabilidade atualizada.', timer: 2000, showConfirmButton: false });
      loadKbChanges(correctionId);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
  }

  async function transitionCorrection(correctionId, action) {
    const noteActions = ['reject', 'approve', 'apply'];
    let notes = null;
    if (noteActions.includes(action)) {
      const labels = { reject: 'Motivo da rejeicao', approve: 'Notas de aprovacao (opcional)', apply: 'Notas de aplicacao (opcional)' };
      const required = action === 'reject';
      const result = await Swal.fire({
        title: labels[action],
        input: 'textarea',
        inputPlaceholder: labels[action],
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (required && !value?.trim()) return 'Este campo e obrigatorio.';
        }
      });
      if (result.isDismissed) return;
      notes = result.value || null;
    }

    try {
      const headers = await getAuthHeaders();
      const body = { action };
      if (notes) body.notes = notes;
      const res = await fetch('/api/corrections/' + correctionId + '/transition', { method: 'PUT', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha na transicao.');
      Swal.fire({ icon: 'success', title: 'Transicao realizada', text: 'Status atualizado para: ' + (STATUS_LABELS[data.status] || data.status), timer: 2000, showConfirmButton: false });
      $('#corrDetailModal').modal('hide');
      await Promise.all([loadCorrections(), loadStats()]);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
  }

  async function init() {
    try {
      if (typeof window.initSession === 'function') {
        const sessionInfo = await window.initSession();
        if (!sessionInfo) throw new Error('session_init_failed');
      }

      effectiveRole = String(sessionStorage.getItem('EFFECTIVE_ROLE') || '').toLowerCase();
      canAct = ACT_ROLES.has(effectiveRole);
      currentUserId = sessionStorage.getItem('USER_ID') || '';

      document.getElementById('filter-status').addEventListener('change', applyFilters);
      document.getElementById('filter-type').addEventListener('change', applyFilters);

      await Promise.all([loadCorrections(), loadStats()]);

      document.getElementById('corr-loading').style.display = 'none';
      document.getElementById('corr-root').style.display = '';
    } catch (err) {
      console.error('CorrectionsPanelPage init error:', err);
      document.getElementById('corr-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar o painel de correcoes. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return { viewCorrection, transitionCorrection, addKbChange };
})();

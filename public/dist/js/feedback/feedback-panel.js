const FeedbackPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const TYPE_LABELS = { helpful: 'Positivo', not_helpful: 'Nao util', incorrect: 'Incorreto' };
  const TYPE_BADGE = { helpful: 'fb-badge-helpful', not_helpful: 'fb-badge-not_helpful', incorrect: 'fb-badge-incorrect' };
  const TYPE_CARD = { helpful: 'feedback-helpful', not_helpful: 'feedback-not_helpful', incorrect: 'feedback-incorrect' };
  const TYPE_ICON = { helpful: 'fa-thumbs-up', not_helpful: 'fa-thumbs-down', incorrect: 'fa-times-circle' };

  const ACT_ROLES = new Set(['superadmin', 'network_manager', 'content_curator']);
  const MANAGE_ROLES = new Set(['superadmin', 'network_manager', 'auditor', 'content_curator']);
  const CORR_STATUS_LABELS = { SUBMITTED: 'Submetida', IN_REVIEW: 'Em Revisao', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', APPLIED: 'Aplicada' };
  const CORR_STATUS_COLORS = { SUBMITTED: '#17a2b8', IN_REVIEW: '#ffc107', APPROVED: '#28a745', REJECTED: '#dc3545', APPLIED: '#0d6efd' };
  const CORR_TYPE_LABELS = { wrong_information: 'Informacao incorreta', outdated_content: 'Conteudo desatualizado', hallucination: 'Alucinacao da IA', inappropriate_tone: 'Tom inadequado', wrong_source: 'Fonte errada', incomplete_answer: 'Resposta incompleta', other: 'Outro' };
  const ROOT_CAUSE_LABELS = { outdated_knowledge_source: 'Fonte desatualizada', missing_knowledge_source: 'Fonte ausente', prompt_issue: 'Problema no prompt', model_hallucination: 'Alucinacao do modelo', wrong_retrieval: 'Recuperacao incorreta', ambiguous_question: 'Pergunta ambigua', other: 'Outro' };
  const ACTION_LABELS = { update_source: 'Atualizar fonte', create_source: 'Criar nova fonte', suspend_source: 'Suspender fonte', adjust_prompt: 'Ajustar prompt', no_action: 'Nenhuma acao', other: 'Outra' };
  let allFeedbacks = [];
  let canAct = false;
  let canManage = false;
  let currentUserId = '';

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
      if (fb.correction_status) {
        const csColor = CORR_STATUS_COLORS[fb.correction_status] || '#6c757d';
        const csTxt = fb.correction_status === 'IN_REVIEW' ? '#212529' : '#fff';
        correctionBadge = ` <span class="fb-badge" style="background:${csColor};color:${csTxt};">${CORR_STATUS_LABELS[fb.correction_status] || fb.correction_status}</span>`;
      } else {
        correctionBadge = ' <span class="fb-badge fb-badge-pending"><i class="fas fa-clock mr-1"></i>Pendente</span>';
      }
    }

    const quarantineBadge = fb.is_quarantined
      ? ' <span class="fb-badge" style="background:#6c3483;color:#fff;"><i class="fas fa-lock mr-1"></i>Quarentena</span>'
      : '';

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
          ${typeBadge}${correctionBadge}${quarantineBadge}
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
    const corrStatus = document.getElementById('filter-correction-status').value;
    let filtered = [...allFeedbacks];
    if (type) filtered = filtered.filter(f => f.feedback_type === type);
    if (pendingOnly) filtered = filtered.filter(f => f.feedback_type === 'incorrect' && !f.has_correction && !f.correction_status);
    if (corrStatus === 'no_correction') {
      filtered = filtered.filter(f => f.feedback_type === 'incorrect' && !f.correction_status);
    } else if (corrStatus) {
      filtered = filtered.filter(f => f.correction_status === corrStatus);
    }
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
      const cc = s.correction_counts || {};
      document.getElementById('stat-awaiting-approval').textContent = (cc.in_review || 0) + (cc.submitted || 0);
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
      const correction = fb.correction || null;
      if (fb.feedback_type === 'incorrect') {
        if (correction) {
          const csColor = CORR_STATUS_COLORS[correction.status] || '#6c757d';
          const csTxt = correction.status === 'IN_REVIEW' ? '#212529' : '#fff';
          correctionBadge = ` <span class="fb-badge" style="background:${csColor};color:${csTxt};">${CORR_STATUS_LABELS[correction.status] || correction.status}</span>`;
        } else {
          correctionBadge = ' <span class="fb-badge fb-badge-pending"><i class="fas fa-clock mr-1"></i>Pendente de correcao</span>';
        }
      }

      let questionHtml = '';
      if (fb.original_question) {
        questionHtml = `<hr><p class="font-weight-bold mb-1"><i class="fas fa-question-circle mr-1"></i>Pergunta do Usuario</p>
          <div class="feedback-response-preview" style="background:#f0f4ff;border-left:3px solid #007bff;padding:10px 12px;">${escapeHtml(fb.original_question)}</div>`;
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

      let quarantineDetailBadge = '';
      let quarantineInfoHtml = '';
      if (resp.quarantined_at) {
        quarantineDetailBadge = ' <span class="fb-badge" style="background:#6c3483;color:#fff;"><i class="fas fa-lock mr-1"></i>Em quarentena</span>';
        quarantineInfoHtml = `<hr><div class="alert alert-warning mb-0 py-2 px-3" style="border-left:4px solid #6c3483;">
          <p class="mb-1 font-weight-bold" style="color:#6c3483;"><i class="fas fa-lock mr-1"></i>Resposta em Quarentena</p>
          <p class="feedback-meta mb-0"><i class="fas fa-user mr-1"></i>${escapeHtml(resp.quarantined_by || '-')} &middot; ${formatDate(resp.quarantined_at)}</p>
          ${resp.quarantine_reason ? '<p class="mb-0 mt-1 small">' + escapeHtml(resp.quarantine_reason) + '</p>' : ''}
        </div>`;
      }

      // Build correction card / submit button
      let correctionCardHtml = '';
      if (correction && correction.status !== 'REJECTED') {
        const csColor = CORR_STATUS_COLORS[correction.status] || '#6c757d';
        let timeline = `<div class="corr-tl"><i class="fas fa-paper-plane text-info"></i> Submetida por <strong>${escapeHtml(correction.submitted_by)}</strong> em ${formatDate(correction.submitted_at)}</div>`;
        if (correction.reviewed_at) timeline += `<div class="corr-tl"><i class="fas fa-search text-warning"></i> Revisada por <strong>${escapeHtml(correction.reviewed_by)}</strong> em ${formatDate(correction.reviewed_at)}${correction.review_notes ? ' — <em>' + escapeHtml(correction.review_notes) + '</em>' : ''}</div>`;
        if (correction.approved_at) timeline += `<div class="corr-tl"><i class="fas fa-check-circle text-success"></i> Aprovada por <strong>${escapeHtml(correction.approved_by)}</strong> em ${formatDate(correction.approved_at)}${correction.approval_notes ? ' — <em>' + escapeHtml(correction.approval_notes) + '</em>' : ''}</div>`;
        if (correction.applied_at) timeline += `<div class="corr-tl"><i class="fas fa-rocket text-primary"></i> Aplicada por <strong>${escapeHtml(correction.applied_by)}</strong> em ${formatDate(correction.applied_at)}${correction.applied_notes ? ' — <em>' + escapeHtml(correction.applied_notes) + '</em>' : ''}</div>`;
        let actionBtns = '';
        const isSelfSubmission = currentUserId && correction.submitted_by_user_id === currentUserId;
        if (canAct && correction.status === 'SUBMITTED' && !isSelfSubmission) actionBtns = `<button class="btn btn-sm btn-info" data-correction-id="${correction.id}" data-correction-action="review"><i class="fas fa-search mr-1"></i>Iniciar Revisao</button>`;
        else if (canAct && correction.status === 'SUBMITTED' && isSelfSubmission) actionBtns = `<span class="text-muted small"><i class="fas fa-ban mr-1"></i>Voce nao pode revisar sua propria correcao</span>`;
        else if (canManage && correction.status === 'IN_REVIEW') actionBtns = `<button class="btn btn-sm btn-success mr-2" data-correction-id="${correction.id}" data-correction-action="approve"><i class="fas fa-check mr-1"></i>Aprovar</button><button class="btn btn-sm btn-danger" data-correction-id="${correction.id}" data-correction-action="reject"><i class="fas fa-times mr-1"></i>Rejeitar</button>`;
        else if (canManage && correction.status === 'APPROVED') actionBtns = `<button class="btn btn-sm btn-primary" data-correction-id="${correction.id}" data-correction-action="apply"><i class="fas fa-rocket mr-1"></i>Marcar como Aplicada</button>`;
        correctionCardHtml = `<hr><div class="card mb-0" style="border-left:4px solid ${csColor};">
          <div class="card-header py-2" style="background:${csColor}15;"><i class="fas fa-pen-fancy mr-1" style="color:${csColor};"></i><strong>Correcao Formal</strong> <span class="fb-badge ml-2" style="background:${csColor};color:${correction.status === 'IN_REVIEW' ? '#212529' : '#fff'};">${CORR_STATUS_LABELS[correction.status] || correction.status}</span></div>
          <div class="card-body py-2">
            <div class="row mb-2"><div class="col-sm-6"><small class="text-muted">Tipo:</small><br><strong>${CORR_TYPE_LABELS[correction.correction_type] || correction.correction_type}</strong></div><div class="col-sm-6"><small class="text-muted">Causa Raiz:</small><br><strong>${ROOT_CAUSE_LABELS[correction.root_cause] || correction.root_cause}</strong></div></div>
            <div class="mb-2"><small class="text-muted">Resposta Correta:</small><div class="feedback-response-preview" style="background:#d4edda;border-left:3px solid #28a745;padding:10px 12px;">${escapeHtml(correction.corrected_answer)}</div></div>
            ${correction.justification ? '<div class="mb-2"><small class="text-muted">Justificativa:</small><br>' + escapeHtml(correction.justification) + '</div>' : ''}
            <div class="row mb-2"><div class="col-sm-6"><small class="text-muted">Acao Recomendada:</small><br><strong>${ACTION_LABELS[correction.recommended_action] || correction.recommended_action}</strong></div>${correction.action_details ? '<div class="col-sm-6"><small class="text-muted">Detalhes:</small><br>' + escapeHtml(correction.action_details) + '</div>' : ''}</div>
            <hr class="my-2"><small class="text-muted d-block mb-1"><i class="fas fa-history mr-1"></i>Historico</small>${timeline}
          </div>
          ${actionBtns ? '<div class="card-footer py-2">' + actionBtns + '</div>' : ''}
        </div>`;
      } else if (correction && correction.status === 'REJECTED') {
        correctionCardHtml = `<hr><div class="alert alert-danger py-2 px-3 mb-2"><i class="fas fa-times-circle mr-1"></i><strong>Correcao anterior rejeitada</strong> por ${escapeHtml(correction.rejected_by || '-')} em ${formatDate(correction.rejected_at)}${correction.rejection_reason ? '<br><small>' + escapeHtml(correction.rejection_reason) + '</small>' : ''}</div>`;
        if (canAct && fb.feedback_type === 'incorrect') {
          correctionCardHtml += '<button class="btn btn-warning btn-block" id="btnCorrectResponse"><i class="fas fa-pen-fancy mr-1"></i>Submeter Nova Correcao</button>';
        }
      } else if (canAct && fb.feedback_type === 'incorrect') {
        correctionCardHtml = '<hr><button class="btn btn-warning btn-block" id="btnCorrectResponse"><i class="fas fa-pen-fancy mr-1"></i>Registrar Correcao Formal</button>';
      }

      document.getElementById('feedbackDetailTitle').textContent = TYPE_LABELS[fb.feedback_type] || 'Feedback';
      document.getElementById('feedbackDetailBody').innerHTML = `
        <div class="mb-3">${typeBadge}${correctionBadge}${quarantineDetailBadge}</div>
        <p class="feedback-meta"><i class="fas fa-clock mr-1"></i>Registrado em ${formatDate(fb.created_at)}</p>
        <p class="feedback-meta"><i class="fas fa-user mr-1"></i>${escapeHtml(fb.created_by || 'Cidadao')}</p>
        ${fb.school_name ? '<p class="feedback-meta"><i class="fas fa-school mr-1"></i>' + escapeHtml(fb.school_name) + '</p>' : ''}
        ${questionHtml}
        ${responseHtml}
        ${sourceHtml}
        ${evidenceHtml}
        ${commentHtml}
        ${quarantineInfoHtml}
      ${correctionCardHtml}
      `;

      const btnCorrect = document.getElementById('btnCorrectResponse');
      if (btnCorrect) {
        btnCorrect.addEventListener('click', () => openCorrectionForm(fb, resp));
      }
      document.querySelectorAll('[data-correction-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          transitionCorrection(btn.getAttribute('data-correction-id'), btn.getAttribute('data-correction-action'));
        });
      });

      $('#feedbackDetailModal').modal('show');
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  function openCorrectionForm(fb, resp) {
    $('#feedbackDetailModal').modal('hide');
    document.getElementById('corr-feedback-id').value = fb.id;
    document.getElementById('corr-original-question').textContent = fb.original_question || '(pergunta nao disponivel)';
    document.getElementById('corr-original-response').textContent = (resp && resp.response_text) || '(resposta nao disponivel)';
    document.getElementById('corr-type').value = '';
    document.getElementById('corr-root-cause').value = '';
    document.getElementById('corr-answer').value = '';
    document.getElementById('corr-justification').value = '';
    document.getElementById('corr-action').value = '';
    document.getElementById('corr-action-details').value = '';
    setTimeout(() => $('#correctionFormModal').modal('show'), 350);
  }

  async function submitCorrection() {
    const feedbackId = document.getElementById('corr-feedback-id').value;
    const correctionType = document.getElementById('corr-type').value;
    const rootCause = document.getElementById('corr-root-cause').value;
    const correctedAnswer = document.getElementById('corr-answer').value.trim();
    const justification = document.getElementById('corr-justification').value.trim();
    const recommendedAction = document.getElementById('corr-action').value;
    const actionDetails = document.getElementById('corr-action-details').value.trim();
    if (!correctionType || !rootCause || !correctedAnswer || !recommendedAction) {
      Swal.fire('Campos obrigatorios', 'Preencha: Tipo da Correcao, Causa Raiz, Resposta Correta e Acao Recomendada.', 'warning');
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers,
        body: JSON.stringify({ feedback_id: feedbackId, correction_type: correctionType, root_cause: rootCause, corrected_answer: correctedAnswer, justification: justification || null, recommended_action: recommendedAction, action_details: actionDetails || null })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao submeter correcao.');
      $('#correctionFormModal').modal('hide');
      Swal.fire({ icon: 'success', title: 'Correcao submetida', text: 'A correcao foi registrada e aguarda revisao.', timer: 2500, showConfirmButton: false });
      await Promise.all([loadFeedbacks(), loadStats()]);
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function transitionCorrection(correctionId, action) {
    const cfg = {
      review:  { title: 'Iniciar Revisao', confirm: 'Confirmar', color: '#17a2b8', needsNotes: false },
      approve: { title: 'Aprovar Correcao', confirm: 'Aprovar', color: '#28a745', needsNotes: true, label: 'Notas de aprovacao (opcional):' },
      reject:  { title: 'Rejeitar Correcao', confirm: 'Rejeitar', color: '#dc3545', needsNotes: true, label: 'Motivo da rejeicao:', required: true },
      apply:   { title: 'Marcar como Aplicada', confirm: 'Confirmar', color: '#0d6efd', needsNotes: true, label: 'Descreva o que foi feito:' }
    }[action];
    if (!cfg) return;
    let notes = '';
    if (cfg.needsNotes) {
      const result = await Swal.fire({
        title: cfg.title, input: 'textarea', inputLabel: cfg.label, inputPlaceholder: '...',
        showCancelButton: true, confirmButtonText: cfg.confirm, cancelButtonText: 'Cancelar', confirmButtonColor: cfg.color,
        inputValidator: (val) => { if (cfg.required && (!val || !val.trim())) return 'Este campo e obrigatorio.'; }
      });
      if (!result.isConfirmed) return;
      notes = result.value || '';
    } else {
      const result = await Swal.fire({ title: cfg.title, text: 'Deseja continuar?', icon: 'question', showCancelButton: true, confirmButtonText: cfg.confirm, cancelButtonText: 'Cancelar' });
      if (!result.isConfirmed) return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/corrections/${correctionId}/transition`, {
        method: 'PUT', headers,
        body: JSON.stringify({ action, notes })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha na transicao.');
      Swal.fire({ icon: 'success', title: { review: 'Em revisao', approve: 'Correcao aprovada', reject: 'Correcao rejeitada', apply: 'Correcao aplicada' }[action] || 'Sucesso', timer: 2000, showConfirmButton: false });
      $('#feedbackDetailModal').modal('hide');
      await Promise.all([loadFeedbacks(), loadStats()]);
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function init() {
    try {
      await ensureAuthenticatedContext();

      document.getElementById('filter-type').addEventListener('change', applyFilters);
      document.getElementById('filter-pending-only').addEventListener('change', applyFilters);
      document.getElementById('filter-correction-status').addEventListener('change', applyFilters);

      const awaitingApprovalEl = document.getElementById('stat-awaiting-approval');
      if (awaitingApprovalEl) {
        awaitingApprovalEl.addEventListener('click', () => {
          document.getElementById('filter-type').value = '';
          document.getElementById('filter-pending-only').checked = false;
          document.getElementById('filter-correction-status').value = 'IN_REVIEW';
          applyFilters();
        });
      }

      const effectiveRole = sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('USER_ROLE') || '';
      canAct = ACT_ROLES.has(effectiveRole);
      canManage = MANAGE_ROLES.has(effectiveRole);
      currentUserId = sessionStorage.getItem('USER_ID') || '';

      const btnSubmitCorr = document.getElementById('btnSubmitCorrection');
      if (btnSubmitCorr) btnSubmitCorr.addEventListener('click', submitCorrection);

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

  return { viewFeedback, submitCorrection, transitionCorrection };
})();

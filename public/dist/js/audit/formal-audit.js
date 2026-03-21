let auditEvents = [];
let selectedAuditId = null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch (_error) {
    return value;
  }
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toFixed(2);
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (_error) {
    return '';
  }
}

function csvEscape(value) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

function sanitizeFileName(value) {
  return String(value || 'auditoria')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'auditoria';
}

function downloadBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function ensureAuthenticatedContext() {
  if (typeof window.initSession === 'function') {
    const sessionInfo = await window.initSession();
    if (!sessionInfo) {
      throw new Error('session_init_failed');
    }
  }
}

function eventConversationLabel(event) {
  if (event.conversation_label) return event.conversation_label;
  if (event.consultation_id) return `Conversa ${String(event.consultation_id).slice(0, 8)}`;
  if (event.requester_name) return event.requester_name;
  return 'Sem conversa vinculada';
}

function getReviewStatusLabel(value) {
  const normalized = String(value || 'NOT_REQUIRED').toUpperCase();
  if (normalized === 'PENDING_REVIEW') return 'Pendente de revisao';
  if (normalized === 'REVIEWED') return 'Revisado';
  if (normalized === 'KNOWLEDGE_CREATED') return 'Virou curadoria';
  if (normalized === 'DISMISSED') return 'Descartado';
  return 'Nao requer revisao';
}

function populateFilterOptions() {
  const setOptions = (elementId, values, defaultLabel) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const current = element.value;
    const options = [`<option value="all">${escapeHtml(defaultLabel)}</option>`]
      .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
    element.innerHTML = options.join('');
    if (values.includes(current)) {
      element.value = current;
    }
  };

  const conversationValues = [...new Set(auditEvents.map((event) => event.consultation_id).filter(Boolean))];
  const assistantValues = [...new Set(auditEvents.map((event) => event.assistant_name).filter(Boolean))].sort();
  const eventValues = [...new Set(auditEvents.map((event) => event.event_type).filter(Boolean))].sort();
  const channelValues = [...new Set(auditEvents.map((event) => event.channel).filter(Boolean))].sort();

  setOptions('audit-conversation-filter', conversationValues, 'Todas as conversas');
  setOptions('audit-assistant-filter', assistantValues, 'Todos os assistentes');
  setOptions('audit-event-filter', eventValues, 'Todos os tipos');
  setOptions('audit-channel-filter', channelValues, 'Todos os canais');
}

function getFilteredEvents() {
  const scenario = String(document.getElementById('audit-scenario-filter')?.value || 'all');
  const conversationId = String(document.getElementById('audit-conversation-filter')?.value || 'all');
  const assistant = String(document.getElementById('audit-assistant-filter')?.value || 'all');
  const eventType = String(document.getElementById('audit-event-filter')?.value || 'all');
  const channel = String(document.getElementById('audit-channel-filter')?.value || 'all');
  const reviewStatus = String(document.getElementById('audit-review-filter')?.value || 'all');
  const dateFrom = String(document.getElementById('audit-date-from')?.value || '');
  const dateTo = String(document.getElementById('audit-date-to')?.value || '');
  const term = String(document.getElementById('audit-search')?.value || '').toLowerCase().trim();

  return auditEvents.filter((event) => {
    const matchesScenario = scenario === 'all' || event.scenario_code === scenario;
    const matchesConversation = conversationId === 'all' || String(event.consultation_id || '') === conversationId;
    const matchesAssistant = assistant === 'all' || String(event.assistant_name || '') === assistant;
    const matchesEvent = eventType === 'all' || String(event.event_type || '') === eventType;
    const matchesChannel = channel === 'all' || String(event.channel || '') === channel;
    const matchesReview = reviewStatus === 'all' || String(event.review_status || 'NOT_REQUIRED').toUpperCase() === reviewStatus;
    const eventDate = formatDate(event.created_at);
    const matchesDateFrom = !dateFrom || (eventDate && eventDate >= dateFrom);
    const matchesDateTo = !dateTo || (eventDate && eventDate <= dateTo);

    const searchable = [
      eventConversationLabel(event),
      event.consultation_id,
      event.scenario_label,
      event.event_type,
      event.requester_name,
      event.requester_id,
      event.assistant_name,
      event.summary,
      event.supporting_source_title,
      event.reason,
      event.original_question,
      event.response_text,
      event.review_status,
      event.review_notes,
      event.reviewed_by
    ].join(' ').toLowerCase();
    const matchesTerm = !term || searchable.includes(term);

    return matchesScenario && matchesConversation && matchesAssistant && matchesEvent && matchesChannel && matchesReview && matchesDateFrom && matchesDateTo && matchesTerm;
  });
}

function updateFilterSummary(rows) {
  const summary = document.getElementById('audit-filter-summary');
  if (!summary) return;
  const parts = [];
  const maybePush = (label, value) => {
    if (value && value !== 'all') parts.push(`${label}: ${value}`);
  };

  maybePush('Caso', document.getElementById('audit-scenario-filter')?.value);
  maybePush('Conversa', document.getElementById('audit-conversation-filter')?.value);
  maybePush('Assistente', document.getElementById('audit-assistant-filter')?.value);
  maybePush('Tipo', document.getElementById('audit-event-filter')?.value);
  maybePush('Canal', document.getElementById('audit-channel-filter')?.value);
  maybePush('Tratamento', document.getElementById('audit-review-filter')?.value);
  maybePush('De', document.getElementById('audit-date-from')?.value);
  maybePush('Ate', document.getElementById('audit-date-to')?.value);
  const term = String(document.getElementById('audit-search')?.value || '').trim();
  if (term) parts.push(`Busca: ${term}`);

  summary.textContent = parts.length
    ? `${rows.length} log(s) encontrados. Filtros ativos: ${parts.join(' | ')}`
    : `${rows.length} log(s) encontrados. Sem filtros ativos.`;
}

function renderRiskModule() {
  const summaryEl = document.getElementById('audit-risk-module-summary');
  const assistantsEl = document.getElementById('audit-risk-module-assistants');
  const reasonsEl = document.getElementById('audit-risk-module-reasons');
  if (!summaryEl || !assistantsEl || !reasonsEl) return;

  if (!auditEvents.length) {
    summaryEl.innerHTML = '<div class="text-muted">Sem dados de risco carregados.</div>';
    assistantsEl.innerHTML = '<div class="text-muted">Sem assistentes avaliados.</div>';
    reasonsEl.innerHTML = '<div class="text-muted">Sem motivos registrados.</div>';
    return;
  }

  const high = auditEvents.filter((event) => String(event.hallucination_risk_level || 'LOW').toUpperCase() === 'HIGH').length;
  const medium = auditEvents.filter((event) => String(event.hallucination_risk_level || 'LOW').toUpperCase() === 'MEDIUM').length;
  const reviewRequired = auditEvents.filter((event) => event.review_required).length;
  const abstained = auditEvents.filter((event) => event.abstained).length;
  const evidenceValues = auditEvents.map((event) => Number(event.evidence_score || 0)).filter((value) => !Number.isNaN(value) && value > 0);

  summaryEl.innerHTML = [
    '<div class="mb-2"><strong>Logs avaliados:</strong> ' + auditEvents.length + '</div>',
    '<div class="mb-2"><strong>Risco alto:</strong> ' + high + '</div>',
    '<div class="mb-2"><strong>Risco medio:</strong> ' + medium + '</div>',
    '<div class="mb-2"><strong>Revisao requerida:</strong> ' + reviewRequired + '</div>',
    '<div class="mb-2"><strong>Respostas contidas:</strong> ' + abstained + '</div>',
    '<div><strong>Evidencia media:</strong> ' + (evidenceValues.length ? (evidenceValues.reduce((sum, value) => sum + value, 0) / evidenceValues.length).toFixed(2) : '0.00') + '</div>'
  ].join('');

  const assistantRows = Object.values(auditEvents.reduce((acc, event) => {
    const key = event.assistant_name || 'Assistente';
    const current = acc[key] || { assistant_name: key, total: 0, high: 0, review: 0 };
    current.total += 1;
    if (String(event.hallucination_risk_level || 'LOW').toUpperCase() === 'HIGH') current.high += 1;
    if (event.review_required) current.review += 1;
    acc[key] = current;
    return acc;
  }, {})).sort((a, b) => b.review - a.review || b.high - a.high || b.total - a.total).slice(0, 5);

  assistantsEl.innerHTML = assistantRows.length
    ? assistantRows.map((row) => '<div class="mb-2"><strong>' + escapeHtml(row.assistant_name) + '</strong>: ' + row.review + ' revisoes | ' + row.high + ' alto risco</div>').join('')
    : '<div class="text-muted">Sem assistentes avaliados.</div>';

  const reasonRows = Object.entries(auditEvents.reduce((acc, event) => {
    const key = String(event.review_reason || event.reason || 'sem_motivo').trim() || 'sem_motivo';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([reason, total]) => ({ reason, total })).sort((a, b) => b.total - a.total).slice(0, 5);

  reasonsEl.innerHTML = reasonRows.length
    ? reasonRows.map((row) => '<div class="mb-2"><strong>' + escapeHtml(row.reason) + '</strong>: ' + row.total + '</div>').join('')
    : '<div class="text-muted">Sem motivos registrados.</div>';
}

function updateKpis() {
  const counts = auditEvents.reduce((acc, event) => {
    acc[event.scenario_code] = (acc[event.scenario_code] || 0) + 1;
    return acc;
  }, {});
  const pendingReviewCount = auditEvents.filter((event) => String(event.review_status || 'NOT_REQUIRED').toUpperCase() === 'PENDING_REVIEW').length;

  document.getElementById('kpi-case-1').textContent = counts.case_1 || 0;
  document.getElementById('kpi-case-2').textContent = counts.case_2 || 0;
  document.getElementById('kpi-case-3').textContent = counts.case_3 || 0;
  document.getElementById('kpi-case-4').textContent = counts.case_4 || 0;
  document.getElementById('kpi-case-5').textContent = counts.case_5 || 0;
  document.getElementById('kpi-case-6').textContent = counts.case_6 || 0;
  document.getElementById('kpi-pending-review').textContent = pendingReviewCount;
  renderRiskModule();
}

function renderAuditTable() {
  const rows = getFilteredEvents();
  const table = document.getElementById('audit-events-table');
  updateFilterSummary(rows);

  if (!rows.length) {
    table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum log encontrado para o filtro atual.</td></tr>';
    renderAuditDetail(null);
    return;
  }

  if (!selectedAuditId || !rows.some((row) => row.id === selectedAuditId)) {
    selectedAuditId = rows[0].id;
  }

  table.innerHTML = rows.map((row) => {
    const pendingClass = String(row.review_status || '').toUpperCase() === 'PENDING_REVIEW' ? 'audit-pending' : '';
    return `
    <tr class="audit-row-clickable ${pendingClass} ${row.id === selectedAuditId ? 'active' : ''}" onclick="selectAuditEvent('${escapeHtml(row.id)}')">
      <td>${escapeHtml(formatDateTime(row.created_at))}</td>
      <td>${escapeHtml(eventConversationLabel(row))}</td>
      <td>${escapeHtml(row.scenario_label)}</td>
      <td>${escapeHtml(row.event_type || '-')}</td>
      <td>${escapeHtml(row.requester_name || '-')}</td>
      <td>${escapeHtml(row.assistant_name || '-')}</td>
      <td>${escapeHtml(row.summary || '-')}</td>
    </tr>
  `;
  }).join('');

  renderAuditDetail(rows.find((row) => row.id === selectedAuditId) || null);
}

function renderAuditDetail(event) {
  const panel = document.getElementById('audit-detail-panel');
  if (!event) {
    panel.innerHTML = '<div class="text-muted">Selecione um log para ver a trilha completa.</div>';
    return;
  }

  const consultedSources = Array.isArray(event.consulted_sources) ? event.consulted_sources : [];
  const consultedSourcesHtml = consultedSources.length
    ? consultedSources.map((source) => `
      <div class="audit-source-item">
        <div class="font-weight-bold mb-1">${escapeHtml(source.source_title || 'Fonte institucional')}</div>
        <div class="small text-muted mb-2">Versao: ${escapeHtml(source.source_version_label || 'sem versao')}</div>
        <div class="small">${escapeHtml(source.source_excerpt || 'Sem trecho registrado.')}</div>
      </div>
    `).join('')
    : '<div class="text-muted">Nenhuma fonte consultada registrada.</div>';

  const statusOptions = [
    { value: 'PENDING_REVIEW', label: 'Pendente de revisao' },
    { value: 'REVIEWED', label: 'Revisado' },
    { value: 'KNOWLEDGE_CREATED', label: 'Virou curadoria' },
    { value: 'DISMISSED', label: 'Descartado' }
  ].map((option) => `<option value="${option.value}" ${String(event.review_status || '').toUpperCase() === option.value ? 'selected' : ''}>${option.label}</option>`).join('');

  panel.innerHTML = `
    <div class="audit-detail-section">
      <div class="audit-detail-label">Caso Auditavel</div>
      <div class="audit-detail-box">
        <div class="font-weight-bold">${escapeHtml(event.scenario_label)}</div>
        <div class="small text-muted mt-1">${escapeHtml(event.event_type || '-')} � ${escapeHtml(event.severity || '-')}</div>
      </div>
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Conversa</div>
      <div class="audit-detail-box">
        <div>${escapeHtml(eventConversationLabel(event))}</div>
        <div class="small text-muted">${escapeHtml(event.consultation_id || '-')}</div>
      </div>
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Pergunta feita</div>
      <div class="audit-detail-box">${escapeHtml(event.original_question || '-')}</div>
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Resposta entregue ou encerramento</div>
      <div class="audit-detail-box">${escapeHtml(event.response_text || '-')}</div>
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Evidencias</div>
      <div class="audit-detail-box mb-2">
        <div><strong>Fonte principal:</strong> ${escapeHtml(event.supporting_source_title || '-')}</div>
        <div><strong>Versao da fonte:</strong> ${escapeHtml(event.supporting_source_version_label || '-')}</div>
        <div><strong>Trecho usado:</strong> ${escapeHtml(event.supporting_source_excerpt || '-')}</div>
        <div><strong>Score de evidencia:</strong> ${escapeHtml(formatConfidence(event.evidence_score))}</div>
        <div><strong>Risco de alucinacao:</strong> ${escapeHtml(event.hallucination_risk_level || '-')}</div>
        <div><strong>Revisao requerida:</strong> ${event.review_required ? 'sim' : 'nao'}</div>
        <div><strong>Motivo:</strong> ${escapeHtml(event.reason || '-')}</div>
        <div><strong>Motivo da revisao:</strong> ${escapeHtml(event.review_reason || '-')}</div>
        <div><strong>Fallback sugerido:</strong> ${escapeHtml(event.fallback_area || '-')}</div>
        <div><strong>Resposta contida:</strong> ${event.abstained ? 'sim' : 'nao'}</div>
      </div>
      ${consultedSourcesHtml}
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Tratamento Humano</div>
      <div class="audit-detail-box">
        <div class="mb-2"><strong>Status atual:</strong> ${escapeHtml(getReviewStatusLabel(event.review_status))}</div>
        <div class="mb-2"><strong>Ultima revisao:</strong> ${escapeHtml(formatDateTime(event.reviewed_at))}</div>
        <div class="mb-2"><strong>Responsavel:</strong> ${escapeHtml(event.reviewed_by || '-')}</div>
        <div class="mb-3"><strong>Notas:</strong> ${escapeHtml(event.review_notes || '-')}</div>
        <div class="form-group mb-2">
          <label class="small text-muted">Atualizar status</label>
          <select class="form-control form-control-sm" id="audit-review-status">${statusOptions}</select>
        </div>
        <div class="form-group mb-2">
          <label class="small text-muted">Responsavel</label>
          <input class="form-control form-control-sm" id="audit-reviewer-name" value="${escapeHtml(event.reviewed_by && event.reviewed_by !== '-' ? event.reviewed_by : 'Operador institucional')}">
        </div>
        <div class="form-group mb-3">
          <label class="small text-muted">Notas de tratamento</label>
          <textarea class="form-control form-control-sm" id="audit-review-notes" rows="3" placeholder="Ex.: caso revisado e encaminhado para atualizar a base.">${escapeHtml(event.review_notes && event.review_notes !== '-' ? event.review_notes : '')}</textarea>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-save-audit-review" onclick="saveAuditReview('${escapeHtml(event.id)}')">Salvar tratamento</button>
      </div>
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Metadados</div>
      <div class="audit-detail-grid">
        <div class="audit-detail-box">
          <div class="audit-detail-label">Solicitante</div>
          <div>${escapeHtml(event.requester_name || '-')}</div>
          <div class="small text-muted">${escapeHtml(event.requester_id || '-')}</div>
        </div>
        <div class="audit-detail-box">
          <div class="audit-detail-label">Canal e perfil</div>
          <div>${escapeHtml(event.channel || '-')}</div>
          <div class="small text-muted">${escapeHtml(event.requester_profile || '-')}</div>
        </div>
        <div class="audit-detail-box">
          <div class="audit-detail-label">Assistente</div>
          <div>${escapeHtml(event.assistant_name || '-')}</div>
          <div class="small text-muted">Modo: ${escapeHtml(event.response_mode || '-')}</div>
        </div>
        <div class="audit-detail-box">
          <div class="audit-detail-label">Quem registrou</div>
          <div>${escapeHtml(event.actor_name || '-')}</div>
          <div class="small text-muted">${escapeHtml(event.actor_type || '-')} � ${escapeHtml(formatDateTime(event.created_at))}</div>
        </div>
      </div>
    </div>

    <div class="audit-detail-section">
      <div class="audit-detail-label">Resumo do log</div>
      <div class="audit-detail-box">${escapeHtml(event.summary || '-')}</div>
    </div>
  `;
}

function buildExportRows() {
  return getFilteredEvents().map((event) => ({
    data_hora: formatDateTime(event.created_at),
    conversa: eventConversationLabel(event),
    conversation_id: event.consultation_id || '',
    caso: event.scenario_label || '',
    tipo: event.event_type || '',
    severidade: event.severity || '',
    solicitante: event.requester_name || '',
    solicitante_id: event.requester_id || '',
    canal: event.channel || '',
    perfil: event.requester_profile || '',
    assistente: event.assistant_name || '',
    pergunta_original: event.original_question || '',
    resposta_entregue: event.response_text || '',
    resumo: event.summary || '',
    score_evidencia: formatConfidence(event.evidence_score),
    risco_alucinacao: event.hallucination_risk_level || '',
    revisao_requerida: event.review_required ? 'sim' : 'nao',
    status_tratamento: getReviewStatusLabel(event.review_status),
    revisado_por: event.reviewed_by || '',
    revisado_em: formatDateTime(event.reviewed_at),
    notas_tratamento: event.review_notes || '',
    motivo: event.reason || '',
    motivo_revisao: event.review_reason || '',
    resposta_contida: event.abstained ? 'sim' : 'nao',
    fallback_sugerido: event.fallback_area || '',
    fonte_principal: event.supporting_source_title || '',
    versao_fonte: event.supporting_source_version_label || '',
    trecho_usado: event.supporting_source_excerpt || '',
    fontes_consultadas: (event.consulted_sources || []).map((source) => `${source.source_title || 'Fonte institucional'} [${source.source_version_label || 'sem versao'}] ${source.source_excerpt || ''}`.trim()).join(' | '),
    ator_registro: event.actor_name || '',
    tipo_ator: event.actor_type || ''
  }));
}

function exportAuditCsv() {
  const rows = buildExportRows();
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.map(csvEscape).join(';'),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';'))
  ].join('\n');
  downloadBlob(csv, `${sanitizeFileName('auditoria-formal-filtrada')}.csv`, 'text/csv;charset=utf-8;');
}

function exportAuditXls() {
  const rows = buildExportRows();
  const headers = Object.keys(rows[0] || {});
  const html = `
    <html>
    <head><meta charset="utf-8"></head>
    <body>
      <table border="1">
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        ${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}
      </table>
    </body>
    </html>
  `;
  downloadBlob(html, `${sanitizeFileName('auditoria-formal-filtrada')}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
}

function exportAuditPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    Swal.fire('Erro', 'A biblioteca de PDF nao foi carregada nesta pagina.', 'error');
    return;
  }

  const rows = getFilteredEvents();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - (margin * 2);
  let y = margin;

  function ensureSpace(heightNeeded = 18) {
    if (y + heightNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addLine(text, opts = {}) {
    const fontSize = opts.fontSize || 10;
    const gap = opts.gap || 14;
    const fontStyle = opts.fontStyle || 'normal';
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(String(text || '-'), maxWidth);
    ensureSpace(lines.length * gap + 4);
    doc.text(lines, margin, y);
    y += lines.length * gap + 4;
  }

  addLine('Exportacao da Auditoria Formal', { fontSize: 16, fontStyle: 'bold', gap: 18 });
  addLine(`Gerado em: ${formatDateTime(new Date().toISOString())}`);
  addLine(`Total de logs exportados: ${rows.length}`);
  addLine(document.getElementById('audit-filter-summary')?.textContent || '');
  y += 8;

  rows.forEach((event, index) => {
    addLine(`${index + 1}. ${event.scenario_label}`, { fontSize: 12, fontStyle: 'bold', gap: 16 });
    addLine(`Data: ${formatDateTime(event.created_at)}`);
    addLine(`Conversa: ${eventConversationLabel(event)} | ID: ${event.consultation_id || '-'}`);
    addLine(`Tipo: ${event.event_type}`);
    addLine(`Solicitante: ${event.requester_name} | Canal: ${event.channel} | Perfil: ${event.requester_profile}`);
    addLine(`Assistente: ${event.assistant_name}`);
    addLine(`Pergunta: ${event.original_question}`);
    addLine(`Resposta: ${event.response_text}`);
    addLine(`Fonte principal: ${event.supporting_source_title} | Versao: ${event.supporting_source_version_label}`);
    addLine(`Trecho: ${event.supporting_source_excerpt}`);
    addLine(`Status de tratamento: ${getReviewStatusLabel(event.review_status)} | Revisado por: ${event.reviewed_by || '-'}`);
    addLine(`Notas de tratamento: ${event.review_notes || '-'}`);
    addLine(`Motivo: ${event.reason} | Fallback sugerido: ${event.fallback_area}`);
    addLine(`Resumo: ${event.summary}`);
    y += 8;
  });

  doc.save(`${sanitizeFileName('auditoria-formal-filtrada')}.pdf`);
}

function selectAuditEvent(id) {
  selectedAuditId = id;
  renderAuditTable();
}

function clearAuditFilters() {
  document.getElementById('audit-scenario-filter').value = 'all';
  document.getElementById('audit-conversation-filter').value = 'all';
  document.getElementById('audit-assistant-filter').value = 'all';
  document.getElementById('audit-event-filter').value = 'all';
  document.getElementById('audit-channel-filter').value = 'all';
  document.getElementById('audit-review-filter').value = 'all';
  document.getElementById('audit-date-from').value = '';
  document.getElementById('audit-date-to').value = '';
  document.getElementById('audit-search').value = '';
  renderAuditTable();
}

async function saveAuditReview(eventId) {
  const status = String(document.getElementById('audit-review-status')?.value || 'PENDING_REVIEW');
  const reviewedBy = String(document.getElementById('audit-reviewer-name')?.value || 'Operador institucional').trim();
  const reviewNotes = String(document.getElementById('audit-review-notes')?.value || '').trim();
  const button = document.getElementById('btn-save-audit-review');
  if (button) button.disabled = true;

  try {
    const res = await fetch(`/api/audit/events/${encodeURIComponent(eventId)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_status: status,
        reviewed_by: reviewedBy,
        review_notes: reviewNotes
      })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || 'Falha ao salvar tratamento.');

    const index = auditEvents.findIndex((item) => item.id === eventId);
    if (index >= 0) {
      auditEvents[index] = {
        ...auditEvents[index],
        review_status: status,
        reviewed_by: reviewedBy,
        reviewed_at: body?.event?.details?.reviewed_at || new Date().toISOString(),
        review_notes: reviewNotes || '-'
      };
    }

    renderAuditTable();
    Swal.fire('Tratamento salvo', 'O status de revisao foi atualizado na trilha de auditoria.', 'success');
  } catch (error) {
    Swal.fire('Erro', error.message || 'Nao foi possivel salvar o tratamento.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadAuditEvents() {
  await ensureAuthenticatedContext();
  const res = await fetch('/api/audit/events');
  const data = await res.json();
  auditEvents = data.events || [];
  populateFilterOptions();
  updateKpis();
  renderAuditTable();
  document.body.style.opacity = '1';
  if (window.applyPermissions) window.applyPermissions();
}

document.addEventListener('DOMContentLoaded', () => {
  [
    'audit-scenario-filter',
    'audit-conversation-filter',
    'audit-assistant-filter',
    'audit-event-filter',
    'audit-channel-filter',
    'audit-review-filter',
    'audit-date-from',
    'audit-date-to'
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', renderAuditTable);
  });

  document.getElementById('audit-search')?.addEventListener('input', renderAuditTable);
  document.getElementById('btn-clear-audit-filters')?.addEventListener('click', clearAuditFilters);
  document.getElementById('btn-export-audit-csv')?.addEventListener('click', exportAuditCsv);
  document.getElementById('btn-export-audit-xls')?.addEventListener('click', exportAuditXls);
  document.getElementById('btn-export-audit-pdf')?.addEventListener('click', exportAuditPdf);

  loadAuditEvents().catch((error) => {
    console.error(error);
    document.body.style.opacity = '1';
  });
});

window.selectAuditEvent = selectAuditEvent;
window.saveAuditReview = saveAuditReview;





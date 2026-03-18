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
  const dateFrom = String(document.getElementById('audit-date-from')?.value || '');
  const dateTo = String(document.getElementById('audit-date-to')?.value || '');
  const term = String(document.getElementById('audit-search')?.value || '').toLowerCase().trim();

  return auditEvents.filter((event) => {
    const matchesScenario = scenario === 'all' || event.scenario_code === scenario;
    const matchesConversation = conversationId === 'all' || String(event.consultation_id || '') === conversationId;
    const matchesAssistant = assistant === 'all' || String(event.assistant_name || '') === assistant;
    const matchesEvent = eventType === 'all' || String(event.event_type || '') === eventType;
    const matchesChannel = channel === 'all' || String(event.channel || '') === channel;
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
      event.response_text
    ].join(' ').toLowerCase();
    const matchesTerm = !term || searchable.includes(term);

    return matchesScenario && matchesConversation && matchesAssistant && matchesEvent && matchesChannel && matchesDateFrom && matchesDateTo && matchesTerm;
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
  maybePush('De', document.getElementById('audit-date-from')?.value);
  maybePush('Ate', document.getElementById('audit-date-to')?.value);
  const term = String(document.getElementById('audit-search')?.value || '').trim();
  if (term) parts.push(`Busca: ${term}`);

  summary.textContent = parts.length
    ? `${rows.length} log(s) encontrados. Filtros ativos: ${parts.join(' | ')}`
    : `${rows.length} log(s) encontrados. Sem filtros ativos.`;
}

function updateKpis() {
  const counts = auditEvents.reduce((acc, event) => {
    acc[event.scenario_code] = (acc[event.scenario_code] || 0) + 1;
    return acc;
  }, {});

  document.getElementById('kpi-case-1').textContent = counts.case_1 || 0;
  document.getElementById('kpi-case-2').textContent = counts.case_2 || 0;
  document.getElementById('kpi-case-3').textContent = counts.case_3 || 0;
  document.getElementById('kpi-case-4').textContent = counts.case_4 || 0;
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

  table.innerHTML = rows.map((row) => `
    <tr class="audit-row-clickable ${row.id === selectedAuditId ? 'active' : ''}" onclick="selectAuditEvent('${escapeHtml(row.id)}')">
      <td>${escapeHtml(formatDateTime(row.created_at))}</td>
      <td>${escapeHtml(eventConversationLabel(row))}</td>
      <td>${escapeHtml(row.scenario_label)}</td>
      <td>${escapeHtml(row.event_type || '-')}</td>
      <td>${escapeHtml(row.requester_name || '-')}</td>
      <td>${escapeHtml(row.assistant_name || '-')}</td>
      <td>${escapeHtml(row.summary || '-')}</td>
    </tr>
  `).join('');

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

  panel.innerHTML = `
    <div class="audit-detail-section">
      <div class="audit-detail-label">Caso Auditavel</div>
      <div class="audit-detail-box">
        <div class="font-weight-bold">${escapeHtml(event.scenario_label)}</div>
        <div class="small text-muted mt-1">${escapeHtml(event.event_type || '-')} · ${escapeHtml(event.severity || '-')}</div>
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
        <div><strong>Motivo:</strong> ${escapeHtml(event.reason || '-')}</div>
        <div><strong>Fallback sugerido:</strong> ${escapeHtml(event.fallback_area || '-')}</div>
      </div>
      ${consultedSourcesHtml}
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
          <div class="small text-muted">${escapeHtml(event.actor_type || '-')} · ${escapeHtml(formatDateTime(event.created_at))}</div>
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
    motivo: event.reason || '',
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
  document.getElementById('audit-date-from').value = '';
  document.getElementById('audit-date-to').value = '';
  document.getElementById('audit-search').value = '';
  renderAuditTable();
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

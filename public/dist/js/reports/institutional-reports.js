const reportState = {
  rows: [],
  periodLabel: 'Hoje',
  comparison: {},
  previousSummary: {},
  recurringDemand: {
    summary: {},
    top_recurring_topics: [],
    fastest_growth_topics: [],
    highest_fallback_topics: [],
    highest_dissatisfaction_topics: [],
    by_assistant: []
  },
  responseRiskModule: {
    summary: {},
    risk_distribution: [],
    highest_risk_topics: [],
    assistants_under_review: []
  }
};

function renderList(containerId, rows, formatter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="text-muted">Sem dados disponiveis.</div>';
    return;
  }
  container.innerHTML = rows.map(formatter).join('');
}

function renderMetricCards(summary = {}) {
  const cards = [
    { label: 'Perguntas', value: summary.total_questions || 0, tone: 'primary' },
    { label: 'Usuarios unicos', value: summary.unique_requesters || 0, tone: 'info' },
    { label: 'Resolucao automatica', value: (summary.automatic_resolution_rate || 0) + '%', tone: 'success' },
    { label: 'Fallback humano', value: (summary.fallback_rate || 0) + '%', tone: 'warning' },
    { label: 'Cobertura de fonte', value: (summary.source_coverage_rate || 0) + '%', tone: 'dark' },
    { label: 'Tempo medio', value: (summary.avg_response_time_seconds || 0) + 's', tone: 'secondary' },
    { label: 'Feedback positivo', value: (summary.feedback_positive_rate || 0) + '%', tone: 'success' },
    { label: 'Taxa contestada', value: (summary.contested_response_rate || 0) + '%', tone: 'danger' },
    { label: 'Incidentes abertos', value: summary.open_incidents || 0, tone: 'warning' },
    { label: 'Pendentes de revisao', value: summary.pending_reviews || 0, tone: 'danger' }
  ];

  return cards.map((card) => '<div class="col-md-6 col-xl-3 mb-3"><div class="card border-' + card.tone + '"><div class="card-body"><div class="text-muted small">' + card.label + '</div><div class="h3 mb-0">' + card.value + '</div></div></div></div>').join('');
}

function computeAggregates(rows) {
  const answeredRows = rows.filter((row) => row.response_mode && row.response_mode !== 'NO_RESPONSE');
  const automaticRows = answeredRows.filter((row) => ['AUTOMATIC', 'AUTOMATIC_LIMITED'].includes(String(row.response_mode || '').toUpperCase()));
  const citedRows = answeredRows.filter((row) => row.has_valid_source);
  const confidenceValues = answeredRows.map((row) => Number(row.confidence_score || 0)).filter((value) => !Number.isNaN(value) && value > 0);
  const responseTimes = rows.map((row) => Number(row.response_time_seconds)).filter((value) => !Number.isNaN(value) && value >= 0);

  const groupCount = (items, keyResolver, fieldName, limit = null) => {
    const grouped = Object.entries(items.reduce((acc, item) => {
      const key = keyResolver(item) || 'Sem classificacao';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([key, total]) => ({ [fieldName]: key, total })).sort((a, b) => b.total - a.total);
    return limit ? grouped.slice(0, limit) : grouped;
  };

  const sourceAdoption = Object.entries(answeredRows.reduce((acc, row) => {
    const key = row.assistant_key || 'unassigned';
    const current = acc[key] || { assistant_name: row.assistant_name || key, total: 0, cited: 0 };
    current.total += 1;
    if (row.has_valid_source) current.cited += 1;
    acc[key] = current;
    return acc;
  }, {})).map(([assistant_key, totals]) => ({
    assistant_key,
    assistant_name: totals.assistant_name,
    total: totals.total,
    source_coverage_rate: totals.total ? Math.round((totals.cited / totals.total) * 100) : 0
  })).sort((a, b) => b.total - a.total);

  const assistantPerformance = Object.entries(answeredRows.reduce((acc, row) => {
    const key = row.assistant_key || 'unassigned';
    const current = acc[key] || { assistant_name: row.assistant_name || key, total: 0, fallback: 0, automatic: 0, incorrect: 0, confidence_sum: 0, confidence_count: 0 };
    current.total += 1;
    if (row.fallback_to_human) current.fallback += 1;
    if (['AUTOMATIC', 'AUTOMATIC_LIMITED'].includes(String(row.response_mode || '').toUpperCase())) current.automatic += 1;
    if (Number(row.feedback_incorrect || 0) > 0) current.incorrect += 1;
    const confidence = Number(row.confidence_score || 0);
    if (!Number.isNaN(confidence) && confidence > 0) {
      current.confidence_sum += confidence;
      current.confidence_count += 1;
    }
    acc[key] = current;
    return acc;
  }, {})).map(([assistant_key, totals]) => ({
    assistant_key,
    assistant_name: totals.assistant_name,
    total_questions: totals.total,
    automatic_resolution_rate: totals.total ? Math.round((totals.automatic / totals.total) * 100) : 0,
    fallback_rate: totals.total ? Math.round((totals.fallback / totals.total) * 100) : 0,
    contested_rate: totals.total ? Math.round((totals.incorrect / totals.total) * 100) : 0,
    avg_confidence: totals.confidence_count ? Number((totals.confidence_sum / totals.confidence_count).toFixed(2)) : 0
  })).sort((a, b) => b.total_questions - a.total_questions);

  return {
    summary: {
      total_consultations: rows.length,
      total_questions: rows.reduce((sum, row) => sum + Number(row.question_count || 0), 0),
      unique_requesters: new Set(rows.map((row) => row.requester_id).filter(Boolean)).size,
      automatic_resolution_rate: answeredRows.length ? Math.round((automaticRows.length / answeredRows.length) * 100) : 0,
      fallback_rate: answeredRows.length ? Math.round((answeredRows.filter((row) => row.fallback_to_human).length / answeredRows.length) * 100) : 0,
      source_coverage_rate: answeredRows.length ? Math.round((citedRows.length / answeredRows.length) * 100) : 0,
      avg_response_time_seconds: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : 0,
      feedback_positive_rate: rows.reduce((sum, row) => sum + Number(row.feedback_helpful || 0), 0) + rows.reduce((sum, row) => sum + Number(row.feedback_not_helpful || 0) + Number(row.feedback_incorrect || 0), 0) > 0
        ? Math.round((rows.reduce((sum, row) => sum + Number(row.feedback_helpful || 0), 0) / rows.reduce((sum, row) => sum + Number(row.feedback_total || 0), 0)) * 100)
        : 0,
      contested_response_rate: answeredRows.length ? Math.round((rows.filter((row) => Number(row.feedback_incorrect || 0) > 0).length / answeredRows.length) * 100) : 0,
      open_incidents: rows.reduce((sum, row) => sum + Number(row.incident_open || 0), 0),
      pending_reviews: rows.filter((row) => row.review_status === 'PENDING_REVIEW').length
    },
    consultations_by_status: groupCount(rows, (row) => row.status || 'OPEN', 'status'),
    top_topics: groupCount(rows, (row) => row.topic || 'Sem classificacao', 'topic', 10),
    source_adoption: sourceAdoption,
    channel_volume: groupCount(rows, (row) => row.channel || 'webchat', 'channel'),
    risk_overview: groupCount(rows, (row) => row.risk_level || 'LOW', 'risk_level'),
    assistant_performance: assistantPerformance,
    peak_hours: groupCount(rows.filter((row) => row.asked_at), (row) => {
      const date = new Date(row.asked_at);
      return Number.isNaN(date.getTime()) ? null : String(date.getHours()).padStart(2, '0') + ':00';
    }, 'hour_slot', 8),
    unresolved_topics: groupCount(rows.filter((row) => row.review_status === 'PENDING_REVIEW' || row.risk_level === 'HIGH' || row.abstained || !row.has_valid_source), (row) => row.topic, 'topic', 10),
    top_documents_used: groupCount(rows.filter((row) => row.primary_source_title), (row) => row.primary_source_title, 'source_title', 10)
  };
}

function populateSelect(selectId, values, formatter) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentValue = select.value || 'all';
  const options = ['<option value="all">Todos</option>'].concat(values.map((value) => '<option value="' + value + '">' + (formatter ? formatter(value) : value) + '</option>'));
  select.innerHTML = options.join('');
  select.value = values.includes(currentValue) ? currentValue : 'all';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatMode(value) {
  const normalized = String(value || 'NO_RESPONSE').toUpperCase();
  if (normalized === 'AUTOMATIC') return 'Automatica';
  if (normalized === 'AUTOMATIC_LIMITED') return 'Automatica com ressalva';
  if (normalized === 'NO_RESPONSE') return 'Sem resposta';
  return normalized;
}

function renderComparison(comparison = {}) {
  const container = document.getElementById('report-comparison');
  if (!container) return;
  const labels = {
    total_consultations: 'Consultas',
    automatic_resolution_rate: 'Resolucao automatica',
    fallback_rate: 'Fallback humano',
    avg_response_time_seconds: 'Tempo medio',
    feedback_positive_rate: 'Feedback positivo',
    contested_response_rate: 'Taxa contestada',
    incident_rate: 'Taxa de incidentes',
    source_coverage_rate: 'Cobertura de fonte'
  };
  const entries = Object.entries(comparison || {});
  if (!entries.length) {
    container.innerHTML = '<div class="text-muted">Comparacao indisponivel para este periodo.</div>';
    return;
  }
  container.innerHTML = '<div class="comparison-grid">' + entries.map(([key, row]) => {
    const delta = Number(row.delta || 0);
    const deltaClass = delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted';
    const deltaPrefix = delta > 0 ? '+' : '';
    return '<div class="comparison-box"><div class="text-muted small">' + (labels[key] || key) + '</div><div><strong>' + (row.current ?? 0) + '</strong> <span class="small text-muted">vs ' + (row.previous ?? 0) + '</span></div><div class="small ' + deltaClass + '">Delta: ' + deltaPrefix + delta + '</div></div>';
  }).join('') + '</div>';
}

function renderResponseRiskModule(moduleData = {}) {
  const summary = moduleData.summary || {};
  const summaryEl = document.getElementById('report-response-risk-summary');
  if (summaryEl) {
    if (!summary.total_assessed_responses) {
      summaryEl.innerHTML = '<div class="text-muted">Sem respostas avaliadas neste recorte.</div>';
    } else {
      summaryEl.innerHTML = [
        '<div class="mb-2"><strong>Respostas avaliadas:</strong> ' + (summary.total_assessed_responses || 0) + '</div>',
        '<div class="mb-2"><strong>Risco alto:</strong> ' + (summary.high_risk_count || 0) + '</div>',
        '<div class="mb-2"><strong>Revisao requerida:</strong> ' + (summary.review_required_count || 0) + '</div>',
        '<div class="mb-2"><strong>Contidas:</strong> ' + (summary.abstained_count || 0) + '</div>',
        '<div class="mb-2"><strong>Sem fonte valida:</strong> ' + (summary.no_valid_source_count || 0) + '</div>',
        '<div><strong>Evidencia media:</strong> ' + (summary.avg_evidence_score || 0) + '</div>'
      ].join('');
    }
  }

  renderList('report-response-risk-topics', moduleData.highest_risk_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: ' + (row.high_risk_rate || 0) + '% alto risco | ' + (row.review_rate || 0) + '% revisao</div>');
  renderList('report-response-risk-assistants', moduleData.assistants_under_review || [], (row) => '<div class="mb-2"><strong>' + (row.assistant_name || row.assistant_key || 'Assistente') + '</strong>: ' + (row.review_rate || 0) + '% revisao | ' + (row.high_risk_rate || 0) + '% alto risco</div>');
}

function renderRecurringDemand(recurring = {}) {
  const summary = recurring.summary || {};
  const summaryEl = document.getElementById('report-recurring-summary');
  if (summaryEl) {
    if (summary.tracked_topics) {
      summaryEl.textContent = 'Tema lider: ' + (summary.top_topic || 'Sem classificacao') + ' com ' + (summary.top_topic_total || 0) + ' atendimentos, ' + (summary.top_topic_share || 0) + '% do volume e ' + (summary.top_topic_fallback_rate || 0) + '% de fallback humano.';
    } else {
      summaryEl.textContent = 'Monitoramento de temas recorrentes, crescimento, fallback humano e insatisfacao por tema.';
    }
  }

  renderList('report-recurring-topics', recurring.top_recurring_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: ' + (row.total || 0) + ' | ' + (row.share_of_consultations || 0) + '%</div>');
  renderList('report-recurring-growth', recurring.fastest_growth_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: +' + (row.growth_count || 0) + ' vs periodo anterior</div>');
  renderList('report-recurring-fallback', recurring.highest_fallback_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: ' + (row.fallback_rate || 0) + '%</div>');
  renderList('report-recurring-dissatisfaction', recurring.highest_dissatisfaction_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: ' + (row.dissatisfaction_rate || 0) + '%</div>');

  const tbody = document.getElementById('report-recurring-table');
  if (!tbody) return;
  const rows = recurring.top_recurring_topics || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Sem dados de demanda recorrente neste recorte.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((row) => '<tr>' +
    '<td>' + (row.topic || '-') + '</td>' +
    '<td>' + (row.total || 0) + '</td>' +
    '<td>' + (row.share_of_consultations || 0) + '%</td>' +
    '<td>' + ((row.growth_count > 0 ? '+' : '') + (row.growth_count || 0)) + '</td>' +
    '<td>' + (row.fallback_rate || 0) + '%</td>' +
    '<td>' + (row.dissatisfaction_rate || 0) + '%</td>' +
    '<td>' + (row.top_assistant_name || 'Assistente') + ' (' + (row.top_assistant_total || 0) + ')</td>' +
    '</tr>').join('');
}

function renderDetailTable(rows) {
  const tbody = document.getElementById('report-detail-table');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted py-4">Nenhum atendimento encontrado com os filtros atuais.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((row) => '<tr>' +
    '<td>' + formatDate(row.asked_at) + '</td>' +
    '<td><span class="text-monospace small">' + (row.consultation_id || '-') + '</span></td>' +
    '<td>' + (row.topic || '-') + '</td>' +
    '<td>' + (row.channel || '-') + '</td>' +
    '<td>' + (row.assistant_name || row.assistant_key || '-') + '</td>' +
    '<td>' + formatMode(row.response_mode) + '</td>' +
    '<td>' + ((row.response_time_seconds ?? '-') === '-' ? '-' : row.response_time_seconds + 's') + '</td>' +
    '<td>' + (row.primary_source_title || (row.has_valid_source ? 'Fonte versionada' : '-')) + '</td>' +
    '<td>' + ((row.feedback_total || 0) > 0 ? (row.feedback_helpful || 0) + '/' + (row.feedback_total || 0) : '-') + '</td>' +
    '<td>' + ((row.incident_total || 0) > 0 ? (row.incident_open || 0) + ' abertos / ' + row.incident_total : '-') + '</td>' +
    '<td><span class="badge badge-' + (row.risk_level === 'HIGH' ? 'danger' : row.risk_level === 'MEDIUM' ? 'warning' : 'success') + ' badge-soft">' + (row.risk_level || 'LOW') + '</span></td>' +
    '<td>' + (row.review_status || 'NOT_REQUIRED') + '</td>' +
    '</tr>').join('');
}

function renderReports(rows) {
  const aggregates = computeAggregates(rows);
  const metricsRow = document.getElementById('report-summary');
  if (metricsRow) metricsRow.innerHTML = renderMetricCards(aggregates.summary || {});

  renderList('report-status', aggregates.consultations_by_status || [], (row) => '<div class="mb-2"><strong>' + (row.status || 'sem status') + '</strong>: ' + (row.total || 0) + '</div>');
  renderList('report-topics', aggregates.top_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: ' + (row.total || 0) + '</div>');
  renderList('report-sources', aggregates.source_adoption || [], (row) => '<div class="mb-2"><strong>' + (row.assistant_name || row.assistant_key || 'Assistente') + '</strong>: ' + (row.source_coverage_rate || 0) + '%</div>');
  renderList('report-channels', aggregates.channel_volume || [], (row) => '<div class="mb-2"><strong>' + (row.channel || 'canal_desconhecido') + '</strong>: ' + (row.total || 0) + '</div>');
  renderList('report-risk', aggregates.risk_overview || [], (row) => '<div class="mb-2"><strong>' + (row.risk_level || 'SEM_CLASSIFICACAO') + '</strong>: ' + (row.total || 0) + '</div>');
  renderList('report-assistants', aggregates.assistant_performance || [], (row) => '<div class="mb-2"><strong>' + (row.assistant_name || row.assistant_key || 'Assistente') + '</strong>: ' + (row.total_questions || 0) + ' perguntas | ' + (row.automatic_resolution_rate || 0) + '% auto | ' + (row.fallback_rate || 0) + '% fallback | ' + (row.contested_rate || 0) + '% contestada</div>');
  renderList('report-peak-hours', aggregates.peak_hours || [], (row) => '<div class="mb-2"><strong>' + (row.hour_slot || '-') + '</strong>: ' + (row.total || 0) + '</div>');
  renderList('report-unresolved', aggregates.unresolved_topics || [], (row) => '<div class="mb-2"><strong>' + (row.topic || 'Sem topico') + '</strong>: ' + (row.total || 0) + '</div>');
  renderList('report-documents', aggregates.top_documents_used || [], (row) => '<div class="mb-2"><strong>' + (row.source_title || 'Fonte institucional') + '</strong>: ' + (row.total || 0) + '</div>');
  renderResponseRiskModule(reportState.responseRiskModule || {});
  renderRecurringDemand(reportState.recurringDemand || {});
  renderDetailTable(rows);
}

function getCurrentFilters() {
  return {
    assistant: document.getElementById('report-assistant')?.value || 'all',
    channel: document.getElementById('report-channel')?.value || 'all',
    risk: document.getElementById('report-risk-filter')?.value || 'all',
    search: String(document.getElementById('report-search')?.value || '').trim().toLowerCase()
  };
}

function getFilteredRows() {
  const filters = getCurrentFilters();
  return reportState.rows.filter((row) => {
    if (filters.assistant !== 'all' && row.assistant_key !== filters.assistant) return false;
    if (filters.channel !== 'all' && row.channel !== filters.channel) return false;
    if (filters.risk !== 'all' && row.risk_level !== filters.risk) return false;
    if (filters.search && !(row.search_text || '').includes(filters.search)) return false;
    return true;
  });
}

function applyFilters() {
  renderReports(getFilteredRows());
}

function exportRowsToCsv(rows) {
  const headers = ['asked_at', 'consultation_id', 'status', 'topic', 'channel', 'assistant_key', 'assistant_name', 'response_mode', 'response_time_seconds', 'confidence_score', 'has_valid_source', 'primary_source_title', 'feedback_total', 'feedback_helpful', 'feedback_not_helpful', 'feedback_incorrect', 'incident_total', 'incident_open', 'fallback_to_human', 'risk_level', 'review_status', 'question_count'];
  const lines = [headers.join(',')].concat(rows.map((row) => headers.map((header) => {
    const value = row[header] ?? '';
    return '"' + String(value).replace(/"/g, '""') + '"';
  }).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'impacto-operacional-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function ensureAuthenticatedContext() {
  if (typeof window.initSession === 'function') {
    const sessionInfo = await window.initSession();
    if (!sessionInfo) throw new Error('session_init_failed');
  }
}

async function getAuthenticatedHeaders(extraHeaders = {}) {
  const token = await window.getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (headers['Content-Type'] === undefined) {
    delete headers['Content-Type'];
  }
  return headers;
}

async function loadReports() {
  await ensureAuthenticatedContext();
  const period = document.getElementById('report-period')?.value || 'today';
  const res = await fetch('/api/reports/operational-summary?period=' + encodeURIComponent(period), {
    headers: await getAuthenticatedHeaders({ 'Content-Type': undefined })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data?.error || 'Falha ao carregar os relatorios operacionais.');
  }

  reportState.rows = data.detail_rows || [];
  reportState.periodLabel = data.period_label || 'Hoje';
  reportState.comparison = data.comparison || {};
  reportState.previousSummary = data.previous_summary || {};
  reportState.responseRiskModule = data.response_risk_module || { summary: {}, risk_distribution: [], highest_risk_topics: [], assistants_under_review: [] };
  reportState.recurringDemand = data.recurring_demand || { summary: {}, top_recurring_topics: [], fastest_growth_topics: [], highest_fallback_topics: [], highest_dissatisfaction_topics: [], by_assistant: [] };

  populateSelect('report-assistant', [...new Set(reportState.rows.map((row) => row.assistant_key).filter((value) => value && value !== 'unassigned'))], (value) => {
    const match = reportState.rows.find((row) => row.assistant_key === value);
    return match?.assistant_name || value;
  });
  populateSelect('report-channel', [...new Set(reportState.rows.map((row) => row.channel).filter(Boolean))]);
  populateSelect('report-risk-filter', [...new Set(reportState.rows.map((row) => row.risk_level).filter(Boolean))]);

  document.getElementById('report-period-label').textContent = 'Visao operacional: ' + reportState.periodLabel + '. ' + reportState.rows.length + ' atendimentos consolidados no recorte atual.';
  renderComparison(reportState.comparison);
  applyFilters();

  document.body.style.opacity = '1';
  if (window.applyPermissions) window.applyPermissions();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('report-apply')?.addEventListener('click', applyFilters);
  document.getElementById('report-clear')?.addEventListener('click', () => {
    document.getElementById('report-assistant').value = 'all';
    document.getElementById('report-channel').value = 'all';
    document.getElementById('report-risk-filter').value = 'all';
    document.getElementById('report-search').value = '';
    applyFilters();
  });
  document.getElementById('report-export')?.addEventListener('click', () => exportRowsToCsv(getFilteredRows()));
  document.getElementById('report-period')?.addEventListener('change', () => {
    loadReports().catch((error) => {
      console.error(error);
      document.body.style.opacity = '1';
    });
  });
  document.getElementById('report-assistant')?.addEventListener('change', applyFilters);
  document.getElementById('report-channel')?.addEventListener('change', applyFilters);
  document.getElementById('report-risk-filter')?.addEventListener('change', applyFilters);
  document.getElementById('report-search')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyFilters();
    }
  });

  loadReports().catch((error) => {
    console.error(error);
    document.body.style.opacity = '1';
  });
});

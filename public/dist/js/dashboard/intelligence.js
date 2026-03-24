function metricCard(label, value, tone) {
  return '<div class="col-md-6 col-xl-3 mb-3"><div class="card metric-card border-' + tone + '"><div class="card-body"><div class="text-muted small">' + label + '</div><div class="display-4">' + value + '</div></div></div></div>';
}

function renderBarList(rows, labelKey, valueKey, suffix = '') {
  if (!rows.length) return '<div class="text-muted">Sem dados ainda.</div>';
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return rows.map((row) => '<div class="mb-3"><div class="d-flex justify-content-between"><strong>' + (row[labelKey] || '-') + '</strong><span>' + (row[valueKey] || 0) + suffix + '</span></div><div class="assistant-bar"><span style="width:' + Math.round((Number(row[valueKey] || 0) / max) * 100) + '%"></span></div></div>').join('');
}

function renderAuditEvents(rows) {
  if (!rows.length) return '<div class="text-muted">Nenhum evento auditado.</div>';
  return rows.map((row) => '<div class="border-bottom pb-2 mb-2"><div><strong>' + (row.event_type || 'EVENTO') + '</strong> <span class="badge badge-secondary">' + (row.severity || 'INFO') + '</span></div><div class="small text-muted">' + new Date(row.created_at).toLocaleString('pt-BR') + '</div><div>' + (row.summary || '') + '</div></div>').join('');
}

function renderRiskModuleSummary(moduleData = {}) {
  const summary = moduleData.summary || {};
  if (!summary.total_assessed_responses) {
    return '<div class="text-muted">Sem respostas avaliadas neste período.</div>';
  }
  return [
    '<div class="mb-2"><strong>Respostas avaliadas:</strong> ' + (summary.total_assessed_responses || 0) + '</div>',
    '<div class="mb-2"><strong>Risco alto:</strong> ' + (summary.high_risk_count || 0) + '</div>',
    '<div class="mb-2"><strong>Revisão requerida:</strong> ' + (summary.review_required_count || 0) + '</div>',
    '<div class="mb-2"><strong>Respostas contidas:</strong> ' + (summary.abstained_count || 0) + '</div>',
    '<div class="mb-2"><strong>Sem fonte válida:</strong> ' + (summary.no_valid_source_count || 0) + '</div>',
    '<div><strong>Evidência média:</strong> ' + (summary.avg_evidence_score || 0) + '</div>'
  ].join('');
}

async function ensureAuthenticatedContext() {
  if (typeof window.initSession === 'function') {
    const sessionInfo = await window.initSession();
    if (!sessionInfo) {
      throw new Error('session_init_failed');
    }
  }
}

async function getAuthenticatedHeaders(extraHeaders = {}) {
  const token = await window.getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders
  };
}

async function loadDashboard() {
  await ensureAuthenticatedContext();
  const period = document.getElementById('dashboard-period')?.value || 'today';
  const res = await fetch('/api/intelligence/dashboard?period=' + encodeURIComponent(period), {
    headers: await getAuthenticatedHeaders()
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Falha ao carregar o dashboard.');
  }
  const metrics = data.metrics || {};

  document.getElementById('metrics-row').innerHTML = [
    metricCard('Consultas', metrics.total_consultations || 0, 'primary'),
    metricCard('Perguntas', metrics.total_questions || 0, 'info'),
    metricCard('Usuários únicos', metrics.unique_requesters || 0, 'secondary'),
    metricCard('Resolução automática', (metrics.automatic_resolution_rate || 0) + '%', 'success'),
    metricCard('Fallback humano', (metrics.fallback_rate || 0) + '%', 'warning'),
    metricCard('Cobertura de fonte', (metrics.source_coverage_rate || 0) + '%', 'dark'),
    metricCard('Tempo médio', (metrics.avg_response_time_seconds || 0) + 's', 'primary'),
    metricCard('Pendentes de revisão', metrics.pending_reviews || 0, 'danger')
  ].join('');

  document.getElementById('assistant-volume').innerHTML = renderBarList(data.assistant_volume || [], 'assistant_name', 'total');
  document.getElementById('top-topics').innerHTML = renderBarList(data.top_topics || [], 'topic', 'total');
  document.getElementById('channel-volume').innerHTML = renderBarList(data.channel_volume || [], 'channel', 'total');
  document.getElementById('risk-overview').innerHTML = renderBarList(data.risk_overview || [], 'risk_level', 'total');
  document.getElementById('dashboard-risk-summary').innerHTML = renderRiskModuleSummary(data.response_risk_module || {});
  document.getElementById('dashboard-risk-topics').innerHTML = renderBarList((data.response_risk_module || {}).highest_risk_topics || [], 'topic', 'high_risk_rate', '%');
  document.getElementById('dashboard-risk-assistants').innerHTML = renderBarList((data.response_risk_module || {}).assistants_under_review || [], 'assistant_name', 'review_rate', '%');
  document.getElementById('latest-audit-events').innerHTML = renderAuditEvents(data.latest_audit_events || []);
  document.getElementById('dashboard-period-label').textContent = 'Visão operacional: ' + (data.period_label || 'Hoje');
  document.body.style.opacity = '1';
  if (window.applyPermissions) window.applyPermissions();
}

document.addEventListener('DOMContentLoaded', () => {
  const periodSelect = document.getElementById('dashboard-period');
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      loadDashboard().catch((error) => {
        console.error(error);
        document.body.style.opacity = '1';
      });
    });
  }

  loadDashboard().catch((error) => {
    console.error(error);
    document.body.style.opacity = '1';
  });
});

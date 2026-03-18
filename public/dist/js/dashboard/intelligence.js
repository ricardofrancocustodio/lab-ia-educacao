function metricCard(label, value, tone) {
  return '<div class="col-md-4 col-xl-2 mb-3"><div class="card metric-card border-' + tone + '"><div class="card-body"><div class="text-muted small">' + label + '</div><div class="display-4">' + value + '</div></div></div></div>';
}

function renderAssistantVolume(rows) {
  if (!rows.length) return '<div class="text-muted">Sem dados ainda.</div>';
  const max = Math.max(...rows.map((row) => row.total), 1);
  return rows.map((row) => '<div class="mb-3"><div class="d-flex justify-content-between"><strong>' + row.assistant_name + '</strong><span>' + row.total + '</span></div><div class="assistant-bar"><span style="width:' + Math.round((row.total / max) * 100) + '%"></span></div></div>').join('');
}

function renderAuditEvents(rows) {
  if (!rows.length) return '<div class="text-muted">Nenhum evento auditado.</div>';
  return rows.map((row) => '<div class="border-bottom pb-2 mb-2"><div><strong>' + (row.event_type || 'EVENTO') + '</strong> <span class="badge badge-secondary">' + (row.severity || 'INFO') + '</span></div><div class="small text-muted">' + new Date(row.created_at).toLocaleString('pt-BR') + '</div><div>' + (row.summary || '') + '</div></div>').join('');
}

async function ensureAuthenticatedContext() {
  if (typeof window.initSession === 'function') {
    const sessionInfo = await window.initSession();
    if (!sessionInfo) {
      throw new Error('session_init_failed');
    }
  }
}

async function loadDashboard() {
  await ensureAuthenticatedContext();
  const period = document.getElementById('dashboard-period')?.value || 'today';
  const res = await fetch('/api/intelligence/dashboard?period=' + encodeURIComponent(period));
  const data = await res.json();
  const metrics = data.metrics || {};

  document.getElementById('metrics-row').innerHTML = [
    metricCard('Consultas', metrics.total_consultations || 0, 'primary'),
    metricCard('Em andamento', metrics.active_consultations || 0, 'warning'),
    metricCard('Resolvidas', metrics.resolved_consultations || 0, 'success'),
    metricCard('Cobertura de fonte', (metrics.source_coverage_rate || 0) + '%', 'info'),
    metricCard('Confianca media', metrics.avg_confidence || 0, 'secondary'),
    metricCard('Eventos auditados', metrics.audited_events || 0, 'dark')
  ].join('');

  document.getElementById('assistant-volume').innerHTML = renderAssistantVolume(data.assistant_volume || []);
  document.getElementById('latest-audit-events').innerHTML = renderAuditEvents(data.latest_audit_events || []);
  document.getElementById('dashboard-period-label').textContent = 'Visao operacional: ' + (data.period_label || 'Hoje');
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

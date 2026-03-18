function renderList(containerId, rows, formatter) {
  const container = document.getElementById(containerId);
  if (!rows.length) {
    container.innerHTML = '<div class="text-muted">Sem dados disponiveis.</div>';
    return;
  }
  container.innerHTML = rows.map(formatter).join('');
}

async function ensureAuthenticatedContext() {
  if (typeof window.initSession === 'function') {
    const sessionInfo = await window.initSession();
    if (!sessionInfo) {
      throw new Error('session_init_failed');
    }
  }
}

async function loadReports() {
  await ensureAuthenticatedContext();
  const res = await fetch('/api/reports/operational-summary');
  const data = await res.json();
  renderList('report-status', data.consultations_by_status || [], (row) => '<div class="mb-2"><strong>' + row.status + '</strong>: ' + row.total + '</div>');
  renderList('report-topics', data.top_topics || [], (row) => '<div class="mb-2"><strong>' + row.topic + '</strong>: ' + row.total + '</div>');
  renderList('report-sources', data.source_adoption || [], (row) => '<div class="mb-2"><strong>' + row.assistant_key + '</strong>: ' + row.source_coverage_rate + '%</div>');
  document.body.style.opacity = '1';
  if (window.applyPermissions) window.applyPermissions();
}

document.addEventListener('DOMContentLoaded', () => {
  loadReports().catch((error) => {
    console.error(error);
    document.body.style.opacity = '1';
  });
});

const NetworkOverviewPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  let schoolsData = [];
  let currentSort = { field: 'health_score', asc: true };

  async function getAuthHeaders() {
    const token = await window.getAccessToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  function healthBadge(score) {
    const cls = score >= 65 ? 'health-good' : score >= 40 ? 'health-warning' : 'health-danger';
    return `<span class="health-badge ${cls}">${score}</span>`;
  }

  function fmtPct(val) {
    return val != null ? val.toFixed(1) + '%' : '-';
  }

  function renderTotals(totals) {
    document.getElementById('stat-total-schools').textContent = totals.total_schools;
    document.getElementById('stat-avg-coverage').textContent = totals.avg_coverage != null ? totals.avg_coverage + '%' : '-';
    document.getElementById('stat-avg-confidence').textContent = totals.avg_confidence != null ? totals.avg_confidence + '%' : '-';
    document.getElementById('stat-open-incidents').textContent = totals.open_incidents;
    document.getElementById('stat-total-consultations').textContent = totals.total_consultations;
    document.getElementById('stat-pending-corrections').textContent = totals.pending_corrections;
    document.getElementById('stat-negative-feedbacks').textContent = totals.negative_feedbacks;
    document.getElementById('stat-avg-health').textContent = totals.avg_health_score != null ? totals.avg_health_score : '-';
  }

  function renderTable() {
    const sorted = [...schoolsData].sort((a, b) => {
      let va, vb;
      if (currentSort.field === 'school_name') {
        va = a.school_name.toLowerCase();
        vb = b.school_name.toLowerCase();
      } else {
        va = a.metrics[currentSort.field] ?? -1;
        vb = b.metrics[currentSort.field] ?? -1;
      }
      if (va < vb) return currentSort.asc ? -1 : 1;
      if (va > vb) return currentSort.asc ? 1 : -1;
      return 0;
    });

    const tbody = document.getElementById('no-school-tbody');
    if (!sorted.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">Nenhuma escola encontrada</td></tr>';
      return;
    }

    let html = '';
    sorted.forEach(s => {
      const m = s.metrics;
      const criticalTag = m.critical_open > 0 ? ` <span class="badge badge-danger" title="Criticos abertos">${m.critical_open} crit</span>` : '';
      html += `<tr>
        <td><strong>${escapeHtml(s.school_name)}</strong></td>
        <td>${healthBadge(m.health_score)}</td>
        <td>${fmtPct(m.source_coverage_rate)}</td>
        <td>${fmtPct(m.avg_confidence)}</td>
        <td>${m.total_consultations}</td>
        <td>${fmtPct(m.resolution_rate)}</td>
        <td>${m.open_incidents}${criticalTag}</td>
        <td>${fmtPct(m.positive_rate)}</td>
        <td>${m.pending_corrections} / ${m.total_corrections}</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }

  function setupSorting() {
    document.querySelectorAll('#no-school-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (currentSort.field === field) {
          currentSort.asc = !currentSort.asc;
        } else {
          currentSort.field = field;
          currentSort.asc = field === 'school_name';
        }
        renderTable();
      });
    });
  }

  async function loadOverview() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/network/overview?_t=' + Date.now(), { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar dados da rede.');

    if (!data.schools || data.schools.length === 0) {
      document.getElementById('no-single-school-msg').style.display = '';
      return;
    }

    schoolsData = data.schools;
    renderTotals(data.network_totals);
    renderTable();
  }

  async function init() {
    try {
      if (typeof window.initSession === 'function') {
        const sessionInfo = await window.initSession();
        if (!sessionInfo) throw new Error('session_init_failed');
      }

      setupSorting();
      await loadOverview();

      document.getElementById('no-loading').style.display = 'none';
      document.getElementById('no-root').style.display = '';
    } catch (err) {
      console.error('NetworkOverviewPanelPage init error:', err);
      document.getElementById('no-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar a visao da rede. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return {};
})();

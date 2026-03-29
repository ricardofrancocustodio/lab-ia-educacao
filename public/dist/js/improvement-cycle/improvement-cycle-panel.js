const ImprovementCyclePanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const TYPE_LABELS = { wrong_information: 'Info incorreta', outdated_content: 'Conteudo desatualizado', hallucination: 'Alucinacao', inappropriate_tone: 'Tom inadequado', wrong_source: 'Fonte errada', incomplete_answer: 'Resp. incompleta', other: 'Outro' };
  const ROOT_LABELS = { outdated_knowledge_source: 'Fonte desatualizada', missing_knowledge_source: 'Fonte ausente', prompt_issue: 'Problema no prompt', model_hallucination: 'Alucinacao do modelo', wrong_retrieval: 'Recuperacao incorreta', ambiguous_question: 'Pergunta ambigua', other: 'Outro' };
  const KB_LABELS = { content_updated: 'Conteudo atualizado', source_created: 'Fonte criada', source_suspended: 'Fonte suspensa', prompt_adjusted: 'Prompt ajustado', embedding_refreshed: 'Embeddings atualizados', faq_updated: 'FAQ atualizado', other: 'Outro' };

  const FUNNEL_COLORS = ['#6c757d', '#dc3545', '#fd7e14', '#0d6efd', '#198754', '#20c997', '#0dcaf0'];

  async function getAuthHeaders() {
    const token = await window.getAccessToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  function renderFunnel(funnel) {
    const steps = [
      { label: 'Total Feedbacks', value: funnel.total_feedbacks, color: FUNNEL_COLORS[0] },
      { label: 'Feedbacks Negativos', value: funnel.negative_feedbacks, color: FUNNEL_COLORS[1] },
      { label: 'Com Correcao Criada', value: funnel.feedbacks_with_corrections, color: FUNNEL_COLORS[2] },
      { label: 'Total Correcoes', value: funnel.total_corrections, color: FUNNEL_COLORS[3] },
      { label: 'Correcoes Aplicadas', value: funnel.applied_corrections, color: FUNNEL_COLORS[4] },
      { label: 'Com Mudanca na Base', value: funnel.corrections_with_kb_changes, color: FUNNEL_COLORS[5] },
      { label: 'Total Mudancas KB', value: funnel.total_kb_changes, color: FUNNEL_COLORS[6] }
    ];

    const maxVal = Math.max(...steps.map(s => s.value), 1);
    const container = document.getElementById('ic-funnel-container');
    let html = '';

    for (let i = 0; i < steps.length; i++) {
      const pct = Math.max(Math.round(steps[i].value / maxVal * 100), 5);
      html += `<div class="ic-funnel-step">
        <div class="ic-funnel-label">${steps[i].label}</div>
        <div class="ic-funnel-bar" style="width:${pct}%;background:${steps[i].color};">${steps[i].value}</div>
      </div>`;
      if (i < steps.length - 1) {
        html += '<div class="ic-arrow"><i class="fas fa-arrow-down"></i></div>';
      }
    }

    container.innerHTML = html;
  }

  function renderDistribution(containerId, dist, labels) {
    const el = document.getElementById(containerId);
    const entries = Object.entries(dist || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      el.innerHTML = '<p class="text-muted mb-0">Sem dados</p>';
      return;
    }
    const maxVal = Math.max(...entries.map(e => e[1]), 1);
    const colors = ['#0d6efd', '#198754', '#fd7e14', '#dc3545', '#6f42c1', '#20c997', '#6c757d'];
    let html = '';
    entries.forEach(([key, val], i) => {
      const pct = Math.round(val / maxVal * 100);
      const color = colors[i % colors.length];
      html += `<div class="mb-2"><div class="d-flex justify-content-between" style="font-size:.82rem;"><span>${escapeHtml(labels[key] || key)}</span><strong>${val}</strong></div><div class="ic-dist-bar"><div class="ic-dist-fill" style="width:${pct}%;background:${color};"></div></div></div>`;
    });
    el.innerHTML = html;
  }

  async function loadStats() {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/improvement-cycle/stats?_t=' + Date.now(), { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar metricas.');
    const s = data.stats;

    // SLA cards
    document.getElementById('stat-sla-fb-corr').textContent = s.sla.avg_feedback_to_correction_hours != null ? s.sla.avg_feedback_to_correction_hours + 'h' : '-';
    document.getElementById('stat-sla-corr-app').textContent = s.sla.avg_correction_to_applied_hours != null ? s.sla.avg_correction_to_applied_hours + 'h' : '-';
    document.getElementById('stat-sla-app-kb').textContent = s.sla.avg_applied_to_kb_hours != null ? s.sla.avg_applied_to_kb_hours + 'h' : '-';
    document.getElementById('stat-sla-full').textContent = s.sla.avg_full_cycle_hours != null ? s.sla.avg_full_cycle_hours + 'h' : '-';

    // Conversion rate cards
    document.getElementById('stat-rate-fb').textContent = s.conversion_rates.feedback_to_correction + '%';
    document.getElementById('stat-rate-app').textContent = s.conversion_rates.correction_to_applied + '%';
    document.getElementById('stat-rate-kb').textContent = s.conversion_rates.applied_to_kb + '%';
    document.getElementById('stat-rate-full').textContent = s.conversion_rates.full_cycle + '%';

    // Funnel
    renderFunnel(s.funnel);

    // Distributions
    renderDistribution('ic-dist-types', s.distributions.correction_types, TYPE_LABELS);
    renderDistribution('ic-dist-roots', s.distributions.root_causes, ROOT_LABELS);
    renderDistribution('ic-dist-kb', s.distributions.kb_change_types, KB_LABELS);
  }

  async function init() {
    try {
      if (typeof window.initSession === 'function') {
        const sessionInfo = await window.initSession();
        if (!sessionInfo) throw new Error('session_init_failed');
      }

      await loadStats();

      document.getElementById('ic-loading').style.display = 'none';
      document.getElementById('ic-root').style.display = '';
    } catch (err) {
      console.error('ImprovementCyclePanelPage init error:', err);
      document.getElementById('ic-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar o ciclo de melhoria. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return {};
})();

const KnowledgeGapsPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const GAP_LABELS = { abstained: 'Abstencao', no_source: 'Sem fonte', high_risk: 'Alto risco', fallback: 'Fallback humano', low_confidence: 'Baixa confianca' };
  const GAP_BADGE_CLASS = { abstained: 'gap-badge-abstained', no_source: 'gap-badge-no-source', high_risk: 'gap-badge-high-risk', fallback: 'gap-badge-fallback', low_confidence: 'gap-badge-low-conf' };

  let gapData = { gaps: [], detail_rows: [], summary: {} };
  let assistantData = [];

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

  function getGapTypes(row) {
    const types = [];
    if (row.abstained) types.push('abstained');
    if (!row.has_valid_source) types.push('no_source');
    if (row.risk_level === 'HIGH') types.push('high_risk');
    if (row.fallback_to_human) types.push('fallback');
    if (row.confidence_score !== null && row.confidence_score < 0.5) types.push('low_confidence');
    return types;
  }

  function renderBadges(types) {
    return types.map(t => `<span class="gap-badge ${GAP_BADGE_CLASS[t] || ''} mr-1">${GAP_LABELS[t] || t}</span>`).join('');
  }

  function renderStats(summary) {
    document.getElementById('stat-total-gaps').textContent = summary.total_gaps || 0;
    document.getElementById('stat-abstained').textContent = summary.total_abstained || 0;
    document.getElementById('stat-no-source').textContent = summary.total_no_source || 0;
    document.getElementById('stat-fallback').textContent = summary.total_fallback || 0;
    document.getElementById('stat-topics').textContent = summary.unique_topics || 0;
  }

  // ── By Topic tab ──
  function renderTopicCard(topic) {
    const maxTotal = gapData.gaps[0]?.total || 1;
    const pct = Math.round((topic.total / maxTotal) * 100);

    const badges = [];
    if (topic.abstained > 0) badges.push(`<span class="gap-badge gap-badge-abstained mr-1">${topic.abstained} abstencao</span>`);
    if (topic.no_source > 0) badges.push(`<span class="gap-badge gap-badge-no-source mr-1">${topic.no_source} sem fonte</span>`);
    if (topic.high_risk > 0) badges.push(`<span class="gap-badge gap-badge-high-risk mr-1">${topic.high_risk} alto risco</span>`);
    if (topic.fallback > 0) badges.push(`<span class="gap-badge gap-badge-fallback mr-1">${topic.fallback} fallback</span>`);
    if (topic.low_confidence > 0) badges.push(`<span class="gap-badge gap-badge-low-conf mr-1">${topic.low_confidence} baixa conf.</span>`);

    return `<div class="gap-card" onclick="KnowledgeGapsPage.viewTopic('${escapeHtml(topic.topic)}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          <strong>${escapeHtml(topic.topic)}</strong>
          <div class="mt-1">${badges.join('')}</div>
        </div>
        <div class="text-right">
          <span class="stat-value" style="font-size:1.2rem;">${topic.total}</span>
          <div class="gap-meta">ocorrencia${topic.total !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="gap-bar"><div class="gap-bar-fill bg-warning" style="width:${pct}%"></div></div>
    </div>`;
  }

  function renderTopicList(topics) {
    const container = document.getElementById('topic-list');
    const label = document.getElementById('topic-count-label');
    label.textContent = topics.length + ' topico' + (topics.length !== 1 ? 's' : '');
    if (!topics.length) {
      container.innerHTML = '<div class="gaps-empty"><i class="fas fa-check-circle fa-2x mb-2 d-block text-success"></i>Nenhuma lacuna identificada neste periodo.</div>';
      return;
    }
    container.innerHTML = topics.map(renderTopicCard).join('');
  }

  // ── By Assistant tab ──
  function renderAssistantList(assistants) {
    const container = document.getElementById('assistant-list');
    if (!assistants.length) {
      container.innerHTML = '<div class="gaps-empty"><i class="fas fa-robot fa-2x mb-2 d-block text-muted"></i>Nenhum dado de assistente disponivel.</div>';
      return;
    }
    container.innerHTML = assistants.map(a => {
      const topicsHtml = (a.top_gap_topics || []).map(t => `<span class="badge badge-light mr-1">${escapeHtml(t.topic)} (${t.total})</span>`).join('');
      return `<div class="assistant-gap-card mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <i class="fas fa-robot mr-1 text-info"></i><strong>${escapeHtml(a.assistant_name)}</strong>
          </div>
          <span class="stat-value text-danger" style="font-size:1.1rem;">${a.total_gaps} lacuna${a.total_gaps !== 1 ? 's' : ''}</span>
        </div>
        <div class="mt-2 d-flex flex-wrap gap-meta" style="gap:12px;">
          <span><i class="fas fa-ban text-purple mr-1"></i>${a.abstained || 0} abstencao</span>
          <span><i class="fas fa-unlink text-warning mr-1"></i>${a.no_source || 0} sem fonte</span>
          <span><i class="fas fa-exclamation-triangle text-danger mr-1"></i>${a.high_risk || 0} alto risco</span>
          <span><i class="fas fa-user text-info mr-1"></i>${a.fallback || 0} fallback</span>
        </div>
        ${topicsHtml ? `<div class="mt-2">Topicos: ${topicsHtml}</div>` : ''}
      </div>`;
    }).join('');
  }

  // ── Detail tab ──
  function renderDetailCard(row) {
    const types = getGapTypes(row);
    const confidence = row.confidence_score !== null ? `<span class="gap-meta ml-2"><i class="fas fa-signal"></i> ${(row.confidence_score * 100).toFixed(0)}%</span>` : '';
    const source = row.primary_source_title ? `<span class="gap-meta ml-2"><i class="fas fa-book"></i> ${escapeHtml(row.primary_source_title.substring(0, 40))}</span>` : '';

    return `<div class="gap-card" onclick="KnowledgeGapsPage.viewDetail('${row.consultation_id}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          ${renderBadges(types)}
          <div class="mt-1"><strong>${escapeHtml(row.topic)}</strong></div>
          <div class="mt-1">
            <span class="gap-meta"><i class="fas fa-robot"></i> ${escapeHtml(row.assistant_name)}</span>
            ${confidence}${source}
          </div>
        </div>
        <div class="gap-meta text-right">${formatDate(row.asked_at)}</div>
      </div>
    </div>`;
  }

  function renderDetailList(rows) {
    const container = document.getElementById('detail-list');
    const label = document.getElementById('detail-count-label');
    label.textContent = rows.length + ' registro' + (rows.length !== 1 ? 's' : '');
    if (!rows.length) {
      container.innerHTML = '<div class="gaps-empty"><i class="fas fa-check-circle fa-2x mb-2 d-block text-success"></i>Nenhuma lacuna encontrada.</div>';
      return;
    }
    container.innerHTML = rows.map(renderDetailCard).join('');
  }

  // ── Filters ──
  function applyTopicFilter() {
    const search = (document.getElementById('filter-topic-search').value || '').toLowerCase();
    const filtered = gapData.gaps.filter(t => !search || t.topic.toLowerCase().includes(search));
    renderTopicList(filtered);
  }

  function applyDetailFilter() {
    const type = document.getElementById('filter-gap-type').value;
    const search = (document.getElementById('filter-detail-search').value || '').toLowerCase();
    let filtered = [...gapData.detail_rows];
    if (type === 'abstained') filtered = filtered.filter(r => r.abstained);
    else if (type === 'no_source') filtered = filtered.filter(r => !r.has_valid_source);
    else if (type === 'high_risk') filtered = filtered.filter(r => r.risk_level === 'HIGH');
    else if (type === 'fallback') filtered = filtered.filter(r => r.fallback_to_human);
    else if (type === 'low_confidence') filtered = filtered.filter(r => r.confidence_score !== null && r.confidence_score < 0.5);
    if (search) filtered = filtered.filter(r => (r.topic || '').toLowerCase().includes(search) || (r.assistant_name || '').toLowerCase().includes(search));
    renderDetailList(filtered);
  }

  // ── Modal views ──
  function viewTopic(topicName) {
    const topic = gapData.gaps.find(t => t.topic === topicName);
    if (!topic) return;
    const rows = gapData.detail_rows.filter(r => r.topic === topicName);
    const body = document.getElementById('gapDetailBody');
    document.getElementById('gapDetailTitle').textContent = topicName;

    let html = `<table class="gap-detail-table w-100 mb-3">
      <tr><td>Total de lacunas</td><td>${topic.total}</td></tr>
      <tr><td>Abstencoes</td><td>${topic.abstained}</td></tr>
      <tr><td>Sem fonte</td><td>${topic.no_source}</td></tr>
      <tr><td>Alto risco</td><td>${topic.high_risk}</td></tr>
      <tr><td>Fallback humano</td><td>${topic.fallback}</td></tr>
      <tr><td>Baixa confianca</td><td>${topic.low_confidence}</td></tr>
      <tr><td>Contestados</td><td>${topic.contested || 0}</td></tr>
    </table>`;

    if (rows.length) {
      html += '<h6 class="mt-3 mb-2">Consultas recentes neste topico</h6>';
      html += rows.slice(0, 10).map(r => {
        const types = getGapTypes(r);
        return `<div class="p-2 mb-2" style="background:#f8f9fa; border-radius:8px; border:1px solid #e9ecef;">
          <div class="d-flex justify-content-between">
            <span>${renderBadges(types)}</span>
            <span class="gap-meta">${formatDate(r.asked_at)}</span>
          </div>
          <div class="gap-meta mt-1"><i class="fas fa-robot"></i> ${escapeHtml(r.assistant_name)} &middot; Confianca: ${r.confidence_score !== null ? (r.confidence_score * 100).toFixed(0) + '%' : 'N/A'}</div>
        </div>`;
      }).join('');
    }

    body.innerHTML = html;
    $('#gapDetailModal').modal('show');
  }

  function viewDetail(consultationId) {
    const row = gapData.detail_rows.find(r => r.consultation_id === consultationId);
    if (!row) return;
    const types = getGapTypes(row);
    document.getElementById('gapDetailTitle').textContent = 'Consulta - ' + escapeHtml(row.topic);
    const body = document.getElementById('gapDetailBody');
    body.innerHTML = `<table class="gap-detail-table w-100">
      <tr><td>Topico</td><td>${escapeHtml(row.topic)}</td></tr>
      <tr><td>Tipos de lacuna</td><td>${renderBadges(types)}</td></tr>
      <tr><td>Assistente</td><td>${escapeHtml(row.assistant_name)}</td></tr>
      <tr><td>Confianca</td><td>${row.confidence_score !== null ? (row.confidence_score * 100).toFixed(0) + '%' : 'N/A'}</td></tr>
      <tr><td>Fonte</td><td>${row.primary_source_title ? escapeHtml(row.primary_source_title) : '<em class="text-muted">Sem fonte</em>'}</td></tr>
      <tr><td>Nivel de risco</td><td>${escapeHtml(row.risk_level)}</td></tr>
      <tr><td>Status revisao</td><td>${escapeHtml(row.review_status)}</td></tr>
      <tr><td>Canal</td><td>${escapeHtml(row.channel)}</td></tr>
      <tr><td>Data pergunta</td><td>${formatDate(row.asked_at)}</td></tr>
      <tr><td>Data resposta</td><td>${formatDate(row.answered_at)}</td></tr>
      <tr><td>Modo resposta</td><td>${escapeHtml(row.response_mode)}</td></tr>
    </table>`;
    $('#gapDetailModal').modal('show');
  }

  // ── Load data ──
  async function loadData() {
    const period = document.getElementById('filter-period').value;
    const headers = await getAuthHeaders();

    const [gapsRes, assistantsRes] = await Promise.all([
      fetch(`/api/knowledge-gaps?period=${encodeURIComponent(period)}`, { headers }),
      fetch(`/api/knowledge-gaps/by-assistant?period=${encodeURIComponent(period)}`, { headers })
    ]);

    if (!gapsRes.ok) throw new Error('Falha ao carregar lacunas');
    const gapsJson = await gapsRes.json();
    if (!gapsJson.ok) throw new Error(gapsJson.error || 'Erro desconhecido');

    gapData = gapsJson;
    renderStats(gapData.summary || {});
    renderTopicList(gapData.gaps || []);
    renderDetailList(gapData.detail_rows || []);

    if (assistantsRes.ok) {
      const aJson = await assistantsRes.json();
      assistantData = aJson.assistants || [];
    } else {
      assistantData = [];
    }
    renderAssistantList(assistantData);
  }

  async function init() {
    try {
      if (typeof window.initSession === 'function') {
        const sessionInfo = await window.initSession();
        if (!sessionInfo) return;
      }

      const role = sessionStorage.getItem('EFFECTIVE_ROLE') || '';
      const allowed = ['superadmin', 'network_manager', 'content_curator', 'direction', 'secretariat', 'auditor'];
      if (!allowed.includes(role)) {
        document.getElementById('gaps-loading').innerHTML = '<p class="text-danger">Acesso nao autorizado.</p>';
        return;
      }

      document.getElementById('filter-period').addEventListener('change', () => { loadData().catch(console.error); });
      document.getElementById('filter-topic-search').addEventListener('input', applyTopicFilter);
      document.getElementById('filter-gap-type').addEventListener('change', applyDetailFilter);
      document.getElementById('filter-detail-search').addEventListener('input', applyDetailFilter);

      await loadData();
      document.getElementById('gaps-loading').style.display = 'none';
      document.getElementById('gaps-root').style.display = '';
    } catch (err) {
      console.error('KnowledgeGapsPage init error:', err);
      document.getElementById('gaps-loading').innerHTML = '<p class="text-danger">Erro ao carregar lacunas de conhecimento.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => { init(); });

  return { viewTopic, viewDetail };
})();

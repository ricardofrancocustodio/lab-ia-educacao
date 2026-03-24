const AUDIT_TREATMENT_INBOX_PAGE_CONFIG = {
  audit: {
    title: 'Fila de Encaminhamentos',
    subtitle: 'Direção, compliance e auditoria acompanham os casos enviados para tratamento.',
    destinationByRole: {
      direction: 'direction_compliance'
    },
    viewAllRoles: new Set(['superadmin', 'auditor'])
  },
  'official-content': {
    title: 'Fila de Tratamento Institucional',
    subtitle: 'Curadoria e secretaria recebem aqui os casos que exigem atualização de conteúdo oficial.',
    destinationByRole: {
      content_curator: 'content_curation',
      network_manager: 'network_secretariat',
      secretariat: 'network_secretariat'
    },
    viewAllRoles: new Set(['superadmin'])
  },
  'chat-manager': {
    title: 'Fila da Operação de Atendimento',
    subtitle: 'Atendimento humano acompanha aqui os casos encaminhados pela auditoria.',
    destinationByRole: {
      public_operator: 'service_operation',
      coordination: 'service_operation'
    },
    viewAllRoles: new Set(['superadmin'])
  }
};

const AUDIT_TREATMENT_INBOX_STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  DISMISSED: 'Descartado'
};

const auditTreatmentInboxState = {
  mounted: false,
  loading: false,
  items: [],
  destinations: [],
  destinationFilter: '',
  includeCompleted: false
};

function normalizeAuditTreatmentRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getAuditTreatmentEffectiveRole() {
  return normalizeAuditTreatmentRole(
    sessionStorage.getItem('EFFECTIVE_ROLE') ||
    sessionStorage.getItem('PLATFORM_ROLE') ||
    sessionStorage.getItem('USER_ROLE') || ''
  );
}

function getAuditTreatmentPageKey() {
  return String(document.body?.dataset?.page || '').trim();
}

function getAuditTreatmentPageConfig() {
  return AUDIT_TREATMENT_INBOX_PAGE_CONFIG[getAuditTreatmentPageKey()] || null;
}

function getAuditTreatmentDestinationFilter(config, role) {
  if (!config) return '';
  if (config.viewAllRoles?.has(role)) return auditTreatmentInboxState.destinationFilter || '';
  return config.destinationByRole?.[role] || auditTreatmentInboxState.destinationFilter || '';
}

async function ensureAuditTreatmentContext() {
  if (typeof window.initSession === 'function') {
    const sessionInfo = await window.initSession();
    if (!sessionInfo) throw new Error('session_init_failed');
  }
}

async function getAuditTreatmentHeaders(extraHeaders = {}) {
  const token = typeof window.getAccessToken === 'function' ? await window.getAccessToken() : '';
  const headers = {
    Authorization: token ? 'Bearer ' + token : '',
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (!headers.Authorization) delete headers.Authorization;
  if (headers['Content-Type'] === undefined) delete headers['Content-Type'];
  return headers;
}

function escapeAuditTreatmentHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAuditTreatmentDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch (_error) {
    return value;
  }
}

function getAuditTreatmentStatusLabel(value) {
  const normalized = String(value || 'OPEN').trim().toUpperCase();
  return AUDIT_TREATMENT_INBOX_STATUS_LABELS[normalized] || 'Aberto';
}

function getAuditTreatmentStatusTone(value) {
  const normalized = String(value || 'OPEN').trim().toUpperCase();
  if (normalized === 'IN_PROGRESS') return 'warning';
  if (normalized === 'COMPLETED') return 'success';
  if (normalized === 'DISMISSED') return 'secondary';
  return 'primary';
}

function ensureAuditTreatmentInboxStyles() {
  if (document.getElementById('audit-treatment-inbox-styles')) return;
  const style = document.createElement('style');
  style.id = 'audit-treatment-inbox-styles';
  style.textContent = `
    .audit-treatment-inbox-card { border-radius: 14px; overflow: hidden; }
    .audit-treatment-inbox-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .audit-treatment-inbox-toolbar .form-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .audit-treatment-inbox-list { display: grid; gap: 12px; }
    .audit-treatment-item { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
    .audit-treatment-item-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .audit-treatment-item-title { font-weight: 700; font-size: 0.98rem; color: #1f2937; }
    .audit-treatment-item-meta { margin-top: 4px; font-size: 0.82rem; color: #6b7280; }
    .audit-treatment-item-summary { margin-top: 10px; color: #374151; line-height: 1.5; }
    .audit-treatment-item-grid { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px 12px; }
    .audit-treatment-item-grid div { font-size: 0.83rem; color: #4b5563; }
    .audit-treatment-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; }
    .audit-treatment-pill.primary { background: #dbeafe; color: #1d4ed8; }
    .audit-treatment-pill.warning { background: #fef3c7; color: #92400e; }
    .audit-treatment-pill.success { background: #dcfce7; color: #166534; }
    .audit-treatment-pill.secondary { background: #e5e7eb; color: #374151; }
    .audit-treatment-actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
    .audit-treatment-actions .btn { border-radius: 999px; }
    .audit-treatment-box-muted { font-size: 0.85rem; color: #6b7280; }
    .audit-treatment-sidebar-box { margin: 0 12px 12px; }
    .audit-treatment-sidebar-box .card-body { padding: 12px; }
    .audit-treatment-sidebar-box .audit-treatment-item { padding: 12px; }
  `;
  document.head.appendChild(style);
}

function ensureAuditTreatmentInboxMount() {
  if (auditTreatmentInboxState.mounted) return document.getElementById('audit-treatment-inbox-card');
  ensureAuditTreatmentInboxStyles();
  const pageKey = getAuditTreatmentPageKey();
  const config = getAuditTreatmentPageConfig();
  if (!config) return null;

  const card = document.createElement('div');
  card.className = 'card mb-3 audit-treatment-inbox-card';
  card.id = 'audit-treatment-inbox-card';
  card.innerHTML = `
    <div class="card-header">
      <div class="audit-treatment-inbox-toolbar">
        <div>
          <h3 class="card-title">${escapeAuditTreatmentHtml(config.title)}</h3><br>
          <div class="audit-treatment-box-muted mt-1">${escapeAuditTreatmentHtml(config.subtitle)}</div>
        </div>
        <div class="form-inline">
          <select class="form-control form-control-sm" id="audit-treatment-destination-filter" style="min-width:220px;display:none;"></select>
          <div class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="audit-treatment-show-completed">
            <label class="custom-control-label" for="audit-treatment-show-completed">Mostrar concluídos</label>
          </div>
          <button class="btn btn-outline-secondary btn-sm" id="audit-treatment-refresh">Atualizar</button>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div id="audit-treatment-inbox-summary" class="audit-treatment-box-muted mb-3">Carregando fila de tratamento...</div>
      <div id="audit-treatment-inbox-list" class="audit-treatment-inbox-list">
        <div class="text-muted small">Carregando fila...</div>
      </div>
    </div>
  `;

  if (pageKey === 'chat-manager') {
    card.classList.add('audit-treatment-sidebar-box');
    const sidebar = document.querySelector('.chat-sidebar');
    const contactList = document.getElementById('contact-list');
    if (sidebar && contactList) {
      sidebar.insertBefore(card, contactList);
    } else {
      return null;
    }
  } else {
    const container = document.querySelector('.content .container-fluid');
    if (!container) return null;
    const firstCard = container.querySelector('.card');
    if (firstCard) {
      container.insertBefore(card, firstCard);
    } else {
      container.prepend(card);
    }
  }

  document.getElementById('audit-treatment-refresh')?.addEventListener('click', () => {
    void loadAuditTreatmentInbox();
  });
  document.getElementById('audit-treatment-show-completed')?.addEventListener('change', (event) => {
    auditTreatmentInboxState.includeCompleted = Boolean(event.target?.checked);
    void loadAuditTreatmentInbox();
  });
  document.getElementById('audit-treatment-destination-filter')?.addEventListener('change', (event) => {
    auditTreatmentInboxState.destinationFilter = String(event.target?.value || '').trim();
    void loadAuditTreatmentInbox();
  });

  auditTreatmentInboxState.mounted = true;
  return card;
}

function renderAuditTreatmentDestinationFilter(destinations, pageConfig, role) {
  const select = document.getElementById('audit-treatment-destination-filter');
  if (!select) return;

  const forcedDestination = pageConfig.viewAllRoles?.has(role) ? '' : (pageConfig.destinationByRole?.[role] || '');
  const allowChoice = pageConfig.viewAllRoles?.has(role) || (destinations || []).length > 1;
  const currentValue = forcedDestination || auditTreatmentInboxState.destinationFilter || '';
  const options = ['<option value="">Todos os destinos desta página</option>']
    .concat((destinations || []).map((item) => `<option value="${escapeAuditTreatmentHtml(item.key)}">${escapeAuditTreatmentHtml(item.label)}</option>`));

  select.innerHTML = options.join('');
  select.value = currentValue;
  select.style.display = allowChoice ? '' : 'none';
  if (forcedDestination) {
    select.value = forcedDestination;
    select.disabled = true;
  } else {
    select.disabled = !allowChoice;
  }
}

function renderAuditTreatmentInbox(items, scopeMode) {
  const list = document.getElementById('audit-treatment-inbox-list');
  const summary = document.getElementById('audit-treatment-inbox-summary');
  if (!list || !summary) return;

  const scopeLabel = scopeMode === 'network' ? 'Escopo de rede' : scopeMode === 'global' ? 'Escopo ampliado' : 'Escopo local';
  summary.textContent = items.length
    ? `${scopeLabel}: ${items.length} item(ns) aguardando tratamento nesta fila.`
    : `${scopeLabel}: nenhuma demanda encontrada para este destino no momento.`;

  if (!items.length) {
    list.innerHTML = '<div class="text-muted small">Nenhum caso encaminhado para esta fila.</div>';
    return;
  }

  list.innerHTML = items.map((item) => {
    const statusTone = getAuditTreatmentStatusTone(item.treatment_progress_status);
    const schoolLabel = item.school_name || 'Escola não identificada';
    const requesterLabel = item.requester_name || '-';
    const notes = item.treatment_completion_notes || item.review_notes || '';
    return `
      <article class="audit-treatment-item" data-treatment-id="${escapeAuditTreatmentHtml(item.id)}">
        <div class="audit-treatment-item-header">
          <div>
            <div class="audit-treatment-item-title">${escapeAuditTreatmentHtml(item.topic || item.summary || 'Demanda de auditoria')}</div>
            <div class="audit-treatment-item-meta">${escapeAuditTreatmentHtml(schoolLabel)} • ${escapeAuditTreatmentHtml(requesterLabel)} • ${escapeAuditTreatmentHtml(formatAuditTreatmentDateTime(item.created_at))}</div>
          </div>
          <span class="audit-treatment-pill ${statusTone}">${escapeAuditTreatmentHtml(getAuditTreatmentStatusLabel(item.treatment_progress_status))}</span>
        </div>
        <div class="audit-treatment-item-summary">${escapeAuditTreatmentHtml(item.summary || 'Sem resumo registrado.')}</div>
        <div class="audit-treatment-item-grid">
          <div><strong>Destino:</strong> ${escapeAuditTreatmentHtml(item.treatment_destination_label || '-')}</div>
          <div><strong>Revisao:</strong> ${escapeAuditTreatmentHtml(item.review_status || '-')}</div>
          <div><strong>Canal:</strong> ${escapeAuditTreatmentHtml(item.channel || '-')}</div>
          <div><strong>Assistente:</strong> ${escapeAuditTreatmentHtml(item.assistant_name || '-')}</div>
          <div><strong>Fonte:</strong> ${escapeAuditTreatmentHtml(item.supporting_source_title || '-')}</div>
          <div><strong>Última atualização:</strong> ${escapeAuditTreatmentHtml(formatAuditTreatmentDateTime(item.treatment_last_updated_at))}</div>
        </div>
        ${notes ? `<div class="audit-treatment-box-muted mt-2"><strong>Observações:</strong> ${escapeAuditTreatmentHtml(notes)}</div>` : ''}
        <div class="audit-treatment-actions">
          <button class="btn btn-outline-primary btn-sm" data-treatment-action="open" data-treatment-id="${escapeAuditTreatmentHtml(item.id)}">${escapeAuditTreatmentHtml(item.treatment_action_label || 'Abrir contexto')}</button>
          ${String(item.treatment_progress_status || '').toUpperCase() === 'IN_PROGRESS' ? '' : `<button class="btn btn-outline-warning btn-sm" data-treatment-action="status" data-next-status="IN_PROGRESS" data-treatment-id="${escapeAuditTreatmentHtml(item.id)}">Marcar em andamento</button>`}
          ${String(item.treatment_progress_status || '').toUpperCase() === 'COMPLETED' ? '' : `<button class="btn btn-outline-success btn-sm" data-treatment-action="status" data-next-status="COMPLETED" data-treatment-id="${escapeAuditTreatmentHtml(item.id)}">Concluir</button>`}
          ${String(item.treatment_progress_status || '').toUpperCase() === 'DISMISSED' ? '' : `<button class="btn btn-outline-secondary btn-sm" data-treatment-action="status" data-next-status="DISMISSED" data-treatment-id="${escapeAuditTreatmentHtml(item.id)}">Descartar</button>`}
          ${String(item.treatment_progress_status || '').toUpperCase() === 'OPEN' ? '' : `<button class="btn btn-link btn-sm" data-treatment-action="status" data-next-status="OPEN" data-treatment-id="${escapeAuditTreatmentHtml(item.id)}">Reabrir</button>`}
        </div>
      </article>
    `;
  }).join('');
}

async function fetchAuditTreatmentInbox() {
  await ensureAuditTreatmentContext();
  const pageConfig = getAuditTreatmentPageConfig();
  const role = getAuditTreatmentEffectiveRole();
  const params = new URLSearchParams();
  if (auditTreatmentInboxState.includeCompleted) params.set('include_completed', 'true');
  if (pageConfig?.viewAllRoles?.has(role)) params.set('view', 'all');
  const destination = getAuditTreatmentDestinationFilter(pageConfig, role);
  if (destination) params.set('destination', destination);

  const res = await fetch(`/api/audit/treatments?${params.toString()}`, {
    headers: await getAuditTreatmentHeaders({ 'Content-Type': undefined })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || 'Falha ao carregar a fila de tratamento.');
  }
  return body;
}

async function loadAuditTreatmentInbox() {
  if (auditTreatmentInboxState.loading) return;
  const card = ensureAuditTreatmentInboxMount();
  if (!card) return;

  const list = document.getElementById('audit-treatment-inbox-list');
  const summary = document.getElementById('audit-treatment-inbox-summary');
  const pageConfig = getAuditTreatmentPageConfig();
  const role = getAuditTreatmentEffectiveRole();
  auditTreatmentInboxState.loading = true;
  if (summary) summary.textContent = 'Carregando fila de tratamento...';
  if (list) list.innerHTML = '<div class="text-muted small">Carregando fila...</div>';

  try {
    const body = await fetchAuditTreatmentInbox();
    auditTreatmentInboxState.items = body.items || [];
    auditTreatmentInboxState.destinations = body.destinations || [];
    renderAuditTreatmentDestinationFilter(auditTreatmentInboxState.destinations, pageConfig, role);
    renderAuditTreatmentInbox(auditTreatmentInboxState.items, body.scope_mode || 'single');
  } catch (error) {
    if (summary) summary.textContent = 'Não foi possível carregar a fila de tratamento.';
    if (list) list.innerHTML = `<div class="text-danger small">${escapeAuditTreatmentHtml(error.message || 'Falha ao carregar a fila.')}</div>`;
  } finally {
    auditTreatmentInboxState.loading = false;
  }
}

async function requestAuditTreatmentNotes(nextStatus) {
  if (!window.Swal || !['COMPLETED', 'DISMISSED'].includes(String(nextStatus || '').toUpperCase())) {
    return '';
  }
  const modal = await window.Swal.fire({
    title: nextStatus === 'COMPLETED' ? 'Concluir tratamento' : 'Descartar demanda',
    text: nextStatus === 'COMPLETED'
      ? 'Registre a evidência ou a ação executada por esta área.'
      : 'Explique por que esta fila esta descartando a demanda.',
    input: 'textarea',
    inputPlaceholder: nextStatus === 'COMPLETED'
      ? 'Ex.: conteúdo publicado, conversa respondida, documento revisado.'
      : 'Ex.: caso sem ação adicional nesta fila.',
    inputAttributes: { rows: 4 },
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar'
  });
  if (!modal.isConfirmed) return null;
  return String(modal.value || '').trim();
}

async function updateAuditTreatmentStatus(itemId, nextStatus) {
  const notes = await requestAuditTreatmentNotes(nextStatus);
  if (notes === null) return;
  const actorName = sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Operador institucional';
  const res = await fetch(`/api/audit/treatments/${encodeURIComponent(itemId)}/status`, {
    method: 'POST',
    headers: await getAuditTreatmentHeaders(),
    body: JSON.stringify({
      treatment_progress_status: nextStatus,
      treatment_completion_notes: notes || '',
      updated_by: actorName
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.error || 'Falha ao atualizar a fila de tratamento.');
  }

  document.dispatchEvent(new CustomEvent('audit:treatment-updated', { detail: { eventId: itemId, nextStatus } }));
  if (typeof window.reloadAuditEvents === 'function' && getAuditTreatmentPageKey() === 'audit') {
    window.reloadAuditEvents().catch(() => {});
  }
  await loadAuditTreatmentInbox();
}

async function openAuditTreatmentContext(itemId) {
  const item = auditTreatmentInboxState.items.find((entry) => entry.id === itemId);
  if (!item) return;

  if (getAuditTreatmentPageKey() === 'audit' && typeof window.selectAuditEvent === 'function') {
    window.selectAuditEvent(itemId);
    document.getElementById('audit-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (getAuditTreatmentPageKey() === 'chat-manager' && typeof window.selecionarChat === 'function') {
    try {
      if (item.school_id && typeof window.aplicarEscolaSelecionadaChatManager === 'function') {
        window.aplicarEscolaSelecionadaChatManager({ id: item.school_id, name: item.school_name || '' });
      }
      if (typeof window.carregarConversas === 'function') {
        await window.carregarConversas();
      }
      if (item.consultation_id) {
        await window.selecionarChat(item.consultation_id);
        document.getElementById('chat-window')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    } catch (_error) {
      window.location.href = item.treatment_page_path || '/atendimento';
      return;
    }
  }

  window.location.href = item.treatment_page_path || '/audit';
}

function bindAuditTreatmentInboxActions() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-treatment-action]');
    if (!button) return;
    const action = String(button.getAttribute('data-treatment-action') || '').trim();
    const itemId = String(button.getAttribute('data-treatment-id') || '').trim();
    if (!action || !itemId) return;

    button.disabled = true;
    try {
      if (action === 'open') {
        await openAuditTreatmentContext(itemId);
      } else if (action === 'status') {
        const nextStatus = String(button.getAttribute('data-next-status') || '').trim().toUpperCase();
        await updateAuditTreatmentStatus(itemId, nextStatus);
        if (window.Swal) {
          await window.Swal.fire('Fila atualizada', 'O tratamento foi atualizado com sucesso.', 'success');
        }
      }
    } catch (error) {
      if (window.Swal) {
        await window.Swal.fire('Erro', error.message || 'Não foi possível atualizar a fila.', 'error');
      }
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener('audit:treatment-updated', () => {
    void loadAuditTreatmentInbox();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!getAuditTreatmentPageConfig()) return;
  bindAuditTreatmentInboxActions();
  void loadAuditTreatmentInbox();
});
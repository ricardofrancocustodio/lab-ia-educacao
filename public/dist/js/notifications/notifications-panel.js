const NotificationsPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const SEND_ROLES = new Set(['superadmin', 'network_manager', 'direction', 'secretariat']);
  let allNotifications = [];
  let canSend = false;

  async function ensureAuthenticatedContext() {
    if (typeof window.initSession === 'function') {
      const sessionInfo = await window.initSession();
      if (!sessionInfo) throw new Error('session_init_failed');
    }
  }

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

  function truncate(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    return text.substring(0, maxLen) + '...';
  }

  function renderNotifCard(n) {
    const statusBadge = n.sent
      ? '<span class="notif-badge badge-sent"><i class="fas fa-check mr-1"></i>Enviada</span>'
      : '<span class="notif-badge badge-pending"><i class="fas fa-clock mr-1"></i>Pendente</span>';

    const isManual = n.details && n.details.manual;
    const manualBadge = isManual ? ' <span class="notif-badge badge-manual"><i class="fas fa-hand-paper mr-1"></i>Manual</span>' : '';
    const schoolLabel = n.school_name ? ` &middot; <i class="fas fa-school"></i> ${escapeHtml(n.school_name)}` : '';
    const senderLabel = n.details?.sent_by ? `<span class="notif-meta ml-2"><i class="fas fa-user mr-1"></i>${escapeHtml(n.details.sent_by)}</span>` : '';

    let messagePreview = '';
    if (n.message) {
      messagePreview = `<div class="notif-message-preview">${escapeHtml(truncate(n.message, 200))}</div>`;
    }

    return `<div class="notif-card ${n.sent ? 'notif-sent' : 'notif-pending'}" onclick="NotificationsPanelPage.viewNotification('${n.id}')">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          ${statusBadge}${manualBadge}
          <span class="ml-2 font-weight-bold">${escapeHtml(n.topic || 'Sem topico')}</span>
          ${senderLabel}
        </div>
        <div class="notif-meta text-right">
          ${formatDate(n.created_at)}${schoolLabel}
        </div>
      </div>
      ${messagePreview}
    </div>`;
  }

  function renderList(notifications) {
    const container = document.getElementById('notif-list');
    const countLabel = document.getElementById('notif-count-label');
    countLabel.textContent = notifications.length + ' notificac' + (notifications.length !== 1 ? 'oes' : 'ao');
    if (!notifications.length) {
      container.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash fa-2x mb-2 d-block"></i>Nenhuma notificacao encontrada.</div>';
      return;
    }
    container.innerHTML = notifications.map(renderNotifCard).join('');
  }

  function applyFilters() {
    const sent = document.getElementById('filter-sent').value;
    let filtered = [...allNotifications];
    if (sent === 'true') filtered = filtered.filter(n => n.sent === true);
    else if (sent === 'false') filtered = filtered.filter(n => n.sent === false);
    renderList(filtered);
  }

  async function loadNotifications() {
    const headers = await getAuthHeaders();
    const sentFilter = document.getElementById('filter-sent').value;
    let url = '/api/notifications/queue?_t=' + Date.now();
    if (sentFilter) url += '&sent=' + sentFilter;
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar notificacoes.');
    allNotifications = data.notifications || [];
    applyFilters();
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/notifications/stats/summary?_t=' + Date.now(), { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) return;
      const s = data.stats || {};
      document.getElementById('stat-total').textContent = s.total ?? '-';
      document.getElementById('stat-sent').textContent = s.sent ?? '-';
      document.getElementById('stat-pending').textContent = s.pending ?? '-';
      document.getElementById('stat-today').textContent = s.today ?? '-';
    } catch (e) {
      console.warn('Erro ao carregar stats de notificacoes:', e);
    }
  }

  async function viewNotification(id) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/notifications/queue/${id}`, { headers });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar notificacao.');

      const n = data.notification;
      const deliveries = data.deliveries || [];

      const statusBadge = n.sent
        ? '<span class="notif-badge badge-sent"><i class="fas fa-check mr-1"></i>Enviada</span>'
        : '<span class="notif-badge badge-pending"><i class="fas fa-clock mr-1"></i>Pendente</span>';

      let deliveriesHtml = '';
      if (deliveries.length) {
        deliveriesHtml = '<hr><p class="font-weight-bold mb-2"><i class="fas fa-users mr-1"></i>Entregas (' + deliveries.length + ')</p>' +
          '<table class="table table-sm table-bordered"><thead><tr><th>Usuario</th><th>Enviado em</th></tr></thead><tbody>' +
          deliveries.map(d => `<tr><td>${escapeHtml(d.user_id)}</td><td>${formatDate(d.sent_at)}</td></tr>`).join('') +
          '</tbody></table>';
      }

      let detailsHtml = '';
      if (n.details && Object.keys(n.details).length) {
        const clean = { ...n.details };
        detailsHtml = `<hr><p class="font-weight-bold mb-1"><i class="fas fa-info-circle mr-1"></i>Detalhes</p>
          <pre style="background:#f7f9fc;padding:10px;border-radius:8px;font-size:.82rem;max-height:200px;overflow:auto;">${escapeHtml(JSON.stringify(clean, null, 2))}</pre>`;
      }

      document.getElementById('notifDetailTitle').textContent = n.topic || 'Notificacao';
      document.getElementById('notifDetailBody').innerHTML = `
        <div class="mb-3">${statusBadge}</div>
        <p class="notif-meta"><i class="fas fa-clock mr-1"></i>Criada em ${formatDate(n.created_at)}</p>
        ${n.dispatch_date ? '<p class="notif-meta"><i class="fas fa-calendar mr-1"></i>Data de despacho: ' + escapeHtml(n.dispatch_date) + '</p>' : ''}
        ${n.school_name ? '<p class="notif-meta"><i class="fas fa-school mr-1"></i>' + escapeHtml(n.school_name) + '</p>' : ''}
        <hr>
        <p class="font-weight-bold mb-1"><i class="fas fa-envelope mr-1"></i>Mensagem</p>
        <div class="notif-message-preview">${escapeHtml(n.message || '')}</div>
        ${detailsHtml}
        ${deliveriesHtml}
      `;

      $('#notifDetailModal').modal('show');
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function sendNotification() {
    const topic = document.getElementById('send-topic').value.trim();
    const message = document.getElementById('send-message').value.trim();
    if (!topic || !message) {
      Swal.fire('Atenção', 'Preencha topico e mensagem.', 'warning');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, message })
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao enviar notificacao.');

      $('#notifSendModal').modal('hide');
      document.getElementById('send-topic').value = '';
      document.getElementById('send-message').value = '';
      Swal.fire({ icon: 'success', title: 'Notificacao enfileirada', text: 'Sera processada nos proximos minutos.', timer: 2500, showConfirmButton: false });
      await Promise.all([loadNotifications(), loadStats()]);
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function init() {
    try {
      await ensureAuthenticatedContext();

      const role = sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('USER_ROLE') || '';
      canSend = SEND_ROLES.has(role);
      if (canSend) {
        const btnNew = document.getElementById('btn-new-notification');
        btnNew.style.display = '';
        btnNew.addEventListener('click', () => $('#notifSendModal').modal('show'));
      }

      document.getElementById('btn-confirm-send').addEventListener('click', sendNotification);
      document.getElementById('filter-sent').addEventListener('change', () => loadNotifications());

      await Promise.all([loadNotifications(), loadStats()]);

      document.getElementById('notif-loading').style.display = 'none';
      document.getElementById('notif-root').style.display = '';
    } catch (err) {
      console.error('NotificationsPanelPage init error:', err);
      document.getElementById('notif-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar o painel de notificacoes. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return { viewNotification };
})();

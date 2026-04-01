/**
 * Notifications Panel Page (Jira-style)
 * Pagina completa de notificacoes do usuario com read/unread, filtros e agrupamento temporal.
 */
const NotificationsPanelPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const TOPIC_CONFIG = {
    incident_resolved:          { icon: 'fa-check-circle',      color: '#28a745', bg: '#e8f5e9', label: 'Incidente Resolvido' },
    incident_dismissed:         { icon: 'fa-times-circle',       color: '#6c757d', bg: '#f5f5f5', label: 'Incidente Descartado' },
    incident_in_review:         { icon: 'fa-search',             color: '#007bff', bg: '#e3f2fd', label: 'Incidente em Revisao' },
    incident_assigned:          { icon: 'fa-user-check',         color: '#6f42c1', bg: '#f3e5f5', label: 'Incidente Atribuido' },
    incident_opened:            { icon: 'fa-exclamation-circle',  color: '#dc3545', bg: '#fce4ec', label: 'Incidente Aberto' },
    correction_pending_approval:{ icon: 'fa-clipboard-check',    color: '#e67e22', bg: '#fef9e7', label: 'Correção Aguardando Aprovação' },
    correction_approved:        { icon: 'fa-check-double',       color: '#28a745', bg: '#e8f5e9', label: 'Correção Aprovada' },
    faq_auto_updated:           { icon: 'fa-robot',               color: '#6f42c1', bg: '#f3e5f5', label: 'FAQ Atualizada Automaticamente' },
    feedback:                   { icon: 'fa-comment-dots',        color: '#17a2b8', bg: '#e0f7fa', label: 'Feedback' },
    system:                     { icon: 'fa-cog',                 color: '#6c757d', bg: '#f5f5f5', label: 'Sistema' }
  };
  const DEFAULT_TOPIC = { icon: 'fa-bell', color: '#ffc107', bg: '#fff8e1', label: 'Notificacao' };

  const TOPIC_NAV_TARGETS = {
    incident_assigned:           '/audit',
    incident_in_review:          '/incidentes',
    incident_resolved:           '/incidentes',
    incident_dismissed:          '/incidentes',
    incident_opened:             '/incidentes',
    correction_pending_approval: '/audit',
    correction_approved:         '/audit',
    faq_auto_updated:            '/conteudo-oficial'
  };

  function getNotifNavigationTarget(n) {
    return TOPIC_NAV_TARGETS[n.topic] || '';
  }

  let allNotifications = [];
  let currentOffset = 0;
  const PAGE_SIZE = 50;

  async function ensureAuthenticatedContext() {
    if (typeof window.initSession === 'function') {
      const sessionInfo = await window.initSession();
      if (!sessionInfo) throw new Error('session_init_failed');
    }
  }

  async function getAuthHeaders() {
    const token = await window.getAccessToken();
    return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  }

  function getTopicConfig(topic) {
    return TOPIC_CONFIG[topic] || DEFAULT_TOPIC;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '';
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return mins + ' min atras';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h atras';
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ontem';
    if (days < 7) return days + ' dias atras';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getDateGroup(dateStr) {
    if (!dateStr) return 'Anteriores';
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    if (d >= today) return 'Hoje';
    if (d >= yesterday) return 'Ontem';
    if (d >= weekAgo) return 'Esta semana';
    return 'Anteriores';
  }

  function renderNotifCard(n) {
    const cfg = getTopicConfig(n.topic);
    const isUnread = !n.read_at;
    const cardClass = isUnread ? 'notif-card notif-unread' : 'notif-card notif-read';

    const schoolLabel = n.school_name ? '<span><i class="fas fa-school mr-1"></i>' + escapeHtml(n.school_name) + '</span>' : '';
    const detailsInfo = n.details && n.details.incident_id
      ? '<span><i class="fas fa-hashtag mr-1"></i>' + escapeHtml(n.details.incident_id.slice(0, 8)) + '</span>'
      : '';

    const navTarget = getNotifNavigationTarget(n);
    const navLink = navTarget
      ? '<a href="' + escapeHtml(navTarget) + '" class="btn btn-sm btn-outline-primary mt-1" style="border-radius:999px;font-size:.75rem;padding:2px 10px;" onclick="event.stopPropagation(); NotificationsPanelPage.toggleRead(\'' + escapeHtml(n.id) + '\',true);"><i class="fas fa-external-link-alt mr-1"></i>Ver item</a>'
      : '';

    return '<div class="' + cardClass + '" data-id="' + escapeHtml(n.id) + '" onclick="NotificationsPanelPage.toggleRead(\'' + escapeHtml(n.id) + '\',' + (isUnread ? 'true' : 'false') + ')">'
      + (isUnread ? '<div class="notif-dot"></div>' : '<div style="width:8px;flex-shrink:0;"></div>')
      + '<div class="notif-icon" style="background:' + cfg.bg + ';"><i class="fas ' + cfg.icon + '" style="color:' + cfg.color + ';font-size:.9rem;"></i></div>'
      + '<div class="notif-body">'
      + '<div class="notif-msg">' + escapeHtml(n.message || '') + '</div>'
      + '<div class="notif-meta">'
      + '<span class="notif-topic-badge" style="background:' + cfg.bg + ';color:' + cfg.color + ';">' + escapeHtml(cfg.label) + '</span>'
      + '<span><i class="far fa-clock mr-1"></i>' + timeAgo(n.created_at) + '</span>'
      + schoolLabel
      + detailsInfo
      + '</div>'
      + navLink
      + '</div></div>';
  }

  function renderGroupedList(notifications) {
    const container = document.getElementById('notif-list');
    const countLabel = document.getElementById('notif-count-label');
    countLabel.textContent = notifications.length + ' notificac' + (notifications.length !== 1 ? 'oes' : 'ao');

    if (!notifications.length) {
      container.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash fa-2x mb-2 d-block" style="opacity:.4;"></i><div style="font-size:.92rem;">Nenhuma notificacao encontrada</div></div>';
      return;
    }

    // Agrupar por data
    const groups = {};
    const groupOrder = ['Hoje', 'Ontem', 'Esta semana', 'Anteriores'];
    notifications.forEach(n => {
      const group = getDateGroup(n.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });

    let html = '';
    groupOrder.forEach(groupName => {
      if (!groups[groupName] || !groups[groupName].length) return;
      html += '<div class="notif-group-header">' + escapeHtml(groupName) + '</div>';
      html += groups[groupName].map(renderNotifCard).join('');
    });

    container.innerHTML = html;
  }

  function applyFilters() {
    const readFilter = document.getElementById('filter-read').value;
    const topicFilter = document.getElementById('filter-topic').value;

    let filtered = [...allNotifications];
    if (readFilter === 'true') filtered = filtered.filter(n => n.read_at);
    else if (readFilter === 'false') filtered = filtered.filter(n => !n.read_at);
    if (topicFilter) filtered = filtered.filter(n => n.topic === topicFilter);

    renderGroupedList(filtered);
  }

  async function loadNotifications(append) {
    const headers = await getAuthHeaders();

    const readFilter = document.getElementById('filter-read').value;
    const topicFilter = document.getElementById('filter-topic').value;

    let url = '/api/notifications/my?limit=' + PAGE_SIZE + '&offset=' + currentOffset + '&_t=' + Date.now();
    if (readFilter) url += '&read=' + readFilter;
    if (topicFilter) url += '&topic=' + topicFilter;

    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar notificacoes.');

    const newNotifs = data.notifications || [];

    if (append) {
      allNotifications = allNotifications.concat(newNotifs);
    } else {
      allNotifications = newNotifs;
    }

    applyFilters();

    // Show/hide load more
    const loadMoreBtn = document.getElementById('notif-load-more');
    if (loadMoreBtn) loadMoreBtn.style.display = newNotifs.length >= PAGE_SIZE ? '' : 'none';
  }

  async function loadStats() {
    try {
      const headers = await getAuthHeaders();
      const [countRes, allRes] = await Promise.all([
        fetch('/api/notifications/my/unread-count?_t=' + Date.now(), { headers }),
        fetch('/api/notifications/my?limit=200&_t=' + Date.now(), { headers })
      ]);
      const countData = await countRes.json();
      const allData = await allRes.json();

      const allNotifs = allData.notifications || [];
      const unread = countData.unread || 0;
      const total = allNotifs.length;
      const read = total - unread;
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = allNotifs.filter(n => n.created_at && n.created_at.startsWith(today)).length;

      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-unread').textContent = unread;
      document.getElementById('stat-read').textContent = read;
      document.getElementById('stat-today').textContent = todayCount;

      // Show/hide mark all read button
      const markAllBtn = document.getElementById('btn-mark-all-read');
      if (markAllBtn) markAllBtn.style.display = unread > 0 ? '' : 'none';
    } catch (e) {
      console.warn('Erro ao carregar stats de notificacoes:', e);
    }
  }

  async function toggleRead(id, markAsRead) {
    try {
      const headers = await getAuthHeaders();
      if (markAsRead) {
        await fetch('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'PUT', headers });
      }
      // Update local state
      const notif = allNotifications.find(n => n.id === id);
      if (notif && markAsRead) notif.read_at = new Date().toISOString();

      applyFilters();
      await loadStats();

      // Refresh header badge
      if (typeof HeaderNotifications !== 'undefined') HeaderNotifications.refresh();
    } catch (e) {
      console.warn('Erro ao marcar notificacao:', e);
    }
  }

  async function markAllRead() {
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/notifications/read-all', { method: 'PUT', headers });

      allNotifications.forEach(n => { if (!n.read_at) n.read_at = new Date().toISOString(); });
      applyFilters();
      await loadStats();

      if (typeof HeaderNotifications !== 'undefined') HeaderNotifications.refresh();
    } catch (e) {
      Swal.fire('Erro', e.message || 'Falha ao marcar todas como lidas.', 'error');
    }
  }

  async function init() {
    try {
      await ensureAuthenticatedContext();

      // Bind filters
      document.getElementById('filter-read').addEventListener('change', () => {
        currentOffset = 0;
        loadNotifications(false);
      });
      document.getElementById('filter-topic').addEventListener('change', () => {
        currentOffset = 0;
        loadNotifications(false);
      });

      // Mark all read
      const markAllBtn = document.getElementById('btn-mark-all-read');
      if (markAllBtn) markAllBtn.addEventListener('click', markAllRead);

      // Load more
      const loadMoreBtn = document.getElementById('btn-load-more');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
          currentOffset += PAGE_SIZE;
          loadNotifications(true);
        });
      }

      await Promise.all([loadNotifications(false), loadStats()]);

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

  return { toggleRead, markAllRead };
})();

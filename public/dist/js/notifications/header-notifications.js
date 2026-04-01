/**
 * Header Notifications Dropdown (Jira-style)
 * Carrega notificacoes do usuario no dropdown do sino no header.
 */
const HeaderNotifications = (() => {
  let _initialized = false;
  let _polling = null;

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const TOPIC_CONFIG = {
    incident_resolved:  { icon: 'fa-check-circle',     color: '#28a745', label: 'Incidente Resolvido' },
    incident_dismissed: { icon: 'fa-times-circle',      color: '#6c757d', label: 'Incidente Descartado' },
    incident_in_review: { icon: 'fa-search',            color: '#007bff', label: 'Incidente em Revisao' },
    incident_assigned:  { icon: 'fa-user-check',        color: '#6f42c1', label: 'Incidente Atribuido' },
    incident_opened:    { icon: 'fa-exclamation-circle', color: '#dc3545', label: 'Incidente Aberto' },
    feedback:           { icon: 'fa-comment-dots',       color: '#17a2b8', label: 'Feedback' },
    system:             { icon: 'fa-cog',                color: '#6c757d', label: 'Sistema' }
  };
  const DEFAULT_TOPIC = { icon: 'fa-bell', color: '#ffc107', label: 'Notificacao' };

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
    if (days < 7) return days + 'd atras';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  async function getAuthHeaders() {
    const token = await window.getAccessToken();
    return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  }

  function renderDropdownItem(n) {
    const cfg = getTopicConfig(n.topic);
    const isUnread = !n.read_at;
    const bgStyle = isUnread ? 'background:#f0f4ff;' : 'background:#fff;';
    const dotHtml = isUnread ? '<span style="width:8px;height:8px;border-radius:50%;background:#007bff;display:inline-block;flex-shrink:0;margin-top:6px;" title="Nao lida"></span>' : '<span style="width:8px;flex-shrink:0;"></span>';

    const msg = escapeHtml((n.message || '').length > 90 ? n.message.substring(0, 90) + '...' : (n.message || ''));

    return '<div class="notif-dropdown-item" data-id="' + escapeHtml(n.id) + '" style="padding:10px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;display:flex;gap:10px;align-items:flex-start;' + bgStyle + '" onmouseover="this.style.background=\'#e8f0fe\'" onmouseout="this.style.background=\'' + (isUnread ? '#f0f4ff' : '#fff') + '\'">'
      + dotHtml
      + '<div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:' + cfg.color + '15;display:flex;align-items:center;justify-content:center;">'
      + '<i class="fas ' + cfg.icon + '" style="color:' + cfg.color + ';font-size:.82rem;"></i></div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:.82rem;font-weight:' + (isUnread ? '600' : '400') + ';color:#343a40;line-height:1.3;">' + msg + '</div>'
      + '<div style="font-size:.72rem;color:#6c757d;margin-top:2px;">' + escapeHtml(cfg.label) + ' &middot; ' + timeAgo(n.created_at) + '</div>'
      + '</div></div>';
  }

  function renderEmpty() {
    return '<div style="padding:40px 16px;text-align:center;color:#6c757d;">'
      + '<i class="far fa-bell-slash" style="font-size:2rem;margin-bottom:8px;display:block;opacity:.5;"></i>'
      + '<div style="font-size:.88rem;">Nenhuma notificacao</div>'
      + '</div>';
  }

  async function loadAndRender() {
    const badge = document.getElementById('notif-count');
    const list = document.getElementById('notif-dropdown-list');
    const markAllBtn = document.getElementById('notif-mark-all-read');
    if (!badge || !list) return;

    try {
      const headers = await getAuthHeaders();
      const [notifRes, countRes] = await Promise.all([
        fetch('/api/notifications/my?limit=15&_t=' + Date.now(), { headers }),
        fetch('/api/notifications/my/unread-count?_t=' + Date.now(), { headers })
      ]);

      const notifData = await notifRes.json();
      const countData = await countRes.json();

      if (!notifRes.ok || !countRes.ok) return;

      const notifications = notifData.notifications || [];
      const unread = countData.unread || 0;

      // Badge
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }

      // Mark all button
      if (markAllBtn) markAllBtn.style.display = unread > 0 ? '' : 'none';

      // List
      if (!notifications.length) {
        list.innerHTML = renderEmpty();
      } else {
        list.innerHTML = notifications.map(renderDropdownItem).join('');
      }
    } catch (e) {
      console.warn('HeaderNotifications: erro ao carregar:', e?.message || e);
    }
  }

  async function markAsRead(notifId) {
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/notifications/' + encodeURIComponent(notifId) + '/read', { method: 'PUT', headers });
      await loadAndRender();
    } catch (e) {
      console.warn('HeaderNotifications: erro ao marcar como lida:', e?.message || e);
    }
  }

  async function markAllRead() {
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/notifications/read-all', { method: 'PUT', headers });
      await loadAndRender();
    } catch (e) {
      console.warn('HeaderNotifications: erro ao marcar todas como lidas:', e?.message || e);
    }
  }

  function bindEvents() {
    // Mark all read
    const markAllBtn = document.getElementById('notif-mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        markAllRead();
      });
    }

    // Click on individual notification
    const list = document.getElementById('notif-dropdown-list');
    if (list) {
      list.addEventListener('click', function(e) {
        const item = e.target.closest('.notif-dropdown-item');
        if (!item) return;
        const id = item.getAttribute('data-id');
        if (id) markAsRead(id);
      });
    }

    // Refresh when dropdown opens
    const toggle = document.getElementById('notif-bell-toggle');
    if (toggle) {
      $(toggle).parent().on('show.bs.dropdown', function() {
        loadAndRender();
      });
    }
  }

  async function init() {
    if (_initialized) return;
    _initialized = true;

    await loadAndRender();
    bindEvents();

    // Polling a cada 60s para atualizar badge
    _polling = setInterval(() => {
      loadAndRender();
    }, 60000);
  }

  return { init, refresh: loadAndRender };
})();

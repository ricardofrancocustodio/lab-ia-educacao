const NoticeBoardPage = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  const WRITE_ROLES = new Set(['superadmin', 'network_manager', 'secretariat', 'coordination', 'direction']);
  const PRIORITY_LABELS = { urgent: 'Urgente', high: 'Alta', normal: 'Normal' };
  const PRIORITY_CLASSES = { urgent: 'notice-badge-urgent', high: 'notice-badge-high', normal: 'notice-badge-normal' };
  const PRIORITY_CARD_CLASSES = { urgent: 'notice-priority-urgent', high: 'notice-priority-high', normal: 'notice-priority-normal' };
  const TYPE_LABELS = { internal: 'Interno', external: 'Externo' };
  const TYPE_CLASSES = { internal: 'notice-type-internal', external: 'notice-type-external' };

  let allNotices = [];
  let effectiveRole = '';
  let canWrite = false;

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

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isExpired(notice) {
    if (!notice.expiry_date) return false;
    return new Date(notice.expiry_date) < new Date();
  }

  function truncate(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    return text.substring(0, maxLen) + '...';
  }

  function renderNoticeCard(notice) {
    const expired = isExpired(notice);
    const priorityBadge = `<span class="notice-badge ${PRIORITY_CLASSES[notice.priority] || PRIORITY_CLASSES.normal}">${PRIORITY_LABELS[notice.priority] || 'Normal'}</span>`;
    const typeBadge = `<span class="notice-type-badge ${TYPE_CLASSES[notice.type] || TYPE_CLASSES.internal}">${TYPE_LABELS[notice.type] || 'Interno'}</span>`;

    let attachmentsHtml = '';
    const attachments = notice.notice_attachments || [];
    if (attachments.length) {
      attachmentsHtml = '<div class="mt-2">' + attachments.map(a =>
        `<span class="notice-attachment"><i class="fas fa-paperclip"></i> ${escapeHtml(a.file_name)}</span>`
      ).join('') + '</div>';
    }

    let expiryHtml = '';
    if (notice.expiry_date) {
      expiryHtml = ` &middot; ${expired ? '<span class="text-danger">Expirado em ' : 'Valido ate '}${formatDateShort(notice.expiry_date)}${expired ? '</span>' : ''}`;
    }

    let schoolLabel = '';
    if (notice.school_name) {
      schoolLabel = ` &middot; <i class="fas fa-school"></i> ${escapeHtml(notice.school_name)}`;
    }

    let actionsHtml = '';
    if (canWrite) {
      actionsHtml = `<div class="notice-actions">
        <button class="btn btn-sm btn-outline-primary" onclick="NoticeBoardPage.editNotice('${notice.id}')"><i class="fas fa-edit"></i> Editar</button>
        <button class="btn btn-sm btn-outline-danger" onclick="NoticeBoardPage.deleteNotice('${notice.id}')"><i class="fas fa-trash"></i></button>
      </div>`;
    }

    return `<div class="notice-card ${PRIORITY_CARD_CLASSES[notice.priority] || PRIORITY_CARD_CLASSES.normal} ${expired ? 'notice-expired' : ''}" data-notice-id="${notice.id}">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div>
          <a href="#" onclick="NoticeBoardPage.viewNotice('${notice.id}'); return false;" class="font-weight-bold" style="font-size:1.05rem; color:#17324d;">${escapeHtml(notice.title)}</a>
          <div class="mt-1">${priorityBadge} ${typeBadge}</div>
        </div>
        <div class="notice-meta text-right">
          ${formatDate(notice.published_at)}${expiryHtml}${schoolLabel}
        </div>
      </div>
      <div class="notice-content-preview">${escapeHtml(truncate(notice.content, 280))}</div>
      ${attachmentsHtml}
      ${actionsHtml}
    </div>`;
  }

  function renderNoticesList(notices) {
    const container = document.getElementById('notices-list');
    if (!notices.length) {
      container.innerHTML = '<div class="notice-empty"><i class="fas fa-inbox fa-2x mb-2 d-block"></i>Nenhum comunicado encontrado.</div>';
      return;
    }
    container.innerHTML = notices.map(renderNoticeCard).join('');
  }

  function applyFilters() {
    const priority = document.getElementById('filter-priority').value;
    const type = document.getElementById('filter-type').value;
    const showExpired = document.getElementById('filter-show-expired').checked;

    let filtered = [...allNotices];
    if (priority) filtered = filtered.filter(n => n.priority === priority);
    if (type) filtered = filtered.filter(n => n.type === type);
    if (!showExpired) filtered = filtered.filter(n => !isExpired(n));

    renderNoticesList(filtered);
  }

  async function loadNotices() {
    const showExpired = document.getElementById('filter-show-expired')?.checked;
    const activeParam = showExpired ? '&active=false' : '';
    const res = await fetch('/api/notices?_t=' + Date.now() + activeParam, {
      headers: await getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar comunicados.');
    allNotices = data.notices || [];
    applyFilters();
  }

  function openCreateModal() {
    document.getElementById('notice-edit-id').value = '';
    document.getElementById('notice-title').value = '';
    document.getElementById('notice-content').value = '';
    document.getElementById('notice-type').value = 'internal';
    document.getElementById('notice-priority').value = 'normal';
    document.getElementById('notice-expiry').value = '';
    document.getElementById('noticeModalTitle').textContent = 'Novo Comunicado';
    $('#noticeModal').modal('show');
  }

  async function saveNotice() {
    const editId = document.getElementById('notice-edit-id').value;
    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();
    const type = document.getElementById('notice-type').value;
    const priority = document.getElementById('notice-priority').value;
    const expiry = document.getElementById('notice-expiry').value || null;

    if (!title || !content) {
      Swal.fire('Campos obrigatorios', 'Preencha titulo e conteudo.', 'warning');
      return;
    }

    const payload = { title, content, type, priority, expiry_date: expiry };
    const isEdit = !!editId;
    const url = isEdit ? `/api/notices/${editId}` : '/api/notices';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao salvar.');

      $('#noticeModal').modal('hide');
      Swal.fire({ icon: 'success', title: isEdit ? 'Comunicado atualizado' : 'Comunicado publicado', timer: 1800, showConfirmButton: false });
      await loadNotices();
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function editNotice(id) {
    try {
      const res = await fetch(`/api/notices/${id}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar.');

      const n = data.notice;
      document.getElementById('notice-edit-id').value = n.id;
      document.getElementById('notice-title').value = n.title || '';
      document.getElementById('notice-content').value = n.content || '';
      document.getElementById('notice-type').value = n.type || 'internal';
      document.getElementById('notice-priority').value = n.priority || 'normal';
      document.getElementById('notice-expiry').value = n.expiry_date ? n.expiry_date.split('T')[0] : '';
      document.getElementById('noticeModalTitle').textContent = 'Editar Comunicado';
      $('#noticeModal').modal('show');
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function viewNotice(id) {
    try {
      const res = await fetch(`/api/notices/${id}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar.');

      const n = data.notice;
      const priorityBadge = `<span class="notice-badge ${PRIORITY_CLASSES[n.priority] || PRIORITY_CLASSES.normal}">${PRIORITY_LABELS[n.priority] || 'Normal'}</span>`;
      const typeBadge = `<span class="notice-type-badge ${TYPE_CLASSES[n.type] || TYPE_CLASSES.internal}">${TYPE_LABELS[n.type] || 'Interno'}</span>`;

      let attachHtml = '';
      const atts = n.notice_attachments || [];
      if (atts.length) {
        attachHtml = '<hr><p class="font-weight-bold mb-2"><i class="fas fa-paperclip mr-1"></i>Anexos</p>' +
          atts.map(a => `<a href="${escapeHtml(a.file_url)}" target="_blank" rel="noopener noreferrer" class="notice-attachment"><i class="fas fa-download"></i> ${escapeHtml(a.file_name)}</a>`).join('');
      }

      let expiryHtml = '';
      if (n.expiry_date) {
        const expired = isExpired(n);
        expiryHtml = `<p class="notice-meta">${expired ? '<span class="text-danger">Expirado em' : 'Valido ate'} ${formatDateShort(n.expiry_date)}${expired ? '</span>' : ''}</p>`;
      }

      document.getElementById('noticeDetailTitle').textContent = n.title;
      document.getElementById('noticeDetailBody').innerHTML = `
        <div class="mb-3">${priorityBadge} ${typeBadge}</div>
        <p class="notice-meta"><i class="fas fa-clock mr-1"></i>Publicado em ${formatDate(n.published_at)}</p>
        ${expiryHtml}
        <hr>
        <div style="white-space: pre-wrap; line-height: 1.7;">${escapeHtml(n.content)}</div>
        ${attachHtml}
      `;
      $('#noticeDetailModal').modal('show');
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function deleteNotice(id) {
    const result = await Swal.fire({
      title: 'Excluir comunicado?',
      text: 'Esta acao nao pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Falha ao excluir.');
      Swal.fire({ icon: 'success', title: 'Comunicado excluido', timer: 1500, showConfirmButton: false });
      await loadNotices();
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  }

  async function init() {
    try {
      await ensureAuthenticatedContext();
      effectiveRole = sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('USER_ROLE') || '';
      canWrite = WRITE_ROLES.has(effectiveRole);

      if (canWrite) {
        document.getElementById('notice-create-wrap').style.display = '';
        document.getElementById('btn-new-notice').addEventListener('click', openCreateModal);
        document.getElementById('btn-save-notice').addEventListener('click', saveNotice);
      }

      document.getElementById('filter-priority').addEventListener('change', applyFilters);
      document.getElementById('filter-type').addEventListener('change', applyFilters);
      document.getElementById('filter-show-expired').addEventListener('change', () => {
        loadNotices();
      });

      await loadNotices();

      document.getElementById('notices-loading').style.display = 'none';
      document.getElementById('notices-root').style.display = '';
    } catch (err) {
      console.error('NoticeBoardPage init error:', err);
      document.getElementById('notices-loading').innerHTML = '<div class="alert alert-danger">Falha ao carregar o mural de comunicados. <a href="/login">Fazer login</a></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return { editNotice, viewNotice, deleteNotice };
})();

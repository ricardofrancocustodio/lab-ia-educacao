// users.js - Lógica completa para a página de Gestão de Usuários

let usuariosCache = [];
let appPagesCache = [];
let editingUserContext = null;
let roleProfilesCacheByEmail = {};
const fallbackPageLabels = {
    dashboard: 'Dashboard de Inteligencia',
    'chat-manager': 'Atendimento',
    reports: 'Relatorios',
    audit: 'Auditoria Formal',
    users: 'Usuarios',
    preferences: 'Preferencias',
    knowledge: 'Base de Conhecimento'
};
const roleLabelMap = {
    superadmin: 'Superadmin do Projeto',
    network_manager: 'Gestor da Rede / Institucional',
    content_curator: 'Curador de Conteudo',
    public_operator: 'Operador de Atendimento Publico',
    secretariat: 'Servidor da Secretaria',
    coordination: 'Servidor da Coordenacao',
    treasury: 'Servidor da Tesouraria',
    direction: 'Servidor da Direcao',
    auditor: 'Auditor / Compliance',
    observer: 'Observador Externo'
};

function initPage() {
    const page = document.body.dataset.page;
    if (page !== 'users') return;

    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    carregarUsuarios(schoolId);
    initRolePermissionsTab();
}

function tabelaPorRole(role) {
    return 'school_members';
}

const ROLE_PROFILE_TABLE_MAP = {};

const ROLE_TABLE_CONFIG = [];

const ROLE_SEGMENT_CONFIG = {};

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function normalizePhoneDigits(value = '') {
    return String(value || '').replace(/\D/g, '');
}

function applyPhoneMask(value = '') {
    const digits = normalizePhoneDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getRoleProfileTable(role) {
    return ROLE_PROFILE_TABLE_MAP[String(role || '').toLowerCase()] || null;
}

function profileCacheKey(role, schoolId, email) {
    return `${String(schoolId || '')}::${String(role || '').toLowerCase()}::${normalizeEmail(email)}`;
}

function clearRoleProfilesCache() {
    roleProfilesCacheByEmail = {};
}

async function fetchRoleProfileByEmail(role, schoolId, email, options = {}) {
    const table = getRoleProfileTable(role);
    const emailNorm = normalizeEmail(email);
    if (!table || !schoolId || !emailNorm) return null;
    const forceRefresh = !!options.forceRefresh;

    const key = profileCacheKey(role, schoolId, emailNorm);
    if (!forceRefresh && roleProfilesCacheByEmail[key]) return roleProfilesCacheByEmail[key];

    const { data, error } = await window.supabaseClient
        .from(table)
        .select('id, school_id, name, email, phone')
        .eq('school_id', schoolId)
        .eq('email', emailNorm)
        .maybeSingle();

    if (error) throw error;
    roleProfilesCacheByEmail[key] = data || null;
    return data || null;
}

async function ensureRoleProfileByEmail(role, schoolId, email, name = '', options = {}) {
    const roleNorm = String(role || '').toLowerCase();
    const table = getRoleProfileTable(roleNorm);
    const emailNorm = normalizeEmail(email);
    const phoneDigits = normalizePhoneDigits(options.phone || '');
    if (!table || !schoolId || !emailNorm) return null;
    const forceRefresh = !!options.forceRefresh;

    const existing = await fetchRoleProfileByEmail(roleNorm, schoolId, emailNorm, { forceRefresh });
    if (existing?.id) return existing;

    const payload = {
        school_id: schoolId,
        email: emailNorm,
        name: String(name || '').trim() || emailNorm.split('@')[0],
        phone: phoneDigits || null,
        active: true
    };

    const { data, error } = await window.supabaseClient
        .from(table)
        .upsert(payload, { onConflict: 'school_id,email' })
        .select('id, school_id, name, email, phone')
        .single();

    if (error) throw error;

    const key = profileCacheKey(roleNorm, schoolId, emailNorm);
    roleProfilesCacheByEmail[key] = data || null;
    return data || null;
}

async function syncRoleSegments(role, profileId, selectedSegments = [], options = {}) {
    const segCfg = ROLE_SEGMENT_CONFIG[role];
    if (!segCfg || !profileId) return;
    const schoolId = options.schoolId || sessionStorage.getItem('SCHOOL_ID');
    const table = getRoleProfileTable(role);
    const isCoordinatorSegments = segCfg.relationTable === 'coordinator_segments';

    // Defesa forte: garante que o profileId exista na tabela de role antes de gravar relação.
    if (table && schoolId) {
        const { data: byIdRow, error: byIdErr } = await window.supabaseClient
            .from(table)
            .select('id')
            .eq('id', profileId)
            .eq('school_id', schoolId)
            .maybeSingle();
        if (byIdErr) throw byIdErr;

        if (!byIdRow?.id && options.email) {
            const ensured = await ensureRoleProfileByEmail(role, schoolId, options.email, options.name || '', { forceRefresh: true });
            if (!ensured?.id) {
                throw new Error(`Perfil ${role} não encontrado para sincronizar segmentos.`);
            }
            profileId = ensured.id;
        }
    }

    let deleteQuery = window.supabaseClient
        .from(segCfg.relationTable)
        .delete()
        .eq(segCfg.fkColumn, profileId);

    if (isCoordinatorSegments && schoolId) {
        deleteQuery = deleteQuery.eq('school_id', schoolId);
    }

    const { error: delErr } = await deleteQuery;
    if (delErr) throw delErr;

    if (!selectedSegments.length) return;

    const payload = selectedSegments.map(segmentId => {
        const base = {
            [segCfg.fkColumn]: profileId,
            segment_id: segmentId
        };
        if (isCoordinatorSegments && schoolId) {
            base.school_id = schoolId;
        }
        return base;
    });

    const { error: insErr } = await window.supabaseClient
        .from(segCfg.relationTable)
        .insert(payload);
    if (insErr) {
        const msg = String(insErr.message || '').toLowerCase();
        const isFkError = msg.includes('foreign key') || msg.includes('_fkey');
        if (isFkError && options.email && table && schoolId) {
            const ensured = await ensureRoleProfileByEmail(role, schoolId, options.email, options.name || '', { forceRefresh: true });
            if (ensured?.id && ensured.id !== profileId) {
                return await syncRoleSegments(role, ensured.id, selectedSegments, options);
            }
        }
        throw insErr;
    }
}

async function syncSegmentsForSchoolMemberRole({ schoolId, role, email, name = '', selectedSegments = [] }) {
    const roleNorm = String(role || '').toLowerCase();
    if (!ROLE_SEGMENT_CONFIG[roleNorm]) return;

    const roleProfile = await ensureRoleProfileByEmail(roleNorm, schoolId, email, name, {
        forceRefresh: true
    });
    if (!roleProfile?.id) {
        throw new Error('Perfil da função não encontrado para sincronizar segmentos.');
    }

    await syncRoleSegments(roleNorm, roleProfile.id, selectedSegments, {
        schoolId,
        email,
        name
    });
}

async function carregarUsuarios(schoolId) {
    const lista = document.getElementById('lista-usuarios');
    lista.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary"></div><p>Sincronizando equipe...</p></td></tr>';

    try {
        if (!schoolId) {
            lista.innerHTML = '<tr><td colspan="5" class="text-center text-danger">SCHOOL_ID não encontrado na sessão.</td></tr>';
            return;
        }

        clearRoleProfilesCache();

        // Fonte oficial
        const { data: members, error: memErr } = await window.supabaseClient
            .from('school_members')
            .select('*')
            .eq('school_id', schoolId);

        if (memErr) throw memErr;

        const memberRows = [...(members || [])].map(u => ({ ...u, source_table: 'school_members' }));
        const seen = new Set(
            memberRows
                .map(m => normalizeEmail(m.email))
                .filter(Boolean)
        );

        // Complementa com registros órfãos das tabelas de role (sem school_members)
        const roleFetches = ROLE_TABLE_CONFIG.map(cfg =>
            window.supabaseClient
                .from(cfg.table)
                .select('id, school_id, name, email, phone, active, created_at')
                .eq('school_id', schoolId)
                .then(res => ({ ...res, role: cfg.role, table: cfg.table }))
        );

        const roleResults = await Promise.all(roleFetches);
        const orphanRows = [];
        for (const res of roleResults) {
            if (res.error) throw res.error;
            const rows = res.data || [];
            for (const row of rows) {
                const emailNorm = normalizeEmail(row.email);
                if (!emailNorm || seen.has(emailNorm)) continue;
                seen.add(emailNorm);
                orphanRows.push({
                    ...row,
                    role: res.role,
                    status: 'draft',
                    source_table: res.table,
                    user_id: null
                });
            }
        }

        let todosUsuarios = [...memberRows, ...orphanRows];

        // Ordenação por nome
        todosUsuarios.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
        usuariosCache = todosUsuarios;

        renderizarTabela(todosUsuarios);

    } catch (error) {
        console.error("Erro ao carregar:", error);
        lista.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
    }
}

function buscarUsuarios(termo = '') {
    const q = String(termo || '').trim().toLowerCase();
    if (!q) {
        renderizarTabela(usuariosCache);
        return;
    }

    const filtrados = usuariosCache.filter((u) => {
        const nome = String(u?.name || '').toLowerCase();
        const email = String(u?.email || '').toLowerCase();
        const role = String(u?.role || '').toLowerCase();
        const status = String(u?.status || '').toLowerCase();
        return nome.includes(q) || email.includes(q) || role.includes(q) || status.includes(q);
    });

    renderizarTabela(filtrados);
}

function renderizarTabela(usuarios) {
    const lista = document.getElementById('lista-usuarios');
    const userCount = document.getElementById('userCount');
    const myId = sessionStorage.getItem('USER_ID');

        const roleConfig = {
        'superadmin':      { label: 'Superadmin do Projeto', class: 'role-admin', icon: 'fa-crown' },
        'network_manager': { label: 'Gestor da Rede', class: 'role-admin', icon: 'fa-sitemap' },
        'content_curator': { label: 'Curador de Conteudo', class: 'role-secretary', icon: 'fa-book-medical' },
        'public_operator': { label: 'Atendimento Publico', class: 'role-support', icon: 'fa-comments' },
        'secretariat':     { label: 'Secretaria', class: 'role-secretary', icon: 'fa-folder-open' },
        'coordination':    { label: 'Coordenacao', class: 'role-coordinator', icon: 'fa-project-diagram' },
        'treasury':        { label: 'Tesouraria', class: 'role-finance', icon: 'fa-wallet' },
        'direction':       { label: 'Direcao', class: 'role-admin', icon: 'fa-user-tie' },
        'auditor':         { label: 'Auditoria / Compliance', class: 'role-it', icon: 'fa-clipboard-check' },
        'observer':        { label: 'Observador Externo', class: 'role-teacher', icon: 'fa-eye' }
    };

    if (usuarios.length === 0) {
        lista.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum membro encontrado.</td></tr>';
        userCount.innerText = 'Mostrando 0 de 0 registros';
        return;
    }

    const rowsHtml = usuarios.map(user => {
        const config = roleConfig[user.role] || { label: user.role, class: 'badge-dark', icon: 'fa-user' };
        const isMe = user.user_id === myId;
        
        let statusBadge = '';
        if (user.status === 'pending') {
            statusBadge = '<span class="badge status-pending"><i class="fas fa-clock mr-1"></i>Pendente</span>';
        } else if (user.status === 'invited') {
            statusBadge = '<span class="badge status-pending"><i class="fas fa-paper-plane mr-1"></i>Convidado</span>';
        } else {
            statusBadge = '<span class="badge status-active"><i class="fas fa-check-circle mr-1"></i>Ativo</span>';
        }

        const btnEditar = `<button class="btn btn-info btn-sm mx-1" onclick="editarUsuario('${user.id}', '${user.source_table || ''}')"><i class="fas fa-pencil-alt"></i></button>`;
        const btnExcluir = (isMe) ? '' : `<button class="btn btn-danger btn-sm mx-1" onclick="deletarUsuario('${user.id}')"><i class="fas fa-trash"></i></button>`;

        return `
            <tr>
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=32" class="img-circle mr-2 shadow-sm avatar">
                        <div>
                            <span class="font-weight-bold d-block">${user.name} ${isMe ? '<small class="badge badge-warning badge-self ml-1">VOCÊ</small>' : ''}</span>
                            <small class="text-muted"><i class="far fa-envelope mr-1"></i>${user.email}</small>
                            ${user.phone ? `<small class="text-muted d-block"><i class="fas fa-phone-alt mr-1"></i>${applyPhoneMask(user.phone)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td class="align-middle">
                    <span class="badge-role ${config.class} py-2 px-2 shadow-sm">
                        <i class="fas ${config.icon} mr-1"></i> ${config.label}
                    </span>
                </td>
                <td class="text-center align-middle">${statusBadge}</td>
                <td class="text-right align-middle">
                    <div class="btn-group">
                        ${user.status !== 'active' ? `<button class="btn btn-success btn-sm mx-1" onclick="convidarUsuarioExistente('${user.id}')" title="Enviar Convite de Acesso"><i class="fas fa-paper-plane"></i></button>` : ''}
                        ${btnEditar}
                        ${btnExcluir}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    lista.innerHTML = rowsHtml;
    userCount.innerText = `Mostrando ${usuarios.length} de ${usuarios.length} registros`;
}

// Funções do Modal
function abrirModalUsuario() {
    editingUserContext = null;
    document.getElementById('userId').value = '';
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPhone').value = '';
    document.getElementById('userRole').value = '';
    document.getElementById('divSegments').style.display = 'none';
    togglePermissionsUIForCurrentEditor(null);
    
    document.getElementById('modalUsuarioTitle').innerText = 'Novo Usuário';
    $('#modalUsuario').modal('show');
}

async function editarUsuario(id, sourceTable = '') {
    const user = usuariosCache.find(u => String(u.id) === String(id) && (!sourceTable || String(u.source_table || '') === String(sourceTable)))
        || usuariosCache.find(u => String(u.id) === String(id));
    if (!user) {
        return Swal.fire('Erro', 'Usuário não encontrado para edição.', 'error');
    }

    editingUserContext = user;

    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPhone').value = applyPhoneMask(user.phone || '');
    document.getElementById('userRole').value = user.role || '';
    document.getElementById('modalUsuarioTitle').innerText = 'Editar Usuário';

    const divSegments = document.getElementById('divSegments');
    const container = document.getElementById('segmentsContainer');
    
    document.querySelectorAll('.segment-checkbox').forEach(cb => cb.checked = false);

    if (false) {
        divSegments.style.display = 'block';
        
        if (container.children.length <= 1) { 
            await carregarSegmentosParaCheckboxes(); 
        }

        try {
            const schoolId = sessionStorage.getItem('SCHOOL_ID');
            const segCfg = ROLE_SEGMENT_CONFIG[user.role];
            const roleProfile = await fetchRoleProfileByEmail(user.role, schoolId, user.email);
            const profileId = roleProfile?.id;
            if (!segCfg || !profileId) {
                await togglePermissionsUIForCurrentEditor(user);
                $('#modalUsuario').modal('show');
                return;
            }

            let vinculosQuery = window.supabaseClient
                .from(segCfg.relationTable)
                .select('segment_id')
                .eq(segCfg.fkColumn, profileId);

            if (segCfg.relationTable === 'coordinator_segments' && schoolId) {
                vinculosQuery = vinculosQuery.eq('school_id', schoolId);
            }

            const { data: vinculos, error } = await vinculosQuery;

            if (error) throw error;

            if (vinculos) {
                vinculos.forEach(v => {
                    const checkbox = document.getElementById(`seg_${v.segment_id}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } catch (error) {
            console.error('Erro ao carregar vínculos do usuário:', error);
        }
    } else {
        divSegments.style.display = 'none';
    }

    await togglePermissionsUIForCurrentEditor(user);

    $('#modalUsuario').modal('show');
}

async function getAppPages(schoolId) {
    if (!schoolId) return [];
    try {
        if (typeof window.fetchAppPagesCatalog === 'function') {
            const pages = await window.fetchAppPagesCatalog(schoolId);
            if (Array.isArray(pages) && pages.length) return pages;
        }
    } catch (err) {
        console.warn('Não foi possível carregar app_pages:', err?.message || err);
    }

    const roleDefaults = window.DEFAULT_ROLE_PAGES || {};
    const keys = [...new Set(Object.values(roleDefaults).flat())];
    return keys.map((k, idx) => ({
        key: k,
        label: fallbackPageLabels[k] || k,
        menu_order: idx,
        active: true
    }));
}

function getManageableRoles() {
    return ['network_manager', 'content_curator', 'public_operator', 'secretariat', 'coordination', 'treasury', 'direction', 'auditor', 'observer'];
}

function populateRolePermissionsRoleSelect() {
    const select = document.getElementById('rolePermRoleSelect');
    if (!select) return;
    const roles = getManageableRoles();
    select.innerHTML = roles.map(r => `<option value="${r}">${roleLabelMap[r] || r}</option>`).join('');
}

function renderRolePermissionsCheckboxes(pages, selectedKeys = []) {
    const container = document.getElementById('rolePermissionsContainer');
    if (!container) return;
    const selected = new Set(selectedKeys || []);
    const html = (pages || []).map(p => `
        <div class="custom-control custom-checkbox mb-1">
            <input type="checkbox" class="custom-control-input role-perm-page-checkbox" id="role_perm_${p.key}" value="${p.key}" ${selected.has(p.key) ? 'checked' : ''}>
            <label class="custom-control-label" for="role_perm_${p.key}">${p.label || p.key}</label>
        </div>
    `).join('');
    container.innerHTML = html || '<small class="text-muted">Nenhuma página cadastrada.</small>';
}

async function loadRolePermissionsForSelectedRole() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const select = document.getElementById('rolePermRoleSelect');
    const container = document.getElementById('rolePermissionsContainer');
    if (!schoolId || !select || !container) return;

    const role = select.value;
    container.innerHTML = '<small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Carregando permissões da função...</small>';

    try {
        const pages = appPagesCache.length ? appPagesCache : await getAppPages(schoolId);
        appPagesCache = pages;
        const roleAllowed = (typeof window.fetchRoleAllowedPages === 'function')
            ? await window.fetchRoleAllowedPages(schoolId, role)
            : ((window.DEFAULT_ROLE_PAGES?.[role] || []));
        select.dataset.roleDefault = JSON.stringify(window.DEFAULT_ROLE_PAGES?.[role] || []);
        renderRolePermissionsCheckboxes(pages, roleAllowed);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<small class="text-danger">Falha ao carregar permissões da função.</small>';
    }
}

async function saveRolePermissionsForSelectedRole() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const role = document.getElementById('rolePermRoleSelect')?.value;
    const btn = document.getElementById('btnRolePermSave');
    if (!schoolId || !role || !btn) return;

    const pages = appPagesCache.length ? appPagesCache : await getAppPages(schoolId);
    const selected = new Set(Array.from(document.querySelectorAll('.role-perm-page-checkbox:checked')).map(cb => cb.value));
    const payload = pages.map(p => ({
        school_id: schoolId,
        role,
        page_key: p.key,
        allowed: selected.has(p.key)
    }));

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
    try {
        const { error } = await window.supabaseClient
            .from('role_page_permissions')
            .upsert(payload, { onConflict: 'school_id,role,page_key' });
        if (error) throw error;
        Swal.fire('Sucesso', 'Permissões da função atualizadas.', 'success');
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', err.message || 'Não foi possível salvar as permissões da função.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

function bindUsersMainTabsBehavior() {
    const searchTools = document.getElementById('usersSearchTools');
    const footer = document.getElementById('usersTableFooter');
    const roleTab = document.getElementById('role-permissions-tab');
    const usersTab = document.getElementById('users-list-tab');

    const showUsersListTools = () => {
        if (searchTools) searchTools.style.display = '';
        if (footer) footer.style.display = '';
    };
    const showRoleTools = () => {
        if (searchTools) searchTools.style.display = 'none';
        if (footer) footer.style.display = 'none';
    };

    if (usersTab) usersTab.addEventListener('shown.bs.tab', showUsersListTools);
    if (roleTab) roleTab.addEventListener('shown.bs.tab', async () => {
        showRoleTools();
        await loadRolePermissionsForSelectedRole();
    });
}

async function initRolePermissionsTab() {
    const currentRole = sessionStorage.getItem('USER_ROLE');
    const roleTab = document.getElementById('role-permissions-tab');
    const rolePane = document.getElementById('role-permissions-pane');
    const select = document.getElementById('rolePermRoleSelect');
    const saveBtn = document.getElementById('btnRolePermSave');
    const resetBtn = document.getElementById('btnRolePermResetDefault');

    if (!roleTab || !rolePane) return;

    if (!['superadmin', 'network_manager'].includes(currentRole)) {
        roleTab.parentElement.style.display = 'none';
        rolePane.classList.remove('show', 'active');
        return;
    }

    populateRolePermissionsRoleSelect();
    bindUsersMainTabsBehavior();

    if (select && select.dataset.bound !== '1') {
        select.dataset.bound = '1';
        select.addEventListener('change', () => {
            void loadRolePermissionsForSelectedRole();
        });
    }

    if (saveBtn && saveBtn.dataset.bound !== '1') {
        saveBtn.dataset.bound = '1';
        saveBtn.addEventListener('click', () => {
            void saveRolePermissionsForSelectedRole();
        });
    }

    if (resetBtn && resetBtn.dataset.bound !== '1') {
        resetBtn.dataset.bound = '1';
        resetBtn.addEventListener('click', () => {
            const role = document.getElementById('rolePermRoleSelect')?.value;
            const defaults = window.DEFAULT_ROLE_PAGES?.[role] || [];
            renderRolePermissionsCheckboxes(appPagesCache, defaults);
        });
    }

    // Carrega imediatamente para evitar ficar preso no placeholder "Carregando páginas..."
    // quando a aba já abrir ativa ou sem disparo do evento shown.bs.tab.
    await loadRolePermissionsForSelectedRole();
}

function renderPermissionsCheckboxes(pages, selectedKeys = []) {
    const container = document.getElementById('permissionsContainer');
    if (!container) return;
    const selected = new Set(selectedKeys || []);
    const html = (pages || []).map(p => `
        <div class="custom-control custom-checkbox mb-1">
            <input type="checkbox" class="custom-control-input perm-page-checkbox" id="perm_${p.key}" value="${p.key}" ${selected.has(p.key) ? 'checked' : ''}>
            <label class="custom-control-label" for="perm_${p.key}">${p.label || p.key}</label>
        </div>
    `).join('');
    container.innerHTML = html || '<small class="text-muted">Nenhuma página cadastrada.</small>';
}

function getSelectedPermissionKeys() {
    return Array.from(document.querySelectorAll('.perm-page-checkbox:checked')).map(cb => cb.value);
}

function setPermissionsModeVisual(isRoleDefaultMode) {
    const container = document.getElementById('permissionsContainer');
    if (!container) return;
    container.style.opacity = isRoleDefaultMode ? '0.65' : '1';
}

function setPermissionsControlsDisabled(disabled) {
    document.querySelectorAll('.perm-page-checkbox').forEach(cb => {
        cb.disabled = disabled;
    });
    setPermissionsModeVisual(disabled);
}

async function togglePermissionsUIForCurrentEditor(user) {
    const div = document.getElementById('divPagePermissions');
    const useRoleDefault = document.getElementById('permUseRoleDefault');
    const role = sessionStorage.getItem('USER_ROLE');
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const container = document.getElementById('permissionsContainer');

    if (!div || !useRoleDefault || !container) return;

    const isAdminEditor = ['superadmin', 'network_manager'].includes(role);
    const canEditTarget = !!(user && user.source_table === 'school_members' && user.user_id);
    if (!isAdminEditor || !canEditTarget) {
        div.style.display = 'none';
        return;
    }

    div.style.display = 'block';
    container.innerHTML = '<small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Carregando permissões...</small>';

    try {
        const pages = await getAppPages(schoolId);
        appPagesCache = pages;

        const roleAllowed = (typeof window.fetchRoleAllowedPages === 'function')
            ? await window.fetchRoleAllowedPages(schoolId, user.role)
            : ((window.DEFAULT_ROLE_PAGES?.[user.role] || []));

        let userOverrides = [];
        if (typeof window.fetchUserOverrides === 'function') {
            userOverrides = await window.fetchUserOverrides(schoolId, user.user_id);
        }

        const hasCustom = Array.isArray(userOverrides) && userOverrides.length > 0;
        useRoleDefault.checked = !hasCustom;

        const effective = (typeof window.resolveEffectivePages === 'function')
            ? window.resolveEffectivePages(roleAllowed, userOverrides)
            : roleAllowed;

        renderPermissionsCheckboxes(pages, effective);
        document.getElementById('permUseRoleDefault').dataset.roleDefault = JSON.stringify(roleAllowed || []);
        document.getElementById('permUseRoleDefault').dataset.customCache = JSON.stringify(effective || []);
        setPermissionsControlsDisabled(useRoleDefault.checked);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<small class="text-danger">Falha ao carregar permissões.</small>';
    }
}

async function persistUserPagePermissionsIfNeeded(user) {
    const div = document.getElementById('divPagePermissions');
    const useRoleDefault = document.getElementById('permUseRoleDefault');
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    if (!div || div.style.display === 'none' || !useRoleDefault || !user?.user_id || !schoolId) return;

    if (useRoleDefault.checked) {
        const { error } = await window.supabaseClient
            .from('user_page_permissions')
            .delete()
            .eq('school_id', schoolId)
            .eq('user_id', user.user_id);
        if (error) throw error;
        return;
    }

    const pages = appPagesCache.length ? appPagesCache : await getAppPages(schoolId);
    const selected = new Set(
        Array.from(document.querySelectorAll('.perm-page-checkbox:checked')).map(cb => cb.value)
    );
    const payload = pages.map(p => ({
        school_id: schoolId,
        user_id: user.user_id,
        page_key: p.key,
        allowed: selected.has(p.key)
    }));

    const { error } = await window.supabaseClient
        .from('user_page_permissions')
        .upsert(payload, { onConflict: 'school_id,user_id,page_key' });
    if (error) throw error;
}

async function carregarSegmentosParaCheckboxes() {
    const container = document.getElementById('segmentsContainer');
    const schoolId = sessionStorage.getItem('SCHOOL_ID');

    try {
        const { data: segments, error } = await window.supabaseClient
            .from('segments')
            .select('id, name, stage_category')
            .eq('school_id', schoolId)
            .eq('active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        if (!segments || segments.length === 0) {
            container.innerHTML = '<span class="text-danger">Nenhum segmento ativo encontrado.</span>';
            return;
        }

        container.innerHTML = segments.map(seg => `
            <div class="segment-checkbox-container">
                <div class="custom-control custom-checkbox">
                    <input type="checkbox" 
                           class="custom-control-input segment-checkbox" 
                           id="seg_${seg.id}" 
                           value="${seg.id}" 
                           data-category="${seg.stage_category}" 
                           data-name="${seg.name}">
                    <label class="custom-control-label" for="seg_${seg.id}">${seg.name}</label>
                </div>
            </div>
        `).join('');

        vincularLogicaDeGrupo();

    } catch (error) {
        console.error('Erro ao carregar segmentos:', error);
        container.innerHTML = '<span class="text-danger">Erro ao carregar opções.</span>';
    }
}

function vincularLogicaDeGrupo() {
    const checkboxes = document.querySelectorAll('.segment-checkbox');
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const category = this.getAttribute('data-category');
            const name = this.getAttribute('data-name').toLowerCase();
            const isChecked = this.checked;

            if (name === "fundamental i" || name === "fundamental ii") {
                checkboxes.forEach(other => {
                    if (other.getAttribute('data-category') === category) {
                        other.checked = isChecked;
                    }
                });
            }
        });
    });
}

async function salvarUsuario(enviarConvite = true) {
    const userId = document.getElementById('userId').value;
    const nome = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = normalizePhoneDigits(document.getElementById('userPhone')?.value || '');
    const role = document.getElementById('userRole').value;
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    
    if (!nome || !email || !role) {
        return Swal.fire('Atenção', 'Preencha todos os campos obrigatórios.', 'warning');
    }

    const usuarioEmEdicao = userId ? usuariosCache.find(u => String(u.id) === String(userId)) : null;
    const previousEmail = usuarioEmEdicao?.email || null;
    const previousRole = String(usuarioEmEdicao?.role || '').toLowerCase();
    const emailNorm = normalizeEmail(email);

    if (usuarioEmEdicao && usuarioEmEdicao.source_table === 'school_members' && previousEmail && normalizeEmail(previousEmail) !== emailNorm) {
        return Swal.fire('Atenção', 'Para evitar inconsistência entre tabelas, a alteração de e-mail deve ser feita criando um novo usuário.', 'warning');
    }

    let selectedSegments = [];
    if (false) {
        selectedSegments = Array.from(document.querySelectorAll('.segment-checkbox:checked'))
                                .map(cb => cb.value);
        
        if (selectedSegments.length === 0) {
            return Swal.fire('Atenção', 'Selecione pelo menos um segmento.', 'warning');
        }
    }

    try {
        Swal.fire({
            title: enviarConvite ? 'Enviando convite...' : 'Salvando usuário...',
            text: enviarConvite
                ? 'Aguarde enquanto preparamos e enviamos o e-mail de acesso.'
                : 'Aguarde enquanto salvamos os dados do usuário.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const inviteResult = await sincronizarMembroAcesso({
            email: emailNorm,
            nome: nome,
            role: role,
            school_id: schoolId,
            send_invite: enviarConvite
        });

        const fallbackStatus = enviarConvite ? 'invited' : 'pending';
        let memberRow = null;

        const isExistingSchoolMember = usuarioEmEdicao?.source_table === 'school_members';

        if (isExistingSchoolMember) {
            const { data, error } = await window.supabaseClient
                .from('school_members')
                .update({
                    name: nome,
                    email: emailNorm,
                    role,
                    phone: phone || null,
                    user_id: inviteResult?.user_id || usuarioEmEdicao.user_id || null
                })
                .eq('id', userId)
                .select('*')
                .single();
            if (error) throw error;
            memberRow = data;
        } else {
            const payload = {
                school_id: schoolId,
                name: nome,
                email: emailNorm,
                role,
                phone: phone || null,
                user_id: inviteResult?.user_id || null,
                status: fallbackStatus,
                active: false,
                invite_sent_at: enviarConvite ? new Date().toISOString() : null
            };
            const { data: existingRows, error: findErr } = await window.supabaseClient
                .from('school_members')
                .select('*')
                .eq('school_id', schoolId)
                .eq('email', emailNorm)
                .limit(1);
            if (findErr) throw findErr;

            if (existingRows && existingRows.length > 0) {
                const existing = existingRows[0];
                const { data, error } = await window.supabaseClient
                    .from('school_members')
                    .update(payload)
                    .eq('id', existing.id)
                    .select('*')
                    .single();
                if (error) throw error;
                memberRow = data;
            } else {
                const { data, error } = await window.supabaseClient
                    .from('school_members')
                    .insert(payload)
                    .select('*')
                    .single();
                if (error) throw error;
                memberRow = data;
            }
        }

        await syncSegmentsForSchoolMemberRole({
            schoolId,
            role,
            email: emailNorm,
            name: nome,
            selectedSegments
        });

        // Mantém telefone também no perfil da função (quando houver tabela de role).
        const roleTable = getRoleProfileTable(role);
        if (roleTable) {
            try {
                await window.supabaseClient
                    .from(roleTable)
                    .upsert(
                        {
                            school_id: schoolId,
                            email: emailNorm,
                            name: nome,
                            phone: phone || null,
                            active: true
                        },
                        { onConflict: 'school_id,email' }
                    );
            } catch (rolePhoneErr) {
                console.warn('Aviso: não foi possível sincronizar telefone na tabela da função:', rolePhoneErr?.message || rolePhoneErr);
            }
        }

        // Defesa: garante que vínculos de coordenador foram persistidos.
        // Em alguns cenários de troca de role, triggers podem limpar relações no meio do fluxo.
        if (false && selectedSegments.length > 0) {
            const roleProfile = await ensureRoleProfileByEmail('coordinator', schoolId, emailNorm, nome, { forceRefresh: true });
            if (roleProfile?.id) {
                const { data: persisted, error: persistedErr } = await window.supabaseClient
                    .from('coordinator_segments')
                    .select('segment_id')
                    .eq('school_id', schoolId)
                    .eq('coordinator_id', roleProfile.id);
                if (persistedErr) throw persistedErr;

                const persistedSet = new Set((persisted || []).map(x => x.segment_id));
                const missing = selectedSegments.filter(segId => !persistedSet.has(segId));
                if (missing.length > 0) {
                    await syncRoleSegments('coordinator', roleProfile.id, selectedSegments, {
                        schoolId,
                        email: emailNorm,
                        name: nome
                    });
                }
            }
        }

        // Se houve troca de role, remove overrides antigos para evitar herdar permissões de outra função.
        const roleChanged = !!previousRole && previousRole !== String(role || '').toLowerCase();
        const targetUserId = memberRow?.user_id || usuarioEmEdicao?.user_id || null;
        if (roleChanged && targetUserId) {
            const { error: clearPermErr } = await window.supabaseClient
                .from('user_page_permissions')
                .delete()
                .eq('school_id', schoolId)
                .eq('user_id', targetUserId);
            if (clearPermErr) throw clearPermErr;
        }

        // Se estiver editando usuário real da school_members e admin logado, salva permissões customizadas
        if (editingUserContext && editingUserContext.source_table === 'school_members') {
            const updatedUser = {
                ...memberRow,
                role,
                name: nome,
                email: emailNorm,
                user_id: memberRow?.user_id || editingUserContext.user_id
            };
            try {
                await persistUserPagePermissionsIfNeeded(updatedUser);
            } catch (permErr) {
                console.warn('Permissões não salvas:', permErr?.message || permErr);
                Swal.fire('Aviso', 'Usuário salvo, mas não foi possível salvar permissões personalizadas.', 'warning');
            }
        }

        // Se o usuário editado for o próprio usuário logado e houve troca de função, atualiza cache local.
        const currentUserId = sessionStorage.getItem('USER_ID');
        if (roleChanged && targetUserId && String(targetUserId) === String(currentUserId)) {
            sessionStorage.setItem('USER_ROLE', role);
            sessionStorage.removeItem('USER_ALLOWED_PAGES');
            if (typeof window.applyPermissions === 'function') {
                window.applyPermissions();
            }
        }

        Swal.fire('Sucesso!', 'Dados salvos com sucesso.', 'success');
        carregarUsuarios(schoolId);
        $('#modalUsuario').modal('hide');

    } catch (error) {
        console.error('Erro ao salvar:', error);
        Swal.fire('Erro', error.message, 'error');
    }
}

async function sincronizarMembroAcesso({ email, nome, role, school_id, send_invite = true }) {
    const authOnly = !send_invite;
    const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
    if (sessionError) {
        throw new Error(sessionError.message || 'Falha ao validar sessão atual.');
    }

    const accessToken = sessionData?.session?.access_token || null;
    if (!accessToken) {
        throw new Error('Sessão expirada. Faça login novamente para convidar usuários.');
    }

    const payload = {
        email,
        nome,
        role,
        school_id,
        send_invite,
        auth_only: authOnly
    };

    // Tentativa 1: SDK
    const { data, error } = await window.supabaseClient.functions.invoke('invite-user', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        body: payload
    });

    if (!error) {
        if (data?.error) throw new Error(data.error);
        return data;
    }

    // Tentativa 2 (fallback): fetch explícito para garantir headers no request
    const isAuthHeaderIssue = String(error?.message || '').toLowerCase().includes('non-2xx')
        || String(error?.message || '').toLowerCase().includes('authorization');

    if (isAuthHeaderIssue) {
        const supabaseUrl = window.supabaseClient?.supabaseUrl;
        const supabaseKey =
            window.supabaseClient?.supabaseKey ||
            window.supabaseClient?.rest?.headers?.apikey ||
            null;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Não foi possível montar fallback da Edge Function (URL/Key ausentes).');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        let json = null;
        try {
            json = await response.json();
        } catch (_) {
            json = null;
        }

        if (!response.ok) {
            const msg = json?.error || json?.message || `HTTP ${response.status}`;
            throw new Error(`Falha no convite (fallback): ${msg}`);
        }

        if (json?.error) {
            throw new Error(json.error);
        }

        return json;
    }

    throw new Error(error.message || 'Falha ao invocar invite-user');
}

async function deletarUsuario(id) {
    const confirm = await Swal.fire({
        title: 'Tem certeza?',
        text: "O usuário perderá acesso ao sistema.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, remover'
    });

    if (confirm.isConfirmed) {
        const user = usuariosCache.find(u => String(u.id) === String(id));
        try {
            if (!user) {
                throw new Error('Usuário não encontrado.');
            }

            const schoolId = sessionStorage.getItem('SCHOOL_ID');
            if (user.source_table === 'school_members') {
                if (user.user_id) {
                    const { error: permErr } = await window.supabaseClient
                        .from('user_page_permissions')
                        .delete()
                        .eq('school_id', schoolId)
                        .eq('user_id', user.user_id);
                    if (permErr) throw permErr;
                }

                const { error } = await window.supabaseClient
                    .from('school_members')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                // Remoção direta de registro órfão na tabela da função
                if (user.source_table === 'coordinators') {
                    const { error: slotErr } = await window.supabaseClient
                        .from('visit_slots')
                        .update({ coordinator_id: null })
                        .eq('coordinator_id', id)
                        .eq('school_id', schoolId);
                    if (slotErr) throw slotErr;

                    const { error: segErr } = await window.supabaseClient
                        .from('coordinator_segments')
                        .delete()
                        .eq('coordinator_id', id)
                        .eq('school_id', schoolId);
                    if (segErr) throw segErr;
                }

                if (user.source_table === 'teachers') {
                    const { error: segErr } = await window.supabaseClient
                        .from('teacher_segments')
                        .delete()
                        .eq('teacher_id', id);
                    if (segErr) throw segErr;
                }

                const { error } = await window.supabaseClient
                    .from(user.source_table)
                    .delete()
                    .eq('id', id)
                    .eq('school_id', schoolId);
                if (error) throw error;
            }

            Swal.fire('Removido!', 'Usuário removido.', 'success');
            carregarUsuarios(schoolId);
            
        } catch (error) {
            const msg = String(error.message || '').toLowerCase();
            if (msg.includes('foreign key')) {
                Swal.fire('Não foi possível excluir', 'Existem vínculos deste usuário em outras tabelas. Remova os vínculos e tente novamente.', 'error');
            } else {
                Swal.fire('Não permitido', 'Não foi possível excluir. Verifique se você tem permissão ou se está tentando excluir a si mesmo.', 'error');
            }
        }
    }
}

async function convidarUsuarioExistente(id) {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const user = usuariosCache.find(u => String(u.id) === String(id));

    if (!user) {
        return Swal.fire('Erro', 'Usuário não encontrado no cache da tela.', 'error');
    }

    if (!user.email) {
        return Swal.fire('Erro', 'Este usuário não possui e-mail cadastrado.', 'error');
    }

    const confirm = await Swal.fire({
        title: 'Enviar convite?',
        html: `Enviar convite de acesso para <b>${user.name}</b><br><small>${user.email}</small>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Enviar convite'
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.fire({
            title: 'Enviando convite...',
            text: 'Aguarde enquanto enviamos o convite de acesso.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        await sincronizarMembroAcesso({
            email: user.email,
            nome: user.name,
            role: user.role,
            school_id: schoolId,
            send_invite: true
        });

        await Swal.fire('Sucesso', `Convite enviado para ${user.email}.`, 'success');
        await carregarUsuarios(schoolId);
    } catch (err) {
        console.error('Erro ao convidar usuário existente:', err);
        Swal.fire('Erro', err.message || 'Não foi possível enviar o convite.', 'error');
    }
}

// Tornar funções globais para acesso via onclick
window.abrirModalUsuario = abrirModalUsuario;
window.editarUsuario = editarUsuario;
window.salvarUsuario = salvarUsuario;
window.deletarUsuario = deletarUsuario;
window.convidarUsuarioExistente = convidarUsuarioExistente;
window.carregarSegmentosParaCheckboxes = carregarSegmentosParaCheckboxes;
window.buscarUsuarios = buscarUsuarios;

document.addEventListener('DOMContentLoaded', () => {
    const userPhoneInput = document.getElementById('userPhone');
    if (userPhoneInput && userPhoneInput.dataset.maskBound !== '1') {
        userPhoneInput.dataset.maskBound = '1';
        userPhoneInput.addEventListener('input', (e) => {
            e.target.value = applyPhoneMask(e.target.value);
        });
    }

    const toggle = document.getElementById('permUseRoleDefault');
    if (toggle && toggle.dataset.bound !== '1') {
        toggle.dataset.bound = '1';
        toggle.addEventListener('change', () => {
            const rawRoleDefault = toggle.dataset.roleDefault || '[]';
            let roleDefault = [];
            try {
                roleDefault = JSON.parse(rawRoleDefault);
            } catch {
                roleDefault = [];
            }

            // Ao ligar o padrão da função, guarda o custom atual antes de sobrescrever.
            if (toggle.checked) {
                toggle.dataset.customCache = JSON.stringify(getSelectedPermissionKeys());
            }

            setPermissionsControlsDisabled(toggle.checked);
            if (toggle.checked) {
                if (appPagesCache.length) {
                    renderPermissionsCheckboxes(appPagesCache, roleDefault);
                }
                return;
            }

            // Ao desligar o padrão da função, restaura o custom anterior.
            const rawCustom = toggle.dataset.customCache || '[]';
            let customSelection = [];
            try {
                customSelection = JSON.parse(rawCustom);
            } catch {
                customSelection = [];
            }
            if (appPagesCache.length) {
                const selectionToApply = customSelection.length ? customSelection : roleDefault;
                renderPermissionsCheckboxes(appPagesCache, selectionToApply);
            }
        });
    }

    const roleSelect = document.getElementById('userRole');
    if (roleSelect && roleSelect.dataset.permBound !== '1') {
        roleSelect.dataset.permBound = '1';
        roleSelect.addEventListener('change', async () => {
            const div = document.getElementById('divPagePermissions');
            const useRoleDefault = document.getElementById('permUseRoleDefault');
            if (!div || div.style.display === 'none' || !useRoleDefault || !useRoleDefault.checked) return;
            const schoolId = sessionStorage.getItem('SCHOOL_ID');
            try {
                const roleAllowed = (typeof window.fetchRoleAllowedPages === 'function')
                    ? await window.fetchRoleAllowedPages(schoolId, roleSelect.value)
                    : ((window.DEFAULT_ROLE_PAGES?.[roleSelect.value] || []));
                useRoleDefault.dataset.roleDefault = JSON.stringify(roleAllowed || []);
                if (appPagesCache.length) {
                    renderPermissionsCheckboxes(appPagesCache, roleAllowed);
                    setPermissionsControlsDisabled(true);
                }
                useRoleDefault.dataset.customCache = JSON.stringify([]);
            } catch (err) {
                console.warn('Falha ao recarregar permissões da função:', err?.message || err);
            }
        });
    }
});


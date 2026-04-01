// // users.js - Logica completa para a pagina de Gestao de Usuarios

let usuariosCache = [];
let appPagesCache = [];
let editingUserContext = null;
let roleProfilesCacheByEmail = {};
const fallbackPageLabels = {
    dashboard: 'Dashboard de Inteligência',
    'chat-manager': 'Atendimento',
    reports: 'Relatórios',
    audit: 'Auditoria Formal',
    users: 'Usuários',
    preferences: 'Preferências',
    knowledge: 'Base de Conhecimento',
    'teaching-content': 'Curadoria Pedagógica',
    'official-content': 'Conteúdo Oficial'
};
const SANDBOX_DEFAULT_PASSWORD = '123456789';
const roleLabelMap = {
    superadmin: 'Superadmin do Projeto',
    network_manager: 'Gestor de Rede',
    content_curator: 'Curadoria de Conteúdo',
    public_operator: 'Atendimento Público',
    secretariat: 'Secretaria',
    coordination: 'Coordenação',
    teacher: 'Professor',
    direction: 'Direção',
    auditor: 'Auditoria e Compliance',
    observer: 'Observador Externo'
};
const roleVisualMap = {
    superadmin: { label: 'Superadmin do Projeto', class: 'role-superadmin', icon: 'fa-crown' },
    network_manager: { label: 'Gestor de Rede', class: 'role-network', icon: 'fa-sitemap' },
    content_curator: { label: 'Curadoria de Conteúdo', class: 'role-content', icon: 'fa-book-medical' },
    public_operator: { label: 'Atendimento Público', class: 'role-service', icon: 'fa-comments' },
    secretariat: { label: 'Secretaria', class: 'role-secretariat', icon: 'fa-folder-open' },
    coordination: { label: 'Coordenação', class: 'role-coordination', icon: 'fa-project-diagram' },
    teacher: { label: 'Professor', class: 'role-teacher', icon: 'fa-chalkboard-teacher' },
    direction: { label: 'Direção', class: 'role-direction', icon: 'fa-user-tie' },
    auditor: { label: 'Auditoria e Compliance', class: 'role-auditor', icon: 'fa-clipboard-check' },
    observer: { label: 'Observador Externo', class: 'role-observer', icon: 'fa-eye' }
};
const USERS_LOWERCASE_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const memberScopeLabelMap = {
    department_staff: 'Vínculo interno da secretaria/rede',
    school_staff: 'Vínculo interno da unidade escolar',
    external_auditor: 'Vínculo externo de auditoria',
    external_observer: 'Vínculo externo de observação'
};

const BULK_USER_TEMPLATE_HEADERS = ['nome', 'email', 'telefone', 'perfil_acesso'];
const BULK_USER_HEADER_ALIASES = {
    nome: 'name',
    nome_completo: 'name',
    full_name: 'name',
    email: 'email',
    'e-mail': 'email',
    telefone: 'phone',
    celular: 'phone',
    phone: 'phone',
    perfil_acesso: 'role',
    perfil: 'role',
    funcao: 'role',
    papel: 'role',
    role: 'role'
};
const BULK_ROLE_INPUT_MAP = {
    superadmin: 'superadmin',
    'superadmin do projeto': 'superadmin',
    network_manager: 'network_manager',
    'gestao da rede': 'network_manager',
    'gestor de rede': 'network_manager',
    'gestao de rede': 'network_manager',
    content_curator: 'content_curator',
    'curadoria de conteudo': 'content_curator',
    public_operator: 'public_operator',
    'atendimento publico': 'public_operator',
    secretariat: 'secretariat',
    secretaria: 'secretariat',
    coordination: 'coordination',
    coordenacao: 'coordination',
    teacher: 'teacher',
    professor: 'teacher',
    direction: 'direction',
    direcao: 'direction',
    auditor: 'auditor',
    'auditoria e compliance': 'auditor',
    observer: 'observer',
    'observador externo': 'observer'
};

function stripDiacritics(value = '') {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function normalizeBulkHeader(value = '') {
    return stripDiacritics(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function normalizeBulkRole(value = '') {
    const keyWithUnderscore = normalizeBulkHeader(value);
    const keyWithSpace = keyWithUnderscore.replace(/_/g, ' ');
    return BULK_ROLE_INPUT_MAP[keyWithUnderscore] || BULK_ROLE_INPUT_MAP[keyWithSpace] || '';
}

function parseCsvLine(line, delimiter) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === delimiter && !inQuotes) {
            values.push(current);
            current = '';
            continue;
        }
        current += char;
    }

    values.push(current);
    return values.map((item) => item.trim());
}

function detectCsvDelimiter(headerLine = '') {
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
}

function parseBulkUsersCsv(rawText = '') {
    const source = String(rawText || '').replace(/^\uFEFF/, '').trim();
    if (!source) {
        return { rows: [], errors: ['Cole o CSV ou selecione um arquivo para importar.'] };
    }

    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
        return { rows: [], errors: ['O CSV precisa ter cabecalho e pelo menos uma linha de usuario.'] };
    }

    const delimiter = detectCsvDelimiter(lines[0]);
    const rawHeaders = parseCsvLine(lines[0], delimiter);
    const headers = rawHeaders.map(normalizeBulkHeader);
    const mappedHeaders = headers.map((header) => BULK_USER_HEADER_ALIASES[header] || '');
    const requiredHeaders = ['name', 'email', 'role'];
    const missingHeaders = requiredHeaders.filter((field) => !mappedHeaders.includes(field));
    if (missingHeaders.length) {
        const labelMap = { name: 'nome', email: 'email', role: 'perfil_acesso' };
        return { rows: [], errors: ['Colunas obrigatorias ausentes: ' + missingHeaders.map((field) => labelMap[field]).join(', ') + '.'] };
    }

    const rows = [];
    const errors = [];
    for (let index = 1; index < lines.length; index += 1) {
        const values = parseCsvLine(lines[index], delimiter);
        if (!values.some((value) => String(value || '').trim())) continue;
        const row = { rawLine: index + 1, name: '', email: '', phone: '', role: '', originalRole: '' };
        mappedHeaders.forEach((field, headerIndex) => {
            if (!field) return;
            const value = String(values[headerIndex] || '').trim();
            if (field === 'role') {
                row.originalRole = value;
                row.role = normalizeBulkRole(value);
                return;
            }
            row[field] = value;
        });

        if (!row.name || !row.email || !row.originalRole) {
            errors.push('Linha ' + row.rawLine + ': preencha nome, email e perfil_acesso.');
            continue;
        }
        if (!row.role) {
            errors.push('Linha ' + row.rawLine + ': perfil ' + row.originalRole + ' nao reconhecido.');
            continue;
        }
        rows.push(row);
    }

    if (!rows.length && !errors.length) {
        errors.push('Nenhum usuario valido foi encontrado no CSV.');
    }

    return { rows, errors };
}

function renderBulkUsersPreview() {
    const preview = document.getElementById('bulkUsersPreview');
    const textarea = document.getElementById('bulkUsersTextarea');
    if (!preview || !textarea) return;

    const parsed = parseBulkUsersCsv(textarea.value);
    const rows = parsed.rows;
    const errors = parsed.errors;
    const institutionName = currentInstitutionContext?.name || sessionStorage.getItem('SCHOOL_NAME') || 'instituicao atual';

    if (!textarea.value.trim()) {
        preview.classList.add('d-none');
        preview.innerHTML = '';
        return;
    }

    preview.classList.remove('d-none');
    const allowedRoles = getAssignableRolesForCurrentInstitution().map((role) => roleLabelMap[role] || role).join(', ');
    preview.innerHTML = `
        <div><strong>Instituicao alvo:</strong> ${userEscapeHtml(institutionName)}</div>
        <div><strong>Linhas validas:</strong> ${rows.length}</div>
        <div><strong>Perfis permitidos aqui:</strong> ${userEscapeHtml(allowedRoles)}</div>
        ${errors.length ? `<div class="mt-2 text-danger"><strong>Ajustes necessarios:</strong><br>${errors.slice(0, 6).map((item) => userEscapeHtml(item)).join('<br>')}</div>` : '<div class="mt-2 text-success"><strong>CSV pronto para importacao.</strong></div>'}
    `;
}

function abrirModalImportacaoUsuarios() {
    const allowedRoles = getAssignableRolesForCurrentInstitution().map((role) => roleLabelMap[role] || role).join(', ');
    Swal.fire({
        title: 'Importacao em lote de usuarios',
        width: 880,
        showConfirmButton: false,
        showCloseButton: true,
        html:             '<div class="text-left">' +
                '<div class="alert alert-info py-2">Use um CSV com uma linha por usuario. O envio segue a mesma regra do cadastro sandbox individual e importa usuarios para a instituicao atual.</div>' +
                '<div class="bulk-import-actions mb-3">' +
                    '<button type="button" class="btn btn-outline-secondary btn-sm" id="bulkUsersDownloadTemplate">' +
                        '<i class="fas fa-download mr-1"></i> Baixar template CSV' +
                    '</button>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label for="bulkUsersFile">Arquivo CSV</label>' +
                    '<input type="file" class="form-control-file" id="bulkUsersFile" accept=".csv,text/csv">' +
                    '<small class="text-muted">Colunas esperadas: nome, email, telefone, perfil_acesso.</small>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label for="bulkUsersTextarea">Conteudo do CSV</label>' +
                    '<textarea class="form-control" id="bulkUsersTextarea" rows="10" placeholder="Cole aqui o CSV ou selecione um arquivo."></textarea>' +
                '</div>' +
                '<div class="bulk-import-hints">' +
                    '<span class="badge badge-light">Perfis aceitos aqui: ' + userEscapeHtml(allowedRoles) + '</span>' +
                '</div>' +
                '<div id="bulkUsersPreview" class="bulk-import-preview mt-3 d-none"></div>' +
                '<div class="text-right mt-3">' +
                    '<button type="button" class="btn btn-success" id="btnImportarUsuariosLoteSwal">' +
                        '<i class="fas fa-file-import mr-1"></i> Importar usuarios' +
                    '</button>' +
                '</div>' +
            '</div>',
        didOpen: () => {
            const downloadBtn = document.getElementById('bulkUsersDownloadTemplate');
            const fileInput = document.getElementById('bulkUsersFile');
            const textarea = document.getElementById('bulkUsersTextarea');
            const importBtn = document.getElementById('btnImportarUsuariosLoteSwal');
            if (downloadBtn) downloadBtn.addEventListener('click', baixarTemplateImportacaoUsuarios);
            if (fileInput) fileInput.addEventListener('change', handleBulkUsersFileSelected);
            if (textarea) textarea.addEventListener('input', renderBulkUsersPreview);
            if (importBtn) importBtn.addEventListener('click', importarUsuariosEmLote);
        }
    });
}

function baixarTemplateImportacaoUsuarios() {
    const lines = [
        BULK_USER_TEMPLATE_HEADERS.join(','),
        'Maria da Secretaria,secretaria.cef01@lab-ia.gov.br,(61) 99999-1111,Secretaria',
        'Joao da Coordenacao,coordenacao.cef01@lab-ia.gov.br,(61) 99999-2222,Coordenacao'
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_importacao_usuarios.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function importarUsuarioSandboxEmLote(row, schoolId) {
    const allowedRoles = getAssignableRolesForCurrentInstitution();
    if (!allowedRoles.includes(row.role)) {
        throw new Error('Perfil nao permitido para a instituicao atual: ' + row.originalRole + '.');
    }

    const emailNorm = normalizeEmail(row.email);
    const nome = String(row.name || '').trim();
    const phone = normalizePhoneDigits(row.phone || '');

    const { data: existingRows, error: findErr } = await window.supabaseClient
        .from('school_members')
        .select('*')
        .eq('school_id', schoolId)
        .eq('email', emailNorm)
        .limit(1);
    if (findErr) throw findErr;

    const existing = existingRows && existingRows.length ? existingRows[0] : null;

    const inviteResult = await sincronizarMembroAcesso({
        email: emailNorm,
        nome,
        role: row.role,
        school_id: schoolId,
        send_invite: false,
        previous_email: existing?.email || null,
        user_id: existing?.user_id || null,
        password: SANDBOX_DEFAULT_PASSWORD
    });

    const payload = {
        school_id: schoolId,
        name: nome,
        email: emailNorm,
        role: row.role,
        phone: phone || null,
        user_id: inviteResult?.user_id || existing?.user_id || null,
        status: 'active',
        active: true,
        invite_sent_at: null
    };

    if (existing?.id) {
        const { error } = await window.supabaseClient.from('school_members').update(payload).eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await window.supabaseClient.from('school_members').insert(payload);
        if (error) throw error;
    }

    const roleTable = getRoleProfileTable(row.role);
    if (roleTable) {
        try {
            await window.supabaseClient
                .from(roleTable)
                .upsert({
                    school_id: schoolId,
                    email: emailNorm,
                    name: nome,
                    phone: phone || null,
                    active: true
                }, { onConflict: 'school_id,email' });
        } catch (rolePhoneErr) {
            console.warn('Aviso: nao foi possivel sincronizar telefone na tabela da funcao:', rolePhoneErr?.message || rolePhoneErr);
        }
    }

    return { created: !existing?.id, email: emailNorm, role: row.role };
}

async function importarUsuariosEmLote() {
    const textarea = document.getElementById('bulkUsersTextarea');
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const parsed = parseBulkUsersCsv(textarea?.value || '');
    const rows = parsed.rows;
    const errors = parsed.errors;

    if (errors.length) {
        return Swal.fire({
            title: 'Revise o CSV',
            html: errors.slice(0, 8).map((item) => userEscapeHtml(item)).join('<br>'),
            icon: 'warning'
        });
    }
    if (!rows.length) {
        return Swal.fire('CSV vazio', 'Nenhum usuario valido foi encontrado para importacao.', 'warning');
    }

    try {
        Swal.fire({
            title: 'Importando usuarios sandbox...',
            html: 'Processando ' + rows.length + ' registro(s) na instituicao atual.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        const results = [];
        for (const row of rows) {
            try {
                const result = await importarUsuarioSandboxEmLote(row, schoolId);
                results.push({ ok: true, row, result });
            } catch (error) {
                console.error('Falha ao importar linha', row.rawLine, error);
                results.push({ ok: false, row, error: error?.message || 'Falha inesperada.' });
            }
        }

        const successCount = results.filter((item) => item.ok).length;
        const errorItems = results.filter((item) => !item.ok);
        await carregarUsuarios(schoolId);

        const summaryHtml = [
            '<div><strong>Importados/atualizados:</strong> ' + successCount + '</div>',
            '<div><strong>Com erro:</strong> ' + errorItems.length + '</div>',
            '<div><strong>Senha sandbox:</strong> ' + SANDBOX_DEFAULT_PASSWORD + '</div>'
        ];
        if (errorItems.length) {
            summaryHtml.push('<div class="mt-2 text-left"><strong>Linhas com ajuste:</strong><br>' + errorItems.slice(0, 10).map((item) => 'Linha ' + item.row.rawLine + ' (' + userEscapeHtml(item.row.email || item.row.name) + '): ' + userEscapeHtml(item.error)).join('<br>') + '</div>');
        }

        if (successCount > 0 && Swal.isVisible()) {
            Swal.close();
        }

        await Swal.fire({
            title: errorItems.length ? 'Importacao concluida com ajustes' : 'Importacao concluida',
            html: summaryHtml.join(''),
            icon: errorItems.length ? 'warning' : 'success'
        });
    } catch (error) {
        console.error('Erro na importacao em lote:', error);
        Swal.fire('Erro', error.message || 'Nao foi possivel importar os usuarios.', 'error');
    }
}

function handleBulkUsersFileSelected(event) {
    const file = event?.target?.files?.[0];
    const textarea = document.getElementById('bulkUsersTextarea');
    if (!file || !textarea) return;

    const reader = new FileReader();
    reader.onload = () => {
        textarea.value = String(reader.result || '');
        renderBulkUsersPreview();
    };
    reader.readAsText(file, 'utf-8');
}
function getMemberScopeLabel(memberScope = '') {
    return memberScopeLabelMap[String(memberScope || '').toLowerCase()] || '';
}

function userEscapeHtml(value = '') {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function userNormalizeDisplayName(name = '', email = '') {
    const fallback = String(email || '').split('@')[0] || 'Usuário';
    const source = String(name || '').trim() || fallback;
    const normalized = source
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized
        .split(' ')
        .filter(Boolean)
        .map((part, index) => {
            const lower = part.toLowerCase();
            if (index > 0 && USERS_LOWERCASE_PARTICLES.has(lower)) return lower;
            if (part.length <= 2 && part === part.toUpperCase()) return part;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

function getUserDisplayInitials(name = '', email = '') {
    const displayName = userNormalizeDisplayName(name, email);
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'US';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function getUserRoleVisual(role = '') {
    return roleVisualMap[String(role || '').toLowerCase()] || {
        label: userNormalizeDisplayName(role || 'Membro'),
        class: 'role-service',
        icon: 'fa-user'
    };
}

async function initPage() {
    const page = document.body.dataset.page;
    if (page !== 'users') return;

    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    await loadCurrentInstitutionContext(schoolId);
    syncUserRoleOptions();
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

function isPlatformSuperadmin() {
    return String(sessionStorage.getItem('PLATFORM_ROLE') || sessionStorage.getItem('EFFECTIVE_ROLE') || '').toLowerCase() === 'superadmin';
}

let currentInstitutionContext = {
    type: 'education_department',
    name: '',
    parent_school_id: null,
    parent_name: ''
};

function getCurrentEffectiveRole() {
    return String(sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('PLATFORM_ROLE') || sessionStorage.getItem('USER_ROLE') || '').trim().toLowerCase();
}

function getTargetSchoolIdForUser(user = null, fallbackSchoolId = '') {
    return String(user?.school_id || fallbackSchoolId || '').trim();
}

async function loadCurrentInstitutionContext(schoolId) {
    if (!schoolId || !window.supabaseClient) return currentInstitutionContext;
    try {
        const { data, error } = await window.supabaseClient
            .from('schools')
            .select('id, name, institution_type, parent_school_id')
            .eq('id', schoolId)
            .maybeSingle();
        if (error) throw error;

        let parentName = '';
        if (data?.parent_school_id) {
            const { data: parent, error: parentErr } = await window.supabaseClient
                .from('schools')
                .select('name')
                .eq('id', data.parent_school_id)
                .maybeSingle();
            if (parentErr) throw parentErr;
            parentName = parent?.name || '';
        }

        currentInstitutionContext = {
            type: String(data?.institution_type || 'education_department').toLowerCase(),
            name: data?.name || '',
            parent_school_id: data?.parent_school_id || null,
            parent_name: parentName
        };
    } catch (err) {
        console.warn('Nao foi possivel carregar o contexto institucional atual:', err?.message || err);
        currentInstitutionContext = {
            type: 'education_department',
            name: '',
            parent_school_id: null,
            parent_name: ''
        };
    }
    return currentInstitutionContext;
}

async function getScopedSchoolIdsForUserManagement(schoolId) {
    const baseSchoolId = String(schoolId || '').trim();
    if (!baseSchoolId || !window.supabaseClient) return [];

    if (isPlatformSuperadmin()) {
        const { data, error } = await window.supabaseClient
            .from('schools')
            .select('id');
        if (error) throw error;
        return [...new Set((data || []).map((item) => item.id).filter(Boolean))];
    }

    const effectiveRole = getCurrentEffectiveRole();
    const context = currentInstitutionContext?.name ? currentInstitutionContext : await loadCurrentInstitutionContext(baseSchoolId);
    if (effectiveRole !== 'network_manager' || String(context?.type || '').toLowerCase() === 'school_unit') {
        return [baseSchoolId];
    }

    const { data, error } = await window.supabaseClient
        .from('schools')
        .select('id')
        .eq('parent_school_id', baseSchoolId);
    if (error) throw error;

    return [...new Set([baseSchoolId, ...(data || []).map((item) => item.id).filter(Boolean)])];
}

async function fetchManagedUsersFromServer(schoolId) {
    const baseSchoolId = String(schoolId || '').trim();
    if (!baseSchoolId || typeof window.getAccessToken !== 'function') return null;

    const token = await window.getAccessToken();
    const response = await fetch('/api/users/managed', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-school-id': baseSchoolId
        }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || 'Nao foi possivel carregar os usuarios gerenciados.');
    }

    return Array.isArray(payload?.users) ? payload.users : [];
}

function getAssignableRolesForCurrentInstitution() {
    if (currentInstitutionContext.type === 'school_unit') {
        return ['content_curator', 'public_operator', 'secretariat', 'coordination', 'teacher', 'direction', 'auditor', 'observer'];
    }
    return getManageableRoles();
}
function syncUserRoleOptions() {
    const select = document.getElementById('userRole');
    if (!select) return;
    const currentValue = select.value;
    const allowedRoles = getAssignableRolesForCurrentInstitution();
    const placeholder = '<option value="">Selecione...</option>';
    select.innerHTML = placeholder + allowedRoles
        .map(role => `<option value="${role}">${roleLabelMap[role] || role}</option>`)
        .join('');

    if (allowedRoles.includes(currentValue)) {
        select.value = currentValue;
    }
}

function buildAffiliationLabel(user = {}) {
    const scope = String(user.member_scope || '').toLowerCase();
    const schoolName = userNormalizeDisplayName(user.school_name || '', '');
    const parentName = userNormalizeDisplayName(user.parent_school_name || '', '');

    if (scope === 'department_staff') {
        return 'Vínculo interno da secretaria/rede: ' + (parentName || schoolName || 'Secretaria/Rede');
    }
    if (scope === 'school_staff') {
        if (schoolName && parentName) return 'Vínculo interno da unidade escolar: ' + schoolName + ' | Secretaria: ' + parentName;
        return 'Vínculo interno da unidade escolar: ' + (schoolName || 'Unidade escolar');
    }
    if (scope === 'external_auditor') {
        return parentName ? ('Vínculo externo de auditoria para ' + parentName) : 'Vínculo externo de auditoria';
    }
    if (scope === 'external_observer') {
        return parentName ? ('Vínculo externo de observação para ' + parentName) : 'Vínculo externo de observação';
    }
    return getMemberScopeLabel(scope);
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

    // Defesa forte: garante que o profileId exista na tabela de role antes de gravar relacao.
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
            lista.innerHTML = '<tr><td colspan="5" class="text-center text-danger">SCHOOL_ID n??o encontrado na sess??o.</td></tr>';
            return;
        }
        clearRoleProfilesCache();
        try {
            const managedUsers = await fetchManagedUsersFromServer(schoolId);
            if (Array.isArray(managedUsers)) {
                usuariosCache = managedUsers
                    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
                renderizarTabela(usuariosCache);
                return;
            }
        } catch (serverError) {
            console.warn('Fallback local da gestao de usuarios acionado:', serverError?.message || serverError);
        }

        const scopedSchoolIds = await getScopedSchoolIdsForUserManagement(schoolId);

        let membersQuery = window.supabaseClient
            .from('school_members')
            .select('*');

        if (!isPlatformSuperadmin()) {
            if (scopedSchoolIds.length > 1) {
                membersQuery = membersQuery.in('school_id', scopedSchoolIds);
            } else {
                membersQuery = membersQuery.eq('school_id', schoolId);
            }
        }

        const { data: members, error: memErr } = await membersQuery;
        if (memErr) throw memErr;

        const memberSchoolIds = [...new Set((members || []).map((m) => m.school_id).filter(Boolean))];
        let schoolsById = {};
        if (memberSchoolIds.length) {
            const { data: schools, error: schoolsErr } = await window.supabaseClient
                .from('schools')
                .select('id, name, institution_type, parent_school_id')
                .in('id', memberSchoolIds);
            if (schoolsErr) throw schoolsErr;

            const parentSchoolIds = [...new Set((schools || []).map((row) => row.parent_school_id).filter(Boolean))];
            const allSchoolIds = [...new Set([...(schools || []).map((row) => row.id), ...parentSchoolIds].filter(Boolean))];
            if (allSchoolIds.length) {
                const { data: allSchools, error: allSchoolsErr } = await window.supabaseClient
                    .from('schools')
                    .select('id, name, institution_type, parent_school_id')
                    .in('id', allSchoolIds);
                if (allSchoolsErr) throw allSchoolsErr;
                schoolsById = Object.fromEntries((allSchools || []).map((row) => [row.id, row]));
            }
        }

        const memberRows = [...(members || [])].map((u) => {
            const school = schoolsById[u.school_id] || null;
            const parent = school?.parent_school_id ? schoolsById[school.parent_school_id] : null;
            return {
                ...u,
                school_name: school?.name || '',
                school_institution_type: school?.institution_type || '',
                parent_school_name: parent?.name || '',
                source_table: 'school_members'
            };
        });
        const seen = new Set(
            memberRows
                .map((m) => normalizeEmail(m.email))
                .filter(Boolean)
        );

        const roleFetches = ROLE_TABLE_CONFIG.map((cfg) => {
            let query = window.supabaseClient
                .from(cfg.table)
                .select('id, school_id, name, email, phone, active, created_at');

            if (!isPlatformSuperadmin()) {
                if (scopedSchoolIds.length > 1) {
                    query = query.in('school_id', scopedSchoolIds);
                } else {
                    query = query.eq('school_id', schoolId);
                }
            }

            return query.then((res) => ({ ...res, role: cfg.role, table: cfg.table }));
        });

        const roleResults = await Promise.all(roleFetches);
        const orphanRows = [];
        for (const res of roleResults) {
            if (res.error) throw res.error;
            const rows = res.data || [];
            for (const row of rows) {
                const emailNorm = normalizeEmail(row.email);
                if (!emailNorm || seen.has(emailNorm)) continue;
                seen.add(emailNorm);
                const school = schoolsById[row.school_id] || null;
                const parent = school?.parent_school_id ? schoolsById[school.parent_school_id] : null;
                orphanRows.push({
                    ...row,
                    role: res.role,
                    status: 'draft',
                    source_table: res.table,
                    user_id: null,
                    school_name: school?.name || '',
                    school_institution_type: school?.institution_type || '',
                    parent_school_name: parent?.name || ''
                });
            }
        }

        const todosUsuarios = [...memberRows, ...orphanRows]
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
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
        const displayRole = String(u?.display_role || '').toLowerCase();
        const status = String(u?.status || '').toLowerCase();
        const memberScope = String(u?.member_scope || '').toLowerCase();
        const schoolName = String(u?.school_name || '').toLowerCase();
        const parentSchoolName = String(u?.parent_school_name || '').toLowerCase();
        return nome.includes(q)
            || email.includes(q)
            || role.includes(q)
            || displayRole.includes(q)
            || status.includes(q)
            || memberScope.includes(q)
            || schoolName.includes(q)
            || parentSchoolName.includes(q);
    });

    renderizarTabela(filtrados);
}

function renderizarTabela(usuarios) {
    const lista = document.getElementById('lista-usuarios');
    const userCount = document.getElementById('userCount');
    const myId = sessionStorage.getItem('USER_ID');

    if (usuarios.length === 0) {
        lista.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum membro encontrado.</td></tr>';
        userCount.innerText = 'Mostrando 0 de 0 registros';
        return;
    }

    const rowsHtml = usuarios.map(user => {
        const visibleRole = String(user.display_role || user.role || '').toLowerCase();
        const config = getUserRoleVisual(visibleRole);
        const isMe = user.user_id === myId;
        const displayName = userNormalizeDisplayName(user.name, user.email);
        const displayEmail = userEscapeHtml(user.email || '-');
        const displayPhone = user.phone ? userEscapeHtml(applyPhoneMask(user.phone)) : '';
        const initials = getUserDisplayInitials(displayName, user.email);
        const memberScopeLabel = buildAffiliationLabel(user);

        let statusBadge = '';
        if (user.status === 'pending') {
            statusBadge = '<span class="badge status-pending"><i class="fas fa-clock"></i>Pendente</span>';
        } else if (user.status === 'invited') {
            statusBadge = '<span class="badge status-pending"><i class="fas fa-paper-plane"></i>Convidado</span>';
        } else {
            statusBadge = '<span class="badge status-active"><i class="fas fa-check-circle"></i>Ativo</span>';
        }

        const btnEditar = `<button class="btn btn-info btn-sm mx-1" onclick="editarUsuario('${user.id}', '${user.source_table || ''}')"><i class="fas fa-pencil-alt"></i></button>`;
        const btnExcluir = isMe ? '' : `<button class="btn btn-danger btn-sm mx-1" onclick="deletarUsuario('${user.id}')"><i class="fas fa-trash"></i></button>`;

        return `
            <tr>
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        <span class="avatar user-avatar ${config.class} mr-3">${initials}</span>
                        <div>
                            <div class="user-name-line">
                                <span class="font-weight-bold d-block user-name-text">${userEscapeHtml(displayName)}</span>
                                ${isMe ? '<small class="badge-self">VOCÊ</small>' : ''}
                            </div>
                            <small class="user-contact-line"><i class="far fa-envelope mr-1"></i>${displayEmail}</small>
                            ${displayPhone ? `<small class="user-contact-line"><i class="fas fa-phone-alt mr-1"></i>${displayPhone}</small>` : ''}
                            ${memberScopeLabel ? `<small class="user-contact-line"><i class="fas fa-link mr-1"></i>${userEscapeHtml(memberScopeLabel)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td class="align-middle">
                    <span class="badge-role ${config.class}">
                        <i class="fas ${config.icon}"></i>
                        <span>${userEscapeHtml(config.label)}</span>
                    </span>
                </td>
                <td class="text-center align-middle">${statusBadge}</td>
                <td class="text-right align-middle">
                    <div class="btn-group">
                        <button class="btn btn-success btn-sm mx-1" onclick="convidarUsuarioExistente('${user.id}')" title="Reaplicar senha padrão do sandbox"><i class="fas fa-key"></i></button>
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
    syncUserRoleOptions();
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
        return Swal.fire('Erro', 'Usuario não encontrado para edição.', 'error');
    }

    editingUserContext = user;
    syncUserRoleOptions();

    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPhone').value = applyPhoneMask(user.phone || '');
    document.getElementById('userRole').value = user.role || '';
    document.getElementById('modalUsuarioTitle').innerText = 'Editar Usuario';

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
            console.error('Erro ao carregar vínculos do usuario:', error);
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
        console.warn('Não foi possivel carregar app_pages:', err?.message || err);
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
    return ['network_manager', 'content_curator', 'public_operator', 'secretariat', 'coordination', 'teacher', 'direction', 'auditor', 'observer'];
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
        Swal.fire('Sucesso', 'Permissoes da função atualizadas.', 'success');
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', err.message || 'Não foi possivel salvar as permissões da função.', 'error');
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
    const schoolId = getTargetSchoolIdForUser(user, sessionStorage.getItem('SCHOOL_ID'));
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
    const schoolId = getTargetSchoolIdForUser(user, sessionStorage.getItem('SCHOOL_ID'));
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

async function salvarUsuario() {
    const userId = document.getElementById('userId').value;
    const nome = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = normalizePhoneDigits(document.getElementById('userPhone')?.value || '');
    const role = document.getElementById('userRole').value;
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    
    if (!nome || !email || !role) {
        return Swal.fire('Atenção', 'Preencha todos os campos obrigatórios.', 'warning');
    }

    if (!getAssignableRolesForCurrentInstitution().includes(role)) {
        return Swal.fire('Perfil nao permitido', 'Este perfil nao pode ser criado para a instituicao atual.', 'warning');
    }

    const usuarioEmEdicao = userId ? usuariosCache.find(u => String(u.id) === String(userId)) : null;
    const targetSchoolId = getTargetSchoolIdForUser(usuarioEmEdicao, schoolId);
    const previousEmail = usuarioEmEdicao?.email || null;
    const previousRole = String(usuarioEmEdicao?.role || '').toLowerCase();
    const emailNorm = normalizeEmail(email);

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
            title: usuarioEmEdicao ? 'Atualizando usuario sandbox...' : 'Criando usuario sandbox...',
            text: 'Aguarde enquanto sincronizamos o Authentication e o perfil de acesso.',
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
            school_id: targetSchoolId,
            send_invite: false,
            previous_email: previousEmail || null,
            user_id: usuarioEmEdicao?.user_id || null,
            password: SANDBOX_DEFAULT_PASSWORD
        });

        const fallbackStatus = 'active';
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
                school_id: targetSchoolId,
                name: nome,
                email: emailNorm,
                role,
                phone: phone || null,
                user_id: inviteResult?.user_id || null,
                status: fallbackStatus,
                active: true,
                invite_sent_at: null
            };
            const { data: existingRows, error: findErr } = await window.supabaseClient
                .from('school_members')
                .select('*')
                .eq('school_id', targetSchoolId)
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
            schoolId: targetSchoolId,
            role,
            email: emailNorm,
            name: nome,
            selectedSegments
        });
        // Mantem telefone tambem no perfil da funcao (quando houver tabela de role).
        const roleTable = getRoleProfileTable(role);
        if (roleTable) {
            try {
                await window.supabaseClient
                    .from(roleTable)
                    .upsert(
                        {
                            school_id: targetSchoolId,
                            email: emailNorm,
                            name: nome,
                            phone: phone || null,
                            active: true
                        },
                        { onConflict: 'school_id,email' }
                    );
            } catch (rolePhoneErr) {
                console.warn('Aviso: nao foi possivel sincronizar telefone na tabela da funcao:', rolePhoneErr?.message || rolePhoneErr);
            }
        }

        // Defesa: garante que vínculos de coordenador foram persistidos.
        // Em alguns cenarios de troca de role, triggers podem limpar relacoes no meio do fluxo.
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
                .eq('school_id', targetSchoolId)
                .eq('user_id', targetUserId);
            if (clearPermErr) throw clearPermErr;
        }

        // Se estiver editando usuario real da school_members e admin logado, salva permissões customizadas
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
                console.warn('Permissoes não salvas:', permErr?.message || permErr);
                Swal.fire('Aviso', 'Usuario salvo, mas não foi possivel salvar permissões personalizadas.', 'warning');
            }
        }

        // Se o usuario editado for o próprio usuario logado e houve troca de função, atualiza cache local.
        const currentUserId = sessionStorage.getItem('USER_ID');
        if (roleChanged && targetUserId && String(targetUserId) === String(currentUserId)) {
            sessionStorage.setItem('USER_ROLE', role);
            sessionStorage.removeItem('USER_ALLOWED_PAGES');
            if (typeof window.applyPermissions === 'function') {
                window.applyPermissions();
            }
        }

        Swal.fire('Sucesso!', 'Usuario salvo em modo sandbox. Senha padrao: ' + SANDBOX_DEFAULT_PASSWORD, 'success');
        carregarUsuarios(schoolId);
        $('#modalUsuario').modal('hide');

    } catch (error) {
        console.error('Erro ao salvar:', error);
        Swal.fire('Erro', error.message, 'error');
    }
}

async function sincronizarMembroAcesso({ email, nome, role, school_id, send_invite = false, previous_email = null, user_id = null, password = SANDBOX_DEFAULT_PASSWORD }) {
    const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
    if (sessionError) {
        throw new Error(sessionError.message || 'Falha ao validar sessão atual.');
    }

    const accessToken = sessionData?.session?.access_token || null;
    if (!accessToken) {
        throw new Error('Sessao expirada. Faca login novamente para sincronizar usuarios do sandbox.');
    }

    const payload = {
        email,
        nome,
        role,
        school_id,
        send_invite: false,
        previous_email,
        user_id,
        password
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
            window.supabaseClient?.resta.headers?.apikey ||
            null;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Não foi possivel montar fallback da Edge Function (URL/Key ausentes).');
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
            throw new Error(`Falha ao sincronizar usuario sandbox: ${msg}`);
        }

        if (json?.error) {
            throw new Error(json.error);
        }

        return json;
    }

    throw new Error(error.message || 'Falha ao invocar a Edge Function de usuarios sandbox');
}

async function deletarUsuario(id) {
    const confirm = await Swal.fire({
        title: 'Tem certeza?',
        text: "O usuario perderá acesso ao sistema.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, remover'
    });

    if (confirm.isConfirmed) {
        const user = usuariosCache.find(u => String(u.id) === String(id));
        try {
            if (!user) {
                throw new Error('Usuario não encontrado.');
            }

            const schoolId = sessionStorage.getItem('SCHOOL_ID');
            const targetSchoolId = getTargetSchoolIdForUser(user, schoolId);
            if (user.source_table === 'school_members') {
                if (user.user_id) {
                    const { error: permErr } = await window.supabaseClient
                        .from('user_page_permissions')
                        .delete()
                        .eq('school_id', targetSchoolId)
                        .eq('user_id', user.user_id);
                    if (permErr) throw permErr;
                }

                const { error } = await window.supabaseClient
                    .from('school_members')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            } else {
                // Remoção direta de registro orfao na tabela da função
                if (user.source_table === 'coordinators') {
                    const { error: slotErr } = await window.supabaseClient
                        .from('visit_slots')
                        .update({ coordinator_id: null })
                        .eq('coordinator_id', id)
                        .eq('school_id', targetSchoolId);
                    if (slotErr) throw slotErr;

                    const { error: segErr } = await window.supabaseClient
                        .from('coordinator_segments')
                        .delete()
                        .eq('coordinator_id', id)
                        .eq('school_id', targetSchoolId);
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
                    .eq('school_id', targetSchoolId);
                if (error) throw error;
            }

            Swal.fire('Removido!', 'Usuario removido.', 'success');
            carregarUsuarios(schoolId);
            
        } catch (error) {
            const msg = String(error.message || '').toLowerCase();
            if (msg.includes('foreign key')) {
                Swal.fire('Não foi possivel excluir', 'Existem vínculos deste usuario em outras tabelas. Remova os vínculos e tente novamente.', 'error');
            } else {
                Swal.fire('Não permitido', 'Não foi possivel excluir. Verifique se voce tem permissao ou se esta tentando excluir a si mesmo.', 'error');
            }
        }
    }
}

async function convidarUsuarioExistente(id) {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const user = usuariosCache.find(u => String(u.id) === String(id));
    const targetSchoolId = getTargetSchoolIdForUser(user, schoolId);

    if (!user) {
        return Swal.fire('Erro', 'Usuario não encontrado no cache da tela.', 'error');
    }

    if (!user.email) {
        return Swal.fire('Erro', 'Este usuario não possui e-mail cadastrado.', 'error');
    }

    const confirm = await Swal.fire({
        title: 'Reaplicar acesso sandbox?',
        html: `Criar ou atualizar acesso sandbox para <b>${user.name}</b><br><small>${user.email}</small><br><small>Senha padrao: ${SANDBOX_DEFAULT_PASSWORD}</small>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Reaplicar acesso' 
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.fire({
            title: 'Aplicando acesso sandbox...',
            text: 'Aguarde enquanto criamos ou atualizamos a conta sem envio de e-mail.',
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
            school_id: targetSchoolId,
            send_invite: false,
            previous_email: user.email || null,
            user_id: user.user_id || null,
            password: SANDBOX_DEFAULT_PASSWORD
        });

        await Swal.fire('Sucesso', `Acesso sandbox reaplicado para ${user.email}. Senha padrão: ${SANDBOX_DEFAULT_PASSWORD}`, 'success');
        await carregarUsuarios(schoolId);
    } catch (err) {
        console.error('Erro ao convidar usuario existente:', err);
        Swal.fire('Erro', err.message || 'Nao foi possivel reaplicar o acesso sandbox.', 'error');
    }
}

// Tornar funcoes globais para acesso via onclick
window.abrirModalUsuario = abrirModalUsuario;
window.abrirModalImportacaoUsuarios = abrirModalImportacaoUsuarios;
window.baixarTemplateImportacaoUsuarios = baixarTemplateImportacaoUsuarios;
window.importarUsuariosEmLote = importarUsuariosEmLote;
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





































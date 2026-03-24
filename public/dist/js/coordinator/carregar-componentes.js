// js/coordinator/carregar-componentes.js

async function carregarComponente(idElemento, caminhoArquivo) {
    try {
        const resposta = await fetch(caminhoArquivo);
        if (!resposta.ok) {
            throw new Error(`Erro ao buscar ${caminhoArquivo}: ${resposta.statusText}`);
        }

        const html = await resposta.text();
        const elementoAlvo = document.getElementById(idElemento);

        if (!elementoAlvo) {
            console.warn(`Aviso: elemento '${idElemento}' nao encontrado nesta pagina.`);
            return;
        }

        if (idElemento === 'component-head') {
            elementoAlvo.insertAdjacentHTML('beforeend', html);
        } else {
            elementoAlvo.innerHTML = html;
        }
    } catch (erro) {
        console.error('Falha ao carregar o componente:', erro);
    }
}

function getRoleLabel(role) {
    const map = {
        superadmin: 'Superadmin do Projeto',
        network_manager: 'Gestor de Rede',
        content_curator: 'Curadoria de Conteúdo',
        public_operator: 'Atendimento Público',
        secretariat: 'Secretaria',
        coordination: 'Coordenação',
        treasury: 'Tesouraria',
        direction: 'Direção',
        auditor: 'Auditoria e Compliance',
        observer: 'Observador Externo'
    };
    return map[String(role || '').toLowerCase()] || (role || 'Membro');
}

const headerRoleTheme = {
    superadmin: { bg: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)', accent: '#4338ca', soft: '#e0e7ff' },
    network_manager: { bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', accent: '#dc2626', soft: '#fee2e2' },
    content_curator: { bg: 'linear-gradient(135deg, #06b6d4 0%, #0f766e 100%)', accent: '#0891b2', soft: '#cffafe' },
    public_operator: { bg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', accent: '#475569', soft: '#e2e8f0' },
    secretariat: { bg: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', accent: '#0e7490', soft: '#dbeafe' },
    coordination: { bg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', accent: '#6d28d9', soft: '#ede9fe' },
    treasury: { bg: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', accent: '#16a34a', soft: '#dcfce7' },
    direction: { bg: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', accent: '#e11d48', soft: '#ffe4e6' },
    auditor: { bg: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', accent: '#1e293b', soft: '#e2e8f0' },
    observer: { bg: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)', accent: '#2563eb', soft: '#dbeafe' }
};
const lowerCaseParticles = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

function normalizeDisplayName(name = '', email = '') {
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
            if (index > 0 && lowerCaseParticles.has(lower)) return lower;
            if (part.length <= 2 && part === part.toUpperCase()) return part;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

function getInitials(name = '', email = '') {
    const clean = normalizeDisplayName(name, email);
    if (!clean) return 'US';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function getRoleTheme(role = '') {
    return headerRoleTheme[String(role || '').toLowerCase()] || headerRoleTheme.public_operator;
}

async function getCurrentUser() {
    const client = window.supabaseClient || window._supabase || null;
    if (!client?.auth) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data?.user || null;
}

function setHeaderIdentity({ name, roleLabel, email, role }) {
    const displayName = normalizeDisplayName(name, email);
    const initials = getInitials(displayName, email);
    const theme = getRoleTheme(role);

    const ids = {
        userNameNav: document.getElementById('user-name'),
        userNameHeader: document.getElementById('user-name-header'),
        userRole: document.getElementById('user-role'),
        avatarSm: document.getElementById('header-avatar'),
        avatarLg: document.getElementById('header-avatar-large'),
        avatarModal: document.getElementById('profile-modal-avatar'),
        modalName: document.getElementById('profile-modal-name'),
        modalRole: document.getElementById('profile-modal-role'),
        inputName: document.getElementById('profile-full-name'),
        inputEmail: document.getElementById('profile-email'),
        menuHeader: document.getElementById('user-menu-header')
    };

    if (ids.userNameNav) ids.userNameNav.textContent = displayName;
    if (ids.userNameHeader) ids.userNameHeader.textContent = displayName;
    if (ids.userRole) {
        ids.userRole.textContent = roleLabel;
        ids.userRole.style.color = 'rgba(255,255,255,0.92)';
        ids.userRole.style.fontWeight = '600';
    }
    if (ids.avatarSm) {
        ids.avatarSm.textContent = initials;
        ids.avatarSm.style.background = theme.bg;
        ids.avatarSm.style.color = '#ffffff';
    }
    if (ids.avatarLg) {
        ids.avatarLg.textContent = initials;
        ids.avatarLg.style.background = '#ffffff';
        ids.avatarLg.style.color = theme.accent;
        ids.avatarLg.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.2)';
    }
    if (ids.avatarModal) {
        ids.avatarModal.textContent = initials;
        ids.avatarModal.style.background = theme.soft;
        ids.avatarModal.style.color = theme.accent;
    }
    if (ids.modalName) ids.modalName.textContent = displayName;
    if (ids.modalRole) ids.modalRole.textContent = roleLabel;
    if (ids.inputName) ids.inputName.value = displayName || '';
    if (ids.inputEmail) ids.inputEmail.value = email || '';
    if (ids.menuHeader) {
        ids.menuHeader.style.background = theme.bg;
        ids.menuHeader.style.boxShadow = 'inset 0 -1px 0 rgba(255,255,255,0.12)';
    }
}

function calcPasswordStrength(password = '') {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    return Math.min(100, strength);
}

function bindPasswordUX() {
    const pass = document.getElementById('profile-new-password');
    const confirm = document.getElementById('profile-confirm-password');
    const bar = document.getElementById('profile-password-strength');
    const err = document.getElementById('profile-password-error');
    const toggle1 = document.getElementById('profile-toggle-pass-1');
    const toggle2 = document.getElementById('profile-toggle-pass-2');

    if (!pass || !confirm || !bar || !err) return;

    const refresh = () => {
        const value = pass.value || '';
        const pct = calcPasswordStrength(value);
        bar.style.width = `${pct}%`;
        bar.className = 'progress-bar';
        if (pct < 45) bar.classList.add('bg-danger');
        else if (pct < 75) bar.classList.add('bg-warning');
        else bar.classList.add('bg-success');

        if (confirm.value && value !== confirm.value) {
            err.textContent = 'As senhas nao coincidem.';
            err.classList.remove('d-none');
        } else {
            err.textContent = '';
            err.classList.add('d-none');
        }
    };

    pass.addEventListener('input', refresh);
    confirm.addEventListener('input', refresh);

    const bindToggle = (btn, input) => {
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('i');
            const textMode = input.type === 'password';
            input.type = textMode ? 'text' : 'password';
            if (icon) {
                icon.classList.toggle('fa-eye', !textMode);
                icon.classList.toggle('fa-eye-slash', textMode);
            }
        });
    };

    bindToggle(toggle1, pass);
    bindToggle(toggle2, confirm);
}

async function saveProfileName() {
    const nameInput = document.getElementById('profile-full-name');
    const btn = document.getElementById('profile-save-btn');
    const client = window.supabaseClient || window._supabase || null;

    if (!nameInput || !btn || !client?.auth) return;

    const fullName = normalizeDisplayName(nameInput.value || '', sessionStorage.getItem('USER_EMAIL') || '');
    if (!fullName) {
        Swal.fire('Atencao', 'Informe um nome valido.', 'warning');
        return;
    }

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Salvando...';

    try {
        const userId = sessionStorage.getItem('USER_ID');
        const schoolId = sessionStorage.getItem('SCHOOL_ID');

        if (client && userId && schoolId) {
            const { error: memberErr } = await client
                .from('school_members')
                .update({ name: fullName })
                .eq('user_id', userId)
                .eq('school_id', schoolId);
            if (memberErr) throw memberErr;
        }

        const { error } = await client.auth.updateUser({
            data: { full_name: fullName }
        });
        if (error) throw error;

        sessionStorage.setItem('USER_NAME', fullName);
        const currentRole = sessionStorage.getItem('USER_ROLE') || '';
        const roleLabel = getRoleLabel(currentRole);
        const email = sessionStorage.getItem('USER_EMAIL') || '';
        setHeaderIdentity({ name: fullName, roleLabel, email, role: currentRole });

        Swal.fire('Sucesso', 'Perfil atualizado.', 'success');
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', err.message || 'Falha ao atualizar perfil.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

async function changePassword() {
    const pass = document.getElementById('profile-new-password');
    const confirm = document.getElementById('profile-confirm-password');
    const err = document.getElementById('profile-password-error');
    const btn = document.getElementById('profile-change-password-btn');
    const client = window.supabaseClient || window._supabase || null;

    if (!pass || !confirm || !err || !btn || !client?.auth) return;

    const p1 = pass.value || '';
    const p2 = confirm.value || '';

    if (p1.length < 8) {
        err.textContent = 'A senha deve ter no m?nimo 8 caracteres.';
        err.classList.remove('d-none');
        return;
    }
    if (p1 !== p2) {
        err.textContent = 'As senhas nao coincidem.';
        err.classList.remove('d-none');
        return;
    }

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Alterando...';

    try {
        const { error } = await client.auth.updateUser({ password: p1 });
        if (error) throw error;

        pass.value = '';
        confirm.value = '';
        err.textContent = '';
        err.classList.add('d-none');

        const bar = document.getElementById('profile-password-strength');
        if (bar) {
            bar.style.width = '0%';
            bar.className = 'progress-bar';
        }

        Swal.fire('Sucesso', 'Senha alterada com sucesso.', 'success');
    } catch (errUpdate) {
        console.error(errUpdate);
        Swal.fire('Erro', errUpdate.message || 'Nao foi possivel alterar a senha.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

async function initHeaderProfile(sessionContext = null) {
    const modal = document.getElementById('modalProfileHeader');
    if (!modal) return;

    const user = await getCurrentUser();
    const client = window.supabaseClient || window._supabase || null;
    const storedRole = sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('USER_ROLE') || '';
    const storedName = sessionStorage.getItem('USER_NAME') || '';
    const storedEmail = sessionStorage.getItem('USER_EMAIL') || '';

    let role = sessionContext?.effective_role || sessionContext?.platform_role || storedRole;
    let memberName = sessionContext?.memberName || storedName || '';
    let memberEmail = sessionContext?.memberEmail || storedEmail || '';

    const needsRemoteLookup = !role || !memberName || !memberEmail;

    if (needsRemoteLookup && client && user?.id) {
        try {
            const schoolId = sessionStorage.getItem('SCHOOL_ID');
            const userEmail = String(user.email || storedEmail || '').trim().toLowerCase();
            const { data, error } = await client
                .from('school_members')
                .select('role, name, email')
                .eq('user_id', user.id)
                .eq('school_id', schoolId)
                .maybeSingle();

            if (!error && data) {
                role = data.role || role;
                memberName = data.name || memberName;
                memberEmail = data.email || memberEmail;
            } else if (userEmail) {
                const { data: platformData, error: platformError } = await client
                    .from('platform_members')
                    .select('role, name, email, active')
                    .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
                    .eq('active', true)
                    .maybeSingle();
                if (!platformError && platformData) {
                    role = platformData.role || role;
                    memberName = platformData.name || memberName;
                    memberEmail = platformData.email || memberEmail;
                }
            }
        } catch (e) {
            console.warn('Nao foi possivel carregar identidade do usuario no header:', e?.message || e);
        }
    }

    const email = memberEmail || user?.email || storedEmail || '';
    const name = normalizeDisplayName(memberName || storedName || user?.user_metadata?.full_name || user?.user_metadata?.name || '', email);
    const effectiveRole = role || storedRole;
    const roleLabel = getRoleLabel(effectiveRole);

    sessionStorage.setItem('USER_NAME', name);
    if (email) sessionStorage.setItem('USER_EMAIL', email);
    if (effectiveRole) {
        sessionStorage.setItem('USER_ROLE', effectiveRole);
        sessionStorage.setItem('EFFECTIVE_ROLE', effectiveRole);
    }

    setHeaderIdentity({ name, roleLabel, email, role: effectiveRole });

    bindPasswordUX();

    const saveBtn = document.getElementById('profile-save-btn');
    const passBtn = document.getElementById('profile-change-password-btn');

    if (saveBtn && saveBtn.dataset.bound !== '1') {
        saveBtn.dataset.bound = '1';
        saveBtn.addEventListener('click', saveProfileName);
    }

    if (passBtn && passBtn.dataset.bound !== '1') {
        passBtn.dataset.bound = '1';
        passBtn.addEventListener('click', changePassword);
    }

    if (typeof $ === 'function') {
        $('#modalProfileHeader').on('hidden.bs.modal', () => {
            const pass = document.getElementById('profile-new-password');
            const confirm = document.getElementById('profile-confirm-password');
            const err = document.getElementById('profile-password-error');
            if (pass) pass.value = '';
            if (confirm) confirm.value = '';
            if (err) {
                err.textContent = '';
                err.classList.add('d-none');
            }
            const bar = document.getElementById('profile-password-strength');
            if (bar) {
                bar.style.width = '0%';
                bar.className = 'progress-bar';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    let sessionContext = null;
    await Promise.all([
        carregarComponente('component-head', 'components/head.html'),
        carregarComponente('component-header', 'components/header.html'),
        carregarComponente('component-sidebar', 'components/sidebar.html'),
        carregarComponente('component-footer', 'components/footer.html')
    ]);

    // Garante sessao antes de aplicar permissoes (evita "Acesso negado" por USER_ROLE vazio)
    if (typeof initSession === 'function') {
        try {
            sessionContext = await initSession();
            window.__sessionContext = sessionContext || null;
        } catch (e) {
            console.warn('Falha ao inicializar sessao antes das permissoes:', e?.message || e);
        }
    }

    await initHeaderProfile(sessionContext || window.__sessionContext || null);

    if (typeof window.applyPermissions === 'function') {
        window.applyPermissions();
    }

    document.body.style.opacity = '1';
});











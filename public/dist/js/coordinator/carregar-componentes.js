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
    return map[String(role || '').toLowerCase()] || (role || 'Membro');
}

function getInitials(name = '') {
    const clean = String(name || '').trim();
    if (!clean) return 'US';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

async function getCurrentUser() {
    const client = window.supabaseClient || window._supabase || null;
    if (!client?.auth) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data?.user || null;
}

function setHeaderIdentity({ name, roleLabel, email }) {
    const initials = getInitials(name);

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
        inputEmail: document.getElementById('profile-email')
    };

    if (ids.userNameNav) ids.userNameNav.textContent = name;
    if (ids.userNameHeader) ids.userNameHeader.textContent = name;
    if (ids.userRole) ids.userRole.textContent = roleLabel;
    if (ids.avatarSm) ids.avatarSm.textContent = initials;
    if (ids.avatarLg) ids.avatarLg.textContent = initials;
    if (ids.avatarModal) ids.avatarModal.textContent = initials;
    if (ids.modalName) ids.modalName.textContent = name;
    if (ids.modalRole) ids.modalRole.textContent = roleLabel;
    if (ids.inputName) ids.inputName.value = name || '';
    if (ids.inputEmail) ids.inputEmail.value = email || '';
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

    const fullName = String(nameInput.value || '').trim();
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
        const roleLabel = getRoleLabel(sessionStorage.getItem('USER_ROLE'));
        const email = sessionStorage.getItem('USER_EMAIL') || '';
        setHeaderIdentity({ name: fullName, roleLabel, email });

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
        err.textContent = 'A senha deve ter no minimo 8 caracteres.';
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

async function initHeaderProfile() {
    const modal = document.getElementById('modalProfileHeader');
    if (!modal) return;

    const user = await getCurrentUser();
    const client = window.supabaseClient || window._supabase || null;

    let role = sessionStorage.getItem('USER_ROLE') || '';
    let memberName = '';
    let memberEmail = '';

    if (client && user?.id) {
        try {
            const schoolId = sessionStorage.getItem('SCHOOL_ID');
            const { data, error } = await client
                .from('school_members')
                .select('role, name, email')
                .eq('user_id', user.id)
                .eq('school_id', schoolId)
                .maybeSingle();
            if (!error && data) {
                if (data.role) {
                    role = data.role;
                    sessionStorage.setItem('USER_ROLE', role);
                }
                memberName = data.name || '';
                memberEmail = data.email || '';
            }
        } catch (e) {
            console.warn('Nao foi possivel carregar role do usuario no header:', e?.message || e);
        }
    }

    const storedName = sessionStorage.getItem('USER_NAME') || '';
    const email = memberEmail || user?.email || sessionStorage.getItem('USER_EMAIL') || '';
    const name = memberName || storedName || user?.user_metadata?.full_name || (email ? email.split('@')[0] : 'Usuário');
    const roleLabel = getRoleLabel(role);

    sessionStorage.setItem('USER_NAME', name);
    if (email) sessionStorage.setItem('USER_EMAIL', email);

    setHeaderIdentity({ name, roleLabel, email });

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
    await Promise.all([
        carregarComponente('component-head', 'components/head.html'),
        carregarComponente('component-header', 'components/header.html'),
        carregarComponente('component-sidebar', 'components/sidebar.html'),
        carregarComponente('component-footer', 'components/footer.html')
    ]);

    // Garante sessao antes de aplicar permissoes (evita "Acesso negado" por USER_ROLE vazio)
    if (typeof initSession === 'function') {
        try {
            await initSession();
        } catch (e) {
            console.warn('Falha ao inicializar sessao antes das permissoes:', e?.message || e);
        }
    }

    await initHeaderProfile();

    if (typeof window.applyPermissions === 'function') {
        window.applyPermissions();
    }

    document.body.style.opacity = '1';
});

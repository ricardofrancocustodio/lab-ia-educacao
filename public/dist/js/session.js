// session.js
let _initSessionPromise = null;

const ROLE_LANDING_PAGE = {
  superadmin: '/dashboard',
  network_manager: '/dashboard',
  content_curator: '/dashboard',
  public_operator: '/atendimento',
  secretariat: '/comunicados',
  coordination: '/dashboard',
  teacher: '/curadoria-conteudo',
  direction: '/dashboard',
  auditor: '/dashboard',
  observer: '/comunicados'
};

async function initSession() {
  // Prevent concurrent/duplicate calls from racing each other
  if (_initSessionPromise) return _initSessionPromise;
  _initSessionPromise = _doInitSession();
  try {
    return await _initSessionPromise;
  } catch (e) {
    _initSessionPromise = null;
    throw e;
  }
}

async function _doInitSession() {
  const client = window.supabaseClient || window._supabase || null;
  if (!client) {
    throw new Error('supabase_client_unavailable');
  }

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  const userEmail = String(user.email || '').trim().toLowerCase();

  const { data: platformMember } = await client
    .from('platform_members')
    .select('role, name, email, active')
    .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
    .eq('active', true)
    .maybeSingle();

  let { data: membro, error } = await client
    .from('school_members')
    .select('school_id, role, name, email, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if ((!membro || error) && userEmail) {
    const fallback = await client
      .from('school_members')
      .select('school_id, role, name, email, active')
      .eq('email', userEmail)
      .eq('active', true)
      .maybeSingle();
    membro = fallback.data || null;
    error = fallback.error || null;
  }

  if ((!membro || error) && ['superadmin', 'auditor'].includes(platformMember?.role)) {
    const firstSchool = await client
      .from('schools')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    membro = {
      school_id: firstSchool.data?.id || '',
      role: platformMember.role,
      name: platformMember.name,
      email: platformMember.email,
      active: true
    };
  }

  if (!membro || error) {
    Swal.fire('Erro', 'Usuario sem vinculo com contexto de acesso', 'error');
    return null;
  }

  const effectiveRole = platformMember?.role || membro.role;
  const effectiveName = membro.name || platformMember?.name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario');
  const effectiveEmail = membro.email || platformMember?.email || user.email || '';

  sessionStorage.setItem('SCHOOL_ID', membro.school_id || '');
  sessionStorage.setItem('USER_ROLE', effectiveRole || membro.role || '');
  sessionStorage.setItem('PLATFORM_ROLE', platformMember?.role || '');
  sessionStorage.setItem('USER_ID', user.id);
  sessionStorage.setItem('USER_EMAIL', effectiveEmail);
  sessionStorage.setItem('USER_NAME', effectiveName);
  sessionStorage.setItem('EFFECTIVE_ROLE', effectiveRole || '');

  return { ...membro, platform_role: platformMember?.role || null, effective_role: effectiveRole };
}

async function getAccessToken() {
  const client = window.supabaseClient || window._supabase || null;
  if (!client) {
    throw new Error('supabase_client_unavailable');
  }

  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }

  const token = String(session?.access_token || '').trim();
  if (!token) {
    throw new Error('access_token_unavailable');
  }

  return token;
}

async function fazerLogout() {
  const client = window.supabaseClient || window._supabase || null;

  try {
    if (client) {
      await client.auth.signOut();
    }
  } catch (error) {
    console.warn('Logout falhou, prosseguindo com limpeza local', error);
  } finally {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login';
  }
}

function confirmLogout(event) {
  if (event && event.preventDefault) event.preventDefault();

  Swal.fire({
    title: 'Confirmar saída',
    text: 'Deseja encerrar a sessão e voltar para a tela de login?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, sair',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      fazerLogout();
    }
  });
}

async function signInWithEmail(email, password) {
  const client = window.supabaseClient || window._supabase || null;
  if (!client) {
    throw new Error('supabase_client_unavailable');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error) throw error;
  return data;
}

function getPostLoginRedirectPath(role) {
  const normalizedRole = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ROLE_LANDING_PAGE[normalizedRole] || '/comunicados';
}

window.confirmLogout = confirmLogout;
window.signInWithEmail = signInWithEmail;
window.initSession = initSession;
window.getPostLoginRedirectPath = getPostLoginRedirectPath;



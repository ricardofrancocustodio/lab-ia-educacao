// session.js
async function initSession() {
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

  if ((!membro || error) && platformMember?.role === 'superadmin') {
    const firstSchool = await client
      .from('schools')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    membro = {
      school_id: firstSchool.data?.id || '',
      role: 'superadmin',
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

function fazerLogout() {
  const client = window.supabaseClient || window._supabase || null;
  if (!client) {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  client.auth.signOut().finally(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login';
  });
}

window.initSession = initSession;
window.getAccessToken = getAccessToken;
window.fazerLogout = fazerLogout;



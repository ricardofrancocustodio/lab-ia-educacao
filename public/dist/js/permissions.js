const DEFAULT_ROLE_PAGES = {
  superadmin: ['dashboard', 'chat-manager', 'reports', 'audit', 'knowledge', 'preferences', 'users'],
  network_manager: ['dashboard', 'chat-manager', 'reports', 'audit', 'knowledge', 'preferences', 'users'],
  content_curator: ['dashboard', 'reports', 'audit', 'knowledge'],
  public_operator: ['dashboard', 'chat-manager', 'reports', 'knowledge'],
  secretariat: ['dashboard', 'chat-manager', 'knowledge'],
  coordination: ['dashboard', 'chat-manager', 'reports', 'knowledge'],
  treasury: ['dashboard', 'chat-manager', 'reports', 'audit', 'knowledge'],
  direction: ['dashboard', 'chat-manager', 'reports', 'audit', 'knowledge'],
  auditor: ['dashboard', 'reports', 'audit'],
  observer: ['dashboard', 'reports', 'knowledge']
};

window.DEFAULT_ROLE_PAGES = DEFAULT_ROLE_PAGES;

function fallbackAllowedPages(role) {
  const roleNorm = String(role || '').trim().toLowerCase();
  return DEFAULT_ROLE_PAGES[roleNorm] || [];
}

async function fetchRoleAllowedPages(schoolId, role) {
  const supabase = window.supabaseClient || window._supabase;
  const roleNorm = String(role || '').trim().toLowerCase();
  if (!supabase || !schoolId || !roleNorm) {
    return fallbackAllowedPages(role);
  }

  const { data, error } = await supabase
    .from('role_page_permissions')
    .select('page_key, allowed')
    .eq('school_id', schoolId)
    .eq('role', roleNorm);

  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return fallbackAllowedPages(role);
  return rows.filter(r => r.allowed === true).map(r => r.page_key);
}

async function fetchUserOverrides(schoolId, userId) {
  const supabase = window.supabaseClient || window._supabase;
  if (!supabase || !schoolId || !userId) return [];

  const { data, error } = await supabase
    .from('user_page_permissions')
    .select('page_key, allowed')
    .eq('school_id', schoolId)
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

function resolveEffectivePages(roleAllowed, userOverrides) {
  if (!Array.isArray(userOverrides) || userOverrides.length === 0) return [...(roleAllowed || [])];
  const overrideMap = new Map(userOverrides.map(r => [r.page_key, !!r.allowed]));
  const keys = new Set([...(roleAllowed || []), ...overrideMap.keys()]);
  return [...keys].filter(k => overrideMap.has(k) ? overrideMap.get(k) : (roleAllowed || []).includes(k));
}

function applyMenuVisibility(allowedPages) {
  document.querySelectorAll('[data-menu]').forEach(el => {
    const menuKey = (el.dataset.menu || '').trim();
    if (!menuKey) return;
    el.style.display = allowedPages.includes(menuKey) ? '' : 'none';
  });
}

async function computeAndApplyPermissions() {
  const platformRole = sessionStorage.getItem('PLATFORM_ROLE');
  const role = platformRole || sessionStorage.getItem('USER_ROLE');
  const page = document.body.dataset.page;
  const schoolId = sessionStorage.getItem('SCHOOL_ID');
  const userId = sessionStorage.getItem('USER_ID');
  let effective = fallbackAllowedPages(role);

  try {
    if (platformRole === 'superadmin') {
      effective = fallbackAllowedPages('superadmin');
    } else if (window.supabaseClient && schoolId && role) {
      const [roleAllowed, userOverrides] = await Promise.all([
        fetchRoleAllowedPages(schoolId, role),
        fetchUserOverrides(schoolId, userId)
      ]);
      effective = resolveEffectivePages(roleAllowed, userOverrides);
    }
  } catch (err) {
    console.warn('Permissoes dinamicas indisponiveis, usando fallback local:', err?.message || err);
  }

  applyMenuVisibility(effective);

  if (page && !effective.includes(page)) {
    window.location.href = '/';
  }
}

function applyPermissions() {
  void computeAndApplyPermissions();
}

window.applyPermissions = applyPermissions;
window.fetchRoleAllowedPages = fetchRoleAllowedPages;
window.fetchUserOverrides = fetchUserOverrides;
window.resolveEffectivePages = resolveEffectivePages;

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PAGE_DEFINITIONS = [
  { key: 'dashboard', label: 'Dashboard de Inteligencia', menu_order: 10 },
  { key: 'chat-manager', label: 'Atendimento', menu_order: 20 },
  { key: 'handoff-queue', label: 'Fila Humana', menu_order: 22 },
  { key: 'notices', label: 'Mural de Comunicados', menu_order: 25 },
  { key: 'reports', label: 'Relatorios', menu_order: 30 },
  { key: 'audit', label: 'Auditoria Formal', menu_order: 35 },
  { key: 'incidents', label: 'Painel de Incidentes', menu_order: 40 },
  { key: 'feedback', label: 'Feedback da IA', menu_order: 42 },
  { key: 'corrections', label: 'Correcoes', menu_order: 43 },
  { key: 'improvement-cycle', label: 'Ciclo de Melhoria', menu_order: 44 },
  { key: 'notifications', label: 'Notificacoes', menu_order: 45 },
  { key: 'knowledge-gaps', label: 'Lacunas de Conhecimento', menu_order: 50 },
  { key: 'network-overview', label: 'Visao da Rede', menu_order: 55 },
  { key: 'users', label: 'Usuarios', menu_order: 60 },
  { key: 'preferences', label: 'Preferencias', menu_order: 70 },
  { key: 'knowledge', label: 'Base de Conhecimento', menu_order: 80 },
  { key: 'teaching-content', label: 'Curadoria Pedagogica', menu_order: 85 },
  { key: 'teacher-governance', label: 'Governanca Pedagogica', menu_order: 86 },
  { key: 'official-content', label: 'Conteudo Oficial', menu_order: 90 }
];

const ROLE_PAGE_MAP = {
  superadmin: ['dashboard', 'chat-manager', 'handoff-queue', 'notices', 'reports', 'audit', 'incidents', 'feedback', 'corrections', 'improvement-cycle', 'notifications', 'knowledge-gaps', 'network-overview', 'knowledge', 'official-content', 'preferences', 'users', 'teacher-governance'],
  network_manager: ['dashboard', 'chat-manager', 'handoff-queue', 'notices', 'reports', 'audit', 'incidents', 'feedback', 'corrections', 'improvement-cycle', 'notifications', 'knowledge-gaps', 'network-overview', 'knowledge', 'official-content', 'teaching-content', 'preferences', 'users', 'teacher-governance'],
  content_curator: ['dashboard', 'notices', 'reports', 'audit', 'incidents', 'feedback', 'corrections', 'improvement-cycle', 'knowledge-gaps', 'knowledge', 'official-content', 'teaching-content', 'teacher-governance'],
  public_operator: ['dashboard', 'chat-manager', 'handoff-queue', 'notices', 'reports', 'incidents', 'feedback', 'corrections', 'knowledge'],
  secretariat: ['dashboard', 'chat-manager', 'handoff-queue', 'notices', 'notifications', 'knowledge-gaps', 'knowledge', 'official-content'],
  coordination: ['dashboard', 'chat-manager', 'handoff-queue', 'notices', 'notifications', 'reports', 'incidents', 'knowledge', 'teaching-content', 'teacher-governance'],
  teacher: ['notices', 'notifications', 'teaching-content', 'teacher-governance'],
  direction: ['dashboard', 'chat-manager', 'handoff-queue', 'notices', 'reports', 'audit', 'incidents', 'feedback', 'corrections', 'improvement-cycle', 'notifications', 'knowledge-gaps', 'network-overview', 'knowledge', 'official-content', 'teaching-content', 'teacher-governance'],
  auditor: ['dashboard', 'reports', 'audit', 'incidents', 'feedback', 'corrections', 'improvement-cycle', 'notifications', 'network-overview'],
  observer: ['dashboard', 'notices', 'reports', 'knowledge']
};

async function syncAppPages() {
  const payload = PAGE_DEFINITIONS.map((page) => ({ ...page, active: true }));
  const { error } = await supabase.from('app_pages').upsert(payload, { onConflict: 'key' });
  if (error) throw error;
  return payload.length;
}

async function syncRolePagePermissions() {
  const { data: schools, error: schoolsError } = await supabase.from('schools').select('id, name');
  if (schoolsError) throw schoolsError;

  const { data: existing, error: existingError } = await supabase
    .from('role_page_permissions')
    .select('school_id, role, page_key, allowed');
  if (existingError) throw existingError;

  const existingAllowed = new Set(
    (existing || [])
      .filter((row) => row.allowed === true)
      .map((row) => `${row.school_id}|${row.role}|${row.page_key}`)
  );

  const missingRows = [];
  for (const school of schools || []) {
    for (const [role, pages] of Object.entries(ROLE_PAGE_MAP)) {
      for (const pageKey of pages) {
        const key = `${school.id}|${role}|${pageKey}`;
        if (!existingAllowed.has(key)) {
          missingRows.push({
            school_id: school.id,
            role,
            page_key: pageKey,
            allowed: true
          });
        }
      }
    }
  }

  if (!missingRows.length) return 0;

  const chunkSize = 500;
  for (let i = 0; i < missingRows.length; i += chunkSize) {
    const batch = missingRows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('role_page_permissions')
      .upsert(batch, { onConflict: 'school_id,role,page_key' });
    if (error) throw error;
  }

  return missingRows.length;
}

async function run() {
  console.log('=== Sincronizacao de acessos ===');
  const pageCount = await syncAppPages();
  const permissionCount = await syncRolePagePermissions();
  console.log(`Paginas sincronizadas: ${pageCount}`);
  console.log(`Permissoes inseridas/atualizadas: ${permissionCount}`);
}

run().catch((error) => {
  console.error('Falha ao sincronizar acessos:', error.message || error);
  process.exit(1);
});
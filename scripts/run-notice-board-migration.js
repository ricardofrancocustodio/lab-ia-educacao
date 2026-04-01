/**
 * Executa a migration do Mural de Comunicados:
 * 1. Registra a pagina 'notices' na tabela app_pages
 * 2. Insere permissoes por perfil em role_page_permissions para todas as escolas existentes
 *
 * Uso: node scripts/run-notice-board-migration.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Mapeamento: quais perfis tem acesso a pagina 'notices'
const NOTICE_ROLES = [
  'network_manager',
  'content_curator',
  'public_operator',
  'secretariat',
  'coordination',
  'direction',
  'observer'
];

async function run() {
  console.log('=== Migration: Mural de Comunicados ===\n');

  // 1. Registrar pagina em app_pages
  console.log('1. Registrando pagina "notices" em app_pages...');
  const { data: pageData, error: pageError } = await supabase
    .from('app_pages')
    .upsert(
      { key: 'notices', label: 'Mural de Comunicados', menu_order: 25, active: true },
      { onConflict: 'key' }
    )
    .select();

  if (pageError) {
    console.error('   ERRO ao registrar pagina:', pageError.message);
    process.exit(1);
  }
  console.log('   OK - pagina registrada:', pageData?.[0]?.key || 'notices');

  // 2. Buscar todas as escolas
  console.log('\n2. Buscando escolas existentes...');
  const { data: schools, error: schoolsError } = await supabase
    .from('schools')
    .select('id, name');

  if (schoolsError) {
    console.error('   ERRO ao buscar escolas:', schoolsError.message);
    process.exit(1);
  }
  console.log(`   Encontradas ${schools.length} escola(s)`);

  // 3. Inserir permissoes para cada escola
  console.log('\n3. Inserindo permissoes por perfil para cada escola...');
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const school of schools) {
    const rows = NOTICE_ROLES.map(role => ({
      school_id: school.id,
      role,
      page_key: 'notices',
      allowed: true
    }));

    const { data: permData, error: permError } = await supabase
      .from('role_page_permissions')
      .upsert(rows, { onConflict: 'school_id,role,page_key' })
      .select();

    if (permError) {
      console.error(`   ERRO na escola "${school.name}" (${school.id}):`, permError.message);
      totalSkipped += rows.length;
      continue;
    }

    const inserted = permData?.length || 0;
    totalInserted += inserted;
    console.log(`   ${school.name}: ${inserted} permissoes registradas`);
  }

  console.log(`\n=== Concluido ===`);
  console.log(`   Permissoes inseridas/atualizadas: ${totalInserted}`);
  if (totalSkipped) console.log(`   Permissoes com erro: ${totalSkipped}`);
  console.log('\nNOTA: Para escolas FUTURAS, execute o snippet SQL');
  console.log('supabase/snippets/notice_board_page_permissions.sql');
  console.log('no SQL Editor do Supabase para atualizar a funcao seed_default_role_page_permissions.\n');
}

run().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});

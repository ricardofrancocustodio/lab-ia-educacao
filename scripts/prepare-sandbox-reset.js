const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const PAGE_SIZE = 500;
const DEFAULT_BACKUP_DIR = path.resolve(__dirname, '../tmp/sandbox-prep-backups');

const PRESERVE_TABLES = [
  'schools',
  'platform_members',
  'school_members',
  'app_pages',
  'role_page_permissions',
  'user_page_permissions',
  'ai_provider_settings',
  'source_documents',
  'knowledge_source_versions',
  'knowledge_base',
  'official_content_records',
  'faq_items',
  'faq_versions',
  'notification_system_settings',
  'user_notification_settings'
];

const PURGE_TABLES = [
  { name: 'notification_queue_deliveries', orderBy: 'sent_at' },
  { name: 'notification_queue', orderBy: 'created_at' },
  { name: 'notice_attachments', orderBy: 'created_at' },
  { name: 'notices', orderBy: 'created_at' },
  { name: 'faq_ai_test_results', orderBy: 'test_date' },
  { name: 'faq_audit_log', orderBy: 'created_at' },
  { name: 'faq_conflicts', orderBy: 'created_at' },
  { name: 'correction_kb_changes', orderBy: 'applied_at' },
  { name: 'response_corrections', orderBy: 'submitted_at' },
  { name: 'interaction_feedback', orderBy: 'created_at' },
  { name: 'incident_reports', orderBy: 'opened_at' },
  { name: 'interaction_source_evidence', orderBy: 'created_at' },
  { name: 'assistant_responses', orderBy: 'created_at' },
  { name: 'consultation_messages', orderBy: 'created_at' },
  { name: 'formal_audit_events', orderBy: 'created_at' },
  { name: 'intelligence_snapshots', orderBy: 'snapshot_date' },
  { name: 'institutional_consultations', orderBy: 'opened_at' }
];

function parseArgs(argv = []) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function ensureSupabaseClient() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_KEY ausentes no .env.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function buildBackupPath(baseDir, schoolId) {
  const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
  return path.join(baseDir, `sandbox-reset-${schoolId}-${timestamp}.json`);
}

async function fetchTableRows(supabase, tableConfig, schoolId) {
  const rows = [];
  let from = 0;

  for (;;) {
    let query = supabase
      .from(tableConfig.name)
      .select('*')
      .eq('school_id', schoolId)
      .range(from, from + PAGE_SIZE - 1);

    if (tableConfig.orderBy) {
      query = query.order(tableConfig.orderBy, { ascending: true, nullsFirst: true });
    } else {
      query = query.order('id', { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      if (error.message && error.message.includes('schema cache')) {
        return null;
      }
      throw new Error(`Falha ao consultar ${tableConfig.name}: ${error.message}`);
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchCounts(supabase, schoolId) {
  const counts = {};
  for (const tableConfig of PURGE_TABLES) {
    const rows = await fetchTableRows(supabase, tableConfig, schoolId);
    counts[tableConfig.name] = Array.isArray(rows) ? rows.length : null;
  }
  return counts;
}

async function verifySchoolExists(supabase, schoolId) {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, slug')
    .eq('id', schoolId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao validar escola: ${error.message}`);
  if (!data?.id) throw new Error(`Escola ${schoolId} nao encontrada.`);
  return data;
}

async function backupRows(supabase, school, schoolId, backupFilePath) {
  const payload = {
    generated_at: new Date().toISOString(),
    school: school || null,
    purge_tables: {},
    preserve_tables: PRESERVE_TABLES
  };

  for (const tableConfig of PURGE_TABLES) {
    const rows = await fetchTableRows(supabase, tableConfig, schoolId);
    payload.purge_tables[tableConfig.name] = Array.isArray(rows) ? rows : { skipped: true, reason: 'table_not_available' };
  }

  fs.mkdirSync(path.dirname(backupFilePath), { recursive: true });
  fs.writeFileSync(backupFilePath, JSON.stringify(payload, null, 2), 'utf8');
  return backupFilePath;
}

async function purgeRows(supabase, schoolId) {
  const results = [];
  for (const tableConfig of PURGE_TABLES) {
    const rows = await fetchTableRows(supabase, tableConfig, schoolId);
    if (rows === null) {
      results.push({ table: tableConfig.name, skipped: true, reason: 'table_not_available' });
      continue;
    }

    const { error } = await supabase
      .from(tableConfig.name)
      .delete()
      .eq('school_id', schoolId);

    if (error) {
      throw new Error(`Falha ao limpar ${tableConfig.name}: ${error.message}`);
    }

    results.push({ table: tableConfig.name, skipped: false });
  }
  return results;
}

function printCounts(title, counts) {
  console.log(`\n${title}`);
  for (const tableConfig of PURGE_TABLES) {
    const count = counts[tableConfig.name];
    console.log(`- ${tableConfig.name}: ${count === null ? 'nao instalada' : count}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);
  const schoolId = String(args['school-id'] || process.env.SCHOOL_ID || '').trim();
  const backupDir = path.resolve(process.cwd(), String(args['backup-dir'] || DEFAULT_BACKUP_DIR));

  if (!schoolId) {
    throw new Error('Informe --school-id ou configure SCHOOL_ID no .env.');
  }

  const supabase = ensureSupabaseClient();
  const school = await verifySchoolExists(supabase, schoolId);
  const beforeCounts = await fetchCounts(supabase, schoolId);

  console.log(`Escola alvo: ${school.name} (${school.id})`);
  console.log(`Slug: ${school.slug}`);
  console.log(`Modo: ${dryRun ? 'dry-run' : 'execucao real'}`);
  console.log(`Tabelas preservadas: ${PRESERVE_TABLES.join(', ')}`);
  printCounts('Registros operacionais atuais', beforeCounts);

  if (dryRun) {
    console.log('\nNenhuma alteracao foi aplicada.');
    return;
  }

  const backupFilePath = buildBackupPath(backupDir, schoolId);
  await backupRows(supabase, school, schoolId, backupFilePath);
  console.log(`\nBackup salvo em: ${backupFilePath}`);

  await purgeRows(supabase, schoolId);
  const afterCounts = await fetchCounts(supabase, schoolId);
  printCounts('Registros operacionais apos limpeza', afterCounts);

  const remaining = Object.values(afterCounts).reduce((sum, count) => sum + Number(count || 0), 0);
  console.log(`\nTotal restante nas tabelas operacionais: ${remaining}`);
  if (remaining > 0) {
    console.log('Alguns registros permaneceram. Revise o backup e as tabelas com contagem diferente de zero.');
  } else {
    console.log('Limpeza concluida com sucesso.');
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
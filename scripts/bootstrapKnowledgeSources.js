const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { supabase } = require('../.qodo/services/supabase.js');

const DEFAULT_TITLE = 'Base FAQ Institucional';
const DEFAULT_DOCUMENT_TYPE = 'faq_seed';
const DEFAULT_OWNING_AREA = 'public.assistant';
const DEFAULT_VERSION_LABEL = 'seed-v1';

function parseArgs(argv = []) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function printUsage() {
  console.log([
    'Uso:',
    '  npm run bootstrap:knowledge -- --file <caminho-json> [--title "Base FAQ"] [--document-type faq_seed] [--owning-area public.assistant] [--version-label seed-v1] [--school-id <uuid>]',
    '',
    'Exemplo:',
    '  npm run bootstrap:knowledge -- --file scripts/knowledge-seed.example.json --title "FAQ Institucional 2026"'
  ].join('\n'));
}

function loadJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return {
    absolutePath,
    data: JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  };
}

function normalizeEntry(entry = {}) {
  const question = String(entry.question || entry.q || '').trim();
  const answer = String(entry.answer || entry.a || '').trim();
  if (!question || !answer) return null;

  return {
    question,
    answer,
    keywords: Array.isArray(entry.keywords)
      ? entry.keywords.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    category: String(entry.category || 'Institucional').trim() || 'Institucional'
  };
}

function buildRawText(entries = []) {
  return entries
    .map((entry, index) => `${index + 1}. Pergunta: ${entry.question}\nResposta: ${entry.answer}`)
    .join('\n\n');
}

async function ensureSourceDocument({ schoolId, title, documentType, owningArea, canonicalReference }) {
  const { data: existing, error: existingError } = await supabase
    .from('source_documents')
    .select('id, title')
    .eq('school_id', schoolId)
    .eq('title', title)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing;

  const { data, error } = await supabase
    .from('source_documents')
    .insert({
      school_id: schoolId,
      title,
      document_type: documentType,
      owning_area: owningArea,
      canonical_reference: canonicalReference,
      description: 'Documento bootstrapado automaticamente para inicializar a base institucional.'
    })
    .select('id, title')
    .single();

  if (error) throw error;
  return data;
}

async function createVersion({ schoolId, sourceDocumentId, versionLabel, rawText, fileName }) {
  const { data: currentVersions, error: versionsError } = await supabase
    .from('knowledge_source_versions')
    .select('id, version_number')
    .eq('school_id', schoolId)
    .eq('source_document_id', sourceDocumentId)
    .order('version_number', { ascending: false });

  if (versionsError) throw versionsError;

  const nextVersionNumber = ((currentVersions || [])[0]?.version_number || 0) + 1;
  const checksum = crypto.createHash('sha256').update(rawText, 'utf8').digest('hex');

  const { error: resetError } = await supabase
    .from('knowledge_source_versions')
    .update({ is_current: false })
    .eq('school_id', schoolId)
    .eq('source_document_id', sourceDocumentId)
    .eq('is_current', true);

  if (resetError) throw resetError;

  const { data, error } = await supabase
    .from('knowledge_source_versions')
    .insert({
      school_id: schoolId,
      source_document_id: sourceDocumentId,
      version_label: versionLabel,
      version_number: nextVersionNumber,
      checksum,
      file_name: fileName,
      mime_type: 'application/json',
      raw_text: rawText,
      chunk_count: 0,
      is_current: true,
      published_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

const axios = require('axios');

async function createEmbedding({ apiKey, model, input }) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/embeddings',
    {
      model,
      input
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.data[0].embedding;
}

async function bootstrapKnowledge() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const filePath = args.file ? String(args.file) : '';
  const title = String(args.title || DEFAULT_TITLE);
  const documentType = String(args['document-type'] || DEFAULT_DOCUMENT_TYPE);
  const owningArea = String(args['owning-area'] || DEFAULT_OWNING_AREA);
  const versionLabel = String(args['version-label'] || DEFAULT_VERSION_LABEL);
  const schoolId = String(args['school-id'] || process.env.SCHOOL_ID || '').trim();

  if (!filePath) {
    printUsage();
    throw new Error('Parametro --file obrigatorio para evitar importar um dataset incorreto por engano.');
  }
  if (!supabase) throw new Error('Cliente Supabase indisponivel. Verifique .env.');
  if (!schoolId) throw new Error('SCHOOL_ID ausente.');
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY ausente.');

  const { absolutePath, data } = loadJson(filePath);
  const entries = (Array.isArray(data) ? data : []).map(normalizeEntry).filter(Boolean);
  if (!entries.length) throw new Error(`Nenhum item valido encontrado em ${absolutePath}.`);

  console.log(`Arquivo carregado: ${absolutePath}`);
  console.log(`Entradas validas: ${entries.length}`);

  const sourceDocument = await ensureSourceDocument({
    schoolId,
    title,
    documentType,
    owningArea,
    canonicalReference: path.basename(absolutePath)
  });

  const rawText = buildRawText(entries);
  const version = await createVersion({
    schoolId,
    sourceDocumentId: sourceDocument.id,
    versionLabel,
    rawText,
    fileName: path.basename(absolutePath)
  });

  const { error: deleteError } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('school_id', schoolId)
    .eq('source_document_id', sourceDocument.id);

  if (deleteError) throw deleteError;

  const records = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const textForEmbedding = `Pergunta: ${entry.question}\nResposta: ${entry.answer}`;
    const embedding = await createEmbedding({
      apiKey: process.env.GROQ_API_KEY,
      model: 'text-embedding-3-small',
      input: textForEmbedding
    });
    records.push({
      school_id: schoolId,
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords,
      source_document_id: sourceDocument.id,
      source_version_id: version.id,
      source_title: sourceDocument.title,
      source_version_label: version.version_label,
      source_version_number: version.version_number,
      embedding
    });

    if ((index + 1) % 25 === 0 || index === entries.length - 1) {
      console.log(`Embeddings gerados: ${index + 1}/${entries.length}`);
    }
  }

  const { error: insertError } = await supabase
    .from('knowledge_base')
    .insert(records);

  if (insertError) throw insertError;

  const { error: versionUpdateError } = await supabase
    .from('knowledge_source_versions')
    .update({ chunk_count: records.length })
    .eq('id', version.id);

  if (versionUpdateError) throw versionUpdateError;

  console.log('Bootstrap concluido com sucesso.');
  console.log(JSON.stringify({
    school_id: schoolId,
    source_document_id: sourceDocument.id,
    source_version_id: version.id,
    inserted_rows: records.length,
    source_title: sourceDocument.title,
    version_label: version.version_label
  }, null, 2));
}

bootstrapKnowledge().catch((error) => {
  console.error('Falha no bootstrap da base de conhecimento:', error.message || error);
  process.exit(1);
});

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { supabase } = require('../.qodo/services/supabase.js');
const { OpenAI } = require('openai');

// ✅ AGORA USAMOS O DUMP COM CATEGORY
const KB_DATA = require('../.qodo/store/data/faq_alvacir_data.json');

const SCHOOL_ID = process.env.SCHOOL_ID;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('❌ Erro ao gerar embedding:', err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Sincronizando knowledge_base com CATEGORY...');

  if (!SCHOOL_ID || !process.env.OPENAI_API_KEY) {
    console.error('❌ SCHOOL_ID ou OPENAI_API_KEY ausentes');
    return;
  }

  // 🔥 Limpa dados antigos da escola
  const { error: deleteError } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('school_id', SCHOOL_ID);

  if (deleteError) {
    console.error('❌ Erro ao limpar base:', deleteError.message);
    return;
  }

  console.log('🗑️ Dados antigos removidos');

  const records = [];

  for (const item of KB_DATA) {
    console.log(`🧠 Processando: ${item.question}`);

    const textToEmbed =
      item.text_for_embedding ||
      `Pergunta: ${item.question}\nResposta: ${item.answer}`;

    const embedding = await getEmbedding(textToEmbed);
    if (!embedding) continue;

    records.push({
      school_id: SCHOOL_ID,
      question: item.question,
      answer: item.answer,
      keywords: item.keywords || [],
      category: item.category || 'Geral', // 🛡️ fallback de segurança
      embedding,
    });
  }

  console.log(`💾 Inserindo ${records.length} registros...`);

  const { error: insertError } = await supabase
    .from('knowledge_base')
    .insert(records);

  if (insertError) {
    console.error('❌ Erro ao inserir:', insertError.message);
  } else {
    console.log('✅ Knowledge Base sincronizada com sucesso!');
  }
}

main();

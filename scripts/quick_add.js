// 📁 scripts/quick_add.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { supabase } = require('../.qodo/services/supabase.js');
const { OpenAI } = require('openai');

// --- CONFIGURAÇÃO DO ITEM ÚNICO ---
const SCHOOL_ID = '492c0f32-e7f6-4e78-ad90-d68673c4d412'; // <--- NÃO ESQUEÇA DE COLAR O ID

const NEW_ITEM = {
  q: "Quais séries a escola oferece? Tem Ensino Médio?",
  a: "A Escola AVR oferece exclusivamente o Ensino Fundamental completo, do 1º ao 9º ano. Não oferecemos Educação Infantil nem Ensino Médio."
};
// ----------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  console.log(`🚀 Adicionando item único: "${NEW_ITEM.q}"...`);

  try {
    // 1. Gerar o embedding (A parte que o SQL puro não faz)
    const textToEmbed = `Pergunta: ${NEW_ITEM.q}\nResposta: ${NEW_ITEM.a}`;
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
    });
    const embedding = response.data[0].embedding;

    // 2. Inserir no Supabase (SEM DELETAR NADA ANTES)
    const { error } = await supabase.from('knowledge_base').insert({
      school_id: SCHOOL_ID,
      question: NEW_ITEM.q,
      answer: NEW_ITEM.a,
      embedding: embedding
    });

    if (error) throw error;

    console.log("✅ Item adicionado com sucesso!");

  } catch (err) {
    console.error("❌ Erro:", err.message);
  }
}

main();
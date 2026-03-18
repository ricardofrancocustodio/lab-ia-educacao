const fs = require('fs');
const path = require('path');

// 1. AJUSTE AQUI O NOME DO ARQUIVO DE ENTRADA (O QUE TEM AS 448 PERGUNTAS)
const inputFileName = 'faq_alvacir_data.json'; 
const outputFileName = 'faq_alvacir_pronto_para_upload.json';

const inputFile = path.join(__dirname, inputFileName);
const outputFile = path.join(__dirname, outputFileName);

// Função auxiliar para capitalizar a primeira letra (ex: "geral" -> "Geral")
function formatCategory(tag) {
  if (!tag) return "Geral";
  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
}

try {
  console.log(`📂 Lendo arquivo de entrada: ${inputFile}...`);
  
  // Tenta ler o arquivo
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Arquivo ${inputFileName} não encontrado! Verifique se o nome está correto.`);
  }

  const rawData = fs.readFileSync(inputFile, 'utf8');
  const data = JSON.parse(rawData);

  // VERIFICAÇÃO 1: Contagem inicial
  const inputCount = data.length;
  console.log(`📊 Total de itens encontrados no original: ${inputCount}`);

  // Processamento
  const processedData = data.map(item => {
    
    // Lógica inteligente para definir a Categoria:
    // 1. Se já tiver categoria, usa ela.
    // 2. Se não, tenta pegar a primeira TAG e transformar em Categoria.
    // 3. Se não tiver tags, define como "Geral".
    let finalCategory = item.category;
    
    if (!finalCategory) {
      if (item.tags && item.tags.length > 0) {
        finalCategory = formatCategory(item.tags[0]);
      } else {
        finalCategory = "Geral";
      }
    }

    // Retorna o objeto no formato exato que o banco espera
    return {
      school_id: item.school_id || "492c0f32-e7f6-4e78-ad90-d68673c4d412", // Mantém ou usa o padrão se faltar
      question: item.question,
      answer: item.answer,
      // Se você não tem o embedding calculado ainda, enviamos vazio ou null 
      // (dependendo de como seu banco gera isso). Aqui estou enviando o que vier ou vazio.
      embedding: item.embedding || [], 
      created_at: item.created_at || new Date().toISOString(), // Gera data de hoje se não tiver
      keywords: item.keywords || item.tags || [], // Usa keywords ou tags como fallback
      category: finalCategory // O novo campo gerado
    };
  });

  // VERIFICAÇÃO 2: Contagem final
  const outputCount = processedData.length;
  console.log(`✅ Total de itens processados: ${outputCount}`);

  // Validação simples
  if (inputCount === outputCount) {
    console.log(`🏆 SUCESSO: Todos os ${inputCount} itens foram processados e categorizados.`);
  } else {
    console.warn(`⚠️ ALERTA: A contagem mudou de ${inputCount} para ${outputCount}.`);
  }

  // Salvar arquivo
  fs.writeFileSync(outputFile, JSON.stringify(processedData, null, 2), 'utf8');
  console.log(`💾 Arquivo salvo e pronto para upload em: ${outputFile}`);

} catch (err) {
  console.error('❌ Erro:', err.message);
}
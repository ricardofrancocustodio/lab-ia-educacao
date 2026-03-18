// 📁 .qodo/services/faqMatcher.js
const path = require("path");
// Carrega a nossa base de conhecimento
const knowledgeBase = require(path.resolve('./.qodo/store/knowledgeBase.js'));

// (Esta função helper é a mesma que já usa no receptionist.js)
function hasAny(str, arr) {
  return arr.some(k => str.includes(k));
}

/**
 * Procura na base de conhecimento por uma resposta à pergunta do usuário.
 * @param {string} text - A mensagem do usuário.
 * @returns {string|null} - A resposta encontrada ou null se nada for encontrado.
 */
async function findFaqAnswer(text) {
  const lowerText = text.toLowerCase();
  
  // Itera sobre cada item (Q&A) na nossa base de conhecimento
  for (const item of knowledgeBase) {
    // Se a mensagem do usuário contiver qualquer uma das palavras-chave...
    if (hasAny(lowerText, item.keywords)) {
      return item.answer; // ...retorna a resposta!
    }
  }
  
  return null; // Não encontrou nada
}

module.exports = { findFaqAnswer };
// 📁 .qodo/services/ai/index.js
require("dotenv").config();
const OpenAIProvider = require("./providers/openai");
const GeminiProvider = require("./providers/gemini");

// Lê qual provedor está ativo no .env (padrão: openai)
const ACTIVE_PROVIDER = process.env.AI_PROVIDER || "openai";

let aiProvider;

function initializeProvider() {
  if (aiProvider) return aiProvider; // Singleton (já inicializado)

  console.log(`🚀 Inicializando provedor de IA: ${ACTIVE_PROVIDER}`);

  switch (ACTIVE_PROVIDER.toLowerCase()) {
    case "openai":
      aiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
      break;
    case "gemini":
      aiProvider = new GeminiProvider(process.env.GEMINI_API_KEY);
      break;
    // Futuro:
    // case "copilot": ...
    default:
      console.warn("Provedor desconhecido, usando OpenAI como fallback.");
      aiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
  }
  return aiProvider;
}

// A função pública que o resto do sistema vai chamar
async function askAI(systemPrompt, userText, history = []) {
  const provider = initializeProvider();
  try {
    // Independentemente de ser Gemini ou OpenAI, ambos têm o método generateResponse
    return await provider.generateResponse(systemPrompt, userText, history);
  } catch (error) {
    console.error("Erro na comunicação com a IA:", error);
    return "Desculpe, estamos enfrentando instabilidade técnica no momento.";
  }
}

module.exports = { askAI };
// 📁 .qodo/services/ai/providers/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiProvider {
  constructor(apiKey) {
    if (!apiKey) throw new Error("API Key do Gemini não fornecida.");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async generateResponse(systemPrompt, userText, history = []) {
    try {
      // 1. Converter histórico do formato OpenAI (se for o caso) para formato Gemini (Google)
      // O Gemini usa "user" e "model" em vez de "user" e "assistant"
      
      // 2. Enviar prompt
      // const result = await this.model.generateContent(prompt);
      
      return "Resposta simulada do Gemini (ainda não implementado completamente).";
    } catch (error) {
      console.error("Erro Gemini Provider:", error);
      throw error;
    }
  }
}

module.exports = GeminiProvider;
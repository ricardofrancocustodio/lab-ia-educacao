const axios = require("axios");
const path = require("path");
const { checkActivityAvailability } = require(path.resolve("./.qodo/services/activities.js"));

class GroqProvider {
  constructor(apiKey, options = {}) {
    if (!apiKey) throw new Error("API Key da Groq nao fornecida.");
    this.model = options.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    this.apiKey = apiKey;
    this.baseURL = "https://api.groq.com/openai/v1";
    this.tools = [
      {
        type: "function",
        function: {
          name: "checkActivityAvailability",
          description: "Verifica disponibilidade de vagas, horarios e precos.",
          parameters: {
            type: "object",
            properties: {
              activityName: { type: "string", description: "Nome da atividade (ex: Judo)" }
            },
            required: ["activityName"]
          }
        }
      }
    ];
  }

  async generateResponse(systemPrompt, userText, history = []) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userText }
      ];

      // Função auxiliar para chamada HTTP
      const postChatCompletion = async (payload) => {
        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          payload,
          {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
              "Content-Type": "application/json"
            }
          }
        );
        return response.data;
      };

      const runner = await postChatCompletion({
        model: this.model,
        messages,
        tools: this.tools,
        tool_choice: "auto",
        temperature: 0.1
      });

      const responseMessage = runner.choices?.[0]?.message;
      if (!responseMessage) return "Desculpe, nao consegui gerar resposta no momento.";

      if (responseMessage.tool_calls?.length) {
        const toolCall = responseMessage.tool_calls[0];
        if (toolCall.function?.name === "checkActivityAvailability") {
          const args = JSON.parse(toolCall.function.arguments || "{}");
          const functionResult = await checkActivityAvailability(args.activityName);

          messages.push(responseMessage);
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: functionResult });

          const finalResponse = await postChatCompletion({
            model: this.model,
            messages,
            temperature: 0.1
          });

          return finalResponse.choices?.[0]?.message?.content || "Desculpe, nao consegui concluir a resposta.";
        }
      }

      return responseMessage.content || "Desculpe, nao consegui gerar resposta no momento.";
    } catch (error) {
      console.error("Erro Groq Provider:", error?.response?.data || error);
      throw error;
    }
  }
}

module.exports = GroqProvider;

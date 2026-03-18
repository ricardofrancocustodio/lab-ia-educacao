// 📁 .qodo/services/ai/providers/openai.js
const OpenAI = require("openai");
const path = require("path");
// Ajusta o caminho conforme a nova estrutura de pastas
const { checkActivityAvailability } = require(path.resolve("./.qodo/services/activities.js"));

class OpenAIProvider {
  constructor(apiKey) {
    if (!apiKey) throw new Error("API Key da OpenAI não fornecida.");
    this.client = new OpenAI({ apiKey: apiKey });
    
    // Definição das tools (específico da OpenAI)
    this.tools = [
      {
        type: "function",
        function: {
          name: "checkActivityAvailability",
          description: "Verifica disponibilidade de vagas, horários e preços.",
          parameters: {
            type: "object",
            properties: {
              activityName: { type: "string", description: "Nome da atividade (ex: Judô)" },
            },
            required: ["activityName"],
          },
        },
      },
    ];
  }

  async generateResponse(systemPrompt, userText, history = []) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userText },
      ];

      // 1ª Chamada
      const runner = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        tools: this.tools,
        tool_choice: "auto",
      });

      const responseMessage = runner.choices[0].message;

      // Lógica de Tool Call (igual ao teu código original)
      if (responseMessage.tool_calls) {
        const toolCall = responseMessage.tool_calls[0];
        if (toolCall.function.name === "checkActivityAvailability") {
          const args = JSON.parse(toolCall.function.arguments);
          const functionResult = await checkActivityAvailability(args.activityName);

          messages.push(responseMessage);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: functionResult, // JSON do Supabase
          });

          // 2ª Chamada com o resultado
          const finalResponse = await this.client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
          });

          return finalResponse.choices[0].message.content;
        }
      }

      return responseMessage.content;

    } catch (error) {
      console.error("Erro OpenAI Provider:", error);
      throw error; // Lança o erro para o gerente tratar
    }
  }
}

module.exports = OpenAIProvider;
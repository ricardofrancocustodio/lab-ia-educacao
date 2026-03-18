// 📁 .qodo/services/openai.js
const OpenAI = require("openai");
const path = require("path");
// Importa a função que criamos no Passo 1
const { checkActivityAvailability } = require(path.resolve("./.qodo/services/activities.js"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
  {
    type: "function",
    function: {
      name: "checkActivityAvailability",
      description: "Verifica disponibilidade de vagas, horários e preços de atividades extracurriculares. Use isso sempre que o usuário perguntar 'tem vaga?', 'quanto custa o judô?' ou horários.",
      parameters: {
        type: "object",
        properties: {
          activityName: {
            type: "string",
            description: "O nome da atividade para buscar (ex: Judô, Ballet, Futsal)",
          },
        },
        required: ["activityName"],
      },
    },
  },
];

async function askOpenAI(systemPrompt, userText, history = []) {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userText },
    ];

    // 1ª Chamada
    const runner = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      temperature: 0.1, // <--- ADICIONADO: Criatividade baixa para evitar "Supremo Fogão"
    });

    const responseMessage = runner.choices[0].message;

    // 2. Verifica chamada de função
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.function.name === "checkActivityAvailability") {
        const args = JSON.parse(toolCall.function.arguments);
        const functionResult = await checkActivityAvailability(args.activityName);

        messages.push(responseMessage);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: functionResult,
        });

        // 3ª Chamada (Resposta final)
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messages,
          temperature: 0.1, // <--- ADICIONADO: Mantém a consistência na resposta final
        });

        return finalResponse.choices[0].message.content;
      }
    }

    return responseMessage.content;

  } catch (error) {
    console.error("Erro OpenAI:", error);
    return "Desculpe, tive um erro técnico ao consultar as informações.";
  }
}

module.exports = { askOpenAI };
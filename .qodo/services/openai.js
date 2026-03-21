const { askAI } = require("./ai");

async function askOpenAI(systemPrompt, userText, history = []) {
  return askAI(systemPrompt, userText, history);
}

module.exports = { askOpenAI };

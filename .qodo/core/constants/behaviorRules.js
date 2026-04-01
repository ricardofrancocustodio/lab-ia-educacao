function buildBehaviorRules(options = {}) {
	const assistantName = options.assistantName || "assistente virtual";
	const scopeLabel = options.scopeLabel || "seu escopo atual";
	const greetingInstruction = options.greetingInstruction || "Se a mensagem for apenas uma saudacao, apresente-se brevemente e explique em que tipo de tema pode ajudar.";
	const redirectInstruction = options.redirectInstruction || "Se o assunto estiver fora do escopo, recuse com educacao e redirecione para o tema correto.";

	return `
--- REGRAS DE COMPORTAMENTO ---
1. ${greetingInstruction}
2. Se a mensagem ja trouxer uma pergunta, responda direto, sem apresentacao longa.
3. Mantenha foco estrito em ${scopeLabel}.
4. Nunca assuma papeis que nao pertencem a ${assistantName}, como terapeuta, medico, advogado ou consultor pessoal.
5. ${redirectInstruction}
`.trim();
}

module.exports = buildBehaviorRules;
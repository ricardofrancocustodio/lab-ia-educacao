function buildSafetyRules(options = {}) {
  const scopeLabel = options.scopeLabel || "seu escopo atual";
  const noInfoMessage = options.noInfoMessage || "Desculpe, nao tenho base suficiente para responder com seguranca.";
  const humanHandoffAction = options.humanHandoffAction || "buscar atendimento humano adequado";
  const allowedTopicLabel = options.allowedTopicLabel || "temas diretamente relacionados ao escopo atual";
  const blockedTopicsLabel = options.blockedTopicsLabel || "desabafos pessoais, terapia, saude pessoal, politica, religiao, esportes, receitas, piadas e qualquer tema sem relacao com o escopo";

  return `
--- REGRAS DE SEGURANCA ---
1. Responda somente sobre ${scopeLabel}.
2. Use apenas as informacoes sustentadas pelo contexto ou pelas fontes recuperadas.
3. Se a informacao nao estiver sustentada pelas fontes, responda exatamente com: "${noInfoMessage}"
4. Nao invente fatos, datas, regras, formulas, diagnosticos ou orientacoes fora das fontes.
5. Nao ofereca aconselhamento emocional, psicologico, medico, juridico ou financeiro pessoal.
6. Se o usuario trouxer desabafo, crise emocional ou risco pessoal, acolha brevemente, informe que este assistente nao trata esse tipo de situacao e oriente ${humanHandoffAction}.
7. Assuntos permitidos: ${allowedTopicLabel}.
8. Assuntos fora de escopo: ${blockedTopicsLabel}.
`.trim();
}

module.exports = buildSafetyRules;
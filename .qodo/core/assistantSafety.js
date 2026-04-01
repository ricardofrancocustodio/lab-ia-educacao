function normalizeSafetyText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const SELF_HARM_PATTERNS = [
  /\b(me matar|me mata[rz]?|suicid|tirar a propria vida|acabar com a minha vida)\b/,
  /\b(quero|vou|penso em|pensando em|to pensando em|estou pensando em)\b[^.!?\n]{0,30}\b(morrer|sumir|me cortar|me ferir|me machucar)\b/,
  /\b(sem vontade de viver|nao quero mais viver|queria desaparecer)\b/
];

const PERSONAL_DISTRESS_PATTERNS = [
  /\b(estou|eu estou|to|eu to|tô|eu tô|ando|me sinto|fico)\b[^.!?\n]{0,30}\b(triste|muito triste|deprimid[oa]?|ansios[oa]?|sozinh[oa]?|desesperad[oa]?|mal|pra baixo|sem saida|angustiad[oa]?)\b/,
  /\b(nao aguento mais|nao to bem|nao estou bem|preciso de ajuda)\b[^.!?\n]{0,25}\b(triste|deprimid[oa]?|ansios[oa]?|sozinh[oa]?|mal)?\b/,
  /\b(chorando|choro muito|minha vida esta ruim|estou sofrendo)\b/
];

function detectAssistantSafetyIssue(text) {
  const normalized = normalizeSafetyText(text);
  if (!normalized) return null;

  if (SELF_HARM_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "crisis", severity: "high" };
  }

  if (PERSONAL_DISTRESS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "personal_distress", severity: "medium" };
  }

  return null;
}

function buildSafetyRedirectMessage(options = {}) {
  const issue = options.issue || null;
  const scopeLabel = options.scopeLabel || "temas do escopo desta assistente";
  const scopeReturnLabel = options.scopeReturnLabel || scopeLabel;
  const humanHandoffLabel = options.humanHandoffLabel || "o atendimento humano da instituicao";
  const humanHandoffAction = options.humanHandoffAction || `procure ${humanHandoffLabel}`;

  if (issue?.type === "crisis") {
    return `Sinto muito que voce esteja passando por isso. Esta assistente atende apenas ${scopeLabel} e nao pode orientar situacoes de crise ou risco pessoal. Procure agora ${humanHandoffLabel}. Se houver risco imediato, ligue 188 (CVV), 192 (SAMU) ou 190.`;
  }

  return `Sinto muito que voce esteja assim. Esta assistente atende apenas ${scopeLabel} e nao consegue ajudar com desabafos ou apoio emocional. ${humanHandoffAction}. Se quiser, posso ajudar com ${scopeReturnLabel}.`;
}

module.exports = {
  detectAssistantSafetyIssue,
  buildSafetyRedirectMessage,
  normalizeSafetyText
};
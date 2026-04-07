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

// ---------------------------------------------------------------------------
// Abusive language detection (profanity, slurs, threats, harassment)
// ---------------------------------------------------------------------------

const PROFANITY_PATTERNS = [
  // Common profanity (PT-BR) — whole-word to avoid false positives
  /\b(porra|caralho|cacete|merda|bosta|fod[aeiou]|fode[r]?|fodid[oa]|fodas[es]?)\b/,
  /\b(put[ao]|filh[oa] da put[ao]|fdp|pqp|vsf|tnc|vtnc|pnc|krl|crlh)\b/,
  /\b(arrombad[oa]|cuzao|cuzaon[ae]?|cu |no cu|tomar no cu)\b/,
  /\b(desgraçad[oa]|desgracad[oa]|vagabund[oa]|lazarent[oa]|pilantr[ao])\b/,
  /\b(viado|viad[ao]|bicha |bichona|sapata[oa]?|sapatona)\b/,
  /\b(piranha|galinha|vaca |vadia|cachorra|cadela|quenga|rapariga)\b/,
  /\b(idiota|imbecil|retardad[oa]|animal|burr[oa]|otari[oa]|troxa|babaca|panac[ao])\b/,
  /\b(corno|corn[oa]|chifrudo|chifruda)\b/,
  // Racial / discriminatory slurs
  /\b(macac[oa]|crioul[oa]|negr[oa] fedid[oa]|preto fedid[oa]|preto imundo|neguinh[oa]\s+fedid[oa])\b/,
  /\b(jap[ao]nha|chinoca|boliv[ao]|paraib[ao])\b/,
  // Common obfuscation attempts (letter substitution, spacing)
  /\bp\s*u\s*t\s*[a@]\b/,
  /\bf\s*[o0]\s*d\s*[a@]\b/,
  /\bc\s*[a@]\s*r\s*[a@]\s*l\s*h\s*[o0]\b/
];

const THREAT_PATTERNS = [
  /\b(vou te matar|vou te pegar|te arrebento|te acabo|te quebro)\b/,
  /\b(vou te bater|vou te socar|vou te espancar|vou te dar uma surra)\b/,
  /\b(vou ai te pegar|sei onde voce mora|sei onde tu mora|cuidado comigo)\b/,
  /\b(ameac|amasso tua cara|meto a mao|meto bala|vou meter bala)\b/,
  /\b(vai apanhar|vai levar|vai se arrepender|vai pagar por isso)\b/,
  /\b(vo[cu] va[io] morrer|voce vai morrer|tu vai morrer|cuidado que eu)\b/,
  /\b(vou processar|vou denunciar voce|vou acabar com voce)\b/,
  /\b(bomba|explodir|incendiar|atear fogo)\b/
];

const HARASSMENT_PATTERNS = [
  /\b(nudes|manda foto|foto pelad[oa]|foto nu[ao]?|gostosa|gostoso|delicia|tesao)\b/,
  /\b(quero te comer|te pegar|quero transar|sexo comigo|vamos transar)\b/,
  /\b(chupa meu|senta no meu|mama aqui|boquete)\b/,
  /\b(lixo de pessoa|lixo humano|ninguem te ama|voce e um lixo|inutil|inutel)\b/
];

function detectAssistantSafetyIssue(text) {
  const normalized = normalizeSafetyText(text);
  if (!normalized) return null;

  if (SELF_HARM_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "crisis", severity: "high" };
  }

  if (THREAT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "threat", severity: "high" };
  }

  if (HARASSMENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "harassment", severity: "high" };
  }

  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "profanity", severity: "medium" };
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

  if (issue?.type === "threat") {
    return `Este canal e exclusivo para ${scopeLabel}. Mensagens com ameacas nao sao toleradas e podem ser registradas. Se precisar de ajuda com ${scopeReturnLabel}, estou a disposicao.`;
  }

  if (issue?.type === "harassment") {
    return `Este canal e exclusivo para ${scopeLabel}. Mensagens com conteudo ofensivo ou assedio nao sao toleradas e podem ser registradas. Se precisar de ajuda com ${scopeReturnLabel}, estou a disposicao.`;
  }

  if (issue?.type === "profanity") {
    return `Entendo que voce possa estar frustrado(a), mas preciso pedir gentileza na comunicacao. Esta assistente atende ${scopeLabel}. Posso ajudar com ${scopeReturnLabel} — e so reformular sua pergunta.`;
  }

  return `Sinto muito que voce esteja assim. Esta assistente atende apenas ${scopeLabel} e nao consegue ajudar com desabafos ou apoio emocional. ${humanHandoffAction}. Se quiser, posso ajudar com ${scopeReturnLabel}.`;
}

module.exports = {
  detectAssistantSafetyIssue,
  buildSafetyRedirectMessage,
  normalizeSafetyText
};
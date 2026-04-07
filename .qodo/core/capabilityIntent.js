function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeConversationText(value) {
  return normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GENERAL_HELP_MARKERS = [
  'preciso de ajuda',
  'pode me ajudar',
  'quero ajuda',
  'tenho uma duvida',
  'tenho uma pergunta',
  'quero uma informacao',
  'quero informacao',
  'gostaria de informacao',
  'preciso de informacao'
];

const CAPABILITY_STRONG_MARKERS = [
  'o que voce consegue',
  'o que voce responde',
  'quais assuntos',
  'que assuntos',
  'com o que voce pode ajudar',
  'sobre o que voce fala',
  'que tipo de informacao',
  'como esse atendimento funciona',
  'como funciona esse atendimento',
  'como funciona este atendimento',
  'voce atende',
  'voce responde',
  'voce consegue',
  'voce ajuda com'
];

const CAPABILITY_CONTEXT_MARKERS = [
  'aqui',
  'nesse atendimento',
  'neste atendimento',
  'nesse canal',
  'neste canal',
  'esse assistente',
  'este assistente'
];

const CAPABILITY_WEAK_MARKERS = [
  'ajuda',
  'informacao',
  'duvida'
];

const CONCRETE_CONTENT_PATTERNS = [
  /^como faco\b/,
  /^como fazer\b/,
  /^como solicitar\b/,
  /^(quando|onde|quanto|qual(?!\s+assunto)|quais(?!\s+assuntos)|prazo|data|horario|telefone|endereco)\b/,
  /\bquais documentos\b/,
  /\bcomo me matriculo\b/,
  /\bcomo fazer matricula\b/,
  /\btem vaga\b/
];

function detectCapabilityIntent(text, options = {}) {
  const value = normalizeConversationText(text);
  const intentProfile = options.intentProfile || null;
  if (!value) return null;

  let score = 0;
  let strongMatchCount = 0;

  GENERAL_HELP_MARKERS.forEach((marker) => {
    const normalizedMarker = normalizeConversationText(marker);
    if (value === normalizedMarker || value.startsWith(normalizedMarker + ' ')) {
      score += 3;
      strongMatchCount += 1;
    }
  });

  CAPABILITY_STRONG_MARKERS.forEach((marker) => {
    const normalizedMarker = normalizeConversationText(marker);
    if (value.includes(normalizedMarker)) {
      score += 2.5;
      strongMatchCount += 1;
    }
  });

  CAPABILITY_CONTEXT_MARKERS.forEach((marker) => {
    const normalizedMarker = normalizeConversationText(marker);
    if (value.includes(normalizedMarker)) score += 0.75;
  });

  CAPABILITY_WEAK_MARKERS.forEach((marker) => {
    const normalizedMarker = normalizeConversationText(marker);
    if (value.includes(normalizedMarker)) score += 0.35;
  });

  if (/^(o que|quais assuntos|que assuntos|com o que|sobre o que|que tipo de informacao)/.test(value)) {
    score += 1.5;
  }

  const hasConcreteContentCue = CONCRETE_CONTENT_PATTERNS.some((pattern) => pattern.test(value));
  const hasStrongMetaCue = strongMatchCount > 0;

  if (hasConcreteContentCue && !hasStrongMetaCue) return null;
  if (score < 2.5) return null;

  return {
    kind: intentProfile?.key && hasStrongMetaCue ? 'topic' : 'general',
    score,
    intentProfile
  };
}

module.exports = {
  detectCapabilityIntent
};
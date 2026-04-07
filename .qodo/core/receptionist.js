const path = require("path");

const { askAI } = require(path.resolve("./.qodo/services/ai/index.js"));
const { findMatchingEntries, findPublishedCalendarContext, loadSchoolContext } = require(path.resolve("./.qodo/services/supabase.js"));
const { getSession, setSession } = require(path.resolve("./.qodo/store/sessions.js"));
const agents = require(path.resolve("./.qodo/agents/index.js"));
const buildAssistantGuardrails = require(path.resolve("./.qodo/core/constants/buildAssistantGuardrails.js"));
const { detectAssistantSafetyIssue, buildSafetyRedirectMessage } = require(path.resolve("./.qodo/core/assistantSafety.js"));
const { detectCapabilityIntent } = require(path.resolve("./.qodo/core/capabilityIntent.js"));

const SCHOOL_ID = process.env.SCHOOL_ID;
const SAFE_EVIDENCE_SCORE = 0.78;
const WARNING_EVIDENCE_SCORE = 0.58;

const SCHOOL_INTENT_PROFILES = [
  {
    key: 'calendar',
    area: null,
    categories: ['Atendimento Publico', 'Institucional', 'Secretaria'],
    keywords: ['calendario', 'aula', 'ferias', 'recesso', 'feriado', 'prova', 'avaliacao', 'recuperacao', 'conselho', 'boletim', 'resultado', 'reuniao de pais', 'reuniao', 'inicio das aulas', 'fim das aulas'],
    searchHints: ['calendario escolar', 'data oficial', 'evento escolar'],
    label: 'calendario escolar'
  },
  {
    key: 'enrollment',
    area: 'administration.secretariat',
    categories: ['Secretaria', 'Documentos', 'Atendimento Publico'],
    keywords: ['matricula', 'rematricula', 'vaga', 'inscricao', 'transferencia', 'lista de espera', 'idade minima'],
    searchHints: ['matricula escolar', 'documentacao de matricula', 'cronograma de matricula'],
    label: 'matricula'
  },
  {
    key: 'documents',
    area: 'administration.secretariat',
    categories: ['Secretaria', 'Documentos', 'Atendimento Publico'],
    keywords: ['documento', 'declaracao', 'historico', 'certidao', 'comprovante', 'protocolo', 'cadastro'],
    searchHints: ['documentacao escolar', 'secretaria escolar'],
    label: 'documentos escolares'
  },
  {
    key: 'contact',
    area: 'administration.secretariat',
    categories: ['Institucional', 'Atendimento Publico', 'Secretaria'],
    keywords: ['telefone', 'whatsapp', 'email', 'e-mail', 'endereco', 'localizacao', 'horario', 'hora de entrada', 'hora de saida', 'atendimento da secretaria'],
    searchHints: ['contato da escola', 'horario de funcionamento', 'onde fica a escola'],
    label: 'contato e atendimento'
  },
  {
    key: 'student-life',
    area: 'administration.secretariat',
    categories: ['Institucional', 'Atendimento Publico', 'Secretaria'],
    keywords: ['uniforme', 'transporte', 'merenda', 'alimentacao', 'boletim', 'nota', 'frequencia'],
    searchHints: ['rotina escolar', 'vida escolar', 'servicos da escola'],
    label: 'vida escolar'
  },
  {
    key: 'finance',
    area: 'administration.secretariat',
    categories: ['Secretaria', 'Atendimento Publico'],
    keywords: ['financeiro', 'pagamento', 'repasse', 'orcamento', 'empenho'],
    searchHints: ['orientacao administrativa'],
    label: 'orientacao administrativa'
  },
  {
    key: 'governance',
    area: 'administration.direction',
    categories: ['Direcao', 'Institucional', 'Atendimento Publico'],
    keywords: ['direcao', 'diretoria', 'ouvidoria', 'recurso', 'norma', 'comunicado', 'aviso oficial'],
    searchHints: ['comunicado oficial', 'direcao da escola'],
    label: 'gestao institucional'
  }
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeConversationText(value) {
  return normalize(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const REDIRECT_MARKERS = [
  'falar com', 'falar na', 'falar no',
  'conversar com', 'conversar na',
  'gostaria de falar', 'quero falar',
  'preciso falar', 'me redirecione',
  'me transfere', 'me transfira',
  'transferir para', 'redirecionar para',
  'como faco para falar', 'como falar'
];

const AGENT_LABELS = {
  'administration.secretariat': { name: 'Assistente da Secretaria', area: 'Secretaria' },
  'administration.treasury': { name: 'Assistente da Tesouraria', area: 'Tesouraria' },
  'administration.direction': { name: 'Assistente da Direcao', area: 'Direcao' }
};

const RETURN_MARKERS = [
  'voltar', 'voltar ao inicio', 'menu principal',
  'outro assunto', 'trocar de area', 'sair da',
  'atendimento geral', 'voltar para o inicio'
];

const ROUTE_CONFIRM_YES_MARKERS = [
  'sim', 's', 'ok', 'claro', 'pode ser', 'pode', 'isso', 'isso mesmo', 'confirmo', 'quero sim'
];

const ROUTE_CONFIRM_NO_MARKERS = [
  'nao', 'n', 'negativo', 'prefiro nao', 'deixa', 'deixa pra la', 'cancelar', 'nao precisa'
];

function isRedirectionIntent(text) {
  const value = normalize(text);
  return REDIRECT_MARKERS.some(marker => value.includes(normalize(marker)));
}

function isReturnIntent(text) {
  const value = normalizeConversationText(text);
  return RETURN_MARKERS.some(marker => value.includes(normalizeConversationText(marker)));
}

function isRoutingMetaQuestion(text) {
  const value = normalizeConversationText(text);
  if (['sim', 'ok', 'certo', 'beleza', 'blz', 'entendi', 'ta bom', 'pode ser', 'claro'].some(m => value === normalizeConversationText(m))) return true;
  if (/^(falo|eu falo|estou falando|to falando|ja estou|ja to)\s+(com|na|no)\s/.test(value)) return true;
  if (/^(e aqui|aqui mesmo|e essa area|essa area|essa e a)\b/.test(value)) return true;
  return false;
}

function isRouteConfirmationAccepted(text) {
  const value = normalizeConversationText(text);
  return ROUTE_CONFIRM_YES_MARKERS.some(marker => value === normalizeConversationText(marker));
}

function isRouteConfirmationRejected(text) {
  const value = normalizeConversationText(text);
  return ROUTE_CONFIRM_NO_MARKERS.some(marker => value === normalizeConversationText(marker));
}

async function resolveSchoolIdentity(schoolId, metadata) {
  const fallbackName = (metadata && metadata.school_name) ? String(metadata.school_name).trim() : null;
  if (!schoolId) return { schoolName: fallbackName, networkName: null };
  try {
    const school = await loadSchoolContext(schoolId);
    if (!school) return { schoolName: fallbackName, networkName: null };
    let networkName = null;
    if (school.institution_type === 'school_unit' && school.parent_school_id) {
      const parent = await loadSchoolContext(school.parent_school_id);
      networkName = parent ? parent.name : null;
    }
    return {
      schoolName: school.name || fallbackName,
      networkName
    };
  } catch (_err) {
    return { schoolName: fallbackName, networkName: null };
  }
}

function buildRedirectionReply(area, identity) {
  const agent = AGENT_LABELS[area];
  if (!agent) return null;
  let msg = 'Sem problemas! A partir de agora voce esta falando com a ' + agent.name;
  msg += '. Pode fazer sua pergunta sobre ' + agent.area + ' que eu sigo com o atendimento. Se quiser voltar ao atendimento geral, e so me dizer.';
  return msg;
}

function buildRouteProposalReply(area, identity) {
  const agent = AGENT_LABELS[area];
  if (!agent) return null;
  let msg = 'Posso te encaminhar para a ' + agent.name;
  msg += ', que trata de assuntos de ' + agent.area + '. Se quiser seguir com essa transferencia, responda "sim". Se preferir continuar aqui no atendimento geral, responda "nao".';
  return msg;
}

function buildRouteCancellationReply(hasRoutedAgent = false) {
  if (hasRoutedAgent) {
    return 'Tudo bem. Seguimos por aqui. Se quiser mudar de area depois, e so me avisar.';
  }
  return 'Tudo bem. Continuamos aqui no atendimento geral. Se quiser falar com outra area depois, e so me avisar.';
}

function buildRoutingConfirmation(area) {
  const agent = AGENT_LABELS[area];
  if (!agent) return null;
  return 'Sim, voce esta falando com a ' + agent.name + '. Pode fazer sua pergunta sobre ' + agent.area + ' que eu sigo com o atendimento.';
}

function buildRoutedGreeting(area) {
  const agent = AGENT_LABELS[area];
  if (!agent) return null;
  return 'Ola! Voce esta falando com a ' + agent.name + '. Pode fazer sua pergunta sobre ' + agent.area + ' que eu sigo daqui.';
}

function isGreetingIntent(text) {
  const value = normalizeConversationText(text);
  const compact = value.replace(/\s+/g, "");
  return compact.length <= 12 && (
    /^(oi+|opa+|eai|ei+|bomdia|boatarde|boanoite)$/.test(compact) ||
    compact.startsWith("ol")
  );
}


function detectIntentProfile(text) {
  const value = normalizeConversationText(text);
  let bestProfile = null;
  let bestScore = 0;

  SCHOOL_INTENT_PROFILES.forEach((profile) => {
    const score = profile.keywords.reduce((acc, keyword) => acc + (value.includes(normalizeConversationText(keyword)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  });

  if (!bestProfile || bestScore === 0) return null;
  return { ...bestProfile, score: bestScore };
}

function mergeKnowledgeCategories(baseCategories = [], intentProfile = null) {
  return [...new Set([...(Array.isArray(baseCategories) ? baseCategories : []), ...((intentProfile && intentProfile.categories) || [])])].filter(Boolean);
}

function detectArea(text) {
  const value = normalize(text);

  if (["tesouraria", "financeiro", "pagamento", "repasse", "orcamento", "empenho"].some((term) => value.includes(term))) {
    return "administration.secretariat";
  }

  if (["direcao", "diretoria", "institucional", "ouvidoria", "recurso", "norma"].some((term) => value.includes(term))) {
    return "administration.direction";
  }

  if (["secretaria", "documento", "protocolo", "declaracao", "cadastro", "atendimento"].some((term) => value.includes(term))) {
    return "administration.secretariat";
  }

  return null;
}

function formatSources(entries) {
  if (!entries.length) return "Nenhuma fonte institucional localizada.";

  return entries
    .map((entry, index) => {
      const title = entry.source_title || "Base institucional";
      const version = entry.source_version_label || entry.source_version_number || "sem versao";
      const excerpt = entry.answer || entry.question || "";
      const evidenceScore = Number(entry.evidence_score || 0).toFixed(2);
      return `${index + 1}. Fonte: ${title} | Versao: ${version} | Evidencia: ${evidenceScore}\nTrecho: ${excerpt}`;
    })
    .join("\n\n");
}

function mapConsultedSources(entries = []) {
  return entries.map((entry) => ({
    source_document_id: entry.source_document_id || null,
    source_document_type: entry.source_document_type || null,
    source_title: entry.source_title || null,
    source_version_id: entry.source_version_id || null,
    source_version_label: entry.source_version_label || entry.source_version_number || null,
    source_excerpt: entry.answer || entry.question || null,
    evidence_score: entry.evidence_score ?? null,
    retrieval_method: entry.retrieval_method || null
  }));
}

function hasReliableInstitutionalSource(source = {}) {
  if (String(source?.source_document_type || '').trim().toLowerCase() === 'teaching_material') {
    return false;
  }
  return Boolean(
    source?.source_version_id ||
    source?.source_document_id ||
    String(source?.source_version_label || '').trim() ||
    String(source?.retrieval_method || '').trim() === 'official_content'
  );
}

function buildSourceCard(source = {}) {
  if (!source || !hasReliableInstitutionalSource(source)) return null;
  return {
    title: source.source_title || 'Fonte institucional',
    version: source.source_version_label || 'publicado',
    excerpt: String(source.source_excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 220),
    evidence_score: source.evidence_score ?? null
  };
}

function appendSourceCitation(reply, source = {}) {
  const normalizedReply = String(reply || '').trim();
  if (!normalizedReply || !hasReliableInstitutionalSource(source)) return normalizedReply;
  const title = String(source.source_title || 'Fonte institucional').trim();
  const version = String(source.source_version_label || 'publicado').trim();
  const citation = `Fonte: ${title} (${version}).`;
  if (normalizedReply.includes(citation) || normalizedReply.includes(title)) return normalizedReply;
  return `${normalizedReply}\n\n${citation}`.trim();
}

function buildEvidenceAssessment(entries = []) {
  const best = entries[0] || null;
  const consultedSources = mapConsultedSources(entries);
  const supportingSource = consultedSources[0] || null;
  const evidenceScore = Number(best?.evidence_score || 0);
  const sourceCount = consultedSources.filter((item) => hasReliableInstitutionalSource(item)).length;

  if (!best || !hasReliableInstitutionalSource(supportingSource) || evidenceScore < WARNING_EVIDENCE_SCORE) {
    return {
      decision: 'ABSTAIN_AND_REVIEW',
      evidence_score: evidenceScore,
      confidence_score: evidenceScore ? Number(Math.min(0.6, evidenceScore).toFixed(3)) : 0.18,
      hallucination_risk_level: 'HIGH',
      review_required: true,
      review_reason: 'insufficient_institutional_evidence',
      supporting_source: supportingSource,
      consulted_sources: consultedSources
    };
  }

  if (sourceCount >= 1 && evidenceScore >= SAFE_EVIDENCE_SCORE) {
    return {
      decision: 'SAFE_TO_ANSWER',
      evidence_score: evidenceScore,
      confidence_score: Number(Math.min(0.96, 0.55 + (evidenceScore * 0.45)).toFixed(3)),
      hallucination_risk_level: 'LOW',
      review_required: false,
      review_reason: null,
      supporting_source: supportingSource,
      consulted_sources: consultedSources
    };
  }

  return {
    decision: 'ANSWER_WITH_WARNING',
    evidence_score: evidenceScore,
    confidence_score: Number(Math.min(0.82, 0.45 + (evidenceScore * 0.4)).toFixed(3)),
    hallucination_risk_level: 'MEDIUM',
    review_required: true,
    review_reason: 'weak_evidence_requires_follow_up',
    supporting_source: supportingSource,
    consulted_sources: consultedSources
  };
}

function buildAbstentionReply(intentProfile = null) {
  const focus = intentProfile?.label ? ' sobre ' + intentProfile.label : '';
  return 'Quero te ajudar com isso' + focus + ', mas ainda nao encontrei um registro institucional suficiente e versionado para responder com seguranca. Se voce puder me dizer o tema exato, como calendario, matricula, documentos ou atendimento, eu tento localizar a orientacao correta por outro caminho.';
}

function buildFlowSafeFallbackReply(intentProfile = null) {
  const area = intentProfile?.area;
  const focus = intentProfile?.label ? ' sobre ' + intentProfile.label : '';

  if (area === 'administration.direction') {
    return 'Quero te ajudar com isso' + focus + ', mas ainda nao encontrei base institucional suficiente para seguir com seguranca. Se quiser, voce pode dizer claramente que deseja falar com a Direcao, ou descrever o tema com mais detalhe para eu tentar localizar uma orientacao valida.';
  }

  if (area === 'administration.secretariat') {
    return 'Quero te ajudar com isso' + focus + ', mas ainda nao encontrei base institucional suficiente para seguir com seguranca. Se quiser, voce pode dizer claramente que deseja falar com a Secretaria, ou detalhar melhor o assunto para eu tentar localizar a orientacao correta.';
  }

  return buildAbstentionReply(intentProfile);
}

function buildGreetingReply(identity) {
  let intro = 'Ola! Sou a Assistente Publica';
  if (identity && identity.schoolName && identity.networkName) {
    intro += ' da ' + identity.schoolName + ', vinculada a ' + identity.networkName;
  } else if (identity && identity.schoolName) {
    intro += ' da ' + identity.schoolName;
  } else {
    intro += ' da rede e da escola';
  }
  intro += '.';
  return intro + ' Posso orientar sobre calendario, matricula, documentos e encaminhamentos institucionais. Se precisar falar com a Secretaria ou com a Direcao, e so me dizer. Me conte sua duvida e eu sigo com voce.';
}

function buildClarificationReply() {
  return 'Posso te ajudar, sim. Me conte qual assunto voce precisa resolver, por exemplo calendario, matricula, documentos ou atendimento da escola, que eu continuo daqui.';
}

function buildCapabilityReply(intentProfile = null) {
  if (!intentProfile?.key) {
    return 'Posso orientar sobre calendario escolar, matricula, documentos, contato e atendimento da escola, vida escolar, comunicados institucionais e encaminhamentos para a Secretaria ou a Direcao. Se voce me disser o tema exato, eu sigo por esse assunto.';
  }

  if (intentProfile.key === 'calendar') {
    return 'Sim. Posso orientar sobre calendario escolar, datas oficiais, feriados, recesso, inicio e fim do periodo letivo e eventos institucionais da escola. Se quiser, me diga sua duvida exata sobre calendario.';
  }

  if (intentProfile.key === 'enrollment') {
    return 'Sim. Posso orientar sobre matricula, rematricula, cronograma, documentos exigidos e encaminhamentos da Secretaria. Se quiser, me diga sua duvida exata sobre matricula.';
  }

  if (intentProfile.key === 'documents') {
    return 'Sim. Posso orientar sobre documentos escolares, declaracoes, historico, comprovantes e outros encaminhamentos da Secretaria. Se quiser, me diga qual documento voce precisa.';
  }

  if (intentProfile.key === 'contact') {
    return 'Sim. Posso orientar sobre contato, horario de atendimento, endereco e canais institucionais da escola. Se quiser, me diga a informacao exata que voce procura.';
  }

  if (intentProfile.key === 'student-life') {
    return 'Sim. Posso orientar sobre vida escolar, como uniforme, transporte, merenda, boletim e frequencia, quando houver base institucional para isso. Se quiser, me diga sua duvida exata.';
  }

  if (intentProfile.key === 'governance') {
    return 'Sim. Posso orientar sobre comunicados oficiais, normas institucionais e encaminhamentos para a Direcao. Se quiser, me diga o tema exato que eu sigo por esse assunto.';
  }

  return 'Sim. Posso orientar sobre ' + intentProfile.label + '. Se quiser, me diga sua duvida exata sobre esse assunto.';
}

function buildWarningPrefix() {
  return 'Encontrei apenas base institucional parcial para esta pergunta. Vou responder de forma conservadora e limitada ao que esta registrado.';
}

function buildSourceBackedFallback(entries = []) {
  if (!entries.length) {
    return 'Nao encontrei base institucional suficiente para responder com seguranca.';
  }

  const primary = entries[0] || {};
  const sourceTitle = primary.source_title || 'fonte institucional';
  const sourceVersion = primary.source_version_label || primary.source_version_number || 'sem versao identificada';
  const excerpt = String(primary.answer || primary.question || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);

  if (!excerpt) {
    return 'Localizei a fonte ' + sourceTitle + ' (' + sourceVersion + '), mas o trecho recuperado esta incompleto para uma resposta segura.';
  }

  return excerpt + ' Fonte utilizada: ' + sourceTitle + ' (' + sourceVersion + ').';
}

function parseCalendarDateToLocal(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatDateLabel(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

function formatRangeLabel(startDate, endDate) {
  if (!startDate) return '';
  if (!endDate || startDate.getTime() === endDate.getTime()) return formatDateLabel(startDate);
  return formatDateLabel(startDate) + ' a ' + formatDateLabel(endDate);
}

function normalizeCalendarEntry(entry = {}) {
  const startDate = parseCalendarDateToLocal(entry.start_date);
  const endDate = parseCalendarDateToLocal(entry.end_date || entry.start_date) || startDate;
  const matcherText = buildCalendarMatcherText(entry);
  return {
    ...entry,
    startDate,
    endDate,
    haystack: normalizeConversationText([entry.title, entry.event_type, entry.notes].filter(Boolean).join(' ')),
    matcherText
  };
}

function normalizeCalendarMatcherText(value) {
  return normalizeConversationText(value)
    .replace(/\bprimeiro\b/g, '1')
    .replace(/\bsegundo\b/g, '2')
    .replace(/\bterceiro\b/g, '3')
    .replace(/\bquarto\b/g, '4')
    .replace(/\b1o\b/g, '1')
    .replace(/\b2o\b/g, '2')
    .replace(/\b3o\b/g, '3')
    .replace(/\b4o\b/g, '4')
    .replace(/\bsemestre letivo\b/g, 'semestre periodo letivo')
    .replace(/\bano escolar\b/g, 'ano letivo')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCalendarMatcherText(entry = {}) {
  const title = String(entry.title || '');
  const eventType = String(entry.event_type || '');
  const notes = String(entry.notes || '');
  const audience = String(entry.audience || '');
  const aliases = [];
  const combined = normalizeCalendarMatcherText([title, eventType, notes, audience].filter(Boolean).join(' '));

  if (combined.includes('periodo letivo')) aliases.push('periodo letivo', 'inicio do periodo letivo', 'fim do periodo letivo');
  if (combined.includes('semestre')) aliases.push('semestre', 'periodo semestral');
  if (combined.includes('1 semestre')) aliases.push('1 semestre', 'primeiro semestre', '1 periodo letivo', 'primeiro periodo letivo');
  if (combined.includes('2 semestre')) aliases.push('2 semestre', 'segundo semestre', '2 periodo letivo', 'segundo periodo letivo');
  if (combined.includes('ano letivo')) aliases.push('ano letivo', 'inicio do ano letivo', 'fim do ano letivo');
  if (combined.includes('inicio') && combined.includes('aula')) aliases.push('quando comecam as aulas', 'inicio das aulas');
  if ((combined.includes('fim') || combined.includes('termino') || combined.includes('encerramento')) && combined.includes('aula')) aliases.push('fim das aulas', 'termino das aulas', 'ultimo dia de aula');

  return normalizeCalendarMatcherText([title, eventType, notes, audience, ...aliases].filter(Boolean).join(' '));
}

function buildCalendarSource(context, excerpt) {
  const sourceRecord = context?.school_record || context?.network_record || {};
  return {
    source_document_id: sourceRecord.source_document_id || null,
    source_title: sourceRecord.title || context?.title || 'Calendario da Rede/Secretaria',
    source_version_id: sourceRecord.source_version_id || null,
    source_version_label: sourceRecord.status === 'published' ? 'publicado' : (sourceRecord.status || 'publicado'),
    source_excerpt: excerpt || context?.summary || '',
    evidence_score: 0.96,
    retrieval_method: 'official_content'
  };
}

function detectStructuredCalendarQuestion(text) {
  const value = normalizeCalendarMatcherText(text);
  if (!value) return null;
  if (value.includes('feriado') && (value.includes('mais proximo') || value.includes('proximo') || value.includes('proxima'))) {
    return { kind: 'next_holiday' };
  }
  if (value.includes('ferias')) {
    return { kind: 'vacation' };
  }
  if (value.includes('reuniao de pais')) {
    return { kind: 'parents_meeting' };
  }
  if (hasCalendarDateIntent(value)) {
    return {
      kind: 'date_lookup',
      query: value,
      intent: extractCalendarDateIntent(value)
    };
  }
  return null;
}

function hasCalendarDateIntent(value) {
  if (!value) return false;
  const hasDateCue = [
    'que dia', 'qual dia', 'qual data', 'quando', 'data', 'vai de', 'ate que dia', 'ate quando',
    'comeca', 'comeca', 'inicio', 'termina', 'termino', 'fim'
  ].some((term) => value.includes(term));
  const hasCalendarSubject = [
    'semestre', 'bimestre', 'trimestre', 'ano letivo', 'periodo letivo', 'periodo escolar',
    'aulas', 'recesso', 'ferias', 'feriado', 'reuniao', 'conselho', 'avaliacao', 'matricula'
  ].some((term) => value.includes(term));
  return hasDateCue && hasCalendarSubject;
}

function extractCalendarDateIntent(value) {
  const normalized = normalizeCalendarMatcherText(value);
  return {
    wantsRange: normalized.includes('vai de') || normalized.includes('de que dia') || normalized.includes('qual o periodo') || normalized.includes('qual periodo') || normalized.includes('entre que datas') || normalized.includes('de quando ate quando'),
    wantsStart: normalized.includes('quando comeca') || normalized.includes('quando começa') || normalized.includes('inicio') || normalized.includes('data de inicio') || normalized.includes('comeca') || normalized.includes('comeca'),
    wantsEnd: normalized.includes('quando termina') || normalized.includes('termina') || normalized.includes('termino') || normalized.includes('fim') || normalized.includes('data final') || normalized.includes('ultimo dia') || normalized.includes('acaba'),
    query: normalized
  };
}

function scoreCalendarEntryForDateQuery(entry, query) {
  if (!entry?.matcherText || !query) return 0;
  const tokens = [...new Set(query.split(' ').filter((token) => token.length >= 2))];
  let score = 0;

  tokens.forEach((token) => {
    if (entry.matcherText.includes(token)) score += 2;
  });

  if (query.includes('periodo letivo') && entry.matcherText.includes('periodo letivo')) score += 8;
  if (query.includes('ano letivo') && entry.matcherText.includes('ano letivo')) score += 7;
  if (query.includes('semestre') && entry.matcherText.includes('semestre')) score += 8;
  if (query.includes('1 semestre') && entry.matcherText.includes('1 semestre')) score += 12;
  if (query.includes('2 semestre') && entry.matcherText.includes('2 semestre')) score += 12;
  if (query.includes('aulas') && entry.matcherText.includes('aulas')) score += 5;
  if (query.includes('matricula') && entry.matcherText.includes('matricula')) score += 5;

  if (query.includes('semestre') && !entry.matcherText.includes('semestre')) score -= 5;
  if (query.includes('1 semestre') && entry.matcherText.includes('2 semestre')) score -= 8;
  if (query.includes('2 semestre') && entry.matcherText.includes('1 semestre')) score -= 8;
  if (query.includes('ano letivo') && !entry.matcherText.includes('ano letivo') && !entry.matcherText.includes('periodo letivo')) score -= 2;

  return score;
}

function findBestCalendarEntryForDateQuery(entries, question) {
  const scored = entries
    .map((entry) => ({ entry, score: scoreCalendarEntryForDateQuery(entry, question?.query || '') }))
    .filter((item) => item.entry?.startDate && item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.entry.startDate - right.entry.startDate;
    });

  return scored.length ? scored[0].entry : null;
}

function buildStructuredCalendarDateAnswer(entry, question) {
  const title = entry.title || 'evento do calendario';
  const hasRange = entry.endDate && entry.startDate && entry.endDate.getTime() !== entry.startDate.getTime();
  if (question?.intent?.wantsRange && hasRange) {
    return 'Segundo o calendario oficial, ' + title + ' vai de ' + formatDateLabel(entry.startDate) + ' a ' + formatDateLabel(entry.endDate) + '.';
  }
  if (question?.intent?.wantsStart && !question?.intent?.wantsEnd) {
    return 'Segundo o calendario oficial, ' + title + ' comeca em ' + formatDateLabel(entry.startDate) + '.';
  }
  if (question?.intent?.wantsEnd && entry.endDate) {
    return 'Segundo o calendario oficial, ' + title + ' termina em ' + formatDateLabel(entry.endDate) + '.';
  }
  if (hasRange) {
    return 'Segundo o calendario oficial, ' + title + ' vai de ' + formatDateLabel(entry.startDate) + ' a ' + formatDateLabel(entry.endDate) + '.';
  }
  return 'Segundo o calendario oficial, ' + title + ' acontece em ' + formatDateLabel(entry.startDate) + '.';
}

function findNextCalendarEvent(entries, matcher) {
  const today = startOfToday();
  return entries
    .filter((entry) => entry.startDate && entry.endDate && matcher(entry))
    .sort((left, right) => left.startDate - right.startDate)
    .find((entry) => entry.endDate >= today) || null;
}

function findUpcomingVacationPeriod(entries) {
  const today = startOfToday();
  const vacationEntries = entries
    .filter((entry) => entry.startDate && entry.endDate && entry.haystack.includes('ferias'))
    .sort((left, right) => left.startDate - right.startDate);
  if (!vacationEntries.length) return null;

  const periods = [];
  vacationEntries.forEach((entry) => {
    const last = periods[periods.length - 1];
    if (!last) {
      periods.push({ startDate: entry.startDate, endDate: entry.endDate });
      return;
    }
    const nextAllowed = new Date(last.endDate);
    nextAllowed.setDate(nextAllowed.getDate() + 1);
    if (entry.startDate <= nextAllowed) {
      if (entry.endDate > last.endDate) last.endDate = entry.endDate;
      return;
    }
    periods.push({ startDate: entry.startDate, endDate: entry.endDate });
  });

  return periods.find((period) => period.endDate >= today) || periods[0] || null;
}

async function tryBuildStructuredCalendarReply(text, schoolId) {
  const question = detectStructuredCalendarQuestion(text);
  if (!question || !schoolId) return null;

  const calendarContext = await findPublishedCalendarContext(schoolId);
  if (!calendarContext?.merged_entries?.length) return null;

  const entries = calendarContext.merged_entries.map(normalizeCalendarEntry);

  if (question.kind === 'next_holiday') {
    const nextHoliday = findNextCalendarEvent(entries, (entry) => entry.haystack.includes('feriado'));
    if (!nextHoliday) return null;
    const excerpt = nextHoliday.title + ' em ' + formatRangeLabel(nextHoliday.startDate, nextHoliday.endDate);
    const source = buildCalendarSource(calendarContext, excerpt);
    return {
      text: 'O proximo feriado registrado no calendario oficial e ' + nextHoliday.title + ', em ' + formatRangeLabel(nextHoliday.startDate, nextHoliday.endDate) + '.',
      audit: {
        assistant_key: 'public.assistant',
        assistant_name: 'Assistente Publico',
        confidence_score: 0.94,
        evidence_score: 0.96,
        hallucination_risk_level: 'LOW',
        review_required: false,
        review_reason: null,
        response_mode: 'AUTOMATIC_STRUCTURED_CALENDAR',
        consulted_sources: [source],
        supporting_source: source,
        fallback_to_human: false,
        abstained: false,
        source_card: buildSourceCard(source)
      }
    };
  }

  if (question.kind === 'vacation') {
    const vacationPeriod = findUpcomingVacationPeriod(entries);
    if (!vacationPeriod) return null;
    const excerpt = 'Ferias escolares em ' + formatRangeLabel(vacationPeriod.startDate, vacationPeriod.endDate);
    const source = buildCalendarSource(calendarContext, excerpt);
    return {
      text: 'Segundo o calendario oficial, o proximo periodo de ferias escolares vai de ' + formatDateLabel(vacationPeriod.startDate) + ' a ' + formatDateLabel(vacationPeriod.endDate) + '.',
      audit: {
        assistant_key: 'public.assistant',
        assistant_name: 'Assistente Publico',
        confidence_score: 0.94,
        evidence_score: 0.96,
        hallucination_risk_level: 'LOW',
        review_required: false,
        review_reason: null,
        response_mode: 'AUTOMATIC_STRUCTURED_CALENDAR',
        consulted_sources: [source],
        supporting_source: source,
        fallback_to_human: false,
        abstained: false,
        source_card: buildSourceCard(source)
      }
    };
  }

  if (question.kind === 'parents_meeting') {
    const nextMeeting = findNextCalendarEvent(entries, (entry) => entry.haystack.includes('reuniao') && (entry.haystack.includes('pais') || entry.haystack.includes('mestres') || entry.haystack.includes('familia')));
    if (!nextMeeting) return null;
    const excerpt = nextMeeting.title + ' em ' + formatRangeLabel(nextMeeting.startDate, nextMeeting.endDate);
    const source = buildCalendarSource(calendarContext, excerpt);
    return {
      text: 'A proxima reuniao registrada no calendario oficial e ' + nextMeeting.title + ', em ' + formatRangeLabel(nextMeeting.startDate, nextMeeting.endDate) + '.',
      audit: {
        assistant_key: 'public.assistant',
        assistant_name: 'Assistente Publico',
        confidence_score: 0.92,
        evidence_score: 0.95,
        hallucination_risk_level: 'LOW',
        review_required: false,
        review_reason: null,
        response_mode: 'AUTOMATIC_STRUCTURED_CALENDAR',
        consulted_sources: [source],
        supporting_source: source,
        fallback_to_human: false,
        abstained: false,
        source_card: buildSourceCard(source)
      }
    };
  }

  if (question.kind === 'date_lookup') {
    const matchedEntry = findBestCalendarEntryForDateQuery(entries, question);
    if (!matchedEntry) return null;
    const excerpt = matchedEntry.title + ' em ' + formatRangeLabel(matchedEntry.startDate, matchedEntry.endDate);
    const source = buildCalendarSource(calendarContext, excerpt);
    return {
      text: buildStructuredCalendarDateAnswer(matchedEntry, question),
      audit: {
        assistant_key: 'public.assistant',
        assistant_name: 'Assistente Publico',
        confidence_score: 0.94,
        evidence_score: 0.96,
        hallucination_risk_level: 'LOW',
        review_required: false,
        review_reason: null,
        response_mode: 'AUTOMATIC_STRUCTURED_CALENDAR',
        consulted_sources: [source],
        supporting_source: source,
        fallback_to_human: false,
        abstained: false,
        source_card: buildSourceCard(source)
      }
    };
  }

  return null;
}

module.exports = {
  name: "Assistente Publico",
  description: "Triagem institucional orientada por fonte e versionamento.",

  async handleMessage(from, userMessage) {
    const text = String(userMessage?.text || userMessage || "").trim();
    const resolvedSchoolId = String(userMessage?.school_id || userMessage?.metadata?.school_id || SCHOOL_ID || '').trim();

    const session = getSession(from) || { step: 0, data: { history: [] } };
    session.data = session.data || {};
    session.data.history = Array.isArray(session.data.history) ? session.data.history : [];

    if (!text || String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("audio")) {
      return {
        text: "Este canal atende somente por texto. Envie sua consulta por escrito e eu sigo com a triagem institucional.",
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: 0.35,
          evidence_score: 0.1,
          hallucination_risk_level: 'LOW',
          review_required: false,
          review_reason: null,
          response_mode: "AUTOMATIC",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: false,
          abstained: false
        }
      };
    }

    if (session.data.pending_route?.area) {
      const pendingArea = session.data.pending_route.area;

      if (isReturnIntent(text)) {
        session.data.pending_route = null;
        setSession(from, session);
      } else if (isRouteConfirmationAccepted(text)) {
        session.data.pending_route = null;
        session.data.routed_agent = pendingArea;
        setSession(from, session);
        const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
        const redirectMsg = buildRedirectionReply(pendingArea, identity);
        return {
          text: redirectMsg,
          audit: {
            assistant_key: pendingArea,
            assistant_name: (AGENT_LABELS[pendingArea] || {}).name || 'Assistente',
            confidence_score: 0.88,
            evidence_score: 0.5,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_REDIRECT',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      } else if (isRouteConfirmationRejected(text)) {
        session.data.pending_route = null;
        setSession(from, session);
        return {
          text: buildRouteCancellationReply(Boolean(session.data.routed_agent)),
          audit: {
            assistant_key: session.data.routed_agent || 'public.assistant',
            assistant_name: ((AGENT_LABELS[session.data.routed_agent] || {}).name) || 'Assistente Publico',
            confidence_score: 0.72,
            evidence_score: 0.24,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_CLARIFICATION',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      } else {
        const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
        return {
          text: buildRouteProposalReply(pendingArea, identity),
          audit: {
            assistant_key: 'public.assistant',
            assistant_name: 'Assistente Publico',
            confidence_score: 0.74,
            evidence_score: 0.26,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_CLARIFICATION',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      }
    }

    // If the user was previously routed to a specialized agent, keep routing there
    if (session.data.routed_agent) {
      const routedArea = session.data.routed_agent;

      // "voltar", "outro assunto" → reset to receptionist
      if (isReturnIntent(text)) {
        session.data.routed_agent = null;
        setSession(from, session);
        const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
        return {
          text: buildGreetingReply(identity),
          audit: {
            assistant_key: 'public.assistant',
            assistant_name: 'Assistente Publico',
            confidence_score: 0.52,
            evidence_score: 0.18,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_GREETING',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      }

      // Redirect to a DIFFERENT area
      const newArea = detectArea(text);
      if (newArea && newArea !== routedArea && isRedirectionIntent(text)) {
        session.data.pending_route = { area: newArea };
        setSession(from, session);
        const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
        const redirectMsg = buildRouteProposalReply(newArea, identity);
        if (redirectMsg) {
          return {
            text: redirectMsg,
            audit: {
              assistant_key: 'public.assistant',
              assistant_name: 'Assistente Publico',
              confidence_score: 0.74,
              evidence_score: 0.26,
              hallucination_risk_level: 'LOW',
              review_required: false,
              review_reason: null,
              response_mode: 'AUTOMATIC_CLARIFICATION',
              consulted_sources: [],
              supporting_source: null,
              fallback_to_human: false,
              abstained: false
            }
          };
        }
      }

      // Greeting while routed → agent-specific greeting
      if (isGreetingIntent(text)) {
        return {
          text: buildRoutedGreeting(routedArea),
          audit: {
            assistant_key: routedArea,
            assistant_name: (AGENT_LABELS[routedArea] || {}).name || 'Assistente',
            confidence_score: 0.52,
            evidence_score: 0.18,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_GREETING',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      }

      // Confirmation / meta-question ("falo com a secretaria?", "sim", etc.)
      if (isRoutingMetaQuestion(text)) {
        return {
          text: buildRoutingConfirmation(routedArea),
          audit: {
            assistant_key: routedArea,
            assistant_name: (AGENT_LABELS[routedArea] || {}).name || 'Assistente',
            confidence_score: 0.88,
            evidence_score: 0.5,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_REDIRECT',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      }

      // Content question → delegate to the routed agent
      const routedAgentMap = {
        'administration.secretariat': agents.administration.secretariat,
        'administration.treasury': agents.administration.treasury,
        'administration.direction': agents.administration.direction
      };
      const routedHandler = routedAgentMap[routedArea];
      if (routedHandler) {
        const intentProfile = detectIntentProfile(text);
        return routedHandler.handleMessage(from, { text, school_id: resolvedSchoolId, intent_profile: intentProfile });
      }
    }

    if (isGreetingIntent(text)) {
      const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
      return {
        text: buildGreetingReply(identity),
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: 0.52,
          evidence_score: 0.18,
          hallucination_risk_level: 'LOW',
          review_required: false,
          review_reason: null,
          response_mode: "AUTOMATIC_GREETING",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: false,
          abstained: false
        }
      };
    }


    const safetyIssue = detectAssistantSafetyIssue(text);
    if (safetyIssue) {
      const isAbuse = ['threat', 'harassment', 'profanity'].includes(safetyIssue.type);
      return {
        text: buildSafetyRedirectMessage({
          issue: safetyIssue,
          scopeLabel: 'assuntos institucionais e escolares',
          scopeReturnLabel: 'algo relacionado a secretaria, calendario, documentos, atendimento ou outro tema da escola',
          humanHandoffLabel: 'um responsavel da escola, um familiar ou outro adulto de confianca',
          humanHandoffAction: 'Procure um responsavel da escola, um familiar ou outro adulto de confianca'
        }),
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: 0.42,
          evidence_score: 0.12,
          hallucination_risk_level: safetyIssue.severity === 'high' ? 'HIGH' : 'MEDIUM',
          review_required: isAbuse,
          review_reason: isAbuse ? `safety_${safetyIssue.type}` : 'safety_redirect',
          response_mode: "AUTOMATIC_LIMITED",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: !isAbuse,
          abstained: false
        }
      };
    }

    const intentProfile = detectIntentProfile(text);
    const capabilityIntent = detectCapabilityIntent(text, { intentProfile });
    if (capabilityIntent) {
      return {
        text: capabilityIntent.kind === 'topic'
          ? buildCapabilityReply(capabilityIntent.intentProfile)
          : buildCapabilityReply(),
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: capabilityIntent.kind === 'topic' ? 0.82 : 0.78,
          evidence_score: 0.22,
          hallucination_risk_level: 'LOW',
          review_required: false,
          review_reason: null,
          response_mode: "AUTOMATIC_CAPABILITY",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: false,
          abstained: false
        }
      };
    }

    const structuredCalendarReply = await tryBuildStructuredCalendarReply(text, resolvedSchoolId || SCHOOL_ID);
    if (structuredCalendarReply) {
      return structuredCalendarReply;
    }
    const area = detectArea(text) || intentProfile?.area || null;
    if (area && isRedirectionIntent(text)) {
      const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
      const redirectMsg = buildRouteProposalReply(area, identity);
      if (redirectMsg) {
        session.data.pending_route = { area };
        setSession(from, session);
        return {
          text: redirectMsg,
          audit: {
            assistant_key: 'public.assistant',
            assistant_name: 'Assistente Publico',
            confidence_score: 0.74,
            evidence_score: 0.26,
            hallucination_risk_level: 'LOW',
            review_required: false,
            review_reason: null,
            response_mode: 'AUTOMATIC_CLARIFICATION',
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false,
            abstained: false
          }
        };
      }
    }
    const retrievalText = intentProfile?.searchHints?.length
      ? [text, ...intentProfile.searchHints].join(' | ')
      : text;

    const entries = await findMatchingEntries(retrievalText, resolvedSchoolId || SCHOOL_ID, {
      categories: mergeKnowledgeCategories(["Atendimento Publico", "Institucional", "Secretaria", "Direcao"], intentProfile),
      excludeDocumentTypes: ['teaching_material'],
      limit: 3
    });
    const assessment = buildEvidenceAssessment(entries);

    if (assessment.decision === 'ABSTAIN_AND_REVIEW') {
      return {
        text: buildFlowSafeFallbackReply(intentProfile),
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: assessment.confidence_score,
          evidence_score: assessment.evidence_score,
          hallucination_risk_level: assessment.hallucination_risk_level,
          review_required: assessment.review_required,
          review_reason: assessment.review_reason,
          response_mode: 'ABSTAINED',
          consulted_sources: assessment.consulted_sources,
          supporting_source: assessment.supporting_source,
          fallback_to_human: true,
          abstained: true,
          source_card: buildSourceCard(assessment.supporting_source)
        }
      };
    }

    const prompt = [
      "Voce e o Assistente Publico de uma instituicao de ensino.",
      "Objetivo: acolher a consulta, responder somente com base em fonte institucional e encaminhar para a area correta quando necessario.",
      "Tom esperado: fale como uma recepcionista institucional, com linguagem simples, acolhedora e objetiva.",
      buildAssistantGuardrails({
        assistantName: 'Assistente Publico',
        scopeLabel: 'assuntos institucionais e escolares',
        scopeReturnLabel: 'algo relacionado a escola',
        allowedTopicLabel: 'matricula, documentos, calendario, horarios, atendimento, comunicados e demais temas institucionais da escola',
        blockedTopicsLabel: 'desabafos pessoais, terapia, saude pessoal e temas sem relacao com a escola',
        humanHandoffLabel: 'a secretaria, a direcao ou a area responsavel',
        humanHandoffAction: 'encaminhar para a secretaria, a direcao ou a area responsavel',
        greetingInstruction: 'Se a mensagem for apenas uma saudacao, apresente-se brevemente e diga que pode ajudar com temas institucionais da escola.',
        redirectInstruction: 'Se o assunto estiver fora do escopo escolar, recuse com educacao e redirecione para um tema institucional da escola.',
        noInfoMessage: 'Nao encontrei base institucional suficiente para responder com seguranca.',
        useEmojis: false
      }),
      "Regras:",
      "1. Responda em portugues do Brasil.",
      "2. Nao invente normas, prazos, decisoes, documentos ou compromissos institucionais.",
      "3. Limite-se estritamente ao que estiver sustentado pelas fontes recuperadas.",
      "4. Sempre cite explicitamente a fonte e a versao usadas quando houver base encontrada.",
      "5. Se a base estiver incompleta, diga isso com clareza e nao preencha lacunas com suposicoes.",
      `Sinal de evidencia principal: ${assessment.evidence_score.toFixed(2)}.`,
      `Fontes recuperadas:\n${formatSources(entries)}`
    ].join("\n");

    const reply = await askAI(prompt, text, session.data.history);
    const normalizedReply = String(reply || '').trim();
    let finalReply = normalizedReply || 'Nao consegui concluir essa consulta agora. Tente reformular em uma frase objetiva.';
    if (normalize(normalizedReply).includes('instabilidade tecnica no momento')) {
      finalReply = buildSourceBackedFallback(entries);
    }
    if (assessment.decision === 'ANSWER_WITH_WARNING') {
      finalReply = `${buildWarningPrefix()} ${finalReply}`.trim();
    }
    finalReply = appendSourceCitation(finalReply, assessment.supporting_source);

    session.data.history = [
      ...session.data.history,
      { role: "user", content: text },
      { role: "assistant", content: finalReply }
    ].slice(-8);

    setSession(from, session);

    return {
      text: finalReply,
      audit: {
        assistant_key: "public.assistant",
        assistant_name: "Assistente Publico",
        confidence_score: assessment.confidence_score,
        evidence_score: assessment.evidence_score,
        hallucination_risk_level: assessment.hallucination_risk_level,
        review_required: assessment.review_required,
        review_reason: assessment.review_reason,
        response_mode: assessment.decision === 'ANSWER_WITH_WARNING' ? 'AUTOMATIC_LIMITED' : 'AUTOMATIC',
        consulted_sources: assessment.consulted_sources,
        supporting_source: assessment.supporting_source,
        fallback_to_human: assessment.review_required,
        abstained: false,
        source_card: buildSourceCard(assessment.supporting_source)
      }
    };
  }
};




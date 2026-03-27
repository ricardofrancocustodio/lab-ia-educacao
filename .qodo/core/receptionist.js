const path = require("path");

const { askAI } = require(path.resolve("./.qodo/services/ai/index.js"));
const { findMatchingEntries, findPublishedCalendarContext, loadSchoolContext } = require(path.resolve("./.qodo/services/supabase.js"));
const { getSession, setSession } = require(path.resolve("./.qodo/store/sessions.js"));
const agents = require(path.resolve("./.qodo/agents/index.js"));

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
    area: 'administration.treasury',
    categories: ['Tesouraria', 'Atendimento Publico'],
    keywords: ['financeiro', 'pagamento', 'repasse', 'orcamento', 'empenho'],
    searchHints: ['informacao financeira'],
    label: 'financeiro'
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
  if (identity && identity.schoolName) {
    msg += ' da ' + identity.schoolName;
  }
  msg += '. Pode fazer sua pergunta sobre ' + agent.area + ' que eu sigo com o atendimento. Se quiser voltar ao atendimento geral, e so me dizer.';
  return msg;
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

function isGeneralHelpIntent(text) {
  const value = normalizeConversationText(text);
  return [
    "preciso de ajuda",
    "pode me ajudar",
    "quero ajuda",
    "tenho uma duvida",
    "tenho uma pergunta",
    "quero uma informacao",
    "quero informacao",
    "gostaria de informacao",
    "preciso de informacao"
  ].some((term) => value === term || value.startsWith(term + " "));
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
    return "administration.treasury";
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
    source_title: entry.source_title || null,
    source_version_id: entry.source_version_id || null,
    source_version_label: entry.source_version_label || entry.source_version_number || null,
    source_excerpt: entry.answer || entry.question || null,
    evidence_score: entry.evidence_score ?? null,
    retrieval_method: entry.retrieval_method || null
  }));
}

function hasReliableInstitutionalSource(source = {}) {
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
  return 'Quero te ajudar com isso' + focus + ', mas ainda nao encontrei um registro institucional suficiente e versionado para responder com seguranca. Se voce puder me dizer o tema exato, como calendario, matricula, documentos, financeiro ou atendimento, eu tento localizar a orientacao correta por outro caminho.';
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
  return intro + ' Posso orientar sobre calendario, matricula, documentos, financeiro e encaminhamentos institucionais. Se precisar falar com a Secretaria, Tesouraria ou Direcao, e so me dizer. Me conte sua duvida e eu sigo com voce.';
}

function buildClarificationReply() {
  return 'Posso te ajudar, sim. Me conte qual assunto voce precisa resolver, por exemplo calendario, matricula, documentos, financeiro ou atendimento da escola, que eu continuo daqui.';
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
  return {
    ...entry,
    startDate,
    endDate,
    haystack: normalizeConversationText([entry.title, entry.event_type, entry.notes].filter(Boolean).join(' '))
  };
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
  const value = normalizeConversationText(text);
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
  return null;
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
        session.data.routed_agent = newArea;
        setSession(from, session);
        const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
        const redirectMsg = buildRedirectionReply(newArea, identity);
        if (redirectMsg) {
          return {
            text: redirectMsg,
            audit: {
              assistant_key: newArea,
              assistant_name: (AGENT_LABELS[newArea] || {}).name || 'Assistente',
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

    if (isGeneralHelpIntent(text)) {
      return {
        text: buildClarificationReply(),
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: 0.48,
          evidence_score: 0.16,
          hallucination_risk_level: 'LOW',
          review_required: false,
          review_reason: null,
          response_mode: "AUTOMATIC_CLARIFICATION",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: false,
          abstained: false
        }
      };
    }

    const intentProfile = detectIntentProfile(text);
    const structuredCalendarReply = await tryBuildStructuredCalendarReply(text, resolvedSchoolId || SCHOOL_ID);
    if (structuredCalendarReply) {
      return structuredCalendarReply;
    }
    const area = detectArea(text) || intentProfile?.area || null;
    if (area && isRedirectionIntent(text)) {
      const identity = await resolveSchoolIdentity(resolvedSchoolId, userMessage?.metadata);
      const redirectMsg = buildRedirectionReply(area, identity);
      if (redirectMsg) {
        session.data.routed_agent = area;
        setSession(from, session);
        return {
          text: redirectMsg,
          audit: {
            assistant_key: area,
            assistant_name: (AGENT_LABELS[area] || {}).name || 'Assistente',
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
    }
    if (area === "administration.secretariat") {
      return agents.administration.secretariat.handleMessage(from, { text, school_id: resolvedSchoolId, intent_profile: intentProfile });
    }
    if (area === "administration.treasury") {
      return agents.administration.treasury.handleMessage(from, { text, school_id: resolvedSchoolId, intent_profile: intentProfile });
    }
    if (area === "administration.direction") {
      return agents.administration.direction.handleMessage(from, { text, school_id: resolvedSchoolId, intent_profile: intentProfile });
    }

    const retrievalText = intentProfile?.searchHints?.length
      ? [text, ...intentProfile.searchHints].join(' | ')
      : text;

    const entries = await findMatchingEntries(retrievalText, resolvedSchoolId || SCHOOL_ID, {
      categories: mergeKnowledgeCategories(["Atendimento Publico", "Institucional", "Secretaria", "Tesouraria", "Direcao"], intentProfile),
      limit: 3
    });
    const assessment = buildEvidenceAssessment(entries);

    if (assessment.decision === 'ABSTAIN_AND_REVIEW') {
      return {
        text: buildAbstentionReply(intentProfile),
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




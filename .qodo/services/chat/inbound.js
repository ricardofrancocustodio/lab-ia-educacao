const path = require("path");
const receptionist = require(path.resolve("./.qodo/core/receptionist.js"));
const agents = require(path.resolve("./.qodo/agents/index.js"));
const {
  ensureConversation,
  appendConversationMessage
} = require(path.resolve("./.qodo/services/chat/handoffStore.js"));
const { recordConsultationEvent } = require(path.resolve("./.qodo/services/supabase.js"));

const ASSISTANT_LABELS = {
  "public.assistant": "Assistente Publico",
  "administration.secretariat": "Assistente da Secretaria",
  "administration.treasury": "Assistente da Tesouraria",
  "administration.direction": "Assistente da Direcao"
};

function getAssistantLabel(key) {
  return ASSISTANT_LABELS[key] || key || "Assistente Publico";
}

function normalizeAgentKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function resolveAgent(agentKey) {
  const normalized = normalizeAgentKey(agentKey);
  if (!normalized) return null;

  const registry = {
    "administration.secretariat": agents?.administration?.secretariat,
    "administration.treasury": agents?.administration?.treasury,
    "administration.direction": agents?.administration?.direction
  };

  return registry[normalized] || null;
}

function isHumanHandoffRequest(text) {
  const normalized = String(text || "").toLowerCase();
  const keywords = [
    "falar com humano",
    "falar com um humano",
    "falar com atendente",
    "falar com uma pessoa",
    "atendimento humano",
    "quero um humano",
    "me transfere",
    "transferir para humano",
    "suporte humano"
  ];

  return keywords.some((keyword) => normalized.includes(keyword));
}

function normalizeReply(result, fallbackAgent) {
  if (result && typeof result === "object" && typeof result.text === "string") {
    return {
      text: String(result.text || "").trim(),
      audit: {
        assistant_key: result.audit?.assistant_key || fallbackAgent?.agentKey || "public.assistant",
        assistant_name: result.audit?.assistant_name || fallbackAgent?.name || "Assistente Publico",
        confidence_score: result.audit?.confidence_score ?? null,
        evidence_score: result.audit?.evidence_score ?? null,
        hallucination_risk_level: result.audit?.hallucination_risk_level || null,
        review_required: Boolean(result.audit?.review_required),
        review_reason: result.audit?.review_reason || null,
        response_mode: result.audit?.response_mode || "AUTOMATIC",
        consulted_sources: Array.isArray(result.audit?.consulted_sources) ? result.audit.consulted_sources : [],
        supporting_source: result.audit?.supporting_source || null,
        fallback_to_human: Boolean(result.audit?.fallback_to_human),
        abstained: Boolean(result.audit?.abstained)
      }
    };
  }

  return {
    text: String(result || "").trim(),
    audit: {
      assistant_key: fallbackAgent?.agentKey || "public.assistant",
      assistant_name: fallbackAgent?.name || "Assistente Publico",
      confidence_score: null,
      evidence_score: null,
      hallucination_risk_level: null,
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

function buildSourceCardPayload(source = {}) {
  if (!source || !hasReliableInstitutionalSource(source)) return null;
  return {
    title: source.source_title || 'Fonte institucional',
    version: source.source_version_label || 'publicado',
    excerpt: String(source.source_excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 220),
    evidence_score: source.evidence_score ?? null
  };
}

function buildAuditEnvelope(normalizedAudit = {}, resolvedAgent) {
  const supportingSource = normalizedAudit.supporting_source || null;
  const consultedSources = Array.isArray(normalizedAudit.consulted_sources) ? normalizedAudit.consulted_sources : [];
  const hasReliableBase = Boolean(hasReliableInstitutionalSource(supportingSource) || hasReliableInstitutionalSource(consultedSources[0] || {}));
  const evidenceScore = Number(normalizedAudit.evidence_score || 0);
  const abstained = Boolean(normalizedAudit.abstained);
  const reviewRequired = Boolean(normalizedAudit.review_required || abstained || !hasReliableBase);
  const riskLevel = normalizedAudit.hallucination_risk_level || (abstained || !hasReliableBase ? 'HIGH' : evidenceScore >= 0.78 ? 'LOW' : 'MEDIUM');

  let auditEventType = 'AUTOMATIC_RESPONSE_WITH_EVIDENCE';
  let auditSeverity = 'INFO';
  let auditReason = 'source_evidence_found';
  let auditSummary = `Resposta fundamentada registrada para ${normalizedAudit.assistant_name || resolvedAgent?.name || 'Assistente Publico'}.`;
  let fallbackArea = null;

  if (abstained) {
    auditEventType = 'HALLUCINATION_MITIGATED_ABSTENTION';
    auditSeverity = 'HIGH';
    auditReason = normalizedAudit.review_reason || 'insufficient_institutional_evidence';
    auditSummary = 'Resposta contida por mitigacao de alucinacao: sem base institucional suficiente para responder com seguranca.';
    fallbackArea = 'Curadoria institucional';
  } else if (!hasReliableBase) {
    auditEventType = 'NO_CONFIDENT_BASIS';
    auditSeverity = 'HIGH';
    auditReason = normalizedAudit.review_reason || 'no_reliable_source_found';
    auditSummary = 'Base institucional insuficiente para resposta plenamente auditavel. Revisao humana recomendada.';
    fallbackArea = 'Secretaria';
  } else if (reviewRequired || riskLevel === 'MEDIUM') {
    auditEventType = 'AUTOMATIC_RESPONSE_REQUIRES_REVIEW';
    auditSeverity = 'MEDIUM';
    auditReason = normalizedAudit.review_reason || 'weak_evidence_requires_follow_up';
    auditSummary = `Resposta automatica emitida com evidencia parcial para ${normalizedAudit.assistant_name || resolvedAgent?.name || 'Assistente Publico'}.`;
  }

  const showSourceCard = Boolean(hasReliableBase && !abstained && !reviewRequired);

  return {
    supportingSource,
    consultedSources,
    hasReliableBase,
    evidenceScore,
    abstained,
    reviewRequired,
    riskLevel,
    auditEventType,
    auditSeverity,
    auditReason,
    auditSummary,
    fallbackArea,
    showSourceCard
  };
}

async function handleInboundChat({ channel, userId, text, metadata = {} }) {
  const conversation = ensureConversation({ userId, channel, metadata });
  appendConversationMessage(userId, {
    role: "user",
    source: channel,
    text
  });

  const resolvedAgent = resolveAgent(metadata.agent_key);
  const handler = resolvedAgent || receptionist;

  let userText = text;
  if (isHumanHandoffRequest(text)) {
    userText = `${text}\n\nObservacao do sistema: informe que este canal opera com assistentes especializados e siga com a triagem automatizada.`;
  }

  const handlerPayload = typeof userText === "string"
    ? {
        text: userText,
        school_id: metadata.school_id || process.env.SCHOOL_ID || null,
        metadata: { ...(metadata || {}) }
      }
    : userText;

  const rawResult = await handler.handleMessage(userId, handlerPayload);
  const normalizedResult = normalizeReply(rawResult, resolvedAgent);
  const auditEnvelope = buildAuditEnvelope(normalizedResult.audit, resolvedAgent);
  const finalReply = isHumanHandoffRequest(text)
    ? `Este atendimento funciona com assistentes institucionais especializados, sem transferencia para humano neste canal. ${normalizedResult.text}`.trim()
    : normalizedResult.text;

  appendConversationMessage(userId, {
    role: "assistant",
    source: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || "public.assistant",
    text: finalReply
  });

  if (conversation) {
    conversation.status = "AI_ACTIVE";
    conversation.ai_enabled = true;
    conversation.updated_at = new Date().toISOString();
    conversation.metadata = {
      ...(conversation.metadata || {}),
      ...(metadata || {}),
      routed_agent: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || "public.assistant"
    };
  }

  const persistenceResult = await recordConsultationEvent({
    school_id: metadata.school_id || process.env.SCHOOL_ID || null,
    channel: String(channel || "webchat"),
    requester_id: userId,
    requester_name: metadata.parent_name || metadata.school_name || 'Solicitante',
    primary_topic: metadata.primary_topic || metadata.agent_title || metadata.agent_key || 'atendimento_institucional',
    status: 'IN_PROGRESS',
    assigned_assistant_key: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || 'public.assistant',
    assistant_name: normalizedResult.audit.assistant_name || resolvedAgent?.name || 'Assistente Publico',
    user_text: text,
    response_text: finalReply,
    source_version_id: auditEnvelope.supportingSource?.source_version_id || null,
    supporting_source_title: auditEnvelope.supportingSource?.source_title || null,
    supporting_source_excerpt: auditEnvelope.supportingSource?.source_excerpt || null,
    supporting_source_version_label: auditEnvelope.supportingSource?.source_version_label || null,
    consulted_sources: auditEnvelope.consultedSources,
    confidence_score: normalizedResult.audit.confidence_score,
    evidence_score: auditEnvelope.evidenceScore,
    hallucination_risk_level: auditEnvelope.riskLevel,
    review_required: auditEnvelope.reviewRequired,
    review_reason: auditEnvelope.auditReason,
    response_mode: normalizedResult.audit.response_mode || 'AUTOMATIC',
    fallback_to_human: Boolean(normalizedResult.audit.fallback_to_human || auditEnvelope.reviewRequired),
    delivered_at: new Date().toISOString(),
    audit_event_type: auditEnvelope.auditEventType,
    audit_severity: auditEnvelope.auditSeverity,
    audit_reason: auditEnvelope.auditReason,
    suggested_fallback_area: auditEnvelope.fallbackArea,
    abstained: auditEnvelope.abstained,
    metadata: {
      ...(metadata || {}),
      requester_profile: metadata.entrypoint || metadata.profile || metadata.channel_profile || channel || 'webchat',
      routed_agent: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || 'public.assistant'
    },
    audit_summary: auditEnvelope.auditSummary
  });

  return {
    ok: true,
    channel: String(channel || "unknown"),
    user_id: userId,
    consultation_id: persistenceResult?.consultation?.id || null,
    assistant_response_id: persistenceResult?.assistant_response?.id || null,
    reply: finalReply,
    source_card: auditEnvelope.showSourceCard ? buildSourceCardPayload(auditEnvelope.supportingSource) : null,
    metadata: {
      ...metadata,
      routed_agent: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || "public.assistant"
    }
  };
}

module.exports = { handleInboundChat };



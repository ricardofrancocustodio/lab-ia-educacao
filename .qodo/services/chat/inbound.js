const path = require("path");
const receptionist = require(path.resolve("./.qodo/core/receptionist.js"));
const agents = require(path.resolve("./.qodo/agents/index.js"));
const {
  ensureConversation,
  appendConversationMessage
} = require(path.resolve("./.qodo/services/chat/handoffStore.js"));
const { recordConsultationEvent } = require(path.resolve("./.qodo/services/supabase.js"));

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
        response_mode: result.audit?.response_mode || "AUTOMATIC",
        consulted_sources: Array.isArray(result.audit?.consulted_sources) ? result.audit.consulted_sources : [],
        supporting_source: result.audit?.supporting_source || null,
        fallback_to_human: Boolean(result.audit?.fallback_to_human)
      }
    };
  }

  return {
    text: String(result || "").trim(),
    audit: {
      assistant_key: fallbackAgent?.agentKey || "public.assistant",
      assistant_name: fallbackAgent?.name || "Assistente Publico",
      confidence_score: null,
      response_mode: "AUTOMATIC",
      consulted_sources: [],
      supporting_source: null,
      fallback_to_human: false
    }
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

  const rawResult = await handler.handleMessage(userId, userText);
  const normalizedResult = normalizeReply(rawResult, resolvedAgent);
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

  const supportingSource = normalizedResult.audit.supporting_source || null;
  const consultedSources = Array.isArray(normalizedResult.audit.consulted_sources) ? normalizedResult.audit.consulted_sources : [];
  const hasReliableBase = Boolean(supportingSource?.source_version_id || consultedSources[0]?.source_version_id);
  const fallbackArea = hasReliableBase ? null : 'Secretaria';
  const auditEventType = hasReliableBase ? 'AUTOMATIC_RESPONSE_WITH_EVIDENCE' : 'NO_CONFIDENT_BASIS';
  const auditSummary = hasReliableBase
    ? `Resposta fundamentada registrada para ${normalizedResult.audit.assistant_name || resolvedAgent?.name || 'Assistente Publico'}.`
    : 'Base institucional insuficiente para resposta plenamente auditavel. Encaminhamento sugerido para a Secretaria.';

  await recordConsultationEvent({
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
    source_version_id: supportingSource?.source_version_id || null,
    supporting_source_title: supportingSource?.source_title || null,
    supporting_source_excerpt: supportingSource?.source_excerpt || null,
    supporting_source_version_label: supportingSource?.source_version_label || null,
    consulted_sources: consultedSources,
    confidence_score: normalizedResult.audit.confidence_score,
    response_mode: normalizedResult.audit.response_mode || 'AUTOMATIC',
    fallback_to_human: Boolean(normalizedResult.audit.fallback_to_human),
    delivered_at: new Date().toISOString(),
    audit_event_type: auditEventType,
    audit_reason: hasReliableBase ? 'source_evidence_found' : 'no_reliable_source_found',
    suggested_fallback_area: fallbackArea,
    metadata: {
      ...(metadata || {}),
      requester_profile: metadata.entrypoint || metadata.profile || metadata.channel_profile || channel || 'webchat',
      routed_agent: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || 'public.assistant'
    },
    audit_summary: auditSummary
  });

  return {
    ok: true,
    channel: String(channel || "unknown"),
    user_id: userId,
    reply: finalReply,
    metadata: {
      ...metadata,
      routed_agent: normalizedResult.audit.assistant_key || resolvedAgent?.agentKey || "public.assistant"
    }
  };
}

module.exports = { handleInboundChat };


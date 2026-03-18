const express = require("express");
const router = express.Router();

const { createWebchatSession, normalizeIncomingWebchat, isWebchatSessionId } = require("../services/channels/webchat");
const { handleInboundChat } = require("../services/chat/inbound");
const { closeConversation } = require("../services/chat/handoffStore");
const { supabase, closeConsultationEvent } = require("../services/supabase");

const ASSISTANT_LABELS = {
  "public.assistant": "Assistente Publico",
  "administration.secretariat": "Assistente da Secretaria",
  "administration.treasury": "Assistente da Tesouraria",
  "administration.direction": "Assistente da Direcao"
};

function getAssistantLabel(key) {
  return ASSISTANT_LABELS[key] || key || "Assistente Publico";
}

function mapConversationRow(row, messages = []) {
  const transcript = (messages || []).map((message) => ({
    id: message.id,
    role: message.actor_type === "CITIZEN" ? "user" : message.actor_type === "ASSISTANT" ? "assistant" : "system",
    source: message.actor_name || message.actor_type || "Sistema",
    text: message.message_text || "",
    created_at: message.created_at
  }));

  return {
    id: row.requester_id,
    user_id: row.requester_id,
    display_name: row.requester_name || row.metadata?.parent_name || row.metadata?.school_name || row.requester_id,
    channel: row.channel,
    status: row.status === "RESOLVED" ? "RESOLVED" : "AI_ACTIVE",
    ai_enabled: true,
    metadata: row.metadata || {},
    summary: row.primary_topic || "",
    created_at: row.opened_at,
    updated_at: row.resolved_at || row.opened_at,
    handoff_reason: "",
    handoff_requested_at: null,
    last_message: transcript.length ? transcript[transcript.length - 1].text : "",
    transcript
  };
}

router.post("/session", async (req, res) => {
  try {
    const schoolId = String(req.body?.school_id || process.env.SCHOOL_ID || "").trim();
    const entrypoint = String(req.body?.entrypoint || "main_interno").trim();
    const sessionId = createWebchatSession({ schoolId, entrypoint });

    return res.status(200).json({
      ok: true,
      session_id: sessionId,
      channel: "webchat"
    });
  } catch (err) {
    console.error("Erro /api/webchat/session:", err);
    return res.status(500).json({ ok: false, error: "Falha ao criar sessao do chat." });
  }
});

router.post("/message", async (req, res) => {
  try {
    const { sessionId, text, metadata } = normalizeIncomingWebchat(req.body || {});
    if (!isWebchatSessionId(sessionId)) {
      return res.status(400).json({ ok: false, error: "session_id invalido." });
    }
    if (!text) {
      return res.status(400).json({ ok: false, error: "Mensagem vazia." });
    }

    const result = await handleInboundChat({
      channel: "webchat",
      userId: sessionId,
      text,
      metadata
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Erro /api/webchat/message:", err);
    return res.status(500).json({ ok: false, error: "Falha ao processar mensagem do chat." });
  }
});

router.get("/conversations", async (_req, res) => {
  try {
    if (!supabase) {
      return res.status(200).json({ ok: true, conversations: [] });
    }

    const schoolId = String(process.env.SCHOOL_ID || "").trim();
    const query = supabase
      .from("institutional_consultations")
      .select("id, requester_id, requester_name, channel, status, primary_topic, assigned_assistant_key, opened_at, resolved_at, metadata")
      .eq("channel", "webchat")
      .order("opened_at", { ascending: false })
      .limit(100);

    if (schoolId) query.eq("school_id", schoolId);

    const { data, error } = await query;
    if (error) throw error;

    const conversations = (data || []).map((row) => mapConversationRow(row, []));
    return res.status(200).json({ ok: true, conversations });
  } catch (err) {
    console.error("Erro /api/webchat/conversations:", err);
    return res.status(500).json({ ok: false, error: "Falha ao listar conversas." });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(404).json({ ok: false, error: "Conversa nao encontrada." });
    }

    const schoolId = String(process.env.SCHOOL_ID || "").trim();
    let query = supabase
      .from("institutional_consultations")
      .select("id, requester_id, requester_name, channel, status, primary_topic, assigned_assistant_key, opened_at, resolved_at, metadata")
      .eq("channel", "webchat")
      .eq("requester_id", req.params.id)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data: conversationRow, error: conversationError } = await query;
    if (conversationError) throw conversationError;
    if (!conversationRow) {
      return res.status(404).json({ ok: false, error: "Conversa nao encontrada." });
    }

    const [messagesResult, responsesResult, eventsResult] = await Promise.all([
      supabase
        .from("consultation_messages")
        .select("id, actor_type, actor_name, message_text, created_at")
        .eq("consultation_id", conversationRow.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("assistant_responses")
        .select("id, assistant_key, response_text, source_version_id, confidence_score, response_mode, consulted_sources, supporting_source_title, supporting_source_excerpt, supporting_source_version_label, origin_message_id, response_message_id, fallback_to_human, corrected_from_response_id, corrected_at, corrected_by, delivered_at, created_at")
        .eq("consultation_id", conversationRow.id)
        .order("delivered_at", { ascending: false })
        .limit(20),
      supabase
        .from("formal_audit_events")
        .select("event_type, severity, actor_name, summary, details, created_at")
        .eq("consultation_id", conversationRow.id)
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

    if (messagesResult.error) throw messagesResult.error;
    if (responsesResult.error) throw responsesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const messages = messagesResult.data || [];
    const responseRows = responsesResult.data || [];
    const sourceVersionIds = [...new Set(responseRows.map((row) => row.source_version_id).filter(Boolean))];
    let sourceVersionsById = {};

    if (sourceVersionIds.length) {
      const { data: sourceVersions } = await supabase
        .from("knowledge_source_versions")
        .select("id, version_label, version_number, published_at, file_name")
        .in("id", sourceVersionIds);
      sourceVersionsById = (sourceVersions || []).reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
    }

    const responseAudits = responseRows.map((row) => {
      const consultedSources = Array.isArray(row.consulted_sources) ? row.consulted_sources : [];
      const sourceVersion = row.source_version_id ? sourceVersionsById[row.source_version_id] || null : null;
      const originalQuestionMessage = row.origin_message_id
        ? messages.find((message) => message.id === row.origin_message_id) || null
        : null;
      return {
        response_id: row.id,
        response_message_id: row.response_message_id || null,
        original_question: originalQuestionMessage?.message_text || '',
        original_question_at: originalQuestionMessage?.created_at || null,
        requester_name: conversationRow.requester_name || conversationRow.metadata?.parent_name || conversationRow.metadata?.school_name || 'Solicitante',
        requester_id: conversationRow.requester_id,
        asked_at: originalQuestionMessage?.created_at || conversationRow.opened_at,
        channel: conversationRow.channel,
        requester_profile: conversationRow.metadata?.requester_profile || conversationRow.metadata?.entrypoint || conversationRow.metadata?.profile || 'webchat',
        assistant_key: row.assistant_key || conversationRow.assigned_assistant_key || 'public.assistant',
        assistant_name: getAssistantLabel(row.assistant_key || conversationRow.assigned_assistant_key || 'public.assistant'),
        response_text: row.response_text || '',
        confidence_score: row.confidence_score ?? null,
        response_mode: row.response_mode || 'AUTOMATIC',
        fallback_to_human: Boolean(row.fallback_to_human),
        delivered_at: row.delivered_at || row.created_at || null,
        corrected: Boolean(row.corrected_at || row.corrected_from_response_id),
        corrected_at: row.corrected_at || null,
        corrected_by: row.corrected_by || null,
        consulted_sources: consultedSources,
        supporting_source: {
          source_title: row.supporting_source_title || consultedSources[0]?.source_title || null,
          source_version_label: row.supporting_source_version_label || sourceVersion?.version_label || sourceVersion?.version_number || null,
          source_excerpt: row.supporting_source_excerpt || consultedSources[0]?.source_excerpt || null,
          published_at: sourceVersion?.published_at || null,
          file_name: sourceVersion?.file_name || null
        },
        formal_events: (eventsResult.data || []).filter((event) => {
          const details = event.details || {};
          return !details.response_id || details.response_id === row.id;
        })
      };
    });

    const responseAuditByMessageId = {};
    responseAudits.forEach((audit) => {
      if (audit.response_message_id) {
        responseAuditByMessageId[audit.response_message_id] = audit;
      }
    });

    const assistantMessages = messages.filter((message) => message.actor_type === 'ASSISTANT');
    const unmatchedMessages = assistantMessages.filter((message) => !responseAuditByMessageId[message.id]);
    const unmatchedAudits = responseAudits.filter((audit) => !audit.response_message_id);

    unmatchedMessages.forEach((message, index) => {
      const audit = unmatchedAudits[index];
      if (audit) {
        responseAuditByMessageId[message.id] = audit;
      }
    });

    const conversation = mapConversationRow(conversationRow, messages || []);
    conversation.transcript = (conversation.transcript || []).map((message) => ({
      ...message,
      audit: responseAuditByMessageId[message.id] || null,
      clickable_audit: Boolean(responseAuditByMessageId[message.id])
    }));

    const latestAudit = responseAudits[0] || null;
    const fallbackQuestion = messages.find((message) => message.actor_type === 'CITIZEN') || null;

    conversation.audit_trail = latestAudit || {
      original_question: fallbackQuestion?.message_text || "",
      requester_name: conversationRow.requester_name || conversationRow.metadata?.parent_name || conversationRow.metadata?.school_name || "Solicitante",
      requester_id: conversationRow.requester_id,
      asked_at: fallbackQuestion?.created_at || conversationRow.opened_at,
      channel: conversationRow.channel,
      requester_profile: conversationRow.metadata?.requester_profile || conversationRow.metadata?.entrypoint || conversationRow.metadata?.profile || "webchat",
      assistant_key: conversationRow.assigned_assistant_key || "public.assistant",
      assistant_name: getAssistantLabel(conversationRow.assigned_assistant_key || "public.assistant"),
      response_text: "",
      confidence_score: null,
      response_mode: "AUTOMATIC",
      fallback_to_human: false,
      delivered_at: null,
      corrected: false,
      corrected_at: null,
      corrected_by: null,
      consulted_sources: [],
      supporting_source: null,
      formal_events: eventsResult.data || []
    };

    return res.status(200).json({
      ok: true,
      conversation
    });
  } catch (err) {
    console.error("Erro /api/webchat/conversations/:id:", err);
    return res.status(500).json({ ok: false, error: "Falha ao carregar conversa." });
  }
});

router.post("/conversations/:id/reply", async (_req, res) => {
  return res.status(410).json({
    ok: false,
    error: "Resposta humana desabilitada. Este canal opera apenas com assistentes institucionais."
  });
});

router.post("/conversations/:id/resolve", async (req, res) => {
  try {
    const finalText = String(req.body?.text || "").trim();
    closeConversation(req.params.id, finalText);

    await closeConsultationEvent({
      school_id: process.env.SCHOOL_ID || null,
      channel: "webchat",
      requester_id: req.params.id,
      actor_type: "HUMAN",
      actor_name: "Monitoramento institucional",
      event_type: "MANUAL_CLOSURE",
      summary: "Conversa encerrada manualmente por operador institucional.",
      final_text: finalText
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro /api/webchat/conversations/:id/resolve:", err);
    return res.status(500).json({ ok: false, error: "Falha ao encerrar conversa." });
  }
});

module.exports = router;


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
const CHAT_MANAGER_ROLE_CAPABILITIES = {
  superadmin: { detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: true, resolveConversation: true },
  network_manager: { detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: true, resolveConversation: true },
  auditor: { detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: true, resolveConversation: false },
  content_curator: { detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: true, resolveConversation: false },
  direction: { detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: false, resolveConversation: true },
  treasury: { detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: false, resolveConversation: true },
  coordination: { detailedEvidence: false, governanceDetails: false, formalEvents: false, export: false, feedbackActions: false, resolveConversation: true },
  secretariat: { detailedEvidence: false, governanceDetails: false, formalEvents: false, export: false, feedbackActions: false, resolveConversation: true },
  public_operator: { detailedEvidence: false, governanceDetails: false, formalEvents: false, export: false, feedbackActions: false, resolveConversation: true }
};

function getAssistantLabel(key) {
  return ASSISTANT_LABELS[key] || key || "Assistente Publico";
}

function isMissingRelationError(error) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return message.includes('does not exist') || (message.includes('relation') && message.includes('does not exist'));
}

function normalizeRoleKey(role) {
  return String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getRequestedRole(req) {
  return normalizeRoleKey(req.headers['x-effective-role'] || req.headers['x-platform-role'] || req.headers['x-user-role'] || '');
}

function getRoleCapabilities(req) {
  const role = getRequestedRole(req);
  const defaults = { detailedEvidence: false, governanceDetails: false, formalEvents: false, export: false, feedbackActions: false, resolveConversation: false, role };
  if (role === 'superadmin') {
    return { ...defaults, detailedEvidence: true, governanceDetails: true, formalEvents: true, export: true, feedbackActions: true, resolveConversation: true };
  }
  return { ...defaults, ...(CHAT_MANAGER_ROLE_CAPABILITIES[role] || {}) };
}

function sanitizeAuditForCapabilities(audit = {}, capabilities = {}) {
  const sanitized = {
    ...audit,
    consulted_sources: capabilities.detailedEvidence ? (Array.isArray(audit.consulted_sources) ? audit.consulted_sources : []) : [],
    evidence_rows: capabilities.detailedEvidence ? (Array.isArray(audit.evidence_rows) ? audit.evidence_rows : []) : [],
    feedback_entries: capabilities.feedbackActions ? (Array.isArray(audit.feedback_entries) ? audit.feedback_entries : []) : [],
    incident_entries: capabilities.feedbackActions ? (Array.isArray(audit.incident_entries) ? audit.incident_entries : []) : [],
    formal_events: capabilities.formalEvents ? (Array.isArray(audit.formal_events) ? audit.formal_events : []) : []
  };

  sanitized.supporting_source = {
    ...(audit.supporting_source || {}),
    published_at: capabilities.detailedEvidence ? (audit.supporting_source?.published_at || null) : null,
    file_name: capabilities.detailedEvidence ? (audit.supporting_source?.file_name || null) : null,
    source_excerpt: capabilities.detailedEvidence ? (audit.supporting_source?.source_excerpt || null) : null
  };

  if (!capabilities.governanceDetails) {
    sanitized.confidence_score = null;
    sanitized.evidence_score = null;
    sanitized.hallucination_risk_level = null;
    sanitized.review_required = false;
    sanitized.review_reason = null;
    sanitized.corrected = false;
    sanitized.corrected_at = null;
    sanitized.corrected_by = null;
  }

  if (!capabilities.feedbackActions) {
    sanitized.feedback_summary = { total: 0, helpful: 0, not_helpful: 0, incorrect: 0 };
    sanitized.incident_summary = { total: 0, open: 0 };
  }

  return sanitized;
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

router.get("/conversations", async (req, res) => {
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

    const capabilities = getRoleCapabilities(req);
    const conversations = (data || []).map((row) => ({
      ...mapConversationRow(row, []),
      access_profile: capabilities.governanceDetails ? 'governance' : 'operational'
    }));
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
    const responseIds = [...new Set(responseRows.map((row) => row.id).filter(Boolean))];
    const sourceVersionIds = [...new Set(responseRows.map((row) => row.source_version_id).filter(Boolean))];
    let sourceVersionsById = {};
    let feedbackByResponseId = {};
    let incidentsByResponseId = {};
    let evidenceByResponseId = {};

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

    if (responseIds.length) {
      const [feedbackResult, incidentResult, evidenceResult] = await Promise.all([
        supabase.from("interaction_feedback").select("response_id, feedback_type, comment, created_by, created_at").in("response_id", responseIds).order("created_at", { ascending: false }),
        supabase.from("incident_reports").select("id, response_id, incident_type, severity, status, opened_by, opened_at, resolved_at, resolution_notes").in("response_id", responseIds).order("opened_at", { ascending: false }),
        supabase.from("interaction_source_evidence").select("response_id, source_title, source_excerpt, source_version_id, relevance_score, retrieval_method, used_as_primary, created_at").in("response_id", responseIds).order("used_as_primary", { ascending: false })
      ]);

      if (!feedbackResult.error || isMissingRelationError(feedbackResult.error)) {
        feedbackByResponseId = ((feedbackResult.data || [])).reduce((acc, item) => {
          acc[item.response_id] = acc[item.response_id] || [];
          acc[item.response_id].push(item);
          return acc;
        }, {});
      }

      if (!incidentResult.error || isMissingRelationError(incidentResult.error)) {
        incidentsByResponseId = ((incidentResult.data || [])).reduce((acc, item) => {
          acc[item.response_id] = acc[item.response_id] || [];
          acc[item.response_id].push(item);
          return acc;
        }, {});
      }

      if (!evidenceResult.error || isMissingRelationError(evidenceResult.error)) {
        evidenceByResponseId = ((evidenceResult.data || [])).reduce((acc, item) => {
          acc[item.response_id] = acc[item.response_id] || [];
          acc[item.response_id].push(item);
          return acc;
        }, {});
      }
    }

    const responseAudits = responseRows.map((row) => {
      const consultedSources = Array.isArray(row.consulted_sources) ? row.consulted_sources : [];
      const sourceVersion = row.source_version_id ? sourceVersionsById[row.source_version_id] || null : null;
      const originalQuestionMessage = row.origin_message_id
        ? messages.find((message) => message.id === row.origin_message_id) || null
        : null;
      const formalEvents = (eventsResult.data || []).filter((event) => {
        const details = event.details || {};
        return !details.response_id || details.response_id === row.id;
      });
      const latestGovernanceEvent = formalEvents.find((event) => event?.details?.hallucination_risk_level || event?.details?.review_required || event?.details?.evidence_score !== undefined) || null;
      const governanceDetails = latestGovernanceEvent?.details || {};
      const feedbackEntries = feedbackByResponseId[row.id] || [];
      const incidentEntries = incidentsByResponseId[row.id] || [];
      const evidenceEntries = evidenceByResponseId[row.id] || [];
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
        evidence_score: governanceDetails.evidence_score ?? consultedSources[0]?.evidence_score ?? null,
        hallucination_risk_level: governanceDetails.hallucination_risk_level || null,
        review_required: Boolean(governanceDetails.review_required),
        review_reason: governanceDetails.review_reason || null,
        abstained: Boolean(governanceDetails.abstained),
        response_mode: row.response_mode || 'AUTOMATIC',
        fallback_to_human: Boolean(row.fallback_to_human || governanceDetails.review_required),
        delivered_at: row.delivered_at || row.created_at || null,
        corrected: Boolean(row.corrected_at || row.corrected_from_response_id),
        corrected_at: row.corrected_at || null,
        corrected_by: row.corrected_by || null,
        consulted_sources: consultedSources,
        evidence_rows: evidenceEntries,
        feedback_entries: feedbackEntries,
        incident_entries: incidentEntries,
        supporting_source: {
          source_title: row.supporting_source_title || consultedSources[0]?.source_title || null,
          source_version_label: row.supporting_source_version_label || sourceVersion?.version_label || sourceVersion?.version_number || null,
          source_excerpt: row.supporting_source_excerpt || consultedSources[0]?.source_excerpt || null,
          published_at: sourceVersion?.published_at || null,
          file_name: sourceVersion?.file_name || null
        },
        feedback_summary: {
          total: feedbackEntries.length,
          helpful: feedbackEntries.filter((item) => item.feedback_type === 'helpful').length,
          not_helpful: feedbackEntries.filter((item) => item.feedback_type === 'not_helpful').length,
          incorrect: feedbackEntries.filter((item) => item.feedback_type === 'incorrect').length
        },
        incident_summary: {
          total: incidentEntries.length,
          open: incidentEntries.filter((item) => item.status === 'OPEN' || item.status === 'IN_REVIEW').length
        },
        formal_events: formalEvents
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

    const capabilities = getRoleCapabilities(req);
    const conversation = mapConversationRow(conversationRow, messages || []);
    conversation.access_profile = capabilities.governanceDetails ? 'governance' : 'operational';
    conversation.transcript = (conversation.transcript || []).map((message) => ({
      ...message,
      audit: responseAuditByMessageId[message.id] ? sanitizeAuditForCapabilities(responseAuditByMessageId[message.id], capabilities) : null,
      clickable_audit: Boolean(responseAuditByMessageId[message.id])
    }));

    const latestAudit = responseAudits[0] || null;
    const fallbackQuestion = messages.find((message) => message.actor_type === 'CITIZEN') || null;

    conversation.audit_trail = latestAudit ? sanitizeAuditForCapabilities(latestAudit, capabilities) : {
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

router.post("/responses/:id/feedback", async (req, res) => {
  try {
    const capabilities = getRoleCapabilities(req);
    if (!capabilities.feedbackActions) {
      return res.status(403).json({ ok: false, error: "Perfil sem permissao para registrar feedback nesta tela." });
    }
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase indisponivel." });
    }

    const responseId = String(req.params.id || '').trim();
    const feedbackType = String(req.body?.feedback_type || '').trim().toLowerCase();
    const comment = String(req.body?.comment || '').trim();
    const createdBy = String(req.body?.created_by || 'Operador institucional').trim();

    if (!responseId) return res.status(400).json({ ok: false, error: "Resposta invalida." });
    if (!['helpful', 'not_helpful', 'incorrect'].includes(feedbackType)) {
      return res.status(400).json({ ok: false, error: "feedback_type invalido." });
    }

    const schoolId = String(process.env.SCHOOL_ID || '').trim();
    let query = supabase
      .from('assistant_responses')
      .select('id, school_id, consultation_id')
      .eq('id', responseId)
      .limit(1)
      .maybeSingle();

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data: responseRow, error: responseError } = await query;
    if (responseError) throw responseError;
    if (!responseRow) return res.status(404).json({ ok: false, error: "Resposta nao encontrada." });

    const payload = {
      school_id: responseRow.school_id,
      consultation_id: responseRow.consultation_id,
      response_id: responseRow.id,
      feedback_type: feedbackType,
      comment: comment || null,
      created_by: createdBy || 'Operador institucional'
    };

    const { data, error } = await supabase
      .from('interaction_feedback')
      .upsert(payload, { onConflict: 'response_id,feedback_type,created_by' })
      .select('*')
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(501).json({ ok: false, error: 'Tabela interaction_feedback ainda nao foi criada no banco.' });
      }
      throw error;
    }

    await supabase.from('formal_audit_events').insert({
      school_id: responseRow.school_id,
      consultation_id: responseRow.consultation_id,
      event_type: 'INTERACTION_FEEDBACK_RECORDED',
      severity: feedbackType === 'incorrect' ? 'HIGH' : 'INFO',
      actor_type: 'HUMAN',
      actor_name: createdBy || 'Operador institucional',
      summary: 'Feedback registrado para resposta automatizada.',
      details: { response_id: responseRow.id, feedback_type: feedbackType, comment: comment || null }
    });

    return res.status(200).json({ ok: true, feedback: data });
  } catch (err) {
    console.error("Erro /api/webchat/responses/:id/feedback:", err);
    return res.status(500).json({ ok: false, error: "Falha ao registrar feedback." });
  }
});

router.post("/responses/:id/incident", async (req, res) => {
  try {
    const capabilities = getRoleCapabilities(req);
    if (!capabilities.feedbackActions) {
      return res.status(403).json({ ok: false, error: "Perfil sem permissao para abrir incidentes nesta tela." });
    }
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase indisponivel." });
    }

    const responseId = String(req.params.id || '').trim();
    const incidentType = String(req.body?.incident_type || 'governance_review').trim();
    const severity = String(req.body?.severity || 'MEDIUM').trim().toUpperCase();
    const openedBy = String(req.body?.opened_by || 'Operador institucional').trim();
    const description = String(req.body?.description || '').trim();
    const allowedSeverity = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

    if (!responseId) return res.status(400).json({ ok: false, error: "Resposta invalida." });
    if (!allowedSeverity.has(severity)) return res.status(400).json({ ok: false, error: "severity invalido." });

    const schoolId = String(process.env.SCHOOL_ID || '').trim();
    let query = supabase
      .from('assistant_responses')
      .select('id, school_id, consultation_id, assistant_key')
      .eq('id', responseId)
      .limit(1)
      .maybeSingle();

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data: responseRow, error: responseError } = await query;
    if (responseError) throw responseError;
    if (!responseRow) return res.status(404).json({ ok: false, error: "Resposta nao encontrada." });

    const { data, error } = await supabase
      .from('incident_reports')
      .insert({
        school_id: responseRow.school_id,
        consultation_id: responseRow.consultation_id,
        response_id: responseRow.id,
        incident_type: incidentType,
        severity,
        topic: req.body?.topic || null,
        details: { description: description || null, assistant_key: responseRow.assistant_key },
        opened_by: openedBy || 'Operador institucional'
      })
      .select('*')
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(501).json({ ok: false, error: 'Tabela incident_reports ainda nao foi criada no banco.' });
      }
      throw error;
    }

    await supabase.from('formal_audit_events').insert({
      school_id: responseRow.school_id,
      consultation_id: responseRow.consultation_id,
      event_type: 'INCIDENT_REPORTED',
      severity,
      actor_type: 'HUMAN',
      actor_name: openedBy || 'Operador institucional',
      summary: 'Incidente registrado para resposta automatizada.',
      details: { response_id: responseRow.id, incident_id: data.id, incident_type: incidentType, description: description || null }
    });

    return res.status(200).json({ ok: true, incident: data });
  } catch (err) {
    console.error("Erro /api/webchat/responses/:id/incident:", err);
    return res.status(500).json({ ok: false, error: "Falha ao registrar incidente." });
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
    const capabilities = getRoleCapabilities(req);
    if (!capabilities.resolveConversation) {
      return res.status(403).json({ ok: false, error: "Perfil sem permissao para encerrar conversas nesta tela." });
    }
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




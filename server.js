const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const webhookRoutes = require("./.qodo/web/webhook.js");
const webchatRoutes = require("./.qodo/api/webchat.js");

const app = express();
const PORT = Number(process.env.PORT || 8084);

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

const ASSISTANT_AREAS = {
  "public.assistant": {
    label: "Assistente Publico",
    categories: ["Atendimento Publico", "Institucional"]
  },
  "administration.secretariat": {
    label: "Assistente da Secretaria",
    categories: ["Secretaria", "Documentos", "Atendimento Publico", "Institucional"]
  },
  "administration.treasury": {
    label: "Assistente da Tesouraria",
    categories: ["Tesouraria", "Financeiro", "Institucional"]
  },
  "administration.direction": {
    label: "Assistente da Direcao",
    categories: ["Direcao", "Governanca", "Institucional"]
  }
};

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/webhook", webhookRoutes);
app.use("/api/webchat", webchatRoutes);

function getSchoolId(req) {
  return String(req.query.school_id || req.body?.school_id || process.env.SCHOOL_ID || "").trim();
}

function getPeriodConfig(req) {
  const period = String(req.query.period || "today").trim().toLowerCase();
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === "30d") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else if (period === "all") {
    return { period: "all", label: "Todo o periodo", start: null, end: null };
  } else {
    start.setHours(0, 0, 0, 0);
  }

  end.setHours(23, 59, 59, 999);

  const labels = {
    today: "Hoje",
    "7d": "Ultimos 7 dias",
    "30d": "Ultimos 30 dias",
    all: "Todo o periodo"
  };

  return {
    period: labels[period] ? period : "today",
    label: labels[period] || "Hoje",
    start,
    end
  };
}

function applyRange(query, column, periodConfig) {
  if (!periodConfig?.start || !periodConfig?.end) return query;
  return query
    .gte(column, periodConfig.start.toISOString())
    .lte(column, periodConfig.end.toISOString());
}

function fallbackDashboard(periodConfig = { period: "today", label: "Hoje" }) {
  return {
    ok: true,
    period: periodConfig.period,
    period_label: periodConfig.label,
    metrics: {
      total_consultations: 0,
      active_consultations: 0,
      resolved_consultations: 0,
      source_coverage_rate: 0,
      avg_confidence: 0,
      audited_events: 0
    },
    assistant_volume: [
      { assistant_key: "public.assistant", assistant_name: "Assistente Publico", total: 0 },
      { assistant_key: "administration.secretariat", assistant_name: "Assistente da Secretaria", total: 0 },
      { assistant_key: "administration.treasury", assistant_name: "Assistente da Tesouraria", total: 0 },
      { assistant_key: "administration.direction", assistant_name: "Assistente da Direcao", total: 0 }
    ],
    latest_audit_events: []
  };
}

function ensureAssistantArea(value) {
  const normalized = String(value || "public.assistant").trim();
  return ASSISTANT_AREAS[normalized] ? normalized : "public.assistant";
}

function stripExtension(fileName = "") {
  return String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .trim();
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractKeywords(text) {
  const stopwords = new Set([
    "a", "o", "e", "de", "da", "do", "das", "dos", "em", "para", "com", "como", "que", "se",
    "na", "no", "nas", "nos", "um", "uma", "ao", "aos", "as", "os", "por", "ser", "sao", "sua",
    "seu", "seus", "suas", "mais", "menos", "entre", "sobre", "cada", "este", "esta", "isso", "essa"
  ]);

  const words = normalizeText(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopwords.has(word));

  const frequency = new Map();
  words.forEach((word) => frequency.set(word, (frequency.get(word) || 0) + 1));

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

function chunkText(text, maxLength = 900) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!paragraphs.length) return [];

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if ((current + "\n\n" + paragraph).length <= maxLength) {
      current += "\n\n" + paragraph;
      continue;
    }

    chunks.push(current);

    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph.split(/(?<=[\.!?])\s+/).filter(Boolean);
    current = "";
    for (const sentence of sentences) {
      if (!current) {
        current = sentence;
        continue;
      }
      if ((current + " " + sentence).length <= maxLength) {
        current += " " + sentence;
      } else {
        chunks.push(current);
        current = sentence;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function buildKnowledgeRows({ schoolId, sourceDocument, version, content }) {
  const assistantArea = ensureAssistantArea(sourceDocument.owning_area);
  const areaConfig = ASSISTANT_AREAS[assistantArea] || ASSISTANT_AREAS["public.assistant"];
  const category = areaConfig.categories[0] || "Institucional";
  const chunks = chunkText(content);

  return chunks.map((chunk, index) => ({
    school_id: schoolId,
    category,
    question: `${sourceDocument.title} - trecho ${index + 1}`,
    answer: chunk,
    keywords: extractKeywords(`${sourceDocument.title}\n${chunk}`),
    source_document_id: sourceDocument.id,
    source_version_id: version.id,
    source_title: sourceDocument.title,
    source_version_label: version.version_label,
    source_version_number: version.version_number
  }));
}

async function publishSourceVersion({ schoolId, sourceDocument, versionLabel, content, fileName, mimeType, userId }) {
  const normalizedContent = normalizeText(content);
  if (!normalizedContent) {
    throw new Error("Conteudo vazio para publicacao da fonte.");
  }

  const { data: existingVersions, error: versionsError } = await supabase
    .from("knowledge_source_versions")
    .select("id, version_number")
    .eq("school_id", schoolId)
    .eq("source_document_id", sourceDocument.id)
    .order("version_number", { ascending: false });

  if (versionsError) throw versionsError;

  const nextVersionNumber = ((existingVersions || [])[0]?.version_number || 0) + 1;
  const checksum = crypto.createHash("sha256").update(normalizedContent, "utf8").digest("hex");

  const { error: resetCurrentError } = await supabase
    .from("knowledge_source_versions")
    .update({ is_current: false })
    .eq("school_id", schoolId)
    .eq("source_document_id", sourceDocument.id)
    .eq("is_current", true);

  if (resetCurrentError) throw resetCurrentError;

  const { data: version, error: versionError } = await supabase
    .from("knowledge_source_versions")
    .insert({
      school_id: schoolId,
      source_document_id: sourceDocument.id,
      version_label: String(versionLabel || `v${nextVersionNumber}`).trim(),
      version_number: nextVersionNumber,
      checksum,
      file_name: fileName || null,
      mime_type: mimeType || null,
      raw_text: normalizedContent,
      chunk_count: 0,
      published_at: new Date().toISOString(),
      is_current: true,
      created_by: userId || null
    })
    .select("*")
    .single();

  if (versionError) throw versionError;

  const { error: deleteKbError } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("school_id", schoolId)
    .eq("source_document_id", sourceDocument.id);

  if (deleteKbError) throw deleteKbError;

  const knowledgeRows = buildKnowledgeRows({ schoolId, sourceDocument, version, content: normalizedContent });

  if (knowledgeRows.length) {
    const { error: kbError } = await supabase
      .from("knowledge_base")
      .insert(knowledgeRows);

    if (kbError) throw kbError;
  }

  const { error: updateVersionError } = await supabase
    .from("knowledge_source_versions")
    .update({ chunk_count: knowledgeRows.length })
    .eq("id", version.id);

  if (updateVersionError) throw updateVersionError;

  const { error: updateDocumentError } = await supabase
    .from("source_documents")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sourceDocument.id)
    .eq("school_id", schoolId);

  if (updateDocumentError) throw updateDocumentError;

  await supabase.from("formal_audit_events").insert({
    school_id: schoolId,
    consultation_id: null,
    event_type: "SOURCE_VERSION_PUBLISHED",
    severity: "INFO",
    actor_type: "SYSTEM",
    actor_name: "Base de Conhecimento",
    summary: `Nova versao publicada para ${sourceDocument.title}.`,
    details: {
      source_document_id: sourceDocument.id,
      source_version_id: version.id,
      owning_area: sourceDocument.owning_area,
      version_label: version.version_label,
      version_number: version.version_number,
      chunk_count: knowledgeRows.length
    }
  });

  return {
    ...version,
    chunk_count: knowledgeRows.length
  };
}

const IDLE_FOLLOWUP_AFTER_MS = 60 * 1000;
const IDLE_CLOSE_AFTER_MS = 60 * 1000;
const IDLE_SWEEP_INTERVAL_MS = 15 * 1000;

function getAssistantLabel(key) {
  return ASSISTANT_AREAS[String(key || "public.assistant").trim()]?.label || "Assistente Publico";
}

async function appendAutomatedResponse({ consultation, text, eventType, summary, mode = "AUTOMATIC", markResolved = false }) {
  const assistantKey = consultation.assigned_assistant_key || "public.assistant";
  const assistantName = getAssistantLabel(assistantKey);
  const nowIso = new Date().toISOString();

  const { data: recentMessages } = await supabase
    .from("consultation_messages")
    .select("id, actor_type, created_at")
    .eq("consultation_id", consultation.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const originMessage = (recentMessages || []).find((item) => item.actor_type === "CITIZEN") || null;

  const { data: responseMessage, error: messageError } = await supabase
    .from("consultation_messages")
    .insert({
      school_id: consultation.school_id,
      consultation_id: consultation.id,
      direction: "OUTBOUND",
      actor_type: "ASSISTANT",
      actor_name: assistantName,
      message_text: text
    })
    .select("id")
    .single();

  if (messageError) throw messageError;

  const { data: responseRow, error: responseError } = await supabase
    .from("assistant_responses")
    .insert({
      school_id: consultation.school_id,
      consultation_id: consultation.id,
      assistant_key: assistantKey,
      response_text: text,
      confidence_score: null,
      response_mode: mode,
      consulted_sources: [],
      supporting_source_title: null,
      supporting_source_excerpt: null,
      supporting_source_version_label: null,
      origin_message_id: originMessage?.id || null,
      response_message_id: responseMessage?.id || null,
      fallback_to_human: false,
      delivered_at: nowIso
    })
    .select("id")
    .single();

  if (responseError) throw responseError;

  const metadata = {
    ...(consultation.metadata || {}),
    last_automated_followup_at: nowIso
  };
  if (eventType === "IDLE_FOLLOWUP_SENT") {
    metadata.idle_followup_sent_at = nowIso;
  }
  if (markResolved) {
    metadata.idle_closed_at = nowIso;
    metadata.resolved_by = "Automacao de inatividade";
  }

  const { error: updateError } = await supabase
    .from("institutional_consultations")
    .update({
      status: markResolved ? "RESOLVED" : consultation.status,
      resolved_at: markResolved ? nowIso : consultation.resolved_at,
      metadata
    })
    .eq("id", consultation.id);

  if (updateError) throw updateError;

  await supabase.from("formal_audit_events").insert({
    school_id: consultation.school_id,
    consultation_id: consultation.id,
    event_type: eventType,
    severity: "INFO",
    actor_type: "SYSTEM",
    actor_name: "Automacao de atendimento",
    summary,
    details: {
      response_id: responseRow?.id || null,
      consultation_id: consultation.id,
      requester_id: consultation.requester_id,
      assistant_key: assistantKey,
      delivered_at: nowIso
    }
  });
}

async function processIdleConversations() {
  if (!supabase) return;

  try {
    const schoolId = String(process.env.SCHOOL_ID || "").trim();
    let query = supabase
      .from("institutional_consultations")
      .select("id, school_id, requester_id, status, assigned_assistant_key, opened_at, resolved_at, metadata")
      .eq("channel", "webchat")
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("opened_at", { ascending: false })
      .limit(100);

    if (schoolId) query = query.eq("school_id", schoolId);

    const { data: consultations, error } = await query;
    if (error) throw error;

    const now = Date.now();

    for (const consultation of consultations || []) {
      const { data: messages, error: messagesError } = await supabase
        .from("consultation_messages")
        .select("id, actor_type, message_text, created_at")
        .eq("consultation_id", consultation.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (messagesError) throw messagesError;
      const latestMessage = (messages || [])[0];
      if (!latestMessage) continue;
      if (latestMessage.actor_type === "CITIZEN") continue;

      const latestTimestamp = new Date(latestMessage.created_at).getTime();
      const followupSentAt = consultation.metadata?.idle_followup_sent_at ? new Date(consultation.metadata.idle_followup_sent_at).getTime() : null;
      const idleClosedAt = consultation.metadata?.idle_closed_at ? new Date(consultation.metadata.idle_closed_at).getTime() : null;

      if (!followupSentAt && now - latestTimestamp >= IDLE_FOLLOWUP_AFTER_MS) {
        await appendAutomatedResponse({
          consultation,
          text: "Ainda estou por aqui. Se desejar continuar, basta responder esta mensagem com sua proxima pergunta.",
          eventType: "IDLE_FOLLOWUP_SENT",
          summary: "Mensagem automatica de retomada enviada por inatividade.",
          mode: "AUTOMATIC"
        });
        continue;
      }

      if (followupSentAt && !idleClosedAt && now - followupSentAt >= IDLE_CLOSE_AFTER_MS) {
        await appendAutomatedResponse({
          consultation,
          text: "Como nao houve retorno, esta conversa foi encerrada automaticamente. Quando quiser, voce pode iniciar um novo atendimento.",
          eventType: "IDLE_CONVERSATION_CLOSED",
          summary: "Conversa encerrada automaticamente por inatividade apos mensagem de retomada.",
          mode: "AUTOMATIC",
          markResolved: true
        });
      }
    }
  } catch (error) {
    console.error("Erro ao processar conversas inativas:", error);
  }
}

app.get("/", (_req, res) => {
  res.status(200).send("Assistente Publico online");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "lab-ia-educacao", at: new Date().toISOString() });
});

app.get("/api/knowledge/sources", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, sources: [] });

  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(200).json({ ok: true, sources: [] });

    const [documentsResult, versionsResult] = await Promise.all([
      supabase
        .from("source_documents")
        .select("id, title, document_type, owning_area, canonical_reference, description, created_at, updated_at")
        .eq("school_id", schoolId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("knowledge_source_versions")
        .select("id, source_document_id, version_label, version_number, file_name, mime_type, chunk_count, published_at, is_current")
        .eq("school_id", schoolId)
        .order("version_number", { ascending: false })
    ]);

    if (documentsResult.error) throw documentsResult.error;
    if (versionsResult.error) throw versionsResult.error;

    const versionsByDocument = (versionsResult.data || []).reduce((acc, row) => {
      if (!acc[row.source_document_id]) acc[row.source_document_id] = [];
      acc[row.source_document_id].push(row);
      return acc;
    }, {});

    const sources = (documentsResult.data || []).map((doc) => {
      const versions = versionsByDocument[doc.id] || [];
      return {
        ...doc,
        assistant_name: ASSISTANT_AREAS[ensureAssistantArea(doc.owning_area)]?.label || doc.owning_area,
        current_version: versions.find((item) => item.is_current) || null,
        version_count: versions.length
      };
    });

    return res.status(200).json({ ok: true, sources });
  } catch (error) {
    console.error("Erro /api/knowledge/sources:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar fontes oficiais." });
  }
});

app.get("/api/knowledge/sources/:id/versions", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, versions: [] });

  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(200).json({ ok: true, versions: [] });

    const { data, error } = await supabase
      .from("knowledge_source_versions")
      .select("id, source_document_id, version_label, version_number, file_name, mime_type, chunk_count, raw_text, published_at, is_current, created_by")
      .eq("school_id", schoolId)
      .eq("source_document_id", req.params.id)
      .order("version_number", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ ok: true, versions: data || [] });
  } catch (error) {
    console.error("Erro /api/knowledge/sources/:id/versions:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar historico de versoes." });
  }
});

app.post("/api/knowledge/sources/import", async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase indisponivel." });

  try {
    const schoolId = getSchoolId(req);
    const owningArea = ensureAssistantArea(req.body?.owning_area);
    const documentType = String(req.body?.document_type || "arquivo_oficial").trim();
    const canonicalReference = String(req.body?.canonical_reference || "").trim() || null;
    const description = String(req.body?.description || "").trim() || null;
    const userId = String(req.body?.user_id || "").trim() || null;
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!schoolId) return res.status(400).json({ ok: false, error: "school_id obrigatorio." });
    if (!files.length) return res.status(400).json({ ok: false, error: "Nenhum arquivo informado." });

    const created = [];

    for (const file of files) {
      const fileName = String(file?.name || "fonte.txt").trim();
      const rawContent = normalizeText(file?.content || "");
      if (!rawContent) continue;

      const title = String(file?.title || stripExtension(fileName) || "Fonte oficial").trim();
      const { data: documentRow, error: documentError } = await supabase
        .from("source_documents")
        .insert({
          school_id: schoolId,
          title,
          document_type: documentType,
          owning_area: owningArea,
          canonical_reference: canonicalReference,
          description
        })
        .select("*")
        .single();

      if (documentError) throw documentError;

      const version = await publishSourceVersion({
        schoolId,
        sourceDocument: documentRow,
        versionLabel: file?.version_label || "v1",
        content: rawContent,
        fileName,
        mimeType: String(file?.type || "text/plain").trim() || null,
        userId
      });

      created.push({
        ...documentRow,
        assistant_name: ASSISTANT_AREAS[owningArea]?.label || owningArea,
        current_version: version,
        version_count: 1
      });
    }

    return res.status(200).json({ ok: true, created_count: created.length, sources: created });
  } catch (error) {
    console.error("Erro /api/knowledge/sources/import:", error);
    return res.status(500).json({ ok: false, error: "Falha ao importar fontes oficiais." });
  }
});

app.post("/api/knowledge/sources/:id/versions", async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase indisponivel." });

  try {
    const schoolId = getSchoolId(req);
    const userId = String(req.body?.user_id || "").trim() || null;
    const content = normalizeText(req.body?.content || "");
    const fileName = String(req.body?.file_name || "").trim() || null;
    const mimeType = String(req.body?.mime_type || "").trim() || null;
    const versionLabel = String(req.body?.version_label || "").trim() || null;

    if (!schoolId) return res.status(400).json({ ok: false, error: "school_id obrigatorio." });
    if (!content) return res.status(400).json({ ok: false, error: "Conteudo obrigatorio para nova versao." });

    const { data: sourceDocument, error: documentError } = await supabase
      .from("source_documents")
      .select("*")
      .eq("school_id", schoolId)
      .eq("id", req.params.id)
      .single();

    if (documentError) throw documentError;

    const version = await publishSourceVersion({
      schoolId,
      sourceDocument,
      versionLabel,
      content,
      fileName,
      mimeType,
      userId
    });

    return res.status(200).json({ ok: true, version });
  } catch (error) {
    console.error("Erro /api/knowledge/sources/:id/versions:", error);
    return res.status(500).json({ ok: false, error: "Falha ao publicar nova versao." });
  }
});

app.get("/api/intelligence/dashboard", async (req, res) => {
  const periodConfig = getPeriodConfig(req);
  if (!supabase) return res.status(200).json(fallbackDashboard(periodConfig));

  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(200).json(fallbackDashboard(periodConfig));

    const consultationsQuery = applyRange(
      supabase.from("institutional_consultations").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      "opened_at",
      periodConfig
    );
    const activeQuery = applyRange(
      supabase.from("institutional_consultations").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("status", ["OPEN", "IN_PROGRESS"]),
      "opened_at",
      periodConfig
    );
    const resolvedQuery = applyRange(
      supabase.from("institutional_consultations").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "RESOLVED"),
      "opened_at",
      periodConfig
    );
    const responsesQuery = applyRange(
      supabase.from("assistant_responses").select("assistant_key, confidence_score, source_version_id, created_at").eq("school_id", schoolId).limit(1000),
      "created_at",
      periodConfig
    );
    const auditsQuery = applyRange(
      supabase.from("formal_audit_events").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      "created_at",
      periodConfig
    );
    const recentAuditsQuery = applyRange(
      supabase.from("formal_audit_events").select("event_type, severity, created_at, summary").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(8),
      "created_at",
      periodConfig
    );

    const [consultations, active, resolved, responses, audits, recentAudits] = await Promise.all([
      consultationsQuery,
      activeQuery,
      resolvedQuery,
      responsesQuery,
      auditsQuery,
      recentAuditsQuery
    ]);

    const responseRows = responses.data || [];
    const cited = responseRows.filter((row) => row.source_version_id).length;
    const confidenceValues = responseRows
      .map((row) => Number(row.confidence_score || 0))
      .filter((value) => !Number.isNaN(value) && value > 0);

    const totalsByAssistant = responseRows.reduce((acc, row) => {
      const key = row.assistant_key || "public.assistant";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      ok: true,
      period: periodConfig.period,
      period_label: periodConfig.label,
      metrics: {
        total_consultations: consultations.count || 0,
        active_consultations: active.count || 0,
        resolved_consultations: resolved.count || 0,
        source_coverage_rate: responseRows.length ? Math.round((cited / responseRows.length) * 100) : 0,
        avg_confidence: confidenceValues.length
          ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
          : 0,
        audited_events: audits.count || 0
      },
      assistant_volume: [
        { assistant_key: "public.assistant", assistant_name: "Assistente Publico", total: totalsByAssistant["public.assistant"] || 0 },
        { assistant_key: "administration.secretariat", assistant_name: "Assistente da Secretaria", total: totalsByAssistant["administration.secretariat"] || 0 },
        { assistant_key: "administration.treasury", assistant_name: "Assistente da Tesouraria", total: totalsByAssistant["administration.treasury"] || 0 },
        { assistant_key: "administration.direction", assistant_name: "Assistente da Direcao", total: totalsByAssistant["administration.direction"] || 0 }
      ],
      latest_audit_events: recentAudits.data || []
    });
  } catch (error) {
    console.error("Erro /api/intelligence/dashboard:", error);
    return res.status(500).json({ ok: false, error: "Falha ao montar dashboard de inteligencia." });
  }
});

app.get("/api/reports/operational-summary", async (req, res) => {
  if (!supabase) {
    return res.status(200).json({ ok: true, consultations_by_status: [], top_topics: [], source_adoption: [] });
  }

  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(200).json({ ok: true, consultations_by_status: [], top_topics: [], source_adoption: [] });
    }

    const [consultations, responses] = await Promise.all([
      supabase.from("institutional_consultations").select("status, primary_topic").eq("school_id", schoolId).limit(1000),
      supabase.from("assistant_responses").select("assistant_key, source_version_id").eq("school_id", schoolId).limit(1000)
    ]);

    const consultationsByStatus = Object.entries(
      (consultations.data || []).reduce((acc, row) => {
        acc[row.status || "OPEN"] = (acc[row.status || "OPEN"] || 0) + 1;
        return acc;
      }, {})
    ).map(([status, total]) => ({ status, total }));

    const topTopics = Object.entries(
      (consultations.data || []).reduce((acc, row) => {
        acc[row.primary_topic || "Sem classificacao"] = (acc[row.primary_topic || "Sem classificacao"] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([topic, total]) => ({ topic, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const sourceAdoption = Object.entries(
      (responses.data || []).reduce((acc, row) => {
        const key = row.assistant_key || "public.assistant";
        const current = acc[key] || { total: 0, cited: 0 };
        current.total += 1;
        if (row.source_version_id) current.cited += 1;
        acc[key] = current;
        return acc;
      }, {})
    ).map(([assistant_key, totals]) => ({
      assistant_key,
      total: totals.total,
      source_coverage_rate: totals.total ? Math.round((totals.cited / totals.total) * 100) : 0
    }));

    return res.status(200).json({
      ok: true,
      consultations_by_status: consultationsByStatus,
      top_topics: topTopics,
      source_adoption: sourceAdoption
    });
  } catch (error) {
    console.error("Erro /api/reports/operational-summary:", error);
    return res.status(500).json({ ok: false, error: "Falha ao montar relatorio operacional." });
  }
});

app.get("/api/audit/events", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, events: [] });

  try {
    const schoolId = getSchoolId(req);
    const query = supabase
      .from("formal_audit_events")
      .select("id, consultation_id, event_type, severity, actor_type, actor_name, summary, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (schoolId) {
      query.eq("school_id", schoolId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const consultationIds = [...new Set((data || []).map((row) => row.consultation_id).filter(Boolean))];
    const requesterIds = [...new Set((data || []).map((row) => row.details?.requester_id).filter(Boolean))];
    let consultationsById = {};
    let consultationsByRequesterId = {};
    let messagesByConsultationId = {};
    let responsesByConsultationId = {};
    let responseById = {};
    let messageById = {};

    if (consultationIds.length || requesterIds.length) {
      let consultationsQuery = supabase
        .from("institutional_consultations")
        .select("id, requester_id, requester_name, channel, assigned_assistant_key, opened_at, resolved_at, metadata")
        .order("opened_at", { ascending: false })
        .limit(500);

      if (consultationIds.length && requesterIds.length) {
        const filters = consultationIds.map((id) => `id.eq.${id}`).concat(requesterIds.map((id) => `requester_id.eq.${id}`));
        consultationsQuery = consultationsQuery.or(filters.join(","));
      } else if (consultationIds.length) {
        consultationsQuery = consultationsQuery.in("id", consultationIds);
      } else {
        consultationsQuery = consultationsQuery.in("requester_id", requesterIds);
      }

      const { data: consultationsData, error: consultationsError } = await consultationsQuery;
      if (consultationsError) throw consultationsError;

      consultationsById = (consultationsData || []).reduce((acc, item) => {
        acc[item.id] = item;
        if (item.requester_id && !acc[`requester:${item.requester_id}`]) {
          consultationsByRequesterId[item.requester_id] = consultationsByRequesterId[item.requester_id] || item;
        }
        return acc;
      }, {});

      const effectiveConsultationIds = [...new Set((consultationsData || []).map((item) => item.id).filter(Boolean))];

      if (effectiveConsultationIds.length) {
        const [messagesResult, responsesResult] = await Promise.all([
          supabase
            .from("consultation_messages")
            .select("id, consultation_id, direction, actor_type, actor_name, message_text, created_at")
            .in("consultation_id", effectiveConsultationIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("assistant_responses")
            .select("id, consultation_id, assistant_key, response_text, source_version_id, confidence_score, response_mode, consulted_sources, supporting_source_title, supporting_source_excerpt, supporting_source_version_label, origin_message_id, response_message_id, fallback_to_human, corrected_from_response_id, corrected_at, corrected_by, delivered_at, created_at")
            .in("consultation_id", effectiveConsultationIds)
            .order("delivered_at", { ascending: false })
        ]);

        if (messagesResult.error) throw messagesResult.error;
        if (responsesResult.error) throw responsesResult.error;

        messagesByConsultationId = (messagesResult.data || []).reduce((acc, item) => {
          acc[item.consultation_id] = acc[item.consultation_id] || [];
          acc[item.consultation_id].push(item);
          messageById[item.id] = item;
          return acc;
        }, {});

        responsesByConsultationId = (responsesResult.data || []).reduce((acc, item) => {
          acc[item.consultation_id] = acc[item.consultation_id] || [];
          acc[item.consultation_id].push(item);
          responseById[item.id] = item;
          return acc;
        }, {});
      }
    }

    const classifyScenario = (eventType, details = {}) => {
      if (eventType === "AUTOMATIC_RESPONSE_WITH_EVIDENCE") {
        return { code: "case_1", label: "Caso 1 - Resposta automatica correta" };
      }
      if (eventType === "NO_CONFIDENT_BASIS") {
        return { code: "case_2", label: "Caso 2 - Sem base suficiente" };
      }
      if (eventType === "MANUAL_CLOSURE" || details.closed_manually) {
        return { code: "case_3", label: "Caso 3 - Intervencao manual" };
      }
      if (eventType === "RESPONSE_CORRECTED" || eventType === "SOURCE_VERSION_PUBLISHED") {
        return { code: "case_4", label: "Caso 4 - Resposta corrigida ou fonte atualizada" };
      }
      return { code: "other", label: "Outros eventos auditaveis" };
    };

    function findRelatedResponse(row, details, consultationId) {
      const responses = responsesByConsultationId[consultationId] || [];
      if (!responses.length) return null;
      if (details.response_id && responseById[details.response_id]) {
        return responseById[details.response_id];
      }
      if (details.response_message_id) {
        const direct = responses.find((item) => item.response_message_id === details.response_message_id);
        if (direct) return direct;
      }
      const eventTime = new Date(row.created_at).getTime();
      const beforeEvent = responses.find((item) => new Date(item.delivered_at || item.created_at || row.created_at).getTime() <= eventTime + 1000);
      return beforeEvent || responses[0] || null;
    }

    function findOriginalQuestion(row, details, consultationId, relatedResponse) {
      if (details.original_question) return details.original_question;
      if (relatedResponse?.origin_message_id && messageById[relatedResponse.origin_message_id]) {
        return messageById[relatedResponse.origin_message_id].message_text || '-';
      }
      const messages = messagesByConsultationId[consultationId] || [];
      const inboundMessages = messages.filter((item) => item.actor_type === 'CITIZEN');
      if (!inboundMessages.length) return '-';
      if (relatedResponse?.delivered_at) {
        const deliveredAt = new Date(relatedResponse.delivered_at).getTime();
        const candidate = [...inboundMessages].reverse().find((item) => new Date(item.created_at).getTime() <= deliveredAt);
        if (candidate) return candidate.message_text || '-';
      }
      const beforeEvent = [...inboundMessages].reverse().find((item) => new Date(item.created_at).getTime() <= new Date(row.created_at).getTime());
      return beforeEvent?.message_text || inboundMessages[0].message_text || '-';
    }

    function findResponseText(row, details, consultationId, relatedResponse) {
      if (details.response_text) return details.response_text;
      if (details.final_text) return details.final_text;
      if (relatedResponse?.response_text) return relatedResponse.response_text;
      const messages = messagesByConsultationId[consultationId] || [];
      const assistantMessages = messages.filter((item) => item.actor_type === 'ASSISTANT');
      if (!assistantMessages.length) return '-';
      const beforeEvent = [...assistantMessages].reverse().find((item) => new Date(item.created_at).getTime() <= new Date(row.created_at).getTime() + 1000);
      return beforeEvent?.message_text || assistantMessages[assistantMessages.length - 1].message_text || '-';
    }

    const events = (data || []).map((row) => {
      const details = row.details || {};
      const consultation = row.consultation_id
        ? consultationsById[row.consultation_id] || {}
        : (details.requester_id ? consultationsByRequesterId[details.requester_id] || {} : {});
      const effectiveConsultationId = consultation.id || row.consultation_id || null;
      const scenario = classifyScenario(row.event_type, details);
      const relatedResponse = effectiveConsultationId ? findRelatedResponse(row, details, effectiveConsultationId) : null;
      const consultedSources = Array.isArray(details.consulted_sources) && details.consulted_sources.length
        ? details.consulted_sources
        : Array.isArray(relatedResponse?.consulted_sources)
          ? relatedResponse.consulted_sources
          : [];

      return {
        id: row.id,
        consultation_id: row.consultation_id,
        created_at: row.created_at,
        event_type: row.event_type,
        severity: row.severity,
        actor_type: row.actor_type,
        actor_name: row.actor_name,
        summary: row.summary,
        scenario_code: scenario.code,
        scenario_label: scenario.label,
        requester_name: details.requester_name || consultation.requester_name || '-',
        requester_id: details.requester_id || consultation.requester_id || '-',
        channel: details.channel || consultation.channel || '-',
        requester_profile: details.requester_profile || consultation.metadata?.requester_profile || consultation.metadata?.entrypoint || consultation.metadata?.profile || '-',
        assistant_name: details.assistant_name || getAssistantLabel(details.assigned_assistant_key || relatedResponse?.assistant_key || consultation.assigned_assistant_key || 'public.assistant'),
        original_question: effectiveConsultationId ? findOriginalQuestion(row, details, effectiveConsultationId, relatedResponse) : (details.original_question || '-'),
        response_text: effectiveConsultationId ? findResponseText(row, details, effectiveConsultationId, relatedResponse) : (details.response_text || details.final_text || '-'),
        response_mode: details.response_mode || relatedResponse?.response_mode || '-',
        confidence_score: details.confidence_score ?? relatedResponse?.confidence_score ?? null,
        supporting_source_title: details.supporting_source_title || relatedResponse?.supporting_source_title || consultedSources[0]?.source_title || '-',
        supporting_source_version_label: details.supporting_source_version_label || relatedResponse?.supporting_source_version_label || consultedSources[0]?.source_version_label || '-',
        supporting_source_excerpt: details.supporting_source_excerpt || relatedResponse?.supporting_source_excerpt || consultedSources[0]?.source_excerpt || '-',
        source_version_id: details.source_version_id || relatedResponse?.source_version_id || null,
        consulted_sources: consultedSources,
        fallback_to_human: Boolean(details.fallback_to_human ?? relatedResponse?.fallback_to_human),
        fallback_area: details.fallback_area || '-',
        reason: details.reason || '-',
        corrected_at: details.corrected_at || relatedResponse?.corrected_at || null,
        corrected_by: details.corrected_by || relatedResponse?.corrected_by || null,
        details
      };
    });

    return res.status(200).json({ ok: true, events });
  } catch (error) {
    console.error("Erro /api/audit/events:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar trilha de auditoria." });
  }
});
setInterval(() => {
  void processIdleConversations();
}, IDLE_SWEEP_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Servidor institucional online em http://localhost:${PORT}`);
  void processIdleConversations();
});







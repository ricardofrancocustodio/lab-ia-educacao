const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const webhookRoutes = require("./.qodo/web/webhook.js");
const webchatRoutes = require("./.qodo/api/webchat.js");
const { loadRuntimeSettings, invalidateAIProviderCache } = require("./.qodo/services/ai");

const app = express();
const PORT = Number(process.env.PORT || 8084);

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

const PRIVILEGED_ROLES = new Set(["superadmin", "network_manager"]);
const OFFICIAL_CONTENT_ALLOWED_ROLES = new Set(["superadmin", "network_manager", "content_curator", "secretariat", "direction", "coordination"]);

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
app.use("/js", express.static(path.join(__dirname, "public", "dist", "js")));
app.use("/css", express.static(path.join(__dirname, "public", "dist", "css")));
app.use("/components", express.static(path.join(__dirname, "public", "dist", "components")));
app.use(express.static(path.join(__dirname, "public")));
function serveDistPage(res, fileName) {
  return res.sendFile(path.join(__dirname, "public", "dist", fileName));
}

const distPages = new Set([
  "index",
  "dashboard",
  "audit",
  "chat-manager",
  "knowledge-base",
  "reports",
  "users",
  "forgot-password",
  "reset-password",
  "accept-invite",
  "verify-session",
  "dashboard-preferencias",
  "official-content"
]);

app.get("/", (_req, res) => serveDistPage(res, "index.html"));
app.get("/dist", (_req, res) => serveDistPage(res, "index.html"));
app.get("/dist/:page", (req, res, next) => {
  const page = String(req.params.page || "").trim().toLowerCase();
  if (!distPages.has(page)) return next();
  return serveDistPage(res, `${page}.html`);
});

app.get("/login", (_req, res) => serveDistPage(res, "index.html"));
app.get("/dashboard", (_req, res) => serveDistPage(res, "dashboard.html"));
app.get("/audit", (_req, res) => serveDistPage(res, "audit.html"));
app.get("/atendimento", (_req, res) => serveDistPage(res, "chat-manager.html"));
app.get("/conhecimento", (_req, res) => serveDistPage(res, "knowledge-base.html"));
app.get("/relatorios", (_req, res) => serveDistPage(res, "reports.html"));
app.get("/usuarios", (_req, res) => serveDistPage(res, "users.html"));
app.get("/preferencias", (_req, res) => serveDistPage(res, "dashboard-preferencias.html"));
app.get("/conteudo-oficial", (_req, res) => serveDistPage(res, "official-content.html"));
app.get("/esqueci-senha", (_req, res) => serveDistPage(res, "forgot-password.html"));
app.get("/redefinir-senha", (_req, res) => serveDistPage(res, "reset-password.html"));
app.get("/ativar-conta", (_req, res) => serveDistPage(res, "accept-invite.html"));
app.get("/verificar-sessao", (_req, res) => serveDistPage(res, "verify-session.html"));
app.use("/webhook", webhookRoutes);
app.use("/api/webchat", webchatRoutes);

function getSchoolId(req) {
  return String(req.query.school_id || req.body?.school_id || process.env.SCHOOL_ID || "").trim();
}

function getBearerToken(req) {
  const authorization = String(req.headers?.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function normalizeRoleKey(role) {
  return String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function resolveRequestContext(req, options = {}) {
  if (!supabase) {
    throw Object.assign(new Error("Supabase nao configurado no servidor."), { statusCode: 500 });
  }

  const token = getBearerToken(req);
  if (!token) {
    throw Object.assign(new Error("Sessao expirada ou ausente. Faca login novamente."), { statusCode: 401 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError) {
    throw Object.assign(new Error("Nao foi possivel validar a sessao informada."), { statusCode: 401, cause: authError });
  }

  const user = authData?.user || null;
  if (!user?.id) {
    throw Object.assign(new Error("Usuario autenticado nao encontrado."), { statusCode: 401 });
  }

  const userEmail = String(user.email || "").trim().toLowerCase();
  const [platformResult, schoolResult] = await Promise.all([
    supabase
      .from("platform_members")
      .select("role, name, email, active")
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("school_members")
      .select("school_id, role, name, email, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()
  ]);

  if (platformResult.error) {
    throw Object.assign(new Error("Falha ao carregar o contexto da plataforma."), { statusCode: 500, cause: platformResult.error });
  }

  let schoolMember = schoolResult.data || null;
  if (!schoolMember && userEmail) {
    const fallbackSchoolResult = await supabase
      .from("school_members")
      .select("school_id, role, name, email, active")
      .eq("email", userEmail)
      .eq("active", true)
      .maybeSingle();
    if (fallbackSchoolResult.error) {
      throw Object.assign(new Error("Falha ao carregar o contexto escolar."), { statusCode: 500, cause: fallbackSchoolResult.error });
    }
    schoolMember = fallbackSchoolResult.data || null;
  }

  const platformMember = platformResult.data || null;
  let schoolId = String(schoolMember?.school_id || "").trim();
  let schoolRole = normalizeRoleKey(schoolMember?.role || "");
  let platformRole = normalizeRoleKey(platformMember?.role || "");

  if (!schoolId && options.allowSuperadminFallback !== false && platformRole === "superadmin") {
    const firstSchoolResult = await supabase
      .from("schools")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstSchoolResult.error) {
      throw Object.assign(new Error("Falha ao resolver a escola do superadmin."), { statusCode: 500, cause: firstSchoolResult.error });
    }

    schoolId = String(firstSchoolResult.data?.id || "").trim();
    schoolRole = "superadmin";
  }

  if (!schoolId) {
    throw Object.assign(new Error("Usuario sem vinculo escolar ativo."), { statusCode: 403 });
  }

  const requestedSchoolId = getSchoolId(req);
  if (requestedSchoolId && requestedSchoolId !== schoolId) {
    throw Object.assign(new Error("A escola informada na requisicao nao corresponde ao contexto autenticado."), { statusCode: 403 });
  }

  const effectiveRole = platformRole || schoolRole;
  if (!effectiveRole) {
    throw Object.assign(new Error("Usuario sem papel efetivo para acessar este recurso."), { statusCode: 403 });
  }

  return {
    user,
    schoolId,
    schoolRole,
    platformRole,
    effectiveRole,
    memberName: schoolMember?.name || platformMember?.name || user.user_metadata?.full_name || user.user_metadata?.name || "",
    memberEmail: schoolMember?.email || platformMember?.email || user.email || ""
  };
}

async function requireRequestContext(req, res, options = {}) {
  try {
    const context = await resolveRequestContext(req, options);
    if (Array.isArray(options.allowedRoles) && options.allowedRoles.length) {
      const allowedRoles = new Set(options.allowedRoles.map((item) => normalizeRoleKey(item)));
      if (!allowedRoles.has(context.effectiveRole)) {
        return { ok: false, response: res.status(403).json({ ok: false, error: "Seu perfil nao tem permissao para esta operacao." }) };
      }
    }
    req.accessContext = context;
    return { ok: true, context };
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    if (statusCode >= 500) {
      console.error("Erro ao validar contexto autenticado:", error?.cause || error);
    }
    return { ok: false, response: res.status(statusCode).json({ ok: false, error: error.message || "Falha ao validar a sessao." }) };
  }
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

function getPreviousPeriodConfig(periodConfig) {
  if (!periodConfig?.start || !periodConfig?.end || periodConfig.period === 'all') {
    return { period: 'previous', label: 'Periodo anterior', start: null, end: null };
  }

  const currentStart = new Date(periodConfig.start);
  const currentEnd = new Date(periodConfig.end);
  const durationMs = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    period: 'previous_' + periodConfig.period,
    label: 'Periodo anterior a ' + periodConfig.label,
    start: previousStart,
    end: previousEnd
  };
}

function isMissingRelationError(error) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return message.includes('does not exist') || (message.includes('relation') && message.includes('does not exist'));
}

function fallbackDashboard(periodConfig = { period: "today", label: "Hoje" }) {
  return {
    ok: true,
    period: periodConfig.period,
    period_label: periodConfig.label,
    metrics: {
      total_consultations: 0,
      total_questions: 0,
      unique_requesters: 0,
      active_consultations: 0,
      resolved_consultations: 0,
      automatic_resolution_rate: 0,
      fallback_rate: 0,
      source_coverage_rate: 0,
      avg_confidence: 0,
      avg_response_time_seconds: 0,
      pending_reviews: 0,
      audited_events: 0
    },
    assistant_volume: [
      { assistant_key: "public.assistant", assistant_name: "Assistente Publico", total: 0 },
      { assistant_key: "administration.secretariat", assistant_name: "Assistente da Secretaria", total: 0 },
      { assistant_key: "administration.treasury", assistant_name: "Assistente da Tesouraria", total: 0 },
      { assistant_key: "administration.direction", assistant_name: "Assistente da Direcao", total: 0 }
    ],
    top_topics: [],
    channel_volume: [],
    risk_overview: [],
    response_risk_module: {
      summary: {},
      risk_distribution: [],
      highest_risk_topics: [],
      assistants_under_review: []
    },
    latest_audit_events: []
  };
}

function buildResponseRiskModule(rows = []) {
  const assessedRows = rows.filter((row) => row && (row.risk_level || row.review_required !== undefined || row.evidence_score !== undefined || row.has_valid_source !== undefined));
  const evidenceValues = assessedRows.map((row) => Number(row.evidence_score || 0)).filter((value) => !Number.isNaN(value) && value > 0);
  const confidenceValues = assessedRows.map((row) => Number(row.confidence_score || 0)).filter((value) => !Number.isNaN(value) && value > 0);
  const riskDistribution = Object.entries(assessedRows.reduce((acc, row) => {
    const key = String(row.risk_level || 'LOW').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([risk_level, total]) => ({ risk_level, total })).sort((a, b) => b.total - a.total);

  const highestRiskTopics = Object.values(assessedRows.reduce((acc, row) => {
    const key = row.topic || 'Sem classificacao';
    const current = acc[key] || { topic: key, total: 0, high: 0, review_required: 0, abstained: 0, no_source: 0 };
    current.total += 1;
    if (String(row.risk_level || 'LOW').toUpperCase() === 'HIGH') current.high += 1;
    if (row.review_required) current.review_required += 1;
    if (row.abstained) current.abstained += 1;
    if (row.has_valid_source === false) current.no_source += 1;
    acc[key] = current;
    return acc;
  }, {})).map((item) => ({
    topic: item.topic,
    total: item.total,
    high_risk_rate: item.total ? Math.round((item.high / item.total) * 100) : 0,
    review_rate: item.total ? Math.round((item.review_required / item.total) * 100) : 0,
    abstention_rate: item.total ? Math.round((item.abstained / item.total) * 100) : 0,
    no_source_rate: item.total ? Math.round((item.no_source / item.total) * 100) : 0
  })).sort((a, b) => b.high_risk_rate - a.high_risk_rate || b.review_rate - a.review_rate || b.total - a.total).slice(0, 10);

  const assistantsUnderReview = Object.values(assessedRows.reduce((acc, row) => {
    const key = row.assistant_key || 'unassigned';
    const current = acc[key] || { assistant_key: key, assistant_name: row.assistant_name || key, total: 0, review_required: 0, high: 0 };
    current.total += 1;
    if (row.review_required) current.review_required += 1;
    if (String(row.risk_level || 'LOW').toUpperCase() === 'HIGH') current.high += 1;
    acc[key] = current;
    return acc;
  }, {})).map((item) => ({
    assistant_key: item.assistant_key,
    assistant_name: item.assistant_name,
    total: item.total,
    review_rate: item.total ? Math.round((item.review_required / item.total) * 100) : 0,
    high_risk_rate: item.total ? Math.round((item.high / item.total) * 100) : 0
  })).sort((a, b) => b.review_rate - a.review_rate || b.high_risk_rate - a.high_risk_rate || b.total - a.total).slice(0, 10);

  return {
    summary: {
      total_assessed_responses: assessedRows.length,
      high_risk_count: assessedRows.filter((row) => String(row.risk_level || 'LOW').toUpperCase() === 'HIGH').length,
      medium_risk_count: assessedRows.filter((row) => String(row.risk_level || 'LOW').toUpperCase() === 'MEDIUM').length,
      low_risk_count: assessedRows.filter((row) => String(row.risk_level || 'LOW').toUpperCase() === 'LOW').length,
      review_required_count: assessedRows.filter((row) => row.review_required).length,
      abstained_count: assessedRows.filter((row) => row.abstained).length,
      no_valid_source_count: assessedRows.filter((row) => row.has_valid_source === false).length,
      avg_evidence_score: evidenceValues.length ? Number((evidenceValues.reduce((sum, value) => sum + value, 0) / evidenceValues.length).toFixed(2)) : 0,
      avg_confidence_score: confidenceValues.length ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2)) : 0
    },
    risk_distribution: riskDistribution,
    highest_risk_topics: highestRiskTopics,
    assistants_under_review: assistantsUnderReview
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


app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "lab-ia-educacao", at: new Date().toISOString() });
});

app.get("/api/knowledge/sources", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, sources: [] });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "content_curator", "direction", "secretariat"] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;

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
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "content_curator", "direction", "secretariat"] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;

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
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "content_curator", "direction"] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const owningArea = ensureAssistantArea(req.body?.owning_area);
    const documentType = String(req.body?.document_type || "arquivo_oficial").trim();
    const canonicalReference = String(req.body?.canonical_reference || "").trim() || null;
    const description = String(req.body?.description || "").trim() || null;
    const userId = access.context.user.id;
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

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
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "content_curator", "direction"] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const userId = access.context.user.id;
    const content = normalizeText(req.body?.content || "");
    const fileName = String(req.body?.file_name || "").trim() || null;
    const mimeType = String(req.body?.mime_type || "").trim() || null;
    const versionLabel = String(req.body?.version_label || "").trim() || null;

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

function formatOfficialContentForKnowledge(moduleKey, scopeKey, title, summary, contentPayload = {}) {
  const lines = [];
  const safeTitle = String(title || "").trim();
  const safeSummary = String(summary || "").trim();
  if (safeTitle) lines.push(safeTitle);
  if (safeSummary) lines.push(safeSummary);

  if (moduleKey === "calendar") {
    const entries = Array.isArray(contentPayload.entries) ? contentPayload.entries : [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index] || {};
      const startDate = String(entry?.start_date || entry?.date || "").trim();
      const endDate = String(entry?.end_date || entry?.date || startDate).trim();
      const title = String(entry?.title || "").trim();
      const eventType = String(entry?.event_type || entry?.type || "").trim();
      const audience = String(entry?.audience || "").trim();
      const location = String(entry?.location || "").trim();
      const shift = String(entry?.shift || "").trim();
      const requiredAction = String(entry?.required_action || "").trim();
      const notes = String(entry?.notes || "").trim();
      const sourceReference = String(entry?.source_reference || entry?.source || "").trim();
      const period = startDate && endDate && endDate !== startDate ? (startDate + " ate " + endDate) : (startDate || endDate);
      const row = [
        "Evento " + (index + 1) + ": " + (title || "Sem titulo"),
        period ? "Periodo: " + period : "",
        eventType ? "Tipo: " + eventType : "",
        audience ? "Publico: " + audience : "",
        location ? "Local: " + location : "",
        shift ? "Turno: " + shift : "",
        requiredAction ? "Acao requerida: " + requiredAction : "",
        notes ? "Observacoes: " + notes : "",
        sourceReference ? "Fonte: " + sourceReference : ""
      ].filter(Boolean).join(" | ");
      if (row) lines.push(row);
    }
  }

  if (moduleKey === "enrollment") {
    const map = [
      ["Periodo de matricula", contentPayload.enrollment_period],
      ["Periodo de rematricula", contentPayload.reenrollment_period],
      ["Publico-alvo", contentPayload.target_audience],
      ["Regras especiais", contentPayload.special_rules],
      ["Norma oficial", contentPayload.official_link]
    ];
    map.forEach(([label, value]) => { if (value) lines.push(label + ": " + value); });
    const required = Array.isArray(contentPayload.required_documents) ? contentPayload.required_documents : [];
    const optional = Array.isArray(contentPayload.optional_documents) ? contentPayload.optional_documents : [];
    if (required.length) lines.push("Documentos obrigatorios: " + required.join("; "));
    if (optional.length) lines.push("Documentos opcionais: " + optional.join("; "));
  }

  if (moduleKey === "faq") {
    const items = Array.isArray(contentPayload.items) ? contentPayload.items : [];
    items.forEach((item, index) => {
      lines.push(("FAQ " + (index + 1) + ": " + (item.question || "")).trim());
      if (item.answer) lines.push("Resposta: " + item.answer);
      if (item.category) lines.push("Categoria: " + item.category);
      if (item.audience) lines.push("Publico-alvo: " + item.audience);
      if (item.scope) lines.push("Escopo: " + item.scope);
      if (item.version) lines.push("Versao: " + item.version);
      if (item.source) lines.push("Fonte associada: " + item.source);
    });
  }

  if (moduleKey === "notices") {
    const items = Array.isArray(contentPayload.items) ? contentPayload.items : [];
    items.forEach((item, index) => {
      lines.push(("Comunicado " + (index + 1) + ": " + (item.title || "")).trim());
      if (item.type) lines.push("Tipo: " + item.type);
      if (item.start_date || item.end_date) lines.push("Vigencia: " + (item.start_date || "-") + " ate " + (item.end_date || "-"));
      if (item.message) lines.push("Mensagem: " + item.message);
      if (item.attachment_url) lines.push("Anexo: " + item.attachment_url);
    });
  }

  lines.push("Escopo de publicacao: " + (scopeKey === "network" ? "Rede/Secretaria" : "Escola"));
  return normalizeText(lines.filter(Boolean).join("\\n\\n"));
}

async function ensureOfficialContentSourceDocument({ schoolId, moduleKey, scopeKey, title, summary, existingSourceDocumentId = null }) {
  let sourceDocument = null;
  const canonicalReference = "official-content:" + moduleKey + ":" + scopeKey;

  if (existingSourceDocumentId) {
    const { data, error } = await supabase.from("source_documents").select("*").eq("school_id", schoolId).eq("id", existingSourceDocumentId).maybeSingle();
    if (error) throw error;
    sourceDocument = data || null;
  }

  if (!sourceDocument) {
    const { data, error } = await supabase.from("source_documents").select("*").eq("school_id", schoolId).eq("canonical_reference", canonicalReference).maybeSingle();
    if (error) throw error;
    sourceDocument = data || null;
  }

  const payload = {
    school_id: schoolId,
    title: String(title || (moduleKey + " " + scopeKey)).trim(),
    document_type: "official_content_" + moduleKey,
    owning_area: "public.assistant",
    canonical_reference: canonicalReference,
    description: String(summary || "").trim() || null,
    updated_at: new Date().toISOString()
  };

  if (sourceDocument?.id) {
    const { data, error } = await supabase.from("source_documents").update(payload).eq("id", sourceDocument.id).select("*").single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("source_documents").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}
function buildOfficialContentDefaults(schoolId) {
  return [
    { school_id: schoolId, module_key: "calendar", scope_key: "network", title: "Calendario da Rede/Secretaria", summary: "Calendario-base oficial publicado pela secretaria ou rede.", content_payload: { template_version: "calendar_csv_v1", locale: "pt-BR", columns: ["start_date", "end_date", "title", "event_type", "audience", "location", "shift", "required_action", "notes", "source_reference"], display_columns: ["data_inicio", "data_fim", "titulo", "tipo_evento", "publico", "local", "turno", "acao_necessaria", "observacoes", "fonte_referencia"], entries: [], guidance: "Use uma linha por evento em CSV com datas em YYYY-MM-DD. O usuario pode preencher com cabecalhos em portugues: data_inicio, data_fim, titulo, tipo_evento, publico, local, turno, acao_necessaria, observacoes e fonte_referencia." }, status: "draft" },
    { school_id: schoolId, module_key: "calendar", scope_key: "school", title: "Complementos da Escola", summary: "Eventos e avisos especificos da unidade escolar.", content_payload: { template_version: "calendar_csv_v1", locale: "pt-BR", columns: ["start_date", "end_date", "title", "event_type", "audience", "location", "shift", "required_action", "notes", "source_reference"], display_columns: ["data_inicio", "data_fim", "titulo", "tipo_evento", "publico", "local", "turno", "acao_necessaria", "observacoes", "fonte_referencia"], entries: [], guidance: "Use uma linha por evento local da unidade. O usuario pode preencher com cabecalhos em portugues e o sistema converte para o formato interno automaticamente." }, status: "draft" },
    { school_id: schoolId, module_key: "enrollment", scope_key: "school", title: "Matricula e Documentos Exigidos", summary: "Regras oficiais e documentos do processo de matricula/rematricula.", content_payload: { enrollment_period: "", reenrollment_period: "", target_audience: "", required_documents: [], optional_documents: [], special_rules: "", official_link: "" }, status: "draft" },
    { school_id: schoolId, module_key: "faq", scope_key: "school", title: "FAQ Oficial", summary: "Perguntas e respostas curtas, validadas e rastreaveis.", content_payload: { items: [] }, status: "draft" },
    { school_id: schoolId, module_key: "notices", scope_key: "school", title: "Comunicados Oficiais", summary: "Avisos de vigencia temporaria ou comunicados administrativos.", content_payload: { items: [] }, status: "draft" }
  ];
}

app.get("/api/official-content", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const { data, error } = await supabase.from("official_content_records").select("*").eq("school_id", schoolId).order("module_key", { ascending: true }).order("scope_key", { ascending: true });
    if (error) throw error;
    const rows = data || [];
    const defaults = buildOfficialContentDefaults(schoolId);
    const byKey = new Map(rows.map((row) => [String(row.module_key) + "::" + String(row.scope_key), row]));
    const merged = defaults.map((item) => {
      const existing = byKey.get(String(item.module_key) + "::" + String(item.scope_key));
      return existing ? { ...item, ...existing } : item;
    });
    return res.json({ ok: true, records: merged });
  } catch (error) {
    console.error("Erro /api/official-content:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar Conteudo Oficial." });
  }
});

app.post("/api/official-content/:module/:scope", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const moduleKey = String(req.params.module || "").trim().toLowerCase();
    const scopeKey = String(req.params.scope || "").trim().toLowerCase();
    if (!moduleKey || !scopeKey) return res.status(400).json({ ok: false, error: "Modulo e escopo sao obrigatorios." });
    const allowedModules = new Set(["calendar", "enrollment", "faq", "notices"]);
    const allowedScopes = new Set(["network", "school"]);
    if (!allowedModules.has(moduleKey)) return res.status(400).json({ ok: false, error: "Modulo invalido." });
    if (!allowedScopes.has(scopeKey)) return res.status(400).json({ ok: false, error: "Escopo invalido." });
    const payload = {
      school_id: schoolId,
      module_key: moduleKey,
      scope_key: scopeKey,
      title: String(req.body?.title || "").trim() || null,
      summary: String(req.body?.summary || "").trim() || null,
      content_payload: req.body?.content_payload && typeof req.body.content_payload === "object" ? req.body.content_payload : {},
      status: String(req.body?.status || "published").trim().toLowerCase(),
      source_document_id: req.body?.source_document_id || null,
      source_version_id: req.body?.source_version_id || null,
      updated_by: String(req.body?.updated_by || "").trim() || null,
      updated_at: new Date().toISOString()
    };
    const sourceDocument = await ensureOfficialContentSourceDocument({
      schoolId,
      moduleKey,
      scopeKey,
      title: payload.title || (moduleKey + "-" + scopeKey),
      summary: payload.summary,
      existingSourceDocumentId: payload.source_document_id
    });
    const technicalContent = formatOfficialContentForKnowledge(moduleKey, scopeKey, payload.title, payload.summary, payload.content_payload);
    const version = await publishSourceVersion({
      schoolId,
      sourceDocument,
      versionLabel: moduleKey + "-" + scopeKey + "-" + new Date().toISOString().slice(0, 10),
      content: technicalContent,
      fileName: moduleKey + "-" + scopeKey + ".txt",
      mimeType: "text/plain",
      userId: access.context.user.id
    });
    payload.source_document_id = sourceDocument.id;
    payload.source_version_id = version.id;
    const { data, error } = await supabase.from("official_content_records").upsert(payload, { onConflict: "school_id,module_key,scope_key" }).select("*").single();
    if (error) throw error;
    await supabase.from("formal_audit_events").insert({ school_id: schoolId, event_type: "OFFICIAL_CONTENT_UPDATED", actor_type: "Gestao", actor_name: payload.updated_by || "Conteudo Oficial", consultation_id: null, details: { module_key: moduleKey, scope_key: scopeKey, status: payload.status, title: payload.title, source_document_id: sourceDocument.id, source_version_id: version.id, knowledge_sync: true } });
    return res.json({ ok: true, record: data, source_document: sourceDocument, source_version: version });
  } catch (error) {
    console.error("Erro /api/official-content/:module/:scope:", error);
    return res.status(500).json({ ok: false, error: "Falha ao salvar Conteudo Oficial." });
  }
});

app.get("/api/preferences/ai-provider", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const fallback = await loadRuntimeSettings();

    if (!supabase) {
      return res.status(200).json({ ok: true, settings: fallback, source: 'env' });
    }

    const { data, error } = await supabase
      .from("ai_provider_settings")
      .select("school_id, active_provider, openai_chat_model, groq_model, updated_by, updated_at")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (error) {
      const message = String(error.message || error.details || '').toLowerCase();
      if (message.includes('does not exist')) {
        return res.status(200).json({ ok: true, settings: fallback, source: 'env' });
      }
      throw error;
    }

    return res.status(200).json({
      ok: true,
      settings: {
        active_provider: data?.active_provider || fallback.active_provider,
        openai_chat_model: data?.openai_chat_model || fallback.openai_chat_model,
        groq_model: data?.groq_model || fallback.groq_model,
        updated_by: data?.updated_by || null,
        updated_at: data?.updated_at || null
      },
      source: data ? 'database' : 'env'
    });
  } catch (error) {
    console.error("Erro /api/preferences/ai-provider:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar configuracao de IA." });
  }
});

app.post("/api/preferences/ai-provider", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase indisponivel." });
    }

    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;
    const activeProvider = String(req.body?.active_provider || '').trim().toLowerCase();
    const openaiModel = String(req.body?.openai_chat_model || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini').trim();
    const groqModel = String(req.body?.groq_model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
    const updatedBy = String(req.body?.updated_by || access.context.memberName || access.context.memberEmail || 'Operador institucional').trim();

    if (!['openai', 'groq', 'gemini'].includes(activeProvider)) {
      return res.status(400).json({ ok: false, error: 'active_provider invalido.' });
    }

    const { data, error } = await supabase
      .from("ai_provider_settings")
      .upsert({
        school_id: schoolId,
        active_provider: activeProvider,
        openai_chat_model: openaiModel || null,
        groq_model: groqModel || null,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' })
      .select("school_id, active_provider, openai_chat_model, groq_model, updated_by, updated_at")
      .single();

    if (error) {
      const message = String(error.message || error.details || '').toLowerCase();
      if (message.includes('does not exist')) {
        return res.status(501).json({ ok: false, error: 'Tabela ai_provider_settings ainda nao foi criada no banco.' });
      }
      throw error;
    }

    invalidateAIProviderCache();

    return res.status(200).json({ ok: true, settings: data });
  } catch (error) {
    console.error("Erro /api/preferences/ai-provider:", error);
    return res.status(500).json({ ok: false, error: "Falha ao salvar configuracao de IA." });
  }
});

app.get("/api/intelligence/dashboard", async (req, res) => {
  const periodConfig = getPeriodConfig(req);
  if (!supabase) return res.status(200).json(fallbackDashboard(periodConfig));

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "direction", "auditor", "content_curator", "coordination", "treasury", "public_operator", "secretariat", "observer"] });
    if (!access.ok) return access.response;
    const schoolId = access.context.schoolId;

    const consultationsResult = await applyRange(
      supabase
        .from("institutional_consultations")
        .select("id, requester_id, channel, status, primary_topic, assigned_assistant_key, opened_at")
        .eq("school_id", schoolId)
        .order("opened_at", { ascending: false })
        .limit(2000),
      "opened_at",
      periodConfig
    );
    if (consultationsResult.error) throw consultationsResult.error;

    const consultationsRows = consultationsResult.data || [];
    const consultationIds = consultationsRows.map((row) => row.id).filter(Boolean);

    const [responsesResult, auditsResult, latestAuditsResult, messagesResult] = await Promise.all([
      applyRange(
        supabase
          .from("assistant_responses")
          .select("consultation_id, assistant_key, confidence_score, source_version_id, created_at, delivered_at, response_mode, fallback_to_human")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(2000),
        "created_at",
        periodConfig
      ),
      applyRange(
        supabase
          .from("formal_audit_events")
          .select("consultation_id, event_type, severity, details, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(2000),
        "created_at",
        periodConfig
      ),
      applyRange(
        supabase
          .from("formal_audit_events")
          .select("event_type, severity, created_at, summary")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(8),
        "created_at",
        periodConfig
      ),
      consultationIds.length
        ? supabase
            .from("consultation_messages")
            .select("consultation_id, actor_type, created_at")
            .in("consultation_id", consultationIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

    if (responsesResult.error) throw responsesResult.error;
    if (auditsResult.error) throw auditsResult.error;
    if (latestAuditsResult.error) throw latestAuditsResult.error;
    if (messagesResult.error) throw messagesResult.error;

    const responsesRows = responsesResult.data || [];
    const auditRows = auditsResult.data || [];
    const messageRows = messagesResult.data || [];
    const inboundMessages = messageRows.filter((row) => row.actor_type === "CITIZEN");
    const uniqueRequesters = new Set(consultationsRows.map((row) => row.requester_id).filter(Boolean)).size;
    const citedResponses = responsesRows.filter((row) => row.source_version_id).length;
    const automaticResponses = responsesRows.filter((row) => ["AUTOMATIC", "AUTOMATIC_LIMITED"].includes(String(row.response_mode || "").toUpperCase())).length;
    const fallbackResponses = responsesRows.filter((row) => Boolean(row.fallback_to_human)).length;
    const confidenceValues = responsesRows
      .map((row) => Number(row.confidence_score || 0))
      .filter((value) => !Number.isNaN(value) && value > 0);
    const pendingReviews = auditRows.filter((row) => {
      const details = row.details || {};
      const status = String(details.review_status || (details.review_required ? "PENDING_REVIEW" : "NOT_REQUIRED")).toUpperCase();
      return status === "PENDING_REVIEW";
    }).length;

    const messagesByConsultation = inboundMessages.reduce((acc, row) => {
      acc[row.consultation_id] = acc[row.consultation_id] || [];
      acc[row.consultation_id].push(row);
      return acc;
    }, {});
    const responseByConsultation = responsesRows.reduce((acc, row) => {
      acc[row.consultation_id] = acc[row.consultation_id] || [];
      acc[row.consultation_id].push(row);
      return acc;
    }, {});
    const responseTimes = consultationIds.map((consultationId) => {
      const firstQuestion = (messagesByConsultation[consultationId] || [])[0];
      const firstResponse = (responseByConsultation[consultationId] || [])
        .slice()
        .sort((a, b) => new Date(a.delivered_at || a.created_at).getTime() - new Date(b.delivered_at || b.created_at).getTime())[0];
      if (!firstQuestion || !firstResponse) return null;
      const diffSeconds = Math.round((new Date(firstResponse.delivered_at || firstResponse.created_at).getTime() - new Date(firstQuestion.created_at).getTime()) / 1000);
      return diffSeconds >= 0 ? diffSeconds : null;
    }).filter((value) => value !== null);

    const totalsByAssistant = responsesRows.reduce((acc, row) => {
      const key = row.assistant_key || "public.assistant";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topTopics = Object.entries(
      consultationsRows.reduce((acc, row) => {
        const key = row.primary_topic || "Sem classificacao";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([topic, total]) => ({ topic, total })).sort((a, b) => b.total - a.total).slice(0, 8);
    const channelVolume = Object.entries(
      consultationsRows.reduce((acc, row) => {
        const key = row.channel || "webchat";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([channel, total]) => ({ channel, total })).sort((a, b) => b.total - a.total);
    const riskOverview = Object.entries(
      auditRows.reduce((acc, row) => {
        const key = String(row.details?.hallucination_risk_level || "LOW").toUpperCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([risk_level, total]) => ({ risk_level, total })).sort((a, b) => b.total - a.total);

    const latestAuditByConsultation = auditRows.reduce((acc, row) => {
      if (!row.consultation_id) return acc;
      if (!acc[row.consultation_id]) acc[row.consultation_id] = row;
      return acc;
    }, {});
    const dashboardRiskRows = consultationsRows.map((consultation) => {
      const response = (responseByConsultation[consultation.id] || [])[0] || null;
      const details = latestAuditByConsultation[consultation.id]?.details || {};
      const riskLevel = String(details.hallucination_risk_level || (!response?.source_version_id ? 'HIGH' : 'LOW')).toUpperCase();
      return {
        topic: consultation.primary_topic || 'Sem classificacao',
        assistant_key: response?.assistant_key || consultation.assigned_assistant_key || 'public.assistant',
        assistant_name: getAssistantLabel(response?.assistant_key || consultation.assigned_assistant_key || 'public.assistant'),
        risk_level: riskLevel,
        review_required: Boolean(details.review_required || riskLevel !== 'LOW'),
        abstained: Boolean(details.abstained),
        has_valid_source: Boolean(response?.source_version_id),
        evidence_score: details.evidence_score ?? null,
        confidence_score: response?.confidence_score ?? null
      };
    });
    const responseRiskModule = buildResponseRiskModule(dashboardRiskRows);

    return res.status(200).json({
      ok: true,
      period: periodConfig.period,
      period_label: periodConfig.label,
      metrics: {
        total_consultations: consultationsRows.length,
        total_questions: inboundMessages.length,
        unique_requesters: uniqueRequesters,
        active_consultations: consultationsRows.filter((row) => ["OPEN", "IN_PROGRESS"].includes(row.status)).length,
        resolved_consultations: consultationsRows.filter((row) => row.status === "RESOLVED").length,
        automatic_resolution_rate: responsesRows.length ? Math.round((automaticResponses / responsesRows.length) * 100) : 0,
        fallback_rate: responsesRows.length ? Math.round((fallbackResponses / responsesRows.length) * 100) : 0,
        source_coverage_rate: responsesRows.length ? Math.round((citedResponses / responsesRows.length) * 100) : 0,
        avg_confidence: confidenceValues.length ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2)) : 0,
        avg_response_time_seconds: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : 0,
        pending_reviews: pendingReviews,
        audited_events: auditRows.length
      },
      assistant_volume: [
        { assistant_key: "public.assistant", assistant_name: "Assistente Publico", total: totalsByAssistant["public.assistant"] || 0 },
        { assistant_key: "administration.secretariat", assistant_name: "Assistente da Secretaria", total: totalsByAssistant["administration.secretariat"] || 0 },
        { assistant_key: "administration.treasury", assistant_name: "Assistente da Tesouraria", total: totalsByAssistant["administration.treasury"] || 0 },
        { assistant_key: "administration.direction", assistant_name: "Assistente da Direcao", total: totalsByAssistant["administration.direction"] || 0 }
      ],
      top_topics: topTopics,
      channel_volume: channelVolume,
      risk_overview: riskOverview,
      response_risk_module: responseRiskModule,
      latest_audit_events: latestAuditsResult.data || []
    });
  } catch (error) {
    console.error("Erro /api/intelligence/dashboard:", error);
    return res.status(500).json({ ok: false, error: "Falha ao montar dashboard de inteligencia." });
  }
});

app.get("/api/reports/operational-summary", async (req, res) => {
  const periodConfig = getPeriodConfig(req);
  const previousPeriodConfig = getPreviousPeriodConfig(periodConfig);

  const emptyPayload = {
    ok: true,
    period: periodConfig.period,
    period_label: periodConfig.label,
    summary: {},
    comparison: {},
    previous_summary: {},
    consultations_by_status: [],
    top_topics: [],
    source_adoption: [],
    channel_volume: [],
    risk_overview: [],
    assistant_performance: [],
    peak_hours: [],
    unresolved_topics: [],
    top_documents_used: [],
    response_risk_module: {
      summary: {},
      risk_distribution: [],
      highest_risk_topics: [],
      assistants_under_review: []
    },
    recurring_demand: {
      summary: {},
      top_recurring_topics: [],
      fastest_growth_topics: [],
      highest_fallback_topics: [],
      highest_dissatisfaction_topics: [],
      by_assistant: []
    },
    detail_rows: []
  };

  if (!supabase) {
    return res.status(200).json(emptyPayload);
  }

  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(200).json(emptyPayload);
    }

    const fetchOptionalRows = async (queryPromise) => {
      const result = await queryPromise;
      if (result.error) {
        if (isMissingRelationError(result.error)) return [];
        throw result.error;
      }
      return result.data || [];
    };

    const buildRecurringDemand = (rows, previousRows = []) => {
      const currentTotal = rows.length || 0;
      const previousCounts = previousRows.reduce((acc, row) => {
        const key = row.topic || 'Sem classificacao';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const topicStats = Object.values(rows.reduce((acc, row) => {
        const key = row.topic || 'Sem classificacao';
        const current = acc[key] || {
          topic: key,
          total: 0,
          question_volume: 0,
          answered: 0,
          fallback: 0,
          negative_feedback: 0,
          incorrect_feedback: 0,
          assistants: {}
        };
        current.total += 1;
        current.question_volume += Number(row.question_count || 0);
        if (row.response_mode && row.response_mode !== 'NO_RESPONSE') current.answered += 1;
        if (row.fallback_to_human) current.fallback += 1;
        if (Number(row.feedback_not_helpful || 0) > 0 || Number(row.feedback_incorrect || 0) > 0) current.negative_feedback += 1;
        if (Number(row.feedback_incorrect || 0) > 0) current.incorrect_feedback += 1;
        const assistantKey = row.assistant_key || 'unassigned';
        current.assistants[assistantKey] = current.assistants[assistantKey] || { assistant_key: assistantKey, assistant_name: row.assistant_name || assistantKey, total: 0 };
        current.assistants[assistantKey].total += 1;
        acc[key] = current;
        return acc;
      }, {})).map((item) => {
        const previousTotal = previousCounts[item.topic] || 0;
        const share = currentTotal ? Math.round((item.total / currentTotal) * 100) : 0;
        const fallbackRate = item.answered ? Math.round((item.fallback / item.answered) * 100) : 0;
        const dissatisfactionRate = item.answered ? Math.round((item.negative_feedback / item.answered) * 100) : 0;
        const contestedRate = item.answered ? Math.round((item.incorrect_feedback / item.answered) * 100) : 0;
        const growthCount = item.total - previousTotal;
        const growthRate = previousTotal > 0 ? Math.round(((item.total - previousTotal) / previousTotal) * 100) : (item.total > 0 ? 100 : 0);
        const assistantBreakdown = Object.values(item.assistants).sort((a, b) => b.total - a.total);
        return {
          topic: item.topic,
          total: item.total,
          question_volume: item.question_volume,
          share_of_consultations: share,
          answered_total: item.answered,
          fallback_total: item.fallback,
          fallback_rate: fallbackRate,
          negative_feedback_total: item.negative_feedback,
          dissatisfaction_rate: dissatisfactionRate,
          contested_rate: contestedRate,
          previous_total: previousTotal,
          growth_count: growthCount,
          growth_rate: growthRate,
          assistant_breakdown: assistantBreakdown,
          top_assistant_name: assistantBreakdown[0]?.assistant_name || 'Assistente',
          top_assistant_total: assistantBreakdown[0]?.total || 0
        };
      }).sort((a, b) => b.total - a.total);

      const byAssistant = Object.entries(rows.reduce((acc, row) => {
        const key = row.assistant_key || 'unassigned';
        const current = acc[key] || { assistant_key: key, assistant_name: row.assistant_name || key, total: 0, top_topic: 'Sem classificacao', top_topic_total: 0, topics: {} };
        current.total += 1;
        const topic = row.topic || 'Sem classificacao';
        current.topics[topic] = (current.topics[topic] || 0) + 1;
        if (current.topics[topic] > current.top_topic_total) {
          current.top_topic = topic;
          current.top_topic_total = current.topics[topic];
        }
        acc[key] = current;
        return acc;
      }, {})).map(([assistant_key, item]) => ({
        assistant_key,
        assistant_name: item.assistant_name,
        total: item.total,
        top_topic: item.top_topic,
        top_topic_total: item.top_topic_total
      })).sort((a, b) => b.total - a.total);

      return {
        summary: {
          tracked_topics: topicStats.length,
          top_topic: topicStats[0]?.topic || 'Sem classificacao',
          top_topic_total: topicStats[0]?.total || 0,
          top_topic_share: topicStats[0]?.share_of_consultations || 0,
          top_topic_fallback_rate: topicStats[0]?.fallback_rate || 0,
          top_topic_dissatisfaction_rate: topicStats[0]?.dissatisfaction_rate || 0
        },
        top_recurring_topics: topicStats.slice(0, 10),
        fastest_growth_topics: topicStats.slice().sort((a, b) => b.growth_count - a.growth_count || b.total - a.total).slice(0, 10),
        highest_fallback_topics: topicStats.filter((item) => item.answered_total > 0).sort((a, b) => b.fallback_rate - a.fallback_rate || b.total - a.total).slice(0, 10),
        highest_dissatisfaction_topics: topicStats.filter((item) => item.answered_total > 0).sort((a, b) => b.dissatisfaction_rate - a.dissatisfaction_rate || b.total - a.total).slice(0, 10),
        by_assistant: byAssistant
      };
    };

    const buildAggregates = (rows, feedbackRows, incidentRows, evidenceRows) => {
      const answeredRows = rows.filter((row) => row.response_mode && row.response_mode !== "NO_RESPONSE");
      const automaticRows = answeredRows.filter((row) => ["AUTOMATIC", "AUTOMATIC_LIMITED"].includes(String(row.response_mode || "").toUpperCase()));
      const citedRows = answeredRows.filter((row) => row.has_valid_source);
      const confidenceValues = answeredRows.map((row) => Number(row.confidence_score || 0)).filter((value) => !Number.isNaN(value) && value > 0);
      const responseTimes = rows.map((row) => Number(row.response_time_seconds)).filter((value) => !Number.isNaN(value) && value >= 0);
      const resolvedIncidents = incidentRows.filter((row) => row.resolved_at);
      const incidentResolutionHours = resolvedIncidents.map((row) => {
        const diffMs = new Date(row.resolved_at).getTime() - new Date(row.opened_at).getTime();
        return diffMs >= 0 ? diffMs / 3600000 : null;
      }).filter((value) => value !== null);

      const groupCount = (items, keyResolver, fieldName, limit = null) => {
        const grouped = Object.entries(items.reduce((acc, item) => {
          const key = keyResolver(item) || "Sem classificacao";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})).map(([key, total]) => ({ [fieldName]: key, total })).sort((a, b) => b.total - a.total);
        return limit ? grouped.slice(0, limit) : grouped;
      };

      const sourceAdoption = Object.entries(answeredRows.reduce((acc, row) => {
        const key = row.assistant_key || "unassigned";
        const current = acc[key] || { assistant_name: row.assistant_name || key, total: 0, cited: 0 };
        current.total += 1;
        if (row.has_valid_source) current.cited += 1;
        acc[key] = current;
        return acc;
      }, {})).map(([assistant_key, totals]) => ({
        assistant_key,
        assistant_name: totals.assistant_name,
        total: totals.total,
        source_coverage_rate: totals.total ? Math.round((totals.cited / totals.total) * 100) : 0
      })).sort((a, b) => b.total - a.total);

      const assistantPerformance = Object.entries(answeredRows.reduce((acc, row) => {
        const key = row.assistant_key || "unassigned";
        const current = acc[key] || { assistant_name: row.assistant_name || key, total: 0, fallback: 0, automatic: 0, confidence_sum: 0, confidence_count: 0, incorrect: 0 };
        current.total += 1;
        if (row.fallback_to_human) current.fallback += 1;
        if (["AUTOMATIC", "AUTOMATIC_LIMITED"].includes(String(row.response_mode || "").toUpperCase())) current.automatic += 1;
        if (Number(row.feedback_incorrect || 0) > 0) current.incorrect += 1;
        const confidence = Number(row.confidence_score || 0);
        if (!Number.isNaN(confidence) && confidence > 0) {
          current.confidence_sum += confidence;
          current.confidence_count += 1;
        }
        acc[key] = current;
        return acc;
      }, {})).map(([assistant_key, totals]) => ({
        assistant_key,
        assistant_name: totals.assistant_name,
        total_questions: totals.total,
        automatic_resolution_rate: totals.total ? Math.round((totals.automatic / totals.total) * 100) : 0,
        fallback_rate: totals.total ? Math.round((totals.fallback / totals.total) * 100) : 0,
        contested_rate: totals.total ? Math.round((totals.incorrect / totals.total) * 100) : 0,
        avg_confidence: totals.confidence_count ? Number((totals.confidence_sum / totals.confidence_count).toFixed(2)) : 0
      })).sort((a, b) => b.total_questions - a.total_questions);

      const peakHours = groupCount(rows.filter((row) => row.asked_at), (row) => {
        const date = new Date(row.asked_at);
        return Number.isNaN(date.getTime()) ? null : String(date.getHours()).padStart(2, "0") + ":00";
      }, "hour_slot", 8);

      const unresolvedTopics = groupCount(
        rows.filter((row) => row.review_status === "PENDING_REVIEW" || row.risk_level === "HIGH" || row.abstained || !row.has_valid_source),
        (row) => row.topic,
        "topic",
        10
      );

      const topDocumentsUsed = Object.entries(evidenceRows.reduce((acc, row) => {
        const key = row.source_title || "Fonte institucional";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})).map(([source_title, total]) => ({ source_title, total })).sort((a, b) => b.total - a.total).slice(0, 10);

      return {
        summary: {
          total_consultations: rows.length,
          total_questions: rows.reduce((sum, row) => sum + Number(row.question_count || 0), 0),
          unique_requesters: new Set(rows.map((row) => row.requester_id).filter(Boolean)).size,
          automatic_resolution_rate: answeredRows.length ? Math.round((automaticRows.length / answeredRows.length) * 100) : 0,
          fallback_rate: answeredRows.length ? Math.round((answeredRows.filter((row) => row.fallback_to_human).length / answeredRows.length) * 100) : 0,
          source_coverage_rate: answeredRows.length ? Math.round((citedRows.length / answeredRows.length) * 100) : 0,
          avg_confidence: confidenceValues.length ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2)) : 0,
          avg_response_time_seconds: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : 0,
          pending_reviews: rows.filter((row) => row.review_status === "PENDING_REVIEW").length,
          total_feedbacks: feedbackRows.length,
          feedback_positive_rate: feedbackRows.length ? Math.round((feedbackRows.filter((row) => row.feedback_type === "helpful").length / feedbackRows.length) * 100) : 0,
          contested_response_rate: answeredRows.length ? Math.round((feedbackRows.filter((row) => row.feedback_type === "incorrect").length / answeredRows.length) * 100) : 0,
          incident_rate: answeredRows.length ? Math.round((incidentRows.length / answeredRows.length) * 100) : 0,
          open_incidents: incidentRows.filter((row) => row.status === "OPEN" || row.status === "IN_REVIEW").length,
          avg_incident_resolution_hours: incidentResolutionHours.length ? Number((incidentResolutionHours.reduce((sum, value) => sum + value, 0) / incidentResolutionHours.length).toFixed(1)) : 0
        },
        consultations_by_status: groupCount(rows, (row) => row.status || "OPEN", "status"),
        top_topics: groupCount(rows, (row) => row.topic || "Sem classificacao", "topic", 10),
        source_adoption: sourceAdoption,
        channel_volume: groupCount(rows, (row) => row.channel || "webchat", "channel"),
        risk_overview: groupCount(rows, (row) => String(row.risk_level || "LOW").toUpperCase(), "risk_level"),
        assistant_performance: assistantPerformance,
        peak_hours: peakHours,
        unresolved_topics: unresolvedTopics,
        top_documents_used: topDocumentsUsed
      };
    };

    const loadPeriod = async (config) => {
      const [consultations, responses, audits, messages] = await Promise.all([
        applyRange(
          supabase.from("institutional_consultations").select("id, status, primary_topic, requester_id, channel, opened_at").eq("school_id", schoolId).order("opened_at", { ascending: false }).limit(2000),
          "opened_at",
          config
        ),
        applyRange(
          supabase.from("assistant_responses").select("id, consultation_id, assistant_key, confidence_score, source_version_id, response_mode, fallback_to_human, supporting_source_title, delivered_at, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(2000),
          "created_at",
          config
        ),
        applyRange(
          supabase.from("formal_audit_events").select("consultation_id, event_type, details, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(2000),
          "created_at",
          config
        ),
        applyRange(
          supabase.from("consultation_messages").select("consultation_id, actor_type, created_at").eq("school_id", schoolId).order("created_at", { ascending: true }).limit(4000),
          "created_at",
          config
        )
      ]);

      if (consultations.error) throw consultations.error;
      if (responses.error) throw responses.error;
      if (audits.error) throw audits.error;
      if (messages.error) throw messages.error;

      const consultationsRows = consultations.data || [];
      const responsesRows = responses.data || [];
      const auditRows = audits.data || [];
      const messageRows = (messages.data || []).filter((row) => row.actor_type === "CITIZEN");
      const responseIds = [...new Set(responsesRows.map((row) => row.id).filter(Boolean))];

      const [feedbackRows, incidentRows, evidenceRows] = await Promise.all([
        responseIds.length ? fetchOptionalRows(applyRange(supabase.from("interaction_feedback").select("response_id, feedback_type, created_at"), "created_at", config)) : [],
        responseIds.length ? fetchOptionalRows(applyRange(supabase.from("incident_reports").select("response_id, status, severity, incident_type, opened_at, resolved_at"), "opened_at", config)) : [],
        responseIds.length ? fetchOptionalRows(applyRange(supabase.from("interaction_source_evidence").select("response_id, source_title, source_version_id, used_as_primary, relevance_score, created_at"), "created_at", config)) : []
      ]);

      const messagesByConsultation = messageRows.reduce((acc, row) => {
        acc[row.consultation_id] = acc[row.consultation_id] || [];
        acc[row.consultation_id].push(row);
        return acc;
      }, {});
      const responsesByConsultation = responsesRows.reduce((acc, row) => {
        acc[row.consultation_id] = acc[row.consultation_id] || [];
        acc[row.consultation_id].push(row);
        return acc;
      }, {});
      const auditsByConsultation = auditRows.reduce((acc, row) => {
        if (!row.consultation_id) return acc;
        acc[row.consultation_id] = acc[row.consultation_id] || [];
        acc[row.consultation_id].push(row);
        return acc;
      }, {});
      const feedbackByResponseId = feedbackRows.reduce((acc, row) => {
        acc[row.response_id] = acc[row.response_id] || [];
        acc[row.response_id].push(row);
        return acc;
      }, {});
      const incidentsByResponseId = incidentRows.reduce((acc, row) => {
        acc[row.response_id] = acc[row.response_id] || [];
        acc[row.response_id].push(row);
        return acc;
      }, {});
      const evidenceByResponseId = evidenceRows.reduce((acc, row) => {
        acc[row.response_id] = acc[row.response_id] || [];
        acc[row.response_id].push(row);
        return acc;
      }, {});

      const detailRows = consultationsRows.map((consultation) => {
        const consultationMessages = (messagesByConsultation[consultation.id] || []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const consultationResponses = (responsesByConsultation[consultation.id] || []).slice().sort((a, b) => new Date(a.delivered_at || a.created_at).getTime() - new Date(b.delivered_at || b.created_at).getTime());
        const consultationAudits = (auditsByConsultation[consultation.id] || []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const firstQuestion = consultationMessages[0] || null;
        const firstResponse = consultationResponses[0] || null;
        const latestAudit = consultationAudits[0] || null;
        const responseTimeSeconds = firstQuestion && firstResponse
          ? Math.max(0, Math.round((new Date(firstResponse.delivered_at || firstResponse.created_at).getTime() - new Date(firstQuestion.created_at).getTime()) / 1000))
          : null;
        const details = latestAudit?.details || {};
        const reviewStatus = String(details.review_status || (details.review_required ? "PENDING_REVIEW" : "NOT_REQUIRED")).toUpperCase();
        const riskLevel = String(details.hallucination_risk_level || "LOW").toUpperCase();
        const topic = consultation.primary_topic || "Sem classificacao";
        const assistantKey = firstResponse?.assistant_key || "unassigned";
        const assistantName = getAssistantLabel(assistantKey);
        const feedbackEntries = firstResponse?.id ? (feedbackByResponseId[firstResponse.id] || []) : [];
        const incidentEntries = firstResponse?.id ? (incidentsByResponseId[firstResponse.id] || []) : [];
        const evidenceEntries = firstResponse?.id ? (evidenceByResponseId[firstResponse.id] || []) : [];
        const primaryEvidence = evidenceEntries.find((entry) => entry.used_as_primary) || evidenceEntries[0] || null;

        return {
          consultation_id: consultation.id,
          response_id: firstResponse?.id || null,
          asked_at: firstQuestion?.created_at || consultation.opened_at || null,
          answered_at: firstResponse?.delivered_at || firstResponse?.created_at || null,
          status: consultation.status || "OPEN",
          topic,
          channel: consultation.channel || "webchat",
          requester_id: consultation.requester_id || null,
          question_count: consultationMessages.length,
          assistant_key: assistantKey,
          assistant_name: assistantName,
          response_mode: firstResponse?.response_mode || "NO_RESPONSE",
          confidence_score: firstResponse?.confidence_score ?? null,
          has_valid_source: Boolean(firstResponse?.source_version_id),
          fallback_to_human: Boolean(firstResponse?.fallback_to_human),
          response_time_seconds: responseTimeSeconds,
          risk_level: riskLevel,
          review_status: reviewStatus,
          abstained: Boolean(details.abstained),
          feedback_total: feedbackEntries.length,
          feedback_helpful: feedbackEntries.filter((entry) => entry.feedback_type === "helpful").length,
          feedback_not_helpful: feedbackEntries.filter((entry) => entry.feedback_type === "not_helpful").length,
          feedback_incorrect: feedbackEntries.filter((entry) => entry.feedback_type === "incorrect").length,
          incident_total: incidentEntries.length,
          incident_open: incidentEntries.filter((entry) => entry.status === "OPEN" || entry.status === "IN_REVIEW").length,
          primary_source_title: primaryEvidence?.source_title || firstResponse?.supporting_source_title || null,
          search_text: [topic, consultation.channel || "webchat", consultation.status || "OPEN", assistantName, assistantKey, riskLevel, reviewStatus, primaryEvidence?.source_title || firstResponse?.supporting_source_title || ""]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
        };
      });

      const aggregates = buildAggregates(detailRows, feedbackRows, incidentRows, evidenceRows);
      return {
        ...aggregates,
        detail_rows: detailRows.sort((a, b) => new Date(b.asked_at || 0).getTime() - new Date(a.asked_at || 0).getTime())
      };
    };

    const current = await loadPeriod(periodConfig);
    const previous = periodConfig.period === "all" ? null : await loadPeriod(previousPeriodConfig);
    const previousSummary = previous?.summary || {};
    const currentSummary = current.summary || {};
    const responseRiskModule = buildResponseRiskModule(current.detail_rows || []);
    const recurringDemand = buildRecurringDemand(current.detail_rows || [], previous?.detail_rows || []);
    const comparisonKeys = [
      "total_consultations",
      "automatic_resolution_rate",
      "fallback_rate",
      "avg_response_time_seconds",
      "feedback_positive_rate",
      "contested_response_rate",
      "incident_rate",
      "source_coverage_rate"
    ];
    const comparison = comparisonKeys.reduce((acc, key) => {
      const currentValue = Number(currentSummary[key] || 0);
      const previousValue = Number(previousSummary[key] || 0);
      acc[key] = {
        current: currentValue,
        previous: previousValue,
        delta: Number((currentValue - previousValue).toFixed(2))
      };
      return acc;
    }, {});

    return res.status(200).json({
      ok: true,
      period: periodConfig.period,
      period_label: periodConfig.label,
      ...current,
      response_risk_module: responseRiskModule,
      recurring_demand: recurringDemand,
      previous_summary: previousSummary,
      comparison
    });
  } catch (error) {
    console.error("Erro /api/reports/operational-summary:", error);
    return res.status(500).json({ ok: false, error: "Falha ao montar relatorio operacional." });
  }
});

app.post("/api/audit/events/:id/review", async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase indisponivel." });

  try {
    const eventId = String(req.params.id || '').trim();
    const reviewStatus = String(req.body?.review_status || '').trim().toUpperCase();
    const reviewedBy = String(req.body?.reviewed_by || 'Operador institucional').trim();
    const reviewNotes = String(req.body?.review_notes || '').trim();
    const allowedStatuses = new Set(['PENDING_REVIEW', 'REVIEWED', 'KNOWLEDGE_CREATED', 'DISMISSED']);

    if (!eventId) {
      return res.status(400).json({ ok: false, error: 'Evento de auditoria invalido.' });
    }
    if (!allowedStatuses.has(reviewStatus)) {
      return res.status(400).json({ ok: false, error: 'Status de revisao invalido.' });
    }

    const schoolId = getSchoolId(req);
    let query = supabase
      .from('formal_audit_events')
      .select('id, school_id, consultation_id, event_type, actor_name, summary, details')
      .eq('id', eventId)
      .limit(1)
      .maybeSingle();

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data: eventRow, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!eventRow) {
      return res.status(404).json({ ok: false, error: 'Evento de auditoria nao encontrado.' });
    }

    const nextDetails = {
      ...(eventRow.details || {}),
      review_status: reviewStatus,
      reviewed_by: reviewedBy || 'Operador institucional',
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null
    };

    const { data: updatedEvent, error: updateError } = await supabase
      .from('formal_audit_events')
      .update({ details: nextDetails })
      .eq('id', eventId)
      .select('id, details')
      .single();

    if (updateError) throw updateError;

    const reviewSummaryMap = {
      PENDING_REVIEW: 'Evento recolocado como pendente de revisao humana.',
      REVIEWED: 'Evento revisado por operador institucional.',
      KNOWLEDGE_CREATED: 'Evento tratado e encaminhado para curadoria da base institucional.',
      DISMISSED: 'Evento analisado e descartado para curadoria adicional.'
    };

    await supabase.from('formal_audit_events').insert({
      school_id: eventRow.school_id,
      consultation_id: eventRow.consultation_id,
      event_type: 'AUDIT_REVIEW_STATUS_UPDATED',
      severity: 'INFO',
      actor_type: 'HUMAN',
      actor_name: reviewedBy || 'Operador institucional',
      summary: reviewSummaryMap[reviewStatus] || 'Status de revisao atualizado.',
      details: {
        source_event_id: eventRow.id,
        source_event_type: eventRow.event_type,
        review_status: reviewStatus,
        reviewed_by: reviewedBy || 'Operador institucional',
        reviewed_at: nextDetails.reviewed_at,
        review_notes: reviewNotes || null
      }
    });

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Erro /api/audit/events/:id/review:', error);
    return res.status(500).json({ ok: false, error: 'Falha ao atualizar tratamento do evento.' });
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
        return { code: "case_1", label: "Caso 1 - Resposta automatica com evidencia" };
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
      if (eventType === "AUTOMATIC_RESPONSE_REQUIRES_REVIEW") {
        return { code: "case_5", label: "Caso 5 - Resposta com ressalva e revisao" };
      }
      if (eventType === "HALLUCINATION_MITIGATED_ABSTENTION") {
        return { code: "case_6", label: "Caso 6 - Resposta contida por mitigacao" };
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
        evidence_score: details.evidence_score ?? consultedSources[0]?.evidence_score ?? null,
        hallucination_risk_level: details.hallucination_risk_level || '-',
        review_required: Boolean(details.review_required),
        review_reason: details.review_reason || '-',
        review_status: details.review_status || (details.review_required ? 'PENDING_REVIEW' : 'NOT_REQUIRED'),
        reviewed_by: details.reviewed_by || '-',
        reviewed_at: details.reviewed_at || null,
        review_notes: details.review_notes || '-',
        abstained: Boolean(details.abstained),
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


















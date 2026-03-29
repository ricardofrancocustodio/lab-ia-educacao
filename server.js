const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const webhookRoutes = require("./.qodo/web/webhook.js");
const webchatRoutes = require("./.qodo/api/webchat.js");
const faqController = require("./.qodo/api/faqController.js");
const { loadRuntimeSettings, invalidateAIProviderCache } = require("./.qodo/services/ai");

const app = express();
const PORT = Number(process.env.PORT || 8084);

function getMissingSupabaseServerEnv() {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_KEY");
  return missing;
}

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

const PRIVILEGED_ROLES = new Set(["superadmin", "network_manager"]);
const CHAT_MANAGER_ALLOWED_ROLES = new Set(["superadmin", "network_manager", "public_operator", "secretariat", "coordination", "treasury", "direction"]);
const OFFICIAL_CONTENT_ALLOWED_ROLES = new Set(["superadmin", "network_manager", "content_curator", "secretariat", "direction", "coordination"]);
const NOTICES_READ_ROLES = new Set(["superadmin", "network_manager", "content_curator", "public_operator", "secretariat", "coordination", "treasury", "direction", "observer"]);
const NOTICES_WRITE_ROLES = new Set(["superadmin", "network_manager", "secretariat", "coordination", "direction"]);
const NOTICES_REVIEW_ROLES = new Set(["superadmin", "network_manager", "content_curator"]);
const INCIDENTS_READ_ROLES = new Set(["superadmin", "network_manager", "auditor", "direction", "content_curator", "coordination", "public_operator"]);
const INCIDENTS_MANAGE_ROLES = new Set(["superadmin", "network_manager", "auditor"]);
const FEEDBACK_READ_ROLES = new Set(["superadmin", "network_manager", "content_curator", "auditor", "direction", "public_operator"]);
const FEEDBACK_ACT_ROLES = new Set(["superadmin", "network_manager", "content_curator"]);
const CORRECTION_TRANSITIONS = {
  review:  { from: ["SUBMITTED"], to: "IN_REVIEW", event: "CORRECTION_IN_REVIEW", severity: "MEDIUM", summary: "Correcao em revisao." },
  approve: { from: ["IN_REVIEW"], to: "APPROVED", event: "CORRECTION_APPROVED", severity: "HIGH", summary: "Correcao aprovada." },
  reject:  { from: ["IN_REVIEW"], to: "REJECTED", event: "CORRECTION_REJECTED", severity: "MEDIUM", summary: "Correcao rejeitada." },
  apply:   { from: ["APPROVED"], to: "APPLIED", event: "CORRECTION_APPLIED", severity: "HIGH", summary: "Correcao aplicada no sistema." }
};
const INCIDENT_VALID_TRANSITIONS = {
  OPEN: ["IN_REVIEW", "RESOLVED", "DISMISSED"],
  IN_REVIEW: ["OPEN", "RESOLVED", "DISMISSED"],
  RESOLVED: ["OPEN", "CONFIRMED"],
  DISMISSED: ["OPEN"],
  CONFIRMED: []
};
const NOTIFICATIONS_ADMIN_ROLES = new Set(["superadmin", "network_manager", "direction", "secretariat", "coordination"]);
const NOTIFICATIONS_SEND_ROLES = new Set(["superadmin", "network_manager", "direction", "secretariat"]);
const KNOWLEDGE_GAPS_ROLES = new Set(["superadmin", "network_manager", "content_curator", "direction", "secretariat"]);
const HANDOFF_QUEUE_ROLES = new Set(["superadmin", "network_manager", "public_operator", "secretariat", "coordination", "direction"]);
const NETWORK_OVERVIEW_ROLES = new Set(["superadmin", "network_manager", "auditor", "direction"]);
const OFFICIAL_CONTENT_NETWORK_EDIT_ROLES = new Set(["superadmin", "network_manager", "content_curator"]);
const OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES = new Set(["superadmin", "network_manager", "content_curator", "secretariat", "direction", "coordination"]);
const AUDIT_TREATMENT_DESTINATIONS = {
  content_curation: {
    label: "Curadoria de conteudo",
    page_key: "official-content",
    page_path: "/conteudo-oficial",
    action_label: "Abrir Conteudo Oficial",
    roles: new Set(["superadmin", "auditor", "content_curator"])
  },
  network_secretariat: {
    label: "Secretaria / Rede",
    page_key: "official-content",
    page_path: "/conteudo-oficial",
    action_label: "Abrir Conteudo Oficial",
    roles: new Set(["superadmin", "auditor", "network_manager", "secretariat"])
  },
  service_operation: {
    label: "Operacao de atendimento",
    page_key: "chat-manager",
    page_path: "/atendimento",
    action_label: "Abrir Atendimento",
    roles: new Set(["superadmin", "auditor", "public_operator", "coordination"])
  },
  direction_compliance: {
    label: "Direcao / Compliance",
    page_key: "audit",
    page_path: "/audit",
    action_label: "Abrir Auditoria",
    roles: new Set(["superadmin", "auditor", "direction"])
  }
};
const AUDIT_TREATMENT_PROGRESS = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluido",
  DISMISSED: "Descartado"
};

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

function serveChatManagerPage(res) {
  const filePath = path.join(__dirname, "public", "dist", "chat-manager.html");
  const html = fs.readFileSync(filePath, "utf8")
    .replace('./js//chat/chat-manager.js', '/chat-manager.bundle.js');
  return res.type("html").send(html);
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
  "official-content",
  "notice-board",
  "incidents",
  "feedback",
  "corrections",
  "notifications",
  "knowledge-gaps",
  "handoff-queue",
  "improvement-cycle",
  "network-overview"
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
app.get("/atendimento", (_req, res) => serveChatManagerPage(res));
app.get("/simulador-chat.html", (_req, res) => res.redirect(301, "/simulador-chat"));
app.get("/simulador-chat", (_req, res) => res.sendFile(path.join(__dirname, "public", "simulador-chat.html")));
app.get("/conhecimento", (_req, res) => serveDistPage(res, "knowledge-base.html"));
app.get("/relatorios", (_req, res) => serveDistPage(res, "reports.html"));
app.get("/usuarios", (_req, res) => serveDistPage(res, "users.html"));
app.get("/preferencias", (_req, res) => serveDistPage(res, "dashboard-preferencias.html"));
app.get("/conteudo-oficial", (_req, res) => serveDistPage(res, "official-content.html"));
app.get("/comunicados", (_req, res) => serveDistPage(res, "notice-board.html"));
app.get("/incidentes", (_req, res) => serveDistPage(res, "incidents.html"));
app.get("/feedback", (_req, res) => serveDistPage(res, "feedback.html"));
app.get("/correcoes", (_req, res) => serveDistPage(res, "corrections.html"));
app.get("/fila-humana", (_req, res) => serveDistPage(res, "handoff-queue.html"));
app.get("/ciclo-melhoria", (_req, res) => serveDistPage(res, "improvement-cycle.html"));
app.get("/visao-rede", (_req, res) => serveDistPage(res, "network-overview.html"));
app.get("/notificacoes", (_req, res) => serveDistPage(res, "notifications.html"));
app.get("/lacunas", (_req, res) => serveDistPage(res, "knowledge-gaps.html"));
app.get("/calendario-escolar", (_req, res) => serveDistPage(res, "calendario-escolar.html"));
app.get("/esqueci-senha", (_req, res) => serveDistPage(res, "forgot-password.html"));
app.get("/redefinir-senha", (_req, res) => serveDistPage(res, "reset-password.html"));
app.get("/ativar-conta", (_req, res) => serveDistPage(res, "accept-invite.html"));
app.get("/verificar-sessao", (_req, res) => serveDistPage(res, "verify-session.html"));
app.get("/chat-manager.bundle.js", (_req, res) => {
  try {
    const baseScript = fs.readFileSync(path.join(__dirname, "public", "dist", "js", "chat", "chat-manager.js"), "utf8");
    const enhancedScript = fs.readFileSync(path.join(__dirname, "scripts", "chat-manager-network-scope.js"), "utf8");
    const treatmentInboxScript = fs.readFileSync(path.join(__dirname, "public", "dist", "js", "audit", "treatment-inbox.js"), "utf8");
    return res.type("application/javascript").send(`${baseScript}\n\n${enhancedScript}\n\n${treatmentInboxScript}`);
  } catch (error) {
    console.error("Erro ao montar o bundle do chat manager:", error);
    return res.status(500).type("application/javascript").send('console.error(\"Falha ao carregar o chat manager.\");');
  }
});
app.use("/webhook", webhookRoutes);
app.use("/api/webchat", webchatRoutes);

function getSchoolId(req) {
  return String(req.headers?.["x-school-id"] || req.query.school_id || req.body?.school_id || "").trim();
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
    const missingEnv = getMissingSupabaseServerEnv();
    throw Object.assign(
      new Error(`Supabase nao configurado no servidor. Variaveis ausentes: ${missingEnv.join(", ") || "desconhecido"}.`),
      { statusCode: 500 }
    );
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

  const PLATFORM_GLOBAL_ROLES = ["superadmin", "auditor"];
  if (!schoolId && options.allowSuperadminFallback !== false && PLATFORM_GLOBAL_ROLES.includes(platformRole)) {
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
    schoolRole = platformRole;
  }

  if (!schoolId) {
    throw Object.assign(new Error("Usuario sem vinculo escolar ativo."), { statusCode: 403 });
  }

  const requestedSchoolId = getSchoolId(req);
  let schoolOverridden = false;
  if (requestedSchoolId && requestedSchoolId !== schoolId) {
    if (PLATFORM_GLOBAL_ROLES.includes(platformRole)) {
      const requestedSchool = await fetchSchoolContextById(requestedSchoolId);
      if (!requestedSchool?.id) {
        throw Object.assign(new Error("A instituicao solicitada nao foi encontrada."), { statusCode: 404 });
      }
      schoolId = requestedSchool.id;
      schoolRole = platformRole;
      schoolOverridden = true;
    } else {
      throw Object.assign(new Error("A escola informada na requisicao nao corresponde ao contexto autenticado."), { statusCode: 403 });
    }
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
    schoolOverridden,
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

function normalizeInstitutionType(value) {
  return String(value || "education_department").trim().toLowerCase() || "education_department";
}

async function fetchSchoolContextById(schoolId) {
  if (!supabase || !schoolId) return null;
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, slug, institution_type, parent_school_id")
    .eq("id", schoolId)
    .maybeSingle();
  if (error) {
    throw Object.assign(new Error("Falha ao carregar o contexto institucional."), { statusCode: 500, cause: error });
  }
  if (!data?.id) return null;
  return {
    ...data,
    institution_type: normalizeInstitutionType(data.institution_type)
  };
}

function serializeInstitutionContext(school, parent = null) {
  if (!school?.id) return null;
  return {
    id: school.id,
    name: school.name || "",
    slug: school.slug || "",
    institution_type: normalizeInstitutionType(school.institution_type),
    parent_school_id: school.parent_school_id || null,
    parent_name: parent?.name || ""
  };
}

function clampQueryLimit(value, fallback = 20, max = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

async function resolveOfficialContentScopeContext(baseSchoolId) {
  const requestedSchool = await fetchSchoolContextById(baseSchoolId);
  if (!requestedSchool?.id) {
    throw Object.assign(new Error("Instituicao de contexto nao encontrada para Conteudo Oficial."), { statusCode: 404 });
  }

  let parentSchool = null;
  if (requestedSchool.parent_school_id) {
    parentSchool = await fetchSchoolContextById(requestedSchool.parent_school_id);
  }

  const isSchoolUnit = normalizeInstitutionType(requestedSchool.institution_type) === "school_unit";
  const networkScopeSchool = isSchoolUnit && parentSchool?.id ? parentSchool : requestedSchool;
  const schoolScopeSchool = requestedSchool;

  return {
    requestedSchool,
    parentSchool,
    networkScopeSchool,
    schoolScopeSchool,
    isSchoolUnit
  };
}

async function resolveManagedSchoolScope(accessContext) {
  const baseSchool = await fetchSchoolContextById(accessContext?.schoolId);
  if (!baseSchool?.id) {
    throw Object.assign(new Error("Contexto institucional da gestao de usuarios nao encontrado."), { statusCode: 404 });
  }

  if (accessContext?.effectiveRole === "superadmin" ||
      (accessContext?.effectiveRole === "auditor" && !accessContext?.schoolOverridden)) {
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, slug, institution_type, parent_school_id")
      .order("name", { ascending: true });
    if (error) {
      throw Object.assign(new Error("Falha ao carregar as instituicoes da plataforma."), { statusCode: 500, cause: error });
    }

    return {
      baseSchool,
      scopeMode: "global",
      managedSchools: data || [],
      managedSchoolIds: [...new Set((data || []).map((item) => item.id).filter(Boolean))]
    };
  }

  const normalizedType = normalizeInstitutionType(baseSchool.institution_type);
  if (normalizedType === "school_unit") {
    return {
      baseSchool,
      scopeMode: "single_school",
      managedSchools: [baseSchool],
      managedSchoolIds: [baseSchool.id]
    };
  }

  const { data: childSchools, error: childError } = await supabase
    .from("schools")
    .select("id, name, slug, institution_type, parent_school_id")
    .eq("parent_school_id", baseSchool.id)
    .order("name", { ascending: true });
  if (childError) {
    throw Object.assign(new Error("Falha ao carregar as escolas da rede."), { statusCode: 500, cause: childError });
  }

  const managedSchools = [baseSchool, ...(childSchools || [])];
  return {
    baseSchool,
    scopeMode: "network",
    managedSchools,
    managedSchoolIds: [...new Set(managedSchools.map((item) => item.id).filter(Boolean))]
  };
}

function normalizeAuditTreatmentDestination(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return AUDIT_TREATMENT_DESTINATIONS[normalized] ? normalized : "";
}

function normalizeAuditTreatmentProgress(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return AUDIT_TREATMENT_PROGRESS[normalized] ? normalized : "";
}

function getAuditTreatmentDestinationMeta(destination) {
  return AUDIT_TREATMENT_DESTINATIONS[normalizeAuditTreatmentDestination(destination)] || null;
}

function canRoleHandleAuditTreatmentDestination(role, destination) {
  const normalizedRole = normalizeRoleKey(role);
  if (normalizedRole === "superadmin" || normalizedRole === "auditor") return true;
  const meta = getAuditTreatmentDestinationMeta(destination);
  return Boolean(meta?.roles?.has(normalizedRole));
}

function listAuditTreatmentDestinationsForRole(role, options = {}) {
  const normalizedRole = normalizeRoleKey(role);
  const includeAllForAudit = Boolean(options.includeAllForAudit) && (normalizedRole === "superadmin" || normalizedRole === "auditor");
  return Object.entries(AUDIT_TREATMENT_DESTINATIONS)
    .filter(([key, meta]) => includeAllForAudit || meta.roles.has(normalizedRole) || normalizedRole === "superadmin")
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      page_key: meta.page_key,
      page_path: meta.page_path,
      action_label: meta.action_label
    }));
}

function getDefaultTreatmentProgressForReviewStatus(reviewStatus, existingProgress = "") {
  const normalizedReviewStatus = String(reviewStatus || "").trim().toUpperCase();
  if (normalizedReviewStatus === "DISMISSED") return "DISMISSED";
  const normalizedExisting = normalizeAuditTreatmentProgress(existingProgress);
  if (normalizedExisting && normalizedExisting !== "DISMISSED") return normalizedExisting;
  if (normalizedReviewStatus === "KNOWLEDGE_CREATED") return "COMPLETED";
  return "OPEN";
}

async function buildAuditTreatmentQueue({ accessContext, includeCompleted = false, includeAllDestinations = false, destinationFilter = "" }) {
  const scope = await resolveManagedSchoolScope(accessContext);
  const schoolIds = scope.managedSchoolIds || [];
  if (!schoolIds.length) {
    return { scopeMode: scope.scopeMode, items: [], destinations: [] };
  }

  const allowedDestinations = listAuditTreatmentDestinationsForRole(accessContext.effectiveRole, { includeAllForAudit: includeAllDestinations });
  const allowedDestinationKeys = new Set(allowedDestinations.map((item) => item.key));
  const explicitDestination = normalizeAuditTreatmentDestination(destinationFilter);
  const effectiveDestinationKeys = explicitDestination
    ? new Set(allowedDestinationKeys.has(explicitDestination) ? [explicitDestination] : [])
    : allowedDestinationKeys;

  if (!effectiveDestinationKeys.size) {
    return { scopeMode: scope.scopeMode, items: [], destinations: allowedDestinations };
  }

  const { data: eventRows, error: eventError } = await supabase
    .from("formal_audit_events")
    .select("id, school_id, consultation_id, event_type, severity, actor_type, actor_name, summary, details, created_at")
    .in("school_id", schoolIds)
    .order("created_at", { ascending: false })
    .limit(500);
  if (eventError) {
    throw Object.assign(new Error("Falha ao carregar a fila de tratamentos da auditoria."), { statusCode: 500, cause: eventError });
  }

  const candidateRows = (eventRows || [])
    .filter((row) => !["AUDIT_REVIEW_STATUS_UPDATED", "AUDIT_TREATMENT_PROGRESS_UPDATED"].includes(String(row.event_type || "").toUpperCase()))
    .filter((row) => {
      const destination = normalizeAuditTreatmentDestination(row.details?.treatment_destination);
      if (!destination || !effectiveDestinationKeys.has(destination)) return false;
      const progress = normalizeAuditTreatmentProgress(row.details?.treatment_progress_status || getDefaultTreatmentProgressForReviewStatus(row.details?.review_status, row.details?.treatment_progress_status));
      return includeCompleted || !["COMPLETED", "DISMISSED"].includes(progress);
    });

  if (!candidateRows.length) {
    return { scopeMode: scope.scopeMode, items: [], destinations: allowedDestinations };
  }

  const consultationIds = [...new Set(candidateRows.map((row) => row.consultation_id).filter(Boolean))];
  const schoolNameById = new Map((scope.managedSchools || []).map((item) => [item.id, item.name || ""]));
  const consultationsById = new Map();
  const responsesByConsultationId = new Map();

  if (consultationIds.length) {
    const [{ data: consultationRows, error: consultationsError }, { data: responseRows, error: responsesError }] = await Promise.all([
      supabase
        .from("institutional_consultations")
        .select("id, school_id, requester_id, requester_name, channel, primary_topic, assigned_assistant_key, opened_at")
        .in("school_id", schoolIds)
        .in("id", consultationIds),
      supabase
        .from("assistant_responses")
        .select("consultation_id, assistant_key, supporting_source_title, delivered_at, created_at")
        .in("school_id", schoolIds)
        .in("consultation_id", consultationIds)
        .order("delivered_at", { ascending: false })
    ]);
    if (consultationsError) {
      throw Object.assign(new Error("Falha ao carregar os contextos das conversas da fila de tratamento."), { statusCode: 500, cause: consultationsError });
    }
    if (responsesError) {
      throw Object.assign(new Error("Falha ao carregar as respostas vinculadas a fila de tratamento."), { statusCode: 500, cause: responsesError });
    }

    (consultationRows || []).forEach((item) => consultationsById.set(item.id, item));
    (responseRows || []).forEach((item) => {
      if (!responsesByConsultationId.has(item.consultation_id)) {
        responsesByConsultationId.set(item.consultation_id, item);
      }
    });
  }

  const items = candidateRows.map((row) => {
    const details = row.details || {};
    const consultation = row.consultation_id ? consultationsById.get(row.consultation_id) || null : null;
    const response = row.consultation_id ? responsesByConsultationId.get(row.consultation_id) || null : null;
    const destination = normalizeAuditTreatmentDestination(details.treatment_destination);
    const destinationMeta = getAuditTreatmentDestinationMeta(destination);
    const reviewStatus = String(details.review_status || (details.review_required ? "PENDING_REVIEW" : "NOT_REQUIRED")).toUpperCase();
    const progressStatus = normalizeAuditTreatmentProgress(details.treatment_progress_status || getDefaultTreatmentProgressForReviewStatus(reviewStatus, details.treatment_progress_status)) || "OPEN";
    return {
      id: row.id,
      school_id: row.school_id,
      school_name: schoolNameById.get(row.school_id) || "",
      consultation_id: row.consultation_id || null,
      created_at: row.created_at,
      event_type: row.event_type || "",
      severity: row.severity || "INFO",
      summary: row.summary || "",
      topic: details.topic || consultation?.primary_topic || "Sem classificacao",
      requester_name: details.requester_name || consultation?.requester_name || "-",
      requester_id: details.requester_id || consultation?.requester_id || "-",
      channel: details.channel || consultation?.channel || "-",
      assistant_name: details.assistant_name || getAssistantLabel(details.assigned_assistant_key || response?.assistant_key || consultation?.assigned_assistant_key || "public.assistant"),
      supporting_source_title: details.supporting_source_title || response?.supporting_source_title || "-",
      review_status: reviewStatus,
      review_notes: details.review_notes || "",
      reviewed_by: details.reviewed_by || "",
      reviewed_at: details.reviewed_at || null,
      treatment_destination: destination,
      treatment_destination_label: destinationMeta?.label || "Sem destino",
      treatment_progress_status: progressStatus,
      treatment_progress_label: AUDIT_TREATMENT_PROGRESS[progressStatus] || progressStatus,
      treatment_page_key: destinationMeta?.page_key || "",
      treatment_page_path: destinationMeta?.page_path || "/audit",
      treatment_action_label: destinationMeta?.action_label || "Abrir contexto",
      treatment_last_updated_at: details.treatment_last_updated_at || details.reviewed_at || row.created_at,
      treatment_last_updated_by: details.treatment_last_updated_by || details.reviewed_by || "",
      treatment_completion_notes: details.treatment_completion_notes || ""
    };
  }).sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  return {
    scopeMode: scope.scopeMode,
    items,
    destinations: allowedDestinations
  };
}

function buildOfficialContentScopedDefaults({ schoolScopeSchoolId, networkScopeSchoolId }) {
  return [
    { school_id: networkScopeSchoolId, module_key: "calendar", scope_key: "network", title: "Calendario da Rede/Secretaria", summary: "Calendario-base oficial publicado pela secretaria ou rede.", content_payload: { template_version: "calendar_csv_v1", locale: "pt-BR", columns: ["start_date", "end_date", "title", "event_type", "audience", "location", "shift", "required_action", "notes", "source_reference"], display_columns: ["data_inicio", "data_fim", "titulo", "tipo_evento", "publico", "local", "turno", "acao_necessaria", "observacoes", "fonte_referencia"], entries: [], guidance: "Use uma linha por evento em CSV com datas em YYYY-MM-DD. O usuario pode preencher com cabecalhos em portugues: data_inicio, data_fim, titulo, tipo_evento, publico, local, turno, acao_necessaria, observacoes e fonte_referencia." }, status: "draft" },
    { school_id: schoolScopeSchoolId, module_key: "calendar", scope_key: "school", title: "Complementos da Escola", summary: "Eventos e avisos especificos da unidade escolar.", content_payload: { template_version: "calendar_csv_v1", locale: "pt-BR", columns: ["start_date", "end_date", "title", "event_type", "audience", "location", "shift", "required_action", "notes", "source_reference"], display_columns: ["data_inicio", "data_fim", "titulo", "tipo_evento", "publico", "local", "turno", "acao_necessaria", "observacoes", "fonte_referencia"], entries: [], guidance: "Use uma linha por evento local da unidade. O usuario pode preencher com cabecalhos em portugues e o sistema converte para o formato interno automaticamente." }, status: "draft" },
    { school_id: schoolScopeSchoolId, module_key: "enrollment", scope_key: "school", title: "Matricula e Documentos Exigidos", summary: "Regras oficiais e documentos do processo de matricula/rematricula.", content_payload: { enrollment_period: "", reenrollment_period: "", target_audience: "", required_documents: [], optional_documents: [], special_rules: "", official_link: "" }, status: "draft" },
    { school_id: schoolScopeSchoolId, module_key: "faq", scope_key: "school", title: "FAQ Oficial", summary: "Perguntas e respostas curtas, validadas e rastreaveis.", content_payload: { items: [] }, status: "draft" },
    { school_id: schoolScopeSchoolId, module_key: "notices", scope_key: "school", title: "Comunicados Oficiais", summary: "Avisos de vigencia temporaria ou comunicados administrativos.", content_payload: { items: [] }, status: "draft" }
  ];
}

async function findOfficialContentRecord({ moduleKey, scopeKey, scopeContext }) {
  const primarySchoolId = scopeKey === "network"
    ? scopeContext.networkScopeSchool?.id
    : scopeContext.schoolScopeSchool?.id;
  const fallbackSchoolId = scopeKey === "network"
    && scopeContext.isSchoolUnit
    && scopeContext.schoolScopeSchool?.id
    && scopeContext.schoolScopeSchool.id !== primarySchoolId
      ? scopeContext.schoolScopeSchool.id
      : null;
  const schoolIds = [...new Set([primarySchoolId, fallbackSchoolId].filter(Boolean))];

  if (!schoolIds.length) {
    return { record: null, recordSchoolId: primarySchoolId || "", legacyFallback: false };
  }

  const { data, error } = await supabase
    .from("official_content_records")
    .select("*")
    .in("school_id", schoolIds)
    .eq("module_key", moduleKey)
    .eq("scope_key", scopeKey);
  if (error) {
    throw Object.assign(new Error("Falha ao localizar o registro de Conteudo Oficial."), { statusCode: 500, cause: error });
  }

  const rows = data || [];
  const primaryRecord = rows.find((item) => item.school_id === primarySchoolId) || null;
  const fallbackRecord = fallbackSchoolId ? (rows.find((item) => item.school_id === fallbackSchoolId) || null) : null;
  let siblingLegacyRecord = null;
  if (!primaryRecord && scopeKey === "network" && scopeContext.networkScopeSchool?.id) {
    const { data: childSchools, error: childSchoolsError } = await supabase
      .from("schools")
      .select("id")
      .eq("parent_school_id", scopeContext.networkScopeSchool.id);
    if (childSchoolsError) {
      throw Object.assign(new Error("Falha ao carregar unidades da rede para fallback legado."), { statusCode: 500, cause: childSchoolsError });
    }

    const childSchoolIds = (childSchools || []).map((item) => item.id).filter(Boolean);
    if (childSchoolIds.length) {
      const { data: siblingRows, error: siblingError } = await supabase
        .from("official_content_records")
        .select("*")
        .eq("module_key", moduleKey)
        .eq("scope_key", scopeKey)
        .neq("school_id", primarySchoolId)
        .in("school_id", childSchoolIds)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (siblingError) {
        throw Object.assign(new Error("Falha ao localizar fallback legado de rede."), { statusCode: 500, cause: siblingError });
      }
      siblingLegacyRecord = (siblingRows || [])[0] || null;
    }
  }
  const record = primaryRecord || fallbackRecord || siblingLegacyRecord || null;

  return {
    record,
    recordSchoolId: record?.school_id || primarySchoolId || "",
    legacyFallback: !primaryRecord && Boolean(fallbackRecord || siblingLegacyRecord)
  };
}

async function buildOfficialContentResponse({ scopeContext, rows }) {
  const defaults = buildOfficialContentScopedDefaults({
    schoolScopeSchoolId: scopeContext.schoolScopeSchool.id,
    networkScopeSchoolId: scopeContext.networkScopeSchool.id
  });
  const byKey = new Map((rows || []).map((row) => [`${row.school_id}::${row.module_key}::${row.scope_key}`, row]));
  const directNetworkKey = `${scopeContext.networkScopeSchool.id}::calendar::network`;
  const legacyNetworkKey = `${scopeContext.schoolScopeSchool.id}::calendar::network`;
  const directNetworkRecord = byKey.get(directNetworkKey) || null;
  const legacyCandidates = (rows || [])
    .filter((row) => row.module_key === "calendar" && row.scope_key === "network" && row.school_id !== scopeContext.networkScopeSchool.id)
    .sort((left, right) => String(right.updated_at || "").localeCompare(String(left.updated_at || "")));
  const legacyNetworkRecord = (scopeContext.schoolScopeSchool.id !== scopeContext.networkScopeSchool.id
    ? (byKey.get(legacyNetworkKey) || null)
    : null) || legacyCandidates[0] || null;
  const usingLegacyNetworkFallback = !directNetworkRecord && Boolean(legacyNetworkRecord);

  const records = defaults.map((item) => {
    const compositeKey = `${item.school_id}::${item.module_key}::${item.scope_key}`;
    if (item.module_key === "calendar" && item.scope_key === "network") {
      const resolved = directNetworkRecord || legacyNetworkRecord || null;
      if (!resolved) return item;
      return {
        ...item,
        ...resolved,
        _resolved_school_id: resolved.school_id,
        _legacy_network_fallback: usingLegacyNetworkFallback
      };
    }
    const existing = byKey.get(compositeKey);
    return existing ? { ...item, ...existing, _resolved_school_id: existing.school_id } : item;
  });

  return {
    records: await enrichOfficialContentRecords(records),
    context: {
      requested_school: serializeInstitutionContext(scopeContext.requestedSchool, scopeContext.parentSchool),
      network_scope: serializeInstitutionContext(scopeContext.networkScopeSchool),
      school_scope: serializeInstitutionContext(scopeContext.schoolScopeSchool, scopeContext.parentSchool),
      using_legacy_network_fallback: usingLegacyNetworkFallback
    }
  };
}

async function enrichOfficialContentRecords(records = []) {
  const normalizedRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  if (!normalizedRecords.length) return [];

  const sourceDocumentIds = [...new Set(normalizedRecords.map((item) => item.source_document_id).filter(Boolean))];
  const schoolIds = [...new Set(normalizedRecords.map((item) => item._resolved_school_id || item.school_id).filter(Boolean))];
  const canonicalReferences = [...new Set(normalizedRecords.map((item) => `official-content:${item.module_key}:${item.scope_key}`))];
  const sourceDocumentById = new Map();
  const sourceDocumentByCanonical = new Map();

  if (sourceDocumentIds.length) {
    const { data: sourceDocuments, error: sourceDocumentsError } = await supabase
      .from("source_documents")
      .select("*")
      .in("id", sourceDocumentIds);
    if (sourceDocumentsError) {
      throw Object.assign(new Error("Falha ao carregar documentos tecnicos do Conteudo Oficial."), { statusCode: 500, cause: sourceDocumentsError });
    }
    (sourceDocuments || []).forEach((item) => {
      sourceDocumentById.set(item.id, item);
      sourceDocumentByCanonical.set(`${item.school_id}::${item.canonical_reference}`, item);
    });
  }

  if (schoolIds.length && canonicalReferences.length) {
    const { data: canonicalDocs, error: canonicalDocsError } = await supabase
      .from("source_documents")
      .select("*")
      .in("school_id", schoolIds)
      .in("canonical_reference", canonicalReferences);
    if (canonicalDocsError) {
      throw Object.assign(new Error("Falha ao localizar documentos canonicos do Conteudo Oficial."), { statusCode: 500, cause: canonicalDocsError });
    }
    (canonicalDocs || []).forEach((item) => {
      if (!sourceDocumentById.has(item.id)) {
        sourceDocumentById.set(item.id, item);
      }
      sourceDocumentByCanonical.set(`${item.school_id}::${item.canonical_reference}`, item);
    });
  }

  const effectiveSourceDocumentIds = [...new Set(
    normalizedRecords
      .map((item) => {
        const schoolId = item._resolved_school_id || item.school_id;
        const canonicalReference = `official-content:${item.module_key}:${item.scope_key}`;
        const document = sourceDocumentById.get(item.source_document_id) || sourceDocumentByCanonical.get(`${schoolId}::${canonicalReference}`) || null;
        return document?.id || null;
      })
      .filter(Boolean)
  )];

  const versionById = new Map();
  const currentVersionBySourceDocumentId = new Map();
  if (effectiveSourceDocumentIds.length) {
    const { data: versions, error: versionsError } = await supabase
      .from("knowledge_source_versions")
      .select("id, school_id, source_document_id, version_label, version_number, file_name, mime_type, chunk_count, published_at, is_current, created_by")
      .in("source_document_id", effectiveSourceDocumentIds)
      .order("version_number", { ascending: false });
    if (versionsError) {
      throw Object.assign(new Error("Falha ao carregar versoes tecnicas do Conteudo Oficial."), { statusCode: 500, cause: versionsError });
    }
    (versions || []).forEach((item) => {
      versionById.set(item.id, item);
      if (item.is_current && !currentVersionBySourceDocumentId.has(item.source_document_id)) {
        currentVersionBySourceDocumentId.set(item.source_document_id, item);
      }
    });
  }

  return normalizedRecords.map((item) => {
    const schoolId = item._resolved_school_id || item.school_id;
    const canonicalReference = `official-content:${item.module_key}:${item.scope_key}`;
    const sourceDocument = sourceDocumentById.get(item.source_document_id) || sourceDocumentByCanonical.get(`${schoolId}::${canonicalReference}`) || null;
    const sourceVersion = versionById.get(item.source_version_id) || (sourceDocument?.id ? currentVersionBySourceDocumentId.get(sourceDocument.id) || null : null);
    return {
      ...item,
      source_document_id: item.source_document_id || sourceDocument?.id || null,
      source_version_id: item.source_version_id || sourceVersion?.id || null,
      _source_document_meta: sourceDocument || null,
      _source_version_meta: sourceVersion || null
    };
  });
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

const STALE_CONVERSATION_THRESHOLD_MS = 60 * 60 * 1000;

async function processIdleConversations() {
  if (!supabase) return;

  try {
    const { data: consultations, error } = await supabase
      .from("institutional_consultations")
      .select("id, school_id, requester_id, status, assigned_assistant_key, opened_at, resolved_at, metadata")
      .eq("channel", "webchat")
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("opened_at", { ascending: false })
      .limit(100);

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

      const latestTimestamp = new Date(latestMessage.created_at).getTime();
      const idleMs = now - latestTimestamp;

      if (idleMs >= STALE_CONVERSATION_THRESHOLD_MS) {
        await appendAutomatedResponse({
          consultation,
          text: "Esta conversa foi encerrada automaticamente por inatividade. Quando quiser, voce pode iniciar um novo atendimento.",
          eventType: "IDLE_CONVERSATION_CLOSED",
          summary: "Conversa encerrada automaticamente — inativa por mais de 1 hora.",
          mode: "AUTOMATIC",
          markResolved: true
        });
        continue;
      }

      if (latestMessage.actor_type === "CITIZEN") continue;

      const followupSentAt = consultation.metadata?.idle_followup_sent_at ? new Date(consultation.metadata.idle_followup_sent_at).getTime() : null;
      const idleClosedAt = consultation.metadata?.idle_closed_at ? new Date(consultation.metadata.idle_closed_at).getTime() : null;

      if (!followupSentAt && idleMs >= IDLE_FOLLOWUP_AFTER_MS) {
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
        .select("id, title, document_type, owning_area, canonical_reference, description, active, created_at, updated_at")
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

app.put("/api/knowledge/sources/:id/suspend", async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase indisponivel." });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...INCIDENTS_MANAGE_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const sourceId = String(req.params.id || "").trim();
    const suspend = req.body.suspend !== false;
    const reason = String(req.body.reason || "").trim();
    const actorName = String(access.context.memberName || access.context.memberEmail || "Operador").trim();

    if (!sourceId) return res.status(400).json({ ok: false, error: "ID da fonte invalido." });

    const { data: existing, error: fetchErr } = await supabase
      .from("source_documents")
      .select("id, school_id, title, active")
      .eq("id", sourceId)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ ok: false, error: "Fonte nao encontrada na sua instituicao." });

    if (existing.active === !suspend) {
      return res.status(400).json({ ok: false, error: suspend ? "Fonte ja esta suspensa." : "Fonte ja esta ativa." });
    }

    const { error: updateErr } = await supabase
      .from("source_documents")
      .update({ active: !suspend, updated_at: new Date().toISOString() })
      .eq("id", sourceId);
    if (updateErr) throw updateErr;

    await supabase.from("formal_audit_events").insert({
      school_id: existing.school_id,
      event_type: suspend ? "KNOWLEDGE_SOURCE_SUSPENDED" : "KNOWLEDGE_SOURCE_REACTIVATED",
      severity: suspend ? "HIGH" : "MEDIUM",
      actor_type: "HUMAN",
      actor_name: actorName,
      summary: suspend ? `Fonte "${existing.title}" suspensa.` : `Fonte "${existing.title}" reativada.`,
      details: { source_document_id: sourceId, title: existing.title, reason: reason || null }
    });

    return res.json({ ok: true, source_id: sourceId, active: !suspend });
  } catch (error) {
    console.error("Erro PUT /api/knowledge/sources/:id/suspend:", error);
    return res.status(500).json({ ok: false, error: "Falha ao alterar status da fonte." });
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
    { school_id: schoolId, module_key: "enrollment", scope_key: "network", title: "Matricula e Documentos da Rede", summary: "Regras oficiais e documentos da rede para matricula e rematricula.", content_payload: { enrollment_period: "", reenrollment_period: "", target_audience: "", required_documents: [], optional_documents: [], special_rules: "", official_link: "" }, status: "draft" },
    { school_id: schoolId, module_key: "enrollment", scope_key: "school", title: "Matricula e Documentos Exigidos", summary: "Regras oficiais e documentos do processo de matricula/rematricula.", content_payload: { enrollment_period: "", reenrollment_period: "", target_audience: "", required_documents: [], optional_documents: [], special_rules: "", official_link: "" }, status: "draft" },
    { school_id: schoolId, module_key: "faq", scope_key: "school", title: "FAQ Oficial", summary: "Perguntas e respostas curtas, validadas e rastreaveis.", content_payload: { items: [] }, status: "draft" },
    { school_id: schoolId, module_key: "notices", scope_key: "school", title: "Comunicados Oficiais", summary: "Avisos de vigencia temporaria ou comunicados administrativos.", content_payload: { items: [] }, status: "draft" }
  ];
}

app.get("/api/institution-context", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado." });
    const access = await requireRequestContext(req, res, {});
    if (!access.ok) return access.response;
    const school = await fetchSchoolContextById(access.context.schoolId);
    if (!school?.id) return res.json({ ok: true, school: null, network: null });
    let network = null;
    if (school.parent_school_id) {
      network = await fetchSchoolContextById(school.parent_school_id);
    }
    const isSchoolUnit = normalizeInstitutionType(school.institution_type) === "school_unit";
    return res.json({
      ok: true,
      school: { id: school.id, name: school.name || "" },
      network: isSchoolUnit && network?.id
        ? { id: network.id, name: network.name || "" }
        : !isSchoolUnit ? { id: school.id, name: school.name || "" } : null
    });
  } catch (error) {
    console.error("Erro /api/institution-context:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar contexto institucional." });
  }
});

app.get("/api/official-content", async (req, res) => {
  try {
    if (!supabase) {
      const missingEnv = getMissingSupabaseServerEnv();
      return res.status(500).json({
        ok: false,
        error: `Supabase nao configurado no servidor. Variaveis ausentes: ${missingEnv.join(", ") || "desconhecido"}.`
      });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const schoolIds = [...new Set([scopeContext.schoolScopeSchool.id, scopeContext.networkScopeSchool.id].filter(Boolean))];
    const { data, error } = await supabase
      .from("official_content_records")
      .select("*")
      .in("school_id", schoolIds)
      .order("module_key", { ascending: true })
      .order("scope_key", { ascending: true });
    if (error) throw error;
    const rows = data || [];
    const directNetworkRow = rows.find((item) => item.school_id === scopeContext.networkScopeSchool.id && item.module_key === "calendar" && item.scope_key === "network");
    if (!directNetworkRow) {
      const { record: legacyNetworkRecord } = await findOfficialContentRecord({ moduleKey: "calendar", scopeKey: "network", scopeContext });
      if (legacyNetworkRecord?.id && !rows.some((item) => item.id === legacyNetworkRecord.id)) {
        rows.push(legacyNetworkRecord);
      }
    }
    const payload = await buildOfficialContentResponse({ scopeContext, rows });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    console.error("Erro /api/official-content:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar Conteudo Oficial." });
  }
});

app.get("/api/official-content/institutions", async (req, res) => {
  try {
    if (!supabase) {
      const missingEnv = getMissingSupabaseServerEnv();
      return res.status(500).json({
        ok: false,
        error: `Supabase nao configurado no servidor. Variaveis ausentes: ${missingEnv.join(", ") || "desconhecido"}.`
      });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: ["superadmin"] });
    if (!access.ok) return access.response;

    const { data, error } = await supabase
      .from("schools")
      .select("id, name, slug, institution_type, parent_school_id")
      .order("name", { ascending: true });
    if (error) throw error;

    const byId = new Map((data || []).map((item) => [item.id, item]));
    const institutions = (data || []).map((item) => {
      const parent = item.parent_school_id ? byId.get(item.parent_school_id) : null;
      return serializeInstitutionContext(item, parent);
    });

    return res.json({
      ok: true,
      default_school_id: access.context.schoolId,
      institutions
    });
  } catch (error) {
    console.error("Erro /api/official-content/institutions:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar o catalogo institucional." });
  }
});

app.get("/api/chat-manager/schools", async (req, res) => {
  try {
    if (!supabase) {
      const missingEnv = getMissingSupabaseServerEnv();
      return res.status(500).json({
        ok: false,
        error: `Supabase nao configurado no servidor. Variaveis ausentes: ${missingEnv.join(", ") || "desconhecido"}.`
      });
    }

    const access = await requireRequestContext(req, res, { allowedRoles: [...CHAT_MANAGER_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const baseSchool = await fetchSchoolContextById(access.context.schoolId);
    if (!baseSchool?.id) {
      return res.status(404).json({ ok: false, error: "Contexto institucional do chat manager nao encontrado." });
    }

    const searchTerm = String(req.query.q || "").trim();
    const selectedSchoolId = String(req.query.selected_school_id || "").trim();
    const limit = clampQueryLimit(req.query.limit, 20, 50);
    const minSearchLength = 2;
    const normalizedType = normalizeInstitutionType(baseSchool.institution_type);
    const role = access.context.effectiveRole;
    const parentSchool = baseSchool.parent_school_id ? await fetchSchoolContextById(baseSchool.parent_school_id) : null;
    const networkScopeSchool = normalizedType === "school_unit" && parentSchool?.id ? parentSchool : baseSchool;
    const networkScope = serializeInstitutionContext(networkScopeSchool, parentSchool && networkScopeSchool?.id !== parentSchool.id ? parentSchool : null);
    const currentSchool = serializeInstitutionContext(baseSchool, parentSchool);
    const singleSchoolScope = normalizedType === "school_unit" && role !== "superadmin";
    const scopeMode = role === "superadmin"
      ? "global_search"
      : singleSchoolScope
        ? "single_school"
        : "network_search";

    let schools = [];
    let selectedSchool = null;

    if (selectedSchoolId) {
      const selected = await fetchSchoolContextById(selectedSchoolId);
      if (selected?.id) {
        const selectedParent = selected.parent_school_id ? await fetchSchoolContextById(selected.parent_school_id) : null;
        const belongsToCurrentNetwork = role === "superadmin"
          || selected.id === baseSchool.id
          || selected.parent_school_id === networkScopeSchool.id;
        if (belongsToCurrentNetwork) {
          selectedSchool = serializeInstitutionContext(selected, selectedParent);
        }
      }
    }

    if (singleSchoolScope) {
      const onlySchool = currentSchool;
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch = !normalizedSearch
        || String(onlySchool?.name || "").toLowerCase().includes(normalizedSearch)
        || String(onlySchool?.slug || "").toLowerCase().includes(normalizedSearch);
      schools = matchesSearch && onlySchool ? [onlySchool] : [];
      selectedSchool = selectedSchool || onlySchool;
    } else if (searchTerm.length >= minSearchLength) {
      const searchPattern = `%${searchTerm}%`;
      let query = supabase
        .from("schools")
        .select("id, name, slug, institution_type, parent_school_id")
        .or(`name.ilike.${searchPattern},slug.ilike.${searchPattern}`)
        .order("name", { ascending: true })
        .limit(limit);

      if (role !== "superadmin") {
        query = query.eq("parent_school_id", networkScopeSchool.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      const parentIds = [...new Set(rows.map((item) => item.parent_school_id).filter(Boolean))];
      const parentById = new Map();

      if (parentIds.length) {
        const { data: parentRows, error: parentError } = await supabase
          .from("schools")
          .select("id, name, slug, institution_type, parent_school_id")
          .in("id", parentIds);
        if (parentError) throw parentError;
        (parentRows || []).forEach((item) => parentById.set(item.id, item));
      }

      schools = rows
        .filter((item) => {
          if (role === "superadmin") return true;
          return item.id === networkScopeSchool.id || item.parent_school_id === networkScopeSchool.id;
        })
        .map((item) => serializeInstitutionContext(item, parentById.get(item.parent_school_id) || null));
    }

    return res.json({
      ok: true,
      scope_mode: scopeMode,
      min_search_length: minSearchLength,
      network_scope: networkScope,
      current_school: currentSchool,
      selected_school: selectedSchool,
      schools
    });
  } catch (error) {
    console.error("Erro /api/chat-manager/schools:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar as escolas do chat manager." });
  }
});

// ── Schools list for cross-school roles (auditor, superadmin) ────────
app.get("/api/schools/list", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: ["superadmin", "auditor"] });
    if (!access.ok) return access.response;
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, slug, institution_type, parent_school_id")
      .order("name", { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, schools: data || [] });
  } catch (error) {
    console.error("Erro /api/schools/list:", error);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message || "Falha ao carregar as escolas." });
  }
});

app.get("/api/users/managed", async (req, res) => {
  try {
    if (!supabase) {
      const missingEnv = getMissingSupabaseServerEnv();
      return res.status(500).json({
        ok: false,
        error: `Supabase nao configurado no servidor. Variaveis ausentes: ${missingEnv.join(", ") || "desconhecido"}.`
      });
    }

    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES] });
    if (!access.ok) return access.response;

    const scope = await resolveManagedSchoolScope(access.context);
    if (!scope.managedSchoolIds.length) {
      return res.json({ ok: true, scope_mode: scope.scopeMode, users: [], schools: [] });
    }

    const { data: memberRows, error: memberError } = await supabase
      .from("school_members")
      .select("id, user_id, school_id, role, name, email, phone, active, status, member_scope, created_at")
      .in("school_id", scope.managedSchoolIds)
      .order("name", { ascending: true });
    if (memberError) {
      throw Object.assign(new Error("Falha ao carregar os usuarios gerenciados."), { statusCode: 500, cause: memberError });
    }

    const parentIds = [...new Set((scope.managedSchools || []).map((item) => item.parent_school_id).filter(Boolean))];
    const parentById = new Map();

    if (parentIds.length) {
      const { data: parentRows, error: parentError } = await supabase
        .from("schools")
        .select("id, name, slug, institution_type, parent_school_id")
        .in("id", parentIds);
      if (parentError) {
        throw Object.assign(new Error("Falha ao carregar os contextos institucionais da gestao de usuarios."), { statusCode: 500, cause: parentError });
      }
      (parentRows || []).forEach((item) => parentById.set(item.id, item));
    }

    const schools = (scope.managedSchools || []).map((item) => {
      const parent = item.parent_school_id ? parentById.get(item.parent_school_id) || null : null;
      return serializeInstitutionContext(item, parent);
    });
    const schoolsById = new Map(schools.map((item) => [item.id, item]));

    const users = (memberRows || []).map((item) => {
      const school = schoolsById.get(item.school_id) || null;
      const parent = school?.parent_school_id ? schoolsById.get(school.parent_school_id) || null : null;
      return {
        ...item,
        source_table: "school_members",
        school_name: school?.name || "",
        school_institution_type: school?.institution_type || "",
        parent_school_name: parent?.name || school?.parent_name || ""
      };
    });

    return res.json({
      ok: true,
      scope_mode: scope.scopeMode,
      managed_school_ids: scope.managedSchoolIds,
      schools,
      users
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    if (statusCode >= 500) {
      console.error("Erro /api/users/managed:", error?.cause || error);
    }
    return res.status(statusCode).json({ ok: false, error: error.message || "Falha ao carregar os usuarios gerenciados." });
  }
});

app.post("/api/official-content/:module/:scope", async (req, res) => {
  try {
    if (!supabase) {
      const missingEnv = getMissingSupabaseServerEnv();
      return res.status(500).json({
        ok: false,
        error: `Supabase nao configurado no servidor. Variaveis ausentes: ${missingEnv.join(", ") || "desconhecido"}.`
      });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const moduleKey = String(req.params.module || "").trim().toLowerCase();
    const scopeKey = String(req.params.scope || "").trim().toLowerCase();
    if (!moduleKey || !scopeKey) return res.status(400).json({ ok: false, error: "Modulo e escopo sao obrigatorios." });
    const allowedModules = new Set(["calendar", "enrollment", "faq", "notices"]);
    const allowedScopes = new Set(["network", "school"]);
    if (!allowedModules.has(moduleKey)) return res.status(400).json({ ok: false, error: "Modulo invalido." });
    if (!allowedScopes.has(scopeKey)) return res.status(400).json({ ok: false, error: "Escopo invalido." });
    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({
        ok: false,
        error: scopeKey === "network"
          ? "Seu perfil nao pode editar conteudo oficial da rede."
          : "Seu perfil nao pode editar conteudo oficial da escola."
      });
    }
    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
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
    let fileName = String(req.body?.file_name || "").trim();
    if (!fileName) {
      fileName = moduleKey === 'calendar' ? `calendario-${scopeKey}.csv` : `${moduleKey}-${scopeKey}.txt`;
    }
    const version = await publishSourceVersion({
      schoolId,
      sourceDocument,
      versionLabel: moduleKey + "-" + scopeKey + "-" + new Date().toISOString().slice(0, 10),
      content: technicalContent,
      fileName,
      mimeType: moduleKey === 'calendar' ? 'text/csv' : 'text/plain',
      userId: access.context.user.id
    });
    payload.source_document_id = sourceDocument.id;
    payload.source_version_id = version.id;
    const { data, error } = await supabase.from("official_content_records").upsert(payload, { onConflict: "school_id,module_key,scope_key" }).select("*").single();
    if (error) throw error;
    await supabase.from("formal_audit_events").insert({ school_id: schoolId, event_type: "OFFICIAL_CONTENT_UPDATED", actor_type: "Gestao", actor_name: payload.updated_by || "Conteudo Oficial", consultation_id: null, details: { module_key: moduleKey, scope_key: scopeKey, status: payload.status, title: payload.title, summary: payload.summary, content_payload: payload.content_payload, source_document_id: sourceDocument.id, source_version_id: version.id, knowledge_sync: true } });
    return res.json({ ok: true, record: data, source_document: sourceDocument, source_version: version });
  } catch (error) {
    console.error("Erro /api/official-content/:module/:scope:", error);
    return res.status(500).json({ ok: false, error: "Falha ao salvar Conteudo Oficial." });
  }
});

app.get("/api/official-content/:module/:scope/history", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const moduleKey = String(req.params.module || "").trim().toLowerCase();
    const scopeKey = String(req.params.scope || "").trim().toLowerCase();
    const { record, recordSchoolId } = await findOfficialContentRecord({ moduleKey, scopeKey, scopeContext });
    const [enrichedRecord] = await enrichOfficialContentRecords(record ? [record] : []);
    const effectiveRecord = enrichedRecord || record || null;

    if (!effectiveRecord?.source_document_id) {
      return res.json({ ok: true, current: effectiveRecord, history: [] });
    }

    const [{ data: versions, error: versionsError }, { data: audits, error: auditsError }] = await Promise.all([
      supabase
        .from("knowledge_source_versions")
        .select("id, source_document_id, version_label, version_number, file_name, mime_type, published_at, is_current, created_by")
        .eq("school_id", recordSchoolId)
        .eq("source_document_id", effectiveRecord.source_document_id)
        .order("version_number", { ascending: false }),
      supabase
        .from("formal_audit_events")
        .select("id, actor_name, created_at, details")
        .eq("school_id", recordSchoolId)
        .eq("event_type", "OFFICIAL_CONTENT_UPDATED")
        .order("created_at", { ascending: false })
        .limit(100)
    ]);
    if (versionsError) throw versionsError;
    if (auditsError) throw auditsError;

    const scopedAudits = (audits || []).filter((event) => {
      const details = event.details || {};
      return String(details.module_key || "") === moduleKey && String(details.scope_key || "") === scopeKey;
    });

    const history = (versions || []).map((version) => {
      const auditMatch = scopedAudits.find((event) => String(event.details?.source_version_id || "") === String(version.id));
      const details = auditMatch?.details || {};
      return {
        id: version.id,
        version_label: version.version_label,
        version_number: version.version_number,
        file_name: version.file_name || null,
        mime_type: version.mime_type || null,
        published_at: version.published_at,
        is_current: Boolean(version.is_current),
        actor_name: auditMatch?.actor_name || null,
        status: details.status || null,
        title: details.title || null,
        summary: details.summary || null,
        snapshot_available: Boolean(details && typeof details.content_payload === 'object'),
        audit_event_id: auditMatch?.id || null
      };
    });

    return res.json({ ok: true, current: effectiveRecord, history });
  } catch (error) {
    console.error("Erro /api/official-content/:module/:scope/history:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar historico do Conteudo Oficial." });
  }
});

app.post("/api/official-content/:module/:scope/status", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const moduleKey = String(req.params.module || "").trim().toLowerCase();
    const scopeKey = String(req.params.scope || "").trim().toLowerCase();
    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({ ok: false, error: "Seu perfil nao pode alterar o status deste conteudo oficial." });
    }
    const nextStatus = String(req.body?.status || "").trim().toLowerCase();
    if (!["draft", "published", "archived"].includes(nextStatus)) {
      return res.status(400).json({ ok: false, error: "Status invalido. Use draft, published ou archived." });
    }
    const updatedBy = String(req.body?.updated_by || access.context.user.email || access.context.user.id || "Gestao").trim();
    const { recordSchoolId } = await findOfficialContentRecord({ moduleKey, scopeKey, scopeContext });
    const { data: record, error: updateError } = await supabase
      .from("official_content_records")
      .update({ status: nextStatus, updated_by: updatedBy, updated_at: new Date().toISOString() })
      .eq("school_id", recordSchoolId)
      .eq("module_key", moduleKey)
      .eq("scope_key", scopeKey)
      .select("*")
      .single();
    if (updateError) throw updateError;

    await supabase.from("formal_audit_events").insert({
      school_id: recordSchoolId,
      event_type: "OFFICIAL_CONTENT_STATUS_UPDATED",
      actor_type: "Gestao",
      actor_name: updatedBy || "Conteudo Oficial",
      consultation_id: null,
      details: {
        module_key: moduleKey,
        scope_key: scopeKey,
        status: nextStatus,
        source_document_id: record.source_document_id || null,
        source_version_id: record.source_version_id || null
      }
    });

    return res.json({ ok: true, record });
  } catch (error) {
    console.error("Erro /api/official-content/:module/:scope/status:", error);
    return res.status(500).json({ ok: false, error: "Falha ao atualizar status do Conteudo Oficial." });
  }
});

app.post("/api/official-content/:module/:scope/restore/:versionId", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;
    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const moduleKey = String(req.params.module || "").trim().toLowerCase();
    const scopeKey = String(req.params.scope || "").trim().toLowerCase();
    const versionId = String(req.params.versionId || "").trim();
    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({ ok: false, error: "Seu perfil nao pode reativar versoes deste conteudo oficial." });
    }
    const { record: existingRecord, recordSchoolId } = await findOfficialContentRecord({ moduleKey, scopeKey, scopeContext });

    const [{ data: audits, error: auditsError }] = await Promise.all([
      supabase
        .from("formal_audit_events")
        .select("id, actor_name, created_at, details")
        .eq("school_id", recordSchoolId)
        .eq("event_type", "OFFICIAL_CONTENT_UPDATED")
        .order("created_at", { ascending: false })
        .limit(100)
    ]);
    if (auditsError) throw auditsError;
    if (!existingRecord?.id) {
      return res.status(404).json({ ok: false, error: "Registro atual de Conteudo Oficial nao encontrado para restauracao." });
    }

    const auditMatch = (audits || []).find((event) => {
      const details = event.details || {};
      return String(details.module_key || "") === moduleKey && String(details.scope_key || "") === scopeKey && String(details.source_version_id || "") === versionId;
    });

    const snapshot = auditMatch?.details?.content_payload;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ ok: false, error: "Esta versao nao possui snapshot reversivel. Reative apenas versoes salvas com historico estruturado." });
    }

    const restoredTitle = String(req.body?.title || auditMatch?.details?.title || existingRecord.title || '').trim() || null;
    const restoredSummary = String(req.body?.summary || auditMatch?.details?.summary || existingRecord.summary || '').trim() || null;
    const updatedBy = String(req.body?.updated_by || access.context.user.email || access.context.user.id || 'Gestao').trim();
    const sourceDocument = await ensureOfficialContentSourceDocument({
      schoolId: recordSchoolId,
      moduleKey,
      scopeKey,
      title: restoredTitle || (moduleKey + '-' + scopeKey),
      summary: restoredSummary,
      existingSourceDocumentId: existingRecord.source_document_id
    });
    const technicalContent = formatOfficialContentForKnowledge(moduleKey, scopeKey, restoredTitle, restoredSummary, snapshot);
    const version = await publishSourceVersion({
      schoolId: recordSchoolId,
      sourceDocument,
      versionLabel: moduleKey + '-' + scopeKey + '-restored-' + new Date().toISOString().slice(0, 10),
      content: technicalContent,
      fileName: moduleKey + '-' + scopeKey + '.txt',
      mimeType: 'text/plain',
      userId: access.context.user.id
    });

    const payload = {
      title: restoredTitle,
      summary: restoredSummary,
      content_payload: snapshot,
      status: 'published',
      source_document_id: sourceDocument.id,
      source_version_id: version.id,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    };

    const { data: updatedRecord, error: upsertError } = await supabase
      .from('official_content_records')
      .update(payload)
      .eq('school_id', recordSchoolId)
      .eq('module_key', moduleKey)
      .eq('scope_key', scopeKey)
      .select('*')
      .single();
    if (upsertError) throw upsertError;

    await supabase.from('formal_audit_events').insert({
      school_id: recordSchoolId,
      event_type: 'OFFICIAL_CONTENT_RESTORED',
      actor_type: 'Gestao',
      actor_name: updatedBy || 'Conteudo Oficial',
      consultation_id: null,
      details: {
        module_key: moduleKey,
        scope_key: scopeKey,
        restored_from_source_version_id: versionId,
        source_document_id: sourceDocument.id,
        source_version_id: version.id,
        title: restoredTitle,
        summary: restoredSummary,
        content_payload: snapshot,
        status: 'published'
      }
    });

    return res.json({ ok: true, record: updatedRecord, source_document: sourceDocument, source_version: version });
  } catch (error) {
    console.error("Erro /api/official-content/:module/:scope/restore/:versionId:", error);
    return res.status(500).json({ ok: false, error: "Falha ao reativar versao anterior do Conteudo Oficial." });
  }
});

app.get("/api/public-calendar", async (_req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });

    const [{ data: schools, error: schoolsError }, { data: records, error: recordsError }] = await Promise.all([
      supabase
        .from("schools")
        .select("id, name, slug, institution_type, parent_school_id")
        .order("name", { ascending: true }),
      supabase
        .from("official_content_records")
        .select("school_id, scope_key, title, summary, content_payload, status, updated_at")
        .eq("module_key", "calendar")
        .eq("status", "published")
    ]);

    if (schoolsError) throw schoolsError;
    if (recordsError) throw recordsError;

    const schoolRows = schools || [];
    const recordRows = records || [];
    const bySchool = new Map(schoolRows.map((school) => [school.id, school]));
    const networkIdsWithChildren = new Set(
      schoolRows
        .filter((school) => (!school.institution_type || school.institution_type === 'school_unit') && school.parent_school_id)
        .map((school) => school.parent_school_id)
    );

    const schoolCalendars = schoolRows
      .filter((school) => !school.institution_type || school.institution_type === 'school_unit')
      .map((school) => {
        const parent = school.parent_school_id ? bySchool.get(school.parent_school_id) : null;
        const networkRecord = parent ? recordRows.find((row) => row.school_id === parent.id && row.scope_key === 'network') : recordRows.find((row) => row.school_id === school.id && row.scope_key === 'network');
        const schoolRecord = recordRows.find((row) => row.school_id === school.id && row.scope_key === 'school');
        const networkEntries = Array.isArray(networkRecord?.content_payload?.entries) ? networkRecord.content_payload.entries : [];
        const schoolEntries = Array.isArray(schoolRecord?.content_payload?.entries) ? schoolRecord.content_payload.entries : [];
        return {
          selection_id: `school:${school.id}`,
          school_id: school.id,
          school_name: school.name,
          school_slug: school.slug,
          network_id: parent?.id || school.id,
          network_name: parent?.name || school.name,
          institution_type: school.institution_type || 'school_unit',
          presentation_kind: 'school_unit',
          calendar_title: schoolRecord?.title || networkRecord?.title || 'Calendario Escolar',
          calendar_summary: schoolRecord?.summary || networkRecord?.summary || '',
          network_entries: networkEntries,
          school_entries: schoolEntries,
          merged_entries: [...networkEntries, ...schoolEntries],
          updated_at: schoolRecord?.updated_at || networkRecord?.updated_at || null
        };
      })
      .filter((item) => item.merged_entries.length);

    const standaloneNetworks = schoolRows
      .filter((school) => school.institution_type === 'education_department')
      .map((school) => {
        const networkRecord = recordRows.find((row) => row.school_id === school.id && row.scope_key === 'network');
        const networkEntries = Array.isArray(networkRecord?.content_payload?.entries) ? networkRecord.content_payload.entries : [];
        return {
          selection_id: `network:${school.id}`,
          school_id: school.id,
          school_name: school.name,
          school_slug: school.slug,
          network_id: school.id,
          network_name: school.name,
          institution_type: 'education_department',
          presentation_kind: 'network_only',
          calendar_title: networkRecord?.title || 'Calendario da Rede',
          calendar_summary: networkRecord?.summary || '',
          network_entries: networkEntries,
          school_entries: [],
          merged_entries: networkEntries,
          updated_at: networkRecord?.updated_at || null
        };
      })
      .filter((item) => item.merged_entries.length && networkIdsWithChildren.has(item.network_id));

    const calendars = [...standaloneNetworks, ...schoolCalendars]
      .sort((a, b) =>
        String(a.network_name).localeCompare(String(b.network_name), 'pt-BR') ||
        Number(a.presentation_kind !== 'network_only') - Number(b.presentation_kind !== 'network_only') ||
        String(a.school_name).localeCompare(String(b.school_name), 'pt-BR')
      );

    const networks = [...new Map(calendars.map((item) => [item.network_id, { id: item.network_id, name: item.network_name }])).values()]
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));

    return res.json({ ok: true, networks, schools: calendars });
  } catch (error) {
    console.error("Erro /api/public-calendar:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar calendario escolar publico." });
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
      .select("school_id, active_provider, groq_model, updated_by, updated_at")
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
        active_provider: data?.active_provider === 'groq' ? 'groq' : fallback.active_provider,
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
    const activeProvider = 'groq';
    const groqModel = String(req.body?.groq_model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
    const updatedBy = String(req.body?.updated_by || access.context.memberName || access.context.memberEmail || 'Operador institucional').trim();

        if (!groqModel) {
      return res.status(400).json({ ok: false, error: 'groq_model invalido.' });
    }

    const { data, error } = await supabase
      .from("ai_provider_settings")
      .upsert({
        school_id: schoolId,
        active_provider: activeProvider,
        groq_model: groqModel || null,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' })
      .select("school_id, active_provider, groq_model, updated_by, updated_at")
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
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds || [];
    if (!schoolIds.length) {
      return res.status(200).json({
        ok: true,
        period: periodConfig.period,
        period_label: periodConfig.label,
        metrics: fallbackDashboard(periodConfig).metrics,
        assistant_volume: [],
        top_topics: [],
        channel_volume: [],
        risk_overview: [],
        response_risk_module: buildResponseRiskModule([]),
        latest_audit_events: [],
        scope_mode: scope.scopeMode
      });
    }

    const consultationsResult = await applyRange(
      supabase
        .from("institutional_consultations")
        .select("id, requester_id, channel, status, primary_topic, assigned_assistant_key, opened_at")
        .in("school_id", schoolIds)
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
          .in("school_id", schoolIds)
          .order("created_at", { ascending: false })
          .limit(2000),
        "created_at",
        periodConfig
      ),
      applyRange(
        supabase
          .from("formal_audit_events")
          .select("consultation_id, event_type, severity, details, created_at")
          .in("school_id", schoolIds)
          .order("created_at", { ascending: false })
          .limit(2000),
        "created_at",
        periodConfig
      ),
      applyRange(
        supabase
          .from("formal_audit_events")
          .select("event_type, severity, created_at, summary")
          .in("school_id", schoolIds)
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
      latest_audit_events: latestAuditsResult.data || [],
      scope_mode: scope.scopeMode
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
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "direction", "auditor", "content_curator", "coordination", "treasury", "public_operator", "observer"] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds || [];
    if (!schoolIds.length) {
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
          supabase.from("institutional_consultations").select("id, school_id, status, primary_topic, requester_id, channel, opened_at").in("school_id", schoolIds).order("opened_at", { ascending: false }).limit(2000),
          "opened_at",
          config
        ),
        applyRange(
          supabase.from("assistant_responses").select("id, school_id, consultation_id, assistant_key, confidence_score, source_version_id, response_mode, fallback_to_human, supporting_source_title, delivered_at, created_at").in("school_id", schoolIds).order("created_at", { ascending: false }).limit(2000),
          "created_at",
          config
        ),
        applyRange(
          supabase.from("formal_audit_events").select("school_id, consultation_id, event_type, details, created_at").in("school_id", schoolIds).order("created_at", { ascending: false }).limit(2000),
          "created_at",
          config
        ),
        applyRange(
          supabase.from("consultation_messages").select("school_id, consultation_id, actor_type, created_at").in("school_id", schoolIds).order("created_at", { ascending: true }).limit(4000),
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
      comparison,
      scope_mode: scope.scopeMode
    });
  } catch (error) {
    console.error("Erro /api/reports/operational-summary:", error);
    return res.status(500).json({ ok: false, error: "Falha ao montar relatorio operacional." });
  }
});

app.post("/api/audit/events/:id/review", async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase indisponivel." });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "direction", "auditor", "content_curator", "coordination", "treasury", "public_operator", "secretariat"] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds || [];
    const eventId = String(req.params.id || '').trim();
    const reviewStatus = String(req.body?.review_status || '').trim().toUpperCase();
    const reviewedBy = String(req.body?.reviewed_by || 'Operador institucional').trim();
    const reviewNotes = String(req.body?.review_notes || '').trim();
    const treatmentDestination = normalizeAuditTreatmentDestination(req.body?.treatment_destination);
    const allowedStatuses = new Set(['PENDING_REVIEW', 'REVIEWED', 'KNOWLEDGE_CREATED', 'DISMISSED']);

    if (!eventId) {
      return res.status(400).json({ ok: false, error: 'Evento de auditoria invalido.' });
    }
    if (!allowedStatuses.has(reviewStatus)) {
      return res.status(400).json({ ok: false, error: 'Status de revisao invalido.' });
    }
    if (treatmentDestination && !canRoleHandleAuditTreatmentDestination(access.context.effectiveRole, treatmentDestination)) {
      return res.status(403).json({ ok: false, error: 'Seu perfil nao pode encaminhar para este destino de tratamento.' });
    }
    if (!schoolIds.length) {
      return res.status(403).json({ ok: false, error: 'Seu perfil nao possui escopo institucional valido para tratar eventos.' });
    }
    let query = supabase
      .from('formal_audit_events')
      .select('id, school_id, consultation_id, event_type, actor_name, summary, details')
      .eq('id', eventId)
      .in('school_id', schoolIds)
      .limit(1)
      .maybeSingle();

    const { data: eventRow, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!eventRow) {
      return res.status(404).json({ ok: false, error: 'Evento de auditoria nao encontrado.' });
    }

    const nextTreatmentDestination = treatmentDestination || normalizeAuditTreatmentDestination(eventRow.details?.treatment_destination);
    const nextProgressStatus = nextTreatmentDestination
      ? getDefaultTreatmentProgressForReviewStatus(reviewStatus, eventRow.details?.treatment_progress_status)
      : (reviewStatus === 'DISMISSED' ? 'DISMISSED' : '');
    const nextDetails = {
      ...(eventRow.details || {}),
      review_status: reviewStatus,
      reviewed_by: reviewedBy || 'Operador institucional',
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
      treatment_destination: nextTreatmentDestination || null,
      treatment_progress_status: nextProgressStatus || null,
      treatment_last_updated_at: new Date().toISOString(),
      treatment_last_updated_by: reviewedBy || 'Operador institucional'
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
        review_notes: reviewNotes || null,
        treatment_destination: nextTreatmentDestination || null,
        treatment_progress_status: nextProgressStatus || null
      }
    });

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Erro /api/audit/events/:id/review:', error);
    return res.status(500).json({ ok: false, error: 'Falha ao atualizar tratamento do evento.' });
  }
});

app.get("/api/audit/treatments", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, items: [], destinations: [] });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "direction", "auditor", "content_curator", "coordination", "public_operator", "secretariat"] });
    if (!access.ok) return access.response;
    const includeCompleted = String(req.query.include_completed || "").trim().toLowerCase() === "true";
    const includeAllDestinations = String(req.query.view || "").trim().toLowerCase() === "all";
    const destination = String(req.query.destination || "").trim();
    const queue = await buildAuditTreatmentQueue({
      accessContext: access.context,
      includeCompleted,
      includeAllDestinations,
      destinationFilter: destination
    });
    return res.status(200).json({ ok: true, scope_mode: queue.scopeMode, destinations: queue.destinations, items: queue.items });
  } catch (error) {
    console.error("Erro /api/audit/treatments:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar a fila de tratamentos." });
  }
});

app.post("/api/audit/treatments/:id/status", async (req, res) => {
  if (!supabase) return res.status(500).json({ ok: false, error: "Supabase indisponivel." });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "direction", "auditor", "content_curator", "coordination", "public_operator", "secretariat"] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds || [];
    const eventId = String(req.params.id || "").trim();
    const nextStatus = normalizeAuditTreatmentProgress(req.body?.treatment_progress_status);
    const notes = String(req.body?.treatment_completion_notes || "").trim();
    const actorName = String(req.body?.updated_by || access.context.memberName || access.context.memberEmail || "Operador institucional").trim();

    if (!eventId) {
      return res.status(400).json({ ok: false, error: "Item de tratamento invalido." });
    }
    if (!["OPEN", "IN_PROGRESS", "COMPLETED", "DISMISSED"].includes(nextStatus)) {
      return res.status(400).json({ ok: false, error: "Status do tratamento invalido." });
    }
    if (!schoolIds.length) {
      return res.status(403).json({ ok: false, error: "Seu perfil nao possui escopo institucional valido para tratar eventos." });
    }

    const { data: eventRow, error: fetchError } = await supabase
      .from("formal_audit_events")
      .select("id, school_id, consultation_id, event_type, summary, details")
      .eq("id", eventId)
      .in("school_id", schoolIds)
      .limit(1)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!eventRow) {
      return res.status(404).json({ ok: false, error: "Item de tratamento nao encontrado." });
    }

    const destination = normalizeAuditTreatmentDestination(eventRow.details?.treatment_destination);
    if (!destination) {
      return res.status(400).json({ ok: false, error: "Este evento ainda nao possui destino de tratamento." });
    }
    if (!canRoleHandleAuditTreatmentDestination(access.context.effectiveRole, destination)) {
      return res.status(403).json({ ok: false, error: "Seu perfil nao pode atualizar este destino de tratamento." });
    }

    const nextDetails = {
      ...(eventRow.details || {}),
      treatment_progress_status: nextStatus,
      treatment_last_updated_at: new Date().toISOString(),
      treatment_last_updated_by: actorName || "Operador institucional",
      treatment_completion_notes: notes || null
    };

    const { data: updatedEvent, error: updateError } = await supabase
      .from("formal_audit_events")
      .update({ details: nextDetails })
      .eq("id", eventId)
      .select("id, details")
      .single();
    if (updateError) throw updateError;

    await supabase.from("formal_audit_events").insert({
      school_id: eventRow.school_id,
      consultation_id: eventRow.consultation_id,
      event_type: "AUDIT_TREATMENT_PROGRESS_UPDATED",
      severity: "INFO",
      actor_type: "HUMAN",
      actor_name: actorName || "Operador institucional",
      summary: `Tratamento atualizado para ${AUDIT_TREATMENT_PROGRESS[nextStatus] || nextStatus}.`,
      details: {
        source_event_id: eventRow.id,
        source_event_type: eventRow.event_type,
        treatment_destination: destination,
        treatment_progress_status: nextStatus,
        treatment_last_updated_at: nextDetails.treatment_last_updated_at,
        treatment_last_updated_by: actorName || "Operador institucional",
        treatment_completion_notes: notes || null
      }
    });

    return res.status(200).json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error("Erro /api/audit/treatments/:id/status:", error);
    return res.status(500).json({ ok: false, error: "Falha ao atualizar o tratamento." });
  }
});

app.get("/api/audit/events", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, events: [] });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...PRIVILEGED_ROLES, "direction", "auditor", "content_curator", "coordination", "treasury", "public_operator", "secretariat", "observer"] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds || [];
    if (!schoolIds.length) {
      return res.status(200).json({ ok: true, events: [], scope_mode: scope.scopeMode });
    }
    const query = supabase
      .from("formal_audit_events")
      .select("id, consultation_id, event_type, severity, actor_type, actor_name, summary, details, created_at")
      .in("school_id", schoolIds)
      .order("created_at", { ascending: false })
      .limit(200);

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
        .select("id, school_id, requester_id, requester_name, channel, assigned_assistant_key, opened_at, resolved_at, metadata")
        .in("school_id", schoolIds)
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
            .select("id, school_id, consultation_id, direction, actor_type, actor_name, message_text, created_at")
            .in("school_id", schoolIds)
            .in("consultation_id", effectiveConsultationIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("assistant_responses")
            .select("id, school_id, consultation_id, assistant_key, response_text, source_version_id, confidence_score, response_mode, consulted_sources, supporting_source_title, supporting_source_excerpt, supporting_source_version_label, origin_message_id, response_message_id, fallback_to_human, corrected_from_response_id, corrected_at, corrected_by, delivered_at, created_at")
            .in("school_id", schoolIds)
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
        treatment_destination: normalizeAuditTreatmentDestination(details.treatment_destination) || '',
        treatment_progress_status: normalizeAuditTreatmentProgress(details.treatment_progress_status || getDefaultTreatmentProgressForReviewStatus(details.review_status, details.treatment_progress_status)) || '',
        treatment_completion_notes: details.treatment_completion_notes || '',
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

    return res.status(200).json({ ok: true, events, scope_mode: scope.scopeMode });
  } catch (error) {
    console.error("Erro /api/audit/events:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar trilha de auditoria." });
  }
});

// ============================================================================
// ROTAS DE FAQ - Perguntas/Respostas com versionamento, auditoria e testes
// ============================================================================
app.get("/api/faq", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const scopeKey = String(req.query.scope || "school").trim().toLowerCase();

    if (!["school", "network"].includes(scopeKey)) {
      return res.status(400).json({ ok: false, error: "Escopo deve ser 'school' ou 'network'." });
    }

    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
    const { items, total } = await faqController.listFaqItems(req, access.context, { schoolId, scopeKey });

    return res.json({ ok: true, items, total });
  } catch (error) {
    console.error("Erro GET /api/faq:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao listar FAQs." });
  }
});

app.post("/api/faq", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const scopeKey = String(req.query.scope || "school").trim().toLowerCase();

    if (!["school", "network"].includes(scopeKey)) {
      return res.status(400).json({ ok: false, error: "Escopo deve ser 'school' ou 'network'." });
    }

    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({ ok: false, error: "Seu perfil não tem permissão para editar FAQs." });
    }

    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
    const faqItem = await faqController.createOrUpdateFaqItem(req, access.context, { schoolId, scopeKey });

    return res.json({ ok: true, faq: faqItem });
  } catch (error) {
    console.error("Erro POST /api/faq:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao criar FAQ." });
  }
});

app.put("/api/faq/:id", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const scopeKey = String(req.query.scope || "school").trim().toLowerCase();
    const faqId = String(req.params.id || "").trim();

    if (!["school", "network"].includes(scopeKey)) {
      return res.status(400).json({ ok: false, error: "Escopo deve ser 'school' ou 'network'." });
    }

    if (!faqId) {
      return res.status(400).json({ ok: false, error: "ID do FAQ é obrigatório." });
    }

    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({ ok: false, error: "Seu perfil não tem permissão para editar FAQs." });
    }

    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
    const faqItem = await faqController.createOrUpdateFaqItem(req, access.context, { schoolId, scopeKey, faqId });

    return res.json({ ok: true, faq: faqItem });
  } catch (error) {
    console.error("Erro PUT /api/faq/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao atualizar FAQ." });
  }
});

app.delete("/api/faq/:id", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const scopeKey = String(req.query.scope || "school").trim().toLowerCase();
    const faqId = String(req.params.id || "").trim();

    if (!["school", "network"].includes(scopeKey)) {
      return res.status(400).json({ ok: false, error: "Escopo deve ser 'school' ou 'network'." });
    }

    if (!faqId) {
      return res.status(400).json({ ok: false, error: "ID do FAQ é obrigatório." });
    }

    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({ ok: false, error: "Seu perfil não tem permissão para deletar FAQs." });
    }

    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
    await faqController.deleteFaqItem(req, access.context, { schoolId, faqId });

    return res.json({ ok: true, message: "FAQ deletado com sucesso." });
  } catch (error) {
    console.error("Erro DELETE /api/faq/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao deletar FAQ." });
  }
});

app.post("/api/faq/:id/publish", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const scopeKey = String(req.query.scope || "school").trim().toLowerCase();
    const faqId = String(req.params.id || "").trim();

    if (!["school", "network"].includes(scopeKey)) {
      return res.status(400).json({ ok: false, error: "Escopo deve ser 'school' ou 'network'." });
    }

    if (!faqId) {
      return res.status(400).json({ ok: false, error: "ID do FAQ é obrigatório." });
    }

    const editorRoles = scopeKey === "network" ? OFFICIAL_CONTENT_NETWORK_EDIT_ROLES : OFFICIAL_CONTENT_SCHOOL_EDIT_ROLES;
    if (!editorRoles.has(access.context.effectiveRole)) {
      return res.status(403).json({ ok: false, error: "Seu perfil não tem permissão para publicar FAQs." });
    }

    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
    const faqItem = await faqController.publishFaqItem(req, access.context, { schoolId, faqId });

    return res.json({ ok: true, faq: faqItem, message: "FAQ publicado com sucesso." });
  } catch (error) {
    console.error("Erro POST /api/faq/:id/publish:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao publicar FAQ." });
  }
});

app.post("/api/faq/:id/test", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);
    const scopeKey = String(req.query.scope || "school").trim().toLowerCase();
    const faqId = String(req.params.id || "").trim();

    if (!["school", "network"].includes(scopeKey)) {
      return res.status(400).json({ ok: false, error: "Escopo deve ser 'school' ou 'network'." });
    }

    if (!faqId) {
      return res.status(400).json({ ok: false, error: "ID do FAQ é obrigatório." });
    }

    const schoolId = scopeKey === "network" ? scopeContext.networkScopeSchool.id : scopeContext.schoolScopeSchool.id;
    const testResult = await faqController.testFaqWithAi(req, access.context, { schoolId, faqId });

    return res.json({ ok: true, testResult, message: "Teste de IA concluído." });
  } catch (error) {
    console.error("Erro POST /api/faq/:id/test:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao testar FAQ." });
  }
});

app.post("/api/faq/test-mock", async (req, res) => {
  const score = Math.random() * 0.4 + 0.6; // Mock score entre 0.6 e 1.0
  res.json({ ok: true, score });
});

app.get("/api/faq/conflicts", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...OFFICIAL_CONTENT_ALLOWED_ROLES] });
    if (!access.ok) return access.response;

    const scopeContext = await resolveOfficialContentScopeContext(access.context.schoolId);

    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase não configurado." });
    }

    const { data: conflicts, error } = await supabase
      .from("faq_conflicts")
      .select("*")
      .eq("school_id", scopeContext.schoolScopeSchool.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw Object.assign(
        new Error(`Falha ao listar conflitos: ${error.message}`),
        { statusCode: 500, cause: error }
      );
    }

    return res.json({ ok: true, conflicts: conflicts || [] });
  } catch (error) {
    console.error("Erro GET /api/faq/conflicts:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao listar conflitos." });
  }
});

// ─── NOTICES / COMUNICADOS ────────────────────────────────────────────────────

app.get("/api/notices", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...NOTICES_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds;

    let query = supabase
      .from("notices")
      .select("*, notice_attachments(id, file_name, file_url, file_type, file_size)")
      .in("school_id", schoolIds)
      .order("published_at", { ascending: false });

    const filterType = String(req.query.type || "").trim().toLowerCase();
    if (filterType && ["internal", "external"].includes(filterType)) {
      query = query.eq("type", filterType);
    }
    const filterPriority = String(req.query.priority || "").trim().toLowerCase();
    if (filterPriority && ["normal", "high", "urgent"].includes(filterPriority)) {
      query = query.eq("priority", filterPriority);
    }
    const activeOnly = req.query.active !== "false";
    if (activeOnly) {
      query = query.or("expiry_date.is.null,expiry_date.gte." + new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const schoolMap = {};
    for (const s of scope.managedSchools) { schoolMap[s.id] = s.name; }
    const notices = (data || []).map(n => ({ ...n, school_name: schoolMap[n.school_id] || "" }));

    return res.json({ ok: true, notices, scope_mode: scope.scopeMode });
  } catch (error) {
    console.error("Erro GET /api/notices:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar comunicados." });
  }
});

app.get("/api/notices/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...NOTICES_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("notices")
      .select("*, notice_attachments(id, file_name, file_url, file_type, file_size)")
      .eq("id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: "Comunicado nao encontrado." });

    return res.json({ ok: true, notice: data });
  } catch (error) {
    console.error("Erro GET /api/notices/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar comunicado." });
  }
});

app.post("/api/notices", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...NOTICES_WRITE_ROLES] });
    if (!access.ok) return access.response;

    const { title, content, type, priority, expiry_date, target_segment_id } = req.body;
    if (!title || !content) {
      return res.status(400).json({ ok: false, error: "Titulo e conteudo sao obrigatorios." });
    }
    const validTypes = ["internal", "external"];
    const noticeType = validTypes.includes(String(type || "").trim().toLowerCase()) ? String(type).trim().toLowerCase() : "internal";
    const validPriorities = ["normal", "high", "urgent"];
    const noticePriority = validPriorities.includes(String(priority || "").trim().toLowerCase()) ? String(priority).trim().toLowerCase() : "normal";

    const insertData = {
      school_id: access.context.schoolId,
      title: String(title).trim(),
      content: String(content).trim(),
      type: noticeType,
      priority: noticePriority,
      author_id: access.context.user.id,
      published_at: new Date().toISOString()
    };
    if (expiry_date) {
      const parsed = new Date(expiry_date);
      if (!isNaN(parsed.getTime())) insertData.expiry_date = parsed.toISOString();
    }
    if (target_segment_id) {
      insertData.target_segment_id = String(target_segment_id).trim();
    }

    const { data, error } = await supabase.from("notices").insert(insertData).select().single();
    if (error) throw error;

    return res.status(201).json({ ok: true, notice: data });
  } catch (error) {
    console.error("Erro POST /api/notices:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao criar comunicado." });
  }
});

app.put("/api/notices/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...NOTICES_WRITE_ROLES] });
    if (!access.ok) return access.response;

    const { data: existing, error: fetchErr } = await supabase
      .from("notices")
      .select("id, school_id")
      .eq("id", req.params.id)
      .eq("school_id", access.context.schoolId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ ok: false, error: "Comunicado nao encontrado na sua instituicao." });

    const updates = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.content !== undefined) updates.content = String(req.body.content).trim();
    if (req.body.type !== undefined) {
      const validTypes = ["internal", "external"];
      const t = String(req.body.type).trim().toLowerCase();
      if (validTypes.includes(t)) updates.type = t;
    }
    if (req.body.priority !== undefined) {
      const validPriorities = ["normal", "high", "urgent"];
      const p = String(req.body.priority).trim().toLowerCase();
      if (validPriorities.includes(p)) updates.priority = p;
    }
    if (req.body.expiry_date !== undefined) {
      if (req.body.expiry_date === null) {
        updates.expiry_date = null;
      } else {
        const parsed = new Date(req.body.expiry_date);
        if (!isNaN(parsed.getTime())) updates.expiry_date = parsed.toISOString();
      }
    }
    if (req.body.target_segment_id !== undefined) {
      updates.target_segment_id = req.body.target_segment_id || null;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ ok: false, error: "Nenhum campo para atualizar." });
    }

    const { data, error } = await supabase
      .from("notices")
      .update(updates)
      .eq("id", req.params.id)
      .eq("school_id", access.context.schoolId)
      .select()
      .single();
    if (error) throw error;

    return res.json({ ok: true, notice: data });
  } catch (error) {
    console.error("Erro PUT /api/notices/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao atualizar comunicado." });
  }
});

app.delete("/api/notices/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...NOTICES_WRITE_ROLES] });
    if (!access.ok) return access.response;

    const { data: existing, error: fetchErr } = await supabase
      .from("notices")
      .select("id")
      .eq("id", req.params.id)
      .eq("school_id", access.context.schoolId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ ok: false, error: "Comunicado nao encontrado na sua instituicao." });

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", req.params.id)
      .eq("school_id", access.context.schoolId);
    if (error) throw error;

    return res.json({ ok: true });
  } catch (error) {
    console.error("Erro DELETE /api/notices/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao excluir comunicado." });
  }
});

// ─── INCIDENTS / PAINEL DE INCIDENTES ─────────────────────────────────────────

app.get("/api/incidents", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...INCIDENTS_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds;

    let query = supabase
      .from("incident_reports")
      .select("*")
      .in("school_id", schoolIds)
      .order("opened_at", { ascending: false });

    const filterStatus = String(req.query.status || "").trim().toUpperCase();
    if (filterStatus && ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].includes(filterStatus)) {
      query = query.eq("status", filterStatus);
    }
    const filterSeverity = String(req.query.severity || "").trim().toUpperCase();
    if (filterSeverity && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(filterSeverity)) {
      query = query.eq("severity", filterSeverity);
    }

    const { data, error } = await query;
    if (error) throw error;

    const schoolMap = {};
    for (const s of scope.managedSchools) { schoolMap[s.id] = s.name; }
    const incidents = (data || []).map(i => ({ ...i, school_name: schoolMap[i.school_id] || "" }));

    return res.json({ ok: true, incidents, scope_mode: scope.scopeMode });
  } catch (error) {
    console.error("Erro GET /api/incidents:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar incidentes." });
  }
});

app.get("/api/incidents/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...INCIDENTS_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("incident_reports")
      .select("*")
      .eq("id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: "Incidente nao encontrado." });

    let quarantine_status = null;
    let responseData = null;
    let originalQuestion = null;
    let evidence = [];

    if (data.response_id) {
      const { data: resp } = await supabase
        .from("assistant_responses")
        .select("id, consultation_id, origin_message_id, assistant_key, response_text, confidence_score, response_mode, fallback_to_human, supporting_source_title, supporting_source_excerpt, supporting_source_version_label, corrected_from_response_id, corrected_at, corrected_by, quarantined_at, quarantined_by, quarantine_reason, delivered_at")
        .eq("id", data.response_id)
        .maybeSingle();
      if (resp) {
        quarantine_status = resp.quarantined_at
          ? { quarantined: true, quarantined_at: resp.quarantined_at, quarantined_by: resp.quarantined_by, reason: resp.quarantine_reason }
          : { quarantined: false };
        responseData = resp;

        // Buscar pergunta original
        const consultationId = resp.consultation_id || data.consultation_id;
        if (consultationId) {
          if (resp.origin_message_id) {
            const { data: originMsg } = await supabase
              .from("consultation_messages")
              .select("message_text")
              .eq("id", resp.origin_message_id)
              .maybeSingle();
            if (originMsg) originalQuestion = originMsg.message_text;
          }
          if (!originalQuestion) {
            const { data: citizenMsgs } = await supabase
              .from("consultation_messages")
              .select("message_text, created_at")
              .eq("consultation_id", consultationId)
              .eq("actor_type", "CITIZEN")
              .order("created_at", { ascending: false })
              .limit(10);
            if (citizenMsgs && citizenMsgs.length) {
              if (resp.delivered_at) {
                const deliveredAt = new Date(resp.delivered_at).getTime();
                const before = citizenMsgs.find(m => new Date(m.created_at).getTime() <= deliveredAt);
                originalQuestion = before ? before.message_text : citizenMsgs[0].message_text;
              } else {
                originalQuestion = citizenMsgs[0].message_text;
              }
            }
          }
        }

        // Buscar evidencias/fontes usadas
        const { data: evData } = await supabase
          .from("interaction_source_evidence")
          .select("source_title, source_excerpt, relevance_score, used_as_primary, evidence_type")
          .eq("response_id", data.response_id)
          .order("relevance_score", { ascending: false });
        if (evData) evidence = evData;
      }
    }

    // L16: Buscar eventos de auditoria vinculados ao incidente
    let auditEvents = [];
    const { data: auditData } = await supabase
      .from("formal_audit_events")
      .select("id, event_type, severity, actor_type, actor_name, summary, created_at")
      .eq("school_id", data.school_id)
      .or(`details->>incident_id.eq.${data.id}${data.response_id ? ',details->>response_id.eq.' + data.response_id : ''}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (auditData) auditEvents = auditData;

    return res.json({ ok: true, incident: { ...data, school_name: (scope.managedSchools.find(s => s.id === data.school_id) || {}).name || "", quarantine_status, original_question: originalQuestion, response: responseData, evidence, audit_events: auditEvents } });
  } catch (error) {
    console.error("Erro GET /api/incidents/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar incidente." });
  }
});

app.put("/api/incidents/:id/status", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...INCIDENTS_MANAGE_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const incidentId = String(req.params.id || "").trim();
    const nextStatus = String(req.body.status || "").trim().toUpperCase();
    const nextSeverity = String(req.body.severity || "").trim().toUpperCase();
    const resolutionNotes = String(req.body.resolution_notes || "").trim();
    const assignedTo = req.body.assigned_to != null ? String(req.body.assigned_to).trim() : null;
    const actorName = String(access.context.memberName || access.context.memberEmail || "Operador").trim();

    if (!incidentId) {
      return res.status(400).json({ ok: false, error: "ID do incidente invalido." });
    }

    const validStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED", "CONFIRMED"];
    if (nextStatus && !validStatuses.includes(nextStatus)) {
      return res.status(400).json({ ok: false, error: "Status invalido. Valores aceitos: " + validStatuses.join(", ") });
    }

    const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (nextSeverity && !validSeverities.includes(nextSeverity)) {
      return res.status(400).json({ ok: false, error: "Severidade invalida. Valores aceitos: " + validSeverities.join(", ") });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("incident_reports")
      .select("id, school_id, status, severity, response_id, consultation_id")
      .eq("id", incidentId)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ ok: false, error: "Incidente nao encontrado na sua instituicao." });

    if (nextStatus && existing.status === nextStatus) {
      return res.status(400).json({ ok: false, error: "O incidente ja esta neste status." });
    }

    if (nextStatus) {
      const allowed = INCIDENT_VALID_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({ ok: false, error: `Transicao de '${existing.status}' para '${nextStatus}' nao permitida. Transicoes validas: ${allowed.join(", ")}.` });
      }
    }

    const updateData = {};
    if (nextStatus) updateData.status = nextStatus;
    if (nextSeverity) updateData.severity = nextSeverity;
    if (resolutionNotes) updateData.resolution_notes = resolutionNotes;
    if (assignedTo !== null) {
      updateData.assigned_to = assignedTo || null;
      updateData.assigned_at = assignedTo ? new Date().toISOString() : null;
    }
    if (nextStatus === "RESOLVED" || nextStatus === "DISMISSED") {
      updateData.resolved_by = actorName;
      updateData.resolved_at = new Date().toISOString();
    }
    if (nextStatus === "CONFIRMED") {
      updateData.confirmed_by = actorName;
      updateData.confirmed_at = new Date().toISOString();
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ ok: false, error: "Nenhuma alteracao informada." });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("incident_reports")
      .update(updateData)
      .eq("id", incidentId)
      .select()
      .single();
    if (updateErr) throw updateErr;

    if (nextStatus) {
      const eventSeverity = (nextStatus === "RESOLVED" || nextStatus === "DISMISSED") ? "HIGH" : "MEDIUM";
      await supabase.from("formal_audit_events").insert({
        school_id: existing.school_id,
        consultation_id: existing.consultation_id || null,
        event_type: "INCIDENT_STATUS_" + nextStatus,
        severity: eventSeverity,
        actor_type: "HUMAN",
        actor_name: actorName,
        summary: `Incidente atualizado de ${existing.status} para ${nextStatus}.`,
        details: { incident_id: incidentId, response_id: existing.response_id, from_status: existing.status, to_status: nextStatus, resolution_notes: resolutionNotes || null, assigned_to: assignedTo || null }
      });

      // L11 — Notificar reportador quando incidente e resolvido/descartado
      if (nextStatus === "RESOLVED" || nextStatus === "DISMISSED") {
        const statusLabel = nextStatus === "RESOLVED" ? "resolvido" : "descartado";
        const notifMessage = `O incidente #${incidentId.slice(0,8)} foi ${statusLabel} por ${actorName}.${resolutionNotes ? ' Notas: ' + resolutionNotes.slice(0, 200) : ''}`;
        const openedByValue = updated.opened_by || null;
        const isUuid = openedByValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(openedByValue);
        await supabase.from("notification_queue").insert({
          school_id: existing.school_id,
          user_id: isUuid ? openedByValue : null,
          topic: "incident_resolved",
          message: notifMessage,
          details: { incident_id: incidentId, status: nextStatus, resolved_by: actorName, opened_by: openedByValue },
          sent: false,
          dispatch_date: new Date().toISOString().slice(0, 10)
        });
      }
    } else if (assignedTo !== null) {
      await supabase.from("formal_audit_events").insert({
        school_id: existing.school_id,
        consultation_id: existing.consultation_id || null,
        event_type: "INCIDENT_ASSIGNED",
        severity: "LOW",
        actor_type: "HUMAN",
        actor_name: actorName,
        summary: assignedTo ? `Incidente atribuido a ${assignedTo}.` : "Atribuicao do incidente removida.",
        details: { incident_id: incidentId, response_id: existing.response_id, assigned_to: assignedTo || null }
      });
    }

    return res.json({ ok: true, incident: updated });
  } catch (error) {
    console.error("Erro PUT /api/incidents/:id/status:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao atualizar incidente." });
  }
});

app.put("/api/incidents/:id/quarantine", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...INCIDENTS_MANAGE_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const actorName = String(access.context.memberName || access.context.memberEmail || access.context.userName || access.context.userId || "Operador").trim();

    const incidentId = String(req.params.id || "").trim();
    const reason = String(req.body.reason || "").trim();
    const undo = req.body.undo === true;

    const { data: inc, error: incErr } = await supabase
      .from("incident_reports")
      .select("id, school_id, response_id, status")
      .eq("id", incidentId)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (incErr) throw incErr;
    if (!inc) return res.status(404).json({ ok: false, error: "Incidente nao encontrado." });
    if (!inc.response_id) return res.status(400).json({ ok: false, error: "Incidente nao possui resposta associada." });

    const { data: resp, error: respErr } = await supabase
      .from("assistant_responses")
      .select("id, quarantined_at")
      .eq("id", inc.response_id)
      .maybeSingle();
    if (respErr) throw respErr;
    if (!resp) return res.status(404).json({ ok: false, error: "Resposta associada nao encontrada." });

    const nowIso = new Date().toISOString();

    if (undo) {
      if (!resp.quarantined_at) return res.status(400).json({ ok: false, error: "A resposta nao esta em quarentena." });
      const { error: updErr } = await supabase
        .from("assistant_responses")
        .update({ quarantined_at: null, quarantined_by: null, quarantine_reason: null })
        .eq("id", resp.id);
      if (updErr) throw updErr;

      await supabase.from("formal_audit_events").insert({
        school_id: inc.school_id,
        consultation_id: null,
        event_type: "RESPONSE_QUARANTINE_LIFTED",
        severity: "MEDIUM",
        actor_type: "Gestao",
        actor_name: actorName,
        summary: "Quarentena removida da resposta da IA.",
        details: { incident_id: inc.id, response_id: resp.id, lifted_at: nowIso }
      });

      return res.json({ ok: true, quarantined: false });
    }

    if (resp.quarantined_at) return res.status(400).json({ ok: false, error: "A resposta ja esta em quarentena." });

    if (!reason) return res.status(400).json({ ok: false, error: "Informe o motivo da quarentena (campo reason)." });

    const { error: updErr } = await supabase
      .from("assistant_responses")
      .update({ quarantined_at: nowIso, quarantined_by: actorName, quarantine_reason: reason || null })
      .eq("id", resp.id);
    if (updErr) throw updErr;

    await supabase.from("formal_audit_events").insert({
      school_id: inc.school_id,
      consultation_id: null,
      event_type: "RESPONSE_QUARANTINED",
      severity: "HIGH",
      actor_type: "Gestao",
      actor_name: actorName,
      summary: "Resposta da IA colocada em quarentena por incidente.",
      details: { incident_id: inc.id, response_id: resp.id, reason: reason || null, quarantined_at: nowIso }
    });

    return res.json({ ok: true, quarantined: true, quarantined_at: nowIso });
  } catch (error) {
    console.error("Erro PUT /api/incidents/:id/quarantine:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao aplicar quarentena." });
  }
});

app.get("/api/incidents/stats/summary", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...INCIDENTS_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("incident_reports")
      .select("status, severity, opened_at, resolved_at")
      .in("school_id", scope.managedSchoolIds);
    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const open = rows.filter(r => r.status === "OPEN").length;
    const inReview = rows.filter(r => r.status === "IN_REVIEW").length;
    const resolved = rows.filter(r => r.status === "RESOLVED").length;
    const dismissed = rows.filter(r => r.status === "DISMISSED").length;
    const critical = rows.filter(r => r.severity === "CRITICAL" && (r.status === "OPEN" || r.status === "IN_REVIEW")).length;
    const high = rows.filter(r => r.severity === "HIGH" && (r.status === "OPEN" || r.status === "IN_REVIEW")).length;

    const resolvedRows = rows.filter(r => r.resolved_at);
    let avgResolutionHours = 0;
    if (resolvedRows.length) {
      const totalHours = resolvedRows.reduce((sum, r) => {
        const diff = new Date(r.resolved_at) - new Date(r.opened_at);
        return sum + diff / 3600000;
      }, 0);
      avgResolutionHours = Number((totalHours / resolvedRows.length).toFixed(1));
    }

    return res.json({
      ok: true,
      stats: { total, open, in_review: inReview, resolved, dismissed, critical_open: critical, high_open: high, avg_resolution_hours: avgResolutionHours }
    });
  } catch (error) {
    console.error("Erro GET /api/incidents/stats/summary:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar estatisticas." });
  }
});

// ─── FEEDBACK DA IA ───────────────────────────────────────────────────────────

app.get("/api/feedback", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const schoolIds = scope.managedSchoolIds;

    let query = supabase
      .from("interaction_feedback")
      .select("id, school_id, consultation_id, response_id, feedback_type, comment, created_by, created_at")
      .in("school_id", schoolIds)
      .order("created_at", { ascending: false })
      .limit(500);

    const filterType = String(req.query.type || "").trim().toLowerCase();
    if (filterType && ["helpful", "not_helpful", "incorrect"].includes(filterType)) {
      query = query.eq("feedback_type", filterType);
    }

    const { data: feedbackRows, error: fbErr } = await query;
    if (fbErr) throw fbErr;

    const responseIds = [...new Set((feedbackRows || []).map(r => r.response_id).filter(Boolean))];

    let responsesMap = {};
    let evidenceMap = {};
    if (responseIds.length) {
      const [respResult, evResult] = await Promise.all([
        supabase
          .from("assistant_responses")
          .select("id, consultation_id, assistant_key, response_text, confidence_score, response_mode, fallback_to_human, supporting_source_title, supporting_source_excerpt, corrected_from_response_id, corrected_at, corrected_by, quarantined_at, quarantined_by, delivered_at")
          .in("id", responseIds),
        supabase
          .from("interaction_source_evidence")
          .select("response_id, source_title, source_excerpt, relevance_score, used_as_primary")
          .in("response_id", responseIds)
      ]);
      if (respResult.error) throw respResult.error;
      for (const r of (respResult.data || [])) { responsesMap[r.id] = r; }
      if (!evResult.error) {
        for (const e of (evResult.data || [])) {
          if (!evidenceMap[e.response_id]) evidenceMap[e.response_id] = [];
          evidenceMap[e.response_id].push(e);
        }
      }
    }

    const schoolMap = {};
    for (const s of scope.managedSchools) { schoolMap[s.id] = s.name; }

    const feedbackIds = (feedbackRows || []).map(r => r.id);
    let correctionsMap = {};
    if (feedbackIds.length) {
      const { data: corrections } = await supabase
        .from("response_corrections")
        .select("id, feedback_id, status, submitted_at")
        .in("feedback_id", feedbackIds)
        .not("status", "eq", "REJECTED")
        .order("submitted_at", { ascending: false });
      for (const c of (corrections || [])) {
        if (!correctionsMap[c.feedback_id]) correctionsMap[c.feedback_id] = c;
      }
    }

    const feedbacks = (feedbackRows || []).map(fb => {
      const resp = responsesMap[fb.response_id] || {};
      return {
        ...fb,
        school_name: schoolMap[fb.school_id] || "",
        response_text: resp.response_text ? (resp.response_text.length > 400 ? resp.response_text.substring(0, 400) + "..." : resp.response_text) : null,
        confidence_score: resp.confidence_score ?? null,
        assistant_key: resp.assistant_key || null,
        response_mode: resp.response_mode || null,
        fallback_to_human: resp.fallback_to_human || false,
        supporting_source_title: resp.supporting_source_title || null,
        corrected_at: resp.corrected_at || null,
        corrected_by: resp.corrected_by || null,
        has_correction: !!resp.corrected_at,
        correction_status: correctionsMap[fb.id]?.status || null,
        correction_id: correctionsMap[fb.id]?.id || null,
        quarantined_at: resp.quarantined_at || null,
        quarantined_by: resp.quarantined_by || null,
        is_quarantined: !!resp.quarantined_at,
        evidence: (evidenceMap[fb.response_id] || []).slice(0, 3)
      };
    });

    return res.json({ ok: true, feedbacks, scope_mode: scope.scopeMode });
  } catch (error) {
    console.error("Erro GET /api/feedback:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar feedbacks." });
  }
});

app.get("/api/feedback/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data: fb, error: fbErr } = await supabase
      .from("interaction_feedback")
      .select("*")
      .eq("id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (fbErr) throw fbErr;
    if (!fb) return res.status(404).json({ ok: false, error: "Feedback nao encontrado." });

    const { data: resp } = await supabase
      .from("assistant_responses")
      .select("id, consultation_id, origin_message_id, assistant_key, response_text, confidence_score, response_mode, fallback_to_human, supporting_source_title, supporting_source_excerpt, supporting_source_version_label, corrected_from_response_id, corrected_at, corrected_by, quarantined_at, quarantined_by, quarantine_reason, delivered_at")
      .eq("id", fb.response_id)
      .maybeSingle();

    const { data: evidence } = await supabase
      .from("interaction_source_evidence")
      .select("source_title, source_excerpt, relevance_score, used_as_primary, evidence_type")
      .eq("response_id", fb.response_id);

    let correction = null;
    const { data: correctionRows } = await supabase
      .from("response_corrections")
      .select("*")
      .eq("feedback_id", req.params.id)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (correctionRows && correctionRows.length) correction = correctionRows[0];

    let originalQuestion = null;
    if (resp && resp.consultation_id) {
      if (resp.origin_message_id) {
        const { data: originMsg } = await supabase
          .from("consultation_messages")
          .select("message_text")
          .eq("id", resp.origin_message_id)
          .maybeSingle();
        if (originMsg) originalQuestion = originMsg.message_text;
      }
      if (!originalQuestion) {
        const { data: citizenMsgs } = await supabase
          .from("consultation_messages")
          .select("message_text, created_at")
          .eq("consultation_id", resp.consultation_id)
          .eq("actor_type", "CITIZEN")
          .order("created_at", { ascending: false })
          .limit(10);
        if (citizenMsgs && citizenMsgs.length) {
          if (resp.delivered_at) {
            const deliveredAt = new Date(resp.delivered_at).getTime();
            const before = citizenMsgs.find(m => new Date(m.created_at).getTime() <= deliveredAt);
            originalQuestion = before ? before.message_text : citizenMsgs[0].message_text;
          } else {
            originalQuestion = citizenMsgs[0].message_text;
          }
        }
      }
    }

    return res.json({
      ok: true,
      feedback: {
        ...fb,
        school_name: (scope.managedSchools.find(s => s.id === fb.school_id) || {}).name || "",
        original_question: originalQuestion,
        response: resp || null,
        evidence: evidence || [],
        correction: correction,
        correction_status: correction?.status || null,
        quarantine_status: resp?.quarantined_at ? "quarantined" : "active",
        quarantined_at: resp?.quarantined_at || null,
        quarantined_by: resp?.quarantined_by || null,
        is_quarantined: !!resp?.quarantined_at
      }
    });
  } catch (error) {
    console.error("Erro GET /api/feedback/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar feedback." });
  }
});

app.put("/api/feedback/:id/correct", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_ACT_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const actorName = access.context.userName || access.context.userId || "unknown";

    const correctionNotes = String(req.body.correction_notes || "").trim();

    const { data: fb, error: fbErr } = await supabase
      .from("interaction_feedback")
      .select("id, school_id, consultation_id, response_id, feedback_type")
      .eq("id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (fbErr) throw fbErr;
    if (!fb) return res.status(404).json({ ok: false, error: "Feedback nao encontrado." });
    if (fb.feedback_type !== "incorrect") {
      return res.status(400).json({ ok: false, error: "Somente feedbacks do tipo 'incorreto' podem ser corrigidos." });
    }

    const { data: resp } = await supabase
      .from("assistant_responses")
      .select("id, corrected_at")
      .eq("id", fb.response_id)
      .maybeSingle();
    if (!resp) return res.status(404).json({ ok: false, error: "Resposta associada nao encontrada." });
    if (resp.corrected_at) return res.status(400).json({ ok: false, error: "Esta resposta ja foi corrigida." });

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("assistant_responses")
      .update({ corrected_at: nowIso, corrected_by: actorName })
      .eq("id", fb.response_id);
    if (updateErr) throw updateErr;

    await supabase.from("formal_audit_events").insert({
      school_id: fb.school_id,
      consultation_id: fb.consultation_id || null,
      event_type: "RESPONSE_CORRECTED",
      severity: "HIGH",
      actor_type: "Gestao",
      actor_name: actorName,
      summary: "Resposta da IA marcada como corrigida apos feedback incorreto.",
      details: {
        feedback_id: fb.id,
        response_id: fb.response_id,
        correction_notes: correctionNotes || null,
        corrected_at: nowIso
      }
    });

    return res.json({ ok: true, corrected_at: nowIso, corrected_by: actorName });
  } catch (error) {
    console.error("Erro PUT /api/feedback/:id/correct:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao registrar correcao." });
  }
});

// ── Structured Correction Lifecycle ─────────────────────────────────
app.post("/api/corrections", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_ACT_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const actorName = access.context.memberName || access.context.memberEmail || access.context.user?.id || "unknown";

    const { feedback_id, correction_type, root_cause, corrected_answer, justification, recommended_action, action_details } = req.body;
    if (!feedback_id || !correction_type || !root_cause || !corrected_answer || !recommended_action) {
      return res.status(400).json({ ok: false, error: "Campos obrigatorios: feedback_id, correction_type, root_cause, corrected_answer, recommended_action." });
    }

    const { data: fb, error: fbErr } = await supabase
      .from("interaction_feedback")
      .select("id, school_id, consultation_id, response_id, feedback_type")
      .eq("id", feedback_id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (fbErr) throw fbErr;
    if (!fb) return res.status(404).json({ ok: false, error: "Feedback nao encontrado." });
    if (fb.feedback_type !== "incorrect") {
      return res.status(400).json({ ok: false, error: "Somente feedbacks do tipo 'incorreto' podem receber correcao." });
    }

    const { data: existing } = await supabase
      .from("response_corrections")
      .select("id, status")
      .eq("feedback_id", feedback_id)
      .not("status", "eq", "REJECTED")
      .limit(1);
    if (existing && existing.length > 0) {
      return res.status(400).json({ ok: false, error: "Ja existe uma correcao ativa para este feedback." });
    }

    const { data: correction, error: insertErr } = await supabase
      .from("response_corrections")
      .insert({
        school_id: fb.school_id,
        feedback_id: fb.id,
        response_id: fb.response_id,
        consultation_id: fb.consultation_id || null,
        status: "SUBMITTED",
        correction_type,
        root_cause,
        corrected_answer: String(corrected_answer).trim(),
        justification: justification ? String(justification).trim() : null,
        recommended_action,
        action_details: action_details ? String(action_details).trim() : null,
        submitted_by: actorName,
        submitted_by_user_id: access.context.user?.id || null
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    await supabase.from("formal_audit_events").insert({
      school_id: fb.school_id,
      consultation_id: fb.consultation_id || null,
      event_type: "CORRECTION_SUBMITTED",
      severity: "HIGH",
      actor_type: "HUMAN",
      actor_name: actorName,
      summary: "Correcao formal submetida para resposta da IA.",
      details: { correction_id: correction.id, feedback_id: fb.id, response_id: fb.response_id, correction_type, root_cause, recommended_action }
    });

    return res.json({ ok: true, correction });
  } catch (error) {
    console.error("Erro POST /api/corrections:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao submeter correcao." });
  }
});

app.put("/api/corrections/:id/transition", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });

    const { action, notes } = req.body;
    const transition = CORRECTION_TRANSITIONS[action];
    if (!transition) return res.status(400).json({ ok: false, error: "Acao invalida. Validas: review, approve, reject, apply." });

    const allowedRoles = [...new Set([...FEEDBACK_ACT_ROLES, ...INCIDENTS_MANAGE_ROLES])];
    const access = await requireRequestContext(req, res, { allowedRoles });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const actorName = access.context.memberName || access.context.memberEmail || access.context.user?.id || "unknown";

    const { data: corr, error: corrErr } = await supabase
      .from("response_corrections")
      .select("*")
      .eq("id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (corrErr) throw corrErr;
    if (!corr) return res.status(404).json({ ok: false, error: "Correcao nao encontrada." });
    if (!transition.from.includes(corr.status)) {
      return res.status(400).json({ ok: false, error: `Transicao '${action}' nao permitida a partir do status '${corr.status}'.` });
    }

    if (action === "review" && corr.submitted_by_user_id && access.context.user?.id === corr.submitted_by_user_id) {
      return res.status(403).json({ ok: false, error: "Voce nao pode revisar uma correcao submetida por voce mesmo." });
    }

    const nowIso = new Date().toISOString();
    const updateFields = { status: transition.to };
    if (action === "review") {
      updateFields.reviewed_by = actorName;
      updateFields.reviewed_at = nowIso;
      updateFields.review_notes = notes ? String(notes).trim() : null;
    } else if (action === "approve") {
      updateFields.approved_by = actorName;
      updateFields.approved_at = nowIso;
      updateFields.approval_notes = notes ? String(notes).trim() : null;
    } else if (action === "reject") {
      updateFields.rejected_by = actorName;
      updateFields.rejected_at = nowIso;
      updateFields.rejection_reason = notes ? String(notes).trim() : null;
    } else if (action === "apply") {
      updateFields.applied_by = actorName;
      updateFields.applied_at = nowIso;
      updateFields.applied_notes = notes ? String(notes).trim() : null;
      updateFields.applied_destination = req.body.destination ? String(req.body.destination).trim() : null;
      if (req.body.affected_source_id) {
        updateFields.affected_source_id = String(req.body.affected_source_id).trim();
      }
    }

    const { error: updateErr } = await supabase
      .from("response_corrections")
      .update(updateFields)
      .eq("id", req.params.id);
    if (updateErr) throw updateErr;

    if (action === "approve") {
      await supabase.from("assistant_responses")
        .update({ corrected_at: nowIso, corrected_by: actorName })
        .eq("id", corr.response_id);
    }

    await supabase.from("formal_audit_events").insert({
      school_id: corr.school_id,
      consultation_id: corr.consultation_id || null,
      event_type: transition.event,
      severity: transition.severity,
      actor_type: "HUMAN",
      actor_name: actorName,
      summary: transition.summary,
      details: { correction_id: corr.id, feedback_id: corr.feedback_id, response_id: corr.response_id, from_status: corr.status, to_status: transition.to, notes: notes || null }
    });

    // G4: If applying with kb_changes, create traceability records
    if (action === "apply" && Array.isArray(req.body.kb_changes) && req.body.kb_changes.length > 0) {
      const validChangeTypes = new Set(["content_updated", "source_created", "source_suspended", "prompt_adjusted", "embedding_refreshed", "faq_updated", "other"]);
      const kbRows = req.body.kb_changes
        .filter(ch => ch.change_description && validChangeTypes.has(ch.change_type))
        .slice(0, 10)
        .map(ch => ({
          correction_id: corr.id,
          school_id: corr.school_id,
          source_document_id: ch.source_document_id || null,
          version_id: ch.version_id || null,
          change_type: ch.change_type,
          change_description: String(ch.change_description).trim().substring(0, 2000),
          before_snapshot: ch.before_snapshot ? String(ch.before_snapshot).trim().substring(0, 5000) : null,
          after_snapshot: ch.after_snapshot ? String(ch.after_snapshot).trim().substring(0, 5000) : null,
          applied_by: actorName,
          applied_by_user_id: access.context.user?.id || null,
          applied_at: nowIso
        }));
      if (kbRows.length) {
        await supabase.from("correction_kb_changes").insert(kbRows);
      }
    }

    return res.json({ ok: true, status: transition.to });
  } catch (error) {
    console.error("Erro PUT /api/corrections/:id/transition:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha na transicao." });
  }
});

// ── G4: KB Changes traceability endpoints ──────────────────────────────
app.get("/api/corrections/:id/kb-changes", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data: changes, error } = await supabase
      .from("correction_kb_changes")
      .select("*")
      .eq("correction_id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .order("applied_at", { ascending: false });
    if (error && !error.message?.includes("schema cache")) throw error;
    if (error) return res.json({ ok: true, kb_changes: [], count: 0 });

    // Enrich with source document title
    const sourceIds = [...new Set((changes || []).map(c => c.source_document_id).filter(Boolean))];
    let sourceMap = {};
    if (sourceIds.length) {
      const { data: docs } = await supabase.from("source_documents").select("id, title").in("id", sourceIds);
      for (const d of (docs || [])) sourceMap[d.id] = d.title;
    }

    const enriched = (changes || []).map(c => ({
      ...c,
      source_title: sourceMap[c.source_document_id] || null
    }));

    return res.json({ ok: true, kb_changes: enriched, count: enriched.length });
  } catch (error) {
    console.error("Erro GET /api/corrections/:id/kb-changes:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao listar mudancas na base." });
  }
});

app.post("/api/corrections/:id/kb-changes", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_ACT_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);
    const actorName = access.context.memberName || access.context.memberEmail || access.context.user?.id || "unknown";

    const { data: corr, error: corrErr } = await supabase
      .from("response_corrections")
      .select("id, school_id, status")
      .eq("id", req.params.id)
      .in("school_id", scope.managedSchoolIds)
      .maybeSingle();
    if (corrErr) throw corrErr;
    if (!corr) return res.status(404).json({ ok: false, error: "Correcao nao encontrada." });
    if (corr.status !== "APPLIED") return res.status(400).json({ ok: false, error: "Mudancas na base so podem ser registradas para correcoes com status APPLIED." });

    const { change_type, change_description, source_document_id, version_id, before_snapshot, after_snapshot } = req.body;
    const validChangeTypes = new Set(["content_updated", "source_created", "source_suspended", "prompt_adjusted", "embedding_refreshed", "faq_updated", "other"]);
    if (!change_type || !validChangeTypes.has(change_type)) return res.status(400).json({ ok: false, error: "change_type invalido." });
    if (!change_description || !String(change_description).trim()) return res.status(400).json({ ok: false, error: "change_description obrigatorio." });

    const row = {
      correction_id: corr.id,
      school_id: corr.school_id,
      source_document_id: source_document_id || null,
      version_id: version_id || null,
      change_type,
      change_description: String(change_description).trim().substring(0, 2000),
      before_snapshot: before_snapshot ? String(before_snapshot).trim().substring(0, 5000) : null,
      after_snapshot: after_snapshot ? String(after_snapshot).trim().substring(0, 5000) : null,
      applied_by: actorName,
      applied_by_user_id: access.context.user?.id || null
    };

    const { data: inserted, error: insertErr } = await supabase.from("correction_kb_changes").insert(row).select().single();
    if (insertErr) throw insertErr;

    return res.json({ ok: true, kb_change: inserted });
  } catch (error) {
    console.error("Erro POST /api/corrections/:id/kb-changes:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao registrar mudanca na base." });
  }
});

// ── G5: Improvement Cycle stats endpoint ──────────────────────────────
app.get("/api/improvement-cycle/stats", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    // 1. Feedbacks
    const { data: feedbacks, error: fbErr } = await supabase
      .from("interaction_feedback")
      .select("id, feedback_type, created_at")
      .in("school_id", scope.managedSchoolIds);
    if (fbErr) throw fbErr;
    const feedbackRows = feedbacks || [];

    // 2. Corrections (all statuses)
    const { data: corrections, error: corrErr } = await supabase
      .from("response_corrections")
      .select("id, feedback_id, status, submitted_at, approved_at, applied_at, correction_type, root_cause")
      .in("school_id", scope.managedSchoolIds);
    if (corrErr) throw corrErr;
    const correctionRows = corrections || [];

    // 3. KB changes (table may not exist yet — migration pending)
    let kbChangeRows = [];
    const { data: kbChanges, error: kbErr } = await supabase
      .from("correction_kb_changes")
      .select("id, correction_id, change_type, applied_at")
      .in("school_id", scope.managedSchoolIds);
    if (kbErr && !kbErr.message?.includes("schema cache")) throw kbErr;
    kbChangeRows = kbChanges || [];

    // Build indexes
    const feedbackIds = new Set(feedbackRows.map(f => f.id));
    const feedbacksWithCorrections = new Set(correctionRows.map(c => c.feedback_id));
    const correctionIdsWithKb = new Set(kbChangeRows.map(k => k.correction_id));

    // Funnel metrics
    const totalFeedbacks = feedbackRows.length;
    const negativeFeedbacks = feedbackRows.filter(f => f.feedback_type === "negative" || f.feedback_type === "incorrect").length;
    const feedbacksLeadingToCorrections = feedbacksWithCorrections.size;
    const totalCorrections = correctionRows.length;
    const appliedCorrections = correctionRows.filter(c => c.status === "APPLIED").length;
    const correctionsWithKbChanges = correctionIdsWithKb.size;
    const totalKbChanges = kbChangeRows.length;

    // SLA metrics (in hours)
    let feedbackToCorrectionHours = [];
    let correctionToAppliedHours = [];
    let appliedToKbHours = [];
    let fullCycleHours = [];

    for (const c of correctionRows) {
      const fb = feedbackRows.find(f => f.id === c.feedback_id);
      if (fb && c.submitted_at) {
        const diff = (new Date(c.submitted_at) - new Date(fb.created_at)) / 3600000;
        if (diff >= 0) feedbackToCorrectionHours.push(diff);
      }
      if (c.submitted_at && c.applied_at) {
        const diff = (new Date(c.applied_at) - new Date(c.submitted_at)) / 3600000;
        if (diff >= 0) correctionToAppliedHours.push(diff);
      }
    }

    for (const kb of kbChangeRows) {
      const c = correctionRows.find(cr => cr.id === kb.correction_id);
      if (c && c.applied_at && kb.applied_at) {
        const diff = (new Date(kb.applied_at) - new Date(c.applied_at)) / 3600000;
        if (diff >= 0) appliedToKbHours.push(diff);
      }
      if (c) {
        const fb = feedbackRows.find(f => f.id === c.feedback_id);
        if (fb && kb.applied_at) {
          const diff = (new Date(kb.applied_at) - new Date(fb.created_at)) / 3600000;
          if (diff >= 0) fullCycleHours.push(diff);
        }
      }
    }

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;

    // Correction type distribution
    const typeDist = {};
    for (const c of correctionRows) {
      typeDist[c.correction_type] = (typeDist[c.correction_type] || 0) + 1;
    }

    // Root cause distribution
    const rootDist = {};
    for (const c of correctionRows) {
      rootDist[c.root_cause] = (rootDist[c.root_cause] || 0) + 1;
    }

    // KB change type distribution
    const kbTypeDist = {};
    for (const k of kbChangeRows) {
      kbTypeDist[k.change_type] = (kbTypeDist[k.change_type] || 0) + 1;
    }

    // Conversion rates
    const feedbackToCorrection = totalFeedbacks > 0 ? Math.round(feedbacksLeadingToCorrections / totalFeedbacks * 1000) / 10 : 0;
    const correctionToApplied = totalCorrections > 0 ? Math.round(appliedCorrections / totalCorrections * 1000) / 10 : 0;
    const appliedToKb = appliedCorrections > 0 ? Math.round(correctionsWithKbChanges / appliedCorrections * 1000) / 10 : 0;
    const fullCycleRate = totalFeedbacks > 0 ? Math.round(correctionsWithKbChanges / totalFeedbacks * 1000) / 10 : 0;

    return res.json({
      ok: true,
      stats: {
        funnel: {
          total_feedbacks: totalFeedbacks,
          negative_feedbacks: negativeFeedbacks,
          feedbacks_with_corrections: feedbacksLeadingToCorrections,
          total_corrections: totalCorrections,
          applied_corrections: appliedCorrections,
          corrections_with_kb_changes: correctionsWithKbChanges,
          total_kb_changes: totalKbChanges
        },
        conversion_rates: {
          feedback_to_correction: feedbackToCorrection,
          correction_to_applied: correctionToApplied,
          applied_to_kb: appliedToKb,
          full_cycle: fullCycleRate
        },
        sla: {
          avg_feedback_to_correction_hours: avg(feedbackToCorrectionHours),
          avg_correction_to_applied_hours: avg(correctionToAppliedHours),
          avg_applied_to_kb_hours: avg(appliedToKbHours),
          avg_full_cycle_hours: avg(fullCycleHours)
        },
        distributions: {
          correction_types: typeDist,
          root_causes: rootDist,
          kb_change_types: kbTypeDist
        }
      }
    });
  } catch (error) {
    console.error("Erro GET /api/improvement-cycle/stats:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar metricas do ciclo de melhoria." });
  }
});

// ── GET /api/network/overview — Consolidated network view per school ──
app.get("/api/network/overview", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...NETWORK_OVERVIEW_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    if (scope.managedSchools.length < 2) {
      return res.json({ ok: true, schools: [], scope_mode: scope.scopeMode, message: "Visao de rede requer mais de uma escola." });
    }

    const schoolIds = scope.managedSchoolIds;

    // Parallel queries for all schools
    const [
      consultationsRes, incidentsRes, feedbackRes, correctionsRes, snapshotsRes
    ] = await Promise.all([
      supabase.from("institutional_consultations").select("id, school_id, status").in("school_id", schoolIds),
      supabase.from("incident_reports").select("id, school_id, status, severity").in("school_id", schoolIds),
      supabase.from("interaction_feedback").select("id, school_id, feedback_type").in("school_id", schoolIds),
      supabase.from("response_corrections").select("id, school_id, status").in("school_id", schoolIds),
      supabase.from("intelligence_snapshots").select("school_id, source_coverage_rate, avg_confidence, consultations_total, consultations_resolved, snapshot_date")
        .in("school_id", schoolIds).order("snapshot_date", { ascending: false })
    ]);

    const consultations = consultationsRes.data || [];
    const incidents = incidentsRes.data || [];
    const feedbacks = feedbackRes.data || [];
    const corrections = correctionsRes.data || [];
    const snapshots = snapshotsRes.data || [];

    // Build per-school metrics
    const schoolMetrics = scope.managedSchools.map(school => {
      const sid = school.id;

      // Consultations
      const schoolConsultations = consultations.filter(c => c.school_id === sid);
      const totalConsultations = schoolConsultations.length;
      const resolvedConsultations = schoolConsultations.filter(c => c.status === "resolved").length;

      // Incidents
      const schoolIncidents = incidents.filter(i => i.school_id === sid);
      const openIncidents = schoolIncidents.filter(i => i.status === "OPEN" || i.status === "IN_REVIEW").length;
      const criticalOpen = schoolIncidents.filter(i => (i.status === "OPEN" || i.status === "IN_REVIEW") && i.severity === "CRITICAL").length;
      const totalIncidents = schoolIncidents.length;

      // Feedback
      const schoolFeedbacks = feedbacks.filter(f => f.school_id === sid);
      const totalFeedback = schoolFeedbacks.length;
      const negativeFeedbacks = schoolFeedbacks.filter(f => f.feedback_type === "not_helpful" || f.feedback_type === "incorrect").length;
      const positiveRate = totalFeedback > 0 ? Math.round((totalFeedback - negativeFeedbacks) / totalFeedback * 1000) / 10 : 0;

      // Corrections
      const schoolCorrections = corrections.filter(c => c.school_id === sid);
      const totalCorrections = schoolCorrections.length;
      const pendingCorrections = schoolCorrections.filter(c => c.status === "SUBMITTED" || c.status === "IN_REVIEW").length;
      const appliedCorrections = schoolCorrections.filter(c => c.status === "APPLIED").length;

      // Latest intelligence snapshot
      const latestSnapshot = snapshots.find(s => s.school_id === sid);
      const coverageRate = latestSnapshot ? parseFloat(latestSnapshot.source_coverage_rate) : null;
      const avgConfidence = latestSnapshot ? parseFloat(latestSnapshot.avg_confidence) : null;

      // Resolution rate
      const resolutionRate = totalConsultations > 0 ? Math.round(resolvedConsultations / totalConsultations * 1000) / 10 : 0;

      // Health score (0-100): weighted composite
      let healthScore = 50; // baseline
      if (coverageRate !== null) healthScore += (coverageRate - 50) * 0.3;
      if (avgConfidence !== null) healthScore += (avgConfidence - 50) * 0.3;
      if (positiveRate > 0) healthScore += (positiveRate - 50) * 0.2;
      if (totalIncidents > 0) healthScore -= (openIncidents / totalIncidents) * 20;
      if (criticalOpen > 0) healthScore -= criticalOpen * 10;
      healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

      return {
        school_id: sid,
        school_name: school.name,
        institution_type: school.institution_type || "school_unit",
        parent_school_id: school.parent_school_id || null,
        metrics: {
          total_consultations: totalConsultations,
          resolved_consultations: resolvedConsultations,
          resolution_rate: resolutionRate,
          total_incidents: totalIncidents,
          open_incidents: openIncidents,
          critical_open: criticalOpen,
          total_feedback: totalFeedback,
          negative_feedbacks: negativeFeedbacks,
          positive_rate: positiveRate,
          total_corrections: totalCorrections,
          pending_corrections: pendingCorrections,
          applied_corrections: appliedCorrections,
          source_coverage_rate: coverageRate,
          avg_confidence: avgConfidence,
          health_score: healthScore
        }
      };
    });

    // Filter only school_unit children (exclude the network entity itself from ranking)
    const schoolUnits = schoolMetrics.filter(s => s.institution_type === "school_unit" || s.parent_school_id);

    // Network-level aggregation
    const networkTotals = {
      total_schools: schoolUnits.length,
      total_consultations: schoolUnits.reduce((s, u) => s + u.metrics.total_consultations, 0),
      total_incidents: schoolUnits.reduce((s, u) => s + u.metrics.total_incidents, 0),
      open_incidents: schoolUnits.reduce((s, u) => s + u.metrics.open_incidents, 0),
      critical_open: schoolUnits.reduce((s, u) => s + u.metrics.critical_open, 0),
      total_feedback: schoolUnits.reduce((s, u) => s + u.metrics.total_feedback, 0),
      negative_feedbacks: schoolUnits.reduce((s, u) => s + u.metrics.negative_feedbacks, 0),
      total_corrections: schoolUnits.reduce((s, u) => s + u.metrics.total_corrections, 0),
      pending_corrections: schoolUnits.reduce((s, u) => s + u.metrics.pending_corrections, 0),
      avg_coverage: schoolUnits.filter(u => u.metrics.source_coverage_rate !== null).length > 0
        ? Math.round(schoolUnits.filter(u => u.metrics.source_coverage_rate !== null).reduce((s, u) => s + u.metrics.source_coverage_rate, 0) / schoolUnits.filter(u => u.metrics.source_coverage_rate !== null).length * 10) / 10
        : null,
      avg_confidence: schoolUnits.filter(u => u.metrics.avg_confidence !== null).length > 0
        ? Math.round(schoolUnits.filter(u => u.metrics.avg_confidence !== null).reduce((s, u) => s + u.metrics.avg_confidence, 0) / schoolUnits.filter(u => u.metrics.avg_confidence !== null).length * 10) / 10
        : null,
      avg_health_score: schoolUnits.length > 0
        ? Math.round(schoolUnits.reduce((s, u) => s + u.metrics.health_score, 0) / schoolUnits.length)
        : null
    };

    return res.json({
      ok: true,
      scope_mode: scope.scopeMode,
      network_totals: networkTotals,
      schools: schoolMetrics.sort((a, b) => a.metrics.health_score - b.metrics.health_score),
      school_count: schoolMetrics.length
    });
  } catch (error) {
    console.error("Erro GET /api/network/overview:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar visao da rede." });
  }
});

// ── GET /api/corrections — List corrections with filters ──────────────
app.get("/api/corrections", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    let query = supabase
      .from("response_corrections")
      .select("id, school_id, feedback_id, response_id, consultation_id, status, correction_type, root_cause, corrected_answer, justification, recommended_action, action_details, submitted_by, submitted_at, submitted_by_user_id, reviewed_by, reviewed_at, review_notes, approved_by, approved_at, approval_notes, applied_by, applied_at, applied_notes, applied_destination, rejected_by, rejected_at, rejection_reason, affected_source_id")
      .in("school_id", scope.managedSchoolIds)
      .order("submitted_at", { ascending: false });

    const statusFilter = String(req.query.status || "").trim().toUpperCase();
    if (statusFilter && ["SUBMITTED", "IN_REVIEW", "APPROVED", "APPLIED", "REJECTED"].includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }
    const typeFilter = String(req.query.correction_type || "").trim().toLowerCase();
    if (typeFilter) {
      query = query.eq("correction_type", typeFilter);
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 200, 1), 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    const corrections = data || [];
    const feedbackIds = [...new Set(corrections.map(c => c.feedback_id).filter(Boolean))];
    let feedbackMap = {};
    if (feedbackIds.length) {
      const { data: fbRows } = await supabase.from("interaction_feedback").select("id, feedback_type, comment, user_name").in("id", feedbackIds);
      for (const fb of (fbRows || [])) feedbackMap[fb.id] = fb;
    }
    const responseIds = [...new Set(corrections.map(c => c.response_id).filter(Boolean))];
    let responseMap = {};
    if (responseIds.length) {
      const { data: respRows } = await supabase.from("assistant_responses").select("id, response_text, corrected_at, corrected_by").in("id", responseIds);
      for (const r of (respRows || [])) responseMap[r.id] = r;
    }
    const schoolIds = [...new Set(corrections.map(c => c.school_id).filter(Boolean))];
    let schoolMap = {};
    if (schoolIds.length) {
      const { data: schRows } = await supabase.from("schools").select("id, name").in("id", schoolIds);
      for (const s of (schRows || [])) schoolMap[s.id] = s.name;
    }

    const enriched = corrections.map(c => ({
      ...c,
      feedback: feedbackMap[c.feedback_id] || null,
      response_text: responseMap[c.response_id]?.response_text || null,
      response_corrected_at: responseMap[c.response_id]?.corrected_at || null,
      school_name: schoolMap[c.school_id] || null,
    }));

    return res.json({ ok: true, corrections: enriched, count: enriched.length });
  } catch (error) {
    console.error("Erro GET /api/corrections:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao listar correcoes." });
  }
});

// ── GET /api/corrections/stats/summary — Correction statistics ────────
app.get("/api/corrections/stats/summary", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("response_corrections")
      .select("status, submitted_at, approved_at, applied_at, rejected_at")
      .in("school_id", scope.managedSchoolIds);
    if (error) throw error;

    const rows = data || [];
    const counts = { submitted: 0, in_review: 0, approved: 0, applied: 0, rejected: 0 };
    for (const r of rows) {
      const k = String(r.status).toLowerCase();
      if (counts[k] !== undefined) counts[k]++;
    }

    let totalResolutionMs = 0;
    let resolvedCount = 0;
    for (const r of rows) {
      if (r.status === "APPLIED" && r.submitted_at && r.applied_at) {
        totalResolutionMs += new Date(r.applied_at).getTime() - new Date(r.submitted_at).getTime();
        resolvedCount++;
      }
    }
    const avgResolutionHours = resolvedCount ? Math.round((totalResolutionMs / resolvedCount) / 3600000 * 10) / 10 : null;
    const pendingReview = counts.submitted + counts.in_review;

    return res.json({
      ok: true,
      stats: { total: rows.length, ...counts, pending_review: pendingReview, avg_resolution_hours: avgResolutionHours }
    });
  } catch (error) {
    console.error("Erro GET /api/corrections/stats/summary:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar estatisticas de correcoes." });
  }
});

app.get("/api/feedback/stats/summary", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    }
    const access = await requireRequestContext(req, res, { allowedRoles: [...FEEDBACK_READ_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("interaction_feedback")
      .select("feedback_type, response_id, created_at")
      .in("school_id", scope.managedSchoolIds);
    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const helpful = rows.filter(r => r.feedback_type === "helpful").length;
    const notHelpful = rows.filter(r => r.feedback_type === "not_helpful").length;
    const incorrect = rows.filter(r => r.feedback_type === "incorrect").length;
    const positiveRate = total ? Math.round((helpful / total) * 100) : 0;

    const incorrectResponseIds = [...new Set(rows.filter(r => r.feedback_type === "incorrect").map(r => r.response_id).filter(Boolean))];
    let pendingCorrection = incorrectResponseIds.length;
    if (incorrectResponseIds.length) {
      const { data: corrected } = await supabase
        .from("assistant_responses")
        .select("id")
        .in("id", incorrectResponseIds)
        .not("corrected_at", "is", null);
      pendingCorrection = incorrectResponseIds.length - (corrected || []).length;
    }

    const { data: corrStatusRows } = await supabase
      .from("response_corrections")
      .select("status")
      .in("school_id", scope.managedSchoolIds)
      .not("status", "eq", "REJECTED");
    const corrCounts = { submitted: 0, in_review: 0, approved: 0, applied: 0 };
    for (const r of (corrStatusRows || [])) {
      const k = String(r.status).toLowerCase();
      if (corrCounts[k] !== undefined) corrCounts[k]++;
    }

    return res.json({
      ok: true,
      stats: { total, helpful, not_helpful: notHelpful, incorrect, positive_rate: positiveRate, pending_correction: pendingCorrection, correction_counts: corrCounts }
    });
  } catch (error) {
    console.error("Erro GET /api/feedback/stats/summary:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar estatisticas de feedback." });
  }
});

// ── Handoff Queue endpoints ──────────────────────────────────────────
app.get("/api/handoff-queue", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...HANDOFF_QUEUE_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const statusFilter = String(req.query.status || "").trim().toUpperCase();
    const validStatuses = ["WAITING_HUMAN", "OPEN", "IN_PROGRESS"];
    const statuses = statusFilter && validStatuses.includes(statusFilter) ? [statusFilter] : ["WAITING_HUMAN"];

    const { data: consultations, error } = await supabase
      .from("institutional_consultations")
      .select("id, school_id, channel, requester_id, requester_name, primary_topic, status, assigned_assistant_key, opened_at, resolved_at, metadata")
      .in("school_id", scope.managedSchoolIds)
      .in("status", statuses)
      .order("opened_at", { ascending: true });
    if (error) throw error;

    const rows = consultations || [];
    const consultationIds = rows.map(c => c.id);
    let responseMap = {};
    if (consultationIds.length) {
      const { data: respRows } = await supabase
        .from("assistant_responses")
        .select("consultation_id, assistant_key, confidence_score, response_mode, fallback_to_human, response_text, created_at")
        .in("consultation_id", consultationIds)
        .order("created_at", { ascending: false });
      for (const r of (respRows || [])) {
        if (!responseMap[r.consultation_id]) responseMap[r.consultation_id] = r;
      }
    }
    const schoolIds = [...new Set(rows.map(c => c.school_id).filter(Boolean))];
    let schoolMap = {};
    if (schoolIds.length) {
      const { data: schRows } = await supabase.from("schools").select("id, name").in("id", schoolIds);
      for (const s of (schRows || [])) schoolMap[s.id] = s.name;
    }

    const now = Date.now();
    const enriched = rows.map(c => {
      const lastResp = responseMap[c.id] || null;
      const waitMs = now - new Date(c.opened_at).getTime();
      return {
        ...c,
        school_name: schoolMap[c.school_id] || null,
        wait_minutes: Math.round(waitMs / 60000),
        last_response: lastResp ? {
          assistant_key: lastResp.assistant_key,
          confidence_score: lastResp.confidence_score,
          response_mode: lastResp.response_mode,
          fallback_to_human: lastResp.fallback_to_human,
          response_text: lastResp.response_text ? lastResp.response_text.substring(0, 200) : null,
          created_at: lastResp.created_at
        } : null
      };
    });

    return res.json({ ok: true, queue: enriched, count: enriched.length });
  } catch (error) {
    console.error("Erro GET /api/handoff-queue:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao listar fila de atendimento humano." });
  }
});

app.get("/api/handoff-queue/stats", async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ ok: false, error: "Supabase nao configurado no servidor." });
    const access = await requireRequestContext(req, res, { allowedRoles: [...HANDOFF_QUEUE_ROLES] });
    if (!access.ok) return access.response;
    const scope = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("institutional_consultations")
      .select("id, status, opened_at, resolved_at")
      .in("school_id", scope.managedSchoolIds)
      .in("status", ["WAITING_HUMAN", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
    if (error) throw error;

    const rows = data || [];
    const now = Date.now();
    const waiting = rows.filter(r => r.status === "WAITING_HUMAN");
    const open = rows.filter(r => r.status === "OPEN");
    const inProgress = rows.filter(r => r.status === "IN_PROGRESS");
    const resolved = rows.filter(r => r.status === "RESOLVED" || r.status === "CLOSED");

    let totalWaitMs = 0;
    for (const w of waiting) {
      totalWaitMs += now - new Date(w.opened_at).getTime();
    }
    const avgWaitMinutes = waiting.length ? Math.round(totalWaitMs / waiting.length / 60000) : null;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayResolved = resolved.filter(r => r.resolved_at && new Date(r.resolved_at) >= todayStart).length;

    return res.json({
      ok: true,
      stats: {
        waiting: waiting.length,
        open: open.length,
        in_progress: inProgress.length,
        resolved_today: todayResolved,
        avg_wait_minutes: avgWaitMinutes,
        total: rows.length
      }
    });
  } catch (error) {
    console.error("Erro GET /api/handoff-queue/stats:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar estatisticas da fila." });
  }
});

// ── Notifications endpoints ──────────────────────────────────────────
app.get("/api/notifications/queue", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: NOTIFICATIONS_ADMIN_ROLES });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);

    let query = supabase
      .from("notification_queue")
      .select("id, school_id, user_id, topic, message, details, sent, created_at, dispatch_date")
      .in("school_id", managedSchoolIds)
      .order("created_at", { ascending: false })
      .limit(200);

    const sent = req.query.sent;
    if (sent === "true") query = query.eq("sent", true);
    else if (sent === "false") query = query.eq("sent", false);

    const { data, error } = await query;
    if (error) throw error;

    const schoolIds = [...new Set((data || []).map(n => n.school_id))];
    let schoolMap = {};
    if (schoolIds.length) {
      const { data: schools } = await supabase.from("schools").select("id, name").in("id", schoolIds);
      (schools || []).forEach(s => { schoolMap[s.id] = s.name; });
    }

    const notifications = (data || []).map(n => ({ ...n, school_name: schoolMap[n.school_id] || null }));
    return res.json({ ok: true, notifications });
  } catch (error) {
    console.error("Erro GET /api/notifications/queue:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar fila de notificacoes." });
  }
});

app.get("/api/notifications/queue/:id", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: NOTIFICATIONS_ADMIN_ROLES });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("id", req.params.id)
      .in("school_id", managedSchoolIds)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: "Notificacao nao encontrada." });

    let deliveries = [];
    const { data: delRows } = await supabase
      .from("notification_queue_deliveries")
      .select("user_id, queue_ref, sent_at")
      .eq("queue_ref", String(data.id))
      .eq("school_id", data.school_id);
    deliveries = delRows || [];

    let schoolName = null;
    const { data: schoolRow } = await supabase.from("schools").select("name").eq("id", data.school_id).maybeSingle();
    schoolName = schoolRow?.name || null;

    return res.json({ ok: true, notification: { ...data, school_name: schoolName }, deliveries });
  } catch (error) {
    console.error("Erro GET /api/notifications/queue/:id:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar detalhe da notificacao." });
  }
});

app.post("/api/notifications/send", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: NOTIFICATIONS_SEND_ROLES });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);

    const { topic, message, school_id } = req.body || {};
    if (!topic || !message) return res.status(400).json({ ok: false, error: "topic e message sao obrigatorios." });

    const targetSchool = school_id || access.context.schoolId;
    if (!managedSchoolIds.includes(targetSchool)) {
      return res.status(403).json({ ok: false, error: "Sem permissao para esta escola." });
    }

    const payload = {
      school_id: targetSchool,
      user_id: access.context.user?.id,
      topic: String(topic).trim(),
      message: String(message).trim(),
      details: { sent_by: access.context.memberEmail, sent_by_role: access.context.effectiveRole, manual: true },
      sent: false,
      dispatch_date: new Date().toISOString().slice(0, 10)
    };

    const { data, error } = await supabase.from("notification_queue").insert(payload).select("id").single();
    if (error) throw error;

    return res.status(201).json({ ok: true, id: data.id });
  } catch (error) {
    console.error("Erro POST /api/notifications/send:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao enfileirar notificacao." });
  }
});

app.get("/api/notifications/settings", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: NOTIFICATIONS_ADMIN_ROLES });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);

    const { data, error } = await supabase
      .from("notification_system_settings")
      .select("school_id, key, value")
      .in("school_id", managedSchoolIds);
    if (error) throw error;

    let schoolMap = {};
    const schoolIds = [...new Set((data || []).map(s => s.school_id))];
    if (schoolIds.length) {
      const { data: schools } = await supabase.from("schools").select("id, name").in("id", schoolIds);
      (schools || []).forEach(s => { schoolMap[s.id] = s.name; });
    }

    const settings = (data || []).map(s => ({ ...s, school_name: schoolMap[s.school_id] || null }));
    return res.json({ ok: true, settings });
  } catch (error) {
    console.error("Erro GET /api/notifications/settings:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar configuracoes de notificacao." });
  }
});

app.get("/api/notifications/stats/summary", async (req, res) => {
  try {
    const access = await requireRequestContext(req, res, { allowedRoles: NOTIFICATIONS_ADMIN_ROLES });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);

    const { data: allRows, error } = await supabase
      .from("notification_queue")
      .select("id, sent, created_at")
      .in("school_id", managedSchoolIds);
    if (error) throw error;

    const rows = allRows || [];
    const total = rows.length;
    const sent = rows.filter(r => r.sent).length;
    const pending = total - sent;

    const today = new Date().toISOString().slice(0, 10);
    const todayCount = rows.filter(r => r.created_at && r.created_at.startsWith(today)).length;

    return res.json({ ok: true, stats: { total, sent, pending, today: todayCount } });
  } catch (error) {
    console.error("Erro GET /api/notifications/stats/summary:", error);
    return res.status(error?.statusCode || 500).json({ ok: false, error: error?.message || "Falha ao carregar estatisticas de notificacoes." });
  }
});

/* ───────── KNOWLEDGE GAPS (Lacunas de Conhecimento) ───────── */

async function loadKnowledgeGapRows(supabase, schoolIds, periodConfig) {
  const fetchOptionalRows = async (queryPromise) => {
    const result = await queryPromise;
    if (result.error) {
      if (isMissingRelationError(result.error)) return [];
      throw result.error;
    }
    return result.data || [];
  };

  const [consultations, responses, audits, messages] = await Promise.all([
    applyRange(
      supabase.from("institutional_consultations").select("id, school_id, status, primary_topic, requester_id, channel, opened_at").in("school_id", schoolIds).order("opened_at", { ascending: false }).limit(2000),
      "opened_at", periodConfig
    ),
    applyRange(
      supabase.from("assistant_responses").select("id, school_id, consultation_id, assistant_key, confidence_score, source_version_id, response_mode, fallback_to_human, supporting_source_title, delivered_at, created_at").in("school_id", schoolIds).order("created_at", { ascending: false }).limit(2000),
      "created_at", periodConfig
    ),
    applyRange(
      supabase.from("formal_audit_events").select("school_id, consultation_id, event_type, details, created_at").in("school_id", schoolIds).order("created_at", { ascending: false }).limit(2000),
      "created_at", periodConfig
    ),
    applyRange(
      supabase.from("consultation_messages").select("school_id, consultation_id, actor_type, created_at").in("school_id", schoolIds).order("created_at", { ascending: true }).limit(4000),
      "created_at", periodConfig
    )
  ]);

  if (consultations.error) throw consultations.error;
  if (responses.error) throw responses.error;
  if (audits.error) throw audits.error;
  if (messages.error) throw messages.error;

  const consultationsRows = consultations.data || [];
  const responsesRows = responses.data || [];
  const auditRows = audits.data || [];
  const messageRows = (messages.data || []).filter((r) => r.actor_type === "CITIZEN");
  const responseIds = [...new Set(responsesRows.map((r) => r.id).filter(Boolean))];

  const [feedbackRows, evidenceRows] = await Promise.all([
    responseIds.length ? fetchOptionalRows(applyRange(supabase.from("interaction_feedback").select("response_id, feedback_type, created_at"), "created_at", periodConfig)) : [],
    responseIds.length ? fetchOptionalRows(applyRange(supabase.from("interaction_source_evidence").select("response_id, source_title, source_version_id, used_as_primary, relevance_score, created_at"), "created_at", periodConfig)) : []
  ]);

  const messagesByConsultation = messageRows.reduce((acc, r) => { acc[r.consultation_id] = acc[r.consultation_id] || []; acc[r.consultation_id].push(r); return acc; }, {});
  const responsesByConsultation = responsesRows.reduce((acc, r) => { acc[r.consultation_id] = acc[r.consultation_id] || []; acc[r.consultation_id].push(r); return acc; }, {});
  const auditsByConsultation = auditRows.reduce((acc, r) => { if (!r.consultation_id) return acc; acc[r.consultation_id] = acc[r.consultation_id] || []; acc[r.consultation_id].push(r); return acc; }, {});
  const feedbackByResponseId = feedbackRows.reduce((acc, r) => { acc[r.response_id] = acc[r.response_id] || []; acc[r.response_id].push(r); return acc; }, {});
  const evidenceByResponseId = evidenceRows.reduce((acc, r) => { acc[r.response_id] = acc[r.response_id] || []; acc[r.response_id].push(r); return acc; }, {});

  const allRows = consultationsRows.map((c) => {
    const cMsgs = (messagesByConsultation[c.id] || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const cResps = (responsesByConsultation[c.id] || []).slice().sort((a, b) => new Date(a.delivered_at || a.created_at) - new Date(b.delivered_at || b.created_at));
    const cAudits = (auditsByConsultation[c.id] || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const firstQ = cMsgs[0] || null;
    const firstR = cResps[0] || null;
    const latestAudit = cAudits[0] || null;
    const details = latestAudit?.details || {};
    const riskLevel = String(details.hallucination_risk_level || "LOW").toUpperCase();
    const reviewStatus = String(details.review_status || (details.review_required ? "PENDING_REVIEW" : "NOT_REQUIRED")).toUpperCase();
    const assistantKey = firstR?.assistant_key || "unassigned";
    const feedbackEntries = firstR?.id ? (feedbackByResponseId[firstR.id] || []) : [];
    const evidenceEntries = firstR?.id ? (evidenceByResponseId[firstR.id] || []) : [];
    const primaryEvidence = evidenceEntries.find((e) => e.used_as_primary) || evidenceEntries[0] || null;

    return {
      consultation_id: c.id,
      asked_at: firstQ?.created_at || c.opened_at || null,
      answered_at: firstR?.delivered_at || firstR?.created_at || null,
      status: c.status || "OPEN",
      topic: c.primary_topic || "Sem classificacao",
      channel: c.channel || "webchat",
      requester_id: c.requester_id || null,
      question_count: cMsgs.length,
      assistant_key: assistantKey,
      assistant_name: getAssistantLabel(assistantKey),
      response_mode: firstR?.response_mode || "NO_RESPONSE",
      confidence_score: firstR?.confidence_score ?? null,
      has_valid_source: Boolean(firstR?.source_version_id),
      fallback_to_human: Boolean(firstR?.fallback_to_human),
      risk_level: riskLevel,
      review_status: reviewStatus,
      abstained: Boolean(details.abstained),
      feedback_incorrect: feedbackEntries.filter((e) => e.feedback_type === "incorrect").length,
      primary_source_title: primaryEvidence?.source_title || firstR?.supporting_source_title || null
    };
  });

  // Filter only rows that represent knowledge gaps
  const gapRows = allRows.filter((r) =>
    r.abstained ||
    !r.has_valid_source ||
    r.risk_level === "HIGH" ||
    r.fallback_to_human ||
    (r.confidence_score !== null && r.confidence_score < 0.5)
  );

  return gapRows.sort((a, b) => new Date(b.asked_at || 0) - new Date(a.asked_at || 0));
}

app.get("/api/knowledge-gaps", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, gaps: [], summary: {} });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...KNOWLEDGE_GAPS_ROLES] });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);
    if (!managedSchoolIds.length) return res.json({ ok: true, gaps: [], summary: {} });

    const periodConfig = getPeriodConfig(req);
    const gapRows = await loadKnowledgeGapRows(supabase, managedSchoolIds, periodConfig);

    // Build per-topic aggregation
    const topicMap = {};
    for (const row of gapRows) {
      const key = row.topic;
      const cur = topicMap[key] || { topic: key, total: 0, abstained: 0, no_source: 0, high_risk: 0, fallback: 0, low_confidence: 0, contested: 0, sample_questions: [] };
      cur.total += 1;
      if (row.abstained) cur.abstained += 1;
      if (!row.has_valid_source) cur.no_source += 1;
      if (row.risk_level === "HIGH") cur.high_risk += 1;
      if (row.fallback_to_human) cur.fallback += 1;
      if (row.confidence_score !== null && row.confidence_score < 0.5) cur.low_confidence += 1;
      if (row.feedback_incorrect > 0) cur.contested += 1;
      if (cur.sample_questions.length < 3) cur.sample_questions.push({ consultation_id: row.consultation_id, asked_at: row.asked_at, assistant_name: row.assistant_name });
      topicMap[key] = cur;
    }
    const byTopic = Object.values(topicMap).sort((a, b) => b.total - a.total);

    const totalGaps = gapRows.length;
    const summary = {
      total_gaps: totalGaps,
      total_abstained: gapRows.filter((r) => r.abstained).length,
      total_no_source: gapRows.filter((r) => !r.has_valid_source).length,
      total_high_risk: gapRows.filter((r) => r.risk_level === "HIGH").length,
      total_fallback: gapRows.filter((r) => r.fallback_to_human).length,
      total_low_confidence: gapRows.filter((r) => r.confidence_score !== null && r.confidence_score < 0.5).length,
      unique_topics: byTopic.length,
      top_gap_topic: byTopic[0]?.topic || "Nenhum"
    };

    return res.json({ ok: true, period: periodConfig.period, period_label: periodConfig.label, gaps: byTopic, detail_rows: gapRows, summary });
  } catch (error) {
    console.error("Erro GET /api/knowledge-gaps:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar lacunas de conhecimento." });
  }
});

app.get("/api/knowledge-gaps/by-assistant", async (req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, assistants: [] });

  try {
    const access = await requireRequestContext(req, res, { allowedRoles: [...KNOWLEDGE_GAPS_ROLES] });
    if (!access.ok) return access.response;
    const { managedSchoolIds } = await resolveManagedSchoolScope(access.context);
    if (!managedSchoolIds.length) return res.json({ ok: true, assistants: [] });

    const periodConfig = getPeriodConfig(req);
    const gapRows = await loadKnowledgeGapRows(supabase, managedSchoolIds, periodConfig);

    const assistantMap = {};
    for (const row of gapRows) {
      const key = row.assistant_key;
      const cur = assistantMap[key] || { assistant_key: key, assistant_name: row.assistant_name, total: 0, abstained: 0, no_source: 0, high_risk: 0, fallback: 0, top_topics: {} };
      cur.total += 1;
      if (row.abstained) cur.abstained += 1;
      if (!row.has_valid_source) cur.no_source += 1;
      if (row.risk_level === "HIGH") cur.high_risk += 1;
      if (row.fallback_to_human) cur.fallback += 1;
      cur.top_topics[row.topic] = (cur.top_topics[row.topic] || 0) + 1;
      assistantMap[key] = cur;
    }

    const assistants = Object.values(assistantMap).map((a) => {
      const topTopics = Object.entries(a.top_topics).sort(([, x], [, y]) => y - x).slice(0, 3).map(([topic, total]) => ({ topic, total }));
      return { assistant_key: a.assistant_key, assistant_name: a.assistant_name, total_gaps: a.total, abstained: a.abstained, no_source: a.no_source, high_risk: a.high_risk, fallback: a.fallback, top_gap_topics: topTopics };
    }).sort((a, b) => b.total_gaps - a.total_gaps);

    return res.json({ ok: true, assistants });
  } catch (error) {
    console.error("Erro GET /api/knowledge-gaps/by-assistant:", error);
    return res.status(500).json({ ok: false, error: "Falha ao carregar lacunas por assistente." });
  }
});

setInterval(() => {
  void processIdleConversations();
}, IDLE_SWEEP_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Servidor institucional online em http://localhost:${PORT}`);
  const missingEnv = getMissingSupabaseServerEnv();
  if (missingEnv.length) {
    console.warn(`[boot] Supabase server-side indisponivel. Variaveis ausentes: ${missingEnv.join(", ")}`);
  }
  void processIdleConversations();
});





















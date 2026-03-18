const { createClient } = require("@supabase/supabase-js");
const { sendMessage } = require("../whatsapp.js");
const { getNotificationSettings } = require("./notification_settings.js");
const { dispatchByChannels } = require("./dispatcher.js");
const { renderParentTemplate, renderTeamRealtimeTemplate } = require("./templates.js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const STAFF_PHONES = [process.env.ADMIN_PHONE_1, process.env.ADMIN_PHONE_2].filter(Boolean);

const PARENT_STATUS_TRIGGER_MAP = {
  VISITOU: "apos_visita",
  COMPARECEU: "apos_visita",
  PRE_MATRICULA: "apos_pre_matricula",
  MATRICULADO: "apos_matriculado"
};

function inferEventStatus(topic = "", leadData = {}) {
  const explicit = String(leadData.status || leadData.visitStatus || "").toUpperCase().trim();
  if (explicit) return explicit;

  const t = String(topic || "").toUpperCase();
  if ((t.includes("NAO") || t.includes("NÃO")) && t.includes("COMPARE")) return "NAO_COMPARECEU";
  if (t.includes("NO_SHOW") || t.includes("NOSHOW")) return "NO_SHOW";
  if (t.includes("CONFIRM")) return "CONFIRMADO";
  if (t.includes("CANCEL")) return "CANCELADO";
  if (t.includes("REAGEND")) return "REAGENDADO";
  if (t.includes("AGEND")) return "AGENDADO";
  if (t.includes("LISTA") && t.includes("ESPERA")) return "LISTA_DE_ESPERA";
  if (t.includes("CONTATO")) return "SOLICITOU_CONTATO";
  if (t.includes("PRE") && t.includes("MATR")) return "PRE_MATRICULA";
  if (t.includes("DESIST")) return "DESISTENCIA";
  if (t.includes("MATRICUL")) return "MATRICULADO";
  if (t.includes("VISITOU")) return "VISITOU";
  return "UNKNOWN";
}

function getDispatchDateUTC() {
  return new Date().toISOString().slice(0, 10);
}

function resolveParentTrigger(trigger, status) {
  if (trigger) return String(trigger).trim();
  const s = String(status || "").toUpperCase().trim();
  return PARENT_STATUS_TRIGGER_MAP[s] || null;
}

function resolveSchoolId(schoolIdInput, leadData = {}) {
  return schoolIdInput || leadData.school_id || leadData.schoolId || process.env.SCHOOL_ID || null;
}

async function getSchoolNameById(schoolId) {
  if (!schoolId) return null;
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .maybeSingle();

    if (error) {
      console.warn("[Notifier Parent] Falha ao buscar schools.name:", error.message);
      return null;
    }

    return data?.name ? String(data.name).trim() : null;
  } catch (e) {
    console.warn("[Notifier Parent] Erro ao buscar nome da escola:", e.message || e);
    return null;
  }
}

async function notifyTeam(topic, message, leadData = {}, schoolId = process.env.SCHOOL_ID, userId = null) {
  console.log(`[Notifier] Processando: ${topic}`);
  const effectiveSchoolId = resolveSchoolId(schoolId, leadData);
  if (!effectiveSchoolId) {
    console.error("[Notifier] school_id ausente; nao foi possivel enfileirar/enviar notificacao.");
    return;
  }

  let config = { master_on: true };
  try {
    config = await getNotificationSettings(effectiveSchoolId, userId);
  } catch (e) {
    console.error("[Notifier] Erro ao ler config:", e);
  }

  if (!config.master_on) {
    console.log("[Notifier] Notificacoes gerais desligadas.");
    return;
  }

  const eventStatus = inferEventStatus(topic, leadData);
  const realtimeAll = config.realtime_all_statuses !== false;
  const realtimeStatuses = Array.isArray(config.realtime_statuses)
    ? config.realtime_statuses.map((s) => String(s || "").toUpperCase())
    : [];
  const realtimeAllowed = realtimeAll || realtimeStatuses.length === 0 || realtimeStatuses.includes(eventStatus);

  if (config.realtime_on) {
    if (realtimeAllowed) {
      await sendRealTimeMessage(topic, message, leadData);
    } else {
      console.log(`[Notifier] Tempo real ignorado para status ${eventStatus}.`);
    }
  }

  if (config.consolidated_on) {
    await saveToQueue(topic, message, leadData, effectiveSchoolId, userId);
  }
}

async function notifyResponsibleByTrigger({
  trigger = null,
  status = null,
  leadData = {},
  schoolId = process.env.SCHOOL_ID
} = {}) {
  const effectiveTrigger = resolveParentTrigger(trigger, status);
  const effectiveSchoolId = resolveSchoolId(schoolId, leadData);
  if (!effectiveTrigger || !effectiveSchoolId) return;

  let config = { parent_notifications: {} };
  try {
    config = await getNotificationSettings(effectiveSchoolId, null);
  } catch (e) {
    console.error("[Notifier Parent] Falha ao carregar config:", e.message || e);
  }

  const parentCfg = config?.parent_notifications?.[effectiveTrigger];
  if (!parentCfg?.enabled) {
    console.log(`[Notifier Parent] Gatilho ${effectiveTrigger} desativado.`);
    return;
  }

  const schoolName = await getSchoolNameById(effectiveSchoolId);
  const enrichedLeadData = {
    ...leadData,
    school_id: effectiveSchoolId,
    school_name: leadData.school_name || leadData.schoolName || schoolName || null
  };

  const tpl = renderParentTemplate(effectiveTrigger, enrichedLeadData, {
    customText: parentCfg?.template_text || "",
    schoolName
  });
  const result = await dispatchByChannels({
    channels: parentCfg.channels || {},
    recipient: {
      phone: enrichedLeadData.phone || enrichedLeadData.wpp_id || null,
      email: enrichedLeadData.email || null
    },
    message: tpl.text,
    subject: tpl.subject,
    strategy: "fallback",
    fallbackOrder: ["email", "sms", "whatsapp"]
  });

  console.log(`[Notifier Parent] Dispatch ${effectiveTrigger}:`, result);
}

async function sendRealTimeMessage(topic, message, leadData) {
  const tpl = renderTeamRealtimeTemplate({ topic, message, leadData });
  for (const phone of STAFF_PHONES) {
    await sendMessage(phone, tpl.text).catch((e) => console.error(e));
  }
}

async function saveToQueue(topic, message, leadData, schoolIdInput, userIdInput = null) {
  const finalSchoolId = resolveSchoolId(schoolIdInput, leadData);
  const finalUserId = leadData.user_id || userIdInput || null;
  const dispatchDate = getDispatchDateUTC();
  const leadPhone = leadData.phone || "N/A";

  if (!finalSchoolId) {
    console.error("[QUEUE ERROR]: school_id ausente no saveToQueue.");
    return;
  }

  try {
    const payload = {
      topic,
      message,
      details: { ...leadData, user_id: finalUserId },
      sent: false,
      school_id: finalSchoolId,
      user_id: finalUserId,
      dispatch_date: dispatchDate
    };

    if (finalUserId) {
      const { data: existing } = await supabase
        .from("notification_queue")
        .select("id")
        .eq("school_id", finalSchoolId)
        .eq("user_id", finalUserId)
        .eq("topic", topic)
        .eq("dispatch_date", dispatchDate)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("notification_queue").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("notification_queue").insert(payload);
      }
      return;
    }

    const { data: existing } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("school_id", finalSchoolId)
      .eq("sent", false)
      .contains("details", { phone: leadPhone })
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("notification_queue").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("notification_queue").insert(payload);
    }
  } catch (err) {
    console.error("[QUEUE ERROR]:", err.message);
  }
}

module.exports = { notifyTeam, notifyResponsibleByTrigger };

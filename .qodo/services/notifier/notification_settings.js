// .qodo/services/notifier/notification_settings.js
const { createClient } = require("@supabase/supabase-js");
const { sendMessage } = require("../whatsapp.js");
const { dispatchByChannels } = require("./dispatcher.js");
const { renderTeamConsolidatedTemplate } = require("./templates.js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getNowHHMM() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo"
  });
}

function normalizeHHMM(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return null;

  // 24h: HH:mm
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  // 12h legado: HH:mm AM/PM
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3];
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
  if (ap === "AM") {
    if (hh === 12) hh = 0;
  } else if (hh < 12) {
    hh += 12;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function shouldSendAtTime(config, time) {
  const target = normalizeHHMM(time);
  const hasActiveTimesArray = Array.isArray(config?.active_times);
  const activeTimes = hasActiveTimesArray
    ? [...new Set(config.active_times.map(normalizeHHMM).filter(Boolean))]
    : [];

  // Regra principal: se active_times existe no config, usa SOMENTE active_times.
  // Isso evita efeito colateral com frequency legado (08/12/18).
  if (hasActiveTimesArray) {
    return activeTimes.includes(target);
  }

  // fallback legado (somente quando não existe active_times)
  const frequencyLegacy = config?.frequency;
  if (frequencyLegacy === 3 && target === "08:00") return true;
  if (frequencyLegacy === 1 && target === "18:00") return true;
  if (frequencyLegacy === 2 && (target === "12:00" || target === "18:00")) return true;

  return false;
}

function inferEventStatus(topic = "", details = {}) {
  const explicit = String(details?.status || details?.visitStatus || "").toUpperCase().trim();
  if (explicit) return explicit;

  const t = String(topic || "").toUpperCase();
  if ((t.includes("NAO") || t.includes("NÃO")) && t.includes("COMPARE")) return "NAO_COMPARECEU";
  if (t.includes("NO_SHOW") || t.includes("NOSHOW")) return "NO_SHOW";
  if (t.includes("CONFIRM")) return "CONFIRMADO";
  if (t.includes("CANCEL")) return "CANCELADO";
  if (t.includes("REAGEND")) return "REAGENDADO";
  if (t.includes("AGEND")) return "AGENDADO";
  if (t.includes("LISTA") && t.includes("ESPERA")) return "LISTA_DE_ESPERA";
  if (t.includes("PRE") && t.includes("MATR")) return "PRE_MATRICULA";
  if (t.includes("DESIST")) return "DESISTENCIA";
  if (t.includes("MATRICUL")) return "MATRICULADO";
  if (t.includes("VISITOU")) return "VISITOU";
  if (t.includes("CONTATO")) return "SOLICITOU_CONTATO";
  return "UNKNOWN";
}

function formatStatusLabel(status) {
  const map = {
    AGENDADO: "Agendamento",
    LISTA_DE_ESPERA: "Lista de espera",
    REAGENDADO: "Reagendado",
    SOLICITOU_CONTATO: "Solicitou contato humano",
    CANCELADO: "Cancelou",
    CONFIRMADO: "Confirmou visita",
    NAO_COMPARECEU: "Nao confirmou / nao compareceu",
    PRE_MATRICULA: "Pre-matricula",
    MATRICULADO: "Matriculado",
    DESISTENCIA: "Desistencia",
    VISITOU: "Visitou",
    NO_SHOW: "Nao confirmou / nao compareceu",
    UNKNOWN: "Outros"
  };
  return map[String(status || "").toUpperCase()] || String(status || "Outros");
}

function getKnownStatusOrder() {
  return [
    "AGENDADO",
    "LISTA_DE_ESPERA",
    "REAGENDADO",
    "SOLICITOU_CONTATO",
    "CANCELADO",
    "CONFIRMADO",
    "NAO_COMPARECEU",
    "PRE_MATRICULA",
    "MATRICULADO",
    "DESISTENCIA",
    "VISITOU"
  ];
}

function normalizePhoneBR(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits;
  return null;
}

async function hasTable(tableName) {
  const { data, error } = await supabase.rpc("sql", {
    query: `select to_regclass('public.${tableName}') as reg`
  }).maybeSingle();

  if (!error && data?.reg) return true;

  // fallback sem rpc sql: tenta consultar a tabela diretamente
  try {
    const { error: qErr } = await supabase.from(tableName).select("*").limit(1);
    return !qErr;
  } catch (_) {
    return false;
  }
}

async function getRolePhoneFallback(schoolId, role, email) {
  const roleToTable = {
    admin: "admins",
    coordinator: "coordinators",
    secretary: "secretaries",
    teacher: "teachers",
    support: "support_staff",
    finance: "finance_staff",
    it: "it_staff"
  };

  const table = roleToTable[String(role || "").toLowerCase()];
  if (!table || !email) return null;

  const { data, error } = await supabase
    .from(table)
    .select("phone")
    .eq("school_id", schoolId)
    .eq("email", String(email).toLowerCase())
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.phone || null;
}

async function getSchoolRecipients(schoolId) {
  let members = [];

  // tenta com coluna phone
  let membersRes = await supabase
    .from("school_members")
    .select("user_id, name, email, role, active, phone")
    .eq("school_id", schoolId)
    .eq("active", true);

  if (membersRes.error && String(membersRes.error.message || "").includes("phone")) {
    // fallback se a coluna ainda não existir
    membersRes = await supabase
      .from("school_members")
      .select("user_id, name, email, role, active")
      .eq("school_id", schoolId)
      .eq("active", true);
  }

  if (membersRes.error) {
    console.error("[PROCESSOR] Erro ao buscar school_members:", membersRes.error.message);
    return [];
  }

  members = membersRes.data || [];
  const recipients = [];

  for (const m of members) {
    let phone = normalizePhoneBR(m.phone || null);

    if (!phone) {
      const fallbackPhone = await getRolePhoneFallback(schoolId, m.role, m.email);
      phone = normalizePhoneBR(fallbackPhone);
    }

    if (!phone) continue;

    recipients.push({
      userId: m.user_id,
      role: m.role,
      name: m.name || m.email || "Equipe",
      phone,
      email: m.email || null
    });
  }

  return recipients;
}

async function getNotificationSettings(schoolId, userId = null) {
  try {
    if (schoolId && userId) {
      const { data, error } = await supabase.rpc("get_effective_notification_setting", {
        p_school_id: schoolId,
        p_user_id: userId,
        p_key: "notifications"
      });

      if (!error && data) return data;
      if (error) {
        console.warn("[SETTINGS] RPC get_effective_notification_setting falhou, usando fallback:", error.message);
      }
    }

    if (!schoolId) {
      return { master_on: true, realtime_on: true, consolidated_on: false, active_times: ["18:00"] };
    }

    const { data, error } = await supabase
      .from("notification_system_settings")
      .select("value")
      .eq("key", "notifications")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (error || !data?.value) {
      return { master_on: true, realtime_on: true, consolidated_on: false, active_times: ["18:00"] };
    }

    return data.value;
  } catch (err) {
    console.error("[SETTINGS] Erro fatal:", err);
    return { master_on: true, realtime_on: true, consolidated_on: false, active_times: ["18:00"] };
  }
}

async function processNotifications(params) {
  const { type, time, schoolId } = params || {};
  const targetTime = time || getNowHHMM();
  console.log(`[PROCESSOR] Check: Tipo=${type}, Hora=${targetTime}, Escola=${schoolId || "ALL"}`);

  if (type !== "consolidated") return;

  try {
    let schools = [];

    if (schoolId) {
      schools = [schoolId];
    } else {
      const { data: schoolRows, error: schoolErr } = await supabase
        .from("notification_system_settings")
        .select("school_id")
        .eq("key", "notifications");

      if (schoolErr) {
        console.error("[PROCESSOR] Erro ao buscar escolas com config:", schoolErr.message);
        return;
      }

      schools = [...new Set((schoolRows || []).map((r) => r.school_id).filter(Boolean))];
    }

    // Blindagem: processa apenas IDs de escola realmente existentes.
    if (schools.length) {
      const { data: validSchoolRows, error: validSchoolErr } = await supabase
        .from("schools")
        .select("id")
        .in("id", schools);

      if (validSchoolErr) {
        console.error("[PROCESSOR] Erro ao validar school_id em schools:", validSchoolErr.message);
        return;
      }

      const validSet = new Set((validSchoolRows || []).map((r) => r.id));
      const invalid = schools.filter((sid) => !validSet.has(sid));
      if (invalid.length) {
        console.warn("[PROCESSOR] Ignorando school_id(s) invalidos em notification_system_settings:", invalid);
      }

      schools = schools.filter((sid) => validSet.has(sid));
      if (!schools.length) {
        console.log("[PROCESSOR] Nenhuma escola valida para processar notificacoes.");
        return;
      }
    }

    const hasDeliveryTableFlag = await hasTable("notification_queue_deliveries");

    for (const sid of schools) {
      const recipients = await getSchoolRecipients(sid);
      if (!recipients.length) {
        console.log(`[PROCESSOR] Escola ${sid} sem destinatários com telefone.`);
        continue;
      }

      const { data: queue, error } = await supabase
        .from("notification_queue")
        .select("*")
        .eq("school_id", sid)
        .eq("sent", false)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(`[PROCESSOR] Erro ao ler fila da escola ${sid}:`, error.message);
        continue;
      }

      const queueRows = queue || [];
      if (!queueRows.length) {
        console.log(`[PROCESSOR] Escola ${sid} sem itens pendentes na notification_queue.`);
      }
      const deliveredFallbackIds = new Set();

      for (const recipient of recipients) {
        const cfg = await getNotificationSettings(sid, recipient.userId);
        if (!cfg.master_on || !cfg.consolidated_on) continue;
        if (!shouldSendAtTime(cfg, targetTime)) continue;

        let pendingRows = queueRows;

        if (hasDeliveryTableFlag) {
          const queueRefs = queueRows.map((q) => String(q.id));
          const { data: deliveredRows, error: deliveredErr } = await supabase
            .from("notification_queue_deliveries")
            .select("queue_ref")
            .eq("school_id", sid)
            .eq("user_id", recipient.userId)
            .in("queue_ref", queueRefs);

          if (!deliveredErr) {
            const deliveredSet = new Set((deliveredRows || []).map((r) => String(r.queue_ref)));
            pendingRows = queueRows.filter((q) => !deliveredSet.has(String(q.id)));
          }
        }

        const consolidatedAll = cfg.consolidated_all_statuses !== false;
        const consolidatedStatuses = Array.isArray(cfg.consolidated_statuses)
          ? cfg.consolidated_statuses.map((s) => String(s || "").toUpperCase())
          : [];
        const allowedStatuses = consolidatedAll || consolidatedStatuses.length === 0
          ? getKnownStatusOrder()
          : consolidatedStatuses;

        const filteredQueue = pendingRows.filter((item) => {
          if (consolidatedAll || consolidatedStatuses.length === 0) return true;
          const status = inferEventStatus(item.topic, item.details || {});
          return consolidatedStatuses.includes(status);
        });

        let saudacao = "Resumo Automatico";
        if (targetTime === "08:00") saudacao = "Bom dia! Relatorio matinal:";
        if (targetTime === "12:00") saudacao = "Boa tarde! Relatorio do almoco:";
        if (targetTime === "18:00") saudacao = "Boa noite! Fechamento do dia:";

        const statusCounts = {};
        allowedStatuses.forEach((s) => { statusCounts[s] = 0; });
        filteredQueue.forEach((item) => {
          const status = inferEventStatus(item.topic, item.details || {});
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        let totalItems = 0;
        const statusLines = [];

        const orderedStatuses = [...getKnownStatusOrder(), "UNKNOWN"];

        orderedStatuses.forEach((statusKey) => {
          if (statusKey === "UNKNOWN" && (statusCounts[statusKey] || 0) <= 0) return;
          if (!allowedStatuses.includes(statusKey) && statusKey !== "UNKNOWN") return;
          const count = statusCounts[statusKey] || 0;
          if (count <= 0) {
            statusLines.push(`- ${formatStatusLabel(statusKey)}: nenhuma atividade registrada no periodo`);
          } else {
            statusLines.push(`- ${formatStatusLabel(statusKey)}: ${count}`);
            totalItems += count;
          }
        });

        // Fallback defensivo para status não mapeados.
        for (const [statusKey, count] of Object.entries(statusCounts)) {
          if (orderedStatuses.includes(statusKey) || count <= 0) continue;
          statusLines.push(`- ${formatStatusLabel(statusKey)}: ${count}`);
          totalItems += count;
        }

        const template = renderTeamConsolidatedTemplate({
          greeting: saudacao,
          lines: statusLines,
          total: totalItems,
          includeNoActivityFooter: totalItems === 0
        });

        const internalChannels = cfg?.internal_consolidated_channels && typeof cfg.internal_consolidated_channels === "object"
          ? cfg.internal_consolidated_channels
          : (cfg?.internal_channels && typeof cfg.internal_channels === "object"
            ? cfg.internal_channels
            : { whatsapp: true, email: false, sms: false });

        const dispatchResult = await dispatchByChannels({
          channels: internalChannels,
          recipient: {
            phone: recipient.phone || null,
            email: recipient.email || null
          },
          message: template.text,
          subject: template.subject,
          strategy: "fallback",
          fallbackOrder: ["email", "sms", "whatsapp"]
        });

        console.log(`[PROCESSOR] Dispatch consolidado para user ${recipient.userId}:`, dispatchResult);
        if (!hasDeliveryTableFlag) {
          filteredQueue.forEach((q) => deliveredFallbackIds.add(q.id));
        }

        if (hasDeliveryTableFlag) {
          const rows = filteredQueue.map((q) => ({
            school_id: sid,
            user_id: recipient.userId,
            queue_ref: String(q.id),
            sent_at: new Date().toISOString()
          }));

          if (rows.length) {
            const { error: insErr } = await supabase
              .from("notification_queue_deliveries")
              .upsert(rows, { onConflict: "school_id,user_id,queue_ref" });
            if (insErr) {
              console.error("[PROCESSOR] Erro ao registrar entregas por usuário:", insErr.message);
            }
          }
        }
      }

      if (!hasDeliveryTableFlag && deliveredFallbackIds.size > 0) {
        const ids = Array.from(deliveredFallbackIds);
        await supabase.from("notification_queue").update({ sent: true }).in("id", ids);
      }
    }
  } catch (e) {
    console.error("[PROCESSOR] Falha geral:", e.message || e);
  }
}

async function sendToAdmins(msg) {
  const admins = [process.env.ADMIN_PHONE_1, process.env.ADMIN_PHONE_2].filter(Boolean);
  for (const phone of admins) {
    await sendMessage(phone, msg).catch((e) => console.error("Erro Zap:", e));
  }
}

module.exports = { getNotificationSettings, processNotifications };

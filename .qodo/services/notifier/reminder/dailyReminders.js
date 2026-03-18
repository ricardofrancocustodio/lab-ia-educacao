// .qodo/services/notifier/reminder/dailyReminders.js
const dayjs = require("dayjs");
const { sendMessage } = require("../../whatsapp.js");
const { setSession } = require("../../../store/sessions.js");
const { upsertLead, supabase } = require("../../supabase.js");
const { standardizePhone } = require("../../../utils/phoneUtils.js");

function buildVisitData(v) {
  return {
    visitId: v.id,
    slotId: v.slot?.id,
    start: v.slot?.start_time,
    visitDate: v.slot?.start_time,
    name: v.lead?.name,
    confirmation_stage: "D1_SENT",
  };
}

function mergeConfirmationMeta(prevMeta = {}, patch = {}) {
  const prevConfirmation = prevMeta.confirmation || {};
  return {
    ...prevMeta,
    confirmation: {
      ...prevConfirmation,
      ...patch,
    },
  };
}

async function findVisitsByWindow(schoolId, startISO, endISO) {
  // 1) Busca visitas candidatas
  const { data: visits, error: visitError } = await supabase
    .from("visits")
    .select("id, status, lead_id, slot_id")
    .eq("school_id", schoolId)
    .in("status", ["AGENDADO", "REAGENDADO"]);

  if (visitError) {
    console.error("[REMINDER] Erro ao buscar visits:", visitError.message || visitError);
    return [];
  }

  if (!visits?.length) return [];

  const slotIds = Array.from(new Set(visits.map((v) => v.slot_id).filter(Boolean)));
  const leadIds = Array.from(new Set(visits.map((v) => v.lead_id).filter(Boolean)));

  if (!slotIds.length || !leadIds.length) return [];

  // 2) Busca slots na janela desejada
  const { data: slots, error: slotError } = await supabase
    .from("visit_slots")
    .select("id, start_time, end_time")
    .eq("school_id", schoolId)
    .in("id", slotIds)
    .gte("start_time", startISO)
    .lte("start_time", endISO)
    .order("start_time", { ascending: true });

  if (slotError) {
    console.error("[REMINDER] Erro ao buscar visit_slots:", slotError.message || slotError);
    return [];
  }

  if (!slots?.length) return [];

  const slotMap = slots.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  // 3) Busca leads para os visits filtrados por slot
  const filteredVisits = visits.filter((v) => slotMap[v.slot_id]);
  if (!filteredVisits.length) return [];

  const filteredLeadIds = Array.from(new Set(filteredVisits.map((v) => v.lead_id).filter(Boolean)));

  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, name, phone, wpp_id, metadata")
    .eq("school_id", schoolId)
    .in("id", filteredLeadIds);

  if (leadError) {
    console.error("[REMINDER] Erro ao buscar leads:", leadError.message || leadError);
    return [];
  }

  const leadMap = (leads || []).reduce((acc, l) => {
    acc[l.id] = l;
    return acc;
  }, {});

  return filteredVisits
    .map((v) => ({
      id: v.id,
      status: v.status,
      lead: leadMap[v.lead_id] || null,
      slot: slotMap[v.slot_id] || null,
    }))
    .filter((v) => v.lead && v.slot);
}

async function sendD1Confirmations(schoolId) {
  const start = dayjs().add(1, "day").startOf("day").toISOString();
  const end = dayjs().add(1, "day").endOf("day").toISOString();

  const visits = await findVisitsByWindow(schoolId, start, end);
  if (!visits.length) return 0;

  const tomorrowKey = dayjs().add(1, "day").format("YYYY-MM-DD");
  let sent = 0;

  for (const v of visits) {
    const leadMeta = v.lead?.metadata || {};
    const confirmation = leadMeta.confirmation || {};
    if (confirmation.d1_sent_for === tomorrowKey) continue;

    const phone = standardizePhone(v.lead?.wpp_id || v.lead?.phone);
    const time = dayjs(v.slot?.start_time).format("HH:mm");
    const dateDisplay = dayjs(v.slot?.start_time).format("DD/MM");

    const message =
      `Olá, ${v.lead?.name || "Visitante"}!\n\n` +
      `Sua visita está marcada para amanhã, dia *${dateDisplay} às ${time}*.\n\n` +
      `Podemos confirmar sua presença?\n\n` +
      `Para confirmar, escreva: *confirmar visita*\n` +
      `Para novas datas, escreva: *reagendar visita*\n` +
      `Para cancelar, escreva: *cancelar visita*`;

    try {
      await sendMessage(phone, message);

      const updatedMeta = mergeConfirmationMeta(
        {
          ...leadMeta,
          visit_data: buildVisitData(v),
          bot_context: "AGUARDANDO_CONFIRMACAO",
        },
        {
          d1_sent_for: tomorrowKey,
          d1_sent_at: new Date().toISOString(),
          confirmed: false,
        }
      );

      await upsertLead({
        school_id: schoolId,
        wpp_id: phone,
        phone,
        metadata: updatedMeta,
      });

      setSession(phone, {
        flow: "confirmation",
        step: 1,
        data: {
          ...buildVisitData(v),
          confirmation_stage: "D1_SENT",
        },
      });

      sent += 1;
    } catch (err) {
      console.error(`[REMINDER D-1] Falha ao enviar para ${phone}:`, err.message);
    }
  }

  return sent;
}

async function sendH1Reconfirmations(schoolId) {
  const start = dayjs().add(55, "minute").toISOString();
  const end = dayjs().add(65, "minute").toISOString();

  const visits = await findVisitsByWindow(schoolId, start, end);
  if (!visits.length) return 0;

  let sent = 0;

  for (const v of visits) {
    const leadMeta = v.lead?.metadata || {};
    const confirmation = leadMeta.confirmation || {};

    if (confirmation.confirmed) continue;
    if (confirmation.h1_sent_for_visit === v.id) continue;

    const phone = standardizePhone(v.lead?.wpp_id || v.lead?.phone);
    const time = dayjs(v.slot?.start_time).format("HH:mm");

    const message =
      `Lembrete rápido: sua visita acontece em *1 hora* (às ${time}).\n\n` +
      `Você confirma presença?\n` +
      `Responda: *confirmar visita*, *reagendar visita* ou *cancelar visita*.`;

    try {
      await sendMessage(phone, message);

      const updatedMeta = mergeConfirmationMeta(
        {
          ...leadMeta,
          visit_data: buildVisitData(v),
          bot_context: "AGUARDANDO_RECONFIRMACAO",
        },
        {
          h1_sent_for_visit: v.id,
          h1_sent_at: new Date().toISOString(),
          h1_retry_sent_at: null,
          confirmed: false,
        }
      );

      await upsertLead({
        school_id: schoolId,
        wpp_id: phone,
        phone,
        metadata: updatedMeta,
      });

      setSession(phone, {
        flow: "confirmation",
        step: 1,
        data: {
          ...buildVisitData(v),
          confirmation_stage: "H1_SENT",
        },
      });

      sent += 1;
    } catch (err) {
      console.error(`[REMINDER H-1] Falha ao enviar para ${phone}:`, err.message);
    }
  }

  return sent;
}

async function sendH1RetryForNoResponse(schoolId) {
  const start = dayjs().add(45, "minute").toISOString();
  const end = dayjs().add(70, "minute").toISOString();

  const visits = await findVisitsByWindow(schoolId, start, end);
  if (!visits.length) return 0;

  let sent = 0;

  for (const v of visits) {
    const leadMeta = v.lead?.metadata || {};
    const confirmation = leadMeta.confirmation || {};

    if (confirmation.confirmed) continue;
    if (!confirmation.h1_sent_at) continue;
    if (confirmation.h1_retry_sent_at) continue;

    const elapsed = dayjs().diff(dayjs(confirmation.h1_sent_at), "minute");
    if (elapsed < 5) continue;

    const phone = standardizePhone(v.lead?.wpp_id || v.lead?.phone);

    const message =
      `Ainda não recebi sua resposta sobre a visita de hoje.\n\n` +
      `Você confirma a presença?\n` +
      `Responda: *confirmar visita*, *reagendar visita* ou *cancelar visita*.`;

    try {
      await sendMessage(phone, message);

      const updatedMeta = mergeConfirmationMeta(
        {
          ...leadMeta,
          visit_data: buildVisitData(v),
          bot_context: "AGUARDANDO_RECONFIRMACAO",
        },
        {
          h1_retry_sent_at: new Date().toISOString(),
          confirmed: false,
        }
      );

      await upsertLead({
        school_id: schoolId,
        wpp_id: phone,
        phone,
        metadata: updatedMeta,
      });

      sent += 1;
    } catch (err) {
      console.error(`[REMINDER RETRY] Falha ao enviar para ${phone}:`, err.message);
    }
  }

  return sent;
}

async function markNoShowWithoutConfirmation(schoolId) {
  const graceMinutes = 15;
  const end = dayjs().subtract(graceMinutes, "minute").toISOString();
  const start = dayjs().subtract(2, "day").toISOString();

  const visits = await findVisitsByWindow(schoolId, start, end);
  if (!visits.length) return 0;

  let updated = 0;

  for (const v of visits) {
    const leadMeta = v.lead?.metadata || {};
    const confirmation = leadMeta.confirmation || {};

    if (confirmation.confirmed) continue;
    if (confirmation.no_show_marked_for_visit === v.id) continue;
    if (!["AGENDADO", "REAGENDADO"].includes(String(v.status || "").toUpperCase())) continue;

    const phone = standardizePhone(v.lead?.wpp_id || v.lead?.phone);

    const updatedMeta = mergeConfirmationMeta(
      {
        ...leadMeta,
        visit_data: buildVisitData(v),
        bot_context: "NO_SHOW_AUTO",
      },
      {
        no_show_marked_for_visit: v.id,
        no_show_marked_at: new Date().toISOString(),
        confirmed: false,
      }
    );

    try {
      await supabase
        .from("visits")
        .update({ status: "NAO_COMPARECEU" })
        .eq("id", v.id)
        .eq("school_id", schoolId)
        .in("status", ["AGENDADO", "REAGENDADO"]);

      await upsertLead({
        school_id: schoolId,
        wpp_id: phone,
        phone,
        name: v.lead?.name || null,
        status: "NAO_COMPARECEU",
        metadata: updatedMeta,
      });

      updated += 1;
    } catch (err) {
      console.error(`[REMINDER NO_SHOW] Falha ao marcar no-show para ${phone}:`, err.message || err);
    }
  }

  return updated;
}

async function sendVisitReminders(options = {}) {
  const schoolId = options.schoolId || process.env.SCHOOL_ID;
  if (!schoolId) {
    console.error("[REMINDER] SCHOOL_ID ausente.");
    return { d1: 0, h1: 0, retry: 0, processed: 0 };
  }

  console.log("[REMINDER] Iniciando ciclo D-1 / H-1 / RETRY");

  const [d1, h1, retry] = await Promise.all([
    sendD1Confirmations(schoolId),
    sendH1Reconfirmations(schoolId),
    sendH1RetryForNoResponse(schoolId),
  ]);
  const noShow = await markNoShowWithoutConfirmation(schoolId);

  return {
    d1,
    h1,
    retry,
    no_show: noShow,
    processed: d1 + h1 + retry + noShow,
  };
}

module.exports = { sendVisitReminders };

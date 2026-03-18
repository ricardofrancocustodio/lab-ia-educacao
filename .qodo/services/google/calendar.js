// 📁 .qodo/services/google/calendar.js
const { google } = require("googleapis");
const dayjs = require("dayjs");

// Configuração de Fuso Horário
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dayjs/locale/pt-br'); 
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('pt-br');

// --- 📅 CONFIGURAÇÃO DE MAPA DE CALENDÁRIOS ---
const CALENDAR_MAP = {
  'desenvolvedor.ricardo@gmail.com': { label: 'Secretaria', type: 'MIXED', segmentId: null },
  'letinalucina@gmail.com': { label: 'Coordenação', type: 'MIXED', segmentId: null },
  'ricardofranco.qa@gmail.com': { label: 'Coordenação', type: 'MIXED', segmentId: null }
};

const SEGMENT_CALENDARS = {
  ambos: Object.keys(CALENDAR_MAP) 
};

// --- 📅 CONFIGURAÇÃO DE BLOQUEIO (FERIADOS) ---
const HOLIDAYS = [
  "2026-01-25", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", 
  "2026-05-01", "2026-06-04", "2026-07-09", "2026-09-07", "2026-10-12", 
  "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25"
];

function isBusinessDay(dateObj) {
  const d = dayjs(dateObj);
  const dateStr = d.format("YYYY-MM-DD");
  const dayOfWeek = d.day(); 
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  if (HOLIDAYS.includes(dateStr)) return false;
  return true;
}

// 🔥 AUTENTICAÇÃO BLINDADA
function calendarClient() {
  try {
    if (!process.env.GOOGLE_CREDENTIALS) {
        throw new Error("❌ Variável GOOGLE_CREDENTIALS vazia!");
    }
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: "v3", auth });
  } catch (error) {
    console.error("🔥 ERRO FATAL DE CREDENCIAIS:", error.message);
    throw error;
  }
}

function parseSegmentTag(summary) {
    const normalize = summary.toUpperCase();
    if (normalize.includes('[EF1]') || normalize.includes('[EF-I]')) return 'ef1';
    if (normalize.includes('[EF2]') || normalize.includes('[EF-II]')) return 'ef2';
    if (normalize.includes('[MED]') || normalize.includes('[EM]')) return 'medio';
    if (normalize.includes('[INF]') || normalize.includes('[INFANTIL]')) return 'infantil';
    return null;
}

function normalizeSegmentParam(input) {
    if (!input) return null;
    const s = input.toLowerCase();
    if (s.includes('ambos')) return 'ambos';
    if (s.includes('infantil')) return 'infantil';
    if (s.includes('fundamental i') || s.includes('ef1') || s.includes('ef-i')) return 'ef1';
    if (s.includes('fundamental ii') || s.includes('ef2') || s.includes('ef-ii')) return 'ef2';
    if (s.includes('médio') || s.includes('medio')) return 'medio';
    return input; 
}

async function listAvailableSlots({ segment, calendarIds, daysAhead = 14 }) {
  const cal = calendarClient(); 
  const timeMin = new Date().toISOString();
  const timeMax = dayjs().add(daysAhead, "day").toISOString();
  const allSlots = [];
  const targetCalendars = calendarIds || Object.keys(CALENDAR_MAP);
  const targetCode = normalizeSegmentParam(segment);

  for (const calendarId of targetCalendars) {
    const meta = CALENDAR_MAP[calendarId];
    if (!meta) continue;

    try {
      const res = await cal.events.list({
        calendarId, timeMin, timeMax, singleEvents: true, orderBy: "startTime",
      });

      const items = res.data.items || [];

      for (const ev of items) {
        const summary = (ev.summary || "").trim();
        const start = ev.start.dateTime || ev.start.date;
        if (!isBusinessDay(start)) continue;

        const typeMatch = summary.match(/\[(DC|DI|DCI)\]/i);
        if (!typeMatch) continue; 
        const slotType = typeMatch[1].toUpperCase();

        let detectedSegment = null;
        if (meta.type === 'FIXED') {
            detectedSegment = meta.segmentId;
        } else if (meta.type === 'MIXED') {
            detectedSegment = parseSegmentTag(summary);
        }

        const aceitaTudo = (targetCode === 'ambos');
        if (!aceitaTudo && detectedSegment !== targetCode) continue;
        if (!detectedSegment) continue; 

        let cleanTitle = summary
            .replace(/\[(DC|DI|DCI)\]/gi, "")
            .replace(/\[(EF1|EF2|INF|MED|EF-I|EF-II)\]/gi, "")
            .trim();

        allSlots.push({
            calendarId, 
            eventId: ev.id,
            title: cleanTitle || "Horário Disponível",
            slotType: slotType,
            start: start,
            end: ev.end.dateTime || ev.end.date,
            segmentId: detectedSegment, 
            coordinatorEmail: ev.organizer?.email || calendarId
        });
      }

    } catch (err) {
      console.error(`Erro no calendário ${calendarId}:`, err.message);
    }
  }

  return allSlots.sort((a, b) => new Date(a.start) - new Date(b.start));
}

async function bookVisit({ targetCalendarId, startISO, endISO, visitor, slotType, eventId }) {
  const cal = calendarClient();
  
  // Mantemos o email do visitante nos metadados, mas a API pode ignorar o envio do convite
  const event = {
    summary: `${visitor.name}`,
    description: `Contato: ${visitor.phone}\nFilhos: ${visitor.children}\nTipo: ${slotType}\nOrigem: WhatsApp`,
    start: { dateTime: startISO, timeZone: "America/Sao_Paulo" },
    end: { dateTime: endISO, timeZone: "America/Sao_Paulo" },
    transparency: "opaque", 
    // Tenta adicionar o participante, mas sem forçar envio de email
   // attendees: [{ email: visitor.email, displayName: visitor.name, optional: true }],
  };

  try {
    if (slotType === 'DI') {
      try { await cal.events.delete({ calendarId: targetCalendarId, eventId: eventId }); } catch (e) {}
    }
    
    // 🔧 CORREÇÃO AQUI: mudamos sendUpdates de "all" para "none"
    // Isso evita o erro de "Delegation of Authority"
    const res = await cal.events.insert({ 
        calendarId: targetCalendarId, 
        requestBody: event, 
        sendUpdates: "none" 
    });
    
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function findUpcomingVisits({ calendarIds, emailOrPhone, daysAhead = 60 }) {
  const cal = calendarClient();
  const timeMin = new Date().toISOString();
  const timeMax = dayjs().add(daysAhead, "day").toISOString();
  
  const results = [];
  const addedEventIds = new Set(); 

  const rawTerm = (emailOrPhone || "").trim();
  const isEmail = rawTerm.includes("@");
  const cleanTerm = isEmail ? rawTerm.toLowerCase() : rawTerm.replace(/\D/g, "");

  if (!cleanTerm) return [];
  const targets = calendarIds || Object.keys(CALENDAR_MAP);

  for (const calendarId of targets) {
    try {
      const res = await cal.events.list({ 
          calendarId, timeMin, timeMax, singleEvents: true, orderBy: "startTime"
      });

      for (const ev of (res.data.items || [])) {
        if (addedEventIds.has(ev.id)) continue;
        const sum = ev.summary || "";
        const desc = ev.description || "";
        const attendeesArray = ev.attendees || []; 
        const attendeesString = attendeesArray.map(a => `${a.email} ${a.displayName}`).join(" ");
        const rawHay = `${sum} ${desc} ${attendeesString}`;
        
        let match = false;
        if (isEmail) match = rawHay.toLowerCase().includes(cleanTerm);
        else match = rawHay.replace(/\D/g, "").includes(cleanTerm);

        if (match) {
          const meta = CALENDAR_MAP ? CALENDAR_MAP[calendarId] : { label: 'Geral' };
          results.push({
            calendarId, eventId: ev.id, summary: sum, description: desc,
            attendees: attendeesArray, start: ev.start.dateTime || ev.start.date,
            end: ev.end.dateTime || ev.end.date, location: ev.location || "",
            segmentLabel: meta ? meta.label : 'Geral'
          });
          addedEventIds.add(ev.id);
        }
      }
    } catch (err) { console.error(`Erro busca ${calendarId}:`, err.message); }
  }
  return results;
}

async function updateVisitTime({ calendarId, eventId, startISO, endISO }) {
  const cal = calendarClient();
  // 🔧 CORREÇÃO AQUI TAMBÉM: sendUpdates: "none"
  const res = await cal.events.patch({
    calendarId, eventId, requestBody: {
      start: { dateTime: startISO, timeZone: "America/Sao_Paulo" },
      end:   { dateTime: endISO,   timeZone: "America/Sao_Paulo" },
    }, sendUpdates: "none",
  });
  return res.data;
}

async function cancelVisit({ calendarId, eventId }) {
  const cal = calendarClient();
  // 🔧 CORREÇÃO AQUI TAMBÉM: sendUpdates: "none"
  await cal.events.delete({ calendarId, eventId, sendUpdates: "none" });
  return true;
}

async function getDailyVisits(dateObj) {
  const cal = calendarClient();
  // Define o intervalo: Começo e Fim do dia solicitado
  const startOfDay = dayjs(dateObj).startOf('day').toISOString();
  const endOfDay = dayjs(dateObj).endOf('day').toISOString();
  
  const allVisits = [];
  const calendars = Object.keys(CALENDAR_MAP);

  for (const calendarId of calendars) {
    try {
      const res = await cal.events.list({
        calendarId,
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: "startTime",
      });

      const items = res.data.items || [];

      for (const ev of items) {
        // Filtra apenas eventos que parecem ser Visitas (pelo título ou descrição)
        const summary = ev.summary || "";
        const description = ev.description || "";
        
        if (!summary.toLowerCase().includes("visita")) continue;

        // 🕵️‍♂️ Extração de Telefone da Descrição
        // Formato esperado: "Contato: 556199999999"
        const phoneMatch = description.match(/Contato:\s*(\+?\d+)/);
        const visitorPhone = phoneMatch ? phoneMatch[1].replace(/\D/g, "") : null;

        if (visitorPhone) {
            allVisits.push({
                calendarId,
                eventId: ev.id,
                summary: summary,
                start: ev.start.dateTime || ev.start.date,
                visitorPhone: visitorPhone,
                visitorName: summary.replace("", "").trim() // Tenta limpar o nome
            });
        }
      }
    } catch (err) {
      console.error(`Erro ao ler agenda ${calendarId}:`, err.message);
    }
  }
  
  return allVisits;
}

module.exports = {
  calendarClient,
  listAvailableSlots,
  bookVisit,
  findUpcomingVisits,
  updateVisitTime,
  cancelVisit,
  getDailyVisits,
  SEGMENT_CALENDARS, 
  CALENDAR_MAP
};
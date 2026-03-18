const path = require("path");
const { createClient } = require('@supabase/supabase-js');
const { listAvailableSlots } = require("../google/calendar.js");

const SCHOOL_ID = process.env.SCHOOL_ID;

// 🔒 Lazy Supabase (Cloud Run safe)
function getSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_KEY não configuradas");
    }

    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
}

/**
 * Sincroniza Google Calendar → Banco
 */
async function syncGoogleToDatabase() {
    console.log("🔄 [SYNC] Iniciando sincronização Google Calendar → DB");

    const supabase = getSupabase();

    try {
        const [coordinators, segments] = await Promise.all([
            fetchCoordinatorsMap(supabase),
            fetchSegmentsMap(supabase)
        ]);

        const googleSlots = await listAvailableSlots({
            segment: 'ambos',
            daysAhead: 30
        });

        if (!googleSlots.length) {
            console.log("⚠️ Nenhum slot encontrado");
            return;
        }

        const slotsToUpsert = googleSlots
            .map(slot => {
                const segmentUUID = resolveSegmentUUID(slot.segmentId, segments);
                const coordinatorUUID = coordinators[slot.coordinatorEmail] || null;

                if (!segmentUUID) return null;

                return {
                    school_id: SCHOOL_ID,
                    calendar_event_id: slot.eventId,
                    start_time: slot.start,
                    end_time: slot.end,
                    slot_type: slot.slotType,
                    segment_id: segmentUUID,
                    coordinator_id: coordinatorUUID
                };
            })
            .filter(Boolean);

        const { error } = await supabase
            .from('visit_slots')
            .upsert(slotsToUpsert, { onConflict: 'calendar_event_id' });

        if (error) throw error;

        console.log(`✅ [SYNC] ${slotsToUpsert.length} slots sincronizados`);
    } catch (err) {
        console.error("❌ [SYNC ERROR]", err);
        throw err;
    }
}

// --- AUXILIARES ---
async function fetchCoordinatorsMap(supabase) {
    const { data } = await supabase
        .from('coordinators')
        .select('id, email')
        .eq('school_id', SCHOOL_ID);

    const map = {};
    if (data) data.forEach(c => map[c.email] = c.id);
    return map;
}

async function fetchSegmentsMap(supabase) {
    const { data } = await supabase
        .from('segments')
        .select('id, name')
        .eq('school_id', SCHOOL_ID);

    return data || [];
}

function resolveSegmentUUID(code, segmentsList) {
    if (!code) return null;
    const c = code.toLowerCase().trim();

    const found = segmentsList.find(s => {
        const n = s.name.toLowerCase();
        if (c === 'ef1' && n.includes('fundamental i')) return true;
        if (c === 'ef2' && n.includes('fundamental ii')) return true;
        if (c === 'infantil' && n.includes('infantil')) return true;
        if (c === 'medio' && n.includes('médio')) return true;
        return false;
    });

    return found?.id || null;
}

module.exports = { syncGoogleToDatabase };

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normalizeRoleKey(role) {
  return String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getIncidentAssignmentDestinationForRole(role) {
  const normalizedRole = normalizeRoleKey(role);
  if (normalizedRole === 'direction') return 'direction_compliance';
  if (normalizedRole === 'content_curator') return 'content_curation';
  if (normalizedRole === 'public_operator' || normalizedRole === 'coordination') return 'service_operation';
  if (normalizedRole === 'secretariat' || normalizedRole === 'network_manager') return 'network_secretariat';
  return '';
}

async function run() {
  const { data: incidents, error: incidentError } = await supabase
    .from('incident_reports')
    .select('id, school_id, assigned_to, assigned_at')
    .not('assigned_to', 'is', null);
  if (incidentError) throw incidentError;

  const schoolIds = [...new Set((incidents || []).map((item) => item.school_id).filter(Boolean))];
  const { data: members, error: memberError } = await supabase
    .from('school_members')
    .select('id, user_id, school_id, role, name, email, active')
    .in('school_id', schoolIds)
    .eq('active', true);
  if (memberError) throw memberError;

  const membersBySchool = new Map();
  for (const member of members || []) {
    if (!membersBySchool.has(member.school_id)) membersBySchool.set(member.school_id, []);
    membersBySchool.get(member.school_id).push(member);
  }

  let notificationsInserted = 0;
  let eventsUpdated = 0;

  for (const incident of incidents || []) {
    const candidates = membersBySchool.get(incident.school_id) || [];
    const lowered = String(incident.assigned_to || '').trim().toLowerCase();
    const match = candidates.find((member) => String(member.name || '').trim().toLowerCase() === lowered || String(member.email || '').trim().toLowerCase() === lowered);
    if (!match?.user_id) continue;

    const { data: existingNotif } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('topic', 'incident_assigned')
      .eq('user_id', match.user_id)
      .contains('details', { incident_id: incident.id })
      .limit(1)
      .maybeSingle();

    if (!existingNotif) {
      const { error: notifError } = await supabase.from('notification_queue').insert({
        school_id: incident.school_id,
        user_id: match.user_id,
        topic: 'incident_assigned',
        message: `O incidente #${incident.id.slice(0, 8)} foi atribuido a voce.`,
        details: {
          incident_id: incident.id,
          assigned_to: match.name || match.email,
          assigned_to_user_id: match.user_id,
          assigned_to_role: normalizeRoleKey(match.role)
        },
        sent: false,
        dispatch_date: new Date().toISOString().slice(0, 10),
        read_at: null
      });
      if (!notifError) notificationsInserted += 1;
    }

    const { data: events } = await supabase
      .from('formal_audit_events')
      .select('id, details')
      .eq('event_type', 'INCIDENT_ASSIGNED')
      .contains('details', { incident_id: incident.id });

    for (const event of events || []) {
      const treatmentDestination = getIncidentAssignmentDestinationForRole(match.role);
      const nextDetails = {
        ...(event.details || {}),
        assigned_to: match.name || match.email,
        assigned_to_user_id: match.user_id,
        assigned_to_role: normalizeRoleKey(match.role),
        treatment_destination: treatmentDestination || null,
        treatment_progress_status: treatmentDestination ? 'OPEN' : null,
        treatment_last_updated_at: incident.assigned_at || new Date().toISOString(),
        treatment_last_updated_by: event.details?.treatment_last_updated_by || 'Sistema',
        review_status: treatmentDestination ? 'PENDING_REVIEW' : 'NOT_REQUIRED'
      };
      const { error: updateError } = await supabase
        .from('formal_audit_events')
        .update({ details: nextDetails })
        .eq('id', event.id);
      if (!updateError) eventsUpdated += 1;
    }
  }

  console.log(`Notifications inserted: ${notificationsInserted}`);
  console.log(`Audit events updated: ${eventsUpdated}`);
}

run().catch((error) => {
  console.error('Falha no backfill de atribuicoes:', error.message || error);
  process.exit(1);
});

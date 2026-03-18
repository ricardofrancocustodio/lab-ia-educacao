const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const settingsPath = path.join(__dirname, '../notification_settings.js');
const { getNotificationSettings } = require(settingsPath);

const STAFF_PHONES = [
  process.env.ADMIN_PHONE_1,
  process.env.ADMIN_PHONE_2
].filter(Boolean);

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_KEY nao configuradas');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function sendDailyDigest() {
  console.log('[DIGEST] Inicio do processo');

  const supabase = getSupabase();
  const config = await getNotificationSettings();

  if (!config.master_on || !config.consolidated_on) {
    console.log('Consolidacao desligada.');
    return 'Desligado';
  }

  const now = new Date();
  let currentHourBR = now.getUTCHours() - 3;
  if (currentHourBR < 0) currentHourBR += 24;

  console.log(`Hora BR: ${currentHourBR}h | Freq: ${config.frequency}`);

  if (config.frequency === 3 && currentHourBR >= 10) return 'Pulado (Manha)';
  if (config.frequency === 1 && currentHourBR < 16) return 'Pulado (Noite)';
  if (config.frequency === 2 && currentHourBR < 10) return 'Pulado (Ignorando manha)';

  const { data: queue, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('sent', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!queue || queue.length === 0) return 'Fila vazia';

  let report = `*RESUMO CONSOLIDADO*\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
  let counts = { agendados: 0, cancelados: 0, outros: 0 };

  queue.forEach((item) => {
    const time = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let icon = '-';

    if (item.topic.includes('AGENDAMENTO')) { icon = '[OK]'; counts.agendados++; }
    else if (item.topic.includes('CANCELADA')) { icon = '[X]'; counts.cancelados++; }
    else counts.outros++;

    const name = item.details?.name || 'Visitante';
    report += `${icon} ${time} - ${name}\n   Status: ${item.topic}\n\n`;
  });

  report += `Totais: agendados=${counts.agendados} | cancelados=${counts.cancelados} | outros=${counts.outros}`;

  if (STAFF_PHONES.length > 0) {
    const whatsappPath = path.join(__dirname, '../../whatsapp.js');
    const { sendMessage } = require(whatsappPath);

    for (const phone of STAFF_PHONES) {
      await sendMessage(phone, report).catch((err) => console.error('Erro WPP:', err.message));
    }
  } else {
    console.log('Nenhum telefone configurado, pulando envio');
  }

  const ids = queue.map((q) => q.id);
  await supabase.from('notification_queue').update({ sent: true }).in('id', ids);

  return 'Relatorio enviado';
}

module.exports = { sendDailyDigest };

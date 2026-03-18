const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Ajuste o caminho se necessário para encontrar seu cliente supabase
const { supabase } = require('../.qodo/services/supabase.js');

// Carrega os dados do JSON que criamos no passo 1
const ACTIVITIES_DATA = require('../.qodo/store/data/activities_data.json');

const SCHOOL_ID = process.env.SCHOOL_ID;

async function syncActivities() {
  console.log('🚀 Iniciando sincronização de ATIVIDADES EXTRACURRICULARES...');

  if (!SCHOOL_ID || !supabase) {
    console.error('❌ Falta configuração (SCHOOL_ID ou supabase) no .env');
    return;
  }

  // --- 1. LIMPEZA DOS DADOS ANTIGOS ---
  // Precisamos deletar primeiro as turmas (classes) e depois as atividades (activities)
  // para não violar as restrições de chave estrangeira (foreign key).
  
  console.log('🗑️ Limpando dados antigos...');

  // Busca os IDs das atividades atuais dessa escola para deletar as turmas associadas
  const { data: existingActivities } = await supabase
    .from('extracurricular_activities')
    .select('id')
    .eq('school_id', SCHOOL_ID);

  const existingIds = existingActivities?.map(a => a.id) || [];

  if (existingIds.length > 0) {
    // Deleta as turmas ligadas a essas atividades
    const { error: delClassErr } = await supabase
      .from('classes')
      .delete()
      .in('activity_id', existingIds);
      
    if (delClassErr) console.error('Erro ao limpar turmas:', delClassErr);

    // Deleta as atividades em si
    const { error: delActErr } = await supabase
      .from('extracurricular_activities')
      .delete()
      .eq('school_id', SCHOOL_ID);
      
    if (delActErr) console.error('Erro ao limpar atividades:', delActErr);
  }

  // --- 2. INSERÇÃO DOS NOVOS DADOS ---
  console.log(`💾 Inserindo novas atividades...`);

  for (const activity of ACTIVITIES_DATA) {
    // 2.1 Insere a Atividade Pai
    const { data: actData, error: actError } = await supabase
      .from('extracurricular_activities')
      .insert({
        school_id: SCHOOL_ID,
        name: activity.activity_name,
        description: activity.description,
        requirements: activity.requirements
      })
      .select()
      .single();

    if (actError) {
      console.error(`❌ Erro ao inserir atividade ${activity.activity_name}:`, actError.message);
      continue;
    }

    const activityId = actData.id;
    console.log(`   ✅ Atividade criada: ${activity.activity_name}`);

    // 2.2 Insere as Turmas (Filhas) vinculadas ao ID da atividade
    if (activity.classes && activity.classes.length > 0) {
      const classesToInsert = activity.classes.map(cls => ({
        activity_id: activityId,
        name: cls.name,
        teacher_name: cls.teacher_name,
        age_min: cls.age_min,
        age_max: cls.age_max,
        schedule: cls.schedule,
        location: cls.location,
        price: cls.price,
        capacity_max: cls.capacity_max,
        students_enrolled: cls.students_enrolled
      }));

      const { error: classError } = await supabase
        .from('classes')
        .insert(classesToInsert);

      if (classError) {
        console.error(`   ❌ Erro ao inserir turmas:`, classError.message);
      } else {
        console.log(`      -> ${classesToInsert.length} turmas inseridas.`);
      }
    }
  }

  console.log('🎉 Sincronização concluída com sucesso!');
}

syncActivities();
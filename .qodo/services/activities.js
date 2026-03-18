// 📁 .qodo/services/activities.js
const path = require("path");

// ❌ REMOVA ESTAS LINHAS QUE CAUSAM O ERRO:
// const { createClient } = require("@supabase/supabase-js");
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ ADICIONE ESTA LINHA (Reutiliza a conexão correta do seu projeto):
const { supabase } = require(path.resolve("./.qodo/services/supabase.js"));

/**
 * Função que a IA vai chamar para consultar vagas e preços.
 * @param {string} activityName - Nome da atividade (ex: "Judô", "Natação")
 */
async function checkActivityAvailability(activityName) {
  console.log(`🔎 IA solicitou verificação para: ${activityName}`);

  try {
    // Busca nas tabelas 'classes' e 'extracurricular_activities'
    const { data, error } = await supabase
      .from('classes')
      .select(`
        name,
        schedule,
        price,
        capacity_max,
        students_enrolled,
        age_min,
        age_max,
        extracurricular_activities!inner ( name, description )
      `)
      .ilike('extracurricular_activities.name', `%${activityName}%`);

    if (error) throw error;

    if (!data || data.length === 0) {
      return JSON.stringify({ 
        info: `Não encontrei turmas abertas para '${activityName}' no momento. Peça para o usuário confirmar o nome da atividade.` 
      });
    }

    // Formata a resposta
    const result = data.map(turma => {
      const vagas = turma.capacity_max - turma.students_enrolled;
      const statusVaga = vagas > 0 ? `Temos ${vagas} vagas disponíveis.` : "Turma LOTADA (Lista de espera).";
      
      return {
        atividade: turma.extracurricular_activities.name,
        turma: turma.name,
        horario: turma.schedule,
        idade: `${turma.age_min} a ${turma.age_max} anos`,
        preco: `R$ ${turma.price}`,
        status: statusVaga
      };
    });

    return JSON.stringify(result);

  } catch (err) {
    console.error("Erro no Supabase:", err);
    return JSON.stringify({ error: "Erro interno ao consultar o banco de dados." });
  }
}

module.exports = { checkActivityAvailability };
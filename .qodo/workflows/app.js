const { supabase } = require("../services/supabase");

// Adicionar ao services/supabase.js
_supabase = supabase;

async function getSegments(schoolId) {
  // Exemplo de chamada ao Supabase
  const { data, error } = await _supabase
    .from('segments')
    .select('id, school_id, name, description, age_min, age_max, stage_category, display_order, active, parent_segment_id')
    .eq('school_id', schoolId);
    
  if (error) {
      console.error('Erro ao buscar segmentos:', error);
      return [];
  }
  return data;
}

module.exports = { getSegments }; // Exportar a nova função

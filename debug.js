// debug-db.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const schoolId = process.env.SCHOOL_ID;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostico() {
    console.log("🔍 --- INÍCIO DO DIAGNÓSTICO ---");
    
    // 1. Verificar Variáveis
    console.log(`📡 URL: ${supabaseUrl ? "OK" : "VAZIO"}`);
    console.log(`🔑 Key: ${supabaseKey ? "OK (Service Role)" : "VAZIO"}`);
    
    // Imprime com colchetes para vermos se tem espaços escondidos
    console.log(`🏫 School ID lido: [${schoolId}]`); 

    // 2. Teste de Conexão Geral (Sem filtro)
    console.log("\n🧪 Teste 1: Buscar TODOS os segmentos (Sem filtro de escola)...");
    const { data: allSegments, error: err1 } = await supabase
        .from('segments')
        .select('id, name, school_id')
        .limit(3);

    if (err1) {
        console.error("❌ ERRO DE CONEXÃO/PERMISSÃO:", err1.message);
        return;
    }
    console.log(`✅ Conexão OK! Encontrei ${allSegments.length} segmentos no total.`);
    if (allSegments.length > 0) {
        console.log(`   Exemplo de ID no banco: [${allSegments[0].school_id}]`);
    }

    // 3. Teste com o Teu Filtro
    console.log("\n🧪 Teste 2: Buscar segmentos DA TUA ESCOLA...");
    const { data: mySegments, error: err2 } = await supabase
        .from('segments')
        .select('id, name')
        .eq('school_id', schoolId ? schoolId.trim() : schoolId); // Tenta limpar espaços

    if (err2) {
        console.error("❌ Erro na busca filtrada:", err2.message);
    } else {
        console.log(`📊 Resultado: Encontrei ${mySegments.length} segmentos para o teu ID.`);
        if (mySegments.length === 0) {
            console.log("⚠️ ALERTA: O ID do .env não bate com o ID salvo no banco.");
            console.log("   Dica: Compare o 'School ID lido' com o 'Exemplo de ID no banco' acima.");
        } else {
            console.log("✅ SUCESSO! O filtro funcionou. O problema era apenas cache ou espaços.");
            console.log("   Segmentos encontrados:", mySegments.map(s => s.name).join(", "));
        }
    }
    console.log("\n🏁 --- FIM DO DIAGNÓSTICO ---");
}

diagnostico();

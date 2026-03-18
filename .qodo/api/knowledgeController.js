// 📁 .qodo/api/knowledgeController.js
const path = require('path');

// ✅ CORREÇÃO CRÍTICA:
// Em vez de tentar criar um novo cliente (que estava falhando por falta de chave),
// importamos o cliente centralizado que já lê as variáveis corretas (SUPABASE_URL e KEY).
const { supabase } = require(path.resolve('./.qodo/services/supabase.js'));

// 1. Buscar Perguntas (GET)
async function getQuestions(req, res) {
    try {
        const { schoolId } = req.query;

        if (!schoolId) {
            return res.status(400).json({ error: 'School ID é obrigatório.' });
        }

        const { data, error } = await supabase
            .from('knowledge_base')
            .select('*')
            .eq('school_id', schoolId)
            .order('id', { ascending: true });

        if (error) throw error;

        return res.json(data);
    } catch (err) {
        console.error('Erro ao buscar FAQ:', err);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
}

// 2. Atualizar Resposta (PUT)
async function updateAnswer(req, res) {
    try {
        const { id } = req.params;
        const { answer, schoolId } = req.body;

        if (!answer) return res.status(400).json({ error: 'Resposta vazia.' });
        if (!schoolId) return res.status(400).json({ error: 'School ID obrigatório para segurança.' });

        const { error } = await supabase
            .from('knowledge_base')
            .update({ answer: answer })
            .eq('id', id)
            .eq('school_id', schoolId); // Garante que só edita se a escola for a dona

        if (error) throw error;

        return res.json({ success: true, message: 'Atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar FAQ:', err);
        return res.status(500).json({ error: 'Erro interno ao salvar.' });
    }
}

module.exports = { getQuestions, updateAnswer };
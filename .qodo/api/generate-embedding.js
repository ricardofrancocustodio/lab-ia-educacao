// 📁 routes/api.js ou similar
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Configurar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

router.post('/generate-embedding', async (req, res) => {
    try {
        const { text, school_id } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Texto é obrigatório' });
        }

        // 1. Gerar Embedding
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text
        });

        const embedding = embeddingResponse.data[0].embedding;

        // 2. Gerar Keywords
        const keywordsResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente que extrai palavras-chave de textos. Retorne APENAS uma lista de 3-5 palavras-chave em português do Brasil em formato JSON array. Exemplo: ['palavra1', 'palavra2', 'palavra3']"
                },
                {
                    role: "user",
                    content: `Extraia palavras-chave importantes deste texto (máximo 5): "${text.substring(0, 1000)}"`
                }
            ],
            temperature: 0.3,
            max_tokens: 100
        });

        const keywordsText = keywordsResponse.choices[0]?.message?.content || "[]";
        
        let keywords = [];
        try {
            keywords = JSON.parse(keywordsText);
            // Garantir que seja um array de strings
            keywords = keywords.map(k => k.toString().trim()).filter(k => k.length > 0);
        } catch {
            // Fallback se não for JSON válido
            keywords = extrairKeywordsSimples(text);
        }

        res.json({
            embedding: embedding,
            keywords: keywords.slice(0, 5) // Limitar a 5 keywords
        });

    } catch (error) {
        console.error('Erro no endpoint de embedding:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar embedding', 
            details: error.message 
        });
    }
});

// Função de fallback para extrair keywords
function extrairKeywordsSimples(texto) {
    if (!texto) return [];
    
    const stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'como', 'que', 'é', 'são'];
    
    const palavras = texto.toLowerCase()
        .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
        .split(/\s+/)
        .filter(palavra => palavra.length > 3 && !stopwords.includes(palavra));
    
    const frequencia = {};
    palavras.forEach(palavra => {
        frequencia[palavra] = (frequencia[palavra] || 0) + 1;
    });
    
    return Object.entries(frequencia)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
}

module.exports = router;
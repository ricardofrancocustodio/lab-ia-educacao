const express = require('express');
const router = express.Router();

function extrairKeywordsSimples(texto) {
    if (!texto) return [];

    const stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'como', 'que', 'se', 'na', 'no', 'nas', 'nos', 'uma', 'um', 'as', 'os'];

    const palavras = String(texto)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9s]/g, ' ')
        .split(/s+/)
        .filter((palavra) => palavra.length >= 4 && !stopwords.includes(palavra));

    return [...new Set(palavras)].slice(0, 8);
}

router.post('/generate-embedding', async (req, res) => {
    try {
        const { text } = req.body || {};

        if (!text) {
            return res.status(400).json({ error: 'Texto e obrigatorio' });
        }

        return res.json({
            embedding: null,
            keywords: extrairKeywordsSimples(text),
            mode: 'keyword_only'
        });
    } catch (error) {
        console.error('Erro no endpoint de indexacao textual:', error);
        return res.status(500).json({ error: 'Erro ao gerar palavras-chave', details: error.message });
    }
});

module.exports = router;

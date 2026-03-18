// 📁 .qodo/utils/humanizer.js
const { sendMessage, sendTypingState } = require("../services/whatsapp.js"); // Você precisará criar o sendTypingState

// Função de Pausa (Sleep)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Envia mensagem simulando comportamento humano.
 * 1. Mostra "Digitando..."
 * 2. Quebra textos longos em balões menores.
 * 3. Espera o tempo de leitura entre eles.
 */
async function sendHumanMessage(to, fullText) {
    if (!fullText) return;

    // 1. Quebra o texto inteligentemente
    // Separa por quebra de linha dupla (\n\n) ou ponto final seguido de espaço.
    // O regex abaixo tenta não quebrar números (ex: 1.000) ou abreviações.
    let parts = fullText.split(/(?:\n\n)/g); 
    
    // Se ainda tiver partes muito grandes (> 160 chars), tenta quebrar por ponto
    parts = parts.flatMap(p => {
        if (p.length > 160) return p.split(/(?<=[.?!])\s+/);
        return p;
    });

    parts = parts.filter(p => p && p.trim().length > 0);

    for (const part of parts) {
        const cleanPart = part.trim();

        // 2. Calcula tempo de digitação (Human Speed)
        // Média humana: 50ms a 80ms por caractere. Vamos usar 40ms para ser ágil mas natural.
        // Mínimo de 1.5s e Máximo de 4s para não irritar.
        const typingDuration = Math.min(Math.max(cleanPart.length * 40, 1500), 4000);

        // 3. Envia o status "Digitando..." (Se sua API suportar)
        // Se não tiver a função ainda, ele ignora o erro e só faz o delay.
        try { if (sendTypingState) await sendTypingState(to); } catch (e) {}

        // 4. Espera o tempo simulação
        await sleep(typingDuration);

        // 5. Envia o balão
        await sendMessage(to, cleanPart);
    }
}

module.exports = { sendHumanMessage };
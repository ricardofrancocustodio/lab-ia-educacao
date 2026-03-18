// 📁 .qodo/workflows/visiting/humanSupport.js
const path = require("path");
const { getSession, setSession, clearSession } = require("../../store/sessions.js");
const { notifyTeam } = require("../../services/notifier/notifier.js");
const { standardizePhone } = require("../../utils/phoneUtils.js");

async function handleHumanSupportStep(from, text) {
    const state = getSession(from) || { step: 0, data: {}, flow: "human_support" };
    const textLower = text.toLowerCase().trim();
    let reply = "";

    // STEP 0: Solicitação Inicial
    if (state.step === 0) {
        reply = "Com certeza! 😊 Entendo que você prefere falar com um de nossos atendentes.\n\nVocê confirma o pedido de suporte humano? (Responda **Sim** ou **Não**)";
        state.step = 1;
        setSession(from, state);
        return reply;
    }

    // STEP 1: Confirmação e Disparo de Alerta
    if (state.step === 1) {
        if (["sim", "s", "quero", "pode", "confirmar"].some(w => textLower.includes(w))) {
            const phone = standardizePhone(from);
            
            // 🚨 DISPARA O ALERTA PARA O TIME (Notifier)
            await notifyTeam(
                "🆘 ATENDIMENTO HUMANO", 
                `O usuário solicitou falar com a secretaria. Por favor, assuma o chat.`,
                { 
                    name: state.data.name || "Interessado", 
                    phone: phone,
                    last_msg: text
                }
            );

            reply = "Solicitação enviada! 🚀 Um de nossos atendentes entrará em contacto com você neste número o mais breve possível.\n\nPosso ajudar com mais alguma informação automática enquanto aguarda?";
            
            // Finaliza o fluxo mas mantém a sessão para a IA poder responder dúvidas gerais se ele continuar falando
            state.flow = null;
            state.step = 0;
            setSession(from, state);
        } else {
            reply = "Tudo bem! Continuarei por aqui para te ajudar com suas dúvidas. O que deseja saber?";
            clearSession(from);
        }
        return reply;
    }

    return "Desculpe, não entendi. Deseja falar com um atendente humano?";
}

module.exports = { handleHumanSupportStep };
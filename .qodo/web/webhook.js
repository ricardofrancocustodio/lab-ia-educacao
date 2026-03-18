// 📁 .qodo/web/webhook.js
const express = require("express");
const router = express.Router();
const path = require("path");
const { validateWebhook, processMessage } = require("../services/whatsapp");
const { routeMessage } = require(path.resolve(__dirname, '../middleware/router.js'));

// --- 🧠 BUFFER DE MEMÓRIA ---
const messageBuffer = new Map(); 

// --- 🛡️ DEDUPLICAÇÃO (Proteção contra Retry) ---
// Armazena IDs de mensagens já processadas para evitar loops
const processedIds = new Set();

// Limpa IDs antigos a cada 10 minutos para não estourar a memória
setInterval(() => {
    processedIds.clear();
    console.log("🧹 [LIMPEZA] Cache de mensagens processadas limpo.");
}, 10 * 60 * 1000);


// 🔥 AJUSTE DE TEMPO: Reduzido de 7000 para 2000ms
// 2 segundos é suficiente para juntar frases picadas, e evita o timeout do WhatsApp.
const BUFFER_DELAY = 2000; 

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN;

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook validado com sucesso!");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// ✅ [POST] Receber mensagens
router.post("/", async (req, res) => {
  try {
    // 1. Extração rápida para checar duplicação antes de processar
    // (A estrutura depende do payload do Meta, mas geralmente é essa)
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses;
    const message = value?.messages?.[0];

    // Eventos de status de entrega (sent/delivered/read/failed).
    // Apenas log para diagnostico; nao segue para o fluxo de IA.
    if (Array.isArray(statuses) && statuses.length > 0) {
      for (const s of statuses) {
        const err = Array.isArray(s?.errors) ? s.errors[0] : null;
        console.log(
          `[WA STATUS] id=${s?.id || "n/a"} status=${s?.status || "unknown"} to=${s?.recipient_id || "n/a"} code=${err?.code || "-"} title=${err?.title || "-"} detail=${err?.details || "-"}`
        );
      }
      return res.sendStatus(200);
    }

    if (message) {
        const msgId = message.id;
        
        // 🛑 TRAVA DE DUPLICAÇÃO
        if (processedIds.has(msgId)) {
            console.log(`🚫 [DUPLICATA] Ignorando mensagem já processada: ${msgId}`);
            return res.sendStatus(200); // Responde OK rápido para o WhatsApp parar de mandar
        }
        
        // Marca como vista
        processedIds.add(msgId);
    }

    // 2. Processamento Normal
    const messageData = await processMessage(req.body);
    
    if (!messageData || !messageData.from || !messageData.text) {
      return res.sendStatus(200);
    }

    const userId = messageData.from;
    const incomingText = messageData.text;

    console.log(`📥 [${new Date().toLocaleTimeString()}] Recebido de ${userId}: "${incomingText}"`);

    // Verifica se já existe um buffer ativo para esse usuário
    if (messageBuffer.has(userId)) {
        const userBuffer = messageBuffer.get(userId);
        
        console.log(`⏳ [BUFFER] Adicionando ao pacote...`);

        clearTimeout(userBuffer.timer);

        // Libera a requisição anterior para não dar timeout nela
        if (userBuffer.res && !userBuffer.res.headersSent) {
            userBuffer.res.sendStatus(200);
        }

        userBuffer.texts.push(incomingText);
        userBuffer.res = res; // Segura a NOVA conexão
        userBuffer.timer = setTimeout(() => processBufferedMessages(userId, messageData), BUFFER_DELAY);
        
    } else {
        // Primeira mensagem da sequência
        console.log(`⏳ [BUFFER] Iniciando espera de ${BUFFER_DELAY}ms...`);
        
        const timer = setTimeout(() => processBufferedMessages(userId, messageData), BUFFER_DELAY);
        
        messageBuffer.set(userId, {
            texts: [incomingText],
            timer: timer,
            res: res
        });
    }

  } catch (err) {
    console.error("❌ Erro no Webhook:", err);
    if (!res.headersSent) res.sendStatus(500);
  }
});

// --- Processador do Buffer ---
async function processBufferedMessages(userId, baseMessageData) {
    const userBuffer = messageBuffer.get(userId);
    if (!userBuffer) return;

    messageBuffer.delete(userId);

    const fullText = userBuffer.texts.join(" ");
    console.log(`📦 [BUFFER FINALIZADO] Texto: "${fullText}"`);

    const finalMessageData = {
        ...baseMessageData,
        text: fullText
    };

    try {
        // Envia para a IA/Router
        // O router agora tem o Humanizer que demora um pouco
        await routeMessage(finalMessageData);
        console.log(`✅ Fluxo concluído para ${userId}`);

    } catch (error) {
        console.error(`❌ Erro no processamento consolidado:`, error);
    } finally {
        // Responde ao WhatsApp (se ainda não respondeu)
        // IMPORTANTE: Isso finaliza a conexão HTTP
        if (userBuffer.res && !userBuffer.res.headersSent) {
            userBuffer.res.sendStatus(200);
        }
    }
}

module.exports = router;

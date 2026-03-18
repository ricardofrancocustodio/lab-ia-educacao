const axios = require("axios");

async function processMessage(body) {
  let message;
  if (Array.isArray(body)) {
    message = body[0]?.value?.messages?.[0];
  } else if (body?.entry) {
    const entry = body.entry[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    message = value?.messages?.[0];
  }

  if (!message) return null;

  return {
    from: message.from,
    text: message.text?.body || ""
  };
}

function formatFinalMessage(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\bescola\b/gi, "Escola");
}

async function sendTypingState(to) {
  try {
    const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
    const recipient = String(to || "").replace(/\D/g, "");

    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "reaction"
      },
      {
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
      }
    );
  } catch (_) {
    // noop
  }
}

async function sendMessage(to, text, options = {}) {
  const throwOnError = !!options.throwOnError;
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
  const finalMessage = formatFinalMessage(text);

  try {
    const { data } = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: finalMessage }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Mensagem enviada para ${to}: ${finalMessage}`);
    return data;
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err.response?.data || err.message);
    if (throwOnError) throw err;
    return null;
  }
}

module.exports = { processMessage, sendMessage, sendTypingState };


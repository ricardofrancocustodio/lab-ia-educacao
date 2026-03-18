const axios = require("axios");
const { sendMessage } = require("../whatsapp.js");

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits;
  return null;
}

function normalizeChannels(channels = {}) {
  return {
    whatsapp: !!channels.whatsapp,
    email: !!channels.email,
    sms: !!channels.sms
  };
}

async function sendEmailResend({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.NOTIFY_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, reason: "provider_not_configured" };
  }
  if (!to) return { ok: false, reason: "missing_recipient" };

  try {
    const { data } = await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [to],
        subject: subject || "Notificacao",
        text: text || ""
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );
    return { ok: true, provider: "resend", data };
  } catch (err) {
    return { ok: false, reason: "send_failed", error: err?.response?.data || err?.message || err };
  }
}

async function sendSmsTwilio({ to, text }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!accountSid || !authToken || !from) {
    return { ok: false, reason: "provider_not_configured" };
  }
  if (!to) return { ok: false, reason: "missing_recipient" };

  const toNormalized = normalizePhone(to);
  if (!toNormalized) return { ok: false, reason: "invalid_phone" };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: `+${toNormalized}`,
    From: from.startsWith("+") ? from : `+${from}`,
    Body: text || ""
  });

  try {
    const { data } = await axios.post(url, body.toString(), {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 15000
    });
    return { ok: true, provider: "twilio", data };
  } catch (err) {
    return { ok: false, reason: "send_failed", error: err?.response?.data || err?.message || err };
  }
}

async function sendWhatsApp({ to, text }) {
  const toNormalized = normalizePhone(to);
  if (!toNormalized) return { ok: false, reason: "invalid_phone" };
  try {
    const data = await sendMessage(toNormalized, text || "", { throwOnError: true });
    return { ok: true, provider: "meta_whatsapp", data };
  } catch (err) {
    return { ok: false, reason: "send_failed", error: err?.message || err };
  }
}

async function dispatchByChannels({
  channels,
  recipient,
  message,
  subject = "Notificacao",
  strategy = "broadcast",
  fallbackOrder = ["email", "sms", "whatsapp"]
} = {}) {
  const ch = normalizeChannels(channels || { whatsapp: true });
  const out = {
    whatsapp: { attempted: false, ok: false, reason: "disabled" },
    email: { attempted: false, ok: false, reason: "disabled" },
    sms: { attempted: false, ok: false, reason: "disabled" }
  };

  const sendByChannel = async (channel) => {
    if (channel === "whatsapp") {
      out.whatsapp.attempted = true;
      out.whatsapp = { attempted: true, ...(await sendWhatsApp({ to: recipient?.phone, text: message })) };
      return out.whatsapp;
    }
    if (channel === "email") {
      out.email.attempted = true;
      out.email = {
        attempted: true,
        ...(await sendEmailResend({ to: recipient?.email, subject, text: message }))
      };
      return out.email;
    }
    if (channel === "sms") {
      out.sms.attempted = true;
      out.sms = { attempted: true, ...(await sendSmsTwilio({ to: recipient?.phone, text: message })) };
      return out.sms;
    }
    return { attempted: false, ok: false, reason: "unknown_channel" };
  };

  if (strategy === "fallback") {
    const enabledInOrder = fallbackOrder.filter((c) => !!ch[c]);
    for (const channel of enabledInOrder) {
      const result = await sendByChannel(channel);
      if (result?.ok) {
        return { ...out, deliveredBy: channel };
      }
    }
    return { ...out, deliveredBy: null };
  }

  if (ch.whatsapp) {
    await sendByChannel("whatsapp");
  }

  if (ch.email) {
    await sendByChannel("email");
  }

  if (ch.sms) {
    await sendByChannel("sms");
  }

  return { ...out, deliveredBy: null };
}

module.exports = { dispatchByChannels, normalizeChannels };

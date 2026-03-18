const { sendHumanMessage } = require("../utils/humanizer.js");
const receptionist = require("../core/receptionist.js");

async function routeMessage(messageData) {
  const from = messageData?.from;
  const text = String(messageData?.text || "").trim();
  const reply = await receptionist.handleMessage(from, {
    text,
    channel: messageData?.channel || "whatsapp"
  });

  if (reply) {
    await sendHumanMessage(from, reply);
  }
}

module.exports = { routeMessage };

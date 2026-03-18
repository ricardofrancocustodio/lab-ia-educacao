const crypto = require("crypto");

function createWebchatSession({ schoolId = "", entrypoint = "webchat" } = {}) {
  const schoolPart = String(schoolId || "school").trim() || "school";
  const entryPart = String(entrypoint || "webchat").trim() || "webchat";
  return `webchat:${schoolPart}:${entryPart}:${crypto.randomUUID()}`;
}

function normalizeIncomingWebchat(body = {}) {
  const sessionId = String(body.session_id || "").trim();
  const text = String(body.text || body.message || "").trim();
  const metadata = body && typeof body.metadata === "object" ? body.metadata : {};

  return {
    sessionId,
    text,
    metadata
  };
}

function isWebchatSessionId(value) {
  return String(value || "").startsWith("webchat:");
}

module.exports = {
  createWebchatSession,
  normalizeIncomingWebchat,
  isWebchatSessionId
};

const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const conversations = new Map();
const DATA_DIR = path.resolve("./.qodo/data");
const DATA_FILE = path.join(DATA_DIR, "webchat-handoffs.json");

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function createMessage({ role, text, source = role }) {
  return {
    id: crypto.randomUUID(),
    role: String(role || "assistant"),
    source: String(source || role || "assistant"),
    text: normalizeText(text),
    created_at: nowIso()
  };
}

function getConversation(userId) {
  return conversations.get(String(userId || "").trim()) || null;
}

function persistConversations() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = JSON.stringify(Array.from(conversations.entries()), null, 2);
    fs.writeFileSync(DATA_FILE, payload, "utf8");
  } catch (err) {
    console.error("Falha ao persistir conversas do webchat:", err.message || err);
  }
}

function loadPersistedConversations() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return;
    entries.forEach(([key, conversation]) => {
      if (key && conversation && typeof conversation === "object") {
        conversations.set(String(key), conversation);
      }
    });
  } catch (err) {
    console.error("Falha ao carregar conversas persistidas do webchat:", err.message || err);
  }
}

function listConversations() {
  return Array.from(conversations.values())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function ensureConversation({ userId, channel = "webchat", metadata = {} }) {
  const key = String(userId || "").trim();
  if (!key) return null;

  const existing = conversations.get(key);
  if (existing) {
    existing.channel = String(channel || existing.channel || "webchat");
    existing.metadata = { ...(existing.metadata || {}), ...(metadata || {}) };
    existing.updated_at = nowIso();
    persistConversations();
    return existing;
  }

  const conversation = {
    id: key,
    user_id: key,
    channel: String(channel || "webchat"),
    status: "AI_ACTIVE",
    ai_enabled: true,
    metadata: { ...(metadata || {}) },
    summary: "",
    created_at: nowIso(),
    updated_at: nowIso(),
    transcript: []
  };

  conversations.set(key, conversation);
  persistConversations();
  return conversation;
}

function appendConversationMessage(userId, message) {
  const conversation = ensureConversation({ userId });
  if (!conversation) return null;

  const built = createMessage(message || {});
  if (!built.text) return null;

  conversation.transcript.push(built);
  conversation.last_message = built.text;
  conversation.updated_at = built.created_at;
  persistConversations();
  return built;
}

function closeConversation(userId, finalText = "") {
  const conversation = getConversation(userId);
  if (!conversation) return null;

  if (normalizeText(finalText)) {
    appendConversationMessage(userId, {
      role: "system",
      source: "encerramento_institucional",
      text: finalText
    });
  }

  conversation.status = "RESOLVED";
  conversation.ai_enabled = true;
  conversation.resolved_at = nowIso();
  conversation.updated_at = nowIso();
  persistConversations();
  return conversation;
}

function serializeConversation(conversation) {
  if (!conversation) return null;
  return {
    id: conversation.id,
    user_id: conversation.user_id,
    channel: conversation.channel,
    status: conversation.status,
    ai_enabled: conversation.ai_enabled,
    metadata: conversation.metadata || {},
    summary: conversation.summary || "",
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    handoff_reason: "",
    handoff_requested_at: null,
    last_message: conversation.last_message || "",
    transcript: Array.isArray(conversation.transcript) ? conversation.transcript : []
  };
}

module.exports = {
  ensureConversation,
  appendConversationMessage,
  getConversation,
  listConversations,
  closeConversation,
  serializeConversation
};

loadPersistedConversations();

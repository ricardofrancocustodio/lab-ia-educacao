require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const GroqProvider = require("./providers/groq");

const DEFAULT_PROVIDER = "groq";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const SCHOOL_ID = String(process.env.SCHOOL_ID || "").trim();
const SETTINGS_TTL_MS = 30000;

const settingsClient = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const providerInstances = new Map();
let runtimeSettingsCache = {
  value: null,
  expiresAt: 0
};

function getFallbackSettings() {
  return {
    active_provider: 'groq',
    groq_model: DEFAULT_GROQ_MODEL
  };
}

async function loadRuntimeSettings() {
  const now = Date.now();
  if (runtimeSettingsCache.value && runtimeSettingsCache.expiresAt > now) {
    return runtimeSettingsCache.value;
  }

  const fallback = getFallbackSettings();
  if (!settingsClient || !SCHOOL_ID) {
    runtimeSettingsCache = { value: fallback, expiresAt: now + SETTINGS_TTL_MS };
    return fallback;
  }

  try {
    const { data, error } = await settingsClient
      .from("ai_provider_settings")
      .select("active_provider, groq_model")
      .eq("school_id", SCHOOL_ID)
      .maybeSingle();

    if (error) {
      const message = String(error.message || error.details || '').toLowerCase();
      if (!message.includes('does not exist')) {
        console.error('Erro ao carregar ai_provider_settings:', error);
      }
      runtimeSettingsCache = { value: fallback, expiresAt: now + SETTINGS_TTL_MS };
      return fallback;
    }

    const merged = {
      active_provider: data?.active_provider === 'groq' ? 'groq' : fallback.active_provider,
      groq_model: data?.groq_model || fallback.groq_model
    };

    runtimeSettingsCache = { value: merged, expiresAt: now + SETTINGS_TTL_MS };
    return merged;
  } catch (error) {
    console.error('Falha ao buscar configuracao dinamica de IA:', error);
    runtimeSettingsCache = { value: fallback, expiresAt: now + SETTINGS_TTL_MS };
    return fallback;
  }
}

function invalidateAIProviderCache() {
  runtimeSettingsCache = { value: null, expiresAt: 0 };
}

// ---------------------------------------------------------------------------
// PII Sanitizer — removes personally identifiable information before sending
// text to the AI provider. Catches CPF, email, phone numbers and replaces
// them with neutral placeholders so no personal data reaches the LLM.
// ---------------------------------------------------------------------------
const PII_PATTERNS = [
  { regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,        placeholder: "[CPF_REMOVIDO]" },
  { regex: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, placeholder: "[EMAIL_REMOVIDO]" },
  { regex: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b/g,  placeholder: "[TELEFONE_REMOVIDO]" },
];

function sanitizePII(text) {
  if (!text || typeof text !== "string") return text;
  let sanitized = text;
  for (const { regex, placeholder } of PII_PATTERNS) {
    sanitized = sanitized.replace(regex, placeholder);
  }
  return sanitized;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return history;
  return history.map((msg) => ({
    ...msg,
    content: msg.role === "system" ? msg.content : sanitizePII(msg.content)
  }));
}
// ---------------------------------------------------------------------------

function resolveAvailableProvider(settings = {}) {
  const requested = String(settings.active_provider || DEFAULT_PROVIDER).toLowerCase();
  return requested === 'groq' ? 'groq' : DEFAULT_PROVIDER;
}

function buildProviderInstance(settings) {
  const provider = resolveAvailableProvider(settings);
  if (provider !== 'groq') {
    throw new Error('A aplicacao esta configurada para operar apenas com Groq.');
  }
  if (!process.env.GROQ_API_KEY) {
    throw new Error('API Key da Groq nao fornecida.');
  }

  const model = settings.groq_model || DEFAULT_GROQ_MODEL;
  const cacheKey = provider + ':' + model;

  if (providerInstances.has(cacheKey)) return providerInstances.get(cacheKey);

  const instance = new GroqProvider(process.env.GROQ_API_KEY, { model });
  providerInstances.set(cacheKey, instance);
  return instance;
}

async function askAI(systemPrompt, userText, history = []) {
  try {
    const settings = await loadRuntimeSettings();
    const provider = buildProviderInstance(settings);
    const safeText = sanitizePII(userText);
    const safeHistory = sanitizeHistory(history);
    return await provider.generateResponse(systemPrompt, safeText, safeHistory);
  } catch (error) {
    console.error("Erro na comunicacao com a IA:", error);
    return "Instabilidade tecnica no momento.";
  }
}

module.exports = { askAI, loadRuntimeSettings, invalidateAIProviderCache };


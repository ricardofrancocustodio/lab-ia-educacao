const path = require("path");

const { askAI } = require(path.resolve("./.qodo/services/ai/index.js"));
const { findMatchingEntries } = require(path.resolve("./.qodo/services/supabase.js"));
const { getSession, setSession } = require(path.resolve("./.qodo/store/sessions.js"));

const SCHOOL_ID = process.env.SCHOOL_ID;

function namespacedSessionId(from, agentKey) {
  return `agent:${agentKey}:${from}`;
}

function renderSources(entries) {
  if (!entries.length) return "Nenhuma fonte institucional localizada.";
  return entries.map((entry, index) => {
    const sourceTitle = entry.source_title || "Base institucional";
    const sourceVersion = entry.source_version_label || entry.source_version_number || "sem versao";
    return `${index + 1}. Fonte: ${sourceTitle} | Versao: ${sourceVersion}\nTrecho: ${entry.answer || entry.question || ""}`;
  }).join("\n\n");
}

function mapConsultedSources(entries = []) {
  return entries.map((entry) => ({
    source_document_id: entry.source_document_id || null,
    source_title: entry.source_title || null,
    source_version_id: entry.source_version_id || null,
    source_version_label: entry.source_version_label || entry.source_version_number || null,
    source_excerpt: entry.answer || entry.question || null
  }));
}

function createAgent(config) {
  const {
    agentKey,
    name,
    description,
    areaLabel,
    scopeDescription,
    knowledgeCategories = [],
    routeHints = [],
    extraRules = []
  } = config;

  return {
    name,
    description,
    agentKey,
    areaLabel,

    async handleMessage(from, userMessage) {
      const text = String(userMessage?.text || userMessage || "").trim();
      if (!text || /audio|áudio/i.test(text)) {
        return {
          text: "Este canal atende somente por texto. Envie sua duvida por escrito.",
          audit: {
            assistant_key: agentKey,
            assistant_name: name,
            confidence_score: 0.35,
            response_mode: "AUTOMATIC",
            consulted_sources: [],
            supporting_source: null,
            fallback_to_human: false
          }
        };
      }

      const sessionId = namespacedSessionId(from, agentKey);
      const session = getSession(sessionId) || { step: 0, data: { history: [] } };
      session.data.history = Array.isArray(session.data.history) ? session.data.history : [];

      const entries = await findMatchingEntries(text, SCHOOL_ID, {
        categories: knowledgeCategories,
        limit: 3
      });

      const prompt = [
        `Voce e ${name}, assistente da area ${areaLabel}.`,
        `Escopo principal: ${scopeDescription}.`,
        "Regras:",
        "1. Responda em portugues do Brasil.",
        "2. Nao invente regras, prazos ou politicas.",
        "3. Sempre cite a fonte e a versao usadas quando houver base encontrada.",
        routeHints.length ? `4. Se estiver fora da sua area, encaminhe para: ${routeHints.join(", ")}.` : "4. Se estiver fora da sua area, sinalize o encaminhamento adequado.",
        extraRules.length ? `Regras especificas:\n${extraRules.map((rule, idx) => `${idx + 1}. ${rule}`).join("\n")}` : "",
        `Fontes recuperadas:\n${renderSources(entries)}`
      ].filter(Boolean).join("\n");

      const reply = await askAI(prompt, text, session.data.history);
      const finalReply = String(reply || "").trim() || "Nao consegui responder com seguranca agora.";

      session.data.history = [
        ...session.data.history,
        { role: "user", content: text },
        { role: "assistant", content: finalReply }
      ].slice(-8);
      setSession(sessionId, session);

      const consultedSources = mapConsultedSources(entries);
      const supportingSource = consultedSources[0] || null;

      return {
        text: finalReply,
        audit: {
          assistant_key: agentKey,
          assistant_name: name,
          confidence_score: consultedSources.length ? 0.92 : 0.46,
          response_mode: "AUTOMATIC",
          consulted_sources: consultedSources,
          supporting_source: supportingSource,
          fallback_to_human: false
        }
      };
    }
  };
}

module.exports = { createAgent };

const path = require("path");

const { askAI } = require(path.resolve("./.qodo/services/ai/index.js"));
const { findMatchingEntries } = require(path.resolve("./.qodo/services/supabase.js"));
const { getSession, setSession } = require(path.resolve("./.qodo/store/sessions.js"));
const agents = require(path.resolve("./.qodo/agents/index.js"));

const SCHOOL_ID = process.env.SCHOOL_ID;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectArea(text) {
  const value = normalize(text);

  if (["tesouraria", "financeiro", "pagamento", "repasse", "orcamento", "empenho"].some((term) => value.includes(term))) {
    return "administration.treasury";
  }

  if (["direcao", "diretoria", "institucional", "ouvidoria", "recurso", "norma"].some((term) => value.includes(term))) {
    return "administration.direction";
  }

  if (["secretaria", "documento", "protocolo", "declaracao", "cadastro", "atendimento"].some((term) => value.includes(term))) {
    return "administration.secretariat";
  }

  return null;
}

function formatSources(entries) {
  if (!entries.length) return "Nenhuma fonte institucional localizada.";

  return entries
    .map((entry, index) => {
      const title = entry.source_title || "Base institucional";
      const version = entry.source_version_label || entry.source_version_number || "sem versao";
      const excerpt = entry.answer || entry.question || "";
      return `${index + 1}. Fonte: ${title} | Versao: ${version}\nTrecho: ${excerpt}`;
    })
    .join("\n\n");
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

module.exports = {
  name: "Assistente Publico",
  description: "Triagem institucional orientada por fonte e versionamento.",

  async handleMessage(from, userMessage) {
    const text = String(userMessage?.text || userMessage || "").trim();

    if (!text || /audio|áudio/i.test(text)) {
      return {
        text: "Este canal atende somente por texto. Envie sua consulta por escrito e eu sigo com a triagem institucional.",
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: 0.35,
          response_mode: "AUTOMATIC",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: false
        }
      };
    }

    const area = detectArea(text);
    if (area === "administration.secretariat") {
      return agents.administration.secretariat.handleMessage(from, text);
    }
    if (area === "administration.treasury") {
      return agents.administration.treasury.handleMessage(from, text);
    }
    if (area === "administration.direction") {
      return agents.administration.direction.handleMessage(from, text);
    }

    const session = getSession(from) || { step: 0, data: { history: [] } };
    session.data.history = Array.isArray(session.data.history) ? session.data.history : [];

    const entries = await findMatchingEntries(text, SCHOOL_ID, {
      categories: ["Atendimento Publico", "Institucional", "Secretaria", "Tesouraria", "Direcao"],
      limit: 3
    });

    const prompt = [
      "Voce e o Assistente Publico de uma instituicao de ensino.",
      "Objetivo: acolher a consulta, responder somente com base em fonte institucional e encaminhar para a area correta quando necessario.",
      "Regras:",
      "1. Responda em portugues do Brasil.",
      "2. Nao invente normas, prazos, decisoes ou compromissos.",
      "3. Sempre cite explicitamente a fonte e a versao usadas quando houver base encontrada.",
      "4. Se faltar base suficiente, diga isso com clareza e oriente o proximo passo.",
      `Fontes recuperadas:\n${formatSources(entries)}`
    ].join("\n");

    const reply = await askAI(prompt, text, session.data.history);
    const finalReply = String(reply || "").trim() || "Nao consegui concluir essa consulta agora. Tente reformular em uma frase objetiva.";

    session.data.history = [
      ...session.data.history,
      { role: "user", content: text },
      { role: "assistant", content: finalReply }
    ].slice(-8);

    setSession(from, session);

    const consultedSources = mapConsultedSources(entries);
    const supportingSource = consultedSources[0] || null;

    return {
      text: finalReply,
      audit: {
        assistant_key: "public.assistant",
        assistant_name: "Assistente Publico",
        confidence_score: consultedSources.length ? 0.9 : 0.45,
        response_mode: "AUTOMATIC",
        consulted_sources: consultedSources,
        supporting_source: supportingSource,
        fallback_to_human: false
      }
    };
  }
};

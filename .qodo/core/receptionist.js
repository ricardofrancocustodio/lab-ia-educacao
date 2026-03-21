const path = require("path");

const { askAI } = require(path.resolve("./.qodo/services/ai/index.js"));
const { findMatchingEntries } = require(path.resolve("./.qodo/services/supabase.js"));
const { getSession, setSession } = require(path.resolve("./.qodo/store/sessions.js"));
const agents = require(path.resolve("./.qodo/agents/index.js"));

const SCHOOL_ID = process.env.SCHOOL_ID;
const SAFE_EVIDENCE_SCORE = 0.78;
const WARNING_EVIDENCE_SCORE = 0.58;

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
      const evidenceScore = Number(entry.evidence_score || 0).toFixed(2);
      return `${index + 1}. Fonte: ${title} | Versao: ${version} | Evidencia: ${evidenceScore}\nTrecho: ${excerpt}`;
    })
    .join("\n\n");
}

function mapConsultedSources(entries = []) {
  return entries.map((entry) => ({
    source_document_id: entry.source_document_id || null,
    source_title: entry.source_title || null,
    source_version_id: entry.source_version_id || null,
    source_version_label: entry.source_version_label || entry.source_version_number || null,
    source_excerpt: entry.answer || entry.question || null,
    evidence_score: entry.evidence_score ?? null,
    retrieval_method: entry.retrieval_method || null
  }));
}

function buildEvidenceAssessment(entries = []) {
  const best = entries[0] || null;
  const consultedSources = mapConsultedSources(entries);
  const supportingSource = consultedSources[0] || null;
  const evidenceScore = Number(best?.evidence_score || 0);
  const sourceCount = consultedSources.filter((item) => item.source_version_id).length;

  if (!best || !best.source_version_id || evidenceScore < WARNING_EVIDENCE_SCORE) {
    return {
      decision: 'ABSTAIN_AND_REVIEW',
      evidence_score: evidenceScore,
      confidence_score: evidenceScore ? Number(Math.min(0.6, evidenceScore).toFixed(3)) : 0.18,
      hallucination_risk_level: 'HIGH',
      review_required: true,
      review_reason: 'insufficient_institutional_evidence',
      supporting_source: supportingSource,
      consulted_sources: consultedSources
    };
  }

  if (sourceCount >= 1 && evidenceScore >= SAFE_EVIDENCE_SCORE) {
    return {
      decision: 'SAFE_TO_ANSWER',
      evidence_score: evidenceScore,
      confidence_score: Number(Math.min(0.96, 0.55 + (evidenceScore * 0.45)).toFixed(3)),
      hallucination_risk_level: 'LOW',
      review_required: false,
      review_reason: null,
      supporting_source: supportingSource,
      consulted_sources: consultedSources
    };
  }

  return {
    decision: 'ANSWER_WITH_WARNING',
    evidence_score: evidenceScore,
    confidence_score: Number(Math.min(0.82, 0.45 + (evidenceScore * 0.4)).toFixed(3)),
    hallucination_risk_level: 'MEDIUM',
    review_required: true,
    review_reason: 'weak_evidence_requires_follow_up',
    supporting_source: supportingSource,
    consulted_sources: consultedSources
  };
}

function buildAbstentionReply() {
  return 'Nao encontrei base institucional suficiente e versionada para responder com seguranca a essa consulta. Para preservar a governanca da informacao, prefiro nao afirmar algo sem evidencias. Recomendo revisao humana e, se necessario, atualizacao da base de conhecimento.';
}

function buildWarningPrefix() {
  return 'Encontrei apenas base institucional parcial para esta pergunta. Vou responder de forma conservadora e limitada ao que esta registrado.';
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
          evidence_score: 0.1,
          hallucination_risk_level: 'LOW',
          review_required: false,
          review_reason: null,
          response_mode: "AUTOMATIC",
          consulted_sources: [],
          supporting_source: null,
          fallback_to_human: false,
          abstained: false
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
    const assessment = buildEvidenceAssessment(entries);

    if (assessment.decision === 'ABSTAIN_AND_REVIEW') {
      return {
        text: buildAbstentionReply(),
        audit: {
          assistant_key: "public.assistant",
          assistant_name: "Assistente Publico",
          confidence_score: assessment.confidence_score,
          evidence_score: assessment.evidence_score,
          hallucination_risk_level: assessment.hallucination_risk_level,
          review_required: assessment.review_required,
          review_reason: assessment.review_reason,
          response_mode: 'ABSTAINED',
          consulted_sources: assessment.consulted_sources,
          supporting_source: assessment.supporting_source,
          fallback_to_human: true,
          abstained: true
        }
      };
    }

    const prompt = [
      "Voce e o Assistente Publico de uma instituicao de ensino.",
      "Objetivo: acolher a consulta, responder somente com base em fonte institucional e encaminhar para a area correta quando necessario.",
      "Regras:",
      "1. Responda em portugues do Brasil.",
      "2. Nao invente normas, prazos, decisoes, documentos ou compromissos institucionais.",
      "3. Limite-se estritamente ao que estiver sustentado pelas fontes recuperadas.",
      "4. Sempre cite explicitamente a fonte e a versao usadas quando houver base encontrada.",
      "5. Se a base estiver incompleta, diga isso com clareza e nao preencha lacunas com suposicoes.",
      `Sinal de evidencia principal: ${assessment.evidence_score.toFixed(2)}.`,
      `Fontes recuperadas:\n${formatSources(entries)}`
    ].join("\n");

    const reply = await askAI(prompt, text, session.data.history);
    let finalReply = String(reply || "").trim() || "Nao consegui concluir essa consulta agora. Tente reformular em uma frase objetiva.";
    if (assessment.decision === 'ANSWER_WITH_WARNING') {
      finalReply = `${buildWarningPrefix()} ${finalReply}`.trim();
    }

    session.data.history = [
      ...session.data.history,
      { role: "user", content: text },
      { role: "assistant", content: finalReply }
    ].slice(-8);

    setSession(from, session);

    return {
      text: finalReply,
      audit: {
        assistant_key: "public.assistant",
        assistant_name: "Assistente Publico",
        confidence_score: assessment.confidence_score,
        evidence_score: assessment.evidence_score,
        hallucination_risk_level: assessment.hallucination_risk_level,
        review_required: assessment.review_required,
        review_reason: assessment.review_reason,
        response_mode: assessment.decision === 'ANSWER_WITH_WARNING' ? 'AUTOMATIC_LIMITED' : 'AUTOMATIC',
        consulted_sources: assessment.consulted_sources,
        supporting_source: assessment.supporting_source,
        fallback_to_human: assessment.review_required,
        abstained: false
      }
    };
  }
};

const path = require("path");

const { askAI } = require(path.resolve("./.qodo/services/ai/index.js"));
const { findMatchingEntries } = require(path.resolve("./.qodo/services/supabase.js"));
const { getSession, setSession } = require(path.resolve("./.qodo/store/sessions.js"));

const SCHOOL_ID = process.env.SCHOOL_ID;
const SAFE_EVIDENCE_SCORE = 0.78;
const WARNING_EVIDENCE_SCORE = 0.58;

function namespacedSessionId(from, agentKey) {
  return `agent:${agentKey}:${from}`;
}

function renderSources(entries) {
  if (!entries.length) return "Nenhuma fonte institucional localizada.";
  return entries.map((entry, index) => {
    const sourceTitle = entry.source_title || "Base institucional";
    const sourceVersion = entry.source_version_label || entry.source_version_number || "sem versao";
    const evidenceScore = Number(entry.evidence_score || 0).toFixed(2);
    return `${index + 1}. Fonte: ${sourceTitle} | Versao: ${sourceVersion} | Evidencia: ${evidenceScore}\nTrecho: ${entry.answer || entry.question || ""}`;
  }).join("\n\n");
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
  const supportingSource = best ? mapConsultedSources([best])[0] : null;
  const consultedSources = mapConsultedSources(entries);
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
      confidence_score: Number(Math.min(0.97, 0.55 + (evidenceScore * 0.45)).toFixed(3)),
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

function buildAbstentionReply(areaLabel) {
  return `Nao encontrei base institucional suficiente e versionada para responder com seguranca sobre este tema na area ${areaLabel}. Para manter a governanca da informacao, prefiro nao afirmar algo sem evidencias. Recomendo revisao humana e atualizacao da base de conhecimento, se necessario.`;
}

function buildWarningPrefix() {
  return 'Encontrei apenas base institucional parcial para esta pergunta. Vou responder de forma conservadora e limitada ao que esta registrado.';
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

      const sessionId = namespacedSessionId(from, agentKey);
      const session = getSession(sessionId) || { step: 0, data: { history: [] } };
      session.data.history = Array.isArray(session.data.history) ? session.data.history : [];

      const entries = await findMatchingEntries(text, SCHOOL_ID, {
        categories: knowledgeCategories,
        limit: 3
      });
      const assessment = buildEvidenceAssessment(entries);

      if (assessment.decision === 'ABSTAIN_AND_REVIEW') {
        return {
          text: buildAbstentionReply(areaLabel),
          audit: {
            assistant_key: agentKey,
            assistant_name: name,
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
        `Voce e ${name}, assistente da area ${areaLabel}.`,
        `Escopo principal: ${scopeDescription}.`,
        'Regras:',
        '1. Responda em portugues do Brasil.',
        '2. Nao invente regras, prazos, politicas, documentos ou compromissos institucionais.',
        '3. Limite-se estritamente ao que estiver sustentado pelas fontes recuperadas.',
        '4. Cite explicitamente a fonte principal e a versao usadas.',
        '5. Se a base estiver incompleta, diga isso claramente e nao preencha lacunas com suposicoes.',
        routeHints.length ? `6. Se estiver fora da sua area, encaminhe para: ${routeHints.join(', ')}.` : '6. Se estiver fora da sua area, sinalize o encaminhamento adequado.',
        extraRules.length ? `Regras especificas:\n${extraRules.map((rule, idx) => `${idx + 1}. ${rule}`).join("\n")}` : '',
        `Sinal de evidencia principal: ${assessment.evidence_score.toFixed(2)}.`,
        `Fontes recuperadas:\n${renderSources(entries)}`
      ].filter(Boolean).join("\n");

      const reply = await askAI(prompt, text, session.data.history);
      let finalReply = String(reply || '').trim() || 'Nao consegui responder com seguranca agora.';
      if (assessment.decision === 'ANSWER_WITH_WARNING') {
        finalReply = `${buildWarningPrefix()} ${finalReply}`.trim();
      }

      session.data.history = [
        ...session.data.history,
        { role: 'user', content: text },
        { role: 'assistant', content: finalReply }
      ].slice(-8);
      setSession(sessionId, session);

      return {
        text: finalReply,
        audit: {
          assistant_key: agentKey,
          assistant_name: name,
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
}

module.exports = { createAgent };

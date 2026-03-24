// 📁 .qodo/api/faqController.js
// Controlador de FAQs com suporte a NETWORK/SCHOOL, versionamento, auditoria e testes de IA

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const FAQ_STATUS = new Set(["draft", "review", "published", "archived"]);
const SCOPE_KEY = new Set(["network", "school"]);

function normalizeRoleKey(role) {
  return String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getStatusColor(status) {
  const colors = {
    draft: "#FFC107",
    review: "#17A2B8",
    published: "#28A745",
    archived: "#6C757D"
  };
  return colors[status] || "#17A2B8";
}

function getStatusLabel(status) {
  const labels = {
    draft: "Rascunho",
    review: "Em análise",
    published: "Publicado",
    archived: "Arquivado"
  };
  return labels[status] || status;
}

// ============================================================================
// 1. CRIAR/ATUALIZAR FAQ ITEM
// ============================================================================
async function createOrUpdateFaqItem(req, accessContext, { schoolId, scopeKey, faqId } = {}) {
  if (!supabase) {
    throw Object.assign(
      new Error("Supabase não configurado"),
      { statusCode: 500 }
    );
  }

  const { question, answer, category, status, valid_from, valid_to } = req.body;

  if (!question || !answer) {
    throw Object.assign(
      new Error("Pergunta e resposta são obrigatórias."),
      { statusCode: 400 }
    );
  }

  if (!FAQ_STATUS.has(status)) {
    throw Object.assign(
      new Error("Status inválido. Use: draft, review, published, archived"),
      { statusCode: 400 }
    );
  }

  const payload = {
    school_id: schoolId,
    scope_key: scopeKey,
    question: String(question).trim(),
    answer: String(answer).trim(),
    category: String(category || "Geral").trim(),
    status,
    valid_from: valid_from || new Date().toISOString(),
    valid_to: valid_to || null,
    updated_by: accessContext.user.id,
    updated_by_email: accessContext.memberEmail,
    updated_at: new Date().toISOString()
  };

  if (!faqId) {
    payload.created_by = accessContext.user.id;
    payload.created_by_email = accessContext.memberEmail;
    payload.created_at = new Date().toISOString();
  }

  const method = faqId ? "update" : "insert";
  let query = supabase.from("faq_items")[method](payload);

  if (faqId) {
    query = query.eq("id", faqId).eq("school_id", schoolId);
  } else {
    query = query.select();
  }

  const { data, error } = await query.select().single();

  if (error) {
    throw Object.assign(
      new Error(`Falha ao ${faqId ? "atualizar" : "criar"} FAQ: ${error.message}`),
      { statusCode: 500, cause: error }
    );
  }

  // Registrar auditoria
  await logFaqAudit({
    faqItemId: data.id,
    schoolId,
    action: faqId ? "updated" : "created",
    userId: accessContext.user.id,
    userEmail: accessContext.memberEmail,
    userRole: accessContext.effectiveRole,
    statusBefore: faqId ? null : null,
    statusAfter: status,
    changes: faqId ? { question, answer, category, status, valid_from, valid_to } : {}
  });

  return data;
}

// ============================================================================
// 2. LISTAR FAQs COM FILTROS
// ============================================================================
async function listFaqItems(req, accessContext, { schoolId, scopeKey } = {}) {
  if (!supabase) {
    throw Object.assign(
      new Error("Supabase não configurado"),
      { statusCode: 500 }
    );
  }

  const { status, category, search, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from("faq_items")
    .select("*, created_by_email, updated_by_email", { count: "exact" })
    .eq("school_id", schoolId)
    .eq("scope_key", scopeKey)
    .order("item_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status && FAQ_STATUS.has(status)) {
    query = query.eq("status", status);
  }

  if (category) {
    query = query.eq("category", String(category).trim());
  }

  if (search) {
    const searchTerm = `%${String(search).trim()}%`;
    query = query.or(`question.ilike.${searchTerm},answer.ilike.${searchTerm}`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw Object.assign(
      new Error(`Falha ao listar FAQs: ${error.message}`),
      { statusCode: 500, cause: error }
    );
  }

  return { items: data || [], total: count || 0 };
}

// ============================================================================
// 3. DELETAR FAQ ITEM
// ============================================================================
async function deleteFaqItem(req, accessContext, { schoolId, faqId } = {}) {
  if (!supabase) {
    throw Object.assign(
      new Error("Supabase não configurado"),
      { statusCode: 500 }
    );
  }

  const { data: existing } = await supabase
    .from("faq_items")
    .select("*")
    .eq("id", faqId)
    .eq("school_id", schoolId)
    .single();

  if (!existing) {
    throw Object.assign(
      new Error("FAQ não encontrada."),
      { statusCode: 404 }
    );
  }

  const { error } = await supabase
    .from("faq_items")
    .delete()
    .eq("id", faqId)
    .eq("school_id", schoolId);

  if (error) {
    throw Object.assign(
      new Error(`Falha ao deletar FAQ: ${error.message}`),
      { statusCode: 500, cause: error }
    );
  }

  // Registrar auditoria
  await logFaqAudit({
    faqItemId: faqId,
    schoolId,
    action: "deleted",
    userId: accessContext.user.id,
    userEmail: accessContext.memberEmail,
    userRole: accessContext.effectiveRole,
    statusBefore: existing.status,
    statusAfter: null,
    changes: { question: existing.question }
  });

  return { ok: true, deleted: faqId };
}

// ============================================================================
// 4. PUBLICAR FAQ (muda status para published)
// ============================================================================
async function publishFaqItem(req, accessContext, { schoolId, faqId } = {}) {
  if (!supabase) {
    throw Object.assign(
      new Error("Supabase não configurado"),
      { statusCode: 500 }
    );
  }

  const { data: existing } = await supabase
    .from("faq_items")
    .select("*")
    .eq("id", faqId)
    .eq("school_id", schoolId)
    .single();

  if (!existing) {
    throw Object.assign(
      new Error("FAQ não encontrada."),
      { statusCode: 404 }
    );
  }

  const { data, error } = await supabase
    .from("faq_items")
    .update({
      status: "published",
      updated_by: accessContext.user.id,
      updated_by_email: accessContext.memberEmail,
      updated_at: new Date().toISOString()
    })
    .eq("id", faqId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) {
    throw Object.assign(
      new Error(`Falha ao publicar FAQ: ${error.message}`),
      { statusCode: 500, cause: error }
    );
  }

  // Registrar auditoria
  await logFaqAudit({
    faqItemId: faqId,
    schoolId,
    action: "published",
    userId: accessContext.user.id,
    userEmail: accessContext.memberEmail,
    userRole: accessContext.effectiveRole,
    statusBefore: existing.status,
    statusAfter: "published",
    changes: {}
  });

  return data;
}

// ============================================================================
// 5. TESTAR FAQ COM IA
// ============================================================================
async function testFaqWithAi(req, accessContext, { schoolId, faqId } = {}) {
  if (!supabase) {
    throw Object.assign(
      new Error("Supabase não configurado"),
      { statusCode: 500 }
    );
  }

  const { test_query, ai_provider = "gemini" } = req.body;

  if (!test_query) {
    throw Object.assign(
      new Error("Query de teste é obrigatória."),
      { statusCode: 400 }
    );
  }

  const { data: faq } = await supabase
    .from("faq_items")
    .select("*")
    .eq("id", faqId)
    .eq("school_id", schoolId)
    .single();

  if (!faq) {
    throw Object.assign(
      new Error("FAQ não encontrada."),
      { statusCode: 404 }
    );
  }

  // Placeholder: Integrar com actual IA testing service
  // TODO: Chamar serviço de IA para testar relevância
  const matchScore = 0.85; // Exemplo
  const aiResponse = `Baseado na FAQ "${faq.question}", a resposta mais próxima seria: ${faq.answer.substring(0, 100)}...`;

  const testResult = {
    faq_item_id: faqId,
    school_id: schoolId,
    test_query,
    test_category: null,
    ai_response: aiResponse,
    ai_provider,
    match_score: matchScore,
    is_relevant: matchScore >= 0.7,
    feedback_type: "correct",
    tester_id: accessContext.user.id,
    tester_email: accessContext.memberEmail,
    test_date: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("faq_ai_test_results")
    .insert(testResult)
    .select()
    .single();

  if (error) {
    throw Object.assign(
      new Error(`Falha ao registrar teste: ${error.message}`),
      { statusCode: 500, cause: error }
    );
  }

  return data;
}

// ============================================================================
// 6. REGISTRAR AUDITORIA
// ============================================================================
async function logFaqAudit({
  faqItemId,
  schoolId,
  action,
  userId,
  userEmail,
  userRole,
  statusBefore,
  statusAfter,
  changes
}) {
  if (!supabase) return;

  await supabase.from("faq_audit_log").insert({
    faq_item_id: faqItemId,
    school_id: schoolId,
    action,
    user_id: userId,
    user_email: userEmail,
    user_role: userRole,
    status_before: statusBefore,
    status_after: statusAfter,
    changes_payload: changes || {},
    created_at: new Date().toISOString()
  });
}

// ============================================================================
// 7. DETECTAR CONFLITOS (rede vs escola)
// ============================================================================
async function detectAndLogConflicts(req, accessContext, { schoolId } = {}) {
  if (!supabase) {
    throw Object.assign(
      new Error("Supabase não configurado"),
      { statusCode: 500 }
    );
  }

  // Buscar FAQs da rede
  const { data: networkFaqs } = await supabase
    .from("faq_items")
    .select("*")
    .eq("school_id", schoolId)
    .eq("scope_key", "network")
    .eq("status", "published");

  // Buscar FAQs da escola
  const { data: schoolFaqs } = await supabase
    .from("faq_items")
    .select("*")
    .eq("school_id", schoolId)
    .eq("scope_key", "school")
    .eq("status", "published");

  const conflicts = [];

  // Detectar duplicatas e respostas conflitantes
  (networkFaqs || []).forEach((netFaq) => {
    (schoolFaqs || []).forEach((schFaq) => {
      if (netFaq.question.toLowerCase() === schFaq.question.toLowerCase()) {
        conflicts.push({
          school_id: schoolId,
          faq_item_network_id: netFaq.id,
          faq_item_school_id: schFaq.id,
          conflict_type: "conflicting_answers",
          severity:netFaq.answer !== schFaq.answer ? "high" : "medium",
          description: `Pergunta duplicada com respostas ${netFaq.answer === schFaq.answer ? "iguais" : "diferentes"}`
        });
      }
    });
  });

  if (conflicts.length === 0) {
    return { detected: 0, conflicts: [] };
  }

  // Salvar conflitos
  const { data, error } = await supabase
    .from("faq_conflicts")
    .insert(conflicts)
    .select();

  if (error) {
    console.error("Erro ao registrar conflitos:", error);
  }

  return { detected: conflicts.length, conflicts: data || [] };
}

// ============================================================================
// EXPORTAR FUNÇÕES
// ============================================================================
module.exports = {
  createOrUpdateFaqItem,
  listFaqItems,
  deleteFaqItem,
  publishFaqItem,
  testFaqWithAi,
  logFaqAudit,
  detectAndLogConflicts,
  getStatusLabel,
  getStatusColor,
  FAQ_STATUS,
  SCOPE_KEY
};

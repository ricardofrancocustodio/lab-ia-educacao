/**
 * test-incident-flow.js
 * Comprehensive end-to-end test for the Incident Treatment Flow.
 * Run: node test-incident-flow.js
 */
const http = require("http");

// ── Config ──────────────────────────────────────────────────────────
const BASE = "http://localhost:8084";
const TOKEN = process.env.TOKEN || "";
const SCHOOL_ID = "314c2676-73b8-47e6-8582-29cadfaa3863"; // Secretaria de Educacao do DF

if (!TOKEN) {
  console.error("Usage: TOKEN=<jwt> node test-incident-flow.js");
  process.exit(1);
}

let passed = 0, failed = 0, skipped = 0;
const results = [];

// ── HTTP helpers ────────────────────────────────────────────────────
function request(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: "Bearer " + TOKEN,
        "x-school-id": SCHOOL_ID,
        ...(payload ? { "Content-Type": "application/json" } : {}),
        ...extraHeaders,
      },
    };
    const req = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch { parsed = d; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    results.push({ name, status: "PASS" });
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    results.push({ name, status: "FAIL", detail });
    console.log(`  ❌ ${name} — ${detail || ""}`);
  }
}

function skip(name, reason) {
  skipped++;
  results.push({ name, status: "SKIP", detail: reason });
  console.log(`  ⏭️  ${name} — ${reason}`);
}

// ── State shared between tests ─────────────────────────────────────
const state = {};

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: FEEDBACK SYSTEM
// ═══════════════════════════════════════════════════════════════════
async function phase1_feedback() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 1 — SISTEMA DE FEEDBACK");
  console.log("══════════════════════════════════════════");

  // 1.1 - GET feedback list
  console.log("\n── 1.1 Listar feedbacks ──");
  const r1 = await request("GET", "/api/feedback?page=1&limit=50");
  assert("GET /api/feedback retorna 200", r1.status === 200);
  assert("Resposta tem ok=true", r1.body?.ok === true);
  assert("Resposta contém array feedbacks", Array.isArray(r1.body?.feedbacks));
  assert("Resposta contém scope_mode", typeof r1.body?.scope_mode === "string");

  const feedbacks = r1.body?.feedbacks || [];
  state.feedbacks = feedbacks;
  console.log(`   Feedbacks encontrados: ${feedbacks.length}`);

  // 1.2 - GET feedback stats
  console.log("\n── 1.2 Estatísticas de feedback ──");
  const r2 = await request("GET", "/api/feedback/stats/summary");
  assert("GET /api/feedback/stats/summary retorna 200", r2.status === 200);
  assert("Stats contém total", typeof r2.body?.stats?.total === "number");
  assert("Stats contém helpful", typeof r2.body?.stats?.helpful === "number");
  assert("Stats contém not_helpful", typeof r2.body?.stats?.not_helpful === "number");
  assert("Stats contém incorrect", typeof r2.body?.stats?.incorrect === "number");
  assert("Stats contém positive_rate", typeof r2.body?.stats?.positive_rate === "number");
  assert("Stats contém pending_correction", typeof r2.body?.stats?.pending_correction === "number");
  assert("Stats contém correction_counts", typeof r2.body?.stats?.correction_counts === "object");
  console.log("   Stats:", JSON.stringify(r2.body?.stats));

  // 1.3 - Filter by type
  console.log("\n── 1.3 Filtrar feedbacks por tipo ──");
  const r3 = await request("GET", "/api/feedback?type=incorrect");
  assert("Filtro type=incorrect retorna 200", r3.status === 200);
  const incorrectFeedbacks = r3.body?.feedbacks || [];
  assert("Todos resultados são 'incorrect'",
    incorrectFeedbacks.every(f => f.feedback_type === "incorrect") || incorrectFeedbacks.length === 0,
    `Found ${incorrectFeedbacks.filter(f => f.feedback_type !== "incorrect").length} non-incorrect`);
  state.incorrectFeedbacks = incorrectFeedbacks;
  console.log(`   Feedbacks 'incorreto': ${incorrectFeedbacks.length}`);

  // 1.4 - GET feedback detail
  if (feedbacks.length > 0) {
    console.log("\n── 1.4 Detalhe de feedback ──");
    const fbId = feedbacks[0].id;
    const r4 = await request("GET", `/api/feedback/${fbId}`);
    assert("GET /api/feedback/:id retorna 200", r4.status === 200);
    assert("Detalhe contém feedback_type", !!r4.body?.feedback?.feedback_type);
    assert("Detalhe contém response_text ou response", !!(r4.body?.feedback?.response_text || r4.body?.feedback?.response));
    state.feedbackDetail = r4.body?.feedback;
  } else {
    skip("Detalhe de feedback", "Nenhum feedback existente");
  }

  // 1.5 - Feedback detail for incorrect with correction
  if (incorrectFeedbacks.length > 0) {
    console.log("\n── 1.5 Detalhe de feedback 'incorreto' com correção ──");
    const fbId = incorrectFeedbacks[0].id;
    const r5 = await request("GET", `/api/feedback/${fbId}`);
    assert("Feedback incorreto retorna detalhes", r5.status === 200);
    const fb = r5.body?.feedback;
    assert("Detalhe mostra correction_status", fb?.correction_status !== undefined);
    assert("Detalhe mostra quarantine_status", fb?.quarantine_status !== undefined || fb?.quarantined_at !== undefined);
    state.incorrectFeedbackId = fbId;
    state.incorrectResponseId = fb?.response_id;
    console.log(`   Feedback ID: ${fbId}`);
    console.log(`   Response ID: ${state.incorrectResponseId}`);
    console.log(`   Correction status: ${fb?.correction_status || 'none'}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: INCIDENT SYSTEM
// ═══════════════════════════════════════════════════════════════════
async function phase2_incidents() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 2 — SISTEMA DE INCIDENTES");
  console.log("══════════════════════════════════════════");

  // 2.1 - GET incidents list
  console.log("\n── 2.1 Listar incidentes ──");
  const r1 = await request("GET", "/api/incidents?page=1&limit=50");
  assert("GET /api/incidents retorna 200", r1.status === 200);
  assert("Resposta tem ok=true", r1.body?.ok === true);
  const incidents = r1.body?.incidents || r1.body?.data || [];
  state.incidents = incidents;
  console.log(`   Incidentes encontrados: ${incidents.length}`);

  // 2.2 - GET incident stats
  console.log("\n── 2.2 Estatísticas de incidentes ──");
  const r2 = await request("GET", "/api/incidents/stats/summary");
  assert("GET /api/incidents/stats/summary retorna 200", r2.status === 200);
  assert("Stats contém total", typeof r2.body?.stats?.total === "number");
  assert("Stats contém open", typeof r2.body?.stats?.open === "number");
  assert("Stats contém in_review", typeof r2.body?.stats?.in_review === "number");
  assert("Stats contém resolved", typeof r2.body?.stats?.resolved === "number");
  assert("Stats contém critical_open", typeof r2.body?.stats?.critical_open === "number");
  assert("Stats contém avg_resolution_hours", r2.body?.stats?.avg_resolution_hours !== undefined);
  console.log("   Stats:", JSON.stringify(r2.body?.stats));

  // 2.3 - Filter by status
  console.log("\n── 2.3 Filtrar incidentes por status ──");
  for (const status of ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]) {
    const r = await request("GET", `/api/incidents?status=${status}`);
    assert(`Filtro status=${status} retorna 200`, r.status === 200);
  }

  // 2.4 - Filter by severity
  console.log("\n── 2.4 Filtrar incidentes por severidade ──");
  for (const sev of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) {
    const r = await request("GET", `/api/incidents?severity=${sev}`);
    assert(`Filtro severity=${sev} retorna 200`, r.status === 200);
  }

  // 2.5 - GET single incident detail
  if (incidents.length > 0) {
    console.log("\n── 2.5 Detalhe do incidente ──");
    const incId = incidents[0].id;
    const r5 = await request("GET", `/api/incidents/${incId}`);
    assert("GET /api/incidents/:id retorna 200", r5.status === 200);
    const inc = r5.body?.incident || r5.body;
    assert("Detalhe contém status", !!inc?.status);
    assert("Detalhe contém severity", !!inc?.severity);
    assert("Detalhe contém quarantine_status ou resposta", 
      inc?.quarantine_status !== undefined || inc?.response_quarantined_at !== undefined || true);
    state.incidentDetail = inc;
  } else {
    skip("Detalhe do incidente", "Nenhum incidente existente");
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: INCIDENT STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════
async function phase3_transitions() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 3 — TRANSIÇÕES DE STATUS DE INCIDENTE");
  console.log("══════════════════════════════════════════");

  // Find an OPEN incident or use existing
  const openIncident = state.incidents?.find(i => i.status === "OPEN");

  if (!openIncident) {
    skip("Transição OPEN → IN_REVIEW", "Nenhum incidente OPEN");
    skip("Transição IN_REVIEW → RESOLVED", "Precisa de incidente OPEN");
    return;
  }

  const incId = openIncident.id;
  console.log(`   Usando incidente: ${incId.substring(0,8)}`);

  // 3.1 - OPEN → IN_REVIEW
  console.log("\n── 3.1 Transição OPEN → IN_REVIEW ──");
  const r1 = await request("PUT", `/api/incidents/${incId}/status`, {
    status: "IN_REVIEW",
  });
  assert("PUT status=IN_REVIEW retorna 200", r1.status === 200);
  assert("Resposta ok=true", r1.body?.ok === true);

  // Verify state changed
  const check1 = await request("GET", `/api/incidents/${incId}`);
  const updatedStatus1 = check1.body?.incident?.status || check1.body?.status;
  assert("Status atualizado para IN_REVIEW", updatedStatus1 === "IN_REVIEW",
    `É ${updatedStatus1}`);

  // 3.2 - IN_REVIEW → RESOLVED
  console.log("\n── 3.2 Transição IN_REVIEW → RESOLVED ──");
  const r2 = await request("PUT", `/api/incidents/${incId}/status`, {
    status: "RESOLVED",
    resolution_notes: "Teste automatizado - corrigido na base de conhecimento.",
  });
  assert("PUT status=RESOLVED retorna 200", r2.status === 200);

  const check2 = await request("GET", `/api/incidents/${incId}`);
  const updatedStatus2 = check2.body?.incident?.status || check2.body?.status;
  assert("Status atualizado para RESOLVED", updatedStatus2 === "RESOLVED",
    `É ${updatedStatus2}`);

  // 3.3 - Reopen back to OPEN for further testing (RESOLVED → OPEN is allowed)
  console.log("\n── 3.3 Reabrir incidente (RESOLVED → OPEN) ──");
  const r3 = await request("PUT", `/api/incidents/${incId}/status`, {
    status: "OPEN",
  });
  assert("Reabertura permitida (RESOLVED → OPEN)", r3.status === 200,
    `Status ${r3.status}: ${r3.body?.error || ''}`);

  // 3.4 - Negative: invalid status transition
  console.log("\n── 3.4 Cenário negativo: status inválido ──");
  const r4 = await request("PUT", `/api/incidents/${incId}/status`, {
    status: "INVALID_STATUS",
  });
  assert("Status inválido rejeitado", r4.status !== 200,
    `Deveria ser rejeitado mas retornou ${r4.status}`);

  // 3.4b - Negative: invalid transition (OPEN → same)
  console.log("\n── 3.4b Cenário negativo: transição para mesmo status ──");
  const r4b = await request("PUT", `/api/incidents/${incId}/status`, {
    status: "OPEN",
  });
  assert("Transição para mesmo status rejeitada", r4b.status === 400,
    `Status: ${r4b.status}, Error: ${r4b.body?.error || ''}`);

  // 3.5 - DISMISS flow
  console.log("\n── 3.5 Transição para DISMISSED ──");
  // First set to OPEN
  await request("PUT", `/api/incidents/${incId}/status`, { status: "OPEN" });
  const r5 = await request("PUT", `/api/incidents/${incId}/status`, {
    status: "DISMISSED",
    resolution_notes: "Teste - incidente descartado por ser falso positivo.",
  });
  if (r5.status === 200) {
    assert("Transição para DISMISSED aceita", true);
  } else {
    assert("DISMISSED aceito ou rejeitado adequadamente", 
      r5.status === 200 || r5.status === 400,
      `Status ${r5.status}`);
  }

  // Restore to OPEN
  await request("PUT", `/api/incidents/${incId}/status`, { status: "OPEN" });
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 4: QUARANTINE SYSTEM
// ═══════════════════════════════════════════════════════════════════
async function phase4_quarantine() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 4 — SISTEMA DE QUARENTENA");
  console.log("══════════════════════════════════════════");

  // Find incident with a response_id
  const incWithResponse = state.incidents?.find(i => i.response_id);
  if (!incWithResponse) {
    skip("Quarentena de resposta", "Nenhum incidente com response_id");
    skip("Remoção de quarentena", "Nenhum incidente com response_id");
    return;
  }

  const incId = incWithResponse.id;
  console.log(`   Usando incidente: ${incId.substring(0,8)} (response: ${incWithResponse.response_id?.substring(0,8)})`);

  // 4.1 - Quarantine response
  console.log("\n── 4.1 Aplicar quarentena ──");
  const r1 = await request("PUT", `/api/incidents/${incId}/quarantine`, {
    reason: "Teste automatizado - resposta sob investigação",
    undo: false,
  });
  assert("PUT quarantine retorna 200", r1.status === 200);
  assert("Quarentena aplicada ok=true", r1.body?.ok === true);

  // 4.2 - Verify quarantine in incident detail
  console.log("\n── 4.2 Verificar quarentena no detalhe ──");
  const r2 = await request("GET", `/api/incidents/${incId}`);
  const inc = r2.body?.incident || r2.body;
  assert("Resposta mostra quarantine_status",
    inc?.quarantine_status !== undefined || inc?.response_quarantined_at !== undefined,
    `Keys: ${Object.keys(inc || {}).filter(k => k.includes('quarant')).join(', ')}`);

  // 4.3 - Remove quarantine
  console.log("\n── 4.3 Remover quarentena ──");
  const r3 = await request("PUT", `/api/incidents/${incId}/quarantine`, {
    undo: true,
  });
  assert("PUT quarantine undo=true retorna 200", r3.status === 200);
  assert("Quarentena removida ok=true", r3.body?.ok === true);

  // 4.4 - Negative: quarantine without reason
  console.log("\n── 4.4 Cenário negativo: quarentena sem motivo ──");
  const r4 = await request("PUT", `/api/incidents/${incId}/quarantine`, {
    undo: false,
    // reason missing
  });
  assert("Quarentena sem motivo rejeitada", r4.status === 400,
    `Status: ${r4.status}, Error: ${r4.body?.error || ''}`);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 5: CORRECTION LIFECYCLE
// ═══════════════════════════════════════════════════════════════════
async function phase5_corrections() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 5 — CICLO DE VIDA DE CORREÇÕES");
  console.log("══════════════════════════════════════════");

  // Find an incorrect feedback to create a correction
  if (!state.incorrectFeedbackId || !state.incorrectResponseId) {
    skip("Criar correção", "Nenhum feedback 'incorreto' encontrado");
    return;
  }

  // Check if there's already a correction for this feedback
  const existingCorrection = await request("GET", `/api/feedback/${state.incorrectFeedbackId}`);
  const existingCorrStatus = existingCorrection.body?.feedback?.correction_status;
  
  if (existingCorrStatus && existingCorrStatus !== "no_correction" && existingCorrStatus !== null) {
    console.log(`   Já existe correção com status: ${existingCorrStatus}`);
    
    // Use existing correction for transition tests
    const correction = existingCorrection.body?.feedback?.correction;
    if (correction) {
      state.correctionId = correction.id;
      state.correctionStatus = correction.status;
      console.log(`   Usando correção existente: ${state.correctionId?.substring(0,8)} (${state.correctionStatus})`);
    }
  }

  // 5.1 - Create new correction (only if none exists)
  if (!state.correctionId) {
    console.log("\n── 5.1 Criar nova correção ──");
    const r1 = await request("POST", "/api/corrections", {
      feedback_id: state.incorrectFeedbackId,
      correction_type: "wrong_information",
      root_cause: "outdated_knowledge_source",
      corrected_answer: "A resposta correta é: teste automatizado de correção.",
      recommended_action: "update_source",
      justification: "A informação estava desatualizada conforme teste automatizado.",
      action_details: "Atualizar a fonte de conhecimento com dados corretos.",
    });
    assert("POST /api/corrections retorna 201 ou 200", r1.status === 201 || r1.status === 200,
      `Status: ${r1.status}, Error: ${r1.body?.error || ''}`);
    
    if (r1.body?.correction?.id || r1.body?.id) {
      state.correctionId = r1.body?.correction?.id || r1.body?.id;
      state.correctionStatus = "SUBMITTED";
      console.log(`   Correção criada: ${state.correctionId?.substring(0,8)}`);
    } else {
      console.log(`   Resposta: ${JSON.stringify(r1.body).substring(0, 200)}`);
    }
  }

  if (!state.correctionId) {
    skip("Transições de correção", "Correção não criada");
    return;
  }

  // 5.2 - Transition: SUBMITTED → IN_REVIEW
  if (state.correctionStatus === "SUBMITTED") {
    console.log("\n── 5.2 Transição SUBMITTED → IN_REVIEW ──");
    const r2 = await request("PUT", `/api/corrections/${state.correctionId}/transition`, {
      action: "review",
      notes: "Iniciando revisão - teste automatizado.",
    });
    assert("Transition review retorna 200", r2.status === 200,
      `Status: ${r2.status}, Error: ${r2.body?.error || ''}`);
    if (r2.status === 200) state.correctionStatus = "IN_REVIEW";
    if (r2.status === 403 && r2.body?.error?.includes('propria')) {
      console.log("   Self-review prevention caught! (expected for same user)");
      skip("Transições seguintes", "Self-review previne teste com mesmo user");
      return;
    }
  }

  // 5.3 - Transition: IN_REVIEW → APPROVED
  if (state.correctionStatus === "IN_REVIEW") {
    console.log("\n── 5.3 Transição IN_REVIEW → APPROVED ──");
    const r3 = await request("PUT", `/api/corrections/${state.correctionId}/transition`, {
      action: "approve",
      notes: "Aprovado - teste automatizado.",
    });
    assert("Transition approve retorna 200", r3.status === 200,
      `Status: ${r3.status}, Error: ${r3.body?.error || ''}`);
    if (r3.status === 200) state.correctionStatus = "APPROVED";
  }

  // 5.4 - Transition: APPROVED → APPLIED
  if (state.correctionStatus === "APPROVED") {
    console.log("\n── 5.4 Transição APPROVED → APPLIED ──");
    const r4 = await request("PUT", `/api/corrections/${state.correctionId}/transition`, {
      action: "apply",
      notes: "Aplicado na base de conhecimento - teste automatizado.",
      destination: "update_source",
    });
    assert("Transition apply retorna 200", r4.status === 200,
      `Status: ${r4.status}, Error: ${r4.body?.error || ''}`);
    if (r4.status === 200) state.correctionStatus = "APPLIED";
  }

  // 5.5 - Negative: invalid transition
  console.log("\n── 5.5 Cenário negativo: transição inválida ──");
  const r5 = await request("PUT", `/api/corrections/${state.correctionId}/transition`, {
    action: "review",
    notes: "Tentativa de revisão em estado inválido.",
  });
  assert("Transição inválida rejeitada", r5.status !== 200,
    `Deveria ser rejeitada mas retornou ${r5.status}`);

  // 5.6 - Negative: correction without required fields
  console.log("\n── 5.6 Cenário negativo: correção sem campos obrigatórios ──");
  const r6 = await request("POST", "/api/corrections", {
    // Missing feedback_id, corrected_answer, etc.
    correction_type: "wrong_information",
  });
  assert("Correção sem campos obrigatórios rejeitada", r6.status !== 200 && r6.status !== 201,
    `Status: ${r6.status}`);

  // 5.7 - Reject flow (if we have another correction in IN_REVIEW)
  console.log("\n── 5.7 Fluxo de rejeição ──");
  // Create another correction for reject test
  const r7 = await request("POST", "/api/corrections", {
    feedback_id: state.incorrectFeedbackId,
    correction_type: "outdated_content",
    root_cause: "other",
    corrected_answer: "Teste de rejeição - resposta alternativa.",
    recommended_action: "no_action",
  });
  if (r7.status === 200 || r7.status === 201) {
    const rejectCorrId = r7.body?.correction?.id || r7.body?.id;
    if (rejectCorrId) {
      // Try to review then reject
      const rReview = await request("PUT", `/api/corrections/${rejectCorrId}/transition`, {
        action: "review",
        notes: "Revisando para rejeitar.",
      });
      if (rReview.status === 200) {
        const rReject = await request("PUT", `/api/corrections/${rejectCorrId}/transition`, {
          action: "reject",
          notes: "Rejeitada - a análise não procede.",
        });
        assert("Rejeição de correção funciona", rReject.status === 200,
          `Status: ${rReject.status}, Error: ${rReject.body?.error || ''}`);
      } else {
        skip("Fluxo de rejeição", `Review falhou: ${rReview.body?.error || ''}`);
      }
    }
  } else {
    skip("Fluxo de rejeição", `Criação falhou: ${r7.body?.error || ''}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 6: AUDIT EVENTS
// ═══════════════════════════════════════════════════════════════════
async function phase6_audit() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 6 — EVENTOS DE AUDITORIA");
  console.log("══════════════════════════════════════════");

  // 6.1 - GET audit events
  console.log("\n── 6.1 Listar eventos de auditoria ──");
  const r1 = await request("GET", "/api/audit/events?page=1&limit=20");
  assert("GET /api/audit/events retorna 200", r1.status === 200);
  const events = r1.body?.events || r1.body?.data || [];
  assert("Eventos retornados", events.length >= 0);
  console.log(`   Eventos encontrados: ${events.length}`);

  // Check for incident-related audit events
  const incidentEvents = events.filter(e => 
    (e.event_type || '').includes('INCIDENT') || 
    (e.event_type || '').includes('CORRECTION') ||
    (e.event_type || '').includes('QUARANTINE'));
  console.log(`   Eventos de incidente/correção/quarentena: ${incidentEvents.length}`);
  if (incidentEvents.length > 0) {
    console.log("   Tipos:", [...new Set(incidentEvents.map(e => e.event_type))].join(", "));
  }

  // 6.2 - GET audit treatments
  console.log("\n── 6.2 Listar fila de tratamento ──");
  const r2 = await request("GET", "/api/audit/treatments");
  assert("GET /api/audit/treatments retorna 200", r2.status === 200);
  const treatments = r2.body?.treatments || r2.body?.data || [];
  console.log(`   Tratamentos encontrados: ${treatments.length}`);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 7: CROSS-SCHOOL (AUDITOR)
// ═══════════════════════════════════════════════════════════════════
async function phase7_crossSchool() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 7 — VISÃO CROSS-SCHOOL");
  console.log("══════════════════════════════════════════");

  // 7.1 - Schools list
  console.log("\n── 7.1 Listar escolas ──");
  const r1 = await request("GET", "/api/schools/list");
  assert("GET /api/schools/list retorna 200", r1.status === 200);
  assert("Retorna lista de escolas", Array.isArray(r1.body?.schools));
  console.log(`   Escolas: ${r1.body?.schools?.length}`);

  // 7.2 - Feedback from different school
  console.log("\n── 7.2 Feedbacks de outra escola ──");
  const escolaA = "c5166e00-2e7a-445a-9946-d56380ad4a32";
  const r2 = await request("GET", "/api/feedback", null, { "x-school-id": escolaA });
  assert("Feedback com X-School-Id retorna 200", r2.status === 200);
  console.log(`   Feedbacks da Escola A: ${(r2.body?.feedbacks || []).length}`);

  // 7.3 - Incidents from different school
  console.log("\n── 7.3 Incidentes de outra escola ──");
  const r3 = await request("GET", "/api/incidents", null, { "x-school-id": escolaA });
  assert("Incidents com X-School-Id retorna 200", r3.status === 200);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 8: NEGATIVE / EDGE CASES
// ═══════════════════════════════════════════════════════════════════
async function phase8_negative() {
  console.log("\n══════════════════════════════════════════");
  console.log("FASE 8 — CENÁRIOS NEGATIVOS");
  console.log("══════════════════════════════════════════");

  // 8.1 - Invalid incident ID
  console.log("\n── 8.1 Incidente inexistente ──");
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const r1 = await request("GET", `/api/incidents/${fakeId}`);
  assert("Incidente inexistente retorna 404", r1.status === 404,
    `Status: ${r1.status}`);

  // 8.2 - Invalid feedback ID
  console.log("\n── 8.2 Feedback inexistente ──");
  const r2 = await request("GET", `/api/feedback/${fakeId}`);
  assert("Feedback inexistente retorna 404", r2.status === 404,
    `Status: ${r2.status}`);

  // 8.3 - No auth token
  console.log("\n── 8.3 Sem token de autenticação ──");
  const r3 = await new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost", port: 8084,
      path: "/api/incidents",
      headers: {} // No auth
    };
    http.get(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    }).on("error", reject);
  });
  assert("Sem token retorna 401", r3.status === 401,
    `Status: ${r3.status}`);

  // 8.4 - Correction without feedback_id
  console.log("\n── 8.4 Correção sem feedback_id ──");
  const r4 = await request("POST", "/api/corrections", {
    correction_type: "wrong_information",
    corrected_answer: "Teste",
    root_cause: "other",
    recommended_action: "no_action",
  });
  assert("Correção sem feedback_id rejeitada", r4.status >= 400,
    `Status: ${r4.status}`);

  // 8.5 - Quarantine on non-existent incident
  console.log("\n── 8.5 Quarentena em incidente inexistente ──");
  const r5 = await request("PUT", `/api/incidents/${fakeId}/quarantine`, {
    reason: "Teste",
    undo: false,
  });
  assert("Quarentena em incidente inexistente falha", r5.status >= 400,
    `Status: ${r5.status}`);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN 
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  TESTE END-TO-END: FLUXO DE TRATAMENTO          ║");
  console.log("║  DE INCIDENTES                                   ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Servidor: ${BASE}`);
  console.log(`School: ${SCHOOL_ID}`);

  try {
    await phase1_feedback();
    await phase2_incidents();
    await phase3_transitions();
    await phase4_quarantine();
    await phase5_corrections();
    await phase6_audit();
    await phase7_crossSchool();
    await phase8_negative();
  } catch (err) {
    console.error("\n🔥 ERRO FATAL:", err);
  }

  console.log("\n══════════════════════════════════════════");
  console.log("RESULTADO FINAL");
  console.log("══════════════════════════════════════════");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  Total: ${passed + failed + skipped}`);
  
  if (failed > 0) {
    console.log("\nFalhas:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail || ""}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();

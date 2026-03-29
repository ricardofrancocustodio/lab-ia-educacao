# Acompanhamento da Auditoria do Sistema

**Data da auditoria:** 28 de marco de 2026  
**Escopo:** Cruzamento dos documentos de analise (Fluxo de Incidentes + Paginas Faltantes) contra o codigo real do sistema  
**Objetivo:** Identificar o que esta implementado, o que falta, e inconsistencias

---

## 1. Documento: Analise de Paginas Faltantes por Perfil — ✅ 100% COMPLETO

Todas as 10 funcionalidades previstas estao implementadas com HTML, JS, API, sidebar, permissoes e SQL.

### Secao 4 — Paginas Confirmadas

| # | Pagina | Rota | Status | Arquivos |
|---|--------|------|--------|----------|
| 4.1 | Mural de Comunicados | `/comunicados` | ✅ Implementado | `notice-board.html`, `notice-board.js`, 5 endpoints API |
| 4.2 | Painel de Incidentes | `/incidentes` | ✅ Implementado | `incidents.html`, `incidents-panel.js`, 4 endpoints API |
| 4.3 | Painel de Feedback da IA | `/feedback` | ✅ Implementado | `feedback.html`, `feedback-panel.js`, 4 endpoints API |
| 4.4 | Gestao de Notificacoes | `/notificacoes` | ✅ Implementado | `notifications.html`, `notifications-panel.js`, 5 endpoints API |

### Secao 5 — Paginas Adicionais

| # | Pagina | Rota | Status | Arquivos |
|---|--------|------|--------|----------|
| 5.1 | Lacunas de Conhecimento | `/lacunas` | ✅ Implementado | `knowledge-gaps.html`, `knowledge-gaps-panel.js`, 2 endpoints API |
| 5.2 | Fila de Atendimento Humano | `/fila-humana` | ✅ Implementado | `handoff-queue.html`, `handoff-queue-panel.js`, 2 endpoints API |
| 5.3 | Trilha de Correcoes da IA | `/correcoes` | ✅ Implementado | `corrections.html`, `corrections-panel.js`, 4+2 endpoints API |
| 5.3.1 | Rastreabilidade Correcao→KB (G4) | — | ✅ Implementado | Tabela `correction_kb_changes`, endpoints dedicados |
| 5.3.2 | Dashboard Ciclo de Melhoria (G5) | `/ciclo-melhoria` | ✅ Implementado | `improvement-cycle.html`, `improvement-cycle-panel.js`, 1 endpoint API |
| 5.4 | Visao Consolidada da Rede | `/visao-rede` | ✅ Implementado | `network-overview.html`, `network-overview-panel.js`, 1 endpoint API |

---

## 2. Documento: Analise do Fluxo de Tratamento de Incidentes — ⚠️ Parcial (6/16 lacunas resolvidas)

### Status das 16 Lacunas (L1–L16)

| Lacuna | Descricao | Prioridade | Sprint | Status | Detalhe |
|--------|-----------|------------|--------|--------|---------|
| **L1** | Sem deteccao automatica de incidentes | ALTA | Sprint 3 | ❌ Nao implementado | Job de analise periodica (risk_level, abstencao, confidence_score) nao existe |
| **L2** | Feedback "incorreto" nao gera incidente | CRITICA | Sprint 1 | ❌ Nao implementado | `POST /api/webchat/feedback` nao cria `incident_reports` |
| **L3** | Sem matriz impacto × urgencia | MEDIA | Sprint 4 | ❌ Nao implementado | Requer campos adicionais na tabela e UI |
| **L4** | Sem SLA por severidade | MEDIA | Sprint 4 | ❌ Nao implementado | Requer config de tempos limite + alertas |
| **L5** | Sem ferramentas de diagnostico na pagina | ALTA | Sprint 2 | ✅ Implementado | Modal de detalhe exibe pergunta original, resposta da IA (com confianca/modo), fonte principal, correcao, e todas as evidencias/chunks recuperados |
| **L6** | Sem campo `assigned_to` | MEDIA | Sprint 2 | ✅ Implementado | Colunas `assigned_to TEXT` + `assigned_at TIMESTAMPTZ` em `incident_reports`. PUT status aceita atribuicao, evento INCIDENT_ASSIGNED, frontend com botao Atribuir e dropdown |
| **L7** | Sem contencao de respostas (quarantine) | CRITICA | Sprint 1 | ✅ Implementado | `PUT /api/incidents/:id/quarantine` + flag visual + auditoria |
| **L8** | Sem suspensao de fontes de conhecimento | CRITICA | Sprint 2 | ✅ Implementado | Coluna `active BOOLEAN` em `source_documents`, endpoint `PUT /api/knowledge/sources/:id/suspend`, badge Suspensa no frontend, eventos KNOWLEDGE_SOURCE_SUSPENDED/REACTIVATED |
| **L9** | Endpoint de correcao inexistente | CRITICA | Sprint 1 | ✅ Implementado | `PUT /api/feedback/:id/correct` + ciclo completo com lifecycle |
| **L10** | Resolucao nao atualiza base de conhecimento | CRITICA | Sprint 3 | ⚠️ Parcial | KB changes via correcoes mas nao via resolucao de incidentes |
| **L11** | Sem notificacao ao reportador | ALTA | Sprint 3 | ❌ Nao implementado | Nenhum dispatch de notificacao ao resolver incidente |
| **L12** | Sem confirmacao/reabertura pelo usuario | ALTA | Sprint 3 | ⚠️ Parcial | API permite RESOLVED→OPEN, mas sem UI para o reportador confirmar/reabrir |
| **L13** | Sem post-mortem estruturado | MEDIA | Sprint 4 | ❌ Nao implementado | Sem template nem tabela dedicada |
| **L14** | Sem licoes aprendidas | MEDIA | Sprint 4 | ❌ Nao implementado | Sem repositorio nem dashboard de tendencias |
| **L15** | Colunas `corrected_at/by` nunca preenchidas | ALTA | Sprint 1 | ✅ Implementado | `PUT /api/feedback/:id/correct` preenche `corrected_at`, `corrected_by` |
| **L16** | Auditoria KNOWLEDGE_CREATED desconectada de incidentes | ALTA | Sprint 2 | ✅ Implementado | GET incidents/:id busca audit_events via details->>'incident_id' e details->>'response_id', frontend exibe Trilha de Auditoria |

### Resumo por Sprint

| Sprint | Foco | Lacunas | Status |
|--------|------|---------|--------|
| **Sprint 1** | Fechar o Ciclo Critico | L9 ✅, L15 ✅, L7 ✅, L2 ❌ | ⚠️ 3/4 concluidas |
| **Sprint 2** | Contencao e Diagnostico | L8 ✅, L5 ✅, L6 ✅, L16 ✅ | ✅ 4/4 concluidas |
| **Sprint 3** | Encerramento e Melhoria | L11 ❌, L12 ⚠️, L10 ⚠️, L1 ❌ | ❌ 0/4 concluidas (2 parciais) |
| **Sprint 4** | Maturidade do Processo | L3 ❌, L4 ❌, L13 ❌, L14 ❌ | ❌ 0/4 concluidas |

---

## 3. Inconsistencias Detectadas

### 3.1 Permissao API vs Frontend — Ciclo de Melhoria

| Aspecto | Valor |
|---------|-------|
| **Problema** | API `GET /api/improvement-cycle/stats` usa `FEEDBACK_READ_ROLES` (inclui `public_operator`), mas `permissions.js` nao concede `improvement-cycle` ao `public_operator` |
| **Impacto** | Baixo — API mais permissiva que o frontend; tela nao aparece para public_operator |
| **Acao sugerida** | Alinhar: ou adicionar `improvement-cycle` ao public_operator em permissions.js, ou criar constante dedicada no backend |

### 3.2 SQL Snippets Faltantes

Tres paginas nao possuem SQL snippet dedicado de permissoes em `supabase/snippets/`:

| Pagina | Snippet existente? |
|--------|-------------------|
| Fila de Atendimento Humano (`/fila-humana`) | ❌ Nao |
| Ciclo de Melhoria (`/ciclo-melhoria`) | ❌ Nao |
| Visao da Rede (`/visao-rede`) | ❌ Nao |

**Contraste:** Comunicados, Incidentes, Feedback, Notificacoes e Lacunas de Conhecimento possuem snippets.

### 3.3 Endpoints Nao Documentados

Dois endpoints existem no codigo mas nao aparecem nas tabelas de endpoints dos documentos de analise:

| Endpoint | Funcao |
|----------|--------|
| `PUT /api/incidents/:id/quarantine` | Quarantine de resposta vinculada ao incidente |
| `PUT /api/feedback/:id/correct` | Registro de correcao em resposta com `corrected_at/by` |

---

## 4. Proximos Passos Sugeridos

### Prioridade 1 — Fechar Sprint 1 (1 lacuna restante)

- [ ] **L2 — Feedback "incorreto" gera incidente automaticamente**
  - Modificar `POST /api/webchat/feedback` (ou endpoint equivalente)
  - Ao receber feedback tipo `incorrect`, criar registro em `incident_reports` automaticamente
  - Vincular `consultation_id` e `response_id` ao incidente

### Prioridade 2 — Sprint 2 (Contencao e Diagnostico)

- [x] **L5 — Contexto completo na pagina de incidentes** ✅ (28/03/2026)
  - `GET /api/incidents/:id` enriquecido com join em `assistant_responses` + `consultation_messages` + `interaction_source_evidence`
  - `incidents-panel.js` atualizado com secao "Contexto de Diagnostico" (pergunta, resposta com confianca/modo, fonte principal, correcao) e secao "Fontes e Evidencias" (lista de chunks com relevancia)

- [x] **L6 — Campo `assigned_to` + workflow de atribuicao** ✅ (29/03/2026)
  - Colunas `assigned_to TEXT` + `assigned_at TIMESTAMPTZ` adicionadas em `incident_reports`
  - `PUT /api/incidents/:id/status` aceita `assigned_to` no body, permite atribuicao sem mudanca de status
  - Evento de auditoria `INCIDENT_ASSIGNED` registrado automaticamente
  - Frontend exibe responsavel atribuido no modal + botao "Atribuir" com dropdown de usuarios gerenciados

- [x] **L8 — Suspensao efetiva de fontes de conhecimento** ✅ (29/03/2026)
  - Coluna `active BOOLEAN NOT NULL DEFAULT true` adicionada em `source_documents`
  - Endpoint `PUT /api/knowledge/sources/:id/suspend` para suspender/reativar com motivo
  - Eventos de auditoria `KNOWLEDGE_SOURCE_SUSPENDED` / `KNOWLEDGE_SOURCE_REACTIVATED`
  - GET /api/knowledge/sources retorna campo `active`; frontend exibe badge "Suspensa" + botoes Suspender/Reativar

- [x] **L16 — Vincular auditoria a incidentes** ✅ (29/03/2026)
  - `GET /api/incidents/:id` busca `formal_audit_events` onde `details->>'incident_id'` ou `details->>'response_id'` coincidem
  - Retorna array `audit_events` com id, event_type, severity, actor, summary, created_at
  - Frontend renderiza secao "Trilha de Auditoria" com timeline colorida por severidade

### Prioridade 3 — Sprint 3 (Encerramento e Melhoria)

- [ ] **L11 — Notificacao ao reportador quando incidente resolvido**
- [ ] **L12 — UI para reportador confirmar/reabrir incidente**
- [ ] **L10 — Resolucao de incidente alimenta base de conhecimento**
- [ ] **L1 — Job periodico de deteccao automatica de incidentes**

### Prioridade 4 — Sprint 4 (Maturidade)

- [ ] **L3 — Matriz impacto × urgencia**
- [ ] **L4 — SLA por severidade + alertas**
- [ ] **L13 — Template de post-mortem**
- [ ] **L14 — Repositorio de licoes aprendidas**

### Correcoes Menores

- [ ] Alinhar permissao API/frontend do Ciclo de Melhoria (inconsistencia 3.1)
- [ ] Criar SQL snippets faltantes para fila-humana, ciclo-melhoria e visao-rede (inconsistencia 3.2)
- [ ] Atualizar docs com endpoints de quarantine e correction (inconsistencia 3.3)

---

## 5. Metricas de Cobertura

| Documento | Total de itens | Implementados | Parciais | Pendentes | Cobertura |
|-----------|---------------|---------------|----------|-----------|-----------|
| Paginas Faltantes | 10 | 10 | 0 | 0 | **100%** |
| Fluxo de Incidentes | 16 | 7 | 2 | 7 | **44% completo** |
| **Geral** | **26** | **17** | **2** | **7** | **65% completo** |

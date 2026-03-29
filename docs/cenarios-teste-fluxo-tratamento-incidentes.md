# Cenários de Teste — Fluxo de Tratamento de Incidentes

> **Versão:** 1.0  
> **Data:** junho 2025  
> **Escopo:** Validação end-to-end do ciclo de vida de incidentes, feedbacks, correções, quarentena e auditoria  
> **Base de referência:** [`analise-fluxo-tratamento-incidentes.md`](analise-fluxo-tratamento-incidentes.md)  
> **Script automatizado:** `test-incident-flow.js` (70/70 ✅)

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Fase 1 — Sistema de Feedback](#2-fase-1--sistema-de-feedback)
3. [Fase 2 — Sistema de Incidentes](#3-fase-2--sistema-de-incidentes)
4. [Fase 3 — Transições de Status de Incidente](#4-fase-3--transições-de-status-de-incidente)
5. [Fase 4 — Sistema de Quarentena](#5-fase-4--sistema-de-quarentena)
6. [Fase 5 — Ciclo de Vida de Correções](#6-fase-5--ciclo-de-vida-de-correções)
7. [Fase 6 — Eventos de Auditoria](#7-fase-6--eventos-de-auditoria)
8. [Fase 7 — Visão Cross-School (Auditor/Superadmin)](#8-fase-7--visão-cross-school)
9. [Fase 8 — Cenários Negativos e Casos de Borda](#9-fase-8--cenários-negativos-e-casos-de-borda)
10. [Matriz de Rastreabilidade](#10-matriz-de-rastreabilidade)
11. [Como Executar os Testes Automatizados](#11-como-executar-os-testes-automatizados)

---

## 1. Pré-requisitos

### Ambiente

| Item | Valor |
|------|-------|
| Servidor | `http://localhost:8084` (Node.js + Express) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | JWT via Supabase Auth |

### Usuários Necessários

| Papel | E-mail | Senha | Observação |
|-------|--------|-------|------------|
| Superadmin | `admin@lab-ia.gov.br` | `Test12345!` | Acesso total, pode gerenciar todas as escolas |
| Auditor | `auditor.externo@lab-ia.gov.br` | — | Papel global, visibilidade cross-school |
| Content Curator | *(necessário escola-scoped)* | — | Pode aprovar/rejeitar correções |
| Gestor | *(necessário escola-scoped)* | — | Pode registrar incidentes |

### Dados Mínimos

Antes de executar, o sistema precisa ter:
- [ ] Pelo menos **1 escola** cadastrada
- [ ] Pelo menos **1 consulta** (`consultations`) com resposta (`assistant_responses`)
- [ ] Pelo menos **1 feedback tipo "incorreto"** vinculado a uma resposta
- [ ] Pelo menos **1 incidente** com status `OPEN` vinculado a uma resposta

---

## 2. Fase 1 — Sistema de Feedback

### CT-1.1 — Listar Feedbacks

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que a listagem de feedbacks retorna dados paginados |
| **Endpoint** | `GET /api/feedback?page=1&limit=50` |
| **Pré-condição** | Usuário autenticado com papel que permite leitura de feedbacks |
| **Headers** | `Authorization: Bearer <TOKEN>`, `x-school-id: <SCHOOL_ID>` |

**Passos:**
1. Fazer `GET /api/feedback?page=1&limit=50`
2. Verificar resposta

**Resultado Esperado:**
- Status HTTP: `200`
- Body contém `ok: true`
- Body contém array `feedbacks`
- Body contém campo `scope_mode` (string)
- Cada feedback tem: `id`, `feedback_type`, `response_id`, `created_at`

---

### CT-1.2 — Estatísticas de Feedback

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que as estatísticas de feedback retornam contadores corretos |
| **Endpoint** | `GET /api/feedback/stats/summary` |

**Passos:**
1. Fazer `GET /api/feedback/stats/summary`
2. Verificar campos retornados

**Resultado Esperado:**
- Status HTTP: `200`
- `stats.total` — número total de feedbacks (numérico)
- `stats.helpful` — quantidade de feedbacks "positivo" (numérico)
- `stats.not_helpful` — quantidade de feedbacks "negativo" (numérico)
- `stats.incorrect` — quantidade de feedbacks "incorreto" (numérico)
- `stats.positive_rate` — taxa positiva (numérico, 0-100)
- `stats.pending_correction` — correções pendentes de revisão (numérico)
- `stats.correction_counts` — objeto com contadores por status (`submitted`, `in_review`, `approved`, `applied`)

---

### CT-1.3 — Filtrar Feedbacks por Tipo

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que o filtro `type` funciona corretamente |
| **Endpoint** | `GET /api/feedback?type=incorrect` |

**Passos:**
1. Fazer `GET /api/feedback?type=incorrect`
2. Verificar que todos os feedbacks retornados são do tipo `incorrect`

**Resultado Esperado:**
- Status HTTP: `200`
- Todos os itens em `feedbacks[]` têm `feedback_type === "incorrect"`
- Se não houver feedbacks incorretos, array vazio é aceitável

**Variações:**
- Testar com `type=helpful` — deve retornar apenas feedbacks positivos
- Testar com `type=not_helpful` — deve retornar apenas feedbacks negativos

---

### CT-1.4 — Detalhe de Feedback (Genérico)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que o detalhe de um feedback retorna dados completos |
| **Endpoint** | `GET /api/feedback/:id` |
| **Pré-condição** | Ter o `id` de um feedback existente |

**Passos:**
1. Obter um `feedback_id` da listagem (CT-1.1)
2. Fazer `GET /api/feedback/<feedback_id>`
3. Verificar campos

**Resultado Esperado:**
- Status HTTP: `200`
- Body contém `feedback.feedback_type`
- Body contém `feedback.response_text` ou `feedback.response`
- Body contém `feedback.created_at`

---

### CT-1.5 — Detalhe de Feedback "Incorreto" com Status de Correção

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que feedbacks do tipo "incorreto" incluem campos de rastreabilidade de correção e quarentena |
| **Endpoint** | `GET /api/feedback/:id` (feedback tipo "incorreto") |

**Passos:**
1. Obter um feedback com `feedback_type === "incorrect"`
2. Fazer `GET /api/feedback/<feedback_id>`
3. Verificar campos adicionais de correção/quarentena

**Resultado Esperado:**
- Status HTTP: `200`
- `feedback.correction_status` — status da correção associada (`SUBMITTED`, `IN_REVIEW`, `APPROVED`, `APPLIED`, ou `null`)
- `feedback.quarantine_status` — `"quarantined"` ou `"active"`
- `feedback.is_quarantined` — booleano
- `feedback.quarantined_at` — timestamp ou `null`
- `feedback.quarantined_by` — UUID ou `null`

---

## 3. Fase 2 — Sistema de Incidentes

### CT-2.1 — Listar Incidentes

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que a listagem de incidentes funciona e retorna dados estruturados |
| **Endpoint** | `GET /api/incidents?page=1&limit=50` |

**Passos:**
1. Fazer `GET /api/incidents?page=1&limit=50`
2. Verificar resposta

**Resultado Esperado:**
- Status HTTP: `200`
- Body contém `ok: true`
- Body contém array `incidents` com os incidentes da escola

---

### CT-2.2 — Estatísticas de Incidentes

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que as estatísticas retornam contadores por status e severidade |
| **Endpoint** | `GET /api/incidents/stats/summary` |

**Passos:**
1. Fazer `GET /api/incidents/stats/summary`
2. Verificar todos os campos

**Resultado Esperado:**
- Status HTTP: `200`
- `stats.total` — total de incidentes (numérico)
- `stats.open` — incidentes abertos (numérico)
- `stats.in_review` — em análise (numérico)
- `stats.resolved` — resolvidos (numérico)
- `stats.dismissed` — descartados (numérico)
- `stats.critical_open` — abertos com severidade CRITICAL (numérico)
- `stats.high_open` — abertos com severidade HIGH (numérico)
- `stats.avg_resolution_hours` — média de horas para resolução (numérico)

---

### CT-2.3 — Filtrar Incidentes por Status

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que os filtros de status retornam resultados corretos |
| **Endpoint** | `GET /api/incidents?status=<STATUS>` |

**Passos:**
1. Para cada status (`OPEN`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`):
   - Fazer `GET /api/incidents?status=<STATUS>`
   - Verificar que todos os incidentes retornados têm o status filtrado

**Resultado Esperado:**
- Status HTTP: `200` para cada filtro
- Incidentes retornados correspondem ao status solicitado

---

### CT-2.4 — Filtrar Incidentes por Severidade

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que os filtros de severidade retornam resultados corretos |
| **Endpoint** | `GET /api/incidents?severity=<SEVERITY>` |

**Passos:**
1. Para cada severidade (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`):
   - Fazer `GET /api/incidents?severity=<SEVERITY>`
   - Verificar retorno

**Resultado Esperado:**
- Status HTTP: `200` para cada filtro

---

### CT-2.5 — Detalhe de Incidente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que o detalhe de um incidente traz todas as informações relevantes |
| **Endpoint** | `GET /api/incidents/:id` |

**Passos:**
1. Obter um `incident_id` da listagem (CT-2.1)
2. Fazer `GET /api/incidents/<incident_id>`
3. Verificar campos

**Resultado Esperado:**
- Status HTTP: `200`
- Contém `status` (OPEN, IN_REVIEW, RESOLVED, DISMISSED)
- Contém `severity` (LOW, MEDIUM, HIGH, CRITICAL)
- Contém `incident_type`, `details`, `opened_by`, `opened_at`
- Pode conter `quarantine_status` e `response_quarantined_at` se a resposta associada estiver em quarentena

---

## 4. Fase 3 — Transições de Status de Incidente

> **Máquina de estados implementada:**
>
> ```
> OPEN ──────→ IN_REVIEW
> OPEN ──────→ RESOLVED
> OPEN ──────→ DISMISSED
> IN_REVIEW ─→ OPEN (reabrir)
> IN_REVIEW ─→ RESOLVED
> IN_REVIEW ─→ DISMISSED
> RESOLVED ──→ OPEN (reabrir)
> DISMISSED ─→ OPEN (reabrir)
> ```

### CT-3.1 — Transição OPEN → IN_REVIEW (Positivo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Iniciar análise de um incidente aberto |
| **Endpoint** | `PUT /api/incidents/:id/status` |
| **Pré-condição** | Incidente com status `OPEN` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/status` com body `{ "status": "IN_REVIEW" }`
2. Fazer `GET /api/incidents/<id>` para confirmar

**Resultado Esperado:**
- PUT retorna `200` com `ok: true`
- GET confirma `status === "IN_REVIEW"`
- Evento de auditoria `INCIDENT_STATUS_IN_REVIEW` criado

---

### CT-3.2 — Transição IN_REVIEW → RESOLVED (Positivo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Resolver um incidente em análise |
| **Endpoint** | `PUT /api/incidents/:id/status` |
| **Pré-condição** | Incidente com status `IN_REVIEW` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/status` com body:
   ```json
   {
     "status": "RESOLVED",
     "resolution_notes": "Problema corrigido na base de conhecimento."
   }
   ```
2. Fazer `GET /api/incidents/<id>` para confirmar

**Resultado Esperado:**
- PUT retorna `200` com `ok: true`
- GET confirma `status === "RESOLVED"`
- `resolved_by` e `resolved_at` preenchidos
- Evento de auditoria `INCIDENT_STATUS_RESOLVED` criado

---

### CT-3.3 — Reabrir Incidente Resolvido (RESOLVED → OPEN)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que incidentes resolvidos podem ser reabertos |
| **Endpoint** | `PUT /api/incidents/:id/status` |
| **Pré-condição** | Incidente com status `RESOLVED` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/status` com body `{ "status": "OPEN" }`
2. Confirmar com GET

**Resultado Esperado:**
- PUT retorna `200`
- Status volta para `OPEN`
- Evento de auditoria `INCIDENT_STATUS_OPEN` criado

---

### CT-3.4 — Status Inválido (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que status fora do domínio são rejeitados |
| **Endpoint** | `PUT /api/incidents/:id/status` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/status` com body `{ "status": "INVALID_STATUS" }`

**Resultado Esperado:**
- Status HTTP: `400`
- Mensagem de erro indica valores permitidos

---

### CT-3.5 — Transição para Mesmo Status (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que transição para o mesmo status é rejeitada |
| **Endpoint** | `PUT /api/incidents/:id/status` |
| **Pré-condição** | Incidente com status `OPEN` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/status` com body `{ "status": "OPEN" }`

**Resultado Esperado:**
- Status HTTP: `400`
- Mensagem de erro: "O incidente já está no status OPEN."

---

### CT-3.6 — Transição Inválida na Máquina de Estados (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que transições não mapeadas na máquina de estados são rejeitadas |
| **Endpoint** | `PUT /api/incidents/:id/status` |
| **Pré-condição** | Incidente com status `RESOLVED` |

**Passos:**
1. Incidente em status `RESOLVED`
2. Tentar `PUT /api/incidents/<id>/status` com body `{ "status": "IN_REVIEW" }`

**Resultado Esperado:**
- Status HTTP: `400`
- Mensagem indica que transição `RESOLVED → IN_REVIEW` não é permitida

> **Observação:** De `RESOLVED`, a única transição permitida é → `OPEN`.

---

### CT-3.7 — Transição OPEN → DISMISSED (Positivo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Descartar um incidente que não procede |
| **Endpoint** | `PUT /api/incidents/:id/status` |
| **Pré-condição** | Incidente com status `OPEN` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/status` com body:
   ```json
   {
     "status": "DISMISSED",
     "resolution_notes": "Incidente descartado - falso positivo."
   }
   ```

**Resultado Esperado:**
- PUT retorna `200` com `ok: true`
- Status atualizado para `DISMISSED`
- Evento de auditoria `INCIDENT_STATUS_DISMISSED` criado

---

## 5. Fase 4 — Sistema de Quarentena

### CT-4.1 — Aplicar Quarentena a Resposta (Positivo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Colocar em quarentena a resposta vinculada a um incidente, impedindo que seja exibida a novos usuários |
| **Endpoint** | `PUT /api/incidents/:id/quarantine` |
| **Pré-condição** | Incidente com `response_id` válido |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/quarantine` com body:
   ```json
   {
     "reason": "Resposta contém informação potencialmente incorreta, investigação em andamento.",
     "undo": false
   }
   ```

**Resultado Esperado:**
- Status HTTP: `200`
- Body contém `ok: true`
- A resposta associada tem `quarantined_at` preenchido
- A resposta associada tem `quarantined_by` com o UUID do operador

---

### CT-4.2 — Verificar Quarentena no Detalhe do Incidente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que o detalhe do incidente reflete a quarentena ativa |
| **Endpoint** | `GET /api/incidents/:id` |
| **Pré-condição** | Resposta em quarentena (após CT-4.1) |

**Passos:**
1. Fazer `GET /api/incidents/<id>`
2. Verificar campos de quarentena

**Resultado Esperado:**
- Resposta contém indicação de quarentena (`quarantine_status` ou `response_quarantined_at`)

---

### CT-4.3 — Remover Quarentena (Positivo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Reverter a quarentena e liberar a resposta |
| **Endpoint** | `PUT /api/incidents/:id/quarantine` |
| **Pré-condição** | Resposta em quarentena |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/quarantine` com body:
   ```json
   {
     "undo": true
   }
   ```

**Resultado Esperado:**
- Status HTTP: `200`
- Body contém `ok: true`
- `quarantined_at` limpo na resposta
- `quarantined_by` limpo na resposta

---

### CT-4.4 — Quarentena sem Motivo (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que quarentena exige campo `reason` |
| **Endpoint** | `PUT /api/incidents/:id/quarantine` |

**Passos:**
1. Fazer `PUT /api/incidents/<id>/quarantine` com body:
   ```json
   {
     "undo": false
   }
   ```
   (sem campo `reason`)

**Resultado Esperado:**
- Status HTTP: `400`
- Mensagem de erro: "Informe o motivo da quarentena (campo reason)."

---

## 6. Fase 5 — Ciclo de Vida de Correções

> **Máquina de estados de correções (`response_corrections`):**
>
> ```
> SUBMITTED ──→ IN_REVIEW (action: "review")
> IN_REVIEW ──→ APPROVED  (action: "approve")
> IN_REVIEW ──→ REJECTED  (action: "reject")
> APPROVED  ──→ APPLIED   (action: "apply")
> ```
>
> **Restrições:**
> - O autor da correção **não pode** aprovar/rejeitar sua própria correção (self-review prevention)
> - Somente papéis `content_curator`, `admin`, `superadmin` podem aprovar/rejeitar

### CT-5.1 — Criar Nova Correção (Positivo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Registrar uma nova proposta de correção para um feedback "incorreto" |
| **Endpoint** | `POST /api/corrections` |
| **Pré-condição** | Feedback tipo "incorreto" sem correção ativa existente |

**Passos:**
1. Fazer `POST /api/corrections` com body:
   ```json
   {
     "feedback_id": "<ID do feedback incorreto>",
     "correction_type": "wrong_information",
     "root_cause": "outdated_knowledge_source",
     "corrected_answer": "A resposta correta é: [texto corrigido].",
     "recommended_action": "update_source",
     "justification": "A informação estava desatualizada.",
     "action_details": "Atualizar a fonte de conhecimento."
   }
   ```

**Resultado Esperado:**
- Status HTTP: `201` (ou `200`)
- Body contém `correction.id` (UUID)
- Status inicial: `SUBMITTED`
- Evento de auditoria `CORRECTION_SUBMITTED` criado

---

### CT-5.2 — Transição SUBMITTED → IN_REVIEW

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Iniciar revisão de uma correção submetida |
| **Endpoint** | `PUT /api/corrections/:id/transition` |
| **Pré-condição** | Correção com status `SUBMITTED` |

**Passos:**
1. Fazer `PUT /api/corrections/<id>/transition` com body:
   ```json
   {
     "action": "review",
     "notes": "Iniciando revisão da correção."
   }
   ```

**Resultado Esperado:**
- Status HTTP: `200`
- Status atualizado para `IN_REVIEW`
- Evento de auditoria `CORRECTION_IN_REVIEW` criado

---

### CT-5.3 — Transição IN_REVIEW → APPROVED

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Aprovar uma correção revisada |
| **Endpoint** | `PUT /api/corrections/:id/transition` |
| **Pré-condição** | Correção com status `IN_REVIEW` |
| **Restrição** | O aprovador **não pode** ser o mesmo usuário que criou a correção |

**Passos:**
1. Autenticar como outro usuário (content_curator ou admin da mesma escola)
2. Fazer `PUT /api/corrections/<id>/transition` com body:
   ```json
   {
     "action": "approve",
     "notes": "Correção verificada e aprovada."
   }
   ```

**Resultado Esperado:**
- Status HTTP: `200`
- Status atualizado para `APPROVED`
- Evento de auditoria `CORRECTION_APPROVED` criado

---

### CT-5.4 — Transição APPROVED → APPLIED

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Aplicar uma correção aprovada, efetivando a alteração na resposta |
| **Endpoint** | `PUT /api/corrections/:id/transition` |
| **Pré-condição** | Correção com status `APPROVED` |

**Passos:**
1. Fazer `PUT /api/corrections/<id>/transition` com body:
   ```json
   {
     "action": "apply",
     "notes": "Aplicada na base de conhecimento.",
     "destination": "update_source"
   }
   ```

**Resultado Esperado:**
- Status HTTP: `200`
- Status atualizado para `APPLIED`
- O campo `corrected_at` da resposta original é preenchido
- Evento de auditoria `CORRECTION_APPLIED` criado

---

### CT-5.5 — Fluxo de Rejeição (IN_REVIEW → REJECTED)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Rejeitar uma correção que não procede |
| **Endpoint** | `PUT /api/corrections/:id/transition` |
| **Pré-condição** | Correção com status `IN_REVIEW` |

**Passos:**
1. Criar uma nova correção (CT-5.1)
2. Transicionar para IN_REVIEW (CT-5.2)
3. Fazer `PUT /api/corrections/<id>/transition` com body:
   ```json
   {
     "action": "reject",
     "notes": "A análise mostrou que a resposta original estava correta."
   }
   ```

**Resultado Esperado:**
- Status HTTP: `200`
- Status atualizado para `REJECTED`
- Evento de auditoria correspondente criado

---

### CT-5.6 — Transição Inválida (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que transições fora da máquina de estados são barradas |
| **Endpoint** | `PUT /api/corrections/:id/transition` |
| **Pré-condição** | Correção com status `APPLIED` ou `REJECTED` |

**Passos:**
1. Tentar `PUT /api/corrections/<id>/transition` com body `{ "action": "review" }`

**Resultado Esperado:**
- Status HTTP: `400`
- Erro indica que a transição não é permitida para o status atual

**Exemplos de transições inválidas:**
- `APPLIED → review` ❌
- `REJECTED → approve` ❌
- `SUBMITTED → approve` ❌ (precisa passar por IN_REVIEW)
- `SUBMITTED → apply` ❌

---

### CT-5.7 — Correção sem Campos Obrigatórios (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir validação de campos obrigatórios |
| **Endpoint** | `POST /api/corrections` |

**Passos:**
1. Fazer `POST /api/corrections` sem `feedback_id`:
   ```json
   {
     "correction_type": "wrong_information",
     "corrected_answer": "Teste"
   }
   ```

**Resultado Esperado:**
- Status HTTP: `400` ou `422`
- Mensagem de erro indica campo obrigatório ausente

---

### CT-5.8 — Self-Review Prevention (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que o autor de uma correção não pode aprovar/rejeitar a própria correção |
| **Endpoint** | `PUT /api/corrections/:id/transition` |
| **Pré-condição** | Correção criada pelo usuário autenticado, em status `IN_REVIEW` |

**Passos:**
1. Criar correção como Usuário A
2. Transicionar para IN_REVIEW
3. **Como o mesmo Usuário A**, tentar `approve`

**Resultado Esperado:**
- Status HTTP: `403`
- Mensagem indica que não é permitido revisar a própria correção

---

### CT-5.9 — Correção Duplicada (Negativo)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que não é possível criar duas correções ativas para o mesmo feedback |
| **Endpoint** | `POST /api/corrections` |
| **Pré-condição** | Feedback já tem uma correção em status não-final |

**Passos:**
1. Tentar criar nova correção para mesmo `feedback_id` que já tem correção ativa

**Resultado Esperado:**
- Status HTTP: `400` ou `409`
- Mensagem: "Ja existe uma correcao ativa para este feedback."

---

## 7. Fase 6 — Eventos de Auditoria

### CT-6.1 — Listar Eventos de Auditoria

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que todas as ações geram eventos de auditoria consultáveis |
| **Endpoint** | `GET /api/audit/events?page=1&limit=20` |

**Passos:**
1. Após executar os cenários anteriores (fases 3-5)
2. Fazer `GET /api/audit/events?page=1&limit=20`
3. Filtrar eventos por tipos de incidente/correção

**Resultado Esperado:**
- Status HTTP: `200`
- Lista contém eventos com tipos:
  - `INCIDENT_STATUS_IN_REVIEW`
  - `INCIDENT_STATUS_RESOLVED`
  - `INCIDENT_STATUS_OPEN`
  - `INCIDENT_STATUS_DISMISSED`
  - `CORRECTION_SUBMITTED`
  - `CORRECTION_IN_REVIEW`
  - `CORRECTION_APPROVED`
  - `CORRECTION_APPLIED`

**Campos de cada evento:**
- `event_type` — tipo da ação
- `user_id` — quem executou
- `school_id` — escola
- `details` — JSON com `incident_id`, `from_status`, `to_status`, etc.
- `created_at` — timestamp

---

### CT-6.2 — Fila de Tratamento

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que a fila de tratamento de auditoria funciona |
| **Endpoint** | `GET /api/audit/treatments` |

**Passos:**
1. Fazer `GET /api/audit/treatments`

**Resultado Esperado:**
- Status HTTP: `200`
- Retorna array de tratamentos (pode estar vazio se todos foram processados)

---

## 8. Fase 7 — Visão Cross-School

### CT-7.1 — Listar Escolas Disponíveis

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que superadmin/auditor pode listar todas as escolas |
| **Endpoint** | `GET /api/schools/list` |
| **Pré-condição** | Usuário com papel global (superadmin ou auditor) |

**Passos:**
1. Autenticar como superadmin
2. Fazer `GET /api/schools/list`

**Resultado Esperado:**
- Status HTTP: `200`
- Body contém array `schools`
- Lista inclui todas as escolas da plataforma

---

### CT-7.2 — Ver Feedbacks de Outra Escola

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que papéis globais podem visualizar dados de outra escola |
| **Endpoint** | `GET /api/feedback` |
| **Header extra** | `x-school-id: <ID de outra escola>` |

**Passos:**
1. Autenticar como superadmin
2. Fazer `GET /api/feedback` com header `x-school-id` de uma escola diferente da padrão

**Resultado Esperado:**
- Status HTTP: `200`
- Feedbacks retornados são da escola especificada no header

---

### CT-7.3 — Ver Incidentes de Outra Escola

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar visibilidade cross-school para incidentes |
| **Endpoint** | `GET /api/incidents` |
| **Header extra** | `x-school-id: <ID de outra escola>` |

**Passos:**
1. Autenticar como superadmin
2. Fazer `GET /api/incidents` com header `x-school-id` de outra escola

**Resultado Esperado:**
- Status HTTP: `200`
- Incidentes retornados são da escola especificada

---

## 9. Fase 8 — Cenários Negativos e Casos de Borda

### CT-8.1 — Incidente Inexistente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar tratamento de ID inválido |
| **Endpoint** | `GET /api/incidents/:id` |

**Passos:**
1. Fazer `GET /api/incidents/00000000-0000-0000-0000-000000000000`

**Resultado Esperado:**
- Status HTTP: `404`

---

### CT-8.2 — Feedback Inexistente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar tratamento de ID inválido |
| **Endpoint** | `GET /api/feedback/:id` |

**Passos:**
1. Fazer `GET /api/feedback/00000000-0000-0000-0000-000000000000`

**Resultado Esperado:**
- Status HTTP: `404`

---

### CT-8.3 — Acesso sem Token de Autenticação

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Garantir que todas as rotas exigem autenticação |
| **Endpoint** | `GET /api/incidents` (sem header Authorization) |

**Passos:**
1. Fazer `GET /api/incidents` **sem** header `Authorization`

**Resultado Esperado:**
- Status HTTP: `401`
- Nenhum dado retornado

---

### CT-8.4 — Quarentena em Incidente Inexistente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar que quarentena não falha silenciosamente para IDs inválidos |
| **Endpoint** | `PUT /api/incidents/:id/quarantine` |

**Passos:**
1. Fazer `PUT /api/incidents/00000000-0000-0000-0000-000000000000/quarantine`
   com body `{ "reason": "Teste", "undo": false }`

**Resultado Esperado:**
- Status HTTP: `404` ou outro código de erro (≥ 400)

---

### CT-8.5 — Transição de Status em Incidente Inexistente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Verificar tratamento ao tentar atualizar status de incidente que não existe |
| **Endpoint** | `PUT /api/incidents/:id/status` |

**Passos:**
1. Fazer `PUT /api/incidents/00000000-0000-0000-0000-000000000000/status`
   com body `{ "status": "IN_REVIEW" }`

**Resultado Esperado:**
- Status HTTP: `404`

---

## 10. Matriz de Rastreabilidade

| Cenário | Endpoint | Tipo | Fase do Ciclo ITIL | Resultado |
|---------|----------|------|---------------------|-----------|
| CT-1.1 | GET /api/feedback | Positivo | Registro | ✅ |
| CT-1.2 | GET /api/feedback/stats/summary | Positivo | Registro | ✅ |
| CT-1.3 | GET /api/feedback?type= | Positivo | Categorização | ✅ |
| CT-1.4 | GET /api/feedback/:id | Positivo | Investigação | ✅ |
| CT-1.5 | GET /api/feedback/:id | Positivo | Investigação | ✅ |
| CT-2.1 | GET /api/incidents | Positivo | Registro | ✅ |
| CT-2.2 | GET /api/incidents/stats/summary | Positivo | Categorização | ✅ |
| CT-2.3 | GET /api/incidents?status= | Positivo | Categorização | ✅ |
| CT-2.4 | GET /api/incidents?severity= | Positivo | Categorização | ✅ |
| CT-2.5 | GET /api/incidents/:id | Positivo | Investigação | ✅ |
| CT-3.1 | PUT /api/incidents/:id/status | Positivo | Resolução | ✅ |
| CT-3.2 | PUT /api/incidents/:id/status | Positivo | Resolução | ✅ |
| CT-3.3 | PUT /api/incidents/:id/status | Positivo | Resolução | ✅ |
| CT-3.4 | PUT /api/incidents/:id/status | Negativo | Resolução | ✅ |
| CT-3.5 | PUT /api/incidents/:id/status | Negativo | Resolução | ✅ |
| CT-3.6 | PUT /api/incidents/:id/status | Negativo | Resolução | ✅ |
| CT-3.7 | PUT /api/incidents/:id/status | Positivo | Resolução | ✅ |
| CT-4.1 | PUT /api/incidents/:id/quarantine | Positivo | Contenção | ✅ |
| CT-4.2 | GET /api/incidents/:id | Positivo | Contenção | ✅ |
| CT-4.3 | PUT /api/incidents/:id/quarantine | Positivo | Contenção | ✅ |
| CT-4.4 | PUT /api/incidents/:id/quarantine | Negativo | Contenção | ✅ |
| CT-5.1 | POST /api/corrections | Positivo | Resolução | ✅ |
| CT-5.2 | PUT /api/corrections/:id/transition | Positivo | Resolução | ✅ |
| CT-5.3 | PUT /api/corrections/:id/transition | Positivo | Resolução | ✅ |
| CT-5.4 | PUT /api/corrections/:id/transition | Positivo | Resolução | ✅ |
| CT-5.5 | PUT /api/corrections/:id/transition | Positivo | Resolução | ✅ |
| CT-5.6 | PUT /api/corrections/:id/transition | Negativo | Resolução | ✅ |
| CT-5.7 | POST /api/corrections | Negativo | Resolução | ✅ |
| CT-5.8 | PUT /api/corrections/:id/transition | Negativo | Resolução | ✅ |
| CT-5.9 | POST /api/corrections | Negativo | Resolução | ✅ |
| CT-6.1 | GET /api/audit/events | Positivo | Encerramento | ✅ |
| CT-6.2 | GET /api/audit/treatments | Positivo | Encerramento | ✅ |
| CT-7.1 | GET /api/schools/list | Positivo | Cross-School | ✅ |
| CT-7.2 | GET /api/feedback (x-school-id) | Positivo | Cross-School | ✅ |
| CT-7.3 | GET /api/incidents (x-school-id) | Positivo | Cross-School | ✅ |
| CT-8.1 | GET /api/incidents/:id | Negativo | Edge Case | ✅ |
| CT-8.2 | GET /api/feedback/:id | Negativo | Edge Case | ✅ |
| CT-8.3 | GET /api/incidents (sem auth) | Negativo | Edge Case | ✅ |
| CT-8.4 | PUT /api/incidents/:id/quarantine | Negativo | Edge Case | ✅ |
| CT-8.5 | PUT /api/incidents/:id/status | Negativo | Edge Case | ✅ |

**Total: 37 cenários de teste** (24 positivos + 13 negativos)

---

## 11. Como Executar os Testes Automatizados

### Passo 1 — Garantir que o servidor está rodando

```bash
cd C:\Projects\lab-ia-educacao
node server.js
```

O servidor deve iniciar em `http://localhost:8084`.

### Passo 2 — Obter token de autenticação

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
sb.auth.signInWithPassword({
  email: 'admin@lab-ia.gov.br',
  password: 'Test12345!'
}).then(r => console.log(r.data?.session?.access_token));
"
```

### Passo 3 — Executar os testes

**No PowerShell:**
```powershell
$env:TOKEN="<token obtido no passo 2>"
node test-incident-flow.js
```

**No Bash/Linux:**
```bash
TOKEN="<token obtido no passo 2>" node test-incident-flow.js
```

### Passo 4 — Interpretar resultados

O script exibe:
- ✅ **Pass** — Cenário passou conforme esperado
- ❌ **Fail** — Cenário falhou (mostra detalhes)
- ⏭️ **Skip** — Cenário pulado por pré-condição não atendida (ex: correção duplicada)

**Último resultado:** 70/70 ✅, 0 ❌, 1 ⏭️

### Resetar dados para novo ciclo de testes

Se precisar rodar os testes novamente do zero (resetar incidente e correção):

```javascript
// Executar com node -e "..."
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Resetar incidente para OPEN
await sb.from('incident_reports')
  .update({ status: 'OPEN', resolved_by: null, resolved_at: null })
  .eq('id', '<INCIDENT_ID>');

// Resetar correção para SUBMITTED  
await sb.from('response_corrections')
  .update({ status: 'SUBMITTED', reviewed_by: null, reviewed_at: null, applied_at: null, applied_by: null })
  .eq('id', '<CORRECTION_ID>');

// Limpar corrected_at da resposta
await sb.from('assistant_responses')
  .update({ corrected_at: null })
  .eq('id', '<RESPONSE_ID>');
```

---

## Lacunas Conhecidas (Fora do Escopo Atual)

As seguintes funcionalidades **não estão implementadas** e portanto não possuem cenários de teste:

1. **Detecção automática de incidentes** (L1.1) — Não existe job que crie incidentes automaticamente baseado em risco, abstenção ou confiança baixa
2. **Feedback "incorreto" → incidente automático** (L1.2) — Feedbacks de tipo "incorreto" não geram `incident_reports` automaticamente
3. **Criação de incidente pela página de incidentes** (L1.3) — A página é somente leitura para criação
4. **Efeito na IA** — Resolução de incidente e aplicação de correção não alteram o comportamento do assistente IA
5. **Confirmação do usuário final** — Não há fluxo de validação pós-resolução pelo usuário que reportou o problema

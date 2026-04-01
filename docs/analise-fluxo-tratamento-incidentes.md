# Análise do Fluxo de Tratamento de Incidentes

> **Data da análise:** junho 2025  
> **Escopo:** Ciclo de vida completo do gerenciamento de incidentes no sistema Lab IA Educação  
> **Metodologia:** Inspeção de código-fonte (endpoints, frontend, schema, scripts) mapeada contra as 6 fases do ciclo ITIL de gerenciamento de incidentes

---

## Sumário Executivo

O sistema possui uma **estrutura básica funcional** para registro manual e acompanhamento de status de incidentes, mas apresenta **lacunas significativas** nas fases de contenção, retroalimentação da IA e análise pós-incidente. O ciclo desde a detecção de um problema até a melhoria efetiva da base de conhecimento da IA **não está fechado** — a resolução de um incidente é puramente administrativa e não produz efeito no comportamento do assistente.

### Resumo por Fase

| Fase | Estado | Cobertura |
|------|--------|-----------|
| 1. Registro | ⚠️ Parcial | Manual funciona; detecção automática ausente |
| 2. Categorização e Priorização | ✅ Funcional | 4 níveis de severidade + tipo de incidente |
| 3. Investigação e Diagnóstico | ⚠️ Limitado | Papéis definidos; ferramentas de diagnóstico ausentes |
| 4. Contenção e Erradicação | ❌ Ausente | Nenhum mecanismo de contenção implementado |
| 5. Resolução e Recuperação | ❌ Ausente (funcional parcial) | Mudança de status funciona; sem efeito na IA |
| 6. Encerramento e Lições Aprendidas | ❌ Ausente | Sem confirmação do usuário; sem análise pós-incidente |

---

## Fase 1 — Registro Formal do Incidente

### Pergunta do Usuário
> *"Desde o cadastro formal (seja pela página de chat, seja clicando em uma resposta, seja pela detecção automática)..."*

### Como Funciona Hoje

**Canal único: registro manual via Chat Manager.**

O fluxo de criação de incidentes é **exclusivamente manual**, iniciado pela função `registrarIncidenteAuditoria()` em `scripts/chat-manager-network-scope.js` (linhas 576-660):

1. O auditor/gestor navega até o **Chat Manager** e seleciona uma resposta auditada
2. Clica no botão de registrar incidente (requer capability `feedbackActions`)
3. Um formulário SweetAlert coleta:
   - **Tipo de incidente** (padrão: `governance_review`)
   - **Severidade** (padrão: `MEDIUM`, opções: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
   - **Descrição** do problema
4. O frontend envia `POST /api/webchat/responses/:id/incident` (`.qodo/api/webchat.js`, linhas 617-710)
5. O backend cria um registro na tabela `incident_reports` + evento de auditoria `INCIDENT_REPORTED`

**Esquema da tabela `incident_reports`:**

```
id               UUID PK
school_id        UUID FK → schools
consultation_id  UUID FK → consultations
response_id      UUID FK → assistant_responses
incident_type    TEXT
severity         TEXT CHECK (LOW, MEDIUM, HIGH, CRITICAL)
status           TEXT CHECK (OPEN, IN_REVIEW, RESOLVED, DISMISSED)
topic            TEXT
details          JSONB
opened_by        UUID
opened_at        TIMESTAMPTZ DEFAULT now()
resolved_by      UUID
resolved_at      TIMESTAMPTZ
resolution_notes TEXT
```

### O que Está Faltando

#### 1.1 — Detecção Automática de Incidentes
**Não existe** nenhuma lógica automática para criar incidentes. A função `processIdleConversations()` (`server.js`, linhas 1304-1380) gerencia apenas conversas ociosas (follow-up/fechamento) e **não** analisa risco, abstenção ou confiança baixa.

Sinais que poderiam disparar incidentes automaticamente, mas não disparam:
- Resposta com **risco alto** (campo `risk_level` em `assistant_responses`)
- IA se **absteve** de responder (campo `abstention`)
- **Confiança baixa** na resposta (campo `confidence_score`)
- Feedback **"incorreto"** acumulado em múltiplas respostas do mesmo tópico
- Detecção de **alucinação** ou conteúdo inconsistente com a base de conhecimento

#### 1.2 — Feedback "Incorreto" Gera Incidente Automaticamente

> ✅ **IMPLEMENTADO (29/03/2026)** — O endpoint `POST /api/webchat/responses/:id/feedback` agora cria automaticamente um `incident_reports` com tipo `feedback_incorreto_auto` e severidade `HIGH` quando o `feedback_type` é `incorrect`. O sistema verifica se já existe um incidente auto-gerado para a mesma resposta (idempotência) e registra evento de auditoria `INCIDENT_REPORTED` com `actor_type: SYSTEM`. O comentário do feedback é usado como descrição do incidente.

#### 1.3 — Registro Direto pela Página de Incidentes
A página de incidentes (`incidents-panel.js`) é **somente leitura para criação** — permite visualizar e gerenciar status, mas **não possui botão para criar novo incidente** fora do contexto de uma resposta específica do chat.

### Recomendações

1. **Implementar detecção automática**: Criar um job periódico (similar ao `processIdleConversations`) que analise respostas recentes e crie incidentes para risk_level HIGH/CRITICAL, abstenções recorrentes, ou acúmulo de feedbacks negativos
2. **Criar fluxo feedback → incidente**: Quando uma resposta acumular N feedbacks "incorreto" (ex: 3), criar automaticamente um incidente com severidade HIGH
3. **Adicionar botão "Novo Incidente"** na página de incidentes para registro manual sem necessidade de navegar ao Chat Manager

---

## Fase 2 — Categorização e Priorização

### Pergunta do Usuário
> *"Categorização e priorização (matriz impacto × urgência)"*

### Como Funciona Hoje

**Categorização existe, mas é simplificada.**

No momento do registro, o incidente recebe:

- **`incident_type`**: Texto livre, com padrão `governance_review`. Não há enum ou lista predefinida de tipos — o auditor pode digitar qualquer valor
- **`severity`**: Enum com 4 níveis (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- **`topic`**: Extraído automaticamente da resposta original (quando disponível)

A página de incidentes exibe filtros por:
- Status (Aberto, Em Revisão, Resolvido, Descartado)
- Severidade (4 níveis)

As estatísticas (`GET /api/incidents/stats/summary`, `server.js` linhas 4075-4114) incluem:
- Total de incidentes
- Contagem por status (open, in_review, resolved, dismissed)
- Incidentes críticos abertos (`critical_open`)
- Tempo médio de resolução em horas (`avg_resolution_hours`)

### O que Está Faltando

#### 2.1 — Matriz Impacto × Urgência
Não existe uma **matriz formal** que combine impacto e urgência para determinar prioridade. A severidade é um campo único escolhido subjetivamente pelo auditor no momento do registro.

#### 2.2 — Taxonomia de Tipos de Incidente
O campo `incident_type` é texto livre — não há uma **lista padronizada** de categorias (ex: resposta_incorreta, informação_desatualizada, viés_algorítmico, vazamento_dados, conteúdo_inapropriado, etc.).

#### 2.3 — SLA por Severidade
Não há definição de **tempos-alvo de resolução** por nível de severidade (ex: CRITICAL = 4h, HIGH = 24h, MEDIUM = 72h, LOW = 168h). O `avg_resolution_hours` nas estatísticas é calculado globalmente sem distinção por severidade.

#### 2.4 — Priorização Dinâmica
Não há mecanismo de **escalação automática** (ex: incidente MEDIUM que fica aberto por 48h é automaticamente escalado para HIGH).

### Recomendações

1. **Criar enum de tipos de incidente** na constraint CHECK do banco (como já foi feito para severity e status)
2. **Implementar campos `impact` e `urgency`** separados, com cálculo automático de `priority` via matriz
3. **Definir SLAs** por severidade e exibir alertas visuais quando próximo do vencimento
4. **Implementar escalação automática** via job periódico

---

## Fase 3 — Investigação e Diagnóstico

### Pergunta do Usuário
> *"Investigação e diagnóstico (quem investiga? qual perfil?)"*

### Como Funciona Hoje

**Papéis definidos, mas ferramentas de diagnóstico limitadas.**

Três constantes de papéis controlam o acesso:

```javascript
// server.js, linhas ~30-45
INCIDENTS_READ_ROLES = [superadmin, network_manager, auditor, direction, content_curator, coordination, public_operator]
INCIDENTS_MANAGE_ROLES = [superadmin, network_manager, auditor]
```

**Quem pode fazer o quê:**

| Ação | Papéis |
|------|--------|
| Visualizar lista de incidentes | 7 papéis (READ_ROLES) |
| Ver detalhes de um incidente | 7 papéis (READ_ROLES) |
| Alterar status / resolver / descartar | 3 papéis (MANAGE_ROLES) |
| Registrar novo incidente | Quem tem capability `feedbackActions` no Chat Manager |

**Fluxo de investigação atual:**

1. Auditor acessa a página de incidentes
2. Visualiza a lista com filtros de status e severidade
3. Clica no incidente para ver detalhes (tipo, severidade, tópico, escola, quem reportou, data)
4. O campo `details` (JSONB) pode conter informações adicionais do contexto da resposta
5. O auditor decide: "Iniciar Revisão" (→ `IN_REVIEW`)

### O que Está Faltando

#### 3.1 — Ferramentas de Diagnóstico na Página de Incidentes — ✅ IMPLEMENTADO (28/03/2026)

> **Lacuna L5 resolvida.** O modal de detalhe do incidente agora exibe contexto completo de diagnóstico.

**Implementação realizada:**
- **Backend (`GET /api/incidents/:id`)** — enriquecido com join em `assistant_responses` (texto completo, confiança, modo, fallback, fonte principal, correção), `consultation_messages` (pergunta original do cidadão via `origin_message_id` ou busca por `actor_type=CITIZEN`), e `interaction_source_evidence` (todas as fontes/chunks recuperados com relevância)
- **Frontend (`incidents-panel.js`)** — seção "Contexto de Diagnóstico" com:
  - Pergunta original do cidadão (fundo verde)
  - Resposta da IA com score de confiança colorido, modo (Automático/Abstido/Manual) e flag de fallback humano (fundo azul)
  - Indicador de correção registrada, se houver (fundo laranja)
  - Fonte principal usada pela IA com título, trecho e versão (fundo roxo)
- **Frontend** — seção "Fontes e Evidências Recuperadas" com lista de todos os chunks/embeddings utilizados, mostrando título, trecho, score de relevância e badge "Principal"

O investigador agora tem **tudo na mesma tela** sem precisar navegar ao Chat Manager.

#### 3.2 — Fluxo de Investigação Estruturado

> ✅ **IMPLEMENTADO (29/03/2026)** — Campo `assigned_to` + `assigned_at` adicionado à tabela `incident_reports`. O endpoint `PUT /api/incidents/:id/status` aceita `assigned_to` no body, permite atribuição independente de mudança de status, e registra evento de auditoria `INCIDENT_ASSIGNED`. Frontend exibe o responsável atribuído e botão "Atribuir" com dropdown de usuários gerenciados.

Ainda pendente:
- Campo de **diagnóstico/causa raiz** (root cause) no incidente
- Checklist de investigação (ex: verificar base de conhecimento, verificar prompt, testar cenário)
- Histórico de ações/comentários durante a investigação (timeline de atividades)

#### 3.3 — Conexão com Eventos de Auditoria

> ✅ **IMPLEMENTADO (29/03/2026)** — O endpoint `GET /api/incidents/:id` agora busca todos os eventos de auditoria vinculados ao incidente via `details->>'incident_id'` ou `details->>'response_id'`, retornando no campo `audit_events`. O frontend renderiza uma "Trilha de Auditoria" com timeline de todos os eventos (status changes, corrections, feedback, hallucination mitigations, assignments), cada um com cor por severidade, tipo, resumo, ator e data.

### Recomendações

1. **Incluir contexto completo** na página de detalhes do incidente: pergunta, resposta, chunks, feedbacks
2. **Adicionar campo `assigned_to`** para atribuição de investigador
3. **Criar timeline de atividades** no incidente (comentários, mudanças de status, ações)
4. **Vincular eventos de auditoria** ao incidente quando referenciarem a mesma `response_id`
5. **Adicionar campo `root_cause`** e taxonomia de causas raiz

---

## Fase 4 — Contenção e Erradicação

### Pergunta do Usuário
> *"Contenção e erradicação (quais ações foram tomadas? onde isso fica registrado?)"*

### Como Funciona Hoje

**Esta fase NÃO está implementada.**

O sistema não possui **nenhum mecanismo de contenção**. Quando um incidente é registrado:
- A resposta problemática **continua visível** e acessível
- Não há como **suspender**, **ocultar** ou **sinalizar** a resposta como incorreta para os usuários
- Não há como **desativar temporariamente** um trecho da base de conhecimento
- Não há como impedir a IA de **repetir** a mesma resposta problemática em novas consultas

A única ação possível é puramente administrativa: mudar o status do incidente para `IN_REVIEW`, o que **não tem efeito** no funcionamento do sistema.

### O que Está Faltando

#### 4.1 — Quarentena de Respostas
Não existe mecanismo para marcar uma resposta como "sob investigação" ou "incorreta confirmada" que:
- Exiba um aviso visual caso o usuário acesse a conversa antiga
- Impeça o uso dos mesmos chunks/embeddings em novas respostas
- Notifique usuários que receberam aquela resposta

#### 4.2 — Suspensão de Conteúdo na Base de Conhecimento

> ✅ **IMPLEMENTADO (29/03/2026)** — Coluna `active BOOLEAN DEFAULT true` adicionada à tabela `source_documents`. Endpoint `PUT /api/knowledge/sources/:id/suspend` permite suspender/reativar fontes com motivo, registrando eventos de auditoria `KNOWLEDGE_SOURCE_SUSPENDED` / `KNOWLEDGE_SOURCE_REACTIVATED`. O `GET /api/knowledge/sources` retorna o campo `active`. Frontend exibe badge "Suspensa" nas fontes inativas e botões "Suspender"/"Reativar" nas cards de fontes oficiais.

#### 4.3 — Registro de Ações de Contenção
Não há tabela ou campo para registrar:
- Quais ações de contenção foram tomadas
- Quando foram tomadas
- Por quem foram tomadas
- Se a contenção foi efetiva

#### 4.4 — Ações de Erradicação
Não existe fluxo para:
- Corrigir o conteúdo na base de conhecimento que causou o problema
- Documentar a correção realizada
- Validar que a IA agora responde corretamente ao mesmo cenário

### Recomendações

1. **Adicionar flag `quarantined`** em `assistant_responses` para marcar respostas sob investigação
2. **Adicionar campo `active`** em `knowledge_sources` para permitir suspensão temporária de fontes
3. **Criar tabela `incident_actions`** para registrar timeline de ações tomadas durante contenção/erradicação
4. **Implementar "teste de regressão"**: após correção, enviar a mesma pergunta ao assistente e comparar resposta

---

## Fase 5 — Resolução e Recuperação

### Pergunta do Usuário
> *"Resolução e recuperação (a IA passa a responder 'mais corretamente' depois disso?)"*

### Como Funciona Hoje

**A resolução é puramente administrativa — NÃO afeta o comportamento da IA.**

O endpoint `PUT /api/incidents/:id/status` (`server.js`, linhas 4009-4075) permite:
1. Mudar status para `IN_REVIEW`, `RESOLVED` ou `DISMISSED`
2. Quando `RESOLVED` ou `DISMISSED`, registra:
   - `resolved_by` (UUID do usuário)
   - `resolved_at` (timestamp)
   - `resolution_notes` (texto livre opcional)

No frontend (`incidents-panel.js`, linhas 163-185), ao resolver/descartar:
- SweetAlert pede `resolution_notes` opcionais
- Atualiza a lista e estatísticas
- **Nenhuma outra ação é disparada**

### A IA NÃO Melhora Após Resolução

**A resposta curta é: não.** Resolver um incidente **não** produz nenhum efeito no comportamento da IA. Especificamente:

#### 5.1 — Colunas de Correção Existem Mas Nunca São Preenchidas

A tabela `assistant_responses` possui 3 colunas relacionadas a correção (`schema.sql`, linhas 165-167):

```sql
corrected_from_response_id UUID REFERENCES assistant_responses(id),
corrected_at               TIMESTAMPTZ,
corrected_by               UUID
```

Estas colunas são **lidas** em consultas (ex: `has_correction` é computado como `!!resp.corrected_at` em `server.js` linha ~4187), e `pending_correction` nas estatísticas de feedback conta respostas incorretas sem `corrected_at`.

**Porém, NÃO EXISTE nenhum endpoint que escreva nestas colunas.** Nenhum endpoint faz `UPDATE assistant_responses SET corrected_at = ...`. A infraestrutura de correção está parcialmente construída no banco, mas o fluxo completo **nunca foi implementado**.

#### 5.2 — Resolução Não Atualiza Base de Conhecimento

Resolver um incidente **não**:
- Cria/modifica entradas em `knowledge_sources`
- Atualiza embeddings
- Ajusta prompts ou regras do assistente
- Dispara re-treinamento ou re-indexação

#### 5.3 — Fluxo de Auditoria "KNOWLEDGE_CREATED" É Paralelo

O sistema de auditoria tem um estado `KNOWLEDGE_CREATED` que indica que um evento foi encaminhado para curadoria de conteúdo (`server.js`, linhas 3095-3200). Mas este fluxo:
- Opera sobre **eventos de auditoria**, não sobre incidentes
- Não está vinculado ao ciclo de vida do incidente
- É apenas um rótulo de status — não cria efetivamente conteúdo na base de conhecimento

### O que Está Faltando

#### 5.4 — Endpoint de Correção de Respostas
Criar `POST /api/responses/:id/correction` que:
- Registre a resposta correta
- Preencha `corrected_at`, `corrected_by`, `corrected_from_response_id`
- Opcionalmente crie/atualize fonte de conhecimento

#### 5.5 — Feedback Loop com Base de Conhecimento
Mecanismo para que a resolução de um incidente **alimente** a base de conhecimento:
- Criar nova fonte de conhecimento a partir da resolução
- Ajustar fonte existente que continha informação incorreta
- Re-gerar embeddings afetados

#### 5.6 — Verificação de Recuperação
Nenhuma forma de verificar se, após ações corretivas, a IA de fato responde melhor:
- Teste A/B com a mesma pergunta
- Comparação da resposta original vs. nova resposta
- Score de confiança antes/depois

### Recomendações

1. **Implementar endpoint de correção** que preencha as colunas já existentes em `assistant_responses`
2. **Conectar resolução de incidente com base de conhecimento**: ao resolver, oferecer opção de criar/editar source
3. **Criar "teste de regressão"** automatizado: re-submeter pergunta e comparar resposta
4. **Vincular fluxo de auditoria `KNOWLEDGE_CREATED`** ao incidente para fechar o ciclo

---

## Fase 6 — Encerramento e Lições Aprendidas

### Pergunta do Usuário
> *"Encerramento e lições aprendidas (como o usuário confirma que está resolvido? como é feita a análise pós-incidente?)"*

### Como Funciona Hoje

**Esta fase NÃO está implementada.**

O encerramento é feito **unilateralmente** pelo auditor/gestor/superadmin:
1. O gestor clica "Resolver" ou "Descartar"
2. Opcionalmente adiciona `resolution_notes`
3. O incidente é fechado
4. **Fim** — nenhuma ação adicional

### O que Está Faltando

#### 6.1 — Confirmação pelo Usuário Afetado
O usuário que foi impactado pela resposta incorreta (ou quem reportou o problema):
- **Não é notificado** de que o incidente foi resolvido
- **Não pode confirmar** se a resolução é satisfatória
- **Não pode reabrir** o incidente se discordar

Inclusive, o campo `opened_by` registra quem abriu o incidente, mas não há fluxo de comunicação de volta a esta pessoa.

#### 6.2 — Análise Pós-Incidente (Post-Mortem)
Não existe:
- Template de post-mortem
- Campo de **causa raiz** (`root_cause`) no incidente
- Classificação de **impacto real** (quantos usuários foram afetados)
- **Timeline** reconstruída do incidente
- **Ações preventivas** definidas e rastreadas

#### 6.3 — Lições Aprendidas
Não existe:
- Repositório de lições aprendidas
- Vinculação entre incidentes similares (para identificar padrões recorrentes)
- Dashboard de tendências de incidentes ao longo do tempo
- Relatório periódico de incidentes (mensal/trimestral)

#### 6.4 — Métricas de Efetividade
As estatísticas atuais (`GET /api/incidents/stats/summary`) são básicas:
- ✅ Total, contagem por status, críticos abertos, tempo médio de resolução
- ❌ Não há: taxa de reabertura, distribuição por tipo, tendência temporal, MTTR por severidade, taxa de recorrência

### Recomendações

1. **Implementar notificação ao reportador** quando incidente é resolvido
2. **Adicionar fluxo de confirmação**: reportador pode aceitar resolução ou reabrir
3. **Criar template de post-mortem** com campos estruturados (causa raiz, impacto, ações preventivas)
4. **Implementar dashboard de tendências** com gráficos temporais e distribuição por tipo/severidade
5. **Criar vinculação entre incidentes** similares para identificar problemas sistêmicos

---

## Diagrama do Ciclo Atual vs. Ideal

### Ciclo Atual (implementado)

```
[Auditor vê resposta no Chat Manager]
    │
    ▼
[Registra incidente manualmente] ──► incident_reports (status: OPEN)
    │                                 + audit_event (INCIDENT_REPORTED)
    ▼
[Auditor/Gestor acessa página de Incidentes]
    │
    ├──► "Iniciar Revisão" ──► status: IN_REVIEW
    │
    ├──► "Resolver" ──► status: RESOLVED + resolution_notes
    │                   (nenhum efeito na IA)
    │
    └──► "Descartar" ──► status: DISMISSED
                         (nenhum efeito na IA)

    ✕ FIM — ciclo não fecha de volta para a IA
```

### Ciclo Ideal (proposto)

```
[Detecção]
    ├── Manual: Auditor no Chat Manager
    ├── Automática: feedback "incorreto" acumulado
    └── Automática: risco alto / abstenção / confiança baixa
         │
         ▼
[Registro] ──► incident_reports (OPEN) + notificações
         │
         ▼
[Categorização] ──► impacto × urgência → prioridade + SLA
         │
         ▼
[Contenção Imediata]
    ├── Quarentena da resposta (flag visual)
    ├── Suspensão temporária de fonte de conhecimento
    └── Registro das ações de contenção
         │
         ▼
[Investigação] ──► assigned_to + contexto completo
    ├── Pergunta, resposta, chunks, feedbacks na mesma tela
    ├── Diagnóstico e identificação de causa raiz
    └── Timeline de atividades/comentários
         │
         ▼
[Resolução]
    ├── Correção da resposta (corrected_at/by)
    ├── Atualização da base de conhecimento
    ├── Re-geração de embeddings
    └── Teste de regressão (mesma pergunta → resposta correta?)
         │
         ▼
[Encerramento]
    ├── Notificação ao reportador
    ├── Confirmação de satisfação
    ├── Post-mortem (causa raiz, impacto, ações preventivas)
    └── Lições aprendidas → repositório
         │
         ▼
[Análise Contínua]
    ├── Dashboard de tendências
    ├── Vinculação de incidentes similares
    └── Relatórios periódicos
```

---

## Mapa de Lacunas Técnicas

| # | Lacuna | Severidade | Complexidade | Componentes Afetados |
|---|--------|------------|--------------|---------------------|
| L1 | Sem detecção automática de incidentes | ALTA | Média | server.js (novo job) |
| L2 | ~~Feedback "incorreto" não gera incidente~~ ✅ | ~~ALTA~~ | ~~Baixa~~ | ✅ Implementado (29/03/2026) |
| L3 | Sem matriz impacto × urgência | MÉDIA | Baixa | DB + frontend |
| L4 | Sem SLA por severidade | MÉDIA | Média | DB + server.js + frontend |
| L5 | ~~Sem ferramentas de diagnóstico na página~~ ✅ | ~~ALTA~~ | ~~Média~~ | ✅ Implementado (28/03/2026) |
| L6 | ~~Sem campo assigned_to~~ ✅ | ~~MÉDIA~~ | ~~Baixa~~ | ✅ Implementado (29/03/2026) |
| L7 | **Sem contenção de respostas** | **CRÍTICA** | Média | DB + server.js + frontend |
| L8 | ~~Sem suspensão de fontes de conhecimento~~ ✅ | ~~CRÍTICA~~ | ~~Média~~ | ✅ Implementado (29/03/2026) |
| L9 | **Endpoint de correção inexistente** | **CRÍTICA** | Média | server.js |
| L10 | **Resolução não atualiza base de conhecimento** | **CRÍTICA** | Alta | server.js + embeddings |
| L11 | Sem notificação ao reportador | ALTA | Média | server.js + notificações |
| L12 | Sem confirmação/reabertura pelo usuário | ALTA | Média | server.js + frontend |
| L13 | Sem post-mortem estruturado | MÉDIA | Baixa | DB + frontend |
| L14 | Sem lições aprendidas | MÉDIA | Média | DB + server.js + frontend |
| L15 | Colunas corrected_at/by nunca preenchidas | ALTA | Baixa | server.js (novo endpoint) |
| L16 | ~~Auditoria KNOWLEDGE_CREATED desconectada de incidentes~~ ✅ | ~~ALTA~~ | ~~Média~~ | ✅ Implementado (29/03/2026) |

---

## Priorização Sugerida de Implementação

### Sprint 1 — Fechar o Ciclo Crítico
1. **L9** — Endpoint de correção de respostas (usa colunas existentes)
2. **L15** — Preencher `corrected_at/by` quando correção é registrada
3. **L7** — Flag `quarantined` em respostas + exibição visual
4. **L2** — ✅ Feedback "incorreto" gera incidente automaticamente (29/03/2026)

### Sprint 2 — Contenção e Diagnóstico
5. **L8** — Campo `active` em knowledge_sources para suspensão
6. **L5** — Contexto completo na página de incidentes (pergunta, resposta, chunks)
7. **L6** — Campo assigned_to + workflow de atribuição
8. **L16** — Vincular auditoria KNOWLEDGE_CREATED a incidentes

### Sprint 3 — Encerramento e Melhoria Contínua
9. **L11** — Notificação ao reportador quando incidente é resolvido
10. **L12** — Fluxo de confirmação/reabertura
11. **L10** — Resolução alimenta base de conhecimento
12. **L1** — Job de detecção automática de incidentes

### Sprint 4 — Maturidade do Processo
13. **L3** — Matriz impacto × urgência
14. **L4** — SLA por severidade + alertas
15. **L13** — Template de post-mortem
16. **L14** — Repositório de lições aprendidas + dashboard de tendências

---

## Referências no Código-Fonte

| Arquivo | Linhas | Conteúdo |
|---------|--------|----------|
| `server.js` | ~30-45 | Constantes INCIDENTS_READ_ROLES, INCIDENTS_MANAGE_ROLES |
| `server.js` | 1304-1380 | processIdleConversations (sem detecção de incidentes) |
| `server.js` | 3095-3200 | Endpoint de revisão de auditoria (KNOWLEDGE_CREATED) |
| `server.js` | ~3945 | GET /api/incidents (listar) |
| `server.js` | ~3984 | GET /api/incidents/:id (detalhe) |
| `server.js` | 4009-4075 | PUT /api/incidents/:id/status (mudar status) |
| `server.js` | 4075-4114 | GET /api/incidents/stats/summary |
| `server.js` | ~4187 | Cálculo has_correction (somente leitura) |
| `server.js` | 4240-4300 | Cálculo pending_correction em feedback stats |
| `.qodo/api/webchat.js` | 570-612 | POST feedback (não gera incidente) |
| `.qodo/api/webchat.js` | 617-710 | POST incident (criação manual) |
| `scripts/chat-manager-network-scope.js` | 576-660 | registrarIncidenteAuditoria() (UI) |
| `public/dist/js/incidents/incidents-panel.js` | todo | Frontend da página de incidentes |
| `schema.sql` | 165-167 | Colunas corrected_from/at/by (nunca escritas) |      

---

## Roadmap — Funcionalidades de Escala (não implementadas)

> **Contexto (29/03/2026):** As funcionalidades abaixo são necessárias para operação em redes grandes (ex: Secretaria de Educação de MG com ~12.000 escolas), mas **não são bloqueantes para o piloto**. O fluxo ponta-a-ponta (auditor atribui → escola corrige → diretor aprova → FAQ atualizada) funciona para demonstrar o conceito em escala piloto.

### R1 — Seleção e atribuição em lote
- **Problema:** Auditor precisa clicar 1 a 1 para atribuir centenas de incidentes iguais
- **Solução:** Checkbox multi-select no painel de incidentes + botão "Atribuir selecionados" com destino escolhido
- **Prioridade:** Alta (produção)
- **Dependência:** Painel de incidentes (incidents-panel.js)

### R2 — Agrupamento de incidentes por similaridade
- **Problema:** A IA comete o mesmo erro em 300 escolas → aparecem 300 linhas separadas sem relação entre si
- **Solução:** Agrupar incidentes por fingerprint (hash de: topic + incident_type + trecho da descrição ou response_id) e exibir como cluster com contador ("Mesmo erro em 312 escolas")
- **Prioridade:** Alta (produção)
- **Dependência:** R1, campo de fingerprint na tabela incident_reports

### R3 — Correção centralizada com resolução em massa
- **Problema:** Corrigir escola por escola é inviável e fragmenta a base de conhecimento
- **Solução:** Ao corrigir um cluster, a correção é aplicada na FAQ/base de conhecimento global e todos os incidentes do cluster são marcados como RESOLVED com referência à correção aplicada
- **Prioridade:** Alta (produção)
- **Dependência:** R2, fluxo de response_corrections

### R4 — Relatórios automáticos/agendados
- **Problema:** Auditor externo precisa receber relatórios periódicos sem acessar o painel
- **Solução:** Job agendado (cron/scheduler) que gera relatório semanal/mensal de incidentes e envia por e-mail ou disponibiliza em PDF
- **Prioridade:** Média
- **Dependência:** Template de relatório, integração de e-mail

### R5 — Exportação de incidentes (CSV/XLS)
- **Problema:** Painel de auditoria exporta CSV/XLS/PDF, mas o de incidentes não
- **Solução:** Replicar lógica de exportação de formal-audit.js para incidents-panel.js
- **Prioridade:** Média
- **Dependência:** incidents-panel.js

### R6 — Filtros avançados no painel de incidentes
- **Problema:** Só filtra por status e severidade; falta escola, tipo, data, tópico
- **Solução:** Adicionar filtros de escola (select), tipo de incidente, período (date range), tópico
- **Prioridade:** Média
- **Dependência:** incidents-panel.js, endpoint GET /api/incidents

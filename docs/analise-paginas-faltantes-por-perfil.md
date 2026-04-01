# Analise de Paginas Faltantes por Perfil de Usuario

**Data:** 26 de marco de 2026  
**Escopo:** Varredura completa no repositorio (schema.sql, server.js, dist/, snippets SQL, sidebar, documentacao)  
**Objetivo:** Identificar paginas/telas ausentes no frontend que cada perfil de usuario precisaria no dia a dia e em situacoes de crise  
**Contexto:** Plataforma governamental de atendimento escolar — nao envolve transacoes financeiras, leads comerciais ou CRM

---

## 1. Visao Geral do Sistema

O **Assistente Inteligente de Atendimento Escolar** (Qnexy) e uma plataforma voltada a redes publicas de educacao que combina:

- Atendimento institucional via IA com governanca algoritmica
- Base de conhecimento versionada com grounding institucional
- Auditoria formal e trilha de evidencia
- Gestao de usuarios com RBAC por escola
- Conteudo oficial (calendario, matricula, FAQ, comunicados)
- Relatorios operacionais e de impacto da IA

---

## 2. Perfis de Usuario no Sistema

| Perfil | Nivel | Descricao funcional |
|---|---|---|
| `superadmin` | Plataforma | Acesso total a todas as escolas e funcionalidades |
| `network_manager` | Escola | Gestor da rede/secretaria de educacao — acesso amplo |
| `content_curator` | Escola | Curador da base de conhecimento e conteudo institucional |
| `public_operator` | Escola | Operador do atendimento ao publico (front de conversa) |
| `secretariat` | Escola | Secretaria escolar — documentos, matricula, expediente |
| `coordination` | Escola | Coordenacao pedagogica |
| `direction` | Escola | Direcao da unidade escolar |
| `auditor` | Escola | Auditor de conformidade e governanca |
| `observer` | Escola | Observador institucional (somente leitura) |

---

## 3. Paginas Existentes no Sistema

| Pagina | Rota | page_key | Na sidebar |
|---|---|---|---|
| Login | `/login`, `/` | — | — |
| Dashboard de Inteligencia | `/dashboard` | `dashboard` | Sim |
| Atendimento (Chat Manager) | `/atendimento` | `chat-manager` | Sim |
| Relatorios | `/relatorios` | `reports` | Sim |
| Auditoria Formal | `/audit` | `audit` | Sim |
| Usuarios | `/usuarios` | `users` | Sim |
| Preferencias | `/preferencias` | `preferences` | Sim |
| Base de Conhecimento | `/conhecimento` | `knowledge` | Sim |
| Conteudo Oficial | `/conteudo-oficial` | `official-content` | Sim |
| Calendario Escolar | `/calendario-escolar` | — | **Nao** |
| Simulador de Chat | `/simulador-chat` | — | Nao |

### Permissoes atuais por perfil

| page_key | net_mgr | curator | operator | secret. | coord. | direction | auditor | observer |
|---|---|---|---|---|---|---|---|---|
| dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| chat-manager | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — |
| reports | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| audit | ✅ | ✅ | — | — | — | ✅ | ✅ | — |
| users | ✅ | — | — | — | — | — | — | — |
| preferences | ✅ | — | — | — | — | — | — | — |
| knowledge | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| official-content | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |

---

## 4. Paginas Faltantes Confirmadas

As quatro paginas abaixo sao aderentes ao proposito governamental da plataforma e possuem infraestrutura de dados ja definida no backend.

### 4.1 Mural de Comunicados

**Status:** ✅ Implementado (26/03/2026)

**Dados:** tabelas `notices` e `notice_attachments` (snippet `notice_board_schema.sql`, RLS ativo)  
**API:** 5 endpoints em `server.js` — `GET /api/notices`, `GET /api/notices/:id`, `POST /api/notices`, `PUT /api/notices/:id`, `DELETE /api/notices/:id`  
**Frontend:** `public/dist/notice-board.html` + `public/dist/js/notices/notice-board.js`  
**Rota:** `/comunicados` | page_key: `notices` | sidebar: `fa-bullhorn`  
**Permissoes DB:** 40 registros em `role_page_permissions` (8 perfis × 5 escolas)

#### Controle de acesso implementado (constantes em `server.js`)

**`NOTICES_WRITE_ROLES` — Criacao, edicao e exclusao (5 perfis):**

| Perfil | O que pode fazer |
|---|---|
| `superadmin` | CRUD total em todas as escolas |
| `network_manager` | Publicar comunicados da rede, circulares oficiais da secretaria |
| `secretariat` | Publicar avisos administrativos (prazos, documentos, horarios) |
| `coordination` | Publicar avisos pedagogicos (reunioes de pais, projetos) |
| `direction` | Publicar comunicados da escola, avisos urgentes de crise, suspensao de aulas |

**`NOTICES_READ_ROLES` — Somente leitura (9 perfis — todos exceto `auditor`):**

| Perfil | O que pode fazer |
|---|---|
| `superadmin` | Visualizar comunicados de todas as escolas |
| `network_manager` | Visualizar comunicados de toda a rede |
| `content_curator` | Consultar comunicados para revisao (sem poder de criacao) |
| `public_operator` | Consultar comunicados vigentes para informar o cidadao |
| `secretariat` | Visualizar + criar (tambem em WRITE_ROLES) |
| `coordination` | Visualizar + criar (tambem em WRITE_ROLES) |
| `direction` | Visualizar + criar (tambem em WRITE_ROLES) |
| `observer` | Acompanhar comunicados publicados |

**`NOTICES_REVIEW_ROLES` — Revisao/aprovacao (3 perfis, previsto para fluxo futuro):**

| Perfil | Finalidade |
|---|---|
| `superadmin` | Aprovacao global |
| `network_manager` | Aprovacao da rede |
| `content_curator` | Revisar e aprovar comunicados antes da publicacao |

**Sem acesso:** `auditor` (comunicados nao fazem parte do escopo de auditoria)

#### Comportamento no frontend

- O botao "Novo Comunicado" so aparece para perfis em `WRITE_ROLES`
- Os endpoints `POST`, `PUT`, `DELETE` validam `WRITE_ROLES` via `requireRequestContext`
- O endpoint `GET` valida `READ_ROLES` (que inclui os 5 perfis de escrita + 4 de leitura)
- O escopo multi-escola e resolvido por `resolveManagedSchoolScope` (rede ve comunicados de todas as escolas filhas)

#### Arquivos da implementacao

| Arquivo | Funcao |
|---|---|
| `server.js` (linhas 33-35) | Constantes `NOTICES_READ_ROLES`, `NOTICES_WRITE_ROLES`, `NOTICES_REVIEW_ROLES` |
| `server.js` (5 endpoints) | API REST completa com validacao de perfil e escopo multi-escola |
| `public/dist/notice-board.html` | Pagina HTML com modal de criacao/edicao, filtros e listagem |
| `public/dist/js/notices/notice-board.js` | IIFE com logica de CRUD, filtros e controle de visibilidade |
| `public/dist/components/sidebar.html` | Item de menu `data-menu="notices"` |
| `public/dist/js/permissions.js` | `notices` em `DEFAULT_ROLE_PAGES` para todos exceto `auditor` |
| `supabase/snippets/notice_board_schema.sql` | DDL das tabelas, indexes, trigger e RLS policies |
| `supabase/snippets/notice_board_page_permissions.sql` | Registro em `app_pages` e `seed_default_role_page_permissions` |

**Por que faz falta no dia a dia:** O diretor precisa emitir um aviso de suspensao de aulas por emergencia climatica e hoje nao tem onde registrar isso de forma rastreavel. A secretaria precisa informar prazos de matricula. A coordenacao precisa avisar sobre reuniao de pais. Hoje tudo isso fica fora do sistema.

**Por que faz falta na crise:** Em situacoes emergenciais (surto de doenca, problema na infraestrutura, emergencia climatica), o comunicado oficial precisa ser emitido rapidamente, com rastreabilidade de quem publicou, quando, e para quem.

---

### 4.2 Painel de Incidentes

> **Status: ✅ IMPLEMENTADO** (mesma sessao do item 4.1)

**Dados existentes:** tabela `incident_reports` com ciclo OPEN → IN_REVIEW → RESOLVED → DISMISSED, severidade LOW/MEDIUM/HIGH/CRITICAL, campos `topic`, `details`, `resolution_notes`  
**API:** dados parcialmente integrados a fila de auditoria (`/api/audit/treatments`)  
**Frontend:** embutido de forma generica na pagina de auditoria — sem visao dedicada  

**Pagina sugerida:** `/incidentes` | page_key: `incidents`  
**Alternativa viavel:** Aba dedicada dentro de `/audit` com filtros e workflow proprio

| Perfil | O que precisa ver/fazer | Tipo |
|---|---|---|
| `auditor` | Visao completa; triar, classificar severidade, registrar resolucao | ✏️ Gestao total |
| `network_manager` | Visao consolidada de incidentes de todas as escolas, priorizacao | ✏️ Gestao + filtro por escola |
| `direction` | Ver incidentes da sua escola, acompanhar resolucao, escalar casos criticos | 👁 Acompanhamento + escalacao |
| `content_curator` | Ver incidentes tipo "resposta incorreta" ou "conteudo desatualizado" para corrigir a base | 👁 Filtrado + acao de correcao |
| `coordination` | Ver incidentes pedagogicos (ex: resposta inadequada sobre tema sensivel) | 👁 Leitura filtrada |
| `public_operator` | Ver incidentes originados no atendimento que ele operou | 👁 Leitura |

**Dados que aparecem por incidente:**
- Severidade (LOW / MEDIUM / HIGH / CRITICAL) com badge visual
- Tipo do incidente (`incident_type`)
- Topico/tema da conversa original
- Status atual e historico de resolucao
- Link para a conversa original (`consultation_id`)
- Quem abriu, quando, notas de resolucao
- Tempo medio de resolucao (ja calculado no backend: `avg_incident_resolution_hours`)

**Por que faz falta no dia a dia:** O curador precisa saber quais respostas da IA foram marcadas como incorretas para corrigir a base. O auditor precisa acompanhar o ciclo de resolucao. Hoje esses dados existem mas estao diluidos na auditoria generica.

**Por que faz falta na crise:** Um incidente CRITICAL (ex: IA deu orientacao errada sobre saude de aluno) precisa de um tratamento visivel, urgente e rastreavel. Sem painel dedicado, a resposta a crise e lenta.

#### Detalhes da implementacao

**Constantes de acesso (server.js):**
- `INCIDENTS_READ_ROLES` — superadmin, network_manager, auditor, direction, content_curator, coordination, public_operator (7 perfis)
- `INCIDENTS_MANAGE_ROLES` — superadmin, network_manager, auditor (3 perfis — podem alterar status / resolver / descartar)

**Arquivos criados/alterados:**
| Arquivo | Acao |
|---|---|
| `server.js` | Constantes `INCIDENTS_READ_ROLES`, `INCIDENTS_MANAGE_ROLES`; `"incidents"` em `distPages`; rota `/incidentes`; 4 endpoints API |
| `public/dist/incidents.html` | Pagina HTML com hero, cards de stats, filtros (status/severidade), lista de incidentes, modal de detalhe |
| `public/dist/js/incidents/incidents-panel.js` | IIFE `IncidentsPanelPage` — carrega lista + stats, renderiza cards, modal de detalhe, workflow de status |
| `public/dist/components/sidebar.html` | Item `data-menu="incidents"` com icone `fa-exclamation-triangle`, posicionado apos Auditoria |
| `public/dist/js/permissions.js` | `'incidents'` adicionado a 7 perfis em `DEFAULT_ROLE_PAGES` |
| `supabase/snippets/incidents_page_permissions.sql` | Registro em `app_pages` (menu_order 35) + 35 permissoes (7 perfis × 5 escolas) + `seed_default_role_page_permissions` atualizada |

**Endpoints API:**
| Metodo | Rota | Permissao | Descricao |
|---|---|---|---|
| GET | `/api/incidents` | READ | Lista com filtros status/severity, multi-escola via `resolveManagedSchoolScope` |
| GET | `/api/incidents/:id` | READ | Detalhe do incidente |
| PUT | `/api/incidents/:id/status` | MANAGE | Altera status, severidade, notas de resolucao; auto-preenche `resolved_by`/`resolved_at` |
| GET | `/api/incidents/stats/summary` | READ | Contadores (abertos, em revisao, criticos, resolvidos, media de horas) |

**Comportamento por perfil:**
- **superadmin / network_manager / auditor** — veem todos os incidentes de escolas gerenciadas; podem alterar status (IN_REVIEW, RESOLVED, DISMISSED) e escrever notas de resolucao
- **direction / content_curator / coordination / public_operator** — visualizam incidentes; nao podem alterar status
- **secretariat / observer** — sem acesso a pagina

---

### 4.3 Painel de Feedback da IA

**Dados existentes:** `interaction_feedback` (helpful / not_helpful / incorrect), `interaction_source_evidence` (documento-fonte, relevancia, trecho usado), `assistant_responses` (resposta original, correcao, confianca)  
**API:** metricas agregadas disponiveis em `/api/intelligence/dashboard` e `/api/reports/operational-summary` (campos: `feedback_positive_rate`, `contested_response_rate`, `highest_dissatisfaction_topics`)  
**Frontend:** apenas numeros resumidos no dashboard — sem listagem detalhada nem acao de correcao  

**Pagina sugerida:** `/feedback` | page_key: `feedback`  
**Alternativa viavel:** Aba dentro de `/relatorios` com capacidade de drill-down

| Perfil | O que precisa ver/fazer | Tipo |
|---|---|---|
| `content_curator` | **Principal usuario.** Ver cada feedback negativo/incorreto, ler a resposta original, ver a fonte usada, e ir direto para corrigir a base de conhecimento | ✏️ Analise + acao de correcao |
| `network_manager` | Visao gerencial: quais temas tem mais insatisfacao, qual escola tem pior avaliacao, tendencia temporal | 👁 Dashboard + drill-down |
| `auditor` | Auditar se correcoes foram feitas apos feedbacks negativos; verificar ciclo de melhoria | 👁 Trilha de auditoria |
| `direction` | Entender a percepcao do cidadao sobre o atendimento da sua escola | 👁 Metricas da escola |
| `public_operator` | Ver feedback recebido sobre as conversas que ele supervisiona | 👁 Leitura filtrada |

**Dados que aparecem por feedback:**
- Tipo: helpful ✅ / not_helpful ⚠️ / incorrect ❌
- Pergunta original do cidadao
- Resposta dada pela IA
- Fonte documental usada (titulo, trecho, versao)
- Score de confianca e score de evidencia
- Se houve correcao posterior (`corrected_from_response_id`, `corrected_by`, `corrected_at`)
- Comentario livre do avaliador
- Data e autor do feedback

**Visoes agregadas uteis:**
- Top temas com maior taxa de "incorreto" (`highest_dissatisfaction_topics` — ja calculado no backend)
- Taxa de feedback positivo por assistente (`feedback_positive_rate`)
- Feedbacks pendentes de tratamento (incorrect sem correcao vinculada)
- Evolucao temporal da satisfacao

**Por que faz falta no dia a dia:** O curador precisa saber **o que corrigir** na base. Hoje ele teria que inferir pelo dashboard ou cacar na auditoria. Um painel dedicado com link direto "corrigir esta entrada na base" fecha o ciclo de melhoria continua.

**Por que faz falta na crise:** Se a IA comecou a dar respostas erradas em serie sobre um tema (ex: data de matricula desatualizada), o painel de feedback mostra o pico de "incorreto" e permite acao imediata.

#### Implementação Realizada

| Artefato | Caminho / Detalhes |
|---|---|
| **Rota** | `GET /feedback` → `public/dist/feedback.html` |
| **HTML** | `public/dist/feedback.html` — hero, 5 stat cards (Positivos, Nao Uteis, Incorretos, Taxa Positiva, Pendentes Correcao), toolbar de filtros (tipo + checkbox "somente pendentes"), lista de cards, modal de detalhe |
| **JS** | `public/dist/js/feedback/feedback-panel.js` — IIFE `FeedbackPanelPage`, funcoes `loadFeedbacks()`, `loadStats()`, `viewFeedback(id)`, `applyFilters()`, filtros client-side por tipo e pendencia de correcao |
| **API – Listagem** | `GET /api/feedback?type=&_t=` — join `interaction_feedback` + `assistant_responses` (resposta truncada em 400 chars, confidence_score, assistant_key, response_mode, status de correcao) + `interaction_source_evidence` (top 3 por resposta). Escopo multi-escola via `resolveManagedSchoolScope`. Roles: `FEEDBACK_READ_ROLES` |
| **API – Detalhe** | `GET /api/feedback/:id` — feedback completo com resposta integral, todas as evidencias e dados de correcao. Roles: `FEEDBACK_READ_ROLES` |
| **API – Estatísticas** | `GET /api/feedback/stats/summary` — totais (helpful, not_helpful, incorrect), positive_rate %, pending_correction (incorretos sem corrected_at). Roles: `FEEDBACK_READ_ROLES` |
| **Sidebar** | `data-menu="feedback"` com icone `fa-comment-dots` na secao GESTAO, apos Incidentes |
| **Permissoes (client)** | `permissions.js` — `'feedback'` adicionado a superadmin, network_manager, content_curator, public_operator, direction, auditor |
| **Permissoes (DB)** | `supabase/snippets/feedback_page_permissions.sql` — pagina registrada em `app_pages` (menu_order 40), 30 registros (6 perfis × 5 escolas), funcao `seed_default_role_page_permissions` atualizada |
| **Constantes** | `FEEDBACK_READ_ROLES` (6 perfis: superadmin, network_manager, content_curator, auditor, direction, public_operator), `FEEDBACK_ACT_ROLES` (3 perfis: superadmin, network_manager, content_curator) |

---

### 4.4 Gestao de Notificacoes (Admin)

**Dados existentes:** `notification_system_settings`, `user_notification_settings`, `notification_queue`, `notification_queue_deliveries`  
**API:** infraestrutura de envio e entrega definida em schema  
**Frontend:** apenas configuracao parcial de preferencias individuais em `/preferencias` — sem painel administrativo de envio  

**Pagina sugerida:** `/notificacoes` | page_key: `notifications`  
**Alternativa viavel:** Integrar como aba dentro de `/comunicados` para simplificar

| Perfil | O que precisa ver/fazer | Tipo |
|---|---|---|
| `superadmin` | Configuracao global: tipos de notificacao, canais ativos, regras de envio | ✏️ Config global |
| `network_manager` | Enviar notificacoes para membros da rede, acompanhar entregas | ✏️ Envio + rastreamento |
| `direction` | Enviar notificacoes para equipe da escola, acompanhar leitura | ✏️ Envio + rastreamento |
| `secretariat` | Enviar notificacoes sobre prazos e documentos | ✏️ Envio |
| `coordination` | Receber notificacoes; configurar suas preferencias | 👁 Autoconfigurar |

**Dados disponiveis:**
- Fila de notificacoes com status de envio
- Entrega por destinatario (`notification_queue_deliveries`)
- Configuracoes por tipo (sistema e por usuario)
- Canal de entrega (in-app, email, etc.)

**Por que faz falta no dia a dia:** O diretor precisa avisar a equipe sobre mudanca de horario, ou o gestor da rede precisa comunicar uma orientacao urgente. Hoje nao ha como enviar notificacoes internas rastreadas.

**Por que faz falta na crise:** Situacoes emergenciais exigem comunicacao interna rapida com confirmacao de recebimento. Uma notificacao de crise precisa ser enviada e rastreada (quem viu, quando).

#### Implementação Realizada

| Artefato | Caminho / Detalhes |
|---|---|
| **Rota** | `GET /notificacoes` → `public/dist/notifications.html` |
| **HTML** | `public/dist/notifications.html` — hero, 4 stat cards (Total, Enviadas, Pendentes, Hoje), toolbar com filtro de status + botao "Nova Notificacao", lista de cards, modal de detalhe, modal de envio |
| **JS** | `public/dist/js/notifications/notifications-panel.js` — IIFE `NotificationsPanelPage`, funcoes `loadNotifications()`, `loadStats()`, `viewNotification(id)`, `sendNotification()`, `applyFilters()` |
| **API – Fila** | `GET /api/notifications/queue?sent=` — lista notificacoes da fila com filtro por status de envio, join escola. Roles: `NOTIFICATIONS_ADMIN_ROLES` |
| **API – Detalhe** | `GET /api/notifications/queue/:id` — detalhe completo com entregas por usuario (`notification_queue_deliveries`). Roles: `NOTIFICATIONS_ADMIN_ROLES` |
| **API – Envio** | `POST /api/notifications/send` — enfileira notificacao manual (topic + message). Roles: `NOTIFICATIONS_SEND_ROLES` |
| **API – Configuracoes** | `GET /api/notifications/settings` — lista `notification_system_settings` por escola. Roles: `NOTIFICATIONS_ADMIN_ROLES` |
| **API – Estatísticas** | `GET /api/notifications/stats/summary` — totais (total, sent, pending, today). Roles: `NOTIFICATIONS_ADMIN_ROLES` |
| **Sidebar** | `data-menu="notifications"` com icone `fa-bell` na secao GESTAO, apos Feedback da IA |
| **Permissoes (client)** | `permissions.js` — `'notifications'` adicionado a superadmin, network_manager, direction, secretariat, coordination |
| **Permissoes (DB)** | `supabase/snippets/notifications_page_permissions.sql` — 4 tabelas criadas (notification_queue, notification_system_settings, notification_queue_deliveries, user_notification_settings), pagina registrada em `app_pages` (menu_order 45), 25 registros (5 perfis × 5 escolas), funcao `seed_default_role_page_permissions` atualizada |
| **Constantes** | `NOTIFICATIONS_ADMIN_ROLES` (5 perfis: superadmin, network_manager, direction, secretariat, coordination), `NOTIFICATIONS_SEND_ROLES` (4 perfis: superadmin, network_manager, direction, secretariat) |

---

## 5. Paginas Adicionais Necessarias — Visao por Perfil

Alem das 4 paginas confirmadas, a analise do backend revela lacunas de visibilidade que impactam o trabalho diario de perfis especificos. As sugestoes abaixo derivam de dados **que ja existem** no backend e so precisam de frontend.

### 5.1 Lacunas de Conhecimento (Knowledge Gaps) — ✅ IMPLEMENTADO

**Status:** Implementado em pagina dedicada `/lacunas` → `knowledge-gaps.html`

| Artefato | Caminho |
|---|---|
| Pagina HTML | `public/dist/knowledge-gaps.html` |
| Modulo JS | `public/dist/js/knowledge-gaps/knowledge-gaps-panel.js` |
| Endpoints | `GET /api/knowledge-gaps`, `GET /api/knowledge-gaps/by-assistant` |
| Constante roles | `KNOWLEDGE_GAPS_ROLES` em `server.js` |
| Migracao SQL | `supabase/snippets/knowledge_gaps_page_permissions.sql` |
| Permissoes | superadmin, network_manager, content_curator, direction, secretariat |
| Sidebar | `fa-puzzle-piece` apos Notificacoes, antes de CONFIGURACOES |

**Funcionalidades entregues:**
- Stat cards: total lacunas, abstencoes, sem fonte, fallback humano, topicos afetados
- Aba "Por Topico": agrupamento com barra proporcional, filtro de busca, modal de detalhes
- Aba "Por Assistente": breakdown de lacunas por assistente com top topicos
- Aba "Detalhes": lista individual com filtro por tipo de lacuna (abstencao/sem fonte/alto risco/fallback/baixa confianca) e busca
- Filtro de periodo (hoje, 7d, 30d, todo periodo)
- Badges visuais por tipo de lacuna
- Dados reutilizam tabelas existentes: `institutional_consultations`, `assistant_responses`, `formal_audit_events`, `consultation_messages`, `interaction_feedback`, `interaction_source_evidence`

---

### 5.2 Fila de Atendimento Humano (Human Handoff Queue) — ✅ IMPLEMENTADO

> **Status:** Implementado como pagina dedicada `/fila-humana` (`handoff-queue.html` + `handoff-queue-panel.js`).

**Implementacao realizada:**
- **Backend:** `GET /api/handoff-queue` (listagem de conversas com status WAITING_HUMAN/OPEN/IN_PROGRESS filtrado por escola, enriquecimento com ultima resposta da IA, nome da escola e tempo de espera em minutos) + `GET /api/handoff-queue/stats` (contagens: aguardando, abertas, em andamento, resolvidas hoje, tempo medio de espera)
- **Frontend:** Pagina dedicada em `/fila-humana` com 5 stat cards (Aguardando Humano, Abertas, Em Andamento, Resolvidas Hoje, Espera Media), filtro por status, lista de cards priorizados por tempo de espera (cores: >60min vermelho, >30min laranja), modal de detalhes com info da conversa + ultima resposta da IA (confianca, modo, flag de fallback)
- **Sidebar:** Item "Fila Humana" com icone `fa-headset` na secao ATENDIMENTO, logo abaixo de "Atendimento"
- **Permissoes:** Acessivel a: superadmin, network_manager, public_operator, secretariat, coordination, direction (mesmos roles de `HANDOFF_QUEUE_ROLES`)

| Perfil | O que ve | Status |
|---|---|---|
| `public_operator` | Fila priorizada: conversas onde a IA pediu humano, ordenadas por tempo de espera | ✅ Implementado |
| `secretariat` | Fila de conversas encaminhadas para a secretaria | ✅ Implementado |
| `coordination` | Fila de conversas pedagogicas nao tratadas pela IA | ✅ Implementado |
| `direction` | Visao gerencial: quantas na fila, ha quanto tempo, por qual motivo | ✅ Implementado |
| `network_manager` | Visao consolidada: fila humana de todas as escolas | ✅ Implementado |

**Cenario de crise:** 30 cidadaos perguntam sobre suspensao de aula no mesmo dia. A IA nao tem resposta na base e faz fallback humano em todas. Na pagina `/fila-humana`, o operador ve a quantidade, o tempo de espera (destacado em vermelho quando >60min), e pode abrir cada conversa para ver a ultima resposta da IA e o nivel de confianca.

---

### 5.3 Trilha de Correcoes da IA (AI Correction Trail) — ✅ IMPLEMENTADO

> **Status:** Implementado como pagina dedicada `/correcoes` (`corrections.html` + `corrections-panel.js`).

**Implementacao realizada:**
- **Backend:** `GET /api/corrections` (listagem com filtros por status e tipo, paginacao, enriquecimento com feedback/resposta/escola) + `GET /api/corrections/stats/summary` (contagens por status, media de horas ate resolucao, pendentes de revisao)
- **Frontend:** Pagina dedicada em `/correcoes` com 6 stat cards (Submetidas, Em Revisao, Aprovadas, Aplicadas, Rejeitadas, Media de horas), filtros por status e tipo, lista de cards com timeline completa, modal de detalhes com botoes de transicao (review/approve/reject/apply)
- **Sidebar:** Item "Correcoes" com icone `fa-check-double` na secao GESTAO, logo abaixo de "Feedback da IA"
- **Permissoes:** Acessivel a: superadmin, network_manager, content_curator, public_operator, direction, auditor (mesmos roles de `FEEDBACK_READ_ROLES`). Acoes de transicao limitadas a `FEEDBACK_ACT_ROLES` (superadmin, network_manager, content_curator)

| Perfil | O que ve | Status |
|---|---|---|
| `auditor` | Historico completo: resposta original → correcao → quem corrigiu → linha do tempo | ✅ Implementado |
| `content_curator` | Suas correcoes e as pendentes; pode revisar, aprovar e aplicar | ✅ Implementado |
| `direction` | Visualizacao de correcoes da escola com stat cards | ✅ Implementado |
| `network_manager` | Visao multi-escola de correcoes com filtros | ✅ Implementado |

**Cenario de crise:** Apos um incidente HIGH (resposta incorreta sobre procedimento de saude), a trilha de correcao na pagina `/correcoes` documenta: a resposta original, quem corrigiu, a nova resposta, e toda a linha do tempo (submissao → revisao → aprovacao → aplicacao). Isso e essencial para prestacao de contas.

> **Lacuna remanescente (L10, Sprint 3):** A transicao "APPLIED" ainda e administrativa — nao altera automaticamente a base de conhecimento. O destino de aplicacao e registrado, mas a mudanca real na base precisa ser feita manualmente.

#### 5.3.1 Rastreabilidade Correcao → Mudanca na Base (G4) — ✅ IMPLEMENTADO

> **Status:** Implementado com nova tabela `correction_kb_changes` e endpoints dedicados.

**Gap original (G4):** Sem rastreabilidade "correcao → mudanca na base" — CRITICA. Quando uma correcao era aplicada, nao havia registro de qual mudanca real foi feita na base de conhecimento.

**Solucao implementada:**
- **Nova tabela `correction_kb_changes`** — registra cada mudanca na base vinculada a uma correcao (tipo de mudanca, descricao, snapshots antes/depois, documento fonte afetado, versao)
- **Migracao SQL:** `supabase/snippets/correction_kb_changes_migration.sql`
- **Transicao "apply" aprimorada** — `PUT /api/corrections/:id/transition` aceita array `kb_changes` no corpo da requisicao para registrar mudancas automaticamente ao aplicar
- **`GET /api/corrections/:id/kb-changes`** — lista mudancas na base vinculadas a uma correcao (com titulo do documento fonte)
- **`POST /api/corrections/:id/kb-changes`** — registra manualmente uma mudanca na base para correcao ja aplicada
- **Frontend atualizado em `corrections-panel.js`:** secao de mudancas na base no modal de detalhes, botao "Registrar Mudanca na Base" para correcoes APPLIED, snapshots expansiveis antes/depois

| Tipos de mudanca suportados | Descricao |
|---|---|
| `content_updated` | Conteudo do documento atualizado |
| `source_created` | Novo documento criado |
| `source_suspended` | Documento suspenso |
| `prompt_adjusted` | Prompt do sistema ajustado |
| `embedding_refreshed` | Embeddings recalculados |
| `faq_updated` | FAQ atualizado |
| `other` | Outro tipo de mudanca |

---

#### 5.3.2 Dashboard de Ciclo de Melhoria com SLA (G5) — ✅ IMPLEMENTADO

> **Status:** Implementado como pagina dedicada `/ciclo-melhoria` (`improvement-cycle.html` + `improvement-cycle-panel.js`).

**Gap original (G5):** Sem dashboard de ciclo de melhoria (SLA feedback→correcao) — MEDIA. Nao havia visao consolidada do funil de melhoria continua nem metricas de tempo (SLA) entre as etapas.

**Solucao implementada:**
- **`GET /api/improvement-cycle/stats`** — endpoint com metricas completas:
  - **Funil de 7 niveis:** total_feedbacks → negative_feedbacks → feedbacks_with_corrections → total_corrections → applied_corrections → corrections_with_kb_changes → total_kb_changes
  - **4 taxas de conversao:** feedback→correcao, correcao→aplicada, aplicada→mudanca KB, ciclo completo
  - **4 metricas SLA (em horas):** feedback→correcao, correcao→aplicada, aplicada→mudanca KB, ciclo total
  - **3 distribuicoes:** tipos de correcao, causas raiz, tipos de mudanca KB
- **Pagina `/ciclo-melhoria`:** tema laranja, icone fa-sync-alt, 4 cards SLA, visualizacao de funil, 4 cards de taxa de conversao, 3 secoes de distribuicao

| Perfil | Acesso |
|---|---|
| `superadmin` | ✅ |
| `network_manager` | ✅ |
| `content_curator` | ✅ |
| `direction` | ✅ |
| `auditor` | ✅ |

---

### 5.4 Visao Consolidada da Rede (Network Overview) — ✅ IMPLEMENTADO

**Status:** Implementado em 2025-07-18.

**O que foi entregue:**
- **Backend** — `GET /api/network/overview`: retorna metricas por escola (cobertura, confianca, consultas, resolucao, incidentes, feedbacks, correcoes, health score composto) com totais agregados da rede. Usa `resolveManagedSchoolScope` para escopo automatico. Roles: `superadmin`, `network_manager`, `auditor`, `direction`.
- **Frontend** — `/visao-rede` → `network-overview.html` + `network-overview-panel.js`: hero azul, 8 stat cards de totais da rede, tabela de ranking com ordenacao por coluna (escola, saude, cobertura, confianca, consultas, resolucao, incidentes, feedback+, correcoes). Health score com badges coloridos (verde/laranja/vermelho).
- **Wiring** — `distPages`, rota `/visao-rede`, sidebar (secao GESTAO com icone `fa-project-diagram`), `permissions.js` (superadmin, network_manager, auditor, direction).

**Health Score:** Composicao ponderada (0-100): cobertura (30%), confianca (30%), feedback positivo (20%), incidentes abertos (-20% proporcional), criticos (-10 cada).

**Dados existentes no backend (originais):**
- `resolveManagedSchoolScope` ja resolve escolas filhas de uma rede
- `intelligence_snapshots` registra metricas diarias por escola (`source_coverage_rate`, `avg_confidence`)
- `incident_reports`, `interaction_feedback`, `response_corrections` todos com `school_id`

| Perfil | O que gostaria de ver | Entregue |
|---|---|---|
| `network_manager` | Ranking de escolas por cobertura, confianca, incidentes, feedbacks | ✅ Tabela completa com ordenacao |
| `superadmin` | Mesma visao, nivel plataforma | ✅ Escopo global automatico |
| `auditor` | Comparativo de governanca: correcoes, incidentes, revisoes | ✅ Colunas de correcoes e incidentes |
| `direction` | Posicao da escola em relacao a rede | ✅ Ranking visivel |

---

## 6. Quadro Resumo — Todas as Paginas Faltantes por Perfil

### Paginas confirmadas

| Pagina | superadmin | net_mgr | curator | operator | secret. | coord. | direction | auditor | observer |
|---|---|---|---|---|---|---|---|---|---|
| Mural de Comunicados | ✅ | ✅ | ✏️ | 👁 | ✅ | ✅ | ✅ | — | 👁 |
| Painel de Incidentes | ✅ | ✅ | 👁 | 👁 | — | 👁 | 👁 | ✅ | — |
| Feedback da IA | ✅ | ✅ | ✅ | 👁 | — | — | 👁 | 👁 | — |
| Gestao de Notificacoes | ✅ | ✅ | — | — | ✅ | 👁 | ✅ | — | — |

### Paginas sugeridas (lacunas de visibilidade com dados ja disponiveis)

| Pagina | superadmin | net_mgr | curator | operator | secret. | coord. | direction | auditor | observer |
|---|---|---|---|---|---|---|---|---|---|
| Lacunas de Conhecimento | ✅ | ✅ | ✅ | — | 👁 | — | 👁 | — | — |
| Fila de Atendimento Humano | ✅ | ✅ | — | ✅ | ✅ | 👁 | 👁 | — | — |
| Trilha de Correcoes da IA | ✅ | ✅ | ✅ | — | — | — | 👁 | ✅ | — |
| Visao Consolidada da Rede | ✅ | ✅ | — | — | — | — | 👁 | 👁 | — |

**Legenda:** ✅ = acesso completo (CRUD/gestao) | ✏️ = revisao/aprovacao | 👁 = leitura/acompanhamento | — = sem acesso

---

## 7. O que Cada Perfil Ganha com as Novas Paginas

### Diretor (`direction`)

**No dia a dia:**
- Publica comunicados da escola sem depender de canais informais (WhatsApp, papel)
- Ve se a IA esta falhando em algum tema da escola dele (lacunas + feedback)
- Sabe quantas conversas estao esperando humano e ha quanto tempo
- Envia notificacao para a equipe com rastreamento de leitura

**Na crise:**
- Emite comunicado de emergencia rastreavel em minutos
- Ve o incidente critico com timeline e responsaveis
- Verifica se a correcao da resposta errada ja foi feita
- Notifica equipe com confirmacao de recebimento

### Gestor da Rede (`network_manager`)

**No dia a dia:**
- Compara desempenho entre escolas (cobertura, confianca, fallback)
- Identifica qual escola precisa de mais curadoria
- Publica comunicados da rede visivel para todas as unidades

**Na crise:**
- Identifica rapidamente qual escola foi mais impactada
- Ve fila humana consolidada para redistribuir operadores
- Emite comunicado centralizado com alcance total

### Curador de Conteudo (`content_curator`)

**No dia a dia:**
- **Sabe o que falta na base** — lacunas de conhecimento com link para criar entrada
- **Sabe o que esta errado** — feedbacks "incorreto" com link para corrigir
- Revisa e aprova comunicados antes da publicacao
- Acompanha suas correcoes e se foram efetivas

**Na crise:**
- Ve imediatamente o tema que a IA comecou a errar (pico de feedbacks negativos)
- Corrige a base e acompanha se as proximas respostas melhoram

### Operador de Atendimento (`public_operator`)

**No dia a dia:**
- **Fila priorizada** de conversas que precisam de humano — sabe por onde comecar
- Consulta comunicados vigentes para informar o cidadao corretamente

**Na crise:**
- Fila mostra volume de emergencia; pode escalar para a direcao
- Feedback rapido sobre respostas que deu errado

### Auditor (`auditor`)

**No dia a dia:**
- Painel dedicado de incidentes com workflow de resolucao
- Trilha de correcoes: garante que cada erro foi corrigido e documentado
- Visao por escola: nenhuma escola fica sem supervisao

**Na crise:**
- Timeline completa do incidente: deteccao → triagem → correcao → resolucao
- Evidencia documentada para prestacao de contas

### Secretaria (`secretariat`)

**No dia a dia:**
- Publica avisos de prazos, horarios, documentos exigidos
- Ve perguntas frequentes que a IA nao sabe responder sobre secretaria
- Responde conversas encaminhadas pela IA sobre documentos

**Na crise:**
- Emite comunicado administrativo urgente (ex: mudanca de horario)
- Envia notificacao com rastreamento

### Coordenacao (`coordination`)

**No dia a dia:**
- Publica comunicados pedagogicos (reunioes, projetos)
- Ve conversas pedagogicas que a IA encaminhou para humano

**Na crise:**
- Acompanha incidentes que envolvem temas pedagogicos sensiveis

---

## 8. Priorizacao Sugerida

### Lote 1 — Impacto imediato no dia a dia

| # | Pagina | Justificativa |
|---|---|---|
| 1 | **Mural de Comunicados** | Funcionalidade mais demandada por escolas publicas; elimina dependencia de canais informais |
| 2 | **Lacunas de Conhecimento** | Fecha o ciclo de melhoria da IA: curador sabe o que falta, cria, qualidade melhora |
| 3 | **Fila de Atendimento Humano** | O operador precisa de prioridade; sem fila, o cidadao espera sem previsao |

### Lote 2 — Governanca e accountability

| # | Pagina | Justificativa |
|---|---|---|
| 4 | **Painel de Incidentes** | Incidentes criticos precisam de tratamento visivel e rastreavel |
| 5 | **Feedback da IA** | Completa o ciclo: cidadao avalia → curador corrige → base melhora |
| 6 | **Trilha de Correcoes** | Prestacao de contas: toda correcao documentada de ponta a ponta |

### Lote 3 — Visao gerencial e comunicacao interna

| # | Pagina | Justificativa |
|---|---|---|
| 7 | **Visao Consolidada da Rede** | Essencial para o gestor de rede; pode ser aba dentro do dashboard |
| 8 | **Gestao de Notificacoes** | Pode ser integrado ao mural de comunicados na fase inicial |

---

## 9. Observacoes Tecnicas

- O **Calendario Escolar** (`/calendario-escolar`) ja possui pagina HTML mas **nao aparece na sidebar**. Deve ser adicionado.
- A pagina de **Preferencias** atualmente so esta permissionada para `network_manager` no seed padrao. Todos os perfis deveriam ter acesso ao menos para configurar suas notificacoes.
- Paginas como **Lacunas de Conhecimento** e **Fila de Atendimento Humano** podem ser implementadas como **abas** dentro de paginas existentes (`/conhecimento` e `/atendimento`) em vez de paginas separadas — isso reduz complexidade de navegacao.
- Todas as novas paginas precisam ser registradas na tabela `app_pages` e na funcao `seed_default_role_page_permissions`.
- O filtro de visibilidade no menu e feito via JS (`permissions.js`), lendo a tabela `role_page_permissions`. Novas paginas seguem o mesmo padrao.

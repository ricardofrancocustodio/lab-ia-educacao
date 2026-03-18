# Contexto do Projeto Qnexy para Reproducao por IA

Gerado em: 16/03/2026 11:16:28

## Visao Geral

- Stack principal: Node.js + Express no backend, Supabase como banco/autenticacao e frontend administrativo estatico em `public\dist`.
- Arquivo principal do backend: `server.js`.
- Banco: migrations/snippets SQL em `supabase\snippets` e schema base em `schema.sql`.
- Objetivo geral do produto: plataforma escolar com CRM, leads, calendario, eventos/passeios, financiamento de atividades, mural, relatorios, perfil/permissoes e monitor social com IA.

## Estrutura de Pastas

### Raiz

```text
qnexy
+-- .qodo
|   +-- agents
|   +-- api
|   +-- config
|   +-- core
|   +-- middleware
|   +-- services
|   +-- store
|   +-- utils
|   +-- web
|   +-- workflows
|   \-- test.js
+-- .vscode
|   \-- settings.json
+-- public
|   +-- .github
|   +-- dist
|   +-- js
|   +-- omnichannel
|   +-- src
|   +-- .browserslistrc
|   +-- .bundlewatch.config.json
|   +-- .editorconfig
|   +-- .eslintignore
|   +-- .eslintrc.json
|   +-- .gitattributes
|   +-- .gitignore
|   +-- .gitpod.yml
|   +-- .lgtm.yml
|   +-- .npmignore
|   +-- .prettierrc
|   +-- .stylelintignore
|   +-- .stylelintrc.json
|   +-- 404.html
|   +-- ACCESSIBILITY-COMPLIANCE.md
|   +-- CHANGELOG.md
|   +-- CODE_OF_CONDUCT.md
|   +-- composer.json
|   +-- eslint.config.js
|   +-- favicon.ico
|   +-- index.html
|   +-- LICENSE
|   +-- package.json
|   +-- package-lock.json
|   +-- README 2.md
|   +-- README.md
|   \-- tsconfig.json
+-- scripts
|   +-- export-project-context.bat
|   +-- export-project-context.ps1
|   +-- quick_add.js
|   +-- retrieve_folder_struct.js
|   +-- syncActivities.js
|   +-- syncKnowledgeBase copy.js
|   \-- syncKnowledgeBase.js
+-- supabase
|   +-- .branches
|   +-- .temp
|   +-- functions
|   +-- snippets
|   \-- config.toml
+-- views
|   \-- components
+-- .dockerignore
+-- .env
+-- .firebaserc
+-- .gitignore
+-- debug.js
+-- Dockerfile
+-- dump_.json
+-- firebase.json
+-- meu_arquivo.txt
+-- package.json
+-- package-lock.json
+-- project-context-for-ai.md
+-- schema.sql
+-- server copy.js
+-- server.js
\-- test-sync.js
```

### Backend

```text
supabase
+-- .branches
|   \-- _current_branch
+-- .temp
|   +-- cli-latest
|   +-- gotrue-version
|   +-- pooler-url
|   +-- postgres-version
|   +-- project-ref
|   +-- rest-version
|   +-- storage-migration
|   \-- storage-version
+-- functions
|   +-- embed
|   \-- invite-user
+-- snippets
|   +-- activity_finance_schema.sql
|   +-- add_children_shift.sql
|   +-- add_parent_segment_id_to_segments.sql
|   +-- add_school_id_lead_status_history.sql
|   +-- event_attendance_schema.sql
|   +-- event_authorization_csv_schema.sql
|   +-- events_and_trips_schema.sql
|   +-- fix_lead_status_history_trigger_school_id.sql
|   +-- notice_board_schema.sql
|   +-- notification_user_settings_migration.sql
|   +-- notifications_per_user_delivery.sql
|   +-- rbac_page_permissions.sql
|   +-- social_monitor_schema.sql
|   \-- sync_school_members_role_entities.sql
\-- config.toml
```

```text
server.js
schema.sql
scripts
.qodo
```

### Frontend

```text
dist
+-- assets
|   +-- alvacir
|   |   \-- marcaavr.png
|   \-- img
|       +-- credit
|       +-- AdminLTEFullLogo.png
|       +-- AdminLTELogo.png
|       +-- avatar.png
|       +-- avatar2.png
|       +-- avatar3.png
|       +-- avatar4.png
|       +-- avatar5.png
|       +-- boxed-bg.jpg
|       +-- boxed-bg.png
|       +-- default-150x150.png
|       +-- icons.png
|       +-- photo1.png
|       +-- photo2.png
|       +-- photo3.jpg
|       +-- photo4.jpg
|       +-- prod-1.jpg
|       +-- prod-2.jpg
|       +-- prod-3.jpg
|       +-- prod-4.jpg
|       +-- prod-5.jpg
|       +-- user1-128x128.jpg
|       +-- user2-160x160.jpg
|       +-- user3-128x128.jpg
|       +-- user4-128x128.jpg
|       +-- user5-128x128.jpg
|       +-- user6-128x128.jpg
|       +-- user7-128x128.jpg
|       \-- user8-128x128.jpg
+-- components
|   +-- footer.html
|   +-- head.html
|   +-- header.html
|   \-- sidebar.html
+-- css
|   +-- calendar
|   |   \-- calendar.css
|   +-- coordinator
|   |   \-- coordinator-page.css
|   +-- crm
|   |   \-- crm.css
|   +-- leads
|   |   \-- leads.css
|   +-- notice-board
|   +-- users
|   |   \-- users.css
|   +-- adminlte.css
|   +-- adminlte.css.map
|   +-- adminlte.min.css
|   +-- adminlte.min.css.map
|   +-- adminlte.rtl.css
|   +-- adminlte.rtl.css.map
|   +-- adminlte.rtl.min.css
|   +-- adminlte.rtl.min.css.map
|   \-- css.css
+-- docs
|   +-- components
|   |   +-- main-header.html
|   |   \-- main-sidebar.html
|   +-- javascript
|   |   \-- treeview.html
|   +-- browser-support.html
|   +-- color-mode.html
|   +-- faq.html
|   +-- how-to-contribute.html
|   +-- introduction.html
|   +-- layout.html
|   \-- license.html
+-- examples
|   +-- lockscreen.html
|   +-- login.html
|   +-- login-v2.html
|   +-- register.html
|   \-- register-v2.html
+-- forms
|   \-- general.html
+-- generate
|   \-- theme.html
+-- js
|   +-- activity-finance
|   |   +-- activity-finance-manager.js
|   |   \-- activity-finance-public.js
|   +-- calendar
|   |   \-- coordinator-widget.js
|   +-- chat
|   |   \-- chat-manager.js
|   +-- coordinator
|   |   \-- carregar-componentes.js
|   +-- dashboard
|   |   +-- charts.js
|   |   +-- core.js
|   |   +-- kpis.js
|   |   \-- leads.js
|   +-- events
|   |   +-- event-public.js
|   |   \-- events-manager.js
|   +-- knowledge-base
|   |   +-- knowledge-base.js
|   |   \-- knowledge-base-custom.js
|   +-- leads
|   |   +-- leads.controller.js
|   |   +-- leads.ui.js
|   |   \-- leads-service.js
|   +-- notice-board
|   |   +-- notice-board.js
|   |   +-- notice-board-core.js
|   |   +-- tab-gestao.js
|   |   \-- tab-mural.js
|   +-- preferences
|   |   +-- core-preferences.js
|   |   +-- data-preferences.js
|   |   +-- general-settings.js
|   |   +-- notification-page-settings.js
|   |   \-- ui-preferences.js
|   +-- profile
|   |   +-- profile.js
|   |   \-- validacao_senha.js
|   +-- reports
|   |   +-- agendamentos_vs_vagas.js
|   |   +-- demanda_turno.js
|   |   +-- evolucao_turmas.js
|   |   +-- funil_semanal.js
|   |   +-- heatmap_horarios.js
|   |   +-- impacto_ia.js
|   |   +-- leads_por_segmento.js
|   |   \-- status_saude.js
|   +-- social
|   |   \-- social-monitor.js
|   +-- users
|   |   \-- users.js
|   +-- adminlte.js
|   +-- adminlte.js.map
|   +-- adminlte.min.js
|   +-- adminlte.min.js.map
|   +-- agenda-atendimentos.js
|   +-- cache.js
|   +-- calendar-logic.js
|   +-- components-loader.js
|   +-- crm.js
|   +-- dashboard_bkp.js
|   +-- dashboard-coordinator.js
|   +-- js.js
|   +-- leads-crm.js
|   +-- permissions.js
|   +-- school-segments_bkp.js
|   \-- session.js
+-- layout
|   +-- collapsed-sidebar.html
|   +-- fixed-complete.html
|   +-- fixed-footer.html
|   +-- fixed-header.html
|   +-- fixed-sidebar.html
|   +-- layout-custom-area.html
|   +-- layout-rtl.html
|   +-- logo-switch.html
|   +-- sidebar-mini.html
|   \-- unfixed-sidebar.html
+-- static
|   \-- category.js
+-- tables
|   \-- simple.html
+-- UI
|   +-- general.html
|   +-- icons.html
|   \-- timeline.html
+-- widgets
|   +-- cards.html
|   +-- info-box.html
|   \-- small-box.html
+-- accept-invite.html
+-- activity-finance.html
+-- activity-finance-public.html
+-- agenda-atendimentos.html
+-- calendar.html
+-- chat-manager.html
+-- crm.html
+-- dashboard.html
+-- dashboard-coordinator.html
+-- dashboard-preferencias.html
+-- event-public.html
+-- events.html
+-- forgot-password.html
+-- index.html
+-- index_old.html
+-- index2.html
+-- index3.html
+-- knowledge-base copy.html
+-- knowledge-base.html
+-- leads.html
+-- notice-board.html
+-- preferences-notifications.html
+-- profile.html
+-- qnexy.html
+-- reports.html
+-- reset-password.html
+-- social-monitor.html
+-- users.html
\-- verify-session.html
```

## Backend

### Papel do Backend

- Eventos e passeios: o backend expÃµe endpoints publicos para consultar evento, validar elegibilidade, registrar autorizacao, rastrear acessos e processar pagamentos.
- Financiamento de atividades: replica o modelo publico/privado dos eventos, mas focado em arrecadacao/adesao financeira.
- Monitor social: recebe mensagens de conectores/redes, classifica o teor, bloqueia respostas sensiveis, cria alertas para a diretoria e tenta responder automaticamente quando permitido.
- Mercado Pago: recebe webhooks, cria pagamentos PIX/cartao e atualiza o status operacional.
- Notificacoes: possui rotas para lembretes, notificacao em comunidade e preferencias por usuario.

### Arquivos e Modulos do Backend

| Caminho | Funcionalidade |
|---|---|
| `server.js` | Servidor Node.js com Express. Centraliza APIs do produto: eventos publicos, pagamentos Mercado Pago, monitor social, importacao de autorizacoes, notificacoes e webhooks. |
| `.qodo\web\webhook.js` | Webhook complementar do ecossistema Qodo/Webchat, plugado no servidor principal em /webhook. |
| `.qodo\api\webchat.js` | API complementar do webchat, plugada em /api/webchat. |
| `schema.sql` | Schema base inicial do banco. Serve como referencia estrutural do projeto. |
| `supabase\snippets\activity_finance_schema.sql` | Estrutura de financiamento de atividades, pagina publica e controle de pagamentos por responsavel. |
| `supabase\snippets\events_and_trips_schema.sql` | Estrutura principal de eventos e passeios: cadastro, configuracao, pagina publica e fluxo de adesao. |
| `supabase\snippets\event_authorization_csv_schema.sql` | Base para importar publico-alvo e autorizacoes de eventos via CSV. |
| `supabase\snippets\event_attendance_schema.sql` | Persistencia da lista de presenca operacional por evento e aluno. |
| `supabase\snippets\notice_board_schema.sql` | Mural/notice board com abas de gestao e publicacao. |
| `supabase\snippets\social_monitor_schema.sql` | Monitor social com conectores, mensagens recebidas, triagem sensivel e fila de revisao da diretoria. |
| `supabase\snippets\rbac_page_permissions.sql` | Permissoes de pagina e controle RBAC por escola e papel. |
| `supabase\snippets\notification_user_settings_migration.sql` | Preferencias individuais de notificacao por usuario. |
| `supabase\snippets\notifications_per_user_delivery.sql` | Entrega e rastreio de notificacoes por usuario. |
| `supabase\snippets\sync_school_members_role_entities.sql` | Sincronizacao entre membros da escola, papeis e entidades relacionadas. |
| `scripts` | Scripts utilitarios para manutencao, exportacao de contexto, testes isolados e automacoes locais. |

## Frontend

### Papel do Frontend

- Frontend administrativo em public\\dist, com paginas HTML por modulo e JS separado por dominio funcional.
- A UI usa componentes compartilhados e mapa de permissao para montar menu e acesso conforme o papel do usuario.
- Cada modulo principal possui pagina interna e, quando necessario, pagina publica correspondente para familia/responsavel.
- Eventos, financiamento e monitor social ja estao organizados de forma que outra IA consiga reproduzir a experiencia completa olhando HTML + JS + schema backend correspondente.

### Arquivos e Modulos do Frontend

| Caminho | Funcionalidade |
|---|---|
| `public\dist\components` | Componentes compartilhados do layout: head, header, sidebar e footer. |
| `public\dist\js\components-loader.js` | Carrega os componentes compartilhados nas paginas do frontend. |
| `public\dist\js\session.js` | Gerencia sessao no frontend e auxilia protecao de paginas. |
| `public\dist\js\permissions.js` | Mapa de permissoes por pagina/funcao para esconder ou liberar modulos na interface. |
| `public\dist\dashboard.html` | Dashboard principal da escola. |
| `public\dist\js\dashboard` | KPIs, graficos e consolidacao do dashboard principal. |
| `public\dist\crm.html` | Tela de CRM comercial/relacionamento. |
| `public\dist\js\crm.js` | Logica principal do CRM. |
| `public\dist\leads.html` | Tela de gestao de leads. |
| `public\dist\js\leads` | Arquitetura modular dos leads: controller, service e UI. |
| `public\dist\calendar.html` | Calendario operacional. |
| `public\dist\js\calendar-logic.js` | Regras de calendario e agenda visual. |
| `public\dist\agenda-atendimentos.html` | Agenda de atendimentos/visitas. |
| `public\dist\js\agenda-atendimentos.js` | Fluxo operacional dos atendimentos agendados. |
| `public\dist\chat-manager.html` | Tela de conversa/chat da operacao. |
| `public\dist\js\chat\chat-manager.js` | Gerencia UI de conversas, mensagens e atendimento. |
| `public\dist\events.html` | Gestao de eventos e passeios: cadastro, escopo por segmento/turmas, pagamentos, autorizacoes e lista operacional. |
| `public\dist\js\events\events-manager.js` | Motor do modulo de eventos: modal, regras de negocio, lista operacional, presenca, exportacoes e integracao com pagina publica. |
| `public\dist\event-public.html` | Pagina publica do evento para familia autorizar, visualizar detalhes e pagar. |
| `public\dist\js\events\event-public.js` | Fluxo publico do evento: elegibilidade, autorizacao, tracking e pagamento. |
| `public\dist\activity-finance.html` | Gestao interna de financiamento de atividades. |
| `public\dist\js\activity-finance\activity-finance-manager.js` | CRUD, regras e painel operacional de financiamento. |
| `public\dist\activity-finance-public.html` | Pagina publica de pagamento/adesao do financiamento. |
| `public\dist\js\activity-finance\activity-finance-public.js` | Fluxo publico de financiamento, elegibilidade e pagamento. |
| `public\dist\notice-board.html` | Mural interno com abas de gestao e publicacao. |
| `public\dist\js\notice-board` | Core do mural e abas especializadas para gestao e mural. |
| `public\dist\social-monitor.html` | Painel de monitoramento de Instagram, Facebook e TikTok com triagem sensivel e fila manual. |
| `public\dist\js\social\social-monitor.js` | Frontend do monitor social: overview, simulacao, fila sensivel e configuracao de conectores. |
| `public\dist\reports.html` | Hub de relatorios da operacao. |
| `public\dist\js\reports` | Graficos e relatorios especificos: funil, demanda, impacto IA, heatmap, status e correlatos. |
| `public\dist\preferences-notifications.html` | Tela de preferencias e notificacoes. |
| `public\dist\js\preferences` | Configuracoes gerais, dados, UI e notificacoes por usuario. |
| `public\dist\profile.html` | Perfil do usuario autenticado. |
| `public\dist\js\profile` | Edicao de perfil e validacao de senha. |
| `public\dist\users.html` | Gestao de usuarios e acessos. |
| `public\dist\js\users\users.js` | Cadastro/edicao de usuarios, papeis e rotulos de paginas. |

## Como Outra IA Pode Reproduzir o Projeto

1. Recriar primeiro a estrutura de dados do Supabase a partir de `schema.sql` e dos arquivos em `supabase\snippets`.
2. Implementar o backend Express usando `server.js` como eixo central de rotas e integracoes.
3. Reproduzir o frontend por dominio funcional em `public\dist`, mantendo o padrao `pagina.html` + `js/modulo/*.js`.
4. Garantir RBAC e carregamento de componentes compartilhados antes de montar os modulos especificos.
5. Validar principalmente os fluxos criticos: evento publico, financiamento publico, mural, permissoes e monitor social.


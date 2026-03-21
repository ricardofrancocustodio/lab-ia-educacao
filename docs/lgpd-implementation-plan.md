# Plano Tecnico de Adequacao LGPD

## Objetivo

Este documento organiza a adequacao LGPD do sistema em fases executaveis, com foco em:

- reducao de risco imediato
- segregacao correta de dados por escola
- protecao de dados pessoais em fluxos administrativos e de IA
- trilha de auditoria, retencao e atendimento a direitos do titular

## Resumo Executivo

O sistema ja possui uma base util para governanca:

- controle de papeis e permissoes por pagina
- auditoria formal
- registro de incidentes
- versionamento de fontes de conhecimento

Os principais gaps atuais sao:

- backend confiando em `school_id` vindo da requisicao
- uso de `SUPABASE_SERVICE_KEY` sem camadas fortes de validacao por escola
- ausencia de RLS nas tabelas centrais do produto
- credenciais e tokens sensiveis presentes no repositorio
- ausencia de politica tecnica de retencao, descarte e anonimizaÃ§Ã£o
- ausencia de estrutura para base legal, finalidade e atendimento ao titular
- fluxo de IA sem camada explicita de minimizacao/redacao de dados pessoais

## Fase 0 - Contencao Imediata

Prazo sugerido: imediato

### 0.1 Segredos e credenciais

- remover do repositorio:
  - `.qodo/services/google/credentials.json`
  - `.qodo/services/google/services/google/token.json`
  - `.qodo/services/google/services/google/token-ef1.json`
  - `.qodo/services/google/services/google/token-ef2.json`
  - `.qodo/services/google/services/google/token-ef3.json`
- rotacionar as credenciais do Google expostas
- revisar `.env`, secrets do Supabase, OpenAI, Groq, Gemini e WhatsApp
- garantir `.gitignore` para credenciais locais

### 0.2 Isolamento entre escolas

- parar de confiar em `school_id` vindo do cliente em rotas administrativas
- derivar `school_id` da sessao autenticada ou token assinado
- adicionar middleware central de autenticacao/autorizacao no Express
- bloquear leitura/escrita cross-school mesmo em rotas internas

Arquivos impactados:

- `server.js`
- `.qodo/api/webchat.js`
- `.qodo/services/supabase.js`
- `public/dist/js/*` onde hoje ha envio de `school_id`

### 0.3 Exposicao de service role

- revisar todos os usos de `SUPABASE_SERVICE_KEY`
- limitar seu uso a operacoes estritamente server-side
- introduzir camada de autorizacao antes de qualquer acesso com service role

Arquivos impactados:

- `server.js`
- `.qodo/services/supabase.js`
- scripts administrativos

## Fase 1 - Seguranca Estrutural

Prazo sugerido: curto

### 1.1 RLS nas tabelas centrais

Aplicar `enable row level security` e policies em:

- `schools`
- `school_members`
- `source_documents`
- `knowledge_source_versions`
- `knowledge_base`
- `institutional_consultations`
- `consultation_messages`
- `assistant_responses`
- `formal_audit_events`
- `interaction_feedback`
- `interaction_source_evidence`
- `incident_reports`
- `official_content_records`

Observacoes:

- `platform_members` pode manter politica separada para superadmin
- usar vinculo por `auth.uid()` com `school_members.user_id`
- separar leitura operacional de leitura de auditoria e exportacao

Arquivos impactados:

- `schema.sql`
- novos snippets em `supabase/snippets/`

### 1.2 Matriz de acesso por tipo de dado

Nao basta permissao por pagina. Precisamos de permissao por nivel de detalhe:

- leitura de conversa
- leitura de dados pessoais identificados
- leitura de evidencias e auditoria
- exportacao
- incidente
- configuracao de IA

Recomendacao:

- manter pagina/permissao atual
- adicionar capacidade por acao ou perfil de risco

Arquivos impactados:

- `schema.sql`
- `.qodo/api/webchat.js`
- rotas administrativas de `server.js`

### 1.3 Log seguro

- revisar logs para nao imprimir payload com dados pessoais
- padronizar logs de erro com mascaramento
- impedir log de mensagens integrais e segredos

Arquivos impactados:

- `server.js`
- `.qodo/api/webchat.js`
- `.qodo/web/webhook.js`
- `.qodo/services/*`

## Fase 2 - Governanca de Dados Pessoais

Prazo sugerido: curto a medio

### 2.1 Inventario de dados

Criar inventario tecnico por tabela/campo com:

- categoria do dado
- se contem dado pessoal
- se contem dado sensivel
- se pode conter dado de crianca/adolescente
- finalidade
- base legal
- prazo de retencao
- operador/fornecedor envolvido

### 2.2 Cadastro de base legal e finalidade

Criar estrutura para registrar finalidade e base legal por modulo/processo.

Sugestao de tabela:

- `data_processing_registry`

Campos sugeridos:

- `id`
- `process_key`
- `module_key`
- `purpose`
- `legal_basis`
- `data_categories`
- `subject_categories`
- `retention_policy`
- `shared_with`
- `international_transfer`
- `active`
- `updated_at`

### 2.3 Aviso e transparencia

Adicionar:

- politica de privacidade do produto
- aviso no webchat
- informacao de uso de IA
- informacao de eventual transferencia internacional

Arquivos impactados:

- `public/dist/*.html`
- `views/*`
- documentacao em `docs/`

## Fase 3 - Retencao, Descarte e Direitos do Titular

Prazo sugerido: medio

### 3.1 Politica tecnica de retencao

Definir por tabela:

- prazo de retencao
- criterio de arquivamento
- criterio de anonimizaÃ§Ã£o
- criterio de exclusao

Tabelas prioritarias:

- `institutional_consultations`
- `consultation_messages`
- `assistant_responses`
- `formal_audit_events`
- `incident_reports`
- `interaction_feedback`

### 3.2 Rotinas de expurgo

Criar jobs para:

- anonimizar mensagens antigas
- expurgar sessoes expiradas
- remover tokens e caches
- arquivar trilhas historicas conforme politica

### 3.3 Direitos do titular

Criar fluxo para:

- acesso
- correcao
- anonimizaÃ§Ã£o
- bloqueio
- eliminacao quando aplicavel
- portabilidade quando aplicavel

Sugestao de tabela:

- `data_subject_requests`

Campos sugeridos:

- `id`
- `school_id`
- `request_type`
- `requester_name`
- `requester_contact`
- `subject_reference`
- `status`
- `received_at`
- `due_at`
- `resolved_at`
- `resolution_notes`
- `handled_by`

## Fase 4 - IA e Protecao de Dados

Prazo sugerido: medio

### 4.1 Minimizacao no prompt

Antes de enviar dados ao provedor:

- remover identificadores desnecessarios
- mascarar telefone, email, CPF e nomes quando nao forem essenciais
- evitar enviar historico maior que o necessario

Arquivos prioritarios:

- `.qodo/core/receptionist.js`
- `.qodo/services/ai/providers/openai.js`
- `.qodo/services/ai/providers/groq.js`
- `.qodo/services/ai/providers/gemini.js`
- `.qodo/services/chat/inbound.js`

### 4.2 Registro de transferencia e fornecedor

Registrar:

- provedor utilizado
- finalidade do envio
- categoria de dado enviada
- data/hora
- escola

Sugestao:

- nova tabela `ai_processing_events`

### 4.3 Fluxos de alto risco

Criar regra de revisao humana para:

- respostas com dados de alunos
- orientacoes com potencial juridico/disciplinar
- incidentes envolvendo menores
- divergencia entre fonte e resposta

## Fase 5 - Criancas e Adolescentes

Prazo sugerido: medio

### 5.1 Classificacao reforcada

Marcar fluxos que podem conter:

- dados de alunos
- dados de responsaveis
- dados pedagogicos
- dados de saude ou necessidade especial

### 5.2 Melhor interesse

Documentar e implementar regra de produto:

- coletar apenas o minimo necessario
- limitar acesso por papel
- restringir exportacao
- exigir escalonamento humano quando houver maior sensibilidade

## Backlog Tecnico Priorizado

### Prioridade P0

- remover credenciais do repo e rotacionar segredos
- criar middleware de autenticacao no backend
- parar de usar `school_id` da requisicao como fonte de verdade
- mapear todas as rotas com service role

### Prioridade P1

- aplicar RLS nas tabelas principais
- criar matriz de acesso por acao
- revisar logs sensiveis
- criar politica de retencao inicial

### Prioridade P2

- criar tabelas de registro de tratamento e atendimento ao titular
- adicionar aviso de privacidade no front
- implementar rotinas de anonimizaÃ§Ã£o/expurgo
- adicionar minimizacao para provedores de IA

### Prioridade P3

- criar painel operacional LGPD
- criar relatorios de tratamento por escola
- criar monitoramento de prazos de incidente e de requisicoes de titular

## Definicao da Primeira Onda de Implementacao

Sugestao de primeira onda, em ordem:

1. Remocao de segredos do repositorio e rotacao
2. Middleware de autenticacao/autorizacao no backend
3. Substituicao de `getSchoolId(req)` por escola derivada da sessao
4. Snippet inicial de RLS para tabelas centrais
5. Documento de politica de retencao tecnica
6. Mascaramento basico antes do envio para IA

## Evidencias do Estado Atual

### Controles existentes

- papeis e membros: `schema.sql`
- auditoria formal: `formal_audit_events`
- incidentes: `incident_reports`
- versionamento de conhecimento: `source_documents` e `knowledge_source_versions`

### Gaps observados

- uso de `SUPABASE_SERVICE_KEY` no servidor
- `school_id` vindo do cliente
- ausencia de RLS nas tabelas centrais
- credenciais do Google no repositorio
- ausencia de estruturas LGPD dedicadas

## Proximo Passo

Executar a primeira onda em um branch tecnico LGPD com este escopo inicial:

- `P0.1` remover segredos versionados
- `P0.2` criar middleware de identidade/escola
- `P0.3` proteger rotas administrativas prioritarias


## Ordem Segura de Execucao no Supabase

1. Fazer backup logico do schema e validar em homologacao primeiro.
2. Executar `restructure_access_roles.sql` caso ainda exista ambiente com papeis legados.
3. Executar os snippets legados ja alinhados aos papeis novos:
   - `notice_board_schema.sql`
   - `notification_user_settings_migration.sql`
4. Executar `lgpd_rls_core_phase1.sql`.
5. Validar acesso com pelo menos estes perfis:
   - `superadmin`
   - `network_manager`
   - `content_curator`
   - `secretariat`
   - `direction`
   - `auditor`
   - `observer`
6. Validar operacoes criticas:
   - leitura e escrita de conteudo oficial
   - leitura e publicacao de fontes de conhecimento
   - dashboard
   - configuracao de IA
   - leitura de auditoria e incidentes
7. So depois aplicar em producao.

### Checklist de validacao pos-execucao

- usuario de uma escola nao enxerga dados de outra escola
- `observer` nao altera dados administrativos
- `secretariat` opera atendimento, mas nao altera configuracao de IA
- `auditor` le auditoria sem alterar conteudo operacional
- `network_manager` e `direction` mantem administracao da escola
- `superadmin` continua com acesso transversal controlado

### Artefatos de validacao

- SQL estrutural: `supabase/snippets/lgpd_rls_validation_queries.sql`
- Checklist funcional: `docs/lgpd-functional-validation-checklist.md`

## Decisoes de Escopo Desta Rodada

### Notificacoes

O modulo de notificacoes fica fora do nucleo LGPD desta rodada.

Motivos:

- depende de definicao funcional mais ampla sobre gatilhos, canais e administracao
- exige matriz propria de governanca, consentimento/base legal e auditoria
- o banco atual nao possui todas as tabelas-base esperadas pelos snippets legados

Diretriz atual:

- nao expandir administracao de notificacoes nesta fase
- manter o endurecimento de LGPD focado em segregacao, RLS, auditoria, conteudo oficial e fluxo com IA
- revisitar notificacoes em uma fase propria de produto + compliance

## Endurecimento Pos-Deploy do Nucleo

### Auditoria e evidencia

Para reduzir risco de adulteracao por usuarios autenticados:

- `formal_audit_events` deve ser leitura apenas para perfis de governanca
- `interaction_source_evidence` deve ser leitura apenas para perfis de governanca
- a escrita nessas tabelas deve ocorrer pelo backend com service role ou rotinas controladas

Objetivo:

- preservar imutabilidade operacional da trilha de auditoria
- separar leitura humana de registro tecnico
- reduzir risco de alteracao indevida de evidencia
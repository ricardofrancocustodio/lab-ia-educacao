# ARQUITETURA TECNICA DO SISTEMA

## Documento Tecnico de Infraestrutura, APIs, Banco, Seguranca, Logs e Autenticacao

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica  
**Natureza do documento:** Arquitetura tecnica do sistema  
**Versao:** 1.0  
**Data:** 21 de marco de 2026  
**Escopo:** Infraestrutura, APIs, banco de dados, seguranca, autenticacao e logs da plataforma LAB-IA Educacao

---

## Capa

| Elemento | Conteudo sugerido |
|---|---|
| Titulo | Arquitetura Tecnica do Sistema |
| Subtitulo | Documento de infraestrutura, servicos, APIs, persistencia, seguranca e observabilidade |
| Projeto | Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica |
| Finalidade | Subsidiar apresentacao institucional, governanca tecnica, piloto e documentacao de engenharia |
| Base tecnica | Documento elaborado a partir do codigo-fonte, configuracoes de deploy e schema presentes no repositorio |

---

## 1. Sumario Executivo

Este documento apresenta a arquitetura tecnica do sistema **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**, considerando a implementacao atualmente identificada no repositorio do projeto. A plataforma foi estruturada para operar como ambiente de atendimento institucional com IA auditavel, combinando frontend administrativo, backend de orquestracao, base de dados transacional e camada de governanca de respostas automatizadas.

A arquitetura observada adota um desenho relativamente simples e pragmatico, apropriado para piloto e evolucao incremental. O frontend e servido via Firebase Hosting, enquanto as rotas dinamicas sao reescritas para um servico executado em Cloud Run. O backend principal utiliza Node.js com Express e centraliza rotas de pagina, APIs administrativas, configuracoes de IA, relatorios, auditoria e atendimento webchat. A persistencia de negocio, autenticacao e parte da seguranca de dados sao suportadas por Supabase.

No nivel de aplicacao, o sistema se diferencia por nao tratar a IA como componente isolado. A camada de chat, retrieval, resposta, auditoria e feedback opera de forma integrada ao backend, registrando evidencias, scores de confianca, risco de alucinacao, incidentes e eventos formais. Isso significa que a arquitetura tecnica foi desenhada nao apenas para servir paginas e persistir dados, mas para permitir governanca algoritmica sobre o uso da IA.

Em termos de seguranca, a implementacao atual ja demonstra controles importantes, como validacao de sessao via token Bearer do Supabase, resolucao de contexto autenticado, controle de acesso por papel institucional e segregacao funcional entre perfis operacionais e de governanca. Ao mesmo tempo, a documentacao interna do projeto reconhece gaps relevantes, especialmente no uso historico de `school_id` vindo do cliente, na dependencia de service role em partes do backend e na necessidade de consolidar RLS e minimizacao de dados em fluxos com IA.

Do ponto de vista de observabilidade, o sistema combina trilhas funcionais fortes, como `formal_audit_events`, `interaction_feedback`, `interaction_source_evidence` e `incident_reports`, com observabilidade tecnica ainda mais simples, baseada em logs de aplicacao. Isso oferece boa rastreabilidade de negocio, mas indica oportunidade de evolucao em monitoramento operacional centralizado.

Em sintese, a arquitetura atual e coerente com o objetivo do produto: um sistema de atendimento escolar governado, multiassistente, orientado por base institucional e preparado para amadurecimento progressivo em seguranca, conformidade e escala.

---

## 2. Visao Geral da Arquitetura

### 2.1 Principios arquiteturais observados

A implementacao atual sugere os seguintes principios tecnicos:

- separacao entre frontend estatico e backend de processamento
- centralizacao da logica de negocio no servidor Node/Express
- uso de Supabase como camada de autenticacao e persistencia
- modularizacao da IA em servicos internos dedicados
- registro estruturado de evidencias e eventos de auditoria
- configuracao dinamica de provedores de IA por escola

### 2.2 Diagrama de infraestrutura

```text
+--------------------------------------------------------------+
|                        Usuario / Operador                    |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                     Firebase Hosting                         |
|  - entrega do frontend em /public e /public/dist            |
|  - redirects para paginas administrativas                    |
|  - rewrites de rotas dinamicas para Cloud Run               |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                    Cloud Run - servico lab-ia               |
|                    Backend Node.js + Express                |
|  - paginas internas                                           |
|  - APIs administrativas                                       |
|  - webchat                                                    |
|  - orquestracao da IA                                         |
|  - auditoria e relatorios                                     |
+-------------------+---------------------+--------------------+
                    |                     |
                    v                     v
+--------------------------------+   +--------------------------------+
|           Supabase             |   |      Provedores externos       |
|  - auth / tokens               |   |                                |
|  - banco relacional            |   |                                |
|  - tabelas de negocio          |   |  - Groq                        |
|  - configuracoes por escola    |   |  - APIs auxiliares, quando ha  |
+--------------------------------+   +--------------------------------+
```

### 2.3 Fluxo simplificado de requisicao

```text
Requisicao do navegador
    -> Firebase Hosting
        -> arquivo estatico, quando rota publica/HTML/CSS/JS
        -> rewrite para Cloud Run, quando rota dinamica
            -> Express valida sessao, contexto e papel
            -> consulta Supabase
            -> aciona camada de IA, se aplicavel
            -> persiste trilha de negocio e auditoria
            -> retorna resposta ao frontend
```

---

## 3. Infraestrutura

### 3.1 Frontend e entrega de conteudo

A configuracao em `firebase.json` demonstra que o frontend e servido pelo Firebase Hosting a partir da pasta `public`. A pasta `public/dist` concentra as paginas administrativas e os artefatos estaticos consumidos pelos usuarios.

Tambem foram identificados redirects amigaveis para rotas como:

- `/dashboard`
- `/audit`
- `/atendimento`
- `/conhecimento`
- `/relatorios`
- `/usuarios`
- `/preferencias`

Isso melhora a navegacao e desacopla parcialmente a URL amigavel do arquivo fisico HTML correspondente.

### 3.2 Backend de execucao

As rotas dinamicas sao reescritas para um servico `lab-ia` em `us-central1`, o que indica uso de Cloud Run como runtime do backend.

O `Dockerfile` mostra que a aplicacao roda sobre:

- `node:20-alpine`
- `npm ci --omit=dev`
- `npm start`

Esse desenho favorece container enxuto, inicializacao simples e boa aderencia a deploy gerenciado.

### 3.3 Processo principal

O arquivo principal da aplicacao e `server.js`, que atua como ponto de entrada do backend. Ele concentra:

- exposicao de paginas
- middleware de parsing JSON
- registro de rotas administrativas
- integracao com o webchat
- endpoints de conhecimento, auditoria e relatorios
- resolucao de contexto autenticado e autorizacao

### 3.4 Dependencias principais

O `package.json` indica como dependencias nucleares:

- `express`
- `@supabase/supabase-js`
- `@google/generative-ai`
- `axios`
- `dotenv`

Em conjunto, isso confirma o papel do backend como orquestrador de integra��es, persistencia e IA.

---

## 4. APIs do Sistema

### 4.1 Organizacao geral

As APIs do sistema se distribuem em dois grandes grupos:

1. **rotas centrais do backend em `server.js`**
2. **rotas de atendimento webchat em `.qodo/api/webchat.js`**

### 4.2 Rotas centrais identificadas

| Rota | Metodo | Funcao principal |
|---|---|---|
| `/health` | GET | verifica��o basica de saude da aplicacao |
| `/api/knowledge/sources` | GET | listar fontes de conhecimento |
| `/api/knowledge/sources/:id/versions` | GET | listar versoes de uma fonte |
| `/api/knowledge/sources/import` | POST | importar nova fonte de conhecimento |
| `/api/knowledge/sources/:id/versions` | POST | publicar nova versao de fonte |
| `/api/official-content` | GET | listar conteudo oficial |
| `/api/official-content/:module/:scope` | POST | salvar ou atualizar conteudo oficial |
| `/api/preferences/ai-provider` | GET | consultar configuracao de provedor/modelo de IA |
| `/api/preferences/ai-provider` | POST | atualizar configuracao de IA |
| `/api/intelligence/dashboard` | GET | dados do dashboard de inteligencia |
| `/api/reports/operational-summary` | GET | resumo operacional e indicadores |
| `/api/audit/events` | GET | listar eventos de auditoria |
| `/api/audit/events/:id/review` | POST | registrar revisao de evento/auditoria |

### 4.3 Rotas de webchat identificadas

| Rota | Metodo | Funcao principal |
|---|---|---|
| `/api/webchat/session` | POST | criar sessao de webchat |
| `/api/webchat/message` | POST | processar mensagem de entrada |
| `/api/webchat/conversations` | GET | listar conversas |
| `/api/webchat/conversations/:id` | GET | detalhar conversa e trilha de auditoria |
| `/api/webchat/responses/:id/feedback` | POST | registrar feedback em resposta automatizada |
| `/api/webchat/responses/:id/incident` | POST | abrir incidente relacionado a resposta |
| `/api/webchat/conversations/:id/reply` | POST | resposta humana desabilitada no estado atual |
| `/api/webchat/conversations/:id/resolve` | POST | encerrar conversa |

### 4.4 Caracteristicas das APIs

As APIs atuais possuem as seguintes caracteristicas arquiteturais:

- forte acoplamento ao contexto autenticado e ao `school_id`
- uso predominante de JSON
- validacao de papel antes de operacoes sensiveis
- persistencia de efeitos de negocio e auditoria no mesmo fluxo de aplicacao
- separacao razoavel entre APIs de conteudo, operacao, auditoria e chat

### 4.5 Observacao sobre versionamento

Nao foi identificado versionamento explicito de API no formato `/v1`, `/v2` etc. Para o estagio atual do produto, isso nao inviabiliza o uso, mas e recomendavel considerar versao futura caso o sistema avance para integracoes externas de longo prazo.

---

## 5. Banco de Dados

### 5.1 Papel do banco

O Supabase atua como camada central de persistencia do sistema, reunindo:

- tabelas de identidade e membros
- tabelas de atendimento institucional
- tabelas de resposta automatizada e auditoria
- tabelas de conhecimento institucional
- tabelas de configuracao e preferencias

### 5.2 Grupos principais de tabelas

| Grupo | Tabelas principais | Finalidade |
|---|---|---|
| Identidade e acesso | `schools`, `platform_members`, `school_members`, `role_page_permissions`, `user_page_permissions` | multiunidade, papeis e permissao |
| Conhecimento | `source_documents`, `knowledge_source_versions`, `knowledge_base` | base institucional e versionamento |
| Atendimento | `institutional_consultations`, `consultation_messages` | historico das interacoes |
| Resposta automatizada | `assistant_responses` | resposta emitida, confianca, modo, fallback |
| Governanca e auditoria | `formal_audit_events`, `interaction_feedback`, `interaction_source_evidence`, `incident_reports` | trilha de revisao, evidencia e incidentes |
| Configuracao | `ai_provider_settings`, `official_content_records` | configuracao de IA e conteudo oficial |
| Inteligencia | `intelligence_snapshots` | consolidacao de indicadores |

### 5.3 Caracteristicas da modelagem

A modelagem revela algumas decisoes arquiteturais relevantes:

- todas as entidades centrais carregam `school_id`, reforcando segregacao logica por unidade
- o atendimento e modelado como consulta institucional com mensagens associadas
- a resposta da IA e entidade propria, separada da mensagem de saida
- fontes, versoes e evidencias sao armazenadas de forma estruturada
- auditoria e incidente nao sao logs soltos, mas tabelas de negocio governadas

### 5.4 Persistencia da resposta auditavel

A tabela `assistant_responses` concentra elementos importantes da camada de IA, incluindo:

- `assistant_key`
- `response_text`
- `source_version_id`
- `confidence_score`
- `response_mode`
- `consulted_sources`
- `fallback_to_human`
- `corrected_at`
- `delivered_at`

Essa modelagem favorece reprodutibilidade e rastreabilidade.

### 5.5 Indices e desempenho

O schema atual inclui indices para campos de consulta frequente, como:

- consultas por escola/status
- mensagens por consulta/data
- respostas por escola/assistente
- auditorias por escola/data
- incidentes por escola/status

Isso indica preocupacao basica com desempenho operacional para listagens e paines administrativos.

### 5.6 Banco e futuras preocupacoes arquiteturais

A arquitetura de banco e adequada para piloto e para operacao inicial, mas a expansao exigira atencao para:

- RLS completo nas tabelas centrais
- politica de retencao e expurgo
- controle mais fino por tipo de dado e perfil
- possivel separacao futura entre dados operacionais quentes e historico analitico

---

## 6. Autenticacao e Autorizacao

### 6.1 Mecanismo de autenticacao

O backend utiliza token Bearer e validacao via Supabase Auth. O fluxo identificado em `server.js` inclui:

- leitura do header `Authorization`
- extracao do token Bearer
- chamada a `supabase.auth.getUser(token)`
- resolucao do usuario autenticado

Esse modelo centraliza autenticacao em um provedor robusto e reduz a necessidade de gestao manual de credenciais no backend.

### 6.2 Resolucao de contexto autenticado

A autenticacao nao termina na validacao do token. O backend tambem resolve o **contexto institucional** do usuario, carregando:

- papel de plataforma (`platform_members`)
- papel escolar (`school_members`)
- escola efetiva (`school_id`)
- nome e email do membro
- papel efetivo para autorizacao

Essa etapa e uma das partes mais importantes da arquitetura, pois vincula sessao, papel e unidade institucional antes da execucao das APIs.

### 6.3 Modelo de autorizacao

A autorizacao observada e hibrida:

- ha verificacao de papel no backend por rota
- ha matriz de permissao de paginas no banco e no frontend
- ha diferenciacao entre papeis operacionais e de governanca

Entre os papeis identificados no sistema estao:

- `superadmin`
- `network_manager`
- `content_curator`
- `public_operator`
- `secretariat`
- `coordination`
- `treasury`
- `direction`
- `auditor`
- `observer`

### 6.4 Autorizacao em camadas

A arquitetura utiliza autorizacao em pelo menos tres camadas:

1. **frontend**  
Controle de menus e paginas visiveis.

2. **backend**  
Valida��o efetiva por rota e por papel.

3. **banco**  
Roadmap de RLS e policies por escola e perfil.

Esse desenho e positivo porque evita dependencia exclusiva do frontend para seguranca.

### 6.5 Limites atuais

A documentacao interna reconhece que a arquitetura de autorizacao ainda precisa consolidar:

- eliminacao total da confianca em `school_id` vindo do cliente em fluxos legados
- ampliacao do RLS no banco
- matriz de acesso por tipo de dado, e nao apenas por pagina

---

## 7. Seguranca do Sistema

### 7.1 Controles ja presentes

Os controles tecnicos ja identificados incluem:

- autenticacao por token Bearer via Supabase
- resolucao de contexto autenticado no backend
- papeis distintos por funcao institucional
- segregacao logica por `school_id`
- controle de leitura detalhada conforme papel
- trilha de auditoria formal para respostas e operacoes sensiveis
- incidentes e feedbacks como mecanismos de controle do comportamento da IA

### 7.2 Seguranca orientada ao produto

A seguranca da plataforma nao se limita a acesso e infraestrutura. O projeto tambem possui controles no nivel do produto, tais como:

- abstencao quando a IA nao encontra base suficiente
- `review_required` para respostas de evidencia parcial
- registro de `hallucination_risk_level`
- isolamento de detalhes de governanca em perfis especificos

### 7.3 Pontos de atencao reconhecidos pelo proprio projeto

A documentacao LGPD e tecnica ja reconhece riscos importantes, entre eles:

- uso de `SUPABASE_SERVICE_KEY` em partes sensiveis
- necessidade de endurecer validacao por escola
- ausencia de RLS completo nas tabelas centrais
- necessidade de mascarar dados antes do envio a provedores de IA
- credenciais sensiveis historicamente expostas no repositorio

### 7.4 Avaliacao sintetica de seguranca

A arquitetura atual demonstra boa preocupacao com seguranca funcional e governanca, mas ainda esta em processo de endurecimento de seguranca estrutural. Isso e compat�vel com piloto controlado, mas exige acompanhamento para escala.

---

## 8. Logs, Auditoria e Observabilidade

### 8.1 Logs de aplicacao

O backend utiliza logs de aplicacao baseados principalmente em `console.error`, `console.warn` e mensagens operacionais ao longo dos servicos. Isso cobre erros de:

- autenticacao
- consulta ao banco
- integracao com IA
- falhas de embedding e busca semantica
- incidentes de persistencia

### 8.2 Auditoria de negocio

O ponto mais forte da observabilidade do projeto nao esta em infraestrutura, mas na **auditabilidade funcional**. O sistema registra em tabelas estruturadas:

- eventos formais (`formal_audit_events`)
- evidencias de suporte (`interaction_source_evidence`)
- feedback sobre respostas (`interaction_feedback`)
- incidentes (`incident_reports`)

Isso permite reconstruir o ciclo de resposta automatizada com muito mais riqueza do que logs tecnicos tradicionais.

### 8.3 Eventos auditaveis identificados

Entre os eventos observados no sistema estao, por exemplo:

- resposta automatica com evidencia
- resposta que requer revisao
- abstencao por mitigacao de alucinacao
- incidente reportado
- feedback de resposta incorreta
- fechamento manual de conversa
- atualizacao de conteudo oficial

### 8.4 Observabilidade para operacao

O sistema tambem expoe dados agregados em endpoints como:

- dashboard de inteligencia
- resumo operacional
- listagem de eventos de auditoria

Esses endpoints funcionam como camada de observabilidade de negocio e nao apenas como relatorio de uso.

### 8.5 Limites atuais de observabilidade

Nao foram identificados, no estado atual do repositorio, mecanismos mais avancados de observabilidade tecnica, como:

- tracing distribuido
- correlacao formal de request IDs
- integracao explicita com stack externa de metrics/logs
- alertas operacionais centralizados

Isso nao invalida a arquitetura, mas indica oportunidade de evolucao futura.

---

## 9. Componentes Internos Relevantes

### 9.1 Camada de IA

A orquestracao da IA esta distribuida em modulos internos sob `.qodo`, com destaque para:

- `services/ai` para selecao do provedor
- `core/receptionist.js` para triagem institucional
- `agents` para assistentes especializados
- `services/chat/inbound.js` para ciclo de entrada, auditoria e persistencia
- `services/supabase.js` para busca de conhecimento e gravacao da trilha

### 9.2 Camada de conteudo e conhecimento

A arquitetura separa:

- documentos-fonte e versoes
- base de conhecimento estruturada
- conteudo oficial por modulo e escopo

Essa decisao de projeto e tecnicamente relevante porque reduz acoplamento entre conhecimento operacional e configuracao administrativa.

### 9.3 Camada de apresentacao

O frontend e baseado em paginas HTML e JavaScript modularizadas em `public/dist`, com rotas e telas para:

- dashboard
- atendimento
- auditoria
- conhecimento
- conteudo oficial
- relatorios
- usuarios
- preferencias

Essa abordagem simplifica deploy e manutencao em um estagio de produto ainda em consolidacao.

---

## 10. Avaliacao Arquitetural

### 10.1 Pontos fortes

A arquitetura atual apresenta pontos fortes relevantes:

- simplicidade operacional com separacao clara entre frontend e backend
- boa aderencia a deploy gerenciado em Cloud Run
- centralizacao de autenticacao e dados em Supabase
- forte modelagem de auditoria e governanca da IA
- configuracao dinamica por escola e por provedor
- organizacao modular para evolucao incremental

### 10.2 Pontos de atencao

Tambem ha pontos que merecem evolucao:

- endurecimento de seguranca multiunidade
- conclusao do RLS nas tabelas centrais
- camada mais robusta de observabilidade tecnica
- politicas de retencao e expurgo
- maior padronizacao e versionamento futuro das APIs
- formalizacao de mecanismos de alta disponibilidade e recuperacao operacional

### 10.3 Adequacao ao estagio do produto

A arquitetura e adequada para:

- piloto institucional
- operacao inicial com governanca forte no nivel de negocio
- evolucao incremental sem grande refatoracao estrutural imediata

Para escala ampliada, contudo, sera desejavel consolidar seguranca, compliance de dados e observabilidade com mais profundidade.

---

## 11. Conclusao

A arquitetura tecnica do sistema **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** demonstra alinhamento entre o desenho de infraestrutura e o objetivo funcional do produto. O uso de Firebase Hosting com rewrite para Cloud Run, combinado a um backend Express e a uma base relacional/autenticadora no Supabase, resulta em uma arquitetura moderna, gerenciavel e coerente com uma estrategia de implantacao progressiva.

O principal diferencial arquitetural do projeto esta em tratar a governanca como parte nativa da aplicacao. O backend nao apenas serve APIs; ele estrutura contexto autenticado, aplica restricoes por papel, busca conhecimento, aciona a IA, calcula sinais de risco e grava trilhas formais de auditoria. Isso posiciona o sistema de modo superior a chatbots convencionais em termos de explicabilidade operacional.

Do ponto de vista tecnico, o sistema ja possui base suficiente para suportar um piloto com boa rastreabilidade e capacidade de evolucao. Ao mesmo tempo, a propria documentacao do projeto identifica com clareza os pontos que precisam amadurecer: RLS, minimizacao de dados, maior observabilidade tecnica e endurecimento estrutural de seguranca multiunidade.

Em sintese, a arquitetura atual e **coerente, modular e pronta para piloto controlado**, com caminho claro de evolucao para maior robustez operacional e institucional.

---

## 12. Quadro Executivo Final

| Eixo | Sintese |
|---|---|
| Infraestrutura | Firebase Hosting + Cloud Run + backend Node/Express + Supabase |
| APIs | Rotas administrativas, auditoria, conteudo, relatorios e webchat |
| Banco de dados | Modelagem relacional por escola, atendimento, conhecimento e auditoria |
| Seguranca | Token Bearer, contexto autenticado, papeis, segregacao logica e trilha formal |
| Logs | Logs de aplicacao simples combinados com forte auditoria de negocio |
| Autenticacao | Supabase Auth com resolucao de contexto e autorizacao por papel |
| Recomendacao geral | Arquitetura adequada para piloto, com evolucao prioritaria em RLS, logs e seguranca estrutural |

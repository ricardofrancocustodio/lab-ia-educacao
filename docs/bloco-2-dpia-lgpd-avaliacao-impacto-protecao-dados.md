# BLOCO 2 - DOCUMENTACAO DE GOVERNANCA

## Avaliacao de Impacto de Protecao de Dados (DPIA / LGPD)

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica  
**Natureza do documento:** Avaliacao de Impacto de Protecao de Dados para fins de LGPD  
**Versao:** 1.0  
**Data:** 21 de marco de 2026  
**Escopo principal:** Atendimento institucional, base de conhecimento, conteudo oficial, auditoria, governanca e configuracao de IA

---

## Capa

| Elemento | Conteudo sugerido |
|---|---|
| Titulo | Avaliacao de Impacto de Protecao de Dados (DPIA / LGPD) |
| Subtitulo | Mapeamento de dados coletados, finalidades, armazenamento, anonimiza��o, retencao e direitos do usuario na plataforma de atendimento escolar com IA |
| Projeto | Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica |
| Contexto | Bloco 2 - Documentacao de Governanca |
| Finalidade do documento | Apoiar governanca interna, piloto institucional, adequacao LGPD e prestacao de contas sobre tratamento de dados |
| Observacao | Documento elaborado com base no codigo, schema e plano tecnico de adequacao LGPD atualmente presentes no repositorio |

---

## 1. Sumario Executivo

A presente Avaliacao de Impacto de Protecao de Dados (DPIA / LGPD) examina o tratamento de dados pessoais realizado no projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**, plataforma voltada ao atendimento institucional de redes publicas de educacao com uso de inteligencia artificial auditavel.

A analise indica que o sistema ja opera sobre uma base de governanca minimamente estruturada, com perfis de acesso, trilha de auditoria, versionamento de conhecimento, registros de incidente e modelo de segregacao por escola. Tambem evidencia, contudo, que a agenda de protecao de dados ainda se encontra em consolidacao, especialmente no que se refere a retencao formal, anonimiza��o, minimizacao em prompts, atendimento a direitos do titular e endurecimento completo da segregacao multiunidade.

Os principais grupos de dados tratados no escopo principal do projeto incluem:

- dados cadastrais de membros da plataforma e da escola
- identificadores e metadados de solicitantes do atendimento
- mensagens trocadas no atendimento institucional
- respostas automatizadas e seus metadados de auditoria
- evidencias, incidentes e feedbacks relacionados a respostas da IA
- registros de conteudo oficial e conhecimento institucional, que podem eventualmente conter dados pessoais conforme a fonte
- configuracoes de provedores de IA e rastros de operacao

Do ponto de vista de finalidade, os dados sao tratados para viabilizar autenticacao, controle de acesso, atendimento institucional, recuperacao de conhecimento, auditoria, melhoria continua, seguranca operacional e governanca do uso da IA.

Do ponto de vista de armazenamento, foram identificadas camadas persistentes em Supabase, armazenamento temporario em memoria RAM para sessoes e processamento externo por provedores de IA configuraveis, com potencial de transferencia internacional, a depender do provedor selecionado e da infraestrutura utilizada.

Tambem ficou evidente, a partir do plano tecnico de LGPD existente no projeto, que ainda nao ha politica tecnica plenamente formalizada de retencao, descarte e anonimiza��o. Por essa razao, esta DPIA apresenta, alem do retrato do estado atual, uma proposta de diretrizes para anonimiza��o, retencao e atendimento aos direitos do titular, de modo a apoiar a consolidacao da governanca do sistema.

Em sintese, a conclusao desta avaliacao e de que a plataforma pode ser utilizada em piloto controlado, desde que acompanhada de medidas adicionais de endurecimento tecnico e procedimental. O sistema ja possui base promissora para protecao de dados, mas ainda nao deve ser tratado como plenamente maduro para escala ampla sem formalizacao da politica de retencao, camada de minimizacao de dados e fluxo operacional de atendimento aos direitos do usuario.

---

## 2. Objetivo, Escopo e Metodo da Avaliacao

### 2.1 Objetivo

Esta DPIA tem por objetivo:

- identificar quais dados pessoais sao tratados no projeto
- descrever a finalidade de cada grupo de tratamento
- avaliar como os dados sao armazenados e compartilhados
- examinar o estado atual de anonimiza��o e minimizacao
- propor politica de retencao e descarte
- organizar diretrizes para atendimento a direitos do usuario sob a LGPD
- subsidiar governanca interna e evolucao tecnica do produto

### 2.2 Escopo principal analisado

Foram considerados, para fins deste documento, os modulos centrais associados ao projeto principal de atendimento institucional com IA, notadamente:

- autenticacao e gestao de membros (`platform_members`, `school_members`)
- atendimento institucional (`institutional_consultations`, `consultation_messages`)
- respostas automatizadas (`assistant_responses`)
- auditoria, evidencias, feedback e incidentes (`formal_audit_events`, `interaction_source_evidence`, `interaction_feedback`, `incident_reports`)
- conhecimento institucional (`source_documents`, `knowledge_source_versions`, `knowledge_base`)
- conteudo oficial (`official_content_records`)
- configuracao de IA (`ai_provider_settings`)
- sessoes temporarias em memoria

### 2.3 Modulos fora do foco principal desta DPIA

O repositorio contem componentes herdados e fluxos auxiliares de CRM, eventos, notificacoes e integracoes adicionais. Como esses componentes nao integram o nucleo principal descrito no Bloco 1 e no RIA do projeto atual, recomenda-se que sejam submetidos a avaliacao complementar propria, caso permane�am no escopo da implantacao.

### 2.4 Base documental e tecnica utilizada

Esta avaliacao foi constru�da a partir de:

- `schema.sql`
- `docs/lgpd-implementation-plan.md`
- `docs/lgpd-functional-validation-checklist.md`
- `supabase/snippets/lgpd_rls_core_phase1.sql`
- `server.js`
- `.qodo/services/supabase.js`
- `.qodo/services/chat/inbound.js`
- `.qodo/core/receptionist.js`
- `.qodo/api/webchat.js`
- `.qodo/store/sessions.js`
- provedores em `.qodo/services/ai/providers/*`

---

## 3. Visao Geral do Tratamento de Dados

A plataforma trata dados para suportar o ciclo completo de atendimento institucional governado. Esse ciclo pode ser resumido da seguinte forma:

```text
Usuario ou membro autenticado
    ->
Recepcao da consulta ou acesso administrativo
    ->
Validacao de contexto, escola e perfil
    ->
Busca de conhecimento e conteudo oficial
    ->
Geracao de resposta automatizada com auditoria
    ->
Persistencia de mensagens, respostas, evidencias e eventos
    ->
Acompanhamento por perfis de operacao e governanca
```

O tratamento de dados ocorre, portanto, em pelo menos quatro planos:

1. **identidade e acesso**  
Para autenticar usuarios e controlar privilegios.

2. **atendimento institucional**  
Para registrar consultas, mensagens e respostas.

3. **governanca e auditoria**  
Para manter trilha de evidencia, risco, feedback e incidente.

4. **curadoria e configuracao**  
Para organizar conhecimento, conteudo oficial e preferencias tecnicas da IA.

---

## 4. Dados Coletados

### 4.1 Inventario sintetico por grupo

| Grupo de dados | Exemplos identificados | Onde aparecem no sistema |
|---|---|---|
| Dados cadastrais de membros | nome, email, telefone, papel, user_id | `platform_members`, `school_members` |
| Dados de contexto institucional | escola, perfil, status de acesso, permissoes | `school_members`, `role_page_permissions`, `user_page_permissions` |
| Dados de solicitantes do atendimento | requester_id, requester_name, perfil do solicitante, metadados de contexto | `institutional_consultations`, `metadata` |
| Conteudo das interacoes | texto da pergunta, texto da resposta, timestamps, atores da conversa | `consultation_messages`, `assistant_responses` |
| Dados de governanca da resposta | score de confianca, score de evidencia, fonte usada, review_required, risco | `assistant_responses`, `formal_audit_events`, `interaction_source_evidence` |
| Dados de feedback e incidente | feedback_type, comentario, descricao de incidente, severidade, status | `interaction_feedback`, `incident_reports` |
| Dados de curadoria e autoria | created_by, updated_by, corrected_by, actor_name | varias tabelas do nucleo |
| Dados de conhecimento e documentos | raw_text, titulo, checksum, versao, referencias | `source_documents`, `knowledge_source_versions`, `knowledge_base` |
| Dados de configuracao tecnica | provedor ativo, modelo utilizado, updated_by | `ai_provider_settings` |
| Dados de sessao temporaria | historico recente, identificador da sessao, ultimo uso | `.qodo/store/sessions.js` |

### 4.2 Dados cadastrais de membros

No escopo de acesso e administracao, foram identificados os seguintes dados pessoais:

- nome
- email
- telefone
- identificador de usuario autenticado (`user_id`)
- papel/fun��o institucional
- status do vinculo
- timestamps de convite, criacao e atualizacao

Esses dados aparecem principalmente em `platform_members` e `school_members` e sao essenciais para controle de acesso, convites, trilha de responsabilidade e operacao segura do sistema.

### 4.3 Dados do atendimento institucional

No nucleo de atendimento, o sistema registra:

- `requester_id`
- `requester_name`
- `primary_topic`
- `channel`
- `metadata`
- `message_text`
- `response_text`
- datas de abertura, entrega e resolucao

Esse conjunto de dados permite associar cada conversa a um contexto especifico e construir historico auditavel da interacao.

### 4.4 Dados potencialmente sensiveis ou de alta cautela

Embora o schema principal nao imponha, por si so, coleta sistematica de categorias sensiveis, o proprio projeto reconhece que o conteudo de mensagens e metadados pode conter, em certos casos:

- dados de criancas e adolescentes
- dados de responsaveis
- dados pedagogicos
- informacoes de saude ou necessidade especial, se inseridas na interacao
- dados disciplinares ou contextuais, se o usuario os mencionar

Por essa razao, mensagens livres e metadados devem ser tratados como campo de risco ampliado, mesmo quando a tabela nao os classifica formalmente como sensiveis.

### 4.5 Dados de conhecimento e documentos

As tabelas `source_documents`, `knowledge_source_versions` e `knowledge_base` armazenam documentos e trechos utilizados como base institucional. Em tese, devem conter informacao institucional. Contudo, se o processo de curadoria nao for rigoroso, ha possibilidade de conter dados pessoais inseridos indevidamente em documentos-fonte ou em textos versionados.

### 4.6 Dados transitados a provedores de IA

O sistema pode encaminhar ao provedor de IA:

- prompt de sistema
- historico recente da conversa
- texto do usuario
- contexto derivado das fontes recuperadas

No estado atual, a documentacao do projeto reconhece que ainda nao existe camada completa e obrigatoria de minimizacao/redacao antes do envio, o que representa ponto critico de protecao de dados.

---

## 5. Finalidade do Tratamento

### 5.1 Finalidade geral

A finalidade geral do tratamento de dados no sistema e viabilizar atendimento institucional escolar com governanca, rastreabilidade e apoio da inteligencia artificial, sem perda de controle administrativo sobre as respostas fornecidas.

### 5.2 Finalidades especificas por grupo de dados

| Grupo de dados | Finalidade principal |
|---|---|
| Dados de membros e acesso | autenticar usuarios, controlar acesso, responsabilizar operacoes |
| Dados de atendimento | registrar demanda, responder consulta, manter historico operacional |
| Dados de resposta e auditoria | justificar respostas, medir confianca, permitir revisao |
| Dados de evidencias e fontes | sustentar resposta automatizada e controlar alucinacao |
| Dados de feedback e incidente | corrigir erros, registrar contestacao, melhorar governanca |
| Dados de conhecimento e documentos | organizar memoria institucional e alimentar a base auditavel |
| Dados de configuracao de IA | definir provedor, modelo e parametros de operacao |
| Dados de sessao temporaria | manter contexto curto da conversa durante o uso |

### 5.3 Finalidade secund�ria e melhoria continua

Parte dos dados tambem e tratada para fins de monitoramento, inteligencia de gestao e melhoria continua, tais como:

- identificar temas mais recorrentes
- medir desempenho do atendimento
- calcular taxas de resolucao, revisao e incidente
- apoiar curadoria de conteudo oficial
- melhorar a qualidade da base institucional e dos fluxos internos

### 5.4 Finalidade excluida ou nao recomendada

Nao se recomenda, no estado atual do projeto, utilizar esses dados para finalidades nao compativeis com o escopo declarado, tais como:

- perfilamento comercial de usuarios
- marketing comportamental
- tomada automatizada de decisoes administrativas finais
- compartilhamentos externos nao necessarios ao atendimento, infraestrutura ou governanca

---

## 6. Armazenamento e Fluxo de Dados

### 6.1 Camadas de armazenamento identificadas

O sistema utiliza diferentes camadas de armazenamento e processamento:

| Camada | Funcao | Natureza do armazenamento |
|---|---|---|
| Supabase | banco principal do sistema | persistente |
| Backend Node/Express | processamento, orquestracao, autorizacao e integracoes | processamento em memoria e logs |
| Sessao em RAM | historico curto de conversa | temporario e volatil |
| Firebase Hosting | distribuicao do frontend | essencialmente estatico |
| Provedores de IA | processamento das solicitacoes enviadas pelo backend | processamento externo |

### 6.2 Armazenamento persistente no banco

O banco Supabase concentra a persistencia dos dados principais do projeto. No escopo desta DPIA, sao especialmente relevantes:

- `school_members`
- `institutional_consultations`
- `consultation_messages`
- `assistant_responses`
- `formal_audit_events`
- `interaction_feedback`
- `interaction_source_evidence`
- `incident_reports`
- `knowledge_source_versions`
- `official_content_records`
- `ai_provider_settings`

### 6.3 Armazenamento temporario de sessoes

O arquivo `.qodo/store/sessions.js` indica que o historico curto de interacao e mantido em memoria RAM por meio de um `Map`, com expira��o por inatividade configurada em 30 minutos (`SESSION_TIMEOUT_MS = 30 * 60 * 1000`).

Esse ponto e positivo do ponto de vista de minimizacao temporal, pois reduz persistencia desnecessaria de contexto conversacional em memoria local do processo. Por outro lado, como o backend ainda pode persistir mensagens no banco, a expiracao da sessao nao equivale a exclusao do historico institucional.

### 6.4 Compartilhamento com provedores de IA

O sistema suporta, na configuracao atual, apenas um provedor (com flexibilidade de implementação de outros provedores de IA opensource (a definir)):

- Groq

Isso significa que parte do conteudo da interacao pode ser processado por fornecedores externos de IA. Nesses casos, a plataforma atua como controladora ou co-controladora do fluxo decisorio sobre o envio, e os provedores atuam como operadores ou suboperadores, conforme arranjo contratual efetivo a ser formalizado.

### 6.5 Transferencia internacional potencial

Considerando a natureza dos provedores e a infraestrutura utilizada, deve-se assumir potencial de transferencia internacional de dados, especialmente quando prompts e historicos sao enviados a APIs hospedadas fora do Brasil. Essa possibilidade deve constar de comunicacoes de transparencia e de eventual registro de tratamento.

### 6.6 Logs e metadados tecnicos

A documentacao LGPD do projeto ja recomenda endurecimento de logs para evitar exposicao de payloads e dados pessoais. Isso indica que o estado atual requer atencao adicional para garantir que logs tecnicos nao se tornem via paralela de tratamento indevido.

---

## 7. Anonimizacao e Minimizacao

### 7.1 Estado atual

Com base nos artefatos analisados, a anonimiza��o ainda nao aparece como camada plenamente implementada no nucleo do projeto. O plano tecnico existente reconhece explicitamente a ausencia de politica consolidada de anonimiza��o e prop�e sua implementacao em fase posterior.

Tambem foi identificada ausencia, no estado atual, de uma camada abrangente de mascaramento/redacao antes do envio de dados aos provedores de IA. Isso significa que, em determinadas situacoes, o conteudo enviado ao provedor pode conter identificadores ou metadados desnecessarios.

### 7.2 Medidas ja favoraveis a minimizacao

Apesar dos gaps, ha alguns elementos tecnicos que ja favorecem minimizacao parcial:

- sessao temporaria em RAM com expira��o por inatividade
- possibilidade de restringir detalhes de governanca conforme perfil
- tentativa de estruturar o atendimento por base institucional, reduzindo necessidade de resposta puramente improvisada
- recomendacao expressa no plano LGPD para mascarar nome, telefone, email e CPF quando nao essenciais

### 7.3 Diretriz recomendada de anonimiza��o

Para este projeto, recomenda-se adotar duas camadas distintas:

1. **minimizacao em uso ativo**  
Antes de enviar dados ao provedor de IA, remover ou mascarar identificadores que nao sejam indispensaveis para a resposta.

2. **anonimiza��o em ciclo de vida**  
Apos determinado periodo, substituir identificadores diretos por referencias irreversiveis ou eliminar campos textuais livres que nao sejam mais necessarios ao atendimento e a governanca.

### 7.4 Regras recomendadas de minimizacao em prompts

Antes do envio a IA, recomenda-se:

- remover nomes completos quando nao forem essenciais
- mascarar telefone, email, CPF e outros identificadores diretos
- reduzir historico ao minimo necessario
- excluir metadados irrelevantes para a resposta
- evitar envio de descricoes longas com contexto pessoal excessivo

### 7.5 Regras recomendadas de anonimiza��o posterior

Para dados historicos, recomenda-se:

- substituir `requester_name` por identificador pseudonimizado quando a fase operacional se encerrar
- anonimizar `message_text` e `response_text` em consultas antigas, preservando apenas metadados agregados quando possivel
- manter em claro apenas o estritamente necessario para auditoria, prazo legal ou defesa de direitos
- remover ou generalizar campos livres em incidentes e feedbacks quando expirado o uso operacional

### 7.6 Avaliacao sintetica

Do ponto de vista da DPIA, anonimiza��o e minimizacao constituem uma das principais lacunas do projeto. A formalizacao dessas medidas deve ser tratada como requisito prioritario antes de expansao mais ampla.

---

## 8. Politica de Retencao

### 8.1 Estado atual

O plano tecnico de adequacao LGPD reconhece de forma expressa a ausencia de politica tecnica consolidada de retencao, descarte e anonimiza��o. Portanto, a politica apresentada nesta secao deve ser lida como **proposta recomendada de formalizacao**, e nao como regime plenamente implementado no codigo atual.

### 8.2 Principios da retencao recomendada

A politica de retencao deve observar:

- necessidade operacional
- prazo compativel com auditoria e melhoria continua
- minimizacao temporal
- segregacao entre dado identificavel e dado agregado
- descarte seguro e anonimiza��o quando cabivel

### 8.3 Tabela proposta de retencao

| Conjunto de dados | Retencao identificavel recomendada | Destino posterior recomendado |
|---|---|---|
| Sessoes em RAM | ate 30 minutos de inatividade | descarte automatico |
| `institutional_consultations` | 12 meses | pseudonimizacao ou arquivamento minimizado |
| `consultation_messages` | 6 a 12 meses, conforme criticidade | anonimiza��o textual ou exclusao controlada |
| `assistant_responses` | 12 meses | manutencao parcial para auditoria, com reducao de identificadores |
| `formal_audit_events` | 24 meses | arquivamento restrito ou agregacao estatistica |
| `interaction_source_evidence` | 12 a 24 meses | arquivamento restrito |
| `interaction_feedback` | 12 meses | agregacao estatistica |
| `incident_reports` | 24 meses ou enquanto houver tratamento pendente | arquivamento restrito e anonimiza��o quando encerrado |
| `school_members` | enquanto durar vinculo e prazo administrativo minimo aplicavel | bloqueio e descarte apos encerramento do vinculo |
| `official_content_records` | enquanto vigente e historico util | manutencao institucional sem dados pessoais desnecessarios |
| `knowledge_source_versions` | conforme necessidade institucional e documental | revisao periodica e expurgo de material inadequado |

### 8.4 Crit�rios de arquivamento

Recomenda-se considerar para arquivamento:

- encerramento da consulta
- ausencia de incidente ou contestacao pendente
- expiracao do prazo operacional de revisao
- inexistencia de necessidade de defesa institucional ou cumprimento legal

### 8.5 Crit�rios de descarte

Recomenda-se descarte quando:

- o dado nao for mais necessario para a finalidade declarada
- nao houver obriga��o legal ou institucional de guarda
- a informacao puder ser substituida por dado agregado ou anonimizado

### 8.6 Implementacao recomendada

O plano tecnico ja indica a necessidade de criar jobs para:

- anonimizar mensagens antigas
- expurgar sessoes expiradas
- remover tokens e caches
- arquivar trilhas historicas conforme politica

Esses jobs devem ser formalizados como parte da governanca operacional do produto.

---

## 9. Direitos do Usuario e Atendimento ao Titular

### 9.1 Enquadramento

A plataforma deve estar preparada para atender direitos do titular previstos na LGPD, no limite da base legal aplicavel e das obrigacoes institucionais do controlador. O proprio plano tecnico do projeto reconhece a ausencia atual de estrutura dedicada para esse atendimento e prop�e a criacao de fluxo especifico.

### 9.2 Direitos que devem ser contemplados

Recomenda-se prever, no minimo, mecanismos para:

- confirmacao da existencia de tratamento
- acesso aos dados pessoais tratados
- correcao de dados incompletos, inexatos ou desatualizados
- anonimiza��o, bloqueio ou eliminacao quando cabivel
- portabilidade, quando tecnicamente aplicavel e juridicamente pertinente
- informacao sobre compartilhamentos e uso de IA
- revisao de encaminhamentos ou respostas quando houver impacto relevante sobre o usuario

### 9.3 Tratamento de pedidos do titular

O plano tecnico ja sugere a criacao de uma estrutura `data_subject_requests`, com campos para:

- tipo do pedido
- nome e contato do solicitante
- referencia ao titular
- status
- datas de recebimento e vencimento
- notas de resolucao
- responsavel pelo atendimento

Essa sugestao e coerente com a necessidade de operacionalizar direitos de maneira rastreavel e auditavel.

### 9.4 Recomendacao de fluxo operacional

Para fins de governanca, recomenda-se o seguinte fluxo:

1. Recebimento do pedido em canal formal.
2. Validacao de identidade e legitimidade do solicitante.
3. Classificacao do tipo de direito requerido.
4. Busca dos dados nas tabelas e modulos relevantes.
5. Avaliacao de eventual impossibilidade juridica ou necessidade de retencao.
6. Resposta fundamentada ao titular.
7. Registro do atendimento para trilha de compliance.

### 9.5 Limites ao atendimento

Nem todo pedido implicara eliminacao integral imediata. Em ambientes escolares e administrativos, pode haver necessidade de reten��o por:

- seguranca da plataforma
- auditoria e responsabilizacao
- cumprimento de obriga��es legais ou administrativas
- defesa em procedimento interno ou externo

Por isso, a resposta ao titular deve sempre ser contextualizada e tecnicamente justificada.

---

## 10. Avaliacao de Riscos de Protecao de Dados

### 10.1 Matriz sintetica

| Risco | Descricao | Nivel atual |
|---|---|---|
| Excesso de coleta em mensagens livres | Usuario pode inserir mais dados do que o necessario | Alto |
| Envio sem minimizacao ao provedor de IA | Prompt pode carregar dados pessoais desnecessarios | Alto |
| Ausencia de politica formal de retencao | Dados podem permanecer alem do necessario | Alto |
| Falha de segregacao entre escolas | Dados podem ser acessados fora do contexto correto | Alto |
| Logs com dados pessoais | Informacoes podem vazar por trilhas tecnicas | Medio a alto |
| Documentos-fonte com dados pessoais indevidos | Base institucional pode carregar dados nao anonimizados | Medio |
| Ausencia de fluxo formal de direitos do titular | Dificulta resposta tempestiva e rastreavel | Medio a alto |
| Excesso de privilegio em leitura de governanca | Perfis podem visualizar mais do que o necessario | Medio |

### 10.2 Risco mais critico

Os riscos mais criticos concentram-se em tres eixos:

- envio de dados pessoais a provedores externos sem minimizacao suficiente
- ausencia de politica formal de retencao e anonimiza��o
- necessidade de consolidar segregacao real entre escolas e perfis

### 10.3 Fatores de mitigacao ja existentes

Mesmo com esses riscos, o projeto ja possui fatores atenuantes importantes:

- estrutura de perfis e papeis
- trilha de auditoria
- segregacao logica por `school_id`
- roadmap formal de RLS
- reconhecimentos explicitos de lacunas e plano de endurecimento

---

## 11. Medidas Implementadas x Medidas em Consolidacao

### 11.1 Medidas ja implementadas ou parcialmente presentes

| Eixo | Situacao observada |
|---|---|
| Controle de acesso por perfil | Presente |
| Segregacao logica por escola | Presente, mas ainda em consolidacao |
| Trilhas de auditoria | Presente |
| Registro de incidentes e feedback | Presente |
| Sessao temporaria com expiracao | Presente |
| Restricao de detalhes de governanca por papel | Presente |
| Versionamento de conhecimento | Presente |

### 11.2 Medidas ainda necessarias ou incompletas

| Eixo | Situacao recomendada |
|---|---|
| Minimizacao antes do envio a IA | Prioridade alta |
| Politica formal de retencao | Prioridade alta |
| Rotinas de anonimiza��o e expurgo | Prioridade alta |
| Estrutura formal para direitos do titular | Prioridade alta |
| RLS abrangente nas tabelas centrais | Prioridade alta |
| Registro de transferencia e operador de IA | Prioridade media/alta |
| Classificacao reforcada para dados de criancas e adolescentes | Prioridade media/alta |

---

## 12. Avaliacao de Adequacao para Piloto

### 12.1 Avaliacao geral

Com base na analise do repositorio e do plano tecnico existente, a adequacao do sistema para um piloto controlado pode ser resumida nos seguintes termos:

| Criterio | Avaliacao |
|---|---|
| Mapeamento basico de dados | Favoravel |
| Clareza de finalidade | Favoravel |
| Armazenamento identificado | Favoravel |
| Anonimiza��o implementada | Insuficiente |
| Politica de retencao formal | Insuficiente |
| Atendimento a direitos do titular | Insuficiente, mas enderecado no plano |
| Estrutura geral de governanca | Favoravel com ressalvas |

### 12.2 Conclusao de adequacao

O sistema e **apto para piloto controlado com supervisao reforcada**, mas nao deve ser considerado plenamente maduro em protecao de dados para expansao ampla sem a implementacao das medidas de consolidacao ja previstas na documentacao LGPD.

---

## 13. Recomendacoes Prioritarias da DPIA

Recomenda-se, em ordem de prioridade:

1. Implementar camada de minimizacao e mascaramento antes do envio aos provedores de IA.
2. Formalizar politica tecnica de retencao, descarte e anonimiza��o por tabela e por finalidade.
3. Criar estrutura operacional de atendimento aos direitos do titular.
4. Concluir endurecimento de segregacao por escola e RLS nas tabelas centrais.
5. Revisar logs para impedir persistencia indevida de dados pessoais e segredos.
6. Criar registro de tratamento e de transferencias a operadores externos.
7. Estabelecer governanca de curadoria para impedir documentos-fonte com dados pessoais desnecessarios.
8. Produzir aviso de privacidade e aviso de uso de IA nos canais de atendimento.
9. Instituir classificacao de risco reforcada para fluxos com dados de menores ou temas sensiveis.
10. Atualizar esta DPIA sempre que houver mudanca material no escopo do sistema.

---

## 14. Conclusao

A Avaliacao de Impacto de Protecao de Dados do projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** demonstra que a plataforma ja possui base importante para uma governanca de dados consistente, especialmente em razao da existencia de auditoria formal, segregacao por perfis, estrutura de conhecimento versionado e reconhecimento explicito dos principais gaps de compliance.

Ao mesmo tempo, a analise tambem demonstra que o projeto ainda depende da formalizacao de elementos essenciais de protecao de dados, sobretudo anonimiza��o, retencao, minimizacao em prompts e atendimento a direitos do titular. Esses temas nao devem ser tratados como ajustes marginais, mas como parte estruturante da maturidade do produto.

Por essa razao, conclui-se que o sistema pode sustentar um piloto institucional em ambiente controlado, desde que acompanhado de plano ativo de consolidacao LGPD e de governanca operacional clara. Para escala ampliada, a recomendacao e concluir previamente as medidas prioritarias listadas nesta DPIA.

---

## 15. Quadro Executivo Final

| Eixo | Sintese |
|---|---|
| Dados coletados | Identidade, acesso, atendimento, auditoria, evidencia, configuracao e conteudo institucional |
| Finalidade | Atendimento institucional, governanca, seguranca e melhoria continua |
| Armazenamento | Supabase persistente, sessao temporaria em RAM e processamento externo por provedores de IA |
| Anonimiza��o | Ainda insuficiente e dependente de implementacao adicional |
| Retencao | Nao formalizada no estado atual; proposta incluida nesta DPIA |
| Direitos do usuario | Devem ser operacionalizados por fluxo proprio e registro de solicitacoes |
| Recomendacao geral | Apto para piloto controlado com consolidacao LGPD obrigatoria antes da escala |

# BLOCO 1 - PROJETO PRINCIPAL

## PDF 1 - Projeto: Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica

**Versao base do entregavel**  
Documento estruturado para diagramacao em PDF institucional de 10 a 15 paginas.

---

## 1. Resumo Executivo

O projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** propoe uma plataforma digital para apoiar redes publicas de educacao no atendimento institucional a familias, estudantes, servidores e gestores. A solucao combina atendimento assistido por inteligencia artificial com mecanismos explicitos de governanca, rastreabilidade, auditoria e controle de acesso, reduzindo o risco de respostas inconsistentes, opacas ou desalinhadas das normas institucionais.

Na pratica, o projeto transforma o atendimento escolar em uma infraestrutura de conhecimento governado. Em vez de operar como um chat generico, a plataforma utiliza bases institucionais versionadas, registros formais de auditoria, trilhas de evidencia e perfis de acesso por funcao. Isso permite que a IA responda consultas com maior aderencia ao contexto da rede, preserve memoria organizacional e produza dados de gestao para melhoria continua.

A arquitetura identificada no repositorio atual ja demonstra um nucleo funcional importante: backend em Node.js/Express, frontend administrativo com modulos especificos, autenticacao e base de dados em Supabase, hospedagem com Firebase Hosting e servico de execucao em Cloud Run, alem de estruturas voltadas a conhecimento institucional, conteudo oficial, auditoria formal, incidentes, feedback e indicadores de desempenho. O sistema ainda inclui configuracao de multiplos provedores de IA, o que amplia flexibilidade tecnologica e reduz dependencia de um unico fornecedor.

O valor publico do projeto esta em atacar um problema recorrente das redes educacionais: grande volume de demandas repetitivas, descentralizacao da informacao, sobrecarga das equipes administrativas e dificuldade de garantir padrao, transparencia e historico nas respostas prestadas a cidadania. Ao organizar o conhecimento oficial e usar IA com governanca, a rede ganha capacidade de resposta, consistencia institucional e inteligencia de gestao.

A proposta de piloto sugere implantacao controlada em uma rede ou conjunto reduzido de escolas, com foco em atendimento publico, secretaria escolar, curadoria de conteudo oficial e acompanhamento de indicadores operacionais e de confianca. O objetivo nao e substituir completamente a equipe humana, mas estruturar um modelo hibrido, em que a IA atua como primeira camada de atendimento e a governanca algoritmica assegura supervisao, evidencias, mitigacao de alucinacoes e melhoria progressiva.

---

## 2. Problema Publico

As redes publicas de educacao enfrentam um conjunto de gargalos no atendimento institucional que afetam diretamente a experiencia da cidadania e a eficiencia administrativa. Em geral, familias e estudantes precisam de respostas sobre matricula, documentos, calendario, horarios, vagas, procedimentos internos, pagamentos, comunicados e funcionamento de servicos escolares. Muitas dessas respostas ja existem em normativas, regulamentos, documentos internos e orientacoes consolidadas, mas permanecem dispersas entre setores, pessoas e canais.

Esse cenario produz pelo menos seis problemas estruturais:

1. **Fragmentacao da informacao institucional**  
As orientacoes oficiais ficam espalhadas em arquivos, grupos de mensagem, memorias individuais de servidores, paginas desatualizadas e documentos sem versao clara.

2. **Sobrecarga operacional das equipes**  
Secretarias, coordenacoes e direcoes consomem tempo relevante respondendo demandas repetitivas, o que reduz a capacidade de concentracao em casos mais sensiveis ou estrategicos.

3. **Baixa padronizacao no atendimento**  
Duas pessoas podem receber respostas diferentes para a mesma pergunta, dependendo do canal utilizado, do servidor responsavel ou da data da consulta.

4. **Pouca rastreabilidade**  
Na maioria dos fluxos atuais, a rede nao consegue responder com precisao quais perguntas foram feitas, que respostas foram emitidas, com base em qual fonte e qual foi o nivel de confianca associado.

5. **Dificuldade de transformar atendimento em inteligencia de gestao**  
Atendimentos geram sinais importantes sobre duvidas recorrentes, gargalos de servico, problemas de comunicacao e necessidades de revisao normativa, mas esses sinais raramente sao tratados como insumo de gestao.

6. **Risco no uso indiscriminado de IA generativa**  
Sem governanca, modelos de IA podem responder sem base institucional suficiente, gerar informacoes equivocadas, omitir limites de competencia ou tratar dados pessoais de forma inadequada.

Em redes publicas, esse problema e ainda mais sensivel porque envolve confianca institucional, atendimento a familias, potenciais dados de criancas e adolescentes e necessidade de conformidade com regras de transparencia, seguranca da informacao e LGPD. Portanto, a questao nao e apenas adotar IA, mas adotar IA com controles compativeis com o setor publico.

---

## 3. Solucao Proposta

A solucao proposta consiste em uma plataforma de atendimento escolar com IA auditavel, organizada em torno de quatro pilares:

1. **Atendimento institucional assistido por IA**
2. **Base de conhecimento e conteudo oficial versionados**
3. **Governanca algoritmica com auditoria e evidencia**
4. **Camada gerencial de indicadores e melhoria continua**

Com base na implementacao atual do projeto, a plataforma foi estruturada para operar com assistentes especializados por area institucional:

- Assistente Publico
- Assistente da Secretaria
- Assistente da Tesouraria
- Assistente da Direcao

Essa separacao e importante porque evita uma IA unica e indistinta para todo tipo de demanda. Em vez disso, o sistema direciona a interacao para dominios administrativos mais adequados, aproximando a resposta do contexto real da rede.

Outro elemento central da solucao e a distincao entre **base de conhecimento** e **conteudo oficial**. A base de conhecimento organiza perguntas, respostas, categorias e versoes de fontes. O conteudo oficial estrutura informacoes normativas e operacionais em modulos, como calendario, matricula, FAQ e avisos, com escopo de rede ou escola. Na pratica, isso cria um mecanismo formal para que a rede publique o que e referencia oficial e mantenha historico do que foi atualizado.

O projeto tambem nao trata a resposta da IA como uma caixa-preta. Cada interacao pode registrar:

- conversa institucional
- mensagem de entrada e saida
- resposta emitida pelo assistente
- fonte principal utilizada
- conjunto de evidencias consultadas
- score de confianca
- nivel de risco de alucinacao
- necessidade de revisao humana
- evento formal de auditoria
- feedback do operador
- eventual incidente ou correcao posterior

Esse desenho caracteriza a governanca algoritmica como parte nativa do produto, e nao como etapa posterior. Ou seja, a plataforma foi concebida para que o uso da IA gere ao mesmo tempo atendimento e capacidade de supervisao.

---

## 4. Arquitetura do Sistema

### 4.1 Visao Geral

O repositorio atual evidencia uma arquitetura modular composta por:

- **Frontend administrativo e paginas do atendimento** em `public/dist`
- **Backend de orquestracao e APIs** em `server.js`
- **Camada de autenticacao, banco e armazenamento logico** via Supabase
- **Hospedagem do frontend** via Firebase Hosting
- **Execucao do backend** via servico configurado no Firebase para Cloud Run (`serviceId: lab-ia`)
- **Servicos internos de IA, chat e auditoria** sob o diretorio `.qodo`

Essa arquitetura permite separar experiencia do usuario, logica de negocio, persistencia e camada de inteligencia.

### 4.2 Camada de Apresentacao

O frontend e composto por paginas HTML administrativas e modulos JavaScript especificos. Entre as telas ja identificadas no projeto estao:

- dashboard
- atendimento
- auditoria
- base de conhecimento
- conteudo oficial
- relatorios
- usuarios
- preferencias de IA

Esse desenho e adequado para o piloto porque permite entregar fluxos administrativos claros para diferentes perfis da rede sem depender de uma reescrita completa de interface.

### 4.3 Camada de Aplicacao

O backend em Node.js/Express centraliza:

- autenticacao e resolucao de contexto institucional
- validacao de papel de acesso
- APIs para base de conhecimento
- APIs para conteudo oficial
- APIs de configuracao de provedores de IA
- APIs de dashboard e relatorios
- integracao com o webchat
- registro de eventos formais de auditoria

Ha tambem uma evolucao relevante no codigo: o backend ja contem uma camada de validacao do contexto autenticado para derivar escola e papel do usuario a partir da sessao, o que e essencial para o modelo multiunidade e para o endurecimento LGPD.

### 4.4 Camada de Dados

O schema principal e os snippets SQL mostram uma modelagem alinhada ao objetivo do produto. Entre as tabelas estruturantes, destacam-se:

- `schools`
- `platform_members`
- `school_members`
- `role_page_permissions`
- `user_page_permissions`
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
- `ai_provider_settings`
- `intelligence_snapshots`

Em termos de arquitetura informacional, isso mostra que o projeto nao se limita a armazenar chats. Ele foi modelado para registrar o ciclo completo entre conhecimento institucional, resposta da IA, governanca e inteligencia gerencial.

### 4.5 Camada de Governanca e Seguranca

Um diferencial importante da arquitetura e a presenca de mecanismos de governanca distribuidos na aplicacao:

- controle por perfis institucionais
- separacao entre perfil operacional e perfil de governanca
- trilha formal de auditoria
- registros de evidencia por resposta
- abertura de incidentes
- feedback estruturado sobre respostas
- roadmap de RLS e segregacao entre escolas
- plano tecnico de adequacao LGPD

O projeto ainda esta em amadurecimento nessa frente, especialmente no endurecimento de isolamento por escola e minimizacao de dados, mas a base arquitetural ja existe e favorece uma implantacao segura por fases.

### 4.6 Diagrama Sugerido para o PDF

Para a versao diagramada do entregavel, recomenda-se incluir um diagrama simples com o seguinte fluxo:

`Usuario/Familia -> Webchat/Portal -> Backend Express -> Orquestrador de IA -> Base institucional + Conteudo oficial + Configuracao do provedor -> Resposta auditavel -> Dashboard/Auditoria/Relatorios`

---

## 5. Uso de IA

### 5.1 Papel da IA na Solucao

A IA nao aparece no projeto como um recurso ornamental. Ela e o motor de triagem e resposta do atendimento, mas opera apoiada por conhecimento institucional e controles de seguranca. O papel esperado da IA inclui:

- responder perguntas recorrentes da comunidade escolar
- apoiar setores administrativos com atendimento padronizado
- recuperar conhecimento institucional estruturado
- reduzir tempo medio de resposta
- sinalizar quando nao ha base suficiente para responder
- encaminhar casos para revisao quando o nivel de evidencia for insuficiente

### 5.2 Provedores e Flexibilidade Tecnologica

O codigo mostra suporte configuravel, mas está pré-definido e ativo apenas:

- Groq

Essa opcao e relevante para o setor publico por tres motivos:

- reduz dependencia tecnologica
- permite calibracao de custo e desempenho
- facilita adaptacao a requisitos futuros de contratacao ou politica institucional

### 5.3 IA com Evidencia e Mitigacao de Alucinacao

O nucleo mais importante da governanca algoritmica esta no tratamento da evidencia. Ha regras no codigo que calculam score de evidencia, score de confianca, nivel de risco e necessidade de revisao. Quando a base institucional nao e suficiente, o sistema pode:

- abster-se de responder plenamente
- classificar o caso como de alto risco
- marcar revisao requerida
- sinalizar fallback humano
- registrar evento formal relacionado a mitigacao de alucinacao

Isso e particularmente importante em contexto escolar, onde respostas imprecisas sobre matricula, frequencia, documentos, pagamentos ou procedimentos internos podem gerar retrabalho, desinformacao ou conflito com familias.

### 5.4 IA Auditavel

O projeto registra atributos que tornam a resposta explicavel dentro do contexto operacional da rede:

- qual assistente respondeu
- qual foi a mensagem de origem
- qual versao de fonte foi usada
- quais evidencias sustentaram a resposta
- qual foi o score de confianca
- se houve recomendacao de revisao humana
- se houve incidente, correcao ou feedback posterior

Em termos de maturidade institucional, isso significa sair do paradigma de "IA responde" para o paradigma de "IA responde com rastreabilidade".

### 5.5 Limites e Cuidados

Para o documento institucional, e importante explicitar que a IA nao substitui decisao administrativa formal, ato normativo ou analise humana em situacoes sensiveis. O proprio repositorio ja aponta essa direcao ao prever:

- revisao humana em fluxos de maior risco
- abertura de incidentes
- trilha de auditoria
- plano LGPD com minimizacao de dados e segregacao por escola

Assim, o uso de IA no projeto deve ser apresentado como **apoio governado ao atendimento**, e nao como automacao irrestrita.

---

## 6. Beneficios para a Rede Publica

Os beneficios esperados para a rede publica podem ser organizados em quatro dimensoes.

### 6.1 Beneficios Operacionais

- reducao do volume de respostas manuais para demandas repetitivas
- aumento da disponibilidade do atendimento institucional
- maior padronizacao nas orientacoes prestadas
- melhor distribuicao do trabalho entre secretaria, gestao e curadoria

### 6.2 Beneficios para a Cidadania

- resposta mais rapida para familias e estudantes
- maior clareza sobre informacoes oficiais
- melhoria da experiencia de atendimento
- diminuicao da dependencia de canais informais para obter orientacoes

### 6.3 Beneficios Gerenciais

- visao consolidada das duvidas mais frequentes
- identificacao de gargalos operacionais e normativos
- capacidade de revisar conteudos oficiais com base no uso real
- apoio a decisao por meio de dashboards e relatorios

### 6.4 Beneficios Institucionais e de Governanca

- memoria institucional organizada
- trilha de auditoria sobre respostas automatizadas
- registro de evidencia para justificativa de respostas
- condicoes mais robustas para conformidade, transparencia e controle interno

Em uma rede publica, esse conjunto de beneficios e especialmente valioso porque une ganho de eficiencia com fortalecimento de confianca institucional. O projeto nao busca apenas "atender mais", mas "atender melhor, com mais controle e melhor capacidade de prestacao de contas".

---

## 7. Escalabilidade

O projeto foi concebido com caracteristicas que favorecem escalabilidade funcional, institucional e tecnologica.

### 7.1 Escalabilidade por Unidade Escolar

A modelagem com `schools`, `school_members`, configuracoes por escola e trilhas por `school_id` indica que a plataforma foi desenhada para operar em mais de uma unidade ou rede, com segregacao logica dos dados. Isso e essencial para expandir de um piloto para multiplas escolas.

### 7.2 Escalabilidade por Dominio de Atendimento

O uso de assistentes especializados permite ampliar gradualmente a cobertura funcional. A rede pode iniciar pelo atendimento publico e secretaria escolar e, depois, expandir para tesouraria, direcao, coordenacao pedagogica, transporte, alimentacao escolar ou outros dominios.

### 7.3 Escalabilidade por Conhecimento

Como a plataforma trabalha com documentos-fonte, versoes e sincronizacao para base de conhecimento, a expansao nao depende apenas de treinar modelos. Ela depende de ampliar e curar o acervo institucional. Isso torna a escalabilidade mais governavel, pois a qualidade da resposta cresce junto com a qualidade da base documental.

### 7.4 Escalabilidade Tecnologica

O suporte a multiplos provedores de IA e a separacao entre frontend, backend e banco trazem flexibilidade de evolucao. O projeto pode:

- trocar ou comparar provedores
- ajustar modelos por custo ou desempenho
- distribuir carga por servico
- ampliar relatorios e modulos sem reconstruir toda a base

### 7.5 Condicoes para Escalar com Seguranca

Para uma escalabilidade sustentavel, alguns itens devem acompanhar a expansao:

- RLS completo nas tabelas centrais
- consolidacao do contexto autenticado por escola
- minimizacao de dados pessoais em prompts
- politica de retencao e expurgo
- rotina de curadoria institucional
- governanca de incidentes e revisoes

Ou seja, a escalabilidade do projeto deve ser tratada como crescimento com controle, e nao apenas como aumento de volume.

---

## 8. Plano de Implementacao Piloto

### 8.1 Objetivo do Piloto

Validar a efetividade da plataforma em ambiente controlado de rede publica, medindo:

- capacidade de atendimento
- qualidade percebida das respostas
- aderencia a fontes institucionais
- impacto na carga operacional das equipes
- funcionamento dos mecanismos de governanca

### 8.2 Escopo Sugerido

Sugere-se um piloto com:

- 1 rede ou secretaria municipal/estadual parceira
- 1 a 3 escolas participantes
- 2 frentes iniciais de atendimento: publico geral e secretaria escolar
- 1 equipe de curadoria institucional
- 1 equipe de gestao ou auditoria acompanhando governanca e conformidade

### 8.3 Fases do Piloto

**Fase 1 - Preparacao institucional (2 a 3 semanas)**  
Mapeamento de processos prioritarios, definicao de perfis de acesso, selecao de documentos-base, classificacao inicial de conteudo oficial e validacao do protocolo do piloto.

**Fase 2 - Implantacao tecnica controlada (2 semanas)**  
Configuracao do ambiente, publicacao das primeiras fontes, parametrizacao do provedor de IA, ajustes de interface e validacao dos acessos por perfil.

**Fase 3 - Operacao assistida (4 a 6 semanas)**  
Entrada em uso real com acompanhamento proximo da equipe do projeto, revisao de respostas, coleta de feedback, abertura de incidentes quando necessario e calibracao da base.

**Fase 4 - Avaliacao e consolidacao (2 semanas)**  
Analise dos indicadores, comparacao com linha de base operacional, registro de aprendizados, definicao de melhorias e decisao sobre ampliacao.

### 8.4 Entregas Minimas do Piloto

- base inicial de conhecimento institucional publicada
- modulos de conteudo oficial ativados
- atendimento webchat operante
- painel de auditoria funcional
- relatorio consolidado de indicadores do piloto
- plano de melhorias para proxima rodada

### 8.5 Governanca do Piloto

Recomenda-se um comite enxuto de acompanhamento com representacao de:

- gestao da rede
- secretaria escolar
- curadoria de conteudo
- TI ou transformacao digital
- controle interno, juridico ou encarregado de dados, quando aplicavel

Esse arranjo e importante para que o piloto seja avaliado nao apenas por desempenho tecnico, mas tambem por aderencia institucional.

---

## 9. Metricas de Impacto

As metricas de impacto devem combinar eficiencia operacional, qualidade da resposta, seguranca do uso da IA e valor institucional. O proprio projeto ja apresenta base de dados e endpoints que favorecem essa mensuracao.

### 9.1 Metricas Operacionais

- total de consultas recebidas
- percentual de consultas resolvidas
- tempo medio ate a primeira resposta
- tempo medio de resolucao
- distribuicao por canal e por assistente
- temas mais frequentes por periodo

### 9.2 Metricas de Qualidade e Confianca

- percentual de respostas com fonte principal identificada
- score medio de confianca
- score medio de evidencia
- percentual de respostas com revisao requerida
- percentual de respostas com fallback humano recomendado
- percentual de feedback util, nao util e incorreto

### 9.3 Metricas de Governanca

- numero de eventos formais de auditoria registrados
- numero de incidentes abertos por periodo
- tempo medio de resolucao de incidentes
- percentual de respostas corrigidas apos revisao
- taxa de consultas com rastreabilidade completa

### 9.4 Metricas de Valor Publico

- reducao de demandas repetitivas para a secretaria
- percepcao de satisfacao de usuarios e operadores
- ampliacao do acesso a informacoes oficiais
- identificacao de temas que exigem revisao normativa ou comunicacional

### 9.5 Linha de Base e Avaliacao

Para que o piloto tenha validade, recomenda-se registrar uma linha de base anterior ao uso da plataforma, incluindo:

- volume medio de atendimentos
- tempo medio de resposta manual
- canais mais utilizados
- principais duvidas recorrentes
- capacidade atual de rastreabilidade

Sem essa comparacao, o piloto corre o risco de mostrar apenas atividade, e nao impacto.

---

## 10. Conclusao

O projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** apresenta uma proposta aderente a uma necessidade concreta do setor publico educacional: modernizar o atendimento sem abrir mao de controle, memoria institucional e responsabilidade administrativa.

O diferencial estrategico do projeto nao esta apenas no uso de IA, mas na forma como esse uso foi estruturado. Ao combinar conhecimento versionado, assistentes por area, trilha de auditoria, evidencia por resposta, perfis de acesso, relatorios e plano de adequacao LGPD, a solucao se posiciona como uma infraestrutura de atendimento governado, e nao como um chatbot generico.

O repositorio atual mostra que essa proposta ja possui base tecnica significativa para um piloto realista. Ha arquitetura definida, entidades de dados coerentes com o objetivo institucional, modulos de conhecimento e conteudo oficial, mecanismos de auditoria e indicadores iniciais de inteligencia operacional. Ao mesmo tempo, tambem esta claro que a consolidacao do piloto deve caminhar junto com o endurecimento de seguranca, segregacao por escola e protecao de dados.

Para redes publicas de educacao, o projeto oferece uma oportunidade concreta de transformar atendimento em capacidade institucional: responder melhor, aprender com o uso, reduzir sobrecarga e criar transparencia sobre o comportamento da IA. Se bem conduzido, o piloto pode se tornar referencia de como aplicar inteligencia artificial em servicos educacionais com foco em confianca, responsabilidade e impacto publico.

---

## 11. Observacoes para Diagramacao do PDF

Para chegar ao formato final de 10 a 15 paginas, recomenda-se incluir:

- capa com titulo do projeto e identidade visual
- resumo executivo diagramado em uma pagina
- 1 figura de arquitetura
- 1 quadro com perfis de acesso
- 1 quadro com os quatro assistentes institucionais
- 1 cronograma visual do piloto
- 1 quadro de metricas de impacto

---

## 12. Quadro-Sintese para Uso no PDF

**Problema central**  
Atendimento escolar fragmentado, pouco padronizado, pouco rastreavel e com sobrecarga das equipes.

**Solucao**  
Plataforma de atendimento escolar com IA auditavel, base institucional versionada, conteudo oficial governado e camada de auditoria e inteligencia gerencial.

**Diferencial**  
Uso de IA com governanca algoritmica, evidencia, mitigacao de alucinacao, feedback, incidentes e perfis de acesso.

**Publico-alvo**  
Redes publicas de educacao, secretarias, escolas, gestores e equipes administrativas.

**Resultado esperado**  
Mais eficiencia, mais padronizacao, mais transparencia e melhor capacidade de gestao do atendimento institucional.

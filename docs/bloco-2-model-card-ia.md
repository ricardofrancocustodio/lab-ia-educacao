# BLOCO 2 - DOCUMENTACAO DE GOVERNANCA

## Model Card da IA

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica  
**Natureza do documento:** Model Card tecnico do sistema de IA utilizado no atendimento institucional  
**Versao:** 1.0  
**Data:** 21 de marco de 2026  
**Escopo:** Modelos generativos, embeddings, grounding institucional, limitacoes, vieses conhecidos e nivel de confianca

---

## Capa

| Elemento | Conteudo sugerido |
|---|---|
| Titulo | Model Card da IA |
| Subtitulo | Documento tecnico sobre modelos utilizados, treinamento, limitacoes, vieses conhecidos e confianca da IA no atendimento escolar institucional |
| Projeto | Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica |
| Contexto | Bloco 2 - Documentacao de Governanca |
| Finalidade do documento | Apoiar transparencia tecnica, governanca interna, piloto institucional e prestacao de contas sobre a camada de IA |
| Observacao | Documento baseado no estado atual do codigo-fonte e das configuracoes identificadas no repositorio |

---

## 1. Sumario Executivo

Este Model Card descreve a camada de inteligencia artificial utilizada no projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**, plataforma voltada ao atendimento institucional de redes publicas de educacao com base em conhecimento versionado, trilha de auditoria e governanca algoritmica.

A analise tecnica do repositorio demonstra que o sistema nao depende de um unico modelo fixo. A arquitetura foi desenhada para operar com **provedor configuravel por escola**, com suporte identificado para:

- OpenAI
- Groq
- Gemini

Na configuracao padrao atualmente observada, o sistema tende a utilizar:

- `gpt-4o-mini` para chat na OpenAI
- `llama-3.3-70b-versatile` na Groq
- `text-embedding-3-small` para embeddings e busca semantica

O sistema nao realiza, no estado atual do codigo, treinamento proprietario ou fine-tuning do modelo base. Em vez disso, ele combina modelos generalistas de terceiros com uma camada propria de **grounding institucional**, baseada em recuperacao de conhecimento (`knowledge_base`), documentos versionados, thresholds de evidencia e regras de abstencao ou resposta conservadora.

Esse aspecto e central para entender a IA do projeto: a qualidade da resposta nao depende apenas do modelo generativo, mas da combinacao entre:

- modelo de base fornecido por terceiro
- base institucional local e versionada
- regras de prompt do sistema
- score de evidencia calculado pela aplicacao
- logs, auditoria e trilha de revisao

O Model Card tambem evidencia limitacoes relevantes. A confianca registrada pelo sistema nao corresponde a probabilidade calibrada do modelo, mas a um escore operacional derivado da qualidade das evidencias recuperadas. Alem disso, a cobertura da base documental, a heuristica de roteamento, a qualidade da curadoria e a maturidade do provedor ativo influenciam fortemente o resultado final.

Em sintese, a IA do projeto pode ser caracterizada como **modelo generativo generalista com grounding local e governanca deterministica adicional**, apta a operar em piloto controlado, desde que seus limites sejam conhecidos e respeitados.

---

## 2. Objetivo e Escopo do Model Card

### 2.1 Objetivo

O objetivo deste Model Card e documentar, de forma tecnica e transparente:

- quais modelos sao utilizados ou suportados
- como esses modelos entram no fluxo de atendimento
- de que maneira o projeto "treina" ou adapta o comportamento da IA sem fine-tuning proprietario
- quais limitacoes e vieses sao conhecidos
- como o sistema calcula e interpreta o nivel de confianca
- quais recomendacoes devem orientar o uso responsavel da camada de IA

### 2.2 Escopo analisado

Foram considerados principalmente os seguintes artefatos do repositorio:

- `.qodo/services/ai/index.js`
- `.qodo/services/ai/providers/openai.js`
- `.qodo/services/ai/providers/groq.js`
- `.qodo/services/ai/providers/gemini.js`
- `.qodo/core/receptionist.js`
- `.qodo/agents/_baseAgent.js`
- `.qodo/services/chat/inbound.js`
- `.qodo/services/supabase.js`
- `schema.sql`
- `server.js`
- `supabase/functions/embed/index.ts`

### 2.3 Escopo excluido

Este documento nao constitui:

- auditoria externa do modelo do fornecedor
- laudo de seguranca do provedor third-party
- benchmark formal comparativo entre modelos
- parecer juridico sobre contratacao ou transferencia internacional

Seu foco e a documentacao tecnica do comportamento da camada de IA tal como implementada no produto.

---

## 3. Visao Geral da Arquitetura de IA

A IA do projeto opera como parte de uma cadeia de decisao mais ampla. O modelo generativo nao recebe a pergunta e responde de forma totalmente livre. Antes disso, o sistema:

1. recebe a pergunta do usuario
2. identifica o assistente ou area mais aderente
3. busca entradas relevantes na base institucional
4. calcula o score de evidencia
5. decide se deve responder, responder com ressalva ou se abster
6. monta um prompt com regras explicitas de comportamento
7. envia a solicitacao ao provedor configurado
8. registra metadados de auditoria, fonte, risco e confianca

Esse desenho pode ser resumido assim:

```text
Consulta do usuario
    ->
Roteamento por area institucional
    ->
Busca textual e semantica na base local
    ->
Avaliacao de evidencia
    ->
Prompt governado
    ->
Modelo generativo externo
    ->
Resposta auditavel com score e trilha
```

Portanto, o "modelo" do projeto nao deve ser entendido apenas como `gpt-4o-mini` ou `llama-3.3-70b-versatile`, mas como um **sistema composto**, no qual o modelo base e apenas uma das camadas.

---

## 4. Modelo Utilizado

### 4.1 Provedores suportados

A tabela `ai_provider_settings` e a camada `.qodo/services/ai/index.js` indicam suporte a tres provedores:

| Provedor | Papel no sistema | Estado observado |
|---|---|---|
| OpenAI | modelo principal de chat e embeddings | plenamente integrado |
| Groq | alternativa para chat via API compativel | integrado |
| Gemini | alternativa prevista | integracao parcial/incompleta |

### 4.2 Modelos de chat identificados

Os modelos padrao observados no codigo sao:

| Contexto | Modelo padrao identificado |
|---|---|
| Chat OpenAI | `gpt-4o-mini` |
| Chat Groq | `llama-3.3-70b-versatile` |
| Chat Gemini | `gemini-pro` no provider local, com referencia tambem a `gemini-1.5-flash` em configuracao |
| Keywords em funcao legado/embed | `gpt-3.5-turbo` |

### 4.3 Modelo de embeddings identificado

Para busca semantica e enriquecimento da base institucional, o projeto utiliza:

- `text-embedding-3-small`

Esse modelo aparece em diferentes pontos do repositorio, incluindo scripts de bootstrap, sincronizacao da base e funcao `embed` no Supabase.

### 4.4 Observacao importante sobre Gemini

O provider Gemini aparece no projeto, mas a implementacao atual em `.qodo/services/ai/providers/gemini.js` retorna uma resposta simulada e nao demonstra o mesmo grau de maturidade operacional observado em OpenAI e Groq. Por isso, o Model Card recomenda tratar Gemini, no estado atual do repositorio, como suporte **previsto**, e nao como camada plenamente operacional no mesmo nivel dos demais.

### 4.5 Configuracao dinamica por escola

A arquitetura permite configuracao por escola, com leitura de:

- provedor ativo
- modelo OpenAI
- modelo Groq

Isso significa que o modelo efetivamente utilizado em producao pode variar conforme a configuracao armazenada no banco, e nao apenas conforme variaveis de ambiente.

---

## 5. Treinamento e Adaptacao do Sistema

### 5.1 O projeto treina um modelo proprio?

Nao. No estado atual do repositorio, o projeto **nao realiza treinamento proprietario nem fine-tuning supervisionado** de um modelo de linguagem proprio.

Os modelos generativos utilizados sao modelos pretreinados de terceiros, consumidos por API.

### 5.2 Entao como o sistema se adapta ao contexto educacional?

A adaptacao ao dominio escolar nao ocorre por re-treinamento do modelo base, mas por uma combinacao de tecnicas de engenharia de produto e grounding:

- prompts de sistema especializados por assistente
- recuperacao de conhecimento local
- uso de documentos e versoes institucionais
- thresholds de evidencia
- restricoes de linguagem e escopo no prompt
- registro de feedback e incidentes para melhoria do produto

### 5.3 Grounding institucional

O principal mecanismo de "especializacao" do sistema e o grounding na base institucional local. Em termos praticos, isso significa que o modelo responde a partir de:

- perguntas e respostas estruturadas em `knowledge_base`
- documentos-fonte em `source_documents`
- versoes em `knowledge_source_versions`
- conteudo oficial relacionado a modulos institucionais

Em vez de ensinar tudo ao modelo por treinamento, o projeto consulta a base e injeta o contexto recuperado no prompt.

### 5.4 Embeddings e busca hibrida

A especializacao tambem depende de busca hibrida, que combina:

- matching textual
- sobreposicao de palavras-chave
- similaridade semantica por embedding

Esse desenho significa que parte do "aprendizado prático" do sistema nao esta no modelo em si, mas na qualidade da base versionada e da busca que seleciona o contexto enviado ao modelo.

### 5.5 Historico de conversa

O sistema tambem usa historico curto de interacao para manter coerencia conversacional. Esse historico e armazenado temporariamente em memoria e enviado ao provedor junto com o prompt e a nova entrada do usuario.

### 5.6 Conclusao sobre treinamento

Para fins deste Model Card, a secao de treinamento deve ser descrita assim:

- **treinamento base:** realizado pelo fornecedor do modelo, fora do controle direto do projeto
- **fine-tuning local:** nao identificado
- **adaptacao de dominio:** realizada por retrieval, prompts, versionamento de fontes e regras de governanca

---

## 6. Como o Sistema Produz Confianca

### 6.1 Natureza da confianca no projeto

A confianca registrada pelo sistema nao corresponde a uma probabilidade estatistica calibrada de acerto do modelo. Trata-se de um **indicador operacional derivado da qualidade da evidencia recuperada** e das regras definidas pela aplicacao.

### 6.2 Thresholds observados no codigo

A camada de avaliacao de evidencia utiliza dois thresholds principais:

- `WARNING_EVIDENCE_SCORE = 0.58`
- `SAFE_EVIDENCE_SCORE = 0.78`

### 6.3 Estados de decisao

Com base nesses thresholds, o sistema adota tres estados:

| Estado | Criterio geral | Comportamento |
|---|---|---|
| `ABSTAIN_AND_REVIEW` | evidencia insuficiente ou sem fonte confiavel | nao responde plenamente e recomenda revisao |
| `ANSWER_WITH_WARNING` | evidencia parcial | responde de forma conservadora e marca revisao |
| `SAFE_TO_ANSWER` | evidencia forte e fonte versionada | responde com maior seguranca operacional |

### 6.4 Score de confianca observado

O codigo calcula `confidence_score` a partir do `evidence_score`. Portanto, a confianca e uma funcao do suporte documental, e nao uma autoavaliacao direta do modelo generativo.

Em termos práticos:

- baixa evidencia tende a gerar confianca baixa e alto risco
- evidencia intermediaria gera confianca moderada e revisao requerida
- evidencia forte gera confianca maior e risco menor

### 6.5 Nivel de risco associado

A confianca tambem e lida junto com:

- `hallucination_risk_level`
- `review_required`
- `review_reason`
- `fallback_to_human`
- `abstained`

Por isso, a leitura correta do sistema nao e apenas "quanto confiou", mas "quais sinais de governanca acompanharam essa resposta".

### 6.6 Limite de interpretacao

Este Model Card recomenda registrar expressamente que:

- o `confidence_score` do projeto e **operacional**, nao probabilistico
- nao deve ser interpretado como certeza matematica de veracidade
- deve sempre ser lido em conjunto com fonte, versao, risco e necessidade de revisao

---

## 7. Limitacoes do Modelo e da Solucao

### 7.1 Limitacoes dos modelos base

Como o sistema utiliza modelos generativos generalistas de terceiros, ele herda limitacoes conhecidas desses modelos, incluindo:

- possibilidade de formular texto plausivel sem base suficiente
- variabilidade semantica da resposta conforme ambiguidade do input
- sensibilidade a qualidade do prompt
- dependencia do comportamento do provedor e da versao do modelo

### 7.2 Limitacoes da base institucional

Mesmo com modelo adequado, a resposta pode ser insuficiente ou incorreta quando:

- a base de conhecimento esta incompleta
- o documento-fonte esta desatualizado
- a pergunta foge ao que foi curado institucionalmente
- ha conflito entre registros ou documentos

Isso significa que a principal limitacao pratica do sistema pode estar menos no modelo e mais na cobertura e qualidade da base institucional.

### 7.3 Limitacoes do roteamento

O roteamento por area e heuristico, baseado em termos presentes no texto. Isso pode gerar:

- encaminhamento para assistente menos aderente
- classificacao imperfeita de perguntas ambiguas
- dependencia de vocabulário usado pelo usuario

### 7.4 Limitacoes do canal atual

No estado atual do projeto:

- o atendimento e orientado a texto
- nao ha handoff humano sincrono dentro do fluxo do canal
- o pedido de falar com humano nao ativa transferencia imediata
- a supervisao e majoritariamente posterior

### 7.5 Limitacoes de maturidade tecnica

Tambem foram identificadas limitacoes de maturidade da propria camada de IA:

- integracao Gemini ainda parcial/incompleta
- necessidade de camada de minimizacao de dados antes do envio a provedores externos
- necessidade de formalizar testes comparativos entre modelos
- necessidade de monitorar desempenho real por provedor e por escola

---

## 8. Vieses Conhecidos

### 8.1 Vies de cobertura documental

Este e o vies mais evidente do sistema. A IA tende a responder melhor sobre temas que estao bem documentados e versionados, e pior sobre temas ausentes, pouco curados ou mal representados na base.

Consequencia pratica:

- o sistema pode parecer "mais inteligente" em assuntos com boa curadoria e "menos competente" em temas igualmente relevantes, mas pouco documentados.

### 8.2 Vies de formulacao linguistica

Usuarios com maior capacidade de formular perguntas claras, diretas e compatíveis com a taxonomia institucional tendem a obter melhores respostas. Perguntas muito vagas, coloquiais ou com termos incomuns podem sofrer perda de aderencia.

### 8.3 Vies do provedor de base

Como o sistema depende de modelos third-party, ele tambem herda vieses gerais desses provedores, inclusive:

- vieses linguistico-culturais do modelo base
- assimetrias de desempenho por tipo de pergunta
- diferenças entre fornecedores e versoes de modelo

### 8.4 Vies de conservadorismo

A estrategia de abstencao e resposta conservadora reduz alucinacao, mas pode gerar um vies de cautela excessiva. Em alguns casos, o sistema pode se recusar a responder mesmo quando um operador humano consideraria haver base suficiente, caso o score de evidencia fique abaixo do threshold.

### 8.5 Vies institucional

Como a resposta e ancorada em base oficial, o sistema naturalmente privilegia a linguagem e a visao institucional presentes nos documentos. Isso e desejavel para consistencia administrativa, mas tambem implica risco de reproduzir lacunas ou parcialidades existentes no proprio acervo institucional.

### 8.6 Vies de feedback insuficiente

Embora o sistema registre feedback e incidentes, a maturidade desse ciclo ainda depende de uso real. Em fases iniciais, o volume de feedback pode ser insuficiente para corrigir sistematicamente determinados desvios.

---

## 9. Recomendacoes de Uso Responsavel

### 9.1 Usos recomendados

A camada de IA e mais adequada para:

- atendimento informacional recorrente
- triagem inicial de consultas
- orientacao baseada em fonte institucional registrada
- apoio a secretarias e areas administrativas em demandas padronizaveis

### 9.2 Usos nao recomendados sem camada adicional de controle

Nao se recomenda utilizar o sistema, no estado atual, como mecanismo autonomo para:

- decisao administrativa final
- interpretacao juridica individualizada
- casos disciplinares sensiveis
- temas envolvendo menores em situacoes de alta criticidade
- respostas em ausencia de base institucional versionada

### 9.3 Boas praticas para operacao

Recomenda-se que a operacao do sistema observe:

- curadoria continua da base institucional
- revisao dos casos com `review_required`
- acompanhamento de incidentes e feedback incorreto
- monitoramento comparativo de provedores e modelos
- revisao periodica dos thresholds de evidencia

---

## 10. Avaliacao Sintetica por Componente

| Componente | Avaliacao sintetica |
|---|---|
| Modelo generativo OpenAI | Maduro e integrado |
| Modelo generativo Groq | Integrado e funcional |
| Modelo Gemini | Presente, mas ainda parcial |
| Embeddings | Claramente definidos (`text-embedding-3-small`) |
| Grounding por base institucional | Forte diferencial do projeto |
| Fine-tuning proprio | Nao identificado |
| Confianca operacional | Presente, mas nao probabilistica |
| Mitigacao de alucinacao | Estruturalmente robusta para piloto |

---

## 11. Conclusao

A camada de IA do projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** nao deve ser entendida como simples uso de um modelo generativo isolado. Trata-se de uma arquitetura composta, que combina modelos de terceiros com grounding institucional, thresholds de evidencia, regras de abstencao e trilha de auditoria.

No estado atual do repositorio, o modelo mais claramente suportado como padrao de chat e o `gpt-4o-mini`, com alternativa funcional via Groq usando `llama-3.3-70b-versatile`. O projeto tambem utiliza `text-embedding-3-small` para embeddings e busca semantica. Nao foi identificado fine-tuning local do modelo base; a especializacao se da por base institucional, prompts e governanca da aplicacao.

As limitacoes e vieses conhecidos residem menos em um erro unico do modelo e mais na interacao entre:

- cobertura documental
- qualidade da curadoria
- heuristica de roteamento
- comportamento do provedor escolhido
- maturidade da camada de supervisao e feedback

A confianca apresentada pelo sistema deve ser interpretada como indicador operacional de suporte documental, e nao como probabilidade cientificamente calibrada. Ainda assim, o desenho atual oferece base suficientemente robusta para piloto institucional controlado, sobretudo por combinar IA com evidencia, revisao e registro estruturado.

---

## 12. Quadro Executivo Final

| Eixo | Sintese |
|---|---|
| Modelo utilizado | Configuravel por escola; padrao observado: `gpt-4o-mini` para chat e `text-embedding-3-small` para embeddings |
| Treinamento | Sem fine-tuning local; especializacao por retrieval, prompts e fontes versionadas |
| Limitacoes | Dependencia da base institucional, roteamento heuristico, ausencia de handoff humano sincrono |
| Vieses conhecidos | Cobertura documental, formulacao linguistica, vies do provedor e conservadorismo por threshold |
| Nivel de confianca | Operacional, derivado do `evidence_score`, nao probabilistico |
| Recomendacao geral | Adequado para piloto com escopo delimitado e governanca ativa |

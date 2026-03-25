# BLOCO 2 - DOCUMENTACAO DE GOVERNANCA

## PDF 2 - Relatorio de Impacto Algoritmico (RIA)

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica  
**Natureza do documento:** Relatorio tecnico-institucional de governanca algoritmica  
**Versao:** 1.0  
**Data:** 21 de marco de 2026  
**Escopo analisado:** Plataforma LAB-IA Educacao em sua configuracao atual de atendimento institucional, base de conhecimento, auditoria e governanca

---

## Capa

| Elemento | Conteudo sugerido |
|---|---|
| Titulo | Relatorio de Impacto Algoritmico (RIA) |
| Subtitulo | Avaliacao da finalidade, logica decisoria, riscos, mitigacoes e supervisao humana da IA utilizada no atendimento escolar institucional |
| Projeto | Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica |
| Contexto | Bloco 2 - Documentacao de Governanca / PDF 2 |
| Finalidade do documento | Subsidiar apresentacao institucional, piloto, governanca interna, controle e prestacao de contas |
| Rodape | Documento baseado na arquitetura e nos controles efetivamente identificados no repositorio tecnico do projeto |

---

## 1. Sumario Executivo

O presente Relatorio de Impacto Algoritmico (RIA) examina o uso de inteligencia artificial no projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**, plataforma destinada ao atendimento institucional de redes publicas de educacao, com foco em consultas recorrentes, organizacao do conhecimento oficial e producao de inteligencia de gestao.

O exame realizado indica que a solucao nao se limita ao uso livre de modelos generativos. Ao contrario, a arquitetura atual incorpora uma camada intermediaria de governanca que condiciona o comportamento da IA a regras de evidencia, recuperacao de conhecimento institucional, classificacao de risco, registro de trilha de auditoria e mecanismos de feedback e incidente.

Em termos funcionais, a IA e utilizada para responder consultas textuais no contexto escolar e administrativo, a partir da recuperacao de conteudos da base institucional. Antes de uma resposta ser considerada apta, o sistema avalia se ha fonte e versao suficientes para sustenta-la. Quando a evidencia e considerada insuficiente, a solucao pode restringir a resposta, sinalizar necessidade de revisao humana ou se abster de responder de forma conclusiva.

Do ponto de vista de impacto, o projeto apresenta potencial relevante de ganho publico, ao reduzir sobrecarga operacional, ampliar padronizacao, melhorar acesso a informacao e transformar interacoes em dados gerenciais. Entretanto, tambem apresenta riscos tipicos de sistemas baseados em IA, especialmente risco de alucinacao, desatualizacao de conteudo, interpretacao excessiva, dependencia de base institucional incompleta, exposicao de dados pessoais e uso indevido em materias que exigem validacao humana formal.

A analise mostra que ha medidas concretas ja implementadas para mitigar parte desses riscos, tais como:

- recuperacao de conhecimento com base estruturada e versionada
- thresholds de evidencia para modular o comportamento da resposta
- abstencao quando nao ha base institucional suficiente
- registro de score de confianca e risco de alucinacao
- trilha formal de auditoria por resposta
- mecanismos de feedback e abertura de incidente
- segregacao de informacao de governanca por perfil de acesso

Tambem foram identificadas medidas em consolidacao, especialmente nas frentes de LGPD, isolamento completo por escola, RLS abrangente, minimizacao de dados em prompts e politica de retencao.

Em sintese, conclui-se que o sistema possui arquitetura promissora e relativamente madura para um piloto institucional de **IA com governanca**, desde que seu uso permane�a limitado ao apoio informacional e operacional, sem substituicao de decisao administrativa formal, e desde que as medidas de supervisao e conformidade continuem evoluindo antes da expansao em larga escala.

---

## 2. Objetivo e Escopo do RIA

### 2.1 Objetivo

Este RIA tem por objetivo identificar, descrever e avaliar:

- a finalidade do uso de IA no projeto
- a forma como o sistema toma decisoes e produz respostas
- os riscos tecnicos, institucionais e sociais decorrentes desse uso
- as medidas de mitigacao ja implementadas e as medidas ainda necessarias
- os limites adequados de uso da tecnologia
- os mecanismos de supervisao humana e responsabilizacao

### 2.2 Escopo analisado

O relatorio foi elaborado com base na documentacao e no codigo-fonte identificados no repositorio do projeto, com especial atencao para:

- backend em `server.js`
- servicos de IA em `.qodo/services/ai`
- orquestracao de chat em `.qodo/services/chat/inbound.js`
- logica de atendimento e thresholds em `.qodo/core/receptionist.js`
- agentes especializados em `.qodo/agents/_baseAgent.js`
- trilha de auditoria e persistencia em `.qodo/services/supabase.js`
- visualizacao e capacidades por perfil em `.qodo/api/webchat.js`
- schema de dados e snippets SQL relacionados a auditoria, evidencias, feedback, incidentes e RLS

### 2.3 Limites desta avaliacao

Este RIA examina o comportamento do sistema com base na implementacao atualmente identificada no repositorio. Por esse motivo:

- descreve o funcionamento tecnico observado, e nao um estado futuro hipotetico
- diferencia controles ja implementados de controles ainda em consolidacao
- nao substitui avaliacao juridica, revisao de protecao de dados ou parecer institucional definitivo
- deve ser atualizado sempre que houver mudanca significativa de modelo, escopo funcional, base de conhecimento ou regime de governanca

---

## 3. Descricao Geral do Sistema Algoritmico

O projeto opera como plataforma de atendimento institucional com IA, combinando frontend administrativo, backend de orquestracao, base de conhecimento institucional, configuracao de provedores de IA e camadas de auditoria e governanca.

Na configuracao atualmente mapeada, o sistema utiliza quatro assistentes institucionais:

- Assistente Publico
- Assistente da Secretaria
- Assistente da Tesouraria
- Assistente da Direcao

Esses assistentes nao operam como instancias isoladas de um modelo generativo puro. O comportamento final depende de uma cadeia composta por:

1. recebimento da consulta do usuario
2. roteamento para a area mais aderente
3. recuperacao de entradas relevantes da base institucional
4. avaliacao do nivel de evidencia encontrado
5. definicao entre responder, responder com ressalva ou se abster
6. geracao da resposta pelo provedor de IA configurado
7. registro de auditoria, evidencias, score e metadados
8. possibilidade de feedback, incidente e revisao posterior por perfis autorizados

Esse desenho e importante porque desloca parte da decisao para uma camada deterministica e auditavel, anterior e posterior ao modelo generativo. Em outras palavras, o modelo de IA nao decide sozinho se deve responder plenamente; ele e condicionado por regras de governanca implementadas no software.

---

## 4. Finalidade da IA

### 4.1 Finalidade principal

A finalidade principal da IA no projeto e apoiar o atendimento institucional escolar, oferecendo respostas textuais a consultas recorrentes da comunidade escolar e de agentes administrativos, com base em conhecimento oficial e versionado.

### 4.2 Finalidades especificas

Com base no comportamento observado no sistema, a IA cumpre as seguintes finalidades especificas:

- orientar usuarios sobre temas recorrentes de atendimento escolar
- recuperar e apresentar informacoes institucionais de forma mais acessivel
- padronizar respostas para reduzir contradicoes entre canais e setores
- apoiar secretarias e areas administrativas na triagem de demandas
- sinalizar quando a base e insuficiente para resposta segura
- produzir registros estruturados para auditoria e melhoria continua
- gerar dados sobre temas recorrentes, qualidade da base e desempenho do atendimento

### 4.3 Finalidade negativa ou excluida

A partir da implementacao atual, a IA nao deve ser enquadrada como mecanismo destinado a:

- deferir ou indeferir matricula
- tomar decisao administrativa formal em nome da rede
- substituir despacho, parecer ou ato oficial
- produzir orientacao juridica individualizada
- decidir casos disciplinares, sensiveis ou controversos sem intervencao humana
- operar como canal de voz ou atendimento multimodal amplo

Esse ponto e central para o RIA: a tecnologia foi desenhada como **apoio informacional governado**, e nao como substituta da autoridade administrativa humana.

### 4.4 Publicos afetados

Os principais grupos potencialmente impactados pelo uso da IA sao:

- familias e responsaveis
- estudantes
- servidores da secretaria e atendimento
- equipes gestoras
- curadores de conteudo institucional
- auditores e perfis de governanca

A intensidade do impacto sobre cada grupo varia conforme o nivel de dependencia da resposta automatizada e o tipo de informacao tratada.

---

## 5. Como a IA Toma Decisoes

### 5.1 Visao geral da logica decisoria

O sistema nao executa uma decisao unica e indivisivel. Ele realiza uma cadeia de microdecisoes. Essa cadeia pode ser descrita da seguinte maneira:

| Etapa | Acao realizada | Natureza da decisao |
|---|---|---|
| 1. Recepcao | Recebe mensagem textual do usuario | Validacao basica de entrada |
| 2. Roteamento | Identifica area mais aderente por termos-chave ou agente definido | Regra heuristica |
| 3. Recuperacao | Busca entradas da base institucional por matching textual e semantico | Decisao baseada em ranking |
| 4. Avaliacao de evidencia | Calcula score e classifica risco | Regra deterministica |
| 5. Comportamento de resposta | Decide entre responder, responder com ressalva ou se abster | Regra deterministica |
| 6. Geracao textual | Solicita ao provedor de IA a formulacao da resposta | Modelo generativo condicionado |
| 7. Auditoria | Registra eventos, fontes, score, risco e metadados | Persistencia e governanca |
| 8. Supervisao posterior | Permite feedback, incidente, revisao e encerramento por perfis autorizados | Controle humano posterior |

### 5.2 Roteamento por area

Na camada de recepcao identificada em `.qodo/core/receptionist.js`, a mensagem do usuario passa por uma deteccao de area baseada em palavras-chave. Termos como "tesouraria", "financeiro" e "pagamento" podem direcionar o atendimento ao assistente da tesouraria; termos como "direcao", "ouvidoria" ou "norma" podem direcionar a direcao; e termos como "secretaria", "documento" e "declaracao" podem direcionar a secretaria.

Trata-se, portanto, de um mecanismo heuristico de roteamento inicial. Essa etapa nao produz decisao administrativa final, mas influencia qual agente e qual contexto de resposta serao utilizados.

### 5.3 Recuperacao de conhecimento

A logica de recuperacao, implementada sobretudo em `.qodo/services/supabase.js`, utiliza combinacao de:

- sobreposicao textual entre pergunta e base
- correspondencia por palavras-chave
- embeddings semanticos quando o provedor Groq esta disponivel
- limitacao do conjunto de resultados a poucas entradas mais aderentes

O sistema opera sobre uma base chamada `knowledge_base`, vinculada a documentos-fonte e versoes. Isso permite que a resposta posterior seja amparada em evidencias estruturadas, e nao apenas em memoria estatistica do modelo.

### 5.4 Avaliacao de evidencia

A etapa mais relevante da governanca algoritmica esta em `buildEvidenceAssessment`, presente tanto em `.qodo/core/receptionist.js` quanto em `.qodo/agents/_baseAgent.js`.

A implementacao atual utiliza thresholds explicitos:

- `WARNING_EVIDENCE_SCORE = 0.58`
- `SAFE_EVIDENCE_SCORE = 0.78`

A partir desse score e da existencia de fonte versionada, o sistema classifica a situacao em tres estados:

1. **ABSTAIN_AND_REVIEW**  
Quando nao ha fonte suficiente ou o score de evidencia esta abaixo de `0.58`.

2. **ANSWER_WITH_WARNING**  
Quando existe alguma base, mas o score ainda nao e suficientemente forte para resposta sem ressalvas.

3. **SAFE_TO_ANSWER**  
Quando existe base versionada e o score de evidencia atinge o patamar de seguranca previsto.

### 5.5 Geracao da resposta

Somente apos a etapa de avaliacao de evidencia o sistema monta o prompt para o provedor de IA. O prompt inclui regras como:

- responder em portugues do Brasil
- nao inventar normas, prazos ou compromissos institucionais
- limitar-se estritamente ao que estiver sustentado pelas fontes recuperadas
- citar explicitamente a fonte e a versao usadas
- deixar claro quando a base estiver incompleta

O provedor utilizado é configurado para Groq, mas a camada de governanca permanece externa ao modelo. Isso significa que a politica de resposta e controlada pela aplicacao, nao delegada integralmente ao fornecedor.

### 5.6 Auditoria e classificacao de risco

Na orquestracao de chat em `.qodo/services/chat/inbound.js`, o sistema constr�i um "envelope de auditoria" com os seguintes elementos:

- existencia ou ausencia de base confiavel
- score de evidencia
- nivel de risco de alucinacao
- necessidade de revisao
- tipo de evento de auditoria
- severidade do evento
- razao da revisao
- indicacao de area de fallback

As categorias observadas incluem, entre outras:

- `AUTOMATIC_RESPONSE_WITH_EVIDENCE`
- `AUTOMATIC_RESPONSE_REQUIRES_REVIEW`
- `NO_CONFIDENT_BASIS`
- `HALLUCINATION_MITIGATED_ABSTENTION`

Isso demonstra que o sistema nao registra apenas a resposta final, mas tambem o juizo algoritmico sobre sua seguranca relativa.

### 5.7 Formula simplificada do comportamento

Para fins de transparencia institucional, a logica atual pode ser resumida da seguinte forma:

```text
Se nao ha fonte confiavel ou score minimo de evidencia:
    nao responder plenamente
    marcar alto risco
    recomendar revisao

Se ha fonte parcial, mas evidencia intermediaria:
    responder de forma conservadora
    marcar revisao requerida

Se ha fonte versionada e score alto:
    responder com base na evidencia
    registrar fonte, confianca e auditoria
```

---

## 6. Natureza e Intensidade do Impacto Algoritmico

### 6.1 Tipo de impacto

O sistema nao produz, em sua configuracao atual, decisao automatizada de alto impacto juridico direto, como concessao de direito, aplicacao de sancao ou definicao automatica de elegibilidade administrativa. Contudo, ele pode produzir **impactos indiretos relevantes**, pois influencia o acesso do usuario a informacoes institucionais e orienta sua compreensao de procedimentos e deveres.

### 6.2 Por que o impacto nao e trivial

Mesmo em sistemas predominantemente informacionais, uma resposta incorreta pode gerar efeitos concretos, como:

- perda de prazo
- comparecimento em data errada
- envio incompleto de documentacao
- deslocamento desnecessario ate a unidade escolar
- expectativas inadequadas sobre procedimentos internos
- desgaste com a instituicao

Por isso, o projeto deve ser classificado como sistema de **impacto moderado a relevante**, especialmente em contexto de atendimento publico, ainda que nao realize decisao administrativa final.

### 6.3 Fatores que ampliam o impacto

A intensidade do impacto cresce quando:

- a pergunta envolve regra ou prazo sensivel
- a base institucional esta desatualizada
- a resposta automatizada e tomada como definitiva
- o usuario tem baixa capacidade de validacao por outros meios
- ha dados de criancas, adolescentes ou responsaveis envolvidos
- o atendimento se refere a tema sensivel de gestao escolar

---

## 7. Possiveis Riscos

### 7.1 Matriz geral de riscos

| Risco | Descricao | Probabilidade atual | Impacto potencial | Nivel sintetico |
|---|---|---|---|---|
| Alucinacao informacional | Resposta nao sustentada por base institucional suficiente | Medio | Alto | Alto |
| Uso de base desatualizada | Resposta correta do ponto de vista tecnico, mas apoiada em conteudo vencido | Medio | Alto | Alto |
| Roteamento inadequado | Pergunta enviada para area menos aderente | Medio | Medio | Medio |
| Excesso de confianca do usuario | Usuario trata resposta como decisao oficial final | Medio | Alto | Alto |
| Exposicao de dados pessoais | Dados sensiveis circulam sem minimizacao suficiente | Medio | Alto | Alto |
| Falha de segregacao entre escolas | Risco de acesso ou mistura indevida entre contextos institucionais | Medio | Alto | Alto |
| Automacao de temas sensiveis | Uso da IA em materias que exigiriam validacao humana obrigatoria | Baixo a medio | Alto | Alto |
| Dependencia de fornecedor de IA | Instabilidade, custo ou comportamento variavel do provedor | Medio | Medio | Medio |
| Vies de cobertura documental | Sistema responde melhor sobre o que esta bem documentado e pior sobre o que esta ausente | Alto | Medio | Alto |
| Exclusao por canal | Atendimento apenas por texto limita acesso de alguns usuarios | Medio | Medio | Medio |

### 7.2 Risco de alucinacao

Este e o risco mais evidente e central para o RIA. Como o sistema utiliza modelo generativo para formular texto, existe a possibilidade de o modelo completar lacunas, generalizar indevidamente ou produzir formulacoes aparentemente plausiveis, mas nao sustentadas pela base institucional.

Esse risco, contudo, nao e ignorado pela arquitetura. Ele e reconhecido explicitamente e tratado por mecanismos proprios de avaliacao de evidencia, abstencao e revisao.

### 7.3 Risco de desatualizacao e curadoria incompleta

A qualidade da resposta depende fortemente da qualidade e atualidade da base institucional. Caso um procedimento mude e a base nao seja revisada, a resposta podera replicar uma orientacao superada. Esse risco e independente do modelo e esta ligado a governanca do conhecimento.

### 7.4 Risco de automacao indevida

Existe risco de a organizacao ou os usuarios tentarem utilizar o sistema para obter respostas definitivas sobre materias que exigiriam ato humano, validacao normativa ou decisao administrativa formal. Esse risco aumenta quando a IA passa a ser percebida como autoridade institucional absoluta.

### 7.5 Riscos de protecao de dados

A documentacao do projeto ja reconhece gaps relevantes, tais como uso de service role, necessidade de RLS ampliado, parada de confianca em `school_id` vindo do cliente em determinados contextos historicos e ausencia de camada mais explicita de minimizacao antes do envio a provedores de IA. Esses elementos indicam que os riscos de protecao de dados ainda exigem consolidacao.

### 7.6 Risco de assimetria de supervisao

Os perfis operacionais nao visualizam o mesmo nivel de detalhes de governanca que perfis como auditor, curador ou gestor. Isso e positivo do ponto de vista de segregacao de acesso, mas tambem pode criar situacoes em que quem opera a ponta nao compreende integralmente porque determinada resposta foi considerada sensivel ou de risco.

### 7.7 Risco de exclusao e acessibilidade limitada

A implementacao atual rejeita audio e orienta o usuario a enviar a consulta por texto. Embora essa escolha simplifique a governanca, ela limita acessibilidade para usuarios com menor familiaridade digital, restricoes de leitura e escrita ou preferencia por canais multimodais.

---

## 8. Mitigacao de Alucinacao

### 8.1 Estrategia geral

A mitigacao de alucinacao e um dos pontos mais fortes da arquitetura atual. O sistema nao opera apenas com instrucoes genericas para "nao inventar". Ele adota medidas estruturais, antes e depois da chamada ao modelo.

### 8.2 Medidas implementadas

Foram identificadas as seguintes medidas concretas de mitigacao:

1. **Recuperacao de base institucional estruturada**  
A resposta nao parte do zero; ela se ancora em entradas recuperadas da base de conhecimento.

2. **Associacao a fonte e versao**  
As evidencias incluem `source_document_id`, `source_version_id`, titulo e versao da fonte.

3. **Thresholds explicitos de evidencia**  
O sistema utiliza patamares objetivos para modular seu comportamento.

4. **Abstencao automatica**  
Quando a base nao e suficiente, o sistema opta por nao responder conclusivamente.

5. **Resposta conservadora em caso intermediario**  
Quando ha base parcial, a resposta recebe prefixo de cautela e e marcada para revisao.

6. **Registro de risco e revisao requerida**  
O sistema salva `hallucination_risk_level`, `review_required` e `review_reason`.

7. **Auditoria formal por evento**  
Cada resposta pode gerar evento em `formal_audit_events`, inclusive com severidade e razao.

8. **Evidencia estruturada por resposta**  
As fontes consultadas sao persistidas em `interaction_source_evidence`.

### 8.3 Tipos de resposta resultantes

A mitigacao leva, na pratica, a tres comportamentos distintos:

| Situacao | Comportamento do sistema | Justificativa |
|---|---|---|
| Sem base suficiente | Abstencao e recomendacao de revisao | Evitar afirmacao insegura |
| Base parcial | Resposta conservadora e limitada | Reduzir extrapolacao indevida |
| Base forte | Resposta automatica com evidencia | Maior seguranca informacional |

### 8.4 O que ainda precisa amadurecer

Apesar do desenho robusto, permanecem recomendacoes adicionais importantes:

- mascaramento de dados pessoais antes do envio ao provedor
- politicas mais explicitas por tipo de tema de alto risco
- bloqueio ou escalonamento automatico para assuntos juridicos, disciplinares ou sensiveis envolvendo menores
- revisao periodica dos thresholds de evidencia com base em uso real
- testes sistematicos com perguntas adversariais ou ambiguas

### 8.5 Avaliacao geral da mitigacao de alucinacao

Do ponto de vista deste RIA, a plataforma demonstra maturidade superior a sistemas genericos de atendimento ao adotar abstencao, threshold e evidencias persistidas. Ainda assim, a mitigacao nao elimina integralmente o risco. Ela o reduz e o torna mais observavel, o que e condicao importante para um piloto responsavel.

---

## 9. Limites de Uso

### 9.1 Limite material

A IA deve ser utilizada prioritariamente para:

- atendimento informacional recorrente
- triagem de consultas
- apoio a orientacao administrativa de baixa a media complexidade
- apresentacao de informacoes contidas em base institucional validada

### 9.2 Uso que nao deve ser autorizado sem camada adicional de controle

Recomenda-se vedar ou restringir fortemente o uso da IA para:

- decisao sobre matricula ou direito subjetivo individual
- orientacoes juridicas individualizadas
- interpretacao normativa sem validacao humana
- casos disciplinares ou incidentes envolvendo menores
- decisao sobre sancoes, bloqueios ou medidas administrativas
- producao de respostas em ausencia de fonte institucional versionada

### 9.3 Limites operacionais atualmente observados

O sistema atual ja impoe alguns limites relevantes:

- o canal opera apenas com mensagens de texto
- nao ha transferencia para humano dentro do proprio fluxo de resposta em tempo real
- pedidos de "falar com humano" recebem esclarecimento de que o canal opera com assistentes institucionais
- a supervisao humana se da de forma posterior, por revisao, feedback, incidente e encerramento

### 9.4 Implicacao institucional desses limites

Esses limites devem ser explicitados a usuarios e operadores para evitar falsa expectativa. Em especial, e importante deixar claro que:

- o canal nao substitui canais formais da administracao
- a resposta automatizada nao equivale a ato administrativo final
- temas sensiveis podem demandar confirmacao institucional adicional

---

## 10. Supervisao Humana

### 10.1 Modelo de supervisao identificado

A supervisao humana existe, no estado atual do sistema, predominantemente em formato **posterior e governado**, e nao como copilotagem em tempo real da resposta. Isso significa que o humano pode revisar, auditar, sinalizar incidente, registrar feedback e encerrar conversas, mas nao intervir diretamente na geracao de cada resposta dentro do mesmo canal.

### 10.2 Mecanismos concretos de supervisao

Os mecanismos encontrados incluem:

- visualizacao de trilha de auditoria por perfis autorizados
- acesso diferenciado a detalhes de governanca conforme o papel
- registro de feedback `helpful`, `not_helpful` e `incorrect`
- abertura de incidente para resposta automatizada
- resolucao manual de conversas por perfis com capacidade correspondente
- visualizacao de evidencia detalhada por perfis de governanca

### 10.3 Supervisao por perfis

A API do webchat define capacidades diferenciadas por papel. Em linhas gerais:

| Perfil | Evidencia detalhada | Detalhes de governanca | Registrar feedback/incidente | Encerrar conversa |
|---|---|---|---|---|
| superadmin | Sim | Sim | Sim | Sim |
| network_manager | Sim | Sim | Sim | Sim |
| auditor | Sim | Sim | Sim | Nao |
| content_curator | Sim | Sim | Sim | Nao |
| direction | Sim | Sim | Nao | Sim |
| treasury | Sim | Sim | Nao | Sim |
| coordination | Nao | Nao | Nao | Sim |
| secretariat | Nao | Nao | Nao | Sim |
| public_operator | Nao | Nao | Nao | Sim |

Essa estrutura demonstra tentativa de equilibrar necessidade de supervisao com principio de menor privilegio.

### 10.4 Limite atual da supervisao humana

Embora exista revisao posterior, o projeto ainda nao apresenta um modo de handoff humano sincrono no mesmo canal. O endpoint de resposta humana esta explicitamente desabilitado, e o pedido de transferencia para humano nao altera o regime do canal naquele instante. Portanto, o modelo atual deve ser descrito como **supervisao posterior, e nao atendimento hibrido em tempo real**.

### 10.5 Avaliacao da supervisao

Esse modelo e suficiente para um piloto orientado a temas recorrentes e de menor criticidade, desde que:

- o escopo de uso seja bem delimitado
- a revisao posterior seja realmente exercida
- os incidentes alimentem melhoria da base
- temas de maior risco sejam excluidos ou escalonados

Para ampliacao de escopo, recomenda-se evoluir para mecanismos mais robustos de encaminhamento humano e filas de revisao operacional.

---

## 11. Transparencia, Auditabilidade e Prestacao de Contas

A arquitetura atual apresenta elementos relevantes de transparencia interna e auditabilidade, entre eles:

- registro de `consulted_sources`
- associacao a `supporting_source_title` e versao
- persistencia de `confidence_score`
- persistencia de `evidence_score`
- classificacao de `hallucination_risk_level`
- marcacao de `review_required`
- registro de eventos em `formal_audit_events`
- armazenamento de evidencias em `interaction_source_evidence`
- armazenamento de feedback e incidentes

Esses elementos permitem reconstruir, com nivel razoavel de detalhe, o percurso de uma resposta automatizada, o que representa ganho importante de accountability em comparacao com chatbots genericos.

Contudo, e necessario distinguir **transparencia interna governada** de **transparencia irrestrita**. O sistema corretamente restringe parte desses detalhes a perfis autorizados. A transparencia, portanto, nao se da pela exposicao total a qualquer usuario, mas pela possibilidade de revisao institucional por agentes legitimados.

---

## 12. Protecao de Dados e Riscos Correlatos

O RIA nao substitui o plano de adequacao LGPD, mas deve dialogar com ele, uma vez que o uso de IA pode intensificar riscos de tratamento de dados pessoais.

### 12.1 Pontos positivos ja observados

- existencia de roadmap formal de LGPD no repositorio
- preocupacao explicita com segregacao por escola
- previsao de RLS nas tabelas centrais
- restricao de detalhes sensiveis conforme perfil
- reconhecimento da necessidade de minimizacao antes do envio a IA

### 12.2 Gaps ainda relevantes

Conforme a documentacao tecnica ja existente, persistem pontos de atencao como:

- necessidade de consolidar RLS em tabelas centrais
- necessidade de eliminar dependencia de `school_id` vindo do cliente em fluxos legados
- uso de `SUPABASE_SERVICE_KEY` em partes sensiveis do backend
- ausencia de camada explicita e abrangente de redacao/minimizacao antes do envio ao provedor
- ausencia de politica tecnica consolidada de retencao e descarte

### 12.3 Avaliacao sintetica

Do ponto de vista deste RIA, os riscos de protecao de dados nao inviabilizam um piloto controlado, mas impedem que o sistema seja tratado como plenamente maduro para expansao ampla sem endurecimento adicional. A evolucao da governanca algoritmica deve ocorrer em paralelo a evolucao da governanca de dados.

---

## 13. Medidas Implementadas x Medidas em Consolidacao

### 13.1 Medidas ja implementadas

| Eixo | Medidas identificadas |
|---|---|
| Governanca da resposta | Thresholds de evidencia, abstencao, resposta conservadora |
| Auditabilidade | Registro de eventos formais, score, risco, fonte e versao |
| Supervisao posterior | Feedback, incidente, encerramento e perfis de governanca |
| Segregacao de acesso | Capacidades diferentes por papel institucional |
| Base institucional | Conhecimento versionado e conteudo oficial estruturado |
| Flexibilidade tecnica | Provedores de IA configuraveis |

### 13.2 Medidas em consolidacao ou recomendadas

| Eixo | Medida recomendada |
|---|---|
| Protecao de dados | Minimizacao/redacao antes do envio ao provedor |
| Segregacao multiunidade | RLS completo e eliminacao de dependencias legadas |
| Escalonamento humano | Mecanismo mais explicito de fila ou handoff para temas criticos |
| Transparencia ao usuario | Avisos claros sobre limites e natureza nao decisoria da resposta |
| Testes de robustez | Bateria de testes adversariais e validacao periodica de thresholds |
| Curadoria | Processo continuado de revisao e atualizacao da base institucional |

---

## 14. Avaliacao de Adequacao para Piloto

Com base na analise realizada, a adequacao do sistema para piloto pode ser sintetizada do seguinte modo:

| Criterio | Avaliacao |
|---|---|
| Finalidade legitima e proporcional | Favoravel |
| Existencia de governanca algoritmica explicita | Favoravel |
| Mitigacao basica de alucinacao | Favoravel com ressalvas |
| Supervisao humana | Parcialmente favoravel |
| Protecao de dados | Favoravel apenas para piloto controlado, com ressalvas |
| Transparencia e auditabilidade | Favoravel |
| Adequacao para escala ampla imediata | Nao recomendada sem consolidacao adicional |

Em termos praticos, o sistema se mostra **adequado para piloto institucional controlado**, desde que acompanhado de:

- delimitacao clara de escopo
- exclusao de casos de alta criticidade
- governanca ativa da base de conhecimento
- monitoramento de feedback e incidentes
- avancos tecnicos na agenda LGPD e multiunidade

---

## 15. Recomendacoes do RIA

Recomenda-se, antes da ampliacao de escopo ou escala, a adocao das seguintes medidas:

1. Formalizar politica de uso aceitavel da IA, indicando assuntos permitidos e vedados.
2. Inserir aviso explicito ao usuario de que a resposta automatizada nao substitui ato administrativo formal.
3. Implementar camada de minimizacao de dados pessoais antes do envio aos provedores de IA.
4. Concluir endurecimento de autenticacao contextual e RLS nas tabelas centrais.
5. Criar protocolo de escalonamento para temas juridicos, disciplinares ou envolvendo menores em situacoes sensiveis.
6. Instituir rotina formal de curadoria e revisao de fontes versionadas.
7. Estabelecer revisao periodica dos thresholds de evidencia com base em dados reais do piloto.
8. Produzir painel especifico de governanca algoritmica com taxas de abstencao, revisao, incidentes e contestacao.
9. Avaliar ampliacao futura para atendimento humano assistido em casos excepcionais.
10. Atualizar este RIA a cada mudanca material de modelo, base, canal ou regime de supervisao.

---

## 16. Conclusao

O Relatorio de Impacto Algoritmico do projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** indica que a solucao se diferencia positivamente de usos genericos de IA por incorporar mecanismos tecnicos e institucionais de governanca diretamente na arquitetura do produto.

A plataforma nao apenas gera respostas: ela recupera base institucional, avalia evidencia, classifica risco, registra auditoria, permite feedback e abre caminho para revisao. Esse desenho reduz o risco de opacidade e cria melhores condicoes para responsabilidade institucional sobre o comportamento do sistema.

Ao mesmo tempo, o RIA tambem evidencia que a existencia de governanca algoritmica nao elimina por completo os riscos inerentes ao uso de modelos generativos em atendimento publico. Permanecem riscos relevantes ligados a alucinacao residual, desatualizacao da base, automacao indevida de temas sensiveis, protecao de dados e necessidade de supervisao humana mais robusta em certos contextos.

Por essa razao, a conclusao deste relatorio e favoravel ao uso da solucao em **piloto controlado e escopo delimitado**, com aprofundamento progressivo das medidas de conformidade, seguranca e supervisao. O projeto demonstra base concreta para uma experiencia de IA governada no setor educacional publico, desde que sua implementacao seja acompanhada de limites claros, curadoria ativa e compromisso institucional com monitoramento continuo.

---

## 17. Quadro Executivo Final

| Eixo | Sintese |
|---|---|
| Finalidade da IA | Apoio informacional e operacional ao atendimento escolar |
| Como decide | Roteamento heuristico + recuperacao de base + thresholds de evidencia + geracao condicionada |
| Principal risco | Resposta aparentemente plausivel sem base institucional suficiente |
| Principal mitigacao | Abstencao, resposta conservadora, auditoria e evidencia versionada |
| Limite central | Nao substituir decisao administrativa formal |
| Supervisao humana | Posterior, por auditoria, feedback, incidente e encerramento |
| Recomendacao do RIA | Apto para piloto controlado, nao para expansao ampla sem consolidacao adicional |

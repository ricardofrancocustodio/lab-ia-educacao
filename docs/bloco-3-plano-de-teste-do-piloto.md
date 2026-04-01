# BLOCO 3 - DOCUMENTACAO TECNICA

# Plano de Teste do Piloto
## Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica

| Campo | Conteudo |
|---|---|
| Tipo de documento | Plano tecnico-operacional de teste piloto |
| Finalidade | Orientar a execucao, o monitoramento e a avaliacao do piloto institucional |
| Escopo | Atendimento escolar com IA, governanca algoritmica, curadoria e trilha de auditoria |
| Vinculacao | Complementar ao projeto principal, ao RIA, a DPIA/LGPD, ao Model Card e a arquitetura tecnica |
| Publico-alvo | Gestao da rede, secretaria escolar, equipe tecnica, curadoria, auditoria e parceiros institucionais |
| Status sugerido | Documento-base para pactuacao do piloto |

---

## 1. Apresentacao

O presente Plano de Teste do Piloto estabelece os parametros tecnicos e operacionais para validacao controlada da solucao **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** em ambiente real de uso. Seu objetivo e assegurar que a implantacao piloto nao seja tratada apenas como disponibilizacao experimental de tecnologia, mas como processo estruturado de avaliacao institucional, com escopo delimitado, indicadores definidos, responsabilidades claras e criterios objetivos para consolidacao, ajuste ou expansao.

O repositorio do projeto demonstra que a plataforma ja possui base funcional relevante, incluindo backend web, integracao com banco de dados, autenticacao por perfis, base de conhecimento institucional, modulo de conteudo oficial, trilhas de auditoria, registro de evidencias e mecanismos de mitigacao de respostas sem base suficiente. Em razao disso, o piloto pode ser conduzido com foco em validacao operacional e governanca, e nao apenas em prova de conceito abstrata.

Este documento organiza o piloto em torno de quatro eixos centrais:

- definicao do cenario de uso e do escopo institucional inicial
- delimitacao do numero de usuarios e do volume esperado de utilizacao
- planejamento da duracao do piloto por fases sucessivas
- definicao das metricas avaliadas e dos instrumentos de acompanhamento

---

## 2. Objetivos do Piloto

O piloto tem por finalidade verificar, em contexto real e controlado, se a plataforma e capaz de produzir ganhos concretos de eficiencia, qualidade da informacao, rastreabilidade e apoio ao atendimento escolar, sem comprometer os limites de governanca, seguranca e supervisao humana definidos nos documentos tecnicos do projeto.

Constituem objetivos especificos do piloto:

1. Validar o uso da plataforma em rotinas recorrentes de atendimento escolar e secretaria.
2. Medir a capacidade do sistema de responder com base em fontes oficiais e evidencias registradas.
3. Observar o comportamento dos mecanismos de revisao, abstencao e encaminhamento humano.
4. Testar a operacao da trilha de auditoria, dos registros de feedback e da abertura de incidentes.
5. Produzir evidencia suficiente para decisao institucional sobre ajustes, continuidade ou escala controlada.

---

## 3. Cenario de Uso do Piloto

### 3.1 Delimitacao institucional sugerida

Recomenda-se que o piloto seja executado em **1 rede ou secretaria parceira**, com implantacao inicial em **1 a 3 escolas**, de modo a equilibrar diversidade de uso e capacidade de acompanhamento. Esse desenho permite obter dados reais de operacao sem dispersar o esforco de curadoria, suporte e monitoramento.

### 3.2 Frentes de uso priorizadas

Para a primeira rodada de teste, recomenda-se foco em duas frentes principais:

1. **Atendimento publico escolar**
2. **Apoio operacional a secretaria escolar**

Essa delimitacao esta alinhada ao desenho funcional ja documentado no projeto principal e oferece boa relacao entre impacto percebido e risco controlavel.

### 3.3 Cenarios de uso exemplificativos

#### Cenario A - Atendimento publico escolar

Uso do assistente para responder duvidas recorrentes de familias, estudantes e comunidade escolar, especialmente em temas de baixa a media criticidade informacional, tais como:

- horarios e canais de atendimento
- calendario escolar e eventos oficiais
- procedimentos de matricula, rematricula e transferencia
- documentos usualmente solicitados
- orientacoes publicadas em comunicados e normativas da rede

Nesse cenario, o principal objeto de teste e a capacidade do sistema de ampliar o acesso a informacao oficial, reduzir repeticao de atendimentos manuais e manter consistencia institucional nas respostas.

#### Cenario B - Apoio a secretaria escolar

Uso da plataforma como camada de consulta assistida para servidores e operadores da secretaria, com foco em localizar orientacoes, procedimentos e referencias institucionais de maneira mais rapida. O escopo recomendado e consultivo, sem automatizacao de decisao administrativa final.

Nesse cenario, o principal objeto de teste e a reducao do tempo de busca por informacao, a organizacao da memoria institucional e a melhoria da rastreabilidade das respostas fornecidas ao publico.

### 3.4 Limites de escopo durante o teste

Durante o piloto, recomenda-se nao incluir, como fluxo autonomo prioritario, temas que demandem validacao formal caso a caso, alto grau de sensibilidade juridica ou decisao administrativa conclusiva. Quando tais temas aparecerem, a orientacao operacional deve priorizar revisao humana, abstencao assistida ou encaminhamento ao setor responsavel.

---

### 3.5 Descricao funcional do sistema no escopo do piloto

Para fins de aprovacao institucional, o piloto deve deixar explicito nao apenas o contexto de uso, mas tambem o comportamento funcional esperado do chat em operacao controlada.

### 3.6 O que o chat faz no piloto

No escopo recomendado do piloto, o chat atua como camada institucional de orientacao e triagem, com foco em consultas recorrentes e apoio informacional. Em termos funcionais, o sistema:

| Funcionalidade | Descricao no piloto |
|---|---|
| Recepcao de consultas por texto | Recebe perguntas da comunidade escolar e de operadores internos em canal de webchat |
| Triagem por area | Direciona a resposta para assistente mais aderente ao tema, como publico, secretaria, tesouraria ou direcao |
| Resposta com base institucional | Busca responder apenas com apoio em fontes recuperadas da base institucional |
| Citacao de fonte e versao | Quando houver base suficiente, responde com referencia a documento-fonte e versao correspondente |
| Sinalizacao de incerteza | Quando a base e parcial, responde de forma conservadora e marca necessidade de maior cautela |
| Abstencao assistida | Quando a evidencia e insuficiente, evita afirmar com seguranca e recomenda revisao humana |
| Registro de governanca | Persiste evidencia, confianca, risco, feedback, incidente e trilha de auditoria |

### 3.7 O que o chat nao faz no piloto

Para evitar falsa expectativa e ampliar seguranca regulatoria, e importante explicitar os limites operacionais e materiais do chat no piloto.

| Limite | Implicacao pratica |
|---|---|
| Nao profere decisao administrativa final | A resposta automatizada nao substitui ato formal da escola ou da secretaria |
| Nao realiza atendimento humano sincrono no mesmo canal | Pedido de falar com humano nao gera transferencia imediata dentro do chat |
| Nao deve responder autonomamente casos sensiveis fora do escopo | Temas juridicos, disciplinares, individuais ou conclusivos devem ser escalados |
| Nao inventa regras, prazos ou documentos | O comportamento esperado e aderencia estrita ao que esta sustentado em fonte |
| Nao opera por audio no fluxo atual | O canal funciona por texto e orienta o usuario a enviar a consulta por escrito |
| Nao substitui curadoria institucional | A qualidade da resposta depende da manutencao e atualizacao das fontes oficiais |

### 3.8 Temas em que o chat responde no piloto

Embora a arquitetura comporte mais de um assistente especializado, recomenda-se que o piloto inicial concentre resposta automatizada principalmente em **atendimento publico** e **secretaria escolar**, com possibilidade de roteamento controlado para outros dominios quando a rede optar por isso.

| Frente ou assistente | Temas cobertos no piloto |
|---|---|
| Assistente Publico | horarios e canais de atendimento, calendario escolar, eventos oficiais, orientacoes gerais, triagem inicial e encaminhamento por tema |
| Assistente da Secretaria | matricula, rematricula, transferencia, documentos, declaracoes, protocolos, cadastros, requerimentos e orientacoes administrativas recorrentes |
| Assistente da Tesouraria | pagamentos, liquidacoes, repasses, execucao financeira e orientacoes formais de tesouraria, se habilitado no escopo da rede |
| Assistente da Direcao | normas, posicionamentos institucionais, governanca e temas estrategicos ou sensiveis, preferencialmente em regime controlado |

Para a rodada inicial de piloto, recomenda-se que tesouraria e direcao aparecam como frentes secundarias ou de expansao controlada, e nao como nucleo principal de atendimento autonomo.

### 3.9 Documentos e bases utilizados pelo chat

O chat nao deve operar como modelo generico desconectado de fonte. Ele utiliza estruturas documentais e registros institucionais presentes na arquitetura do projeto.

| Base ou documento | Papel no funcionamento do chat |
|---|---|
| `source_documents` | Cadastro dos documentos-fonte institucionais utilizados pela plataforma |
| `knowledge_source_versions` | Versionamento das fontes, permitindo rastreabilidade do que sustentou a resposta |
| Base de conhecimento institucional | Perguntas, respostas, categorias e trechos recuperados para compor a resposta |
| `official_content_records` | Conteudo oficial estruturado por modulo e escopo |
| Modulos `calendar`, `enrollment`, `faq` e `notices` | Estrutura inicial de conteudo oficial para calendario, matricula, perguntas frequentes e avisos |
| `interaction_source_evidence` | Registro das evidencias efetivamente usadas em cada resposta |

Em termos operacionais, isso significa que o piloto deve priorizar uso de:

- normativas e orientacoes institucionais da rede
- comunicados oficiais e documentos administrativos versionados
- conteudo oficial publicado nos modulos de calendario, matricula, FAQ e avisos
- bases curadas pela secretaria e pela equipe de conteudo

### 3.10 Perfis de usuario atendidos no piloto

O sistema atende perfis distintos, que devem ser separados entre quem **consulta o chat** e quem **opera ou supervisiona o piloto**.

| Grupo de perfil | Papel no piloto |
|---|---|
| Familias, estudantes e comunidade escolar | Usuarios externos do atendimento informacional |
| Secretaria escolar | Uso direto para consulta, validacao operacional e eventual encerramento de conversa |
| `public_operator` | Operacao de atendimento com acesso operacional, sem detalhes profundos de governanca |
| `secretariat` e `coordination` | Perfis internos de uso cotidiano, com capacidade operacional e menor acesso a detalhes sensiveis |
| `direction` e `auditor` | Perfis internos especializados, com acesso ampliado a conteudos da respectiva area ou de governanca |
| `content_curator` e `auditor` | Supervisao de qualidade, evidencia, feedback e incidentes |
| `network_manager` e `superadmin` | Gestao ampla do piloto, incluindo governanca, configuracao e acompanhamento executivo |

### 3.11 Como funciona o fallback para humano

O fallback para humano, no estado atual do sistema, deve ser descrito com precisao: ele existe como **encaminhamento e supervisao posterior**, e nao como transferencia imediata para um atendente no mesmo fluxo de chat.

| Situacao | Comportamento esperado do sistema |
|---|---|
| Base institucional insuficiente | O sistema se abstem ou responde de forma limitada e recomenda revisao humana |
| Evidencia parcial ou risco medio | O sistema pode responder com cautela, marcando `review_required` e `fallback_to_human` |
| Erro percebido por operador ou governanca | Pode ser registrado feedback ou incidente vinculado a resposta |
| Necessidade de tratamento institucional | Perfis autorizados analisam a conversa, promovem revisao posterior e podem encerrar manualmente o caso |
| Pedido de falar com humano | O chat informa que o canal opera com assistentes institucionais e segue com triagem automatizada |

Assim, o fallback humano no piloto deve ser entendido como fluxo de **revisao, incidente, curadoria e encerramento institucional**, e nao como handoff sincrono nativo do webchat.

---

## 4. Numero de Usuarios do Piloto

### 4.1 Coorte institucional recomendada

Para preservar controle operacional e viabilidade de acompanhamento, recomenda-se iniciar o piloto com uma coorte reduzida, porem suficiente para gerar diversidade de comportamento e volume observavel.

| Grupo de usuarios | Quantidade sugerida | Funcao no piloto |
|---|---|---|
| Gestor institucional do piloto | 1 a 2 | Patrocinio, decisao e acompanhamento executivo |
| Equipe de secretaria escolar | 3 a 9 | Uso direto do sistema e validacao operacional |
| Curadoria de conteudo e fontes | 1 a 3 | Organizacao de base oficial e tratamento de ajustes |
| TI ou suporte de implantacao | 1 a 2 | Configuracao, suporte e estabilidade operacional |
| Auditoria, controle ou comite de acompanhamento | 1 a 3 | Supervisao de conformidade, riscos e incidentes |

### 4.2 Faixa total recomendada

Com base na tabela acima, o piloto pode ser conduzido com **7 a 19 usuarios internos credenciados**, a depender do numero de escolas participantes e da estrutura da rede. Essa faixa e suficiente para validar perfis distintos, sem transformar o piloto em implantacao ampla prematura.

### 4.3 Usuarios externos atendidos

No caso do atendimento publico, o volume de usuarios externos nao precisa ser rigidamente predefinido por cadastro, mas recomenda-se estabelecer uma meta operacional de observacao. Para fins de avaliacao, sugere-se considerar uma das seguintes referencias:

- **150 a 500 usuarios externos unicos atendidos**, quando houver mensuracao por identificador de sessao ou canal
- **300 a 1.200 consultas registradas**, quando a mensuracao mais confiavel estiver centrada em interacoes e nao em pessoas unicas

A escolha entre usuarios unicos e consultas totais deve considerar a qualidade dos registros disponiveis no ambiente piloto. Em ambos os casos, o importante e que o volume seja suficiente para produzir amostra minima de comportamento real, feedback, revisoes e eventos de auditoria.

### 4.4 Criterio de suficiencia amostral para o piloto

Considera-se que o piloto atinge massa critica minima de avaliacao quando reunir, ao final da operacao assistida:

- uso ativo por ao menos dois perfis internos distintos
- volume recorrente de consultas ao longo de varias semanas
- ocorrencia observavel de feedbacks, revisoes e ajustes
- dados suficientes para comparacao com linha de base anterior

---

### 4.5 Quem vai testar efetivamente

Para fins de teste estruturado, recomenda-se distinguir entre **usuarios do piloto** e **testadores do piloto**. Nem todo usuario atendido pela ferramenta atuara como avaliador formal, mas o plano deve prever grupos claramente responsaveis pela validacao.

| Grupo testador | Papel no teste |
|---|---|
| Secretaria escolar | Teste de aderencia a processos reais e validacao de respostas operacionais |
| Operadores de atendimento | Teste de usabilidade, qualidade da triagem e comportamento do chat na rotina |
| Curadoria institucional | Validacao de fonte, cobertura documental e necessidade de ajuste de base |
| Auditoria ou governanca | Verificacao de rastreabilidade, incidentes, revisao requerida e conformidade |
| Gestao da rede ou comite do piloto | Acompanhamento executivo, deliberacao sobre ajustes e decisao de continuidade |
| Usuarios externos convidados | Participacao controlada em cenarios reais ou simulados de atendimento |

---

## 5. Duracao do Piloto

### 5.1 Duracao total recomendada

Recomenda-se duracao total de **13 semanas**, distribuidas em quatro fases complementares. Esse arranjo oferece tempo adequado para preparacao, entrada controlada em operacao, coleta consistente de evidencia e consolidacao dos resultados.

### 5.2 Estruturacao por fases

| Fase | Periodo sugerido | Objetivo principal | Resultado esperado |
|---|---|---|---|
| 1. Preparacao institucional | Semanas 1 a 3 | Definir escopo, perfis, fontes, regras de uso e governanca | Protocolo do piloto validado |
| 2. Implantacao tecnica controlada | Semanas 4 a 5 | Configurar ambiente, publicar base inicial e validar acessos | Ambiente operacional apto para uso real |
| 3. Operacao assistida | Semanas 6 a 11 | Executar o atendimento com monitoramento proximo e coleta de evidencias | Base empirica do piloto consolidada |
| 4. Avaliacao e consolidacao | Semanas 12 a 13 | Comparar indicadores, registrar aprendizados e decidir proxima etapa | Relatorio final e recomendacao institucional |

### 5.3 Linha do tempo sintetica

```text
Semanas: 01 02 03 04 05 06 07 08 09 10 11 12 13

Preparacao institucional  [=====]
Implantacao tecnica             [===]
Operacao assistida                  [==========]
Avaliacao final                                   [====]
```

### 5.4 Duracao minima aceitavel

Caso haja restricao institucional de calendario, pode-se operar uma versao reduzida do piloto em **10 semanas**, desde que sejam preservados:

- ao menos 2 semanas de preparacao
- ao menos 4 semanas de operacao assistida
- ao menos 1 semana dedicada a avaliacao formal

Ainda assim, a configuracao de 13 semanas permanece a mais recomendada para permitir observacao consistente de comportamento, calibracao de conteudo e comparacao minimamente confiavel com a linha de base anterior.

---

## 6. Metodologia de Teste

### 6.1 Abordagem geral

O piloto deve ser conduzido como teste operacional controlado, com coleta continua de evidencias quantitativas e qualitativas. Nao se trata apenas de verificar se a aplicacao funciona tecnicamente, mas de medir se ela gera valor institucional sob supervisao, com limites de uso adequados e comportamento observavel diante de incerteza ou risco.

### 6.2 Linha de base anterior

Antes do inicio da operacao assistida, recomenda-se registrar uma linha de base contendo, no minimo:

- volume medio de atendimentos no periodo equivalente anterior
- tempo medio de resposta manual
- principais canais utilizados
- temas mais recorrentes
- nivel atual de padronizacao e rastreabilidade das respostas

Sem linha de base, o piloto tende a medir apenas adocao ou volume de uso, e nao impacto real.

### 6.3 Instrumentos de coleta

A avaliacao deve combinar as seguintes fontes:

- logs de interacao e trilhas de auditoria
- registros de evidencia por resposta
- feedback de usuarios e operadores
- incidentes e correcoes abertas durante a operacao
- relatorios sinteticos por periodo e por assistente
- reunioes curtas de acompanhamento com a equipe institucional

---

### 6.4 Ambiente de teste

O piloto deve ocorrer em **ambiente real e controlado**, com acesso restrito a uma rede ou secretaria parceira e escopo limitado a 1 a 3 escolas. Recomenda-se que a operacao observe, no minimo, as seguintes condicoes de ambiente:

- publicacao da interface no ambiente institucional ja previsto pela arquitetura
- configuracao dedicada do piloto para escola, perfis e fontes autorizadas
- credenciais, acessos e parametros monitorados pela equipe tecnica
- segregacao logica do escopo piloto em relacao a outras unidades ou bases nao participantes
- possibilidade de suspensao rapida do atendimento automatizado, caso haja incidente relevante

Na ausencia de um ambiente tecnico totalmente segregado adicional, o piloto deve ser tratado como **producao restrita e supervisionada**, e nao como liberacao ampla.

### 6.4.1 URLs operacionais para execucao e acompanhamento do teste

Para que o teste seja reproduzivel e acompanhavel, recomenda-se explicitar no plano as URLs a serem utilizadas durante a operacao do piloto.

| Finalidade | URL de referencia | Observacao operacional |
|---|---|---|
| Conversa de teste com a IA | `https://SEU-DOMINIO/simulador-chat` | Interface de webchat para simular o usuario conversando com a IA |
| Acompanhamento humano do atendimento | `https://SEU-DOMINIO/atendimento` | Tela do `chat-manager` para monitorar conversas, trilhas, feedbacks, incidentes e encerramento |
| Monitoramento por rota interna estendida | `https://SEU-DOMINIO/dist/chat-manager.html` | Equivalente tecnico da tela de acompanhamento, quando necessario |

Na implementacao atual observada no repositorio, o fluxo recomendado de teste e o seguinte:

1. abrir o simulador em `/simulador-chat` para iniciar conversa como usuario de teste;
2. enviar perguntas de referencia e cenarios previstos no plano;
3. manter um operador autorizado acompanhando a interacao em `/atendimento`;
4. registrar feedback, incidente, revisao ou encerramento diretamente no `chat-manager`, quando cabivel.

Como o dominio de implantacao pode variar entre homologacao, piloto e ambiente institucional definitivo, recomenda-se que o documento final substitua `SEU-DOMINIO` pelo endereco efetivamente pactuado para o sandbox.

### 6.5 Perguntas e cenarios de teste

O plano deve prever combinacao entre perguntas reais e cenarios estruturados previamente definidos. Recomenda-se, no minimo, trabalhar com os seguintes grupos de cenarios:

| Grupo de cenario | Exemplos de perguntas ou casos |
|---|---|
| Atendimento publico recorrente | "Quais documentos preciso para matricula?", "Qual o horario de atendimento da secretaria?", "Quando comeca o periodo letivo?" |
| Secretaria escolar | "Como emitir declaracao?", "Qual o fluxo de transferencia?", "Onde localizar orientacao institucional sobre rematricula?" |
| Conteudo parcialmente coberto | Perguntas sobre tema com documento incompleto, desatualizado ou pouco especifico |
| Fora de escopo | Consulta juridica individual, decisao sobre caso concreto, tema disciplinar sensivel |
| Solicitacao de humano | "Quero falar com uma pessoa", "Me transfere para o atendimento humano" |
| Correcao e incidente | Resposta contestada por operador, abertura de feedback `incorrect` ou incidente |

Recomenda-se manter uma bateria inicial de **20 a 40 perguntas de referencia**, organizadas por criticidade e por area, para comparacao entre comportamento esperado e comportamento observado.

### 6.6 Como simular usuarios

A simulacao de usuarios deve combinar uso real e ensaios controlados. Recomenda-se adotar tres camadas complementares:

1. **Cenarios roteirizados internos**: equipe do projeto e da secretaria executa perguntas previamente definidas para validar comportamento esperado.
2. **Usuarios internos em rotina real**: operadores e secretaria usam a ferramenta em demandas do dia a dia, com observacao supervisionada.
3. **Usuarios externos convidados ou amostra controlada de atendimento real**: familias ou comunidade utilizam o canal em janela delimitada, com monitoramento reforcado.

Para fins metodologicos, cada pergunta simulada deve ser classificada, sempre que possivel, segundo:

- tema
- nivel de criticidade
- resultado esperado
- comportamento observado
- necessidade ou nao de revisao humana

### 6.7 Quando havera revisao humana

A revisao humana deve ocorrer de forma obrigatoria nas seguintes hipoteses:

- toda resposta marcada com `review_required`
- toda resposta com `fallback_to_human`
- toda interacao sem base suficiente ou com abstencao automatica
- todo feedback classificado como `incorrect`
- todo incidente aberto durante o periodo de teste
- toda consulta enquadrada como sensivel, fora de escopo ou com potencial impacto institucional relevante

Adicionalmente, recomenda-se revisao por amostragem de parte das respostas classificadas como de baixo risco, para aferir se o sistema nao esta deixando de sinalizar casos que deveriam ter sido revistos.

### 6.8 Procedimentos operacionais do teste

Durante a operacao assistida, recomenda-se observar o seguinte fluxo operacional padrao:

1. Preparar o ambiente, as fontes e os perfis autorizados.
2. Executar bateria inicial de cenarios roteirizados antes da abertura ampliada.
3. Liberar uso controlado por grupos previstos no piloto.
4. Monitorar diariamente logs, evidencias, feedbacks, incidentes e respostas com revisao requerida.
5. Registrar ajustes de conteudo, curadoria e configuracao sem perder rastreabilidade das alteracoes.
6. Consolidar achados em checkpoints semanais e quinzenais.
7. Produzir relatorio final com recomendacao de continuidade, revisao ou interrupcao.

### 6.9 Gestao de dados do teste

A gestao de dados do piloto deve observar os principios de minimizacao, necessidade e rastreabilidade. Para o plano de testes, recomenda-se explicitar que:

- somente dados necessarios ao atendimento e a avaliacao do piloto devem ser tratados
- interacoes, evidencias, feedbacks e incidentes devem ser registrados para fins de auditoria e aprendizagem institucional
- acessos a detalhes de governanca devem permanecer restritos por perfil
- relatorios de avaliacao devem priorizar consolidacao estatistica e anonimizada sempre que possivel
- qualquer uso de dados do piloto para apresentacao externa deve respeitar a governanca LGPD definida nos documentos especificos do projeto

### 6.10 Gestao de riscos do teste

A execucao do piloto deve operar com monitoramento ativo de risco, e nao apenas com avaliacao posterior. Recomenda-se acompanhar, ao menos, os seguintes sinais:

| Risco de teste | Sinal de monitoramento | Resposta recomendada |
|---|---|---|
| Resposta incorreta com impacto relevante | feedback `incorrect`, incidente ou contestacao recorrente | revisao imediata e ajuste de base ou escopo |
| Alta taxa de abstencao ou revisao | crescimento anormal de `review_required` ou `fallback_to_human` | revisar cobertura documental e parametrizacao |
| Desatualizacao de conteudo | recorrencia de temas sem fonte adequada | reforcar curadoria e publicacao de versoes |
| Uso fora do escopo autorizado | consultas sensiveis ou conclusivas respondidas indevidamente | bloquear o tema e revisar regras do piloto |
| Falha de interpretacao pelo usuario | aumento de pedidos de humano ou queixas sobre limites do canal | reforcar comunicacao de escopo e mensagens orientativas |

### 6.11 Comunicacao e reporte do teste

O plano deve prever comunicacao estruturada ao longo de toda a execucao do piloto. Recomenda-se o seguinte arranjo:

- comunicacao inicial de abertura do piloto aos perfis participantes
- sintese semanal tecnico-operacional para equipe de execucao
- sintese quinzenal de governanca para comite, curadoria e auditoria
- reporte imediato em caso de incidente relevante ou necessidade de suspensao parcial
- relatorio final consolidado com recomendacao de continuidade, ajuste ou encerramento

---

## 7. Metricas Avaliadas

As metricas do piloto devem ser organizadas em quatro eixos: eficiencia operacional, qualidade e confianca, governanca e impacto institucional. Recomenda-se leitura conjunta dos indicadores, evitando interpretacao isolada de uma unica metrica.

### 7.1 Metricas operacionais

| Metrica | Descricao | Fonte sugerida | Periodicidade |
|---|---|---|---|
| Total de consultas recebidas | Volume total de interacoes registradas no periodo | Logs de atendimento | Semanal |
| Percentual de consultas resolvidas | Relacao entre consultas encerradas com resposta util e total recebido | Eventos de atendimento e feedback | Semanal |
| Tempo medio ate a primeira resposta | Tempo entre abertura da interacao e primeira resposta entregue | Logs de sessao e mensagem | Semanal |
| Tempo medio de resolucao | Tempo entre abertura e encerramento ou estabilizacao do atendimento | Logs e status operacionais | Quinzenal |
| Distribuicao por tema e por assistente | Concentracao do uso por dominio e por tipo de demanda | Relatorios analiticos | Quinzenal |

### 7.2 Metricas de qualidade e confianca

| Metrica | Descricao | Fonte sugerida | Periodicidade |
|---|---|---|---|
| Percentual de respostas com fonte principal registrada | Mede rastreabilidade documental da resposta | Evidencias persistidas | Semanal |
| Score medio de confianca | Indicador operacional de seguranca informacional da resposta | Envelope de auditoria da resposta | Semanal |
| Score medio de evidencia | Grau medio de sustentacao documental observado | Registros de evidence score | Semanal |
| Percentual de respostas com revisao requerida | Mede volume de casos em que o sistema sinalizou necessidade de supervisao | Trilhas de revisao | Semanal |
| Percentual de fallback humano recomendado | Mede uso apropriado do encaminhamento humano em casos sensiveis ou incertos | Eventos de atendimento | Semanal |
| Distribuicao do feedback util, nao util e incorreto | Mede percepcao pratica de qualidade pelo usuario ou operador | Registro de feedback | Quinzenal |

### 7.3 Metricas de governanca e conformidade

| Metrica | Descricao | Fonte sugerida | Periodicidade |
|---|---|---|---|
| Numero de eventos formais de auditoria | Quantidade de registros formais produzidos pelo sistema | Tabela ou modulo de auditoria | Semanal |
| Taxa de rastreabilidade completa | Percentual de interacoes com vinculo a fonte, contexto e evento correspondente | Auditoria e evidencia | Quinzenal |
| Numero de incidentes abertos | Casos reportados por erro relevante, conteudo inadequado ou necessidade de correcao | Registro de incidentes | Semanal |
| Tempo medio de resolucao de incidentes | Tempo entre abertura, tratamento e encerramento do incidente | Gestao de incidentes | Quinzenal |
| Percentual de respostas corrigidas apos revisao | Mede capacidade de detectar e ajustar resposta inadequada | Auditoria e feedback | Quinzenal |

### 7.4 Metricas de impacto institucional e valor publico

| Metrica | Descricao | Fonte sugerida | Periodicidade |
|---|---|---|---|
| Reducao de demandas repetitivas para a equipe | Variacao percebida ou medida no volume de atendimentos manuais recorrentes | Linha de base e relatorio operacional | Mensal |
| Satisfacao de usuarios e operadores | Avaliacao sintetica sobre utilidade, clareza e confianca do atendimento | Survey curto ou feedback estruturado | Quinzenal |
| Melhoria do acesso a informacao oficial | Percepcao de facilidade para localizar orientacoes corretas | Entrevistas curtas e feedback | Mensal |
| Identificacao de lacunas documentais | Numero de temas recorrentes sem base suficientemente clara | Curadoria e auditoria | Quinzenal |
| Capacidade de gerar inteligencia de gestao | Uso dos dados do piloto para orientar ajustes de comunicacao e processos | Relatorio executivo do piloto | Final |

### 7.5 Quadro-resumo das metricas

| Eixo | Pergunta de avaliacao |
|---|---|
| Eficiencia operacional | O sistema acelera o atendimento e organiza melhor a demanda? |
| Qualidade e confianca | As respostas permanecem ancoradas em fonte e sinalizam incerteza quando necessario? |
| Governanca | O uso da IA fica auditavel, revisavel e tratavel em caso de erro ou incidente? |
| Impacto institucional | O piloto melhora acesso a informacao e reduz retrabalho da rede? |

---

## 8. Criterios de Sucesso do Piloto

Para fins de decisao institucional, recomenda-se considerar o piloto como satisfatorio quando houver convergencia razoavel dos seguintes sinais:

- adesao ativa das equipes internas previstas no escopo
- volume de uso suficiente para observacao estatistica minima
- predominancia de respostas com fonte registrada e trilha de auditoria consistente
- ocorrencia controlada de incidentes, com capacidade de tratamento e aprendizado
- percepcao positiva de utilidade por parte de usuarios e operadores
- evidencia de reducao de retrabalho ou ganho de velocidade em temas recorrentes

Nao se recomenda adotar como criterio isolado a simples reducao do percentual de revisao requerida. Em contexto de governanca algoritmica, parte relevante da qualidade do sistema esta justamente em reconhecer incerteza, acionar revisao e limitar resposta quando a base for insuficiente.

---

### 8.1 Criterios objetivos de sucesso recomendados

Para reduzir subjetividade na decisao institucional, recomenda-se considerar o piloto bem-sucedido quando houver, de forma combinada:

- adesao efetiva dos grupos testadores previstos
- estabilidade operacional suficiente para manter o atendimento durante a janela do piloto
- rastreabilidade documental predominante nas respostas observadas
- tratamento tempestivo de incidentes e respostas contestadas
- evidencia de utilidade percebida por usuarios internos e externos
- indicios concretos de reducao de retrabalho ou ganho de velocidade nos temas recorrentes

Como referencia de decisao, a instituicao pode adotar metas internas como:

- maioria das respostas com fonte principal registrada
- resolucao ou tratamento de incidentes abertos dentro da janela do piloto
- revisao humana realizada em 100% dos casos obrigatorios
- inexistencia de incidente critico nao tratado ao final da operacao assistida

### 8.2 Criterios de interrupcao, suspensao ou recalibracao

O plano deve prever que o teste pode ser interrompido total ou parcialmente quando houver:

- incidente critico envolvendo informacao sensivel, menores ou potencial dano institucional relevante
- sequencia de erros materiais em tema de alta criticidade sem capacidade imediata de contencao
- falha persistente de rastreabilidade, evidencia ou registro de auditoria
- uso fora do escopo acordado com risco regulatorio ou operacional elevado
- indisponibilidade tecnica prolongada que inviabilize coleta confiavel de evidencias
- incapacidade da equipe humana de revisar os casos obrigatorios dentro do ritmo necessario

Nessas situacoes, a resposta institucional recomendada pode assumir uma das seguintes formas:

- suspensao de um tema especifico
- retorno temporario ao atendimento exclusivamente humano em determinada frente
- reducao do universo de usuarios do piloto
- recalibracao de fontes, regras e mensagens antes da retomada
- encerramento antecipado do teste com relatorio de achados

---
## 9. Governanca de Execucao do Teste

### 9.1 Responsabilidades minimas

| Papel | Responsabilidade principal |
|---|---|
| Gestor do piloto | Validar escopo, acompanhar resultados e decidir encaminhamentos |
| Curadoria institucional | Garantir qualidade e atualizacao das fontes priorizadas |
| Equipe tecnica | Sustentar operacao, acessos, logs e estabilidade |
| Secretaria escolar | Validar aderencia do uso aos processos reais |
| Acompanhamento de auditoria ou conformidade | Observar riscos, incidentes e integridade da rastreabilidade |

### 9.2 Ritmo sugerido de acompanhamento

Recomenda-se o seguinte arranjo de acompanhamento:

- checkpoint semanal tecnico-operacional
- checkpoint quinzenal de governanca e qualidade
- consolidado executivo ao final da operacao assistida
- reuniao final de decisao institucional nas semanas 12 ou 13

---

### 9.3 Participacao e comunicacao entre os atores do teste

Para que o plano tenha carater de sandbox regulatorio e operacional, a participacao dos atores nao deve ser apenas simbolica. Recomenda-se explicitar o seguinte circuito de comunicacao:

- operadores e secretaria reportam comportamento observado, erros e duvidas de uso
- curadoria consolida lacunas documentais e prioriza ajuste de fontes
- auditoria acompanha incidentes, revisao requerida e aderencia ao escopo
- equipe tecnica monitora estabilidade, acessos e integridade dos registros
- gestor do piloto recebe sintese consolidada para deliberacao sobre continuidade ou ajuste

---
## 10. Entregaveis Esperados ao Final do Piloto

Ao final do ciclo, recomenda-se que o piloto gere, no minimo, os seguintes entregaveis:

- relatorio consolidado de metricas do periodo
- sintese comparativa com a linha de base anterior
- registro de incidentes, ajustes e aprendizados
- avaliacao institucional sobre continuidade, revisao ou escala
- plano de melhorias para a rodada seguinte

---

## 11. Conclusao

O Plano de Teste do Piloto deve ser compreendido como instrumento de validacao responsavel da solucao, e nao apenas como agenda de implantacao. Ao delimitar cenario de uso, numero de usuarios, duracao por fases e metricas avaliadas, o documento cria as condicoes para que o teste produza evidencia institucional robusta, comparavel e util para tomada de decisao.

No contexto deste projeto, o desenho recomendado e de piloto controlado, com **1 rede ou secretaria parceira**, **1 a 3 escolas**, **7 a 19 usuarios internos credenciados**, operacao assistida em frentes de **atendimento publico** e **secretaria escolar**, e duracao preferencial de **13 semanas**. A avaliacao deve combinar eficiencia, qualidade, governanca e valor publico, reconhecendo que o sucesso do piloto nao depende de automacao irrestrita, mas de uso responsavel, rastreavel e institucionalmente aderente.

Dessa forma, o presente plano oferece base tecnica suficiente para pactuacao do piloto, demonstracao institucional e composicao de conjunto documental mais amplo do projeto.











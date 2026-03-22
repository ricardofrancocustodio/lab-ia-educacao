# BLOCO 2 - DOCUMENTACAO DE GOVERNANCA

# Politica de Uso Responsavel da IA
## Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica

| Campo | Conteudo |
|---|---|
| Tipo de documento | Politica institucional de uso responsavel da IA |
| Finalidade | Estabelecer limites de atuacao, regras de supervisao humana e procedimentos de tratamento de erro e correcao |
| Escopo | Uso da IA no atendimento escolar, apoio informacional e fluxos de governanca associados |
| Vinculacao | Complementar ao RIA, a DPIA/LGPD, ao Model Card, a arquitetura tecnica e ao plano de teste do piloto |
| Publico-alvo | Gestao da rede, operadores, secretaria escolar, curadoria, auditoria, equipe tecnica e parceiros institucionais |
| Status sugerido | Documento-base de governanca para piloto e operacao controlada |

---

## 1. Apresentacao

A presente Politica de Uso Responsavel da IA estabelece as regras institucionais para utilizacao da solucao **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** em contexto de rede publica de educacao. Seu objetivo e assegurar que o uso de inteligencia artificial ocorra de forma controlada, auditavel e compativel com os limites administrativos, informacionais e eticos do projeto.

A plataforma foi concebida para apoiar atendimento e organizacao do conhecimento institucional, e nao para substituir decisao humana formal. Por essa razao, a politica parte de um principio central: a IA pode apoiar a administracao no fornecimento de informacoes recorrentes e na triagem de demandas, mas continua submetida a regras de escopo, rastreabilidade, revisao e correcao.

Este documento consolida quatro dimensoes centrais do uso responsavel:

- limites de atuacao da IA no atendimento escolar
- modelo de supervisao humana aplicavel ao sistema
- procedimento para reporte de erro, impropriedade ou incidente
- procedimento para correcao de respostas e melhoria da base

---

## 2. Principios Orientadores

O uso da IA no projeto deve observar, de forma cumulativa, os seguintes principios:

1. **Finalidade institucional**: a IA deve ser utilizada para apoiar objetivos legitimos de atendimento, organizacao e acesso a informacao oficial.
2. **Base informacional rastreavel**: respostas devem, sempre que possivel, apoiar-se em fonte institucional identificavel e versionada.
3. **Nao substituicao do ato administrativo**: a resposta automatizada nao equivale, por si so, a decisao administrativa final.
4. **Supervisao humana obrigatoria por governanca**: o uso da IA deve permanecer sujeito a revisao, feedback, incidente e encerramento institucional.
5. **Resposta conservadora diante da incerteza**: quando nao houver base suficiente, a conduta preferencial deve ser a abstencao, o alerta ou o encaminhamento humano.
6. **Aprendizado responsavel**: erros, lacunas documentais e incidentes devem alimentar correcao da base e aperfeicoamento do sistema.

---

## 3. Limites de Atuacao da IA

### 3.1 Atuacoes admitidas

A IA pode ser utilizada, prioritariamente, para atividades de apoio informacional e operacional, tais como:

- atendimento informacional recorrente a familias, estudantes e comunidade escolar
- triagem inicial de consultas e encaminhamento por tema
- apoio a secretaria escolar na localizacao de orientacoes e procedimentos
- apresentacao de informacoes presentes em base institucional validada
- apoio a organizacao de conhecimento institucional com foco em consulta e rastreabilidade

### 3.2 Atuacoes que exigem restricao ou validacao adicional

A IA nao deve operar de forma autonoma, sem validacao humana especifica, em materias que envolvam:

- decisao sobre matricula, vaga ou direito subjetivo individual
- interpretacao juridica individualizada ou orientacao legal conclusiva
- interpretacao normativa controversa sem confirmacao institucional
- casos disciplinares, conflitos sensiveis ou incidentes envolvendo menores
- sancoes, bloqueios, indeferimentos ou qualquer medida administrativa final
- tratamento de situacoes em que nao exista fonte institucional suficiente e atualizada

### 3.3 Limites operacionais atualmente vigentes

Com base na arquitetura atualmente implementada, devem ser explicitados os seguintes limites operacionais do canal:

- o atendimento opera por texto, e nao por audio
- nao ha transferencia para humano no mesmo fluxo sincrono da resposta
- pedidos de falar com humano nao convertem o canal em atendimento humano em tempo real
- a supervisao humana ocorre predominantemente de forma posterior e governada

### 3.4 Consequencias institucionais desses limites

Todos os usuarios e operadores devem ser informados de que:

- o canal de IA nao substitui os canais formais da administracao escolar
- a resposta automatizada possui natureza informacional e orientativa
- temas sensiveis podem requerer confirmacao posterior por setor competente
- a ausencia de resposta conclusiva pode representar medida de seguranca, e nao falha operacional simples

---

## 4. Supervisao Humana

### 4.1 Modelo adotado

No estado atual do sistema, a supervisao humana ocorre de forma **posterior e governada**, e nao como coparticipacao humana em tempo real na geracao de cada resposta. Isso significa que a operacao institucional revisa, audita, sinaliza, corrige e encerra fluxos apos o registro da resposta automatizada, utilizando trilhas de auditoria, feedbacks, incidentes e controles por perfil.

Esse modelo e compativel com piloto controlado e atendimento de baixa a media criticidade, desde que o escopo seja delimitado e a supervisao posterior seja efetivamente exercida.

### 4.2 Formas de supervisao previstas

A supervisao humana da IA deve ocorrer por meio de:

- revisao de conversas e respostas registradas
- visualizacao de trilha de auditoria e evidencias
- registro de feedback quando a resposta exigir avaliacao de qualidade
- abertura de incidente quando houver erro relevante, risco ou inconformidade
- encerramento manual de conversas por perfis autorizados
- atualizacao de conteudo, fonte ou parametrizacao quando forem identificadas lacunas sistemicas

### 4.3 Perfis com capacidade ampliada de governanca

De acordo com o desenho atual do sistema, perfis como `superadmin`, `network_manager`, `auditor` e `content_curator` possuem maior capacidade de visualizar detalhes de evidencia e governanca, bem como registrar feedback e incidente. Ja perfis operacionais como `secretariat`, `coordination` e `public_operator` tendem a atuar com menor visibilidade de camadas internas de governanca.

Essa segregacao deve ser preservada para atender ao principio de menor privilegio, sem impedir que a operacao identifique situacoes que precisem ser escaladas a quem detem capacidade de tratamento.

### 4.4 Situacoes em que a supervisao humana e obrigatoria

A revisao ou intervencao humana deve ser obrigatoria quando houver, entre outros sinais:

- indicacao de `review_required`
- risco elevado de alucinacao ou ausencia de base confiavel
- feedback classificado como `incorrect`
- incidente aberto por operador, auditoria ou curadoria
- tema sensivel fora do escopo autonomo autorizado
- indicio de desatualizacao da base institucional

---

## 5. Como Reportar Erro

### 5.1 Conceito de erro para fins desta politica

Considera-se erro toda resposta automatizada que apresente, em maior ou menor grau, uma das seguintes situacoes:

- informacao incorreta ou incompleta de forma relevante
- ausencia de aderencia a fonte institucional valida
- formulacao ambigua que possa induzir interpretacao inadequada
- resposta fora do escopo autorizado para atuacao autonoma da IA
- falha de governanca, rastreabilidade ou classificacao de risco

### 5.2 Canais de reporte no fluxo atual

O sistema atualmente suporta dois mecanismos principais de registro formal vinculados a respostas:

1. **Feedback de interacao**
2. **Registro de incidente**

O feedback deve ser utilizado quando a necessidade principal for qualificar a avaliacao da resposta, inclusive por meio das classificacoes `helpful`, `not_helpful` e `incorrect`.

O incidente deve ser utilizado quando houver gravidade maior, risco institucional, necessidade de apuracao formal, potencial impacto sobre usuarios ou necessidade de tratamento de governanca mais estruturado.

### 5.3 Quando usar feedback

O registro de feedback e recomendado quando:

- a resposta foi parcialmente util, mas incompleta
- a resposta nao ajudou o usuario a resolver a demanda
- a resposta estava incorreta, mas sem sinal imediato de dano maior
- a equipe deseja produzir insumo para melhoria incremental da base e do comportamento do sistema

### 5.4 Quando abrir incidente

O registro de incidente e recomendado quando:

- a resposta apresenta erro material relevante
- ha risco de desinformacao institucional
- o conteudo pode gerar prejuizo operacional ou administrativo
- ha recorrencia do mesmo problema em mais de uma interacao
- o caso exige analise por curadoria, auditoria ou gestao
- o erro envolve tema sensivel, populacao vulneravel ou impacto reputacional

### 5.5 Procedimento de reporte recomendado

Ao identificar erro ou impropriedade, recomenda-se o seguinte fluxo:

1. Preservar a referencia da resposta questionada e da conversa correspondente.
2. Classificar preliminarmente o caso como feedback ou incidente.
3. Registrar comentario objetivo, descrevendo o problema identificado.
4. Encaminhar o caso para perfil com competencia de governanca, quando o operador nao possuir permissao de tratamento.
5. Acompanhar a resolucao ate o encerramento ou classificacao final do caso.

### 5.6 Conteudo minimo do reporte

Todo reporte deve buscar registrar, no minimo:

- identificacao da resposta afetada
- descricao objetiva do erro ou da inconformidade
- grau preliminar de severidade, quando aplicavel
- indicacao de qual informacao correta era esperada, se conhecida
- eventual referencia documental que sustente a contestacao

---

## 6. Como Corrigir Respostas

### 6.1 Diretriz geral

A correcao de respostas deve ser tratada como processo institucional de governanca da informacao. Isso significa que corrigir nao e apenas editar texto, mas verificar a causa do erro, registrar o tratamento realizado e reduzir a probabilidade de recorrencia.

### 6.2 Tipologias de correcao

As correcoes podem ocorrer, em linhas gerais, por quatro vias:

1. **Correcao documental**: ajuste ou publicacao de fonte institucional correta e atualizada.
2. **Correcao de curadoria**: reorganizacao da base de conhecimento, da categorizacao ou do conteudo oficial.
3. **Correcao de parametrizacao**: ajuste de prompts, thresholds, regras ou configuracoes de resposta.
4. **Correcao de governanca operacional**: redefinicao do que pode ou nao pode ser respondido automaticamente.

### 6.3 Fluxo recomendado de correcao

Quando uma resposta for considerada incorreta, recomenda-se observar o seguinte fluxo:

1. Confirmar o erro com base em fonte institucional, regra de negocio ou avaliacao competente.
2. Classificar a causa principal do problema: ausencia de fonte, fonte desatualizada, recuperacao inadequada, limite de escopo ou erro de formulacao.
3. Aplicar a medida corretiva adequada na base, no conteudo, na parametrizacao ou no escopo de uso.
4. Registrar o tratamento realizado na trilha institucional correspondente.
5. Reavaliar se o tema deve permanecer no escopo de resposta automatizada.
6. Monitorar recorrencia do problema em consultas futuras.

### 6.4 Correcao no estado atual da plataforma

No desenho atual, o sistema favorece correcao por **revisao posterior e atualizacao institucional da base**, e nao por substituicao humana imediata da resposta dentro do mesmo fluxo de chat. Isso decorre do fato de que o endpoint de resposta humana no canal esta desabilitado e a operacao de supervisao ocorre por auditoria, feedback, incidente, encerramento de conversa e aperfeicoamento das fontes.

Por essa razao, a politica deve assumir explicitamente que o principal meio de correcao, na fase atual do projeto, e:

- registrar o erro
- analisar o caso
- ajustar a base ou a governanca
- prevenir repeticao em respostas futuras

### 6.5 Registro da correcao

Sempre que houver correcao relevante, recomenda-se que o tratamento fique documentado em um ou mais dos seguintes elementos:

- evento formal de auditoria
- incidente com resolucao registrada
- nova versao de fonte ou conteudo oficial publicado
- associacao da resposta a marcadores de correcao, quando disponiveis no modelo de dados
- anotacao de responsavel e data da medida adotada

### 6.6 Comunicacao da correcao

Quando o erro tiver potencial de impacto direto sobre usuarios, a gestao institucional deve avaliar se a correcao exige comunicacao adicional, como:

- orientacao ativa a operadores da ponta
- atualizacao de comunicado, FAQ ou conteudo oficial
- contato com usuario ou grupo afetado, quando cabivel e proporcional
- reforco de limite de escopo para evitar reincidencia imediata

---

## 7. Responsabilidades Institucionais

| Papel | Responsabilidade principal |
|---|---|
| Gestao institucional | Aprovar escopo de uso, limites e encaminhamentos de maior impacto |
| Curadoria de conteudo | Manter fontes e conteudos oficiais consistentes e atualizados |
| Auditoria ou governanca | Monitorar feedbacks, incidentes, rastreabilidade e aderencia a politica |
| Equipe tecnica | Sustentar logs, acessos, estabilidade e trilhas necessarias ao monitoramento |
| Operacao de atendimento | Utilizar a IA dentro do escopo, observar limites e escalar erros identificados |

---

## 8. Disposicoes Operacionais Finais

1. A IA deve ser tratada como ferramenta de apoio institucional, e nao como instancia final de decisao.
2. A ausencia de base suficiente deve resultar, preferencialmente, em resposta conservadora, abstencao ou encaminhamento para revisao humana.
3. O monitoramento de feedbacks e incidentes faz parte da operacao regular do sistema e nao deve ser tratado como atividade eventual.
4. A evolucao do escopo de autonomia da IA depende de evidencia positiva acumulada, e nao apenas de conveniencia operacional.
5. Esta politica deve ser revista sempre que houver mudanca relevante de modelo, base de conhecimento, fluxo de supervisao ou contexto normativo.

---

## 9. Conclusao

A Politica de Uso Responsavel da IA do projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** reafirma que a utilidade institucional da plataforma depende menos da automacao irrestrita e mais da combinacao entre limites claros, supervisao humana efetiva, reporte tratavel de erros e correcao sistematica da base informacional.

No contexto atual do sistema, isso significa reconhecer explicitamente que a IA pode apoiar o atendimento e a secretaria em tarefas informacionais recorrentes, mas permanece sujeita a restricoes materiais, supervisao posterior e tratamento formal de falhas por feedback, incidente, auditoria e atualizacao de fontes. Esse arranjo e coerente com um piloto responsavel e com uma estrategia de escalabilidade baseada em confianca institucional, e nao em automacao cega.

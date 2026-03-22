# BLOCO 2 - DOCUMENTACAO DE GOVERNANCA

# Documento de Governanca da IA
## Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica

| Campo | Conteudo |
|---|---|
| Tipo de documento | Documento institucional de governanca da IA |
| Finalidade | Estabelecer regras de fontes, revisao, atualizacao, abstencao, encaminhamento humano, auditoria, versionamento e responsabilidades |
| Escopo | Uso da IA no atendimento escolar institucional, governanca da base e operacao controlada do piloto |
| Vinculacao | Complementar ao RIA, a Politica de Uso Responsavel da IA, a DPIA/LGPD, ao plano de teste e a matriz de riscos |
| Publico-alvo | Gestao da rede, curadoria, secretaria escolar, auditoria, equipe tecnica, juridico/controle e parceiros institucionais |
| Status sugerido | Documento-base de governanca para ambiente controlado, sandbox e piloto institucional |

---

## 1. Apresentacao

O presente Documento de Governanca da IA estabelece as regras institucionais para administracao da camada de inteligencia artificial utilizada no projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**. Seu objetivo e definir, de maneira operacional e auditavel, quais fontes podem sustentar respostas, como a base deve ser revista e atualizada, quando a IA deve se abster de responder, quando deve encaminhar para tratamento humano e como se organizam logs, auditoria, versionamento e responsabilidades.

No contexto de sandbox regulatorio e de piloto controlado, a governanca da IA nao pode ser tratada apenas como principio abstrato. Ela precisa ser traduzida em regras concretas, verificaveis e executaveis, capazes de demonstrar limites, salvaguardas e mecanismos de prestacao de contas. Este documento busca cumprir essa funcao, dialogando diretamente com a logica de ambiente controlado, supervisao humana e uso proporcional exigida em abordagens reguladas de inovacao publica.

---

## 2. Objetivos da Governanca da IA

A governanca da IA no projeto tem por objetivos principais:

1. Garantir que respostas automatizadas se apoiem em base institucional identificavel e versionada.
2. Definir limites claros para autonomia da IA no atendimento escolar.
3. Assegurar supervisao humana posterior, auditabilidade e rastreabilidade das respostas.
4. Organizar rotinas de revisao, curadoria e atualizacao da base.
5. Reduzir risco de alucinacao, desatualizacao, uso fora do escopo e tratamento inadequado de dados.
6. Permitir responsabilizacao institucional sobre conteudo, operacao e evolucao do sistema.

---

## 3. Fontes Documentais Permitidas

### 3.1 Principio geral

A IA deve responder, prioritariamente, com base em fontes documentais institucionais formalmente admitidas, identificaveis e preferencialmente versionadas. O sistema nao deve se apoiar em memoria informal, orientacoes verbais nao registradas, mensagens soltas de aplicativos ou interpretacoes sem base documental suficiente.

### 3.2 Fontes admitidas no desenho atual

Com base na arquitetura do repositorio, as fontes admitidas para sustentar respostas incluem:

| Tipo de fonte | Estrutura associada | Finalidade de uso |
|---|---|---|
| Documento-fonte institucional | `source_documents` | Cadastro de documentos oficiais utilizados pela plataforma |
| Versao publicada de documento | `knowledge_source_versions` | Base versionada que sustenta a recuperacao e a rastreabilidade |
| Conteudo oficial estruturado | `official_content_records` | Modulos oficiais de informacao institucional por rede ou escola |
| Base de conhecimento derivada | `knowledge_base` | Trechos recuperaveis para composicao da resposta |
| Evidencia persistida por resposta | `interaction_source_evidence` | Registro das fontes efetivamente usadas em cada resposta |

### 3.3 Escopo material das fontes permitidas

Em termos de governanca documental, recomenda-se admitir no piloto, prioritariamente:

- normativas e orientacoes internas formalizadas
- documentos administrativos validados pela rede ou escola
- comunicados oficiais publicados por area competente
- conteudos estruturados nos modulos de `calendar`, `enrollment`, `faq` e `notices`
- documentos institucionais com responsavel identificavel e historico de revisao minimo

### 3.4 Fontes que nao devem sustentar resposta autonoma

Nao se recomenda permitir resposta automatizada baseada apenas em:

- orientacoes verbais nao formalizadas
- mensagens de grupos informais sem consolidacao documental
- documentos sem autoria ou origem institucional clara
- normas superadas, revogadas ou sem verificacao de atualidade
- interpretacoes humanas nao registradas em fonte institucional

---

## 4. Politica de Revisao da Base

### 4.1 Principio de atualizacao continua

A qualidade da resposta da IA depende diretamente da qualidade e atualidade da base institucional. Por essa razao, a revisao da base deve ser tratada como rotina de governanca e nao como atividade eventual.

### 4.2 Periodicidade recomendada de revisao

Recomenda-se adotar a seguinte cadencia minima para o piloto:

| Tipo de revisao | Periodicidade sugerida | Finalidade |
|---|---|---|
| Revisao operacional rapida | Semanal | Identificar lacunas, temas recorrentes e necessidade de ajuste imediato |
| Revisao curatorial estruturada | Quinzenal | Verificar aderencia de fontes, modulos oficiais e cobertura dos temas do piloto |
| Revisao formal de consistencia da base | Mensal | Consolidar versoes, retirar materiais superados e validar criticidade dos temas |
| Revisao extraordinaria | Imediata quando necessario | Acionada por mudanca normativa, incidente, erro relevante ou atualizacao institucional urgente |

### 4.3 Temas que exigem revisao extraordinaria obrigatoria

Deve haver revisao extraordinaria sempre que houver:

- mudanca em regras de matricula, rematricula ou transferencia
- alteracao relevante de calendario, comunicados ou horarios oficiais
- incidente envolvendo resposta incorreta com potencial impacto institucional
- identificacao de documento desatualizado em tema recorrente do piloto
- aumento anormal de abstencao, `review_required` ou feedback `incorrect` em determinado assunto

---

## 5. Quem Pode Atualizar Documentos e Conteudos

### 5.1 Atualizacao de fontes documentais versionadas

Na configuracao atualmente observada no backend, a importacao de novas fontes e a publicacao de novas versoes de documentos em `knowledge_source_versions` esta restrita aos seguintes perfis:

- `superadmin`
- `network_manager`
- `content_curator`
- `direction`

Essa restricao e coerente com a necessidade de preservar controle sobre a base que alimenta respostas automatizadas.

### 5.2 Atualizacao de conteudo oficial estruturado

Para `official_content_records`, a governanca atual distingue leitura e edicao por escopo.

| Escopo de conteudo | Perfis com edicao recomendada/observada |
|---|---|
| Conteudo de rede (`network`) | `superadmin`, `network_manager`, `content_curator` |
| Conteudo de escola (`school`) | `superadmin`, `network_manager`, `content_curator`, `secretariat`, `direction`, `coordination` |

### 5.3 Diretriz de governanca para atualizacao

Mesmo quando o sistema tecnicamente permitir atualizacao por determinado perfil, recomenda-se que a politica institucional observe a seguinte regra:

- documentos-fonte estruturantes devem ser atualizados sob lideranca de curadoria ou gestao autorizada
- conteudo operacional de escola pode ser atualizado por perfis locais competentes, desde que haja rastreabilidade do responsavel
- nenhuma alteracao relevante deve ocorrer sem registro de data, responsavel e referencia documental correspondente

---

## 6. Quando a IA Deve se Abster de Responder

### 6.1 Principio de abstencao

A abstencao e medida de seguranca e governanca, e nao falha simples do sistema. A IA deve se abster de responder de forma conclusiva sempre que nao houver base institucional suficiente para produzir resposta rastreavel e segura.

### 6.2 Hipoteses de abstencao obrigatoria

A IA deve se abster de responder quando houver, entre outros casos:

- ausencia de documento-fonte identificavel e versionado
- evidencia abaixo do limiar minimo de seguranca
- tema sensivel fora do escopo autorizado do piloto
- potencial necessidade de decisao administrativa individual ou formal
- pedido que exija interpretacao juridica individualizada ou leitura normativa conclusiva sem validacao humana
- situacao em que a base existente esteja manifestamente incompleta, ambigua ou desatualizada

### 6.3 Regra tecnica observada no sistema

No comportamento atual da arquitetura, a resposta tende a ser contida quando a evidencia esta abaixo do threshold minimo, produzindo decisao do tipo `ABSTAIN_AND_REVIEW`, com marcacao de alto risco e recomendacao de revisao humana. Esse desenho deve ser preservado como salvaguarda central do piloto.

---

## 7. Quando a IA Deve Encaminhar para Humano

### 7.1 Encaminhamento humano como mecanismo de governanca

O encaminhamento humano, no estado atual do sistema, nao corresponde a transferencia sincrona no mesmo fluxo de chat. Trata-se de mecanismo de supervisao posterior, revisao, incidente, encerramento e tratamento institucional do caso.

### 7.2 Hipoteses de encaminhamento obrigatorio

A IA deve acionar encaminhamento humano quando houver:

- `review_required`
- `fallback_to_human`
- abstencao por insuficiencia de base
- resposta contestada por operador ou usuario com indicio de erro relevante
- consulta sensivel, fora do escopo ou com impacto potencial sobre direito individual
- mudanca institucional que ainda nao tenha sido refletida na base

### 7.3 Diretriz de tratamento posterior

Quando houver encaminhamento humano, recomenda-se que o fluxo institucional contemple:

1. registro da interacao e do motivo do encaminhamento;
2. verificacao por operador, secretaria, curadoria ou auditoria, conforme o caso;
3. correcao da base, do conteudo ou do escopo, se necessario;
4. encerramento ou tratamento formal do caso por perfis autorizados.

---

## 8. Logs, Auditoria e Rastreabilidade

### 8.1 Principio de auditabilidade

Toda resposta automatizada relevante no piloto deve ser potencialmente reconstruivel por meio de registros de fonte, evidencia, risco, feedback, incidente e contexto de resposta.

### 8.2 Estruturas de log e auditoria identificadas

A arquitetura atual registra governanca e rastreabilidade em estruturas como:

| Estrutura | Finalidade |
|---|---|
| `assistant_responses` | Persistencia da resposta emitida, confianca, modo e metadados associados |
| `formal_audit_events` | Registro formal de eventos de auditoria e governanca |
| `interaction_source_evidence` | Evidencias e fontes usadas para sustentar a resposta |
| `interaction_feedback` | Feedback estruturado sobre qualidade da resposta |
| `incident_reports` | Incidentes formais relacionados a respostas ou fluxos |
| `institutional_consultations` e `consultation_messages` | Contexto conversacional e historico da interacao |

### 8.3 Diretrizes institucionais para logs

Recomenda-se que a governanca observe que:

- logs e trilhas devem ser preservados durante todo o piloto
- detalhes de governanca sensivel devem ter acesso restrito por perfil
- feedback e incidente devem alimentar rotinas de melhoria e nao apenas arquivo historico
- a perda de rastreabilidade minima deve ser tratada como risco operacional relevante

---

## 9. Politica de Versionamento da Base e das Respostas

### 9.1 Versionamento da base documental

O sistema ja demonstra politica tecnica de versionamento de fontes, incluindo:

- incremento de `version_number`
- uso de `version_label`
- marcacao de versao corrente com `is_current`
- registro de `published_at`
- registro de `created_by`
- geracao de `checksum`
- substituicao da base derivada anterior para o mesmo documento-fonte

Esse desenho deve ser preservado como regra institucional minima para qualquer documento que sustente a IA.

### 9.2 Versionamento do conteudo oficial estruturado

No caso de `official_content_records`, recomenda-se tratar cada atualizacao relevante como alteracao governada, mantendo referencia a `source_document_id`, `source_version_id`, `updated_by` e `updated_at` sempre que possivel.

### 9.3 Versionamento e correcao de respostas

A plataforma apresenta trilhas de correcao em respostas por meio de campos e eventos como:

- `corrected_from_response_id`
- `corrected_at`
- `corrected_by`
- eventos formais de auditoria e incidentes relacionados

Isso significa que, no estado atual, a governanca das respostas opera mais por **rastreabilidade de correcao** do que por reescrita silenciosa. Essa caracteristica deve ser mantida, pois favorece accountability institucional.

### 9.4 Regra recomendada de versao institucional

Toda atualizacao relevante da base ou do conteudo oficial deve permitir responder, no minimo:

- o que mudou
- quando mudou
- quem mudou
- com base em qual documento ou decisao institucional mudou

---

## 10. Papeis e Responsabilidades

| Papel | Responsabilidade de governanca |
|---|---|
| Gestao institucional | definir escopo, aprovar limites e deliberar sobre ampliacao, suspensao ou ajuste do uso da IA |
| Curadoria de conteudo | organizar, revisar, publicar e atualizar fontes e conteudos oficiais |
| Secretaria escolar | validar aderencia do uso a rotinas reais e sinalizar lacunas documentais ou erros |
| Auditoria ou governanca | monitorar trilhas, incidentes, feedbacks, revisoes e conformidade com as regras |
| Equipe tecnica | sustentar logs, controles de acesso, integridade do ambiente e funcionamento das trilhas de auditoria |
| Operadores de atendimento | utilizar o sistema dentro do escopo definido e escalar casos inadequados |
| Responsavel LGPD ou instancia equivalente | acompanhar riscos de dados pessoais e aderencia aos limites de tratamento |
| Comite do piloto | consolidar leitura transversal de risco, desempenho e maturidade para decisao institucional |

---

## 11. Regras Minimas de Ambiente Controlado

Para que a governanca da IA seja compativel com ambiente controlado e sandbox, recomenda-se observar como requisitos minimos:

- uso apenas de fontes institucionais formalmente admitidas
- rotina formal de revisao da base durante todo o piloto
- segregacao clara de quem consulta, quem edita, quem audita e quem delibera
- abstencao obrigatoria em ausencia de base confiavel
- encaminhamento humano obrigatorio em temas sensiveis ou fora do escopo
- trilha de auditoria operante e acessivel a perfis autorizados
- versionamento rastreavel de documentos, conteudos e correcoes relevantes

---

## 12. Conclusao

O Documento de Governanca da IA consolida uma camada essencial de maturidade institucional do projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**. Ao explicitar fontes permitidas, regras de revisao, perfis de atualizacao, criterios de abstencao, encaminhamento humano, logs, auditoria, versionamento e responsabilidades, o documento demonstra que o uso da IA nao esta solto, nem apoiado em promessas genericas de boa intencao.

No contexto de piloto e sandbox, essa clareza e especialmente valiosa. Ela mostra que a solucao foi pensada para operar com limites, salvaguardas, supervisao posterior e memoria institucional verificavel. Isso a torna mais aderente a criterios de inovacao publica responsavel e mais facil de defender perante banca, comite de avaliacao ou instancia regulatoria.

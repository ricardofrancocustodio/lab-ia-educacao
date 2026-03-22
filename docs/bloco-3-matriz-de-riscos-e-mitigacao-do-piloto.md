# BLOCO 3 - DOCUMENTACAO TECNICA E DE EXECUCAO DO SANDBOX

# Matriz de Riscos e Mitigacao do Piloto
## Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica

| Campo | Conteudo |
|---|---|
| Tipo de documento | Matriz tecnico-operacional de riscos e mitigacao |
| Finalidade | Consolidar riscos do piloto, medidas de mitigacao, mecanismos de deteccao, responsaveis e gatilhos de interrupcao |
| Escopo | Execucao do piloto, uso da IA no atendimento escolar, governanca, dados e operacao do sandbox |
| Vinculacao | Complementar ao projeto principal, ao RIA, a DPIA/LGPD, a politica de uso responsavel e ao plano de teste do piloto |
| Publico-alvo | Gestao da rede, comite do piloto, auditoria, curadoria, equipe tecnica, secretaria escolar e parceiros institucionais |
| Status sugerido | Documento-base de gestao de riscos para sandbox e piloto controlado |

---

## 1. Apresentacao

A presente Matriz de Riscos e Mitigacao do Piloto foi elaborada para apoiar a execucao controlada da solucao **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica** em contexto de sandbox regulatorio e operacional. Seu objetivo e reunir, em formato pratico e auditavel, os principais riscos associados ao piloto, os mecanismos de prevencao e resposta, os sinais de deteccao, as responsabilidades institucionais e os criterios que podem justificar suspensao, recalibracao ou interrupcao do teste.

Embora os documentos tecnicos ja produzidos no projeto tratem de riscos sob perspectivas complementares, especialmente no RIA, na DPIA/LGPD e no Plano de Teste do Piloto, a experiencia de sandbox costuma exigir uma visao mais operacional e consolidada. Nessa perspectiva, a matriz funciona como instrumento de gestao viva, destinado a orientar a tomada de decisao ao longo da execucao do teste e a demonstrar maturidade de governanca perante banca, comite, parceiro institucional ou avaliador externo.

---

## 2. Premissas de Uso da Matriz

A leitura desta matriz deve observar as seguintes premissas:

1. O piloto ocorre em escopo controlado, com 1 rede ou secretaria parceira e 1 a 3 escolas.
2. O uso principal da IA no piloto e informacional e consultivo, sem substituicao de decisao administrativa final.
3. Os riscos aqui descritos nao sao hipoteticos apenas; eles dialogam com o comportamento real da arquitetura, dos fluxos de auditoria e dos limites atuais do sistema.
4. Nem todo risco exige interrupcao imediata do piloto; alguns demandam monitoramento, ajuste de base, reforco de curadoria ou reducao de escopo.
5. Riscos envolvendo dados pessoais, temas sensiveis, menores ou dano institucional relevante devem ser tratados com criterio mais restritivo.

---

## 3. Escala Simplificada de Criticidade

Para fins operacionais, recomenda-se a seguinte leitura sintetica de criticidade:

| Nivel | Significado operacional |
|---|---|
| Baixo | Pode ser tratado por ajuste rotineiro sem comprometer o piloto |
| Medio | Exige acompanhamento proximo, correcao tempestiva e eventual revisao de processo |
| Alto | Exige resposta institucional imediata, com possibilidade de suspensao parcial do teste |
| Critico | Pode justificar interrupcao total ou parcial imediata, dependendo do impacto |

---

## 4. Matriz de Riscos e Mitigacao

### 4.1 Riscos de resposta, conteudo e governanca da IA

| Risco | Descricao objetiva | Nivel sugerido | Como mitiga | Como detecta | Quem responde | Quando interrompe o teste |
|---|---|---|---|---|---|---|
| Resposta errada | A IA entrega informacao incorreta, incompleta ou potencialmente enganosa em tema relevante | Alto | thresholds de evidencia, abstencao, revisao humana obrigatoria em casos sinalizados, curadoria ativa e feedback/incidente | feedback `incorrect`, incidente, contestacao recorrente, revisao posterior | secretaria, curadoria, auditoria e gestor do piloto | interromper parcial se houver erro material em tema critico sem contencao imediata; interromper total se houver recorrencia grave com dano institucional |
| Resposta sem base documental | O sistema responde sem fonte institucional suficientemente identificada ou versionada | Alto | exigencia de evidencia, resposta conservadora, `review_required`, fallback humano e reforco de fonte oficial | ausencia de fonte principal, baixa evidencia, `fallback_to_human`, alta taxa de abstencao ou alerta | curadoria institucional, auditoria e equipe tecnica | suspender o tema ou frente de atendimento se o problema se repetir em assuntos centrais do piloto |
| Interpretacao incorreta da norma | A IA produz leitura excessiva, indevida ou conclusiva de norma, regra ou orientacao institucional | Alto | delimitacao de escopo, reforco de regras por assistente, exclusao de temas sensiveis, revisao humana e governanca normativa | respostas contestadas por direcao, secretaria ou auditoria; incidentes em tema normativo | direcao, curadoria, auditoria e gestor do piloto | interromper imediatamente o tema afetado se a interpretacao puder gerar ato administrativo inadequado |
| Documento desatualizado | A resposta replica procedimento ou orientacao antiga por base nao atualizada | Medio/Alto | rotina de versionamento, publicacao de novas fontes, curadoria continua e monitoramento de lacunas | recorrencia de perguntas sobre tema recentemente alterado, divergencia entre pratica atual e base | curadoria institucional, secretaria e gestor de conteudo | suspender temporariamente respostas do tema se houver mudanca institucional relevante sem atualizacao rapida |
| Uso fora do escopo | Usuarios ou operadores tentam utilizar o sistema para casos juridicos, disciplinares, individuais ou conclusivos | Alto | mensagens claras de limite, roteamento conservador, exclusao de temas, revisao humana e politica de uso responsavel | aumento de consultas sensiveis, incidentes de governanca, pedidos fora do escopo | operadores, secretaria, auditoria e gestor do piloto | suspender o tema ou reduzir escopo do piloto quando houver recorrencia relevante ou resposta indevida em materia sensivel |
| Dependencia excessiva da IA sem revisao humana | Equipes passam a tratar a resposta automatizada como decisao definitiva ou deixam de revisar casos obrigatorios | Alto | definicao de obrigatoriedade de revisao, checkpoints de governanca, trilha de auditoria e capacitacao operacional | baixa taxa de revisao em casos obrigatorios, fala dos operadores, uso de resposta automatica como ato formal | gestor do piloto, auditoria e chefias operacionais | interromper ou reduzir o piloto se os fluxos humanos obrigatorios deixarem de ser cumpridos |
| Falsa percepcao de autoridade da IA | Usuario interpreta o chat como canal decisorio ou vinculante da administracao | Medio/Alto | mensagens de escopo, linguagem orientativa, reforco de que nao substitui ato formal | reclamacoes, pedidos de confirmacao, comportamento de dependencia do canal | operadores, secretaria e comunicacao institucional | recalibrar comunicacao imediatamente; suspender frente especifica se a interpretacao estiver gerando dano concreto |

### 4.2 Riscos de dados, seguranca e privacidade

| Risco | Descricao objetiva | Nivel sugerido | Como mitiga | Como detecta | Quem responde | Quando interrompe o teste |
|---|---|---|---|---|---|---|
| Vazamento de dado | Exposicao indevida de dado pessoal, escolar ou de governanca a perfil nao autorizado | Critico | controle por perfil, segregacao por escola, minimizacao, endurecimento de contexto autenticado, monitoramento LGPD | incidente, auditoria, anomalia de acesso, relato de usuario ou equipe | equipe tecnica, encarregado/LGPD, auditoria e gestor institucional | interrupcao imediata da frente ou do piloto conforme extensao do vazamento |
| Acesso indevido entre escolas | Mistura ou visualizacao de dados de outra unidade por falha de segregacao | Critico | consolidacao de isolamento por escola, RLS, contexto autenticado e revisao de permissoes | validacao funcional, auditoria, teste de acesso e incidente | equipe tecnica, auditoria e gestao da rede | interromper imediatamente a operacao ate contencao e validacao do isolamento |
| Tratamento excessivo de dados no piloto | Coleta ou persistencia de dados alem do necessario ao atendimento e monitoramento | Alto | minimizacao de dados, orientacao aos operadores, revisao de campos livres e governanca LGPD | revisao de logs, auditoria de tabelas, avaliacao de casos concretos | equipe tecnica, curadoria de dados e responsavel LGPD | suspender coleta ampliada ou determinado fluxo ate adequacao |
| Exposicao de detalhes sensiveis de governanca | Perfis operacionais acessam evidencia detalhada, score ou informacao que deveria ser restrita | Medio/Alto | segregacao de capacidades por papel, principio de menor privilegio e validacao de front/back | testes por perfil, auditoria funcional, relato de acesso indevido | equipe tecnica, auditoria e gestor do piloto | suspender visualizacao da funcionalidade afetada ate correcao |

### 4.3 Riscos operacionais e de execucao do sandbox

| Risco | Descricao objetiva | Nivel sugerido | Como mitiga | Como detecta | Quem responde | Quando interrompe o teste |
|---|---|---|---|---|---|---|
| Ambiente inadequado para teste | Piloto roda sem delimitacao suficiente de acessos, fontes ou escolas participantes | Alto | configuracao dedicada do piloto, validacao previa de perfis, fontes e parametros | falhas de controle no pre-go-live, checklist incompleto, comportamento fora do perimetro | equipe tecnica, gestor do piloto e comite | nao iniciar ou suspender o piloto ate adequacao minima do ambiente |
| Instabilidade tecnica relevante | Quedas, indisponibilidade ou erro persistente comprometem coleta de evidencias e confiabilidade do uso | Medio/Alto | monitoramento operacional, suporte tecnico, contingencia e checkpoints | falhas repetidas, indisponibilidade prolongada, perda de trilha de logs | equipe tecnica e gestor do piloto | suspender temporariamente a frente afetada se a instabilidade comprometer atendimento ou auditoria |
| Baixa capacidade de resposta humana | Equipe nao consegue revisar casos, tratar incidentes ou atualizar fontes no ritmo exigido | Alto | coorte controlada, comite enxuto, distribuicao clara de responsabilidade e janela de revisao | fila crescente de revisoes, incidentes sem tratamento, atraso em curadoria | gestor do piloto, secretaria, curadoria e auditoria | reduzir escopo ou interromper o piloto se a supervisao humana obrigatoria se tornar inviavel |
| Simulacao inadequada de cenarios | O piloto testa apenas casos favoraveis e nao capta riscos reais de uso | Medio | bateria estruturada de perguntas, cenarios fora de escopo, amostragem de casos reais | cobertura pobre de cenarios, ausencia de casos criticos na avaliacao | equipe do projeto, secretaria e auditoria | recalibrar metodologia antes de ampliar o uso do piloto |
| Comunicacao insuficiente do escopo | Participantes nao compreendem o que esta sendo testado, os limites do canal ou os fluxos de reporte | Medio | orientacao inicial, mensagens de uso, checkpoints e reporte estruturado | duvidas recorrentes, uso indevido, pedidos fora do escopo | gestor do piloto, operadores e comunicacao institucional | recalibrar imediatamente a comunicacao; suspender grupo de teste se o uso inadequado persistir |

---

## 5. Mecanismos de Deteccao e Gatilhos Operacionais

Para que a matriz tenha valor pratico, recomenda-se acompanhar continuamente os seguintes sinais de alerta:

- aumento de `review_required`
- aumento de `fallback_to_human`
- crescimento de feedback `incorrect`
- incidentes abertos por tema, escola ou assistente
- respostas recorrentes sem fonte principal registrada
- temas recorrentes sem cobertura documental suficiente
- indisponibilidade tecnica ou falha de registro de auditoria
- uso recorrente em temas fora do escopo do piloto

Esses sinais nao substituem analise qualitativa, mas funcionam como gatilhos de triagem para resposta institucional rapida.

---

## 6. Responsabilidades de Resposta ao Risco

| Ator | Responsabilidade principal na matriz |
|---|---|
| Gestor do piloto | decidir sobre continuidade, reducao de escopo, suspensao parcial ou encerramento |
| Secretaria escolar | sinalizar erros operacionais, validar aderencia a processos reais e apoiar contencao |
| Curadoria institucional | corrigir lacunas de fonte, atualizar base e rever conteudo oficial |
| Auditoria ou governanca | analisar incidentes, monitorar rastreabilidade e supervisionar cumprimento de regras |
| Equipe tecnica | tratar falhas de ambiente, acesso, segregacao, logs e estabilidade |
| Responsavel LGPD ou instancia equivalente | avaliar e responder riscos de dados pessoais e privacidade |
| Comite institucional do piloto | consolidar visao transversal de risco e deliberar medidas extraordinarias |

---

## 7. Regras de Escalonamento e Interrupcao do Teste

Recomenda-se adotar quatro respostas padrao, proporcionais ao risco observado:

1. **Monitoramento reforcado**
Usado quando o risco e pontual, reversivel e ainda nao comprometeu o piloto de forma significativa.

2. **Recalibracao operacional**
Usado quando o problema exige ajuste de fonte, mensagem, parametro, roteiro ou processo humano, sem necessidade de paralisar toda a operacao.

3. **Suspensao parcial**
Usado quando o risco se concentra em determinado tema, assistente, escola, grupo de usuario ou funcionalidade especifica.

4. **Interrupcao total do piloto**
Usado quando ha risco critico, vazamento relevante, falha grave de segregacao, impossibilidade de revisao humana obrigatoria ou comprometimento serio da confiabilidade institucional do teste.

### 7.1 Gatilhos recomendados para interrupcao total imediata

Recomenda-se prever interrupcao total imediata quando houver, por exemplo:

- vazamento confirmado de dado pessoal ou escolar em escala relevante
- falha de segregacao entre escolas com acesso indevido a contexto alheio
- erro material grave envolvendo menores, tema disciplinar ou decisao administrativa indevida com impacto relevante
- perda de rastreabilidade minima que inviabilize auditoria do que foi respondido
- incapacidade institucional de conter rapidamente dano ja em curso

### 7.2 Gatilhos recomendados para suspensao parcial

Recomenda-se suspensao parcial quando houver:

- tema especifico com base desatualizada ou ambigua
- assistente com comportamento recorrente de baixa confianca
- grupo de usuarios utilizando o sistema de forma sistematicamente fora do escopo
- funcionalidade especifica sem controle adequado de acesso ou supervisao

---

## 8. Rotina de Atualizacao da Matriz

A matriz nao deve ser tratada como documento estatico. Recomenda-se revisao:

- antes da abertura do piloto
- ao final da fase de implantacao tecnica controlada
- em checkpoints quinzenais de governanca
- sempre que houver incidente relevante
- na conclusao do piloto, para consolidacao de aprendizados

Cada atualizacao deve registrar, sempre que possivel:

- risco revisto ou novo risco identificado
- data da revisao
- responsavel pela atualizacao
- alteracao de criticidade, mitigacao ou gatilho de resposta

---

## 9. Conclusao

A existencia desta Matriz de Riscos e Mitigacao fortalece significativamente a consistencia do piloto perante avaliadores de sandbox, porque demonstra que a gestao de risco nao foi tratada como apendice abstrato, mas como parte central do desenho e da execucao do teste.

No contexto do projeto **Assistente Inteligente de Atendimento Escolar com Governanca Algoritmica**, isso e especialmente relevante porque a solucao combina IA generativa, informacao institucional, atendimento ao cidadao, perfis diferenciados de acesso e possivel tratamento de dados escolares. Nao basta, portanto, demonstrar funcionalidade; e preciso demonstrar capacidade de prevenir, detectar, responder e interromper o teste quando necessario.

Dessa forma, este documento passa a oferecer uma camada adicional de robustez para apresentacao institucional, submissao a programa de inovacao, sandbox regulatorio ou processo de aprovacao de piloto governado.

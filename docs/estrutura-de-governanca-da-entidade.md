# Descrição da Estrutura de Governança da Entidade

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governança Algorítmica  
**Documento:** Estrutura de governança para operação do projeto  
**Finalidade:** Demonstrar os mecanismos de governança, supervisão humana, segurança da informação, gestão de riscos e governança ética e de dados adotados pela entidade  
**Versão:** 1.0  
**Data:** Março de 2026

---

## 1. Apresentação

A entidade proponente adota uma estrutura de governança voltada a assegurar que o uso de inteligência artificial no atendimento escolar institucional ocorra de forma controlada, auditável e compatível com os requisitos de um ambiente regulatório supervisionado.

A governança do projeto não se limita a princípios abstratos. Ela está traduzida em regras operacionais implementadas no sistema, perfis de acesso com permissões diferenciadas, mecanismos de supervisão humana posterior, trilhas formais de auditoria, ciclo de tratamento e correção de respostas, gestão estruturada de riscos e política de proteção de dados.

Este documento consolida, de forma objetiva, os cinco eixos exigidos pelo edital: papéis e responsáveis, supervisão humana, segurança da informação, gestão de riscos e governança ética e de dados.

---

## 2. Papéis e Responsáveis

### 2.1 Estrutura de perfis institucionais

A plataforma implementa controle de acesso baseado em papéis (RBAC) com 11 perfis, organizados em dois escopos:

#### Perfis de plataforma (transversais)

| Perfil | Responsabilidade |
|---|---|
| Superadmin da Plataforma | Gestão global do sistema, configuração de provedores de IA, criação de escolas e gestão de membros em todos os níveis |
| Auditor da Plataforma | Supervisão transversal de auditoria, trilhas de evidência, incidentes e indicadores de governança, sem capacidade de alteração dos dados operacionais |

#### Perfis institucionais (vinculados à escola)

| Perfil | Responsabilidade |
|---|---|
| Direção | Governança institucional, aprovação de correções propostas, conformidade e deliberação sobre limites de uso da IA |
| Secretaria | Operação administrativa, atendimento, validação de aderência às rotinas reais da escola |
| Coordenação | Acompanhamento pedagógico, sinalização de lacunas documentais em temas educacionais |
| Professor | Consulta e interação limitada com o sistema de atendimento |
| Auxiliar | Suporte operacional em tarefas administrativas |
| Curadoria | Gestão de fontes documentais, publicação de conteúdo oficial, versionamento da base de conhecimento |
| Operação | Atendimento ao público, uso direto dos assistentes de IA dentro do escopo autorizado |
| Portaria | Acesso restrito para consultas operacionais básicas |
| Auditor Escolar | Compliance institucional, monitoramento de trilhas e incidentes na escola |

### 2.2 Responsabilidades de governança por função

A governança do projeto distribui responsabilidades entre funções institucionais complementares:

| Função de governança | Quem exerce | O que faz |
|---|---|---|
| Definição de escopo e limites de uso da IA | Direção e gestão institucional | Aprova quais temas podem ser respondidos automaticamente, delibera sobre ampliação, suspensão ou ajuste do uso |
| Curadoria da base de conhecimento | Curadoria e gestão de conteúdo | Organiza, revisa, publica e atualiza fontes e conteúdos oficiais que sustentam as respostas |
| Validação operacional | Secretaria e operação | Verifica se as respostas da IA correspondem aos processos reais da escola e sinaliza erros |
| Auditoria e monitoramento | Auditor da Plataforma e Auditor Escolar | Monitora trilhas de auditoria, incidentes, feedbacks, correções e conformidade com as regras |
| Sustentação técnica | Equipe de desenvolvimento | Mantém logs, controles de acesso, integridade do ambiente, deploy e funcionamento das trilhas |
| Proteção de dados | Responsável LGPD ou instância equivalente | Acompanha riscos de dados pessoais, adequação ao tratamento e atendimento a direitos do titular |
| Deliberação transversal | Comitê do piloto | Consolida visão de risco, desempenho e maturidade para decisões institucionais sobre continuidade ou escalonamento |

### 2.3 Segregação de capacidades

O sistema implementa o princípio do menor privilégio. Perfis operacionais (secretaria, operação) têm visibilidade limitada de camadas internas de governança. Perfis de supervisão (auditor, direção, superadmin) acessam trilhas de evidência, scores de confiança, detalhes de risco de alucinação e histórico de correções. Essa separação impede que a operação do dia a dia interfira nos controles de governança e garante que a supervisão tenha acesso completo sem depender de quem opera.

---

## 3. Supervisão Humana

### 3.1 Modelo adotado

A supervisão humana opera de forma **posterior e governada**. A IA gera respostas com base em conhecimento institucional versionado, e a revisão ocorre após o registro, por meio de trilhas de auditoria, feedbacks, incidentes, tratamentos e correções. Esse modelo é compatível com atendimento informacional de baixa a média criticidade em piloto controlado.

A plataforma **não** opera com coparticipação humana em tempo real na geração de cada resposta. Isso é deliberado: a governança estruturada posterior é mais escalável e auditável do que a revisão prévia de cada interação.

### 3.2 Mecanismos de supervisão implementados

| Mecanismo | Descrição | Quem atua |
|---|---|---|
| Trilha de auditoria formal | Cada resposta automatizada gera um evento formal de auditoria com score de confiança, evidências consultadas, risco de alucinação e status de revisão | Auditor, direção |
| Feedback estruturado | Operadores e gestores podem classificar respostas como úteis, não úteis ou incorretas, gerando insumo para melhoria | Todos os perfis autorizados |
| Registro de incidentes | Quando há erro relevante, risco institucional ou impacto potencial, o sistema permite abertura formal de incidente com severidade, tipo e quarentena | Operação, secretaria, auditoria |
| Tratamento por perfil | Incidentes e eventos são roteados para filas de tratamento por destino: curadoria de conteúdo, secretaria da rede, operação de serviço ou conformidade da direção | Perfis com competência específica |
| Correção com fluxo de aprovação | Perfis autorizados propõem correções formais com texto corrigido, análise de causa-raiz (7 categorias), ação recomendada e registro de antes/depois. A correção passa por aprovação antes de ser aplicada à base | Curadoria, direção |
| Encerramento manual de conversa | Perfis de governança podem encerrar conversas quando há necessidade de intervenção institucional | Secretaria, direção, auditoria |
| Monitoramento de indicadores | Dashboard com métricas de confiança, taxa de abstinência, fallback humano, incidentes por tema e cobertura da base | Gestor do piloto, auditoria |

### 3.3 Situações de supervisão obrigatória

A revisão ou intervenção humana é obrigatória sempre que o sistema identifica:

- indicação de `review_required` (revisão humana necessária)
- `fallback_to_human` (encaminhamento para atendimento humano)
- risco elevado de alucinação ou ausência de base confiável
- feedback classificado como `incorrect`
- incidente aberto por operador, curadoria ou auditoria
- tema sensível fora do escopo autorizado para resposta autônoma

### 3.4 Abstinência como mecanismo de segurança

Quando a evidência disponível está abaixo do limiar mínimo de segurança, o sistema adota postura conservadora: produz decisão do tipo `ABSTAIN_AND_REVIEW`, marca alto risco e recomenda revisão humana. A abstinência não é falha — é salvaguarda institucional.

---

## 4. Segurança da Informação

### 4.1 Autenticação

| Controle | Implementação |
|---|---|
| Gestão de identidade | Supabase Auth com tokens JWT |
| Refresh de sessão | Automático, sem intervenção do usuário |
| Validação de sessão | Obrigatória em todas as operações do sistema |
| Contexto autenticado | Derivado automaticamente (escola, papel, permissões) |
| Ingresso controlado | Sistema de convites com tokens únicos — não há autocadastro |

### 4.2 Controle de acesso

| Controle | Implementação |
|---|---|
| Modelo de autorização | RBAC com 12 perfis e permissões granulares por página |
| Segregação por escola | Todas as entidades do banco possuem `school_id` para isolamento lógico |
| Menor privilégio | Perfis operacionais não acessam trilhas detalhadas de governança |
| Configurabilidade | Permissões por perfil são configuráveis por escola |

### 4.3 Proteção de dados em trânsito e em repouso

| Controle | Implementação |
|---|---|
| Comunicação | HTTPS em todos os ambientes (produção e desenvolvimento) |
| Banco de dados | PostgreSQL gerenciado pelo Supabase com criptografia em repouso |
| Backups | Automáticos diários pelo Supabase |
| Região de armazenamento | São Paulo (sa-east-1) |

### 4.4 Segurança do ambiente

| Controle | Implementação |
|---|---|
| Execução isolada | Container Docker (node:20-alpine) em Cloud Run |
| Variáveis sensíveis | Gerenciadas por variáveis de ambiente, nunca no código-fonte |
| Versionamento | Código-fonte em repositório Git privado com histórico completo |
| Deploy controlado | Pipeline automatizado via Firebase CLI |
| Logs de operação | Disponíveis no console do Cloud Run e no dashboard do Supabase |

### 4.5 Segurança da camada de IA

| Controle | Implementação |
|---|---|
| Provedor ativo | Groq (modelos open-source), selecionável por escola |
| Arquitetura multiprovedores | Permite troca ou adição de provedores sem alteração estrutural |
| Minimização de contexto | Apenas dados necessários ao atendimento são enviados ao provedor |
| Sem treinamento proprietário | Dados da plataforma não são usados para treinar modelos — uso exclusivamente via API de inferência |
| Rastreabilidade | Toda resposta gerada registra provedor, modelo, score e evidências utilizadas |

---

## 5. Gestão de Riscos

### 5.1 Metodologia

A gestão de riscos adota uma abordagem operacional e contínua, organizada em torno de três dimensões:

1. **Riscos de resposta, conteúdo e governança da IA** — erros, alucinações, desatualização, uso fora do escopo
2. **Riscos de dados, segurança e privacidade** — vazamento, acesso indevido, tratamento excessivo
3. **Riscos operacionais e de execução do piloto** — instabilidade, capacidade de resposta humana, simulação inadequada

### 5.2 Escala de criticidade

| Nível | Significado operacional |
|---|---|
| Baixo | Tratável por ajuste rotineiro sem comprometer o piloto |
| Médio | Exige acompanhamento próximo e correção tempestiva |
| Alto | Exige resposta institucional imediata, com possibilidade de suspensão parcial |
| Crítico | Pode justificar interrupção total ou parcial imediata |

### 5.3 Riscos principais mapeados e mitigações

#### Riscos de resposta e governança da IA

| Risco | Nível | Mitigação implementada |
|---|---|---|
| Resposta incorreta ou sem base documental | Alto | Thresholds de evidência, abstinência automática, revisão humana obrigatória em casos sinalizados, feedback e incidentes |
| Interpretação indevida de norma | Alto | Delimitação de escopo por assistente, exclusão de temas sensíveis, revisão humana e governança normativa |
| Documento desatualizado na base | Médio/Alto | Rotina de versionamento, publicação de novas fontes, curadoria contínua, monitoramento de lacunas |
| Uso da IA fora do escopo autorizado | Alto | Mensagens de limite, roteamento conservador, política de uso responsável, revisão humana |
| Dependência excessiva da IA sem revisão | Alto | Checkpoints de governança, trilha de auditoria, obrigatoriedade de revisão em casos críticos |

#### Riscos de dados e privacidade

| Risco | Nível | Mitigação implementada |
|---|---|---|
| Vazamento de dado pessoal | Crítico | Controle por perfil, segregação por escola, minimização, monitoramento LGPD |
| Acesso indevido entre escolas | Crítico | Isolamento por `school_id`, contexto autenticado, validação de permissões |
| Tratamento excessivo de dados | Alto | Minimização, orientação aos operadores, revisão de campos persistidos |

#### Riscos operacionais

| Risco | Nível | Mitigação implementada |
|---|---|---|
| Instabilidade técnica | Médio/Alto | Cloud Run com auto-scaling, monitoramento, contingência |
| Baixa capacidade de supervisão humana | Alto | Coorte controlada (1 a 3 escolas), distribuição clara de responsabilidade, filas de tratamento por perfil |
| Comunicação insuficiente do escopo | Médio | Orientação inicial, mensagens de uso no chat, checkpoints de avaliação |

### 5.4 Sinais de alerta monitorados

O sistema monitora indicadores que funcionam como gatilhos para resposta institucional rápida:

- aumento de `review_required` e `fallback_to_human`
- crescimento de feedback `incorrect`
- incidentes abertos por tema, escola ou assistente
- respostas sem fonte principal registrada
- indisponibilidade técnica ou falha de registro de auditoria

### 5.5 Regras de escalonamento

A governança adota quatro respostas proporcionais ao risco observado:

1. **Monitoramento reforçado** — acompanhamento mais próximo sem alteração de escopo
2. **Recalibração** — ajuste de base, parâmetros ou comunicação sem suspensão
3. **Suspensão parcial** — interrupção de frente de atendimento, tema ou escola específica
4. **Interrupção total** — encerramento do piloto até contenção e validação

### 5.6 Responsabilidades na resposta ao risco

| Ator | Responsabilidade |
|---|---|
| Gestor do piloto | Decidir sobre continuidade, redução de escopo ou encerramento |
| Secretaria escolar | Sinalizar erros operacionais e validar aderência aos processos reais |
| Curadoria | Corrigir lacunas de fonte, atualizar base e rever conteúdo oficial |
| Auditoria | Analisar incidentes, monitorar rastreabilidade e supervisionar conformidade |
| Equipe técnica | Tratar falhas de ambiente, acesso, logs e estabilidade |
| Responsável LGPD | Avaliar e responder riscos de dados pessoais e privacidade |
| Comitê do piloto | Consolidar visão transversal e deliberar medidas extraordinárias |

---

## 6. Governança Ética e de Dados

### 6.1 Princípios orientadores

O uso da IA no projeto observa os seguintes princípios de forma cumulativa:

| Princípio | Aplicação concreta |
|---|---|
| Finalidade institucional | A IA é utilizada exclusivamente para apoiar atendimento escolar e acesso a informação oficial — não há uso comercial, publicitário ou exploratório |
| Base informacional rastreável | Respostas se apoiam em fontes institucionais identificáveis e versionadas, com evidências registradas por interação |
| Não substituição do ato administrativo | A resposta automatizada tem natureza informacional e orientativa — não equivale a decisão administrativa formal |
| Supervisão humana por governança | Todo uso da IA permanece sujeito a revisão, feedback, incidente, correção e encerramento institucional |
| Resposta conservadora diante da incerteza | Na ausência de base suficiente, a conduta é abstinência, alerta ou encaminhamento humano |
| Aprendizado responsável | Erros, lacunas e incidentes alimentam correção da base e aperfeiçoamento do sistema |
| Transparência algorítmica | O sistema registra provedor, modelo, score de confiança, evidências e risco de alucinação para cada resposta |

### 6.2 Governança da base de conhecimento

A base que sustenta as respostas da IA é submetida a controles específicos:

| Controle | Descrição |
|---|---|
| Fontes admitidas | Apenas documentos institucionais formalizados, com autoria identificável e vigência verificável |
| Fontes vedadas | Orientações verbais não formalizadas, mensagens informais, documentos sem autoria, normas revogadas |
| Versionamento obrigatório | Cada atualização de fonte gera nova versão com número, rótulo, data de publicação, responsável e checksum |
| Versão corrente identificada | O sistema mantém marcação de qual versão está ativa (`is_current`) |
| Rastreabilidade por resposta | Cada resposta registra quais evidências e versões de documentos foram efetivamente consultadas |
| Rotina de revisão | Revisão operacional semanal, curatorial quinzenal, formal mensal e extraordinária quando necessário |

### 6.3 Proteção de dados pessoais (LGPD)

A governança de dados pessoais considera os seguintes elementos:

| Aspecto | Tratamento |
|---|---|
| Dados coletados | Cadastrais de membros, identificadores de solicitantes, mensagens de atendimento, respostas e metadados de auditoria |
| Finalidade do tratamento | Autenticação, controle de acesso, atendimento institucional, recuperação de conhecimento, auditoria e melhoria contínua |
| Base legal aplicável | Interesse público na execução de políticas educacionais e consentimento quando cabível |
| Armazenamento | Supabase PostgreSQL, região São Paulo, com criptografia em repouso e backups automáticos |
| Minimização | Apenas dados necessários ao atendimento são coletados e persistidos |
| Segregação | Isolamento lógico por escola (`school_id`) em todas as entidades |
| Processamento por IA | Dados enviados ao provedor de IA são limitados ao contexto da consulta — sem treinamento, sem retenção pelo provedor |
| Direitos do titular | Estrutura de atendimento a direitos em consolidação (acesso, retificação, eliminação) |
| DPIA | Avaliação de Impacto à Proteção de Dados formalmente elaborada, com mapeamento de fluxos e riscos |

### 6.4 Ciclo de governança pós-resposta

A plataforma implementa um ciclo completo de governança que transforma cada resposta da IA em ponto de controle institucional:

```
Resposta gerada pela IA
    ↓
Registro de auditoria (evidências, confiança, risco)
    ↓
Feedback do operador ou gestor
    ↓
Abertura de incidente (se necessário)
    ↓
Roteamento para tratamento por destino
    ├── Curadoria de conteúdo
    ├── Secretaria da rede
    ├── Operação de serviço
    └── Conformidade da direção
    ↓
Proposta de correção com causa-raiz
    ↓
Aprovação por perfil autorizado
    ↓
Aplicação automática na base de conhecimento
    ↓
Notificação contextualizada aos envolvidos
```

Esse ciclo assegura que erros identificados não permaneçam apenas registrados, mas sejam efetivamente corrigidos na base que sustenta as respostas futuras.

### 6.5 Transparência algorítmica

Cada resposta automatizada permite reconstituição posterior por meio de:

| Registro | Conteúdo |
|---|---|
| `assistant_responses` | Resposta emitida, confiança, modo e metadados |
| `formal_audit_events` | Eventos formais de auditoria e governança |
| `interaction_source_evidence` | Fontes e evidências efetivamente utilizadas |
| `interaction_feedback` | Feedback estruturado sobre a qualidade da resposta |
| `incident_reports` | Incidentes formais com severidade, tipo e resolução |

Essa estrutura permite que qualquer resposta relevante seja potencialmente reconstruída a partir de seus registros de fonte, evidência, risco, feedback e contexto.

### 6.6 Documentação de governança produzida

A entidade elaborou um conjunto de documentos formais de governança que sustentam a operação do projeto:

| Documento | Finalidade |
|---|---|
| Documento de Governança da IA | Regras de fontes, revisão, abstinência, encaminhamento humano, auditoria e versionamento |
| Política de Uso Responsável da IA | Limites de atuação, supervisão humana, procedimentos de reporte de erro e correção |
| Relatório de Impacto Algorítmico (RIA) | Avaliação de finalidade, lógica decisória, riscos, mitigações e supervisão |
| DPIA / LGPD | Mapeamento de dados, finalidades, armazenamento, anonimização e direitos do titular |
| Model Card da IA | Documentação técnica de modelos, limitações, vieses e nível de confiança |
| Matriz de Riscos e Mitigação | Consolidação de riscos, medidas de prevenção, sinais de detecção e gatilhos de interrupção |
| Plano de Teste do Piloto | Metodologia, cenários, critérios de avaliação e cronograma |

---

## 7. Quadro-Resumo da Governança

| Eixo exigido pelo edital | O que a entidade demonstra |
|---|---|
| Papéis e responsáveis | 12 perfis com RBAC, segregação de capacidades por escopo, responsabilidades formais de governança distribuídas entre 7 funções institucionais |
| Supervisão humana | Modelo posterior e governado com 7 mecanismos implementados: auditoria formal, feedback, incidentes, tratamentos por perfil, correção com aprovação, encerramento manual e dashboard de indicadores |
| Segurança da informação | JWT, RBAC, HTTPS, segregação por escola, container isolado, variáveis de ambiente, backups automáticos, deploy controlado, logs de operação |
| Gestão de riscos | Matriz formal com 3 dimensões, 4 níveis de criticidade, mitigações implementadas para cada risco, sinais de alerta monitorados e 4 níveis de escalonamento |
| Governança ética e de dados | 7 princípios aplicados, base de conhecimento com versionamento obrigatório, LGPD com DPIA elaborada, ciclo de governança pós-resposta com 9 etapas, transparência algorítmica com 5 estruturas de registro, 7 documentos formais de governança |

---

**Data:** Março de 2026  
**Versão:** 1.0  
**Responsável:** Equipe de Desenvolvimento LAB-IA Educação

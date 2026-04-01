# ANEXO IV — MODELO DE PROJETO DE IA

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governança Algorítmica  
**Documento:** Respostas ao Modelo de Projeto de IA (Anexo IV do Edital)  
**Finalidade:** Atender à exigência de submissão de projeto descrevendo a solução de IA para o Sandbox Regulatório  
**Versão:** 1.0  
**Data:** Março de 2026

---

## 1. Qual o título/nome atribuído à sua solução de IA?

**Assistente Inteligente de Atendimento Escolar com Governança Algorítmica**

A solução é operada por meio da plataforma **LAB-IA Educação**, que integra atendimento institucional assistido por inteligência artificial com mecanismos nativos de governança, auditoria, rastreabilidade e supervisão humana posterior.

---

## 2. Qual a principal área de aplicação da sua solução de IA?

A solução atua em três áreas de aplicação complementares, dentre as previstas no edital:

| Área de aplicação | Justificativa |
|---|---|
| **Gestão educacional** (principal) | A plataforma organiza o atendimento institucional de redes públicas de educação, estruturando conhecimento oficial, padronizando respostas, produzindo indicadores gerenciais e criando trilhas de auditoria sobre o atendimento prestado pela IA |
| **Inovação pública digital** | A solução implementa um modelo de IA auditável com governança algorítmica nativa, demonstrando como tecnologia generativa pode operar em ambiente público com controle, transparência e responsabilidade institucional |
| **Acesso, permanência e êxito escolar** | Ao ampliar e padronizar o acesso à informação institucional (matrícula, calendário, documentos, procedimentos), a plataforma contribui para reduzir barreiras de acesso e desinformação que afetam famílias e estudantes |

---

## 3. Como a sua solução de IA se beneficiará da participação no Sandbox Regulatório?

A participação no Sandbox Regulatório beneficiará a solução em cinco dimensões:

1. **Validação institucional em ambiente controlado** — O Sandbox oferece o enquadramento regulatório necessário para testar a solução em rede pública real com supervisão do MEC, o que seria inviável como iniciativa isolada da entidade.

2. **Calibração de governança algorítmica** — A operação em ambiente regulado permitirá calibrar thresholds de evidência, regras de abstinência, políticas de revisão humana e mecanismos de escalonamento com base em dados reais de uso, sob acompanhamento regulatório.

3. **Amadurecimento da conformidade LGPD** — O contexto do Sandbox exige rigor adicional em proteção de dados, segregação por escola, minimização em prompts e atendimento a direitos do titular, acelerando a consolidação dessas camadas na plataforma.

4. **Evidência para política pública** — Os dados e indicadores gerados durante o piloto — taxa de confiança, abstinência, incidentes, correções, lacunas de cobertura — podem servir como insumo para futuras diretrizes do MEC sobre uso de IA em redes de educação.

5. **Teste de modelo replicável** — A solução foi projetada com segregação por escola e configuração por provedor. O Sandbox permitirá verificar se esse desenho é viável como modelo replicável em outras redes, secretarias ou contextos educacionais.

---

## 4. Qual o TRL (Technology Readiness Level) da sua solução de IA?

**TRL 7 — Demonstração de sistema em ambiente operacional**

Justificativa:

| Critério | Estado atual |
|---|---|
| Código-fonte | Backend com mais de 150 endpoints operacionais, frontend com mais de 15 módulos de interface |
| Infraestrutura | Ambiente de produção ativo em Cloud Run (GCP), Firebase Hosting, Supabase PostgreSQL (sa-east-1) |
| Banco de dados | Mais de 20 tabelas estruturantes com schema formalizado |
| Autenticação e acesso | Supabase Auth com JWT, RBAC com 12 perfis, permissões granulares por página |
| IA operacional | Provedor Groq ativo (Llama 3.3 70B Versatile), embeddings via Google AI, arquitetura multiprovedores |
| Governança | Trilha de auditoria, feedback, incidentes, tratamentos, correções com aprovação e aplicação automática |
| Base de conhecimento | Documentos versionados, conteúdo oficial estruturado em 4 módulos (calendário, matrícula, FAQ, avisos) |
| Deploy | Pipeline automatizado, container Docker, ambiente de desenvolvimento configurado |

A plataforma não é protótipo nem prova de conceito. É um sistema funcional com funcionalidades implementadas, em condições de operar em piloto institucional real. O que falta é a validação controlada em rede pública, que é justamente o objetivo do Sandbox.

---

## 5. Quais os principais componentes arquiteturais da sua solução e que modelos de IA são utilizados?

### 5.1 Componentes arquiteturais

| Componente | Tecnologia | Função |
|---|---|---|
| Backend (API e orquestração) | Node.js ≥18 / Express 5.1.0 em Cloud Run (GCP) | Processamento de requisições, APIs REST, orquestração de IA, auditoria e governança |
| Frontend administrativo | JavaScript Vanilla, Bootstrap 4.6.2, AdminLTE 3.2, jQuery 3.6.0 em Firebase Hosting | Interface de gestão com mais de 15 módulos especializados |
| Banco de dados | Supabase PostgreSQL gerenciado, região São Paulo (sa-east-1) | Persistência de dados (consultas, respostas, auditoria, conhecimento, usuários) |
| Autenticação | Supabase Auth (JWT) | Controle de sessão, identidade e derivação de contexto autenticado |
| Provedor de IA (respostas) | Groq — Llama 3.3 70B Versatile | Geração de respostas automatizadas com grounding institucional |
| Provedor de IA (embeddings) | Google AI — Generative AI API | Busca semântica na base de conhecimento (text-embedding-3-small) |
| Edge Functions | Supabase — Deno runtime | Operações serverless complementares (convites, embeddings) |
| Containerização | Docker — node:20-alpine | Empacotamento padronizado para deploy |

### 5.2 Modelos de IA utilizados

| Modelo | Provedor | Função | Características |
|---|---|---|---|
| Llama 3.3 70B Versatile | Groq | Geração de respostas dos assistentes | Modelo open-source de alta performance; não há fine-tuning — a especialização ocorre por grounding institucional, prompts governados e thresholds de evidência |
| text-embedding-3-small | Google AI | Busca semântica | Conversão de texto em vetores para recuperação de conhecimento por similaridade |

### 5.3 Arquitetura de decisão da IA

O modelo generativo não opera isoladamente. A resposta é produto de uma cadeia composta:

```
Consulta do usuário
    → Roteamento por área institucional (heurístico)
    → Busca textual e semântica na base de conhecimento local
    → Avaliação de evidência (thresholds: 0.58 / 0.78)
    → Decisão: responder, responder com ressalva ou abster-se
    → Prompt governado com regras explícitas de comportamento
    → Modelo generativo externo (Groq)
    → Resposta auditável com score, fonte, risco e trilha
```

A plataforma suporta múltiplos provedores de IA com configuração por escola, o que permite trocar ou comparar provedores sem alteração estrutural do sistema.

---

## 6. Quais os objetivos da sua solução de IA?

### 6.1 Objetivo geral

Apoiar redes públicas de educação no atendimento institucional a famílias, estudantes, servidores e gestores, combinando inteligência artificial com governança algorítmica nativa para produzir respostas rastreáveis, auditáveis e ancoradas em conhecimento oficial.

### 6.2 Objetivos específicos

1. **Reduzir o volume de atendimentos manuais repetitivos** — automatizar respostas a consultas recorrentes sobre matrícula, calendário, documentos, procedimentos e horários, liberando equipes para casos mais sensíveis ou estratégicos.

2. **Padronizar a informação prestada pela rede** — garantir que famílias e servidores recebam orientações consistentes, independentemente do canal, do servidor ou do horário da consulta.

3. **Estruturar a memória institucional da rede** — organizar documentos, normativas e orientações em base versionada, com histórico de atualizações e rastreabilidade de fontes.

4. **Implementar governança algorítmica como parte nativa do produto** — registrar trilha de auditoria, evidências, score de confiança, risco de alucinação, feedbacks, incidentes, tratamentos e correções por cada interação da IA.

5. **Produzir inteligência de gestão a partir do atendimento** — identificar temas recorrentes, lacunas documentais, gargalos operacionais e oportunidades de melhoria por meio de indicadores e relatórios.

6. **Demonstrar modelo replicável de IA governada em educação pública** — produzir evidência sobre viabilidade, limites e boas práticas para uso de IA generativa em serviços educacionais com transparência e responsabilidade.

---

## 7. Quais os benefícios da sua solução de IA para a sociedade?

### 7.1 Benefícios para famílias e estudantes

- Acesso mais rápido e padronizado a informações institucionais da escola
- Redução da dependência de canais informais (grupos de mensagem, ligações avulsas) para obter orientações
- Maior clareza sobre procedimentos de matrícula, rematrícula, transferência, calendário e documentos
- Diminuição de deslocamentos desnecessários por falta de informação prévia

### 7.2 Benefícios para a rede de educação

- Redução da sobrecarga operacional de secretarias e equipes administrativas com demandas repetitivas
- Maior distribuição do trabalho entre setores, com triagem automatizada de consultas
- Padronização das respostas institucionais, reduzindo contradições entre canais e servidores
- Memória institucional organizada, com documentos versionados e histórico de atualizações

### 7.3 Benefícios para a gestão pública

- Indicadores de atendimento com visão consolidada de temas recorrentes, gargalos e lacunas
- Dados para revisão de comunicações institucionais, normativas e procedimentos internos
- Dashboard de governança com métricas de confiança, abstinência, incidentes e correções
- Capacidade de avaliar o comportamento da IA com base em evidências concretas, e não apenas em percepção

### 7.4 Benefícios para a política pública

- Evidência empírica sobre como aplicar IA generativa em serviços educacionais com governança
- Modelo documentado de governança algorítmica que pode servir de referência para outras redes e secretarias
- Dados para subsidiar futuras diretrizes do MEC sobre uso responsável de IA na educação
- Demonstração de que é possível combinar inovação tecnológica com controle, auditoria e proteção de dados

---

## 8. Quais os riscos (inclusive éticos) já foram mapeados e quais medidas foram tomadas para mitigá-los?

### 8.1 Riscos mapeados e mitigações implementadas

#### Riscos de resposta e governança da IA

| Risco | Nível | Mitigação implementada |
|---|---|---|
| Alucinação informacional — resposta sem base institucional suficiente | Alto | Thresholds de evidência (0.58 e 0.78), abstinência automática quando não há fonte confiável, resposta conservadora em casos intermediários, registro de risco de alucinação por resposta |
| Desatualização da base — resposta apoiada em conteúdo vencido | Médio/Alto | Versionamento de documentos e fontes, curadoria contínua, monitoramento de lacunas por relatório |
| Interpretação excessiva de norma — IA produz leitura conclusiva ou indevida | Alto | Delimitação de escopo por assistente, regras de prompt que proíbem inventar normas ou prazos, revisão humana obrigatória em temas sensíveis |
| Uso da IA fora do escopo autorizado | Alto | Mensagens de limite, roteamento conservador, política de uso responsável, exclusão de temas sensíveis |
| Excesso de confiança do usuário — resposta tratada como decisão oficial | Médio/Alto | Avisos de que a resposta não substitui ato administrativo formal, linguagem orientativa, supervisão posterior |
| Dependência excessiva da IA sem revisão humana | Alto | Checkpoints de governança, trilha de auditoria, obrigatoriedade de revisão em casos sinalizados |

#### Riscos éticos

| Risco | Nível | Mitigação implementada |
|---|---|---|
| Viés de cobertura documental — IA responde melhor sobre temas bem documentados, pior sobre temas ausentes | Alto | Relatório de lacunas de cobertura, curadoria ativa, indicadores por tema |
| Viés de formulação linguística — usuários com menor capacidade de formular perguntas recebem respostas menos adequadas | Médio | Recuperação semântica (não apenas textual), prompts com instrução de compreensão contextual |
| Exclusão por canal — atendimento apenas por texto limita acessibilidade | Médio | Reconhecido como limitação do piloto; planejada ampliação futura de canais |
| Viés de conservadorismo — abstinência excessiva pode impedir respostas que um humano consideraria seguras | Médio | Calibração de thresholds com base em dados reais do piloto; revisão periódica |
| Tratamento inadequado de dados de menores | Alto | Minimização de dados, segregação por escola, plano LGPD com medidas específicas, supervisão por responsável LGPD |

#### Riscos de dados e segurança

| Risco | Nível | Mitigação implementada |
|---|---|---|
| Vazamento de dado pessoal | Crítico | Controle por perfil (RBAC), segregação por escola, HTTPS, tokens JWT, sistema de convites |
| Acesso indevido entre escolas | Crítico | Isolamento por `school_id`, contexto autenticado derivado da sessão |
| Dados pessoais transitados a provedores de IA | Alto | Provedor Groq não retém dados de inferência; plano de minimização/máscara antes do envio |

### 8.2 Documentação de riscos produzida

O projeto conta com documentação formal e detalhada de riscos:

- **Relatório de Impacto Algorítmico (RIA)** — análise completa da lógica decisória, riscos, mitigações, limites de uso e supervisão humana
- **Avaliação de Impacto de Proteção de Dados (DPIA/LGPD)** — mapeamento de dados tratados, finalidades, armazenamento, política de retenção e direitos do titular
- **Matriz de Riscos e Mitigação do Piloto** — riscos operacionais com detecção, responsáveis e gatilhos de interrupção
- **Model Card da IA** — limitações, vieses conhecidos, nível de confiança e recomendações de uso responsável
- **Política de Uso Responsável da IA** — limites de uso, supervisão e governança ética

---

## 9. Como foi feita a coleta e tratamento dos dados?

### 9.1 Natureza dos dados

A solução não realiza coleta massiva de dados externos. Os dados tratados são gerados no contexto da própria operação do atendimento institucional:

| Categoria | Exemplos | Origem |
|---|---|---|
| Dados cadastrais de membros | Nome, email, papel, escola vinculada | Cadastro institucional via convite controlado |
| Identificadores de solicitantes | Nome e contato informados no atendimento | Fornecidos pelo próprio usuário ao iniciar consulta |
| Mensagens de atendimento | Texto das consultas e respostas | Gerados durante a interação com os assistentes |
| Metadados de auditoria | Score de confiança, evidências, risco de alucinação | Calculados automaticamente pelo sistema a cada resposta |
| Base de conhecimento | Documentos, normativas, orientações institucionais | Inseridos e curados pela equipe institucional (curadoria e secretaria) |
| Conteúdo oficial | Calendário, matrícula, FAQ, avisos | Publicados pela rede/escola por meio dos módulos da plataforma |
| Feedbacks e incidentes | Registros de erro, severidade, tratamento | Gerados por operadores e supervisores durante a operação |

### 9.2 Processo de tratamento

O tratamento dos dados segue o ciclo funcional do atendimento:

1. **Ingresso controlado** — membros são cadastrados por convite com token único, sem autocadastro
2. **Contexto autenticado** — escola, papel e permissões são derivados automaticamente da sessão
3. **Atendimento governado** — cada interação gera registro de mensagens, resposta, evidências, score e auditoria
4. **Segregação por escola** — todas as entidades possuem `school_id` para isolamento lógico
5. **Supervisão e melhoria** — feedbacks, incidentes e correções alimentam ciclo de governança pós-resposta

### 9.3 Base institucional

A base de conhecimento que sustenta as respostas da IA é composta por documentos institucionais fornecidos pela própria rede de educação. Esses documentos são importados, versionados e publicados pela curadoria institucional. O sistema registra título, versão, checksum e data de cada fonte, permitindo rastreabilidade completa da origem das respostas.

---

## 10. A sua aplicação de IA utiliza dados pessoais, definidos conforme o art. 5º, incisos I e II da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), ou apenas dados anonimizados?

A aplicação **utiliza dados pessoais**, conforme definidos no art. 5º, inciso I, da LGPD.

### 10.1 Dados pessoais tratados

| Dado pessoal | Finalidade | Base legal aplicável |
|---|---|---|
| Nome e email de membros | Autenticação, controle de acesso e responsabilização | Execução de contrato / legítimo interesse |
| Nome e contato de solicitantes | Identificação no atendimento institucional | Legítimo interesse / consentimento |
| Mensagens de texto das consultas | Atendimento, registro de trilha e auditoria | Legítimo interesse |
| Metadados de interação (IP, timestamps) | Segurança e rastreabilidade operacional | Legítimo interesse |

### 10.2 Dados potencialmente sensíveis

O sistema não coleta sistematicamente dados sensíveis (art. 5º, inciso II). Contudo, reconhece que o conteúdo de mensagens livres **pode conter** dados sensíveis inseridos pelo próprio usuário (informações de saúde, dados de menores, situações disciplinares). Por essa razão, todas as mensagens são tratadas como campo de risco ampliado, com medidas de proteção reforçadas.

### 10.3 Dados não pessoais

A maior parte dos dados tratados pela plataforma é institucional e não pessoal: documentos normativos, orientações administrativas, conteúdo oficial, configurações de IA e indicadores operacionais.

### 10.4 Dados anonimizados

O sistema não opera exclusivamente com dados anonimizados. Há plano técnico formalizado para implementação de camada de anonimização e pseudonimização em ciclo de vida dos dados, incluindo minimização antes do envio a provedores de IA e anonimização posterior de registros históricos.

---

## 11. Que medidas você utilizou para proteger os direitos fundamentais dos titulares dos dados?

### 11.1 Medidas implementadas

| Direito / Princípio | Medida adotada |
|---|---|
| **Finalidade e adequação** | Dados são coletados e tratados exclusivamente para atendimento institucional, governança e operação do sistema — sem finalidades comerciais, de perfilamento ou marketing |
| **Necessidade e minimização** | Ingresso por convite controlado (sem autocadastro); sessões temporárias com expiração por inatividade (30 minutos); plano de minimização de dados antes do envio ao provedor de IA |
| **Transparência** | Avisos de que a resposta é automatizada e não substitui ato administrativo formal; documentação pública de governança incluindo RIA, DPIA, Model Card e Política de Uso Responsável |
| **Segurança** | HTTPS em todos os ambientes; JWT para autenticação; RBAC com 12 perfis e permissões granulares; segregação por escola; backups automáticos; variáveis sensíveis em ambiente protegido |
| **Não discriminação** | Análise de vieses conhecidos documentada no Model Card (viés de cobertura, linguístico, de conservadorismo); medidas de mitigação previstas |
| **Acesso e correção** | Plano para implementação de fluxo de atendimento a direitos do titular (confirmação, acesso, correção, eliminação), conforme estrutura `data_subject_requests` prevista no plano LGPD |
| **Limitação de retenção** | Política de retenção proposta com prazos por categoria de dado (sessões: 30 min; mensagens: 6-12 meses; auditoria: 24 meses; membros: enquanto durar vínculo) |
| **Responsabilização** | Trilha formal de auditoria por cada resposta da IA; registro de responsáveis por ações no sistema; eventos de governança vinculados a autoria |

### 11.2 Medidas em consolidação

- Camada abrangente de mascaramento/redação de dados pessoais antes do envio a provedores de IA
- RLS (Row Level Security) completo em todas as tabelas centrais do banco
- Fluxo operacional de atendimento a direitos do titular (portal ou canal dedicado)
- Política técnica formalizada de descarte e anonimização em ciclo de vida

---

## 12. Os proprietários dos dados foram informados que eles seriam usados para treinar uma solução de IA?

### 12.1 A solução não treina modelos com dados da plataforma

A plataforma **não realiza treinamento, fine-tuning ou adaptação de modelos de IA** com dados dos usuários ou da operação. Os modelos utilizados (Llama 3.3 70B Versatile e text-embedding-3-small) são modelos pré-treinados de terceiros, consumidos exclusivamente via API de inferência.

Isso significa que:

- Nenhum dado pessoal, mensagem de atendimento ou conteúdo institucional é usado para treinar ou ajustar pesos do modelo
- Os dados enviados ao provedor de IA (Groq) são processados apenas para gerar a resposta e não são retidos pelo provedor para treinamento
- A "especialização" do sistema ocorre por grounding institucional (base de conhecimento local, prompts governados e thresholds de evidência), não por treinamento do modelo

### 12.2 Informação aos usuários

Os membros da plataforma são cadastrados por convite institucional controlado. O contexto do Sandbox prevê comunicação formal sobre a natureza do projeto aos participantes, incluindo o fato de que o canal opera com assistentes de IA e que as interações ficam registradas para fins de auditoria, governança e melhoria do atendimento.

---

## 13. Seu modelo é transparente ou explicável? Se não for, que mecanismos foram utilizados para validar a confiabilidade e concretude do seu funcionamento?

### 13.1 Natureza da transparência

O modelo generativo utilizado (Llama 3.3 70B Versatile) é, por sua natureza, um modelo de caixa-preta — como todo LLM atual. Ele não oferece explicabilidade intrínseca de cada decisão interna.

Contudo, a plataforma implementa uma **camada de transparência operacional e institucional** que torna o funcionamento do sistema auditável e compreensível para os agentes de governança:

### 13.2 Mecanismos de transparência implementados

| Mecanismo | O que registra |
|---|---|
| **Score de confiança** | Indicador operacional (0 a 1) derivado do suporte documental encontrado, registrado em cada resposta |
| **Score de evidência** | Qualidade da base institucional recuperada para sustentar a resposta |
| **Risco de alucinação** | Classificação do nível de risco (baixo, médio, alto) por resposta |
| **Fonte principal** | Título e versão do documento-fonte que sustentou a resposta |
| **Evidências consultadas** | Lista de trechos da base institucional consultados, persistidos em `interaction_source_evidence` |
| **Status de revisão** | Marcação de `review_required` e `fallback_to_human` quando a evidência é insuficiente |
| **Evento formal de auditoria** | Registro em `formal_audit_events` com tipo de evento, severidade, razão e status de revisão |
| **Feedback estruturado** | Avaliação por operadores e gestores (útil, não útil, incorreto) |
| **Registro de incidentes** | Abertura formal com severidade, tipo e quarentena, vinculada à resposta |
| **Correções com trilha** | Proposta, aprovação, aplicação automática na base e registro de antes/depois |
| **Timeline de histórico** | Eventos-filhos vinculados ao evento original, formando trilha completa de governança |

### 13.3 Estados decisórios explícitos

O sistema adota três estados decisórios documentados, com base em thresholds de evidência:

| Estado | Condição | Comportamento |
|---|---|---|
| `ABSTAIN_AND_REVIEW` | Evidência insuficiente (score < 0.58) ou sem fonte confiável | Não responde conclusivamente; marca alto risco e recomenda revisão humana |
| `ANSWER_WITH_WARNING` | Evidência parcial (score entre 0.58 e 0.78) | Responde de forma conservadora; marca revisão requerida |
| `SAFE_TO_ANSWER` | Evidência forte (score ≥ 0.78) e fonte versionada | Responde com maior segurança; registra fonte, confiança e auditoria |

### 13.4 Conclusão sobre transparência

Embora o modelo generativo em si seja opaco, o sistema é **operacionalmente transparente**: cada resposta é acompanhada de score, fonte, risco, evidências e trilha de auditoria. Isso permite que perfis de governança (auditores, direção, superadmin) reconstruam o percurso de qualquer resposta automatizada e avaliem sua adequação.

---

## 14. Quais são os valores obtidos nas métricas de performance do seu modelo, nos conjuntos de treinamento e testes?

### 14.1 Natureza da avaliação

A plataforma **não realiza treinamento proprietário** de modelos de IA. O modelo generativo (Llama 3.3 70B Versatile, Groq) é pré-treinado pelo fornecedor. Portanto, não há conjuntos de treinamento e teste próprios no sentido convencional de machine learning supervisionado.

### 14.2 Métricas operacionais do sistema

Em vez de métricas de acurácia de modelo, a plataforma foi projetada para medir a qualidade do atendimento por meio de indicadores operacionais e de governança:

#### Métricas de qualidade da resposta

| Métrica | Descrição |
|---|---|
| Score médio de confiança | Média do `confidence_score` por período, assistente e escola |
| Score médio de evidência | Média do `evidence_score`, indicando suporte documental das respostas |
| Taxa de abstinência | Percentual de respostas em que o sistema se absteve por falta de base suficiente |
| Taxa de revisão requerida | Percentual de respostas marcadas como `review_required` |
| Taxa de fallback humano | Percentual de respostas com `fallback_to_human` recomendado |

#### Métricas de governança

| Métrica | Descrição |
|---|---|
| Feedbacks por tipo | Distribuição entre `helpful`, `not_helpful` e `incorrect` |
| Incidentes por severidade | Volume de incidentes abertos por período, classificados por gravidade |
| Correções aplicadas | Número de correções propostas, aprovadas e efetivamente aplicadas na base |
| Cobertura da base | Percentual de temas recorrentes com cobertura documental identificada |
| Lacunas de conhecimento | Temas consultados sem cobertura suficiente na base institucional |

#### Métricas operacionais

| Métrica | Descrição |
|---|---|
| Total de consultas | Volume de atendimentos recebidos por período |
| Taxa de resolução | Percentual de consultas efetivamente respondidas |
| Distribuição por assistente | Volume de consultas por área (público, secretaria, tesouraria, direção) |
| Tempo médio até primeira resposta | Latência entre envio da consulta e entrega da resposta |

### 14.3 Avaliação durante o piloto

O Plano de Teste do Piloto prevê coleta estruturada dessas métricas durante 13 semanas de operação, com linha de base anterior (volume médio de atendimentos manuais, tempo de resposta, canais utilizados) para comparação de impacto. Os resultados serão consolidados no relatório final ao MEC/SEAI.

---

## 15. Que mecanismos de mitigação de viés foram usados na curadoria dos dados e no processo de treinamento?

### 15.1 Contexto: sem treinamento, com curadoria

Como a plataforma não treina modelos, não há curadoria de dados de treinamento no sentido convencional. A mitigação de viés concentra-se em duas frentes: (a) a qualidade da base de conhecimento institucional que alimenta as respostas e (b) os mecanismos da aplicação que modulam o comportamento do modelo generativo.

### 15.2 Mecanismos de mitigação de viés na curadoria

| Mecanismo | Descrição |
|---|---|
| Versionamento de fontes | Cada documento da base possui versão, data e checksum, permitindo identificar quando a fonte foi atualizada e qual era o estado da informação em cada momento |
| Publicação controlada | Conteúdo oficial passa por ciclo de publicação (rascunho → publicado → arquivado) com responsável identificado |
| Relatório de lacunas | O sistema identifica temas consultados sem cobertura documental suficiente, sinalizando viés de cobertura |
| Detecção de conflitos | O módulo de FAQ implementa verificação de conflitos entre entradas antes da publicação |
| Curadoria por perfil institucional | A organização da base é responsabilidade de perfis dedicados (curadoria, secretaria), não de qualquer operador |
| Múltiplos módulos de conteúdo | Separação entre conhecimento genérico, calendário, matrícula, FAQ e avisos evita tratamento indiferenciado de fontes |

### 15.3 Mecanismos de mitigação de viés na aplicação

| Mecanismo | Descrição |
|---|---|
| Abstinência em base insuficiente | O sistema não especula quando não há fonte — se abstém e marca revisão. Isso evita que vieses do modelo generativo preencham lacunas documentais |
| Busca híbrida (textual + semântica) | Reduz viés de vocabulário: perguntas formuladas com termos diferentes podem recuperar a mesma base |
| Thresholds calibráveis | Os limiares de evidência podem ser ajustados com base em resultados reais do piloto |
| Prompt governado | Regras explícitas para não inventar normas, prazos ou documentos; limitar-se ao que está sustentado pelas fontes |
| Feedback estruturado | Respostas classificadas como incorretas geram insumo para correção e melhoria da base |
| Incidentes e correções | Erros recorrentes em temas específicos podem ser tratados por correção formal com aplicação automática na base |

### 15.4 Vieses conhecidos e monitorados

O Model Card da IA documenta os seguintes vieses conhecidos:

1. **Viés de cobertura documental** — respostas melhores em temas bem documentados, piores em temas ausentes
2. **Viés de formulação linguística** — perguntas claras obtêm melhores resultados que perguntas vagas
3. **Viés do provedor de base** — herança de vieses linguístico-culturais do modelo third-party
4. **Viés de conservadorismo** — abstinência excessiva em casos limítrofes
5. **Viés institucional** — reprodução da linguagem e perspectiva presente nos documentos oficiais

---

## 16. Como você avalia a presença de viés discriminatório no modelo treinado?

### 16.1 Avaliação de viés discriminatório

A plataforma adota postura de **transparência sobre limitações** em vez de declarar ausência de viés. A avaliação considera três camadas:

#### Camada 1 — Modelo generativo (Llama 3.3 70B)

O modelo é pré-treinado pelo fornecedor (Meta) com corpus amplo da internet. Como todo LLM, herda vieses linguísticos, culturais e demográficos presentes nos dados de treinamento. A plataforma não tem controle direto sobre esses vieses intrínsecos do modelo, mas mitiga seus efeitos por meio de:

- Prompts com regras explícitas de comportamento (responder em português, não inventar, limitar-se às fontes)
- Grounding institucional que ancora a resposta em base local, reduzindo a dependência de conhecimento genérico do modelo
- Thresholds de evidência que impedem respostas sem suporte documental

#### Camada 2 — Base institucional

A base de conhecimento é composta por documentos oficiais da rede de educação. O viés potencial nesta camada é de **cobertura desigual**: temas bem documentados produzem melhores respostas, enquanto temas sub-representados podem gerar abstinência ou respostas menos precisas.

Mecanismos de detecção:
- Relatório de lacunas de cobertura por tema e período
- Indicadores de abstinência por área e assistente
- Monitoramento de feedback `incorrect` por tema

#### Camada 3 — Acesso ao canal

O atendimento por texto pode representar barreira de acesso para usuários com menor letramento digital, restrições de leitura/escrita ou preferência por canais multimodais. Essa limitação é reconhecida como viés de exclusão por canal, documentada no Model Card, com planejamento de ampliação futura.

### 16.2 Práticas de monitoramento contínuo

Durante o piloto, o viés discriminatório será monitorado por:

- Análise de distribuição de feedbacks `incorrect` por tema e perfil de solicitante
- Verificação de padrões de abstinência que possam indicar sub-representação de temas relevantes
- Acompanhamento de incidentes relacionados a respostas inadequadas por contexto ou público
- Revisão periódica de thresholds de evidência com base em dados reais

---

## 17. Qual é o plano de testes sugerido?

### 17.1 Visão geral

O plano de testes foi projetado como teste operacional controlado em ambiente real, com coleta contínua de evidências quantitativas e qualitativas. O objetivo não é apenas verificar se a aplicação funciona tecnicamente, mas medir se ela gera valor institucional sob supervisão, com limites de uso adequados e comportamento observável diante de incerteza ou risco.

### 17.2 Escopo do piloto

| Dimensão | Definição |
|---|---|
| Abrangência | 1 rede ou secretaria parceira, 1 a 3 escolas participantes |
| Frentes de atendimento | Atendimento público escolar + apoio à secretaria escolar |
| Assistentes ativos | Público e Secretaria como núcleo principal; Tesouraria e Direção como frentes secundárias ou de expansão controlada |
| Usuários internos | 7 a 19 credenciados (secretaria, curadoria, auditoria, TI, gestão) |
| Usuários externos | 150 a 500 usuários únicos ou 300 a 1.200 consultas registradas |

### 17.3 Duração e fases

| Fase | Período | Objetivo |
|---|---|---|
| 1. Preparação institucional | Semanas 1 a 3 | Definir escopo, perfis, fontes, regras de uso e protocolo do piloto |
| 2. Implantação técnica controlada | Semanas 4 a 5 | Configurar ambiente, publicar base inicial, validar acessos |
| 3. Operação assistida | Semanas 6 a 11 | Atendimento real com monitoramento próximo e coleta de evidências |
| 4. Avaliação e consolidação | Semanas 12 a 13 | Análise de indicadores, comparação com linha de base, relatório final |

### 17.4 Cenários de teste estruturados

| Grupo de cenário | Exemplos |
|---|---|
| Atendimento público recorrente | "Quais documentos preciso para matrícula?", "Qual o horário da secretaria?", "Quando começa o período letivo?" |
| Secretaria escolar | "Como emitir declaração?", "Qual o fluxo de transferência?", "Onde encontrar orientação sobre rematrícula?" |
| Conteúdo parcialmente coberto | Perguntas sobre tema com documento incompleto ou desatualizado |
| Fora de escopo | Consulta jurídica individual, caso disciplinar sensível, decisão sobre matrícula |
| Solicitação de humano | "Quero falar com uma pessoa", "Me transfere para o atendimento humano" |
| Correção e incidente | Resposta contestada por operador, abertura de feedback `incorrect` ou incidente |

Recomenda-se bateria inicial de **20 a 40 perguntas de referência**, organizadas por criticidade e área.

### 17.5 Instrumentos de coleta de evidência

- Logs de interação e trilhas de auditoria (automáticos)
- Registros de evidência, score e risco por resposta (automáticos)
- Feedback de operadores e gestores (registrado na plataforma)
- Incidentes e correções abertos durante a operação
- Relatórios por período, assistente e lacunas de conhecimento
- Reuniões de acompanhamento com equipe institucional

### 17.6 Linha de base para comparação

Antes do início da operação assistida, será registrada linha de base contendo:

- Volume médio de atendimentos manuais no período equivalente anterior
- Tempo médio de resposta manual
- Principais canais utilizados
- Temas mais recorrentes
- Nível atual de padronização e rastreabilidade

### 17.7 Métricas avaliadas

| Categoria | Exemplos de métricas |
|---|---|
| Operacionais | Total de consultas, taxa de resolução, tempo médio até resposta, distribuição por assistente |
| Qualidade | Score de confiança, score de evidência, taxa de abstinência, taxa de revisão requerida, taxa de fallback |
| Governança | Eventos de auditoria, incidentes por severidade, correções aplicadas, tratamentos por destino |
| Valor público | Redução de demandas repetitivas, satisfação de operadores, ampliação de acesso a informação |

### 17.8 Critérios de suficiência

O piloto atinge massa crítica mínima de avaliação quando reunir:

- Uso ativo por ao menos dois perfis internos distintos
- Volume recorrente de consultas ao longo de várias semanas
- Ocorrência observável de feedbacks, revisões e ajustes
- Dados suficientes para comparação com a linha de base anterior

### 17.9 Gatilhos de interrupção

O plano prevê interrupção parcial ou total do teste quando:

- Erro material em tema crítico sem contenção imediata
- Incidente de segurança ou vazamento de dados
- Recorrência grave de respostas incorretas com dano institucional
- Supervisão humana obrigatória tornada inviável
- Determinação regulatória do MEC ou da SEAI

### 17.10 Entregas do piloto

- Base de conhecimento institucional publicada e versionada
- Módulos de conteúdo oficial ativados (calendário, matrícula, FAQ, avisos)
- Atendimento webchat operante com assistentes por área
- Painel de auditoria funcional com timeline e tratamento
- Dashboard de indicadores operacionais e de governança
- Relatório consolidado de indicadores do piloto
- Plano de melhorias e recomendação institucional sobre continuidade

---

## Quadro-Resumo das Respostas ao Anexo IV

| Pergunta | Síntese da resposta |
|---|---|
| 1. Título | Assistente Inteligente de Atendimento Escolar com Governança Algorítmica |
| 2. Área de aplicação | Gestão educacional (principal), inovação pública digital e acesso escolar |
| 3. Benefício do Sandbox | Validação institucional, calibração de governança, amadurecimento LGPD, evidência para política pública |
| 4. TRL | TRL 7 — sistema funcional com ambiente de produção ativo e funcionalidades implementadas |
| 5. Componentes e modelos | Backend Node.js/Express em Cloud Run, Supabase, Firebase; Llama 3.3 70B (Groq) para respostas, text-embedding-3-small para busca semântica |
| 6. Objetivos | Reduzir atendimentos repetitivos, padronizar informação, estruturar memória institucional, implementar governança algorítmica nativa |
| 7. Benefícios | Acesso mais rápido a informações, redução de sobrecarga, padronização, indicadores de gestão, modelo replicável para educação pública |
| 8. Riscos e mitigações | Alucinação, desatualização, viés de cobertura, dados pessoais; mitigados por thresholds, abstinência, auditoria, RBAC, segregação, LGPD |
| 9. Coleta e tratamento | Dados gerados na operação do atendimento; convite controlado, contexto autenticado, base institucional versionada |
| 10. Dados pessoais | Sim — nome, email, mensagens; plano de minimização e anonimização em ciclo de vida; sem dados sensíveis coletados sistematicamente |
| 11. Direitos fundamentais | RBAC, JWT, HTTPS, segregação, trilha de auditoria, minimização, política de retenção, plano de atendimento a direitos do titular |
| 12. Dados para treinamento | Não — plataforma não treina modelos; usa API de inferência; Groq não retém dados |
| 13. Transparência | Modelo opaco com transparência operacional: score, evidência, fonte, risco, auditoria, feedback, incidentes e correções rastreáveis |
| 14. Métricas de performance | Sem treinamento próprio; métricas operacionais (confiança, evidência, abstinência, incidentes, cobertura) medidas no piloto |
| 15. Mitigação de viés | Versionamento, publicação controlada, relatório de lacunas, detecção de conflitos, abstinência, busca híbrida, feedback |
| 16. Viés discriminatório | Transparência sobre limitações; monitoramento por cobertura, feedback, incidentes e calibração de thresholds no piloto |
| 17. Plano de testes | 13 semanas, 4 fases, 1-3 escolas, 7-19 usuários internos, 20-40 cenários estruturados, métricas de qualidade e governança |

---

**Data:** Março de 2026  
**Versão:** 1.0  
**Responsável:** Equipe de Desenvolvimento LAB-IA Educação

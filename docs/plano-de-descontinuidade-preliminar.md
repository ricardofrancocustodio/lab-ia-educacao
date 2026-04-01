# Plano de Descontinuidade Preliminar

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governança Algorítmica  
**Documento:** Plano de Descontinuidade Preliminar (conforme Anexo III do Edital)  
**Finalidade:** Descrever os procedimentos para encerramento ordenado da solução em caso de descontinuidade, garantindo proteção de dados, mitigação de riscos e comunicação adequada às partes envolvidas  
**Versão:** 1.0  
**Data:** Março de 2026

---

## 1. Identificação da Entidade e da Solução

### 1.1 Entidade proponente

| Campo | Conteúdo |
|---|---|
| Razão Social | [Preencher] |
| CNPJ | [Preencher] |
| Endereço | [Preencher] |
| Representante Legal | [Preencher] |
| Contato | [Preencher] |

### 1.2 Identificação da solução

| Campo | Conteúdo |
|---|---|
| Nome do projeto | Assistente Inteligente de Atendimento Escolar com Governança Algorítmica |
| Plataforma | LAB-IA Educação |
| Natureza da solução | Plataforma de atendimento institucional com IA auditável para redes públicas de educação |
| Público atendido | Famílias, estudantes, servidores e gestores de redes públicas de educação |
| Escopo do piloto | 1 a 3 escolas, 2 frentes de atendimento (público e secretaria), 4 assistentes especializados |

### 1.3 Componentes tecnológicos da solução

| Componente | Provedor | Função |
|---|---|---|
| Backend (API e orquestração) | Google Cloud Platform — Cloud Run | Processamento de requisições, APIs, orquestração de IA |
| Frontend (interface administrativa) | Google / Firebase — Firebase Hosting | Distribuição de páginas e assets estáticos |
| Banco de dados | Supabase — PostgreSQL gerenciado | Persistência de dados (consultas, respostas, auditoria, conhecimento, usuários) |
| Autenticação | Supabase Auth | Controle de sessão e identidade (JWT) |
| Provedor de IA (respostas) | Groq — Llama 3.3 70B Versatile | Geração de respostas automatizadas |
| Provedor de IA (embeddings) | Google AI — Generative AI API | Busca semântica na base de conhecimento |
| Edge Functions | Supabase — Deno runtime | Operações serverless (convites, embeddings) |
| Containerização | Docker — node:20-alpine | Empacotamento padronizado |

### 1.4 Dados tratados pela solução

| Categoria de dados | Exemplos | Natureza |
|---|---|---|
| Dados cadastrais de membros | Nome, email, papel, escola vinculada | Dados pessoais |
| Identificadores de solicitantes | Nome e contato informados no atendimento | Dados pessoais |
| Mensagens de atendimento | Texto das consultas e respostas | Dados pessoais (potencial) |
| Metadados de auditoria | Score de confiança, evidências, risco de alucinação, fonte principal | Dados operacionais |
| Base de conhecimento | Documentos institucionais, versões, categorias | Dados institucionais |
| Conteúdo oficial | Calendário, matrícula, FAQ, avisos | Dados institucionais |
| Incidentes e feedbacks | Registros de erro, severidade, tratamento | Dados operacionais |
| Configuração de IA | Provedor, modelo, parâmetros por escola | Dados de configuração |

---

## 2. Hipóteses de Acionamento do Plano

O presente plano será acionado em qualquer das seguintes situações:

1. **Encerramento regular do período de Sandbox** — término do prazo de participação sem renovação ou transição para regime permanente
2. **Decisão regulatória** — determinação do MEC, da SEAI ou de outro órgão competente para encerrar o teste
3. **Decisão voluntária da entidade** — opção da entidade proponente por descontinuar a solução
4. **Risco grave identificado** — ocorrência de incidente de segurança, vazamento de dados ou falha sistêmica que justifique interrupção imediata
5. **Inviabilidade operacional** — impossibilidade de manter infraestrutura, equipe ou condições mínimas de operação
6. **Descumprimento de condições do Sandbox** — verificação de que a operação não atende aos requisitos regulatórios estabelecidos

---

## 3. Procedimentos de Encerramento Imediato

### 3.1 Ações de contenção (primeiras 24 horas)

| Ordem | Ação | Responsável |
|---|---|---|
| 1 | Suspender o acesso público aos assistentes de IA (desativar canal de atendimento) | Equipe técnica |
| 2 | Exibir mensagem informativa no canal de atendimento, redirecionando para canais humanos da escola | Equipe técnica |
| 3 | Bloquear criação de novas consultas e interações automatizadas | Equipe técnica |
| 4 | Notificar a direção, a gestão da rede e o comitê do piloto sobre o acionamento do plano | Gestor do piloto |
| 5 | Preservar estado atual do banco de dados e dos logs (congelamento de snapshot) | Equipe técnica |
| 6 | Registrar o motivo, a data e o responsável pelo acionamento do plano de descontinuidade | Gestor do piloto |

### 3.2 Ações de estabilização (48 a 72 horas)

| Ordem | Ação | Responsável |
|---|---|---|
| 7 | Revogar tokens de acesso e sessões ativas de todos os usuários | Equipe técnica |
| 8 | Desativar convites pendentes de ingresso na plataforma | Equipe técnica |
| 9 | Suspender Edge Functions (convites, embeddings) | Equipe técnica |
| 10 | Revogar chaves de API dos provedores de IA (Groq e Google AI) | Equipe técnica |
| 11 | Manter o backend em modo somente leitura para extração de relatórios finais | Equipe técnica |
| 12 | Comunicar formalmente às escolas participantes sobre o encerramento e o cronograma previsto | Gestor do piloto + direção |

---

## 4. Desativação Técnica

### 4.1 Cronograma de desativação

| Fase | Prazo | Descrição |
|---|---|---|
| Fase 1 — Contenção | Dia 0 (imediato) | Suspensão do atendimento automatizado e bloqueio de novas interações |
| Fase 2 — Estabilização | Dias 1 a 3 | Revogação de acessos, suspensão de integrações, modo somente leitura |
| Fase 3 — Extração e relatórios | Dias 4 a 14 | Geração de relatórios finais, exportação de dados necessários, backups definitivos |
| Fase 4 — Descarte de dados | Dias 15 a 30 | Eliminação segura de dados pessoais conforme política de retenção |
| Fase 5 — Descomissionamento | Dias 31 a 45 | Remoção de serviços de nuvem, encerramento de contas e registros finais |

### 4.2 Procedimentos por componente

#### 4.2.1 Backend (Cloud Run)

| Etapa | Ação |
|---|---|
| Fase 1 | Desativar endpoints de atendimento por IA; manter endpoints administrativos para extração |
| Fase 3 | Exportar logs do Cloud Run para arquivo definitivo |
| Fase 5 | Excluir o serviço Cloud Run e a imagem Docker associada |

#### 4.2.2 Frontend (Firebase Hosting)

| Etapa | Ação |
|---|---|
| Fase 1 | Substituir conteúdo por página de aviso de encerramento com redirecionamento |
| Fase 5 | Remover o site do Firebase Hosting e excluir o target de deploy |

#### 4.2.3 Banco de dados (Supabase)

| Etapa | Ação |
|---|---|
| Fase 2 | Congelar banco em modo somente leitura |
| Fase 3 | Realizar backup completo e exportação de dados para arquivo seguro |
| Fase 4 | Executar scripts de eliminação de dados pessoais (ver Seção 7) |
| Fase 5 | Encerrar a instância Supabase após confirmação de descarte completo |

#### 4.2.4 Provedores de IA (Groq e Google AI)

| Etapa | Ação |
|---|---|
| Fase 1 | Suspender chamadas à API |
| Fase 2 | Revogar chaves de API |
| Fase 5 | Encerrar contas ou remover o projeto dos provedores |

#### 4.2.5 Autenticação (Supabase Auth)

| Etapa | Ação |
|---|---|
| Fase 2 | Revogar todas as sessões e tokens; desativar login |
| Fase 4 | Eliminar registros de autenticação e convites |
| Fase 5 | Encerrar junto com a instância Supabase |

#### 4.2.6 Edge Functions

| Etapa | Ação |
|---|---|
| Fase 2 | Desativar funções de convite e embedding |
| Fase 5 | Excluir funções do projeto Supabase |

#### 4.2.7 Repositório de código

| Etapa | Ação |
|---|---|
| Fase 3 | Gerar tag/release final com estado do código no momento do encerramento |
| Fase 5 | Arquivar repositório (modo somente leitura) — não excluir, para fins de auditoria e prestação de contas |

---

## 5. Mitigação de Riscos Remanescentes

### 5.1 Riscos identificados na descontinuidade

| Risco | Nível | Mitigação |
|---|---|---|
| Interrupção abrupta do atendimento ao público | Alto | Mensagem de redirecionamento imediata no canal; comunicação prévia às escolas com orientação sobre canais alternativos |
| Perda de dados antes do backup | Crítico | Congelamento de snapshot antes de qualquer ação de modificação; backup completo na Fase 3 |
| Dados pessoais remanescentes após encerramento | Alto | Execução de scripts de eliminação com verificação; certificação de descarte pela equipe técnica |
| Dados retidos por provedores de IA | Médio | Revogação imediata de chaves de API; o provedor ativo (Groq) não retém dados de inferência; verificação das políticas de retenção dos provedores |
| Perda de trilhas de auditoria antes de relatório final | Alto | Exportação completa de trilhas de auditoria, incidentes, feedbacks e correções antes de qualquer eliminação |
| Dependência operacional das escolas | Médio | Período de transição com comunicação gradual; orientação sobre retorno aos fluxos anteriores de atendimento |
| Acesso indevido durante o período de encerramento | Médio | Revogação de tokens e sessões na Fase 2; desativação de login; modo somente leitura |
| Obrigações legais de guarda de dados | Médio | Dados necessários para auditoria, defesa de direitos ou cumprimento legal são preservados em arquivo seguro com acesso restrito antes do descarte dos demais |

### 5.2 Verificação de riscos residuais

Antes de concluir o descomissionamento (Fase 5), a equipe técnica e o gestor do piloto devem verificar:

- [ ] Todos os dados pessoais foram eliminados ou pseudonimizados conforme a política
- [ ] Nenhuma chave de API permanece ativa
- [ ] Nenhuma sessão de usuário permanece ativa
- [ ] Os backups de auditoria estão armazenados em local seguro com acesso restrito
- [ ] Os provedores de IA não retêm dados da plataforma
- [ ] As escolas foram formalmente comunicadas e orientadas
- [ ] O relatório final foi entregue ao MEC/SEAI

---

## 6. Comunicação às Instituições

### 6.1 Plano de comunicação

| Destinatário | Momento | Canal | Conteúdo |
|---|---|---|---|
| MEC / SEAI / Órgão regulador | Imediatamente após decisão de encerramento | Ofício formal | Motivo do encerramento, data prevista, resumo do plano de descontinuidade, compromisso com relatório final |
| Direção das escolas participantes | Em até 48 horas | Comunicado formal + reunião | Motivo, cronograma de encerramento, orientação sobre canais alternativos de atendimento, compromisso com descarte de dados |
| Secretaria e equipe operacional | Em até 48 horas | Comunicado interno + orientação | Suspensão do uso da plataforma, procedimentos de transição, esclarecimento de dúvidas |
| Famílias e comunidade escolar | Em até 5 dias úteis | Comunicado via escola | Encerramento do canal de IA, canais alternativos disponíveis, garantia de proteção de dados |
| Equipe técnica | Imediatamente | Reunião + checklist operacional | Ativação do plano, distribuição de responsabilidades, cronograma fase a fase |
| Comitê do piloto | Imediatamente | Reunião extraordinária | Deliberação sobre o encerramento, acompanhamento do plano, aprovação de relatórios |

### 6.2 Conteúdo mínimo da comunicação às escolas

Toda comunicação de encerramento às escolas participantes deve conter, no mínimo:

1. Identificação da entidade e da solução encerrada
2. Motivo do encerramento (regulatório, voluntário, técnico ou por risco)
3. Data efetiva de suspensão do atendimento automatizado
4. Orientação sobre canais alternativos de atendimento disponíveis
5. Garantia de que os dados pessoais serão eliminados conforme a política de retenção
6. Informação sobre o direito de acesso aos dados antes do descarte
7. Contato do responsável para esclarecimentos

### 6.3 Registro da comunicação

Todas as comunicações de encerramento devem ser documentadas com:

- data de envio
- destinatário
- canal utilizado
- conteúdo ou referência ao documento enviado
- confirmação de recebimento, quando possível

---

## 7. Descarte Seguro de Dados

### 7.1 Princípios do descarte

O descarte de dados observa os seguintes princípios:

1. **Finalidade encerrada**: dados cuja finalidade de tratamento cessou devem ser eliminados
2. **Obrigação legal preservada**: dados necessários para cumprimento de obrigação legal ou defesa de direitos são mantidos em arquivo restrito
3. **Proporcionalidade**: o descarte deve ser proporcional à natureza do dado e ao risco residual
4. **Irreversibilidade**: a eliminação de dados pessoais deve ser irreversível — não basta desativar o acesso
5. **Rastreabilidade do descarte**: toda operação de eliminação deve ser registrada

### 7.2 Procedimentos de descarte por categoria de dados

| Categoria | Dados | Procedimento | Prazo |
|---|---|---|---|
| Sessões em memória (RAM) | Sessões temporárias de atendimento | Descartadas automaticamente com a desativação do serviço | Fase 1 |
| Mensagens de atendimento | `consultation_messages` | Eliminação irreversível após exportação agregada para relatório final | Fase 4 |
| Consultas institucionais | `institutional_consultations` | Eliminação irreversível; preservar apenas contagem agregada para relatório | Fase 4 |
| Respostas automatizadas | `assistant_responses` | Preservar amostra anonimizada para relatório final; eliminar restante | Fase 4 |
| Dados cadastrais de membros | `school_members`, `platform_members` | Eliminação irreversível após confirmação de que não há obrigação de guarda | Fase 4 |
| Trilhas de auditoria | `formal_audit_events`, `interaction_source_evidence` | Exportar para arquivo seguro com acesso restrito; eliminar do banco | Fase 4 |
| Feedbacks e incidentes | `interaction_feedback`, `incident_reports` | Exportar para relatório final anonimizado; eliminar do banco | Fase 4 |
| Base de conhecimento | `knowledge_base`, `knowledge_source_versions`, `source_documents` | Conteúdo institucional devolvido à rede/escola; registros eliminados do banco | Fase 4 |
| Conteúdo oficial | `official_content_records` | Conteúdo devolvido à rede/escola; registros eliminados do banco | Fase 4 |
| Configuração de IA | `ai_provider_settings` | Eliminação completa | Fase 4 |
| Registros de autenticação | Supabase Auth | Eliminação completa com encerramento da instância | Fase 5 |
| Convites e tokens | Tokens de convite, API keys | Revogação e eliminação | Fase 2 / Fase 5 |
| Logs de aplicação | Cloud Run logs | Exportar período do piloto para arquivo; excluir do console | Fase 5 |
| Backups automáticos | Supabase backups | Solicitar exclusão ao Supabase após confirmação de arquivo definitivo | Fase 5 |

### 7.3 Dados preservados para arquivo

Os seguintes dados serão preservados em arquivo seguro, com acesso restrito e prazo definido, para fins de auditoria, relatório final e eventual prestação de contas:

| Dado preservado | Formato | Prazo de guarda | Acesso |
|---|---|---|---|
| Relatório final consolidado | PDF | 5 anos | Gestor do piloto, responsável legal |
| Trilhas de auditoria exportadas | JSON ou CSV anonimizado | 24 meses após encerramento | Equipe técnica, auditoria |
| Amostra anonimizada de respostas | JSON ou CSV | 24 meses após encerramento | Equipe técnica |
| Registro de comunicações de encerramento | PDF | 5 anos | Gestor do piloto, responsável legal |
| Tag final do repositório de código | Git archive | Indefinido (sem dados pessoais) | Equipe técnica |
| Certificação de descarte de dados | PDF assinado | 5 anos | Responsável legal, LGPD |

### 7.4 Certificação de descarte

Ao término da Fase 4, a equipe técnica emitirá documento formal de certificação de descarte contendo:

1. Lista dos conjuntos de dados eliminados
2. Método de eliminação utilizado (DELETE irreversível, DROP TABLE, exclusão de instância)
3. Data e hora da operação
4. Confirmação de que os dados não são recuperáveis
5. Identificação do responsável técnico pela execução
6. Identificação do responsável institucional pela autorização

---

## 8. Relatórios Finais

### 8.1 Relatório final ao MEC / SEAI

Será produzido relatório final consolidado contendo, no mínimo:

| Seção | Conteúdo |
|---|---|
| Identificação | Entidade, solução, período de participação no Sandbox |
| Resumo executivo | Objetivos do piloto, escopo executado, principais resultados |
| Indicadores operacionais | Volume de atendimentos, taxa de confiança, taxa de abstinência, fallback humano, cobertura da base |
| Indicadores de governança | Incidentes registrados, feedbacks, correções aplicadas, tratamentos realizados |
| Lições aprendidas | Principais achados sobre eficácia, limitações e oportunidades de melhoria |
| Análise de riscos | Riscos que se materializaram, eficácia das mitigações, riscos não previstos |
| Conformidade LGPD | Resumo do tratamento de dados, medidas de proteção adotadas, status de descarte |
| Descontinuidade | Resumo do plano executado, certificação de descarte, comunicações realizadas |
| Recomendações | Sugestões para política pública, regulamentação ou futuras implementações |

### 8.2 Relatório interno

Será produzido relatório interno complementar com:

- detalhamento técnico das ações de encerramento
- registro de decisões tomadas durante o processo
- análise de aderência entre o plano previsto e a execução realizada
- inventário de ativos descomissionados
- registro de eventuais intercorrências e seu tratamento

### 8.3 Prazo de entrega

| Relatório | Destinatário | Prazo |
|---|---|---|
| Relatório final ao MEC/SEAI | Órgão regulador | Até 30 dias após o encerramento operacional |
| Relatório interno | Comitê do piloto e responsável legal | Até 15 dias após o encerramento operacional |
| Certificação de descarte de dados | Responsável legal, responsável LGPD | Até 45 dias após o encerramento operacional |

---

## 9. Responsáveis

### 9.1 Matriz de responsabilidades do plano de descontinuidade

| Responsável | Atribuição |
|---|---|
| **Gestor do piloto** | Coordenar a execução do plano de descontinuidade; decidir sobre acionamento; aprovar comunicações e relatórios finais |
| **Responsável legal da entidade** | Autorizar formalmente o encerramento; assinar comunicações ao MEC/SEAI e certificação de descarte |
| **Equipe técnica** | Executar a desativação técnica fase a fase; realizar backups, exportações e eliminações; emitir certificação de descarte |
| **Responsável LGPD** | Supervisionar o descarte de dados pessoais; validar a certificação de descarte; assegurar conformidade com a política de retenção |
| **Direção das escolas** | Comunicar às equipes e à comunidade escolar; orientar a transição para canais alternativos |
| **Auditoria** | Verificar a completude das trilhas exportadas; validar relatórios finais; confirmar que não há dados remanescentes indevidos |
| **Comitê do piloto** | Deliberar sobre o encerramento; aprovar o relatório final; acompanhar a execução do plano |

### 9.2 Cadeia de acionamento

```
Evento de acionamento (regulatório, voluntário, risco ou inviabilidade)
    ↓
Gestor do piloto identifica e documenta o motivo
    ↓
Responsável legal autoriza formalmente o encerramento
    ↓
Comitê do piloto delibera em reunião extraordinária
    ↓
Equipe técnica inicia Fase 1 (contenção imediata)
    ↓
Gestor do piloto coordena comunicações (Seção 6)
    ↓
Equipe técnica executa Fases 2 a 5
    ↓
Responsável LGPD valida descarte de dados
    ↓
Auditoria verifica completude
    ↓
Relatórios finais são entregues
    ↓
Certificação de descarte é emitida e assinada
```

---

## 10. Quadro-Resumo do Plano de Descontinuidade

| Item exigido (Anexo III) | O que o plano contempla |
|---|---|
| Identificação da entidade e da solução | Seção 1 — dados da entidade, descrição da solução, componentes tecnológicos e categorias de dados tratados |
| Procedimentos de encerramento imediato | Seção 3 — 12 ações sequenciadas em duas fases (contenção em 24h e estabilização em 72h) |
| Desativação técnica | Seção 4 — cronograma em 5 fases (45 dias), procedimentos detalhados por componente (backend, frontend, banco, IA, auth, edge functions, repositório) |
| Mitigação de riscos remanescentes | Seção 5 — 8 riscos identificados com mitigação, checklist de verificação de riscos residuais |
| Comunicação às instituições | Seção 6 — plano de comunicação com 6 destinatários, conteúdo mínimo obrigatório e registro documental |
| Relatórios finais | Seção 8 — relatório ao MEC/SEAI (9 seções), relatório interno, prazos de entrega |
| Descarte seguro de dados | Seção 7 — 14 categorias de dados com procedimento e prazo, dados preservados para arquivo, certificação formal de descarte |
| Responsáveis | Seção 9 — 7 responsáveis com atribuições, cadeia de acionamento com 11 etapas |

---

**Data:** Março de 2026  
**Versão:** 1.0  
**Responsável:** Equipe de Desenvolvimento LAB-IA Educação

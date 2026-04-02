# PROJETO PRINCIPAL

## Assistente Inteligente de Atendimento Escolar com

## Governança Algorítmica

**Versão base do entregável**

Documento estruturado para diagramação em PDF institucional de 10 a 15 páginas.

## 1. Resumo Executivo

O projeto **Assistente Inteligente de Atendimento Escolar com Governança Algorítmica (LAB-IA)** é

uma plataforma digital em operação para apoiar redes públicas de ensino no atendimento institucional

a famílias, estudantes, servidores e gestores.

A solução combina atendimento assistido por inteligência artificial com mecanismos explícitos de

governança, rastreabilidade, auditoria e controle de acesso, reduzindo o risco de respostas

inconsistentes, ambíguas ou desalinhadas das normas institucionais.

Na prática, o projeto transforma o atendimento escolar em uma infraestrutura de conhecimento

governado. Em vez de operar como um chat genérico, a plataforma utiliza bases institucionais

versionadas, registros formais de auditoria, trilhas de evidência e perfis de acesso por função. Isso

permite que a IA responda consultas com maior aderência ao contexto da rede, preserve memória

organizacional e produza dados de gestão para melhoria contínua.

A plataforma já conta com um conjunto amplo de funcionalidades implementadas e operacionais:

```
backend em Node.js/Express com mais de 150 endpoints,
frontend administrativo com módulos especializados por área:
auditoria
incidentes
tratamentos
correções
base de conhecimento
conteúdo oficial
FAQ
relatórios
dashboard
```

```
autenticação e base de dados em Supabase com mais de 20 tabelas estruturantes,
hospedagem com Firebase Hosting e serviço de execução em Cloud Run.
```
O sistema opera com provedor de IA Groq ativo e arquitetura preparada para múltiplos provedores, o

que amplia flexibilidade tecnológica e reduz dependência de um único fornecedor.

Além do atendimento por IA, a plataforma implementa um ciclo completo de governança pós-resposta:

```
cada interação pode gerar eventos de auditoria, incidentes, correções propostas com fluxo de
aprovação por perfil, aplicação automática de ajustes na base de conhecimento, notificações
contextualizadas e trilha de histórico com timeline (linha do tempo) detalhada.
```
O sistema opera com 10 perfis institucionais distintos, controle de acesso por página e função, e

mecanismos de tratamento com roteamento por destino:

```
curadoria de conteúdo (curador secretaria, curador escola)
secretaria da educação (gestor)
operação de serviço (auditor externo, observador, coordenador, atendimento, secretaria escola)
conformidade da direção (diretor da escola)
administração do sistema (superadmin)
```
O valor público do projeto está em atacar um problema recorrente das redes educacionais: grande

volume de demandas repetitivas, descentralização da informação, sobrecarga das equipes

administrativas e dificuldade de garantir padrão, transparência e histórico nas respostas prestadas à

cidadania.

Ao organizar o conhecimento oficial e usar IA com governança, a rede ganha capacidade de resposta,

consistência institucional e inteligência de gestão.

A proposta de piloto sugere implantação controlada em uma rede ou conjunto reduzido de escolas, com

foco em atendimento público, secretaria escolar, curadoria de conteúdo oficial e acompanhamento de

indicadores operacionais e de confiança.

O objetivo não é substituir completamente a equipe humana, mas estruturar um modelo híbrido, em que

a IA atua como primeira camada de atendimento e a governança algorítmica assegura supervisão,

evidências, mitigação de alucinações e melhoria progressiva.

## 2. Problema Público

As redes públicas de ensino enfrentam um conjunto de gargalos no atendimento institucional que

afetam diretamente a experiência da cidadania e a eficiência administrativa. Em geral, famílias e

estudantes precisam de respostas sobre matrícula, documentos, calendário, horários, vagas,

procedimentos internos, pagamentos, comunicados e funcionamento de serviços escolares. Muitas


dessas respostas já existem em normativas, regulamentos, documentos internos e orientações

consolidadas, mas permanecem dispersas entre setores, pessoas e canais.

Esse cenário produz pelo menos seis problemas estruturais:

```
. Fragmentação da informação institucional
```
```
Autonomia Federativa (Art. 18 e 211 da CF/88)
```
```
A Constituição Federal estabelece o Regime de Colaboração, mas concede autonomia política,
administrativa e financeira aos entes (Estados e Municípios).
```
```
Como cada Secretaria de Educação (SME ou SEDUC) tem o poder de autogestão, elas criam seus
próprios fluxos internos, sistemas de dados e normas de atendimento. As orientações oficiais
ficam espalhadas em arquivos, grupos de mensagem, memórias individuais de servidores,
páginas desatualizadas e documentos sem versão clara.
```
```
A ausência de uma padronização nacional tecnológica para a comunicação escolar permite que
cada rede adote soluções isoladas, gerando a fragmentação.
```
```
. Sobrecarga operacional das equipes
Secretarias, Coordenações e Diretores de escola têm seus tempos consumidos respondendo
demandas repetitivas, o que reduz a capacidade de concentração em casos mais sensíveis ou
estratégicos.
```
```
. Baixa padronização no atendimento
Duas pessoas podem receber respostas diferentes para a mesma pergunta, dependendo do canal
utilizado, do servidor responsável ou da data da consulta.
```
```
. Pouca rastreabilidade
Na maioria dos fluxos atuais, a Secretaria não consegue responder com precisão quais perguntas^
foram feitas, que respostas foram emitidas, com base em qual fonte e qual foi o nível de confiança
associado.
```
```
. Dificuldade de transformar atendimento em inteligência de gestão
Atendimentos geram sinais importantes sobre dúvidas recorrentes, gargalos de serviço,
problemas de comunicação e necessidades de revisão normativa, mas esses sinais raramente são
tratados como insumo de gestão.
```
```
. Risco no uso indiscriminado de IA generativa
Sem governança, modelos de IA podem responder sem base institucional suficiente, gerar
informações equivocadas, omitir limites de competência ou tratar dados pessoais de forma
inadequada.
```
Em redes públicas de ensino, esse problema é ainda mais sensível porque envolve confiança

institucional, atendimento a famílias, potenciais dados de crianças e adolescentes e necessidade de


conformidade com regras de transparência, segurança da informação e LGPD. Portanto, a questão não

é apenas adotar IA, **mas adotar IA com controles compatíveis com o setor público**.

## 3. Solução Proposta

A solução consiste em uma plataforma de atendimento escolar com IA auditável, organizada em torno

de cinco pilares:

```
. Atendimento institucional assistido por IA
. Base de conhecimento e conteúdo oficial versionados
. Governança algorítmica com auditoria e evidência
. Ciclo de tratamento, correção e melhoria contínua
. Camada gerencial de indicadores e inteligência operacional
```
A plataforma opera com assistentes especializados por área institucional:

```
Assistente Público
Assistente da Secretaria
Assistente da Direção
Assistente Pedagógico (por disciplina)
```
Essa separação é importante porque evita uma IA única e sem distinção para todo tipo de demanda. Em

vez disso, o sistema direciona a interação para domínios administrativos ou pedagógicos mais adequados, aproximando

a resposta do contexto real da Escola.

A plataforma também incorpora um **Módulo de Apoio Pedagógico com IA Governada**, voltado inicialmente para a modalidade EJA (Educação de Jovens e Adultos). Esse módulo implementa um ciclo completo de curadoria, atendimento e governança pedagógica:

```
. Curadoria de conteúdo pedagógico: professores fazem upload de materiais didáticos (PDF, links,
roteiros), o sistema extrai automaticamente o texto do PDF, e o professor revisa e valida o
conteúdo em interface de comparação lado a lado. Um fluxo de aprovação garante que somente
conteúdo revisado por coordenação pedagógica seja publicado como base oficial para a IA.
. Chat do aluno com IA por disciplina: o estudante acessa um simulador de chat e seleciona a
disciplina desejada. A IA responde exclusivamente com base no material pedagógico aprovado
para aquela disciplina e turma, com as mesmas garantias de evidência, score de confiança e
rastreabilidade do atendimento institucional.
. Painel de governança pedagógica: professores e coordenadores visualizam as interações dos
alunos com a IA, filtram por disciplina, data e tipo de dúvida, acompanham incidentes pedagógicos
e acessam relatórios de temas mais consultados e lacunas de cobertura.
. Integração com gestão de incidentes: respostas pedagógicas inadequadas, dúvidas não resolvidas
ou feedbacks negativos geram incidentes no mesmo fluxo já existente na plataforma, com
severidade, quarentena, atribuição e tratamento formal.
```

Outro elemento central da solução é a distinção entre **base de conhecimento** e **conteúdo oficial**.

**A base de conhecimento** organiza perguntas, respostas, categorias e versões de fontes, com suporte a

importação de documentos, versionamento automático e suspensão de documentos-fonte.

**O conteúdo oficial** estrutura informações normativas e operacionais em quatro módulos — calendário,

matrícula, FAQ e avisos — com escopo de Secretaria ou Escola, status de publicação (rascunho,

publicado, arquivado) e histórico de versões vinculado a auditoria.

Na prática, isso cria um mecanismo formal para que a Secretaria ou a Escola publique o que é

referência oficial e mantenha histórico do que foi atualizado.

O sistema também conta com um **módulo de FAQ estruturado** , com CRUD completo, capacidade de

teste antes da publicação, detecção de conflitos e publicação direta para a base de conhecimento.

O projeto não trata a resposta da IA como uma "caixa-preta". Cada interação registra:

```
conversa institucional com contexto de escola e assistente
mensagem de entrada e saída
resposta emitida pelo assistente com fonte principal
```

```
conjunto de evidências consultadas
score de confiança e score de evidência
nível de risco de alucinação
necessidade de revisão humana e fallback recomendado
evento formal de auditoria com status de revisão
feedback do operador (útil, não útil, incorreto)
eventual incidente com severidade, tipo e quarentena
correção proposta com fluxo de aprovação e aplicação automática
```
#### 3.1 Ciclo de Governança Pós-Resposta

Um diferencial importante da plataforma é o **ciclo de tratamento e correção** implementado como parte

nativa do produto. Quando uma resposta da IA gera um evento de auditoria ou incidente, o sistema

aciona um fluxo estruturado:

```
. Abertura e roteamento : O evento é classificado e direcionado para um dos quatro destinos de
tratamento — curadoria de
conteúdo, secretaria da rede, operação de serviço ou conformidade da direção — conforme a
natureza do problema.
```
```
. Tratamento por perfil : A fila de tratamentos (treatment-inbox) exibe apenas os itens
pertinentes ao perfil do usuário logado. Secretarias veem itens de operação; direção vê itens de
conformidade; auditores veem o panorama completo.
```
```
. Proposta de correção : Perfis autorizados podem propor correções formais, incluindo texto
corrigido, análise de causa-raiz (entre 7 categorias), ação recomendada (criar fonte, atualizar
fonte, ajustar prompt, entre outras) e registro de antes/depois na base de conhecimento.
```
```
. Aprovação hierárquica : Correções propostas entram em status PENDING_APPROVAL. A
```
```
aprovação é feita por perfil de direção ou gestão, que valida o conteúdo antes da aplicação.
```
```
. Aplicação automática na base : Após aprovação, o sistema pode aplicar automaticamente a
correção na base de conhecimento ou FAQ, com registro de snapshot antes/depois e vínculo ao
evento de auditoria original.
```
```
. Trilha de histórico : Cada etapa do ciclo gera eventos-filhos vinculados ao evento original
(source_event_id), formando uma timeline detalhada visível no painel de auditoria.
```
Esse desenho caracteriza a governança algorítmica como parte nativa do produto, e não como etapa

posterior. A plataforma foi concebida para que o uso da IA gere ao mesmo tempo atendimento e

capacidade de supervisão, correção e melhoria contínua.


### 4. Arquitetura do Sistema

#### 4.1 Visão Geral

A plataforma opera com uma arquitetura modular composta por:

```
Frontend administrativo e páginas do atendimento em public/dist
Backend de orquestração e APIs em server.js com mais de 150 endpoints
```
```
Camada de autenticação, banco e armazenamento lógico via Supabase (PostgreSQL)
Hospedagem do frontend via Firebase Hosting
Execução do backend via serviço configurado no Firebase para Cloud Run ( serviceId:
lab- ia )
```
```
Serviços internos de IA, chat e auditoria sob o diretório .qodo
```
Essa arquitetura permite separar experiência do usuário, lógica de negócio, persistência e camada de

inteligência.


#### 4.2 Camada de Apresentação

O frontend é composto por páginas HTML administrativas e módulos JavaScript específicos. As telas

implementadas no projeto incluem:

```
dashboard com indicadores operacionais e de
governança atendimento via webchat institucional
auditoria formal com painel de detalhes e timeline de histórico
```
```
fila de tratamentos com roteamento por perfil
painel de incidentes com severidade, quarentena e vínculo a
respostas painel de correções com fluxo de proposta, aprovação e
aplicação
base de conhecimento com versionamento e importação de fontes
```
```
conteúdo oficial em quatro módulos (calendário, matrícula, FAQ,
avisos) módulo de FAQ com teste, conflito e publicação
relatórios com análise por período, assistente e lacunas de conhecimento
```
```
gerenciamento de usuários com perfis, convites e permissões por
página preferências de provedor de IA
quadro de avisos
```
```
fila de handoff humano
```
```
curadoria de conteúdo pedagógico com upload de PDF, extração assistida,
comparação lado a lado e fluxo de aprovação por coordenação
simulador de chat com IA por disciplina para estudantes
painel de governança pedagógica com visualização de sessões, filtros e KPIs
```
#### 4.3 Camada de Aplicação

```
O backend em Node.js/Express centraliza:
```
```
autenticação e resolução de contexto institucional por escola e papel
validação de papel de acesso com 10 perfis institucionais e 2 perfis de
plataforma APIs para base de conhecimento com versionamento e importação
de fontes
APIs para conteúdo oficial com escopo de rede e escola
APIs para FAQ com teste, detecção de conflito e publicação
APIs de tratamento com máquina de estados (OPEN → IN_PROGRESS → PENDING_APPROVAL
→
COMPLETED)
APIs de incidentes com severidade, quarentena e atribuição
```

```
APIs de correções com proposta, aprovação e aplicação automática na
base APIs de configuração de provedores de IA
APIs de dashboard, relatórios e lacunas de
conhecimento APIs de notificações com tópicos e
deep-links
integração com o webchat e fila de handoff humano
registro de eventos formais de auditoria com timeline de histórico
APIs de conteúdo pedagógico com upload de PDF, extração assistida e
versionamento
APIs de chat do aluno com IA por disciplina, sessões, histórico e feedback
APIs de governança pedagógica com resumo, sessões, detalhes e incidentes
```
O backend implementa validação do contexto autenticado para derivar escola e papel do

usuário a partir da sessão, essencial para o modelo multi unidade e para a conformidade

LGPD.

#### 4.4 Camada de Dados

O schema principal e os snippets SQL configuram uma modelagem robusta alinhada ao objetivo do

produto. As tabelas estruturantes incluem:

```
schools e networks (hierarquia institucional)
platform_members e school_members (afiliação e perfis)
```
```
role_page_permissions e user_page_permissions (controle de acesso granular)
```
```
source_documents e knowledge_source_versions (fontes com versionamento)
knowledge_base (base de conhecimento com categorias)
institutional_consultations e consultation_messages (conversas)
assistant_responses (respostas com scores e evidência)
```
```
formal_audit_events (trilha formal com status de revisão e tratamento)
```
```
interaction_feedback (feedback por tipo)
interaction_source_evidence (evidências vinculadas a respostas)
```
```
incident_reports (incidentes com severidade, tipo e quarentena)
incident_assignments (atribuições com notificação)
official_content_records (conteúdo oficial com versões)
```
```
ai_provider_settings (configuração de provedores)
intelligence_snapshots (snapshots de inteligência operacional)
```

```
notification_queue (notificações com tópicos e deep-links)
```
```
faq_entries (FAQ estruturado com escopo)
handoff_queue (fila de encaminhamento humano)
```
```
teaching_content (conteúdo pedagógico com disciplina, série, turma e status de
aprovação)
teaching_content_versions (versões de conteúdo pedagógico com texto validado e
metadados de PDF)
```
Em termos de arquitetura informacional, o projeto registra o ciclo completo entre conhecimento

institucional, resposta da IA, governança pós-resposta, inteligência gerencial e apoio pedagógico governado.

#### 4.5 Camada de Governança e Segurança

Um diferencial importante da arquitetura é a presença de mecanismos de governança nativos e

operacionais:

```
controle por 10 perfis institucionais (direção, secretaria, coordenação, tesouraria, professor,
auxiliar, auditor, curadoria, operação, portaria) mais 2 perfis de plataforma (superadmin,
auditor de plataforma)
separação entre perfil operacional e perfil de governança com permissões por
página trilha formal de auditoria com status de revisão (PENDING_REVIEW,
REVIEWED,
KNOWLEDGE_CREATED, etc.)
fluxo de tratamento com máquina de estados e roteamento por destino
correções formais com proposta, aprovação hierárquica e aplicação
automática registros de evidência por resposta com score de confiança e risco
abertura de incidentes com severidade, tipo, quarentena e atribuição
feedback estruturado sobre respostas (útil, não útil, incorreto)
notificações contextualizadas com deep-links para eventos relevantes
sistema de convites com tokens e status de usuário (rascunho, pendente, convidado, ativo,
desativado)
plano técnico de adequação LGPD com minimização de dados e segregação por escola
```
A base arquitetural implementada favorece uma implantação segura por fases, com amadurecimento

progressivo de isolamento por escola e proteção de dados.


### 5. Uso de IA

### Papel da IA na Solução

```
A IA é o motor de triagem e resposta do atendimento, e não atua no projeto como um recurso
ornamental. Ela opera apoiada por conhecimento institucional e controles de segurança. O papel
esperado da IA inclui:
```
```
responder perguntas recorrentes da comunidade escolar
apoiar setores administrativos com atendimento padronizado
recuperar conhecimento institucional estruturado
reduzir tempo médio de resposta
sinalizar quando não há base suficiente para responder
encaminhar casos para revisão quando o nível de evidência for insuficiente
apoiar estudantes com dúvidas pedagógicas por disciplina, respondendo
exclusivamente com base em material didático aprovado pela coordenação
```
#### 5.1 Provedores e Flexibilidade Tecnológica

```
O sistema opera com arquitetura de provedores configurável. No momento, está ativo:
```
```
Groq (modelos open-source de alta performance)
```
```
A arquitetura suporta a adição de outros provedores open-source com pouca alteração estrutural.
Essa opção pode ser relevante para o setor público por três motivos:
```
```
reduz dependência tecnológica de um único fornecedor
permite calibração de custo e desempenho por cenário de uso
facilita adaptação a requisitos futuros de contratação ou política institucional
favorece o uso de modelos open-source, alinhado a diretrizes de soberania digital
```
#### 5.2 IA com Evidência e Mitigação de Alucinação

```
O núcleo mais importante da governança algorítmica está no tratamento da evidência. O sistema
implementa regras que calculam score de evidência, score de confiança, nível de risco e
necessidade de revisão. Quando a base institucional não é suficiente, o sistema pode:
```
```
abster-se de responder plenamente
classificar o caso como de alto risco
```

```
marcar revisão requerida
sinalizar fallback humano
registrar evento formal relacionado à mitigação de
alucinação encaminhar para fila de handoff humano
```
Após a resposta, o ciclo de governança continua ativo: o sistema permite que auditores, gestores e

operadores abram incidentes com diferentes severidades, proponham correções formais com análise

de causa-raiz e apliquem automaticamente ajustes na base de conhecimento ou FAQ, fechando o

ciclo entre detecção de problema e correção efetiva.

Isso é particularmente importante em contexto escolar, onde respostas imprecisas sobre matrícula,

frequência, documentos, pagamentos ou procedimentos internos podem gerar retrabalho,

desinformação ou conflito com famílias. O mesmo princípio se aplica ao atendimento pedagógico: a IA

responde ao aluno exclusivamente com base no material didático aprovado pelo professor e validado

pela coordenação, evitando que conteúdo não revisado ou hallucinations do modelo generativo

comprometam o apoio ao estudo.

#### 5.3 IA Auditável

O projeto registra atributos que tornam a resposta explicável dentro do contexto operacional da
rede:

```
qual assistente respondeu
qual foi a mensagem origem
```
```
qual versão de fonte foi usada
quais evidências sustentam a resposta
qual foi o score de confiança
se houve recomendação de revisão humana
```
```
o status de revisão do evento de auditoria (pendente, revisado, conhecimento criado,
etc.)
```
```
se houve incidente, com severidade e tipo
se houve correção proposta, quem propôs, quem aprovou e se foi aplicada na
base
se houve feedback do operador e qual tipo
a timeline completa de eventos-filhos vinculados ao evento original
```
Em termos de maturidade institucional, isso significa sair do paradigma de "IA responde" para o

paradigma de "IA responde com rastreabilidade e ciclo de melhoria".


#### 5.4 Limites e Cuidados

É importante explicitar que a IA **NÃO substitui a decisão administrativa formal, ato**

**normativo ou análise humana em situações sensíveis**.

O projeto implementa essa direção ativamente:

```
revisão humana obrigatória em fluxos de maior risco
abertura de incidentes com severidade e quarentena de
respostas
```
```
trilha de auditoria com timeline de histórico
correções formais com aprovação hierárquica antes da
aplicação
plano LGPD com minimização de dados e segregação por escola
```
O projeto LAB-IA é apenas um **apoio ‘governado’ ao atendimento** , e não deve ser tratado como

automação irrestrita.


### 6. Benefícios para a Rede Pública

Os benefícios esperados para o setor público podem ser organizados em quatro dimensões.

#### 6.1 Benefícios Operacionais

```
redução do volume de respostas manuais para demandas repetitivas nas Escolas e Secretarias
de Educação
aumento da disponibilidade do atendimento institucional
```
```
maior padronização nas orientações prestadas
melhor distribuição do trabalho entre secretaria, gestão e curadoria
```
#### 6.2 Benefícios para a Cidadania

```
resposta mais rápida para famílias e
estudantes maior clareza sobre informações
oficiais
melhoria da experiência de atendimento
diminuição da dependência de canais informais para obter orientações
apoio pedagógico acessível para estudantes da EJA, com IA que responde dúvidas
com base no material aprovado pelo professor
```
#### 6.3 Benefícios Gerenciais

```
visão consolidada das dúvidas mais frequentes
identificação de gargalos operacionais e normativos
capacidade de revisar conteúdos oficiais com base no uso
real apoio à decisão por meio de dashboards e relatórios
painel de governança pedagógica com visão das interações dos alunos com a IA,
temas mais consultados e incidentes pedagógicos
```
#### 6.4 Benefícios Institucionais e de Governança

```
memória institucional organizada
trilha de auditoria sobre respostas automatizadas
registro de evidência para justificativa de respostas
condições mais robustas para conformidade, transparência e controle interno
```
Em uma rede pública, esse conjunto de benefícios é especialmente valioso porque une ganho de

eficiência com fortalecimento de confiança institucional. O projeto não busca apenas "atender mais",

mas "atender melhor, com mais controle e melhor capacidade de prestação de contas".


### 7. Escalabilidade

O projeto foi concebido com características que favorecem a escalabilidade funcional, institucional e
tecnológica.

#### 7.1 Escalabilidade por Unidade Escolar

```
A modelagem com schools , school_members , configurações por escola e trilhas por
school_id indica que a plataforma foi desenhada para operar em mais de uma unidade ou rede,
```
```
com segregação lógica dos dados. Isso é essencial para expandir de um piloto para múltiplas
escolas.
```
#### 7.2 Escalabilidade por Domínio de Atendimento

```
O uso de assistentes especializados permite ampliar gradualmente a cobertura funcional. A rede
pode iniciar pelo atendimento público e secretaria escolar e, depois, expandir para tesouraria,
direção, coordenação pedagógica, transporte, alimentação escolar ou outros domínios. O módulo
de apoio pedagógico com IA governada já demonstra essa escalabilidade horizontal: cada
disciplina pode ter sua própria base de conteúdo curado, sem exigir alterações na arquitetura.
```
#### 7.3 Escalabilidade por Conhecimento

```
Como a plataforma trabalha com documentos-fonte, versões e sincronização para base de
conhecimento, a expansão não depende apenas de treinar modelos. Ela depende de ampliar e curar
o acervo institucional. Isso torna a escalabilidade mais governável, pois a qualidade da resposta
cresce junto com a qualidade da base documental.
```
#### 7.4 Escalabilidade Tecnológica

```
O suporte a múltiplos provedores de IA e a separação entre frontend, backend e banco trazem
flexibilidade de evolução. O projeto pode:
```
```
trocar ou comparar provedores
ajustar modelos por custo ou
desempenho distribuir carga por serviço
ampliar relatórios e módulos sem reconstruir toda a base
```

#### 7.5 Condições para Escalar com Segurança

```
Para uma escalabilidade sustentável, alguns itens devem acompanhar a expansão:
```
RLS completo nas tabelas centrais
consolidação do contexto autenticado por escola
sanitização ativa de PII (CPF, e-mail, telefone) antes do envio ao provedor de IA ✅
política de retenção e expurgo
rotina de curadoria institucional
governança de incidentes e revisões

```
Ou seja, a escalabilidade do projeto deve ser tratada como crescimento com controle, e não apenas
como aumento de volume.
```
### 8. Plano de Implementação Piloto

#### 8.1 Objetivo do Piloto

```
Validar a efetividade da plataforma em ambiente controlado de rede pública, medindo:
```
```
capacidade de atendimento
qualidade percebida das respostas
aderência a fontes institucionais
impacto na carga operacional das equipes
```
```
funcionamento dos mecanismos de governança
```
#### 8.2 Escopo Sugerido

```
Sugere-se um piloto com:
```
```
1 rede ou secretaria municipal/estadual parceira
1 a 3 escolas participantes
2 frentes iniciais de atendimento: público geral e secretaria
escolar 1 equipe de curadoria institucional
1 equipe de gestão ou auditoria acompanhando governança e conformidade
```

#### 8.3 Fases do Piloto

**Fase 1 - Preparação institucional (2 a 3 semanas)**

Mapeamento de processos prioritários, definição de perfis de acesso, seleção de documentos-base,

classificação inicial de conteúdo oficial e validação do protocolo do piloto.

**Fase 2 - Implantação técnica controlada (2 semanas)**

Configuração do ambiente, publicação das primeiras fontes, parametrização do provedor de IA,

ajustes de interface e validação dos acessos por perfil.

**Fase 3 - Operação assistida (4 a 6 semanas)**

Entrada em uso real com acompanhamento próximo da equipe do projeto, revisão de respostas,

coleta de feedback, abertura de incidentes quando necessário e calibração da base.

**Fase 4 - Avaliação e consolidação (2 semanas)**

Análise dos indicadores, comparação com linha de base operacional, registro de aprendizados,

definição de melhorias e decisão sobre ampliação.

#### 8.4 Entregas Mínimas do Piloto

```
base inicial de conhecimento institucional publicada e versionada
módulos de conteúdo oficial ativados (calendário, matrícula, FAQ,
avisos) atendimento webchat operante com assistentes por área
painel de auditoria funcional com detalhes, timeline e tratamento
fila de tratamentos com roteamento por perfil
painel de incidentes com severidade, quarentena e atribuição
fluxo de correções com proposta, aprovação e aplicação
automática dashboard de indicadores operacionais e de
governança
módulo de curadoria de conteúdo pedagógico com upload, extração e aprovação
simulador de chat pedagógico com IA por disciplina
painel de governança pedagógica com sessões e incidentes
relatório consolidado de indicadores do piloto
```
```
plano de melhorias para próxima rodada
```

#### 8.5 Governança do Piloto

```
Recomenda-se um comitê enxuto de acompanhamento com representação de:
```
```
gestão da rede
secretaria escolar
curadoria de conteúdo
TI ou transformação digital
controle interno, jurídico ou encarregado de dados, quando aplicável
```
### 9. Métricas de Impacto

```
Entendemos que as métricas de impacto devem combinar eficiência operacional, qualidade da
resposta, segurança do uso da IA e valor institucional. O próprio projeto já apresenta base de dados
e endpoints que favorecem essa mensuração.
```
#### 9.1 Métricas Operacionais

```
total de consultas recebidas
percentual de consultas
resolvidas
```
tempo médio até a primeira

resposta

tempo médio de resolução

```
distribuição por canal e por assistente
temas mais frequentes por período
```

#### 9.2 Métricas de Qualidade e Confiança

```
percentual de respostas com fonte principal
identificada
score médio de confiança
score médio de evidência
percentual de respostas com revisão requerida
percentual de respostas com fallback humano
recomendado
```
```
percentual de feedback útil, não útil e incorreto
```
#### 9.3 Métricas de Governança

```
número de eventos formais de auditoria registrados
número de incidentes abertos por período e por
severidade
```
```
tempo médio de resolução de incidentes
número de correções propostas, aprovadas e aplicadas
percentual de correções com aplicação automática na
base
```
```
percentual de respostas corrigidas após revisão
taxa de consultas com rastreabilidade completa
número de tratamentos por destino (curadoria, secretaria, operação,
conformidade)
```
```
tempo médio de transição entre estados de tratamento
```

#### 9.3.1 Métricas de Governança Pedagógica

```
número de conteúdos pedagógicos publicados por disciplina
taxa de aprovação vs reprovação de conteúdos pela coordenação
número de sessões de chat pedagógico por disciplina e período
temas mais consultados pelos estudantes por disciplina
taxa de feedback positivo vs negativo nas interações pedagógicas
número de incidentes pedagógicos registrados e resolvidos
tempo médio entre upload de material e publicação aprovada
```
#### 9.4 Métricas de Valor Público

```
redução de demandas repetitivas para a
secretaria
percepção de satisfação de usuários e operadores
ampliação do acesso a informações oficiais
identificação de temas que exigem revisão normativa ou comunicacional
```

#### 9.5 Linha de Base e Avaliação

```
Para que o piloto possa começar a rodar, recomendamos registrar uma linha de base anterior ao uso
da plataforma, incluindo:
```
```
volume médio de atendimentos
tempo médio de resposta manual
canais mais utilizados
```
principais dúvidas recorrentes

```
capacidade atual de rastreabilidade
```
### 9.6 Licenciamento Open Source

Em conformidade com o art. 36 do Edital nº 1/2026 do Sandbox Regulatório de Inteligência Artificial na Educação (MEC/SEAI), a entidade proponente declara que o código-fonte, os componentes técnicos, os pipelines de inferência, a documentação técnica e os artefatos desenvolvidos no âmbito do Sandbox Regulatório serão disponibilizados sob a licença **Apache License 2.0**.

| Item | Detalhe |
|------|------|
| Licença adotada | Apache License 2.0 |
| Escopo | Código-fonte, pipelines de inferência, documentação técnica e artefatos desenvolvidos no âmbito do Sandbox |
| Arquivo de licença | `LICENSE` na raiz do repositório |
| Justificativa | Interoperabilidade, auditabilidade, reuso público e aderência ao art. 36 do edital |
| Dependências de terceiros | Componentes de terceiros mantêm licenciamento próprio (ex: AdminLTE — MIT, Supabase — Apache 2.0, Express — MIT) |

Permanecem resguardados os direitos sobre componentes de terceiros sujeitos a licenciamento próprio, bem como eventuais restrições legais aplicáveis a segredos protegidos por lei e componentes não passíveis de sublicenciamento. A propriedade intelectual será preservada nos termos do edital, com observância integral das condições de abertura, interoperabilidade, auditabilidade e reusabilidade exigidas pelo programa.

### 10. Conclusão

```
O projeto Assistente Inteligente de Atendimento Escolar com Governança Algorítmica
(LAB-IA) apresenta uma proposta em desenvolvimento e aderente a uma necessidade concreta do
setor público educacional: modernizar o atendimento sem abrir mão de controle, memória
institucional e responsabilidade administrativa.
```
```
O diferencial estratégico do projeto não está apenas no uso de IA, mas na forma como esse uso foi
estruturado. Ao combinar conhecimento versionado, assistentes por área, trilha de auditoria,
evidência por resposta, ciclo de tratamento e correção com aprovação hierárquica, perfis de acesso
granulares, aplicação automática de ajustes na base, relatórios e plano de adequação LGPD, a
solução se posiciona como uma infraestrutura de atendimento governado, e não como um chatbot
genérico.
```
```
O estado atual do projeto demonstra base técnica sólida e funcionalidades operacionais para um
piloto realista. Há arquitetura definida, mais de 20 entidades de dados coerentes com o objetivo
institucional, módulos de conhecimento e conteúdo oficial com versionamento, mecanismos de
auditoria com timeline de histórico, ciclo completo de tratamento e correção, gestão de incidentes
com quarentena, notificações contextualizadas e indicadores de inteligência operacional. A plataforma
também incorpora um módulo de apoio pedagógico com IA governada, com curadoria de conteúdo
por disciplina, chat do aluno com respostas ancoradas no material aprovado pelo professor,
painel de governança pedagógica e integração com a gestão de incidentes existente. A
consolidação do piloto segue acompanhada de amadurecimento em segurança, segregação por
escola e proteção de dados.
```
```
Para as redes públicas de ensino, o projeto oferece uma oportunidade concreta de transformar
atendimento em capacidade institucional: responder melhor, aprender com o uso, corrigir
prontamente, reduzir sobrecarga e criar transparência sobre o comportamento da IA. O módulo
pedagógico estende essa capacidade para o contexto de sala de aula, permitindo que estudantes
da EJA acessem apoio baseado em IA sob supervisão direta de professores e coordenação. Se bem
conduzido, o piloto pode se tornar referência de como aplicar inteligência artificial em serviços
educacionais com foco em confiança, responsabilidade e impacto público.
```

# Plano de Descontinuidade Preliminar

```
Campo Conteúdo
```
```
Nome do projeto Assistente Inteligente de Atendimento Escolar com Governança Algorítmica
```
```
Plataforma LAB-IA Educação
```
```
Natureza da
solução
```
```
Plataforma de atendimento institucional com IA auditável para redes públicas de
educação
```
```
Público atendido Famílias, estudantes, servidores e gestores de redes públicas de educação
```
```
Escopo do piloto 1 a 3 escolas, 2 frentes de atendimento (público e secretaria), 4 assistentes
especializados, módulo de apoio pedagógico com IA governada (EJA)
```
## 1.3 Componentes tecnológicos da solução

```
Componente Provedor Função
```
```
Backend (API e
orquestração)
```
```
Google Cloud Platform
— Cloud Run
```
```
Processamento de requisições, APIs,
orquestração de IA
```
```
Frontend (interface
administrativa)
```
```
Google / Firebase —
Firebase Hosting
Distribuição de páginas e assets estáticos
```
```
Banco de dados
```
```
Supabase —
PostgreSQL
gerenciado
```
```
Persistência de dados (consultas, respostas,
auditoria, conhecimento, usuários)
```
```
Autenticação Supabase Auth Controle de sessão e identidade (JWT)
```
```
Provedor de IA
(respostas)
```
```
Groq — Llama 3.3 70B
Versatile
```
```
Geração de respostas automatizadas
```
```
Edge Functions
Supabase — Deno
runtime
Operações serverless (convites, embeddings)
```
```
Containerização
Docker — node:20-
alpine
Empacotamento padronizado
```
## 1.4 Dados tratados pela solução

```
Categoria de dados Exemplos Natureza
```
```
Dados cadastrais de
membros
Nome, email, papel, escola vinculada Dados pessoais
```

```
Categoria de dados Exemplos Natureza
```
```
Identificadores de
solicitantes
Nome e contato informados no atendimento Dados pessoais
```
```
Mensagens de
atendimento
Texto das consultas e respostas
Dados pessoais
(potencial)
```
```
Metadados de
auditoria
```
```
Score de confiança, evidências, risco de alucinação,
fonte principal
```
```
Dados operacionais
```
```
Base de conhecimento Documentos institucionais, versões, categorias Dados institucionais
```
```
Conteúdo oficial Calendário, matrícula, FAQ, avisos Dados institucionais
```
```
Conteúdo pedagógico Material didático por disciplina/turma, versões, texto
validado, metadados de PDF
Dados institucionais
```
```
Interações pedagógicas Sessões de chat do aluno com IA por disciplina,
histórico de dúvidas e respostas
Dados pessoais
(potencial)
```
```
Incidentes e feedbacks Registros de erro, severidade, tratamento Dados operacionais
```
```
Configuração de IA Provedor, modelo, parâmetros por escola Dados de
configuração
```
## 2. Hipóteses de Acionamento do Plano

O presente plano será acionado em qualquer das seguintes situações:

```
. Encerramento regular do período de Sandbox — término do prazo de participação sem
renovação ou transição para regime permanente
. Decisão regulatória — determinação do MEC, da SEAI ou de outro órgão competente para
encerrar o teste
. Decisão voluntária da entidade — opção da entidade proponente por descontinuar a solução
. Risco grave identificado — ocorrência de incidente de segurança, vazamento de dados ou falha
sistêmica que justifique interrupção imediata
. Inviabilidade operacional — impossibilidade de manter infraestrutura, equipe ou condições
mínimas de operação
. Descumprimento de condições do Sandbox — verificação de que a operação não atende aos
requisitos regulatórios estabelecidos
```
## 3. Procedimentos de Encerramento Imediato

#### 3.1 Ações de contenção (primeiras 24 horas)

```
Ordem Ação Responsável
```
##### 1

```
Suspender o acesso público aos assistentes de IA (desativar canal de
atendimento)
```
```
Equipe
técnica
```

```
Ordem Ação Responsável
```
```
2 Exibir mensagem informativa no canal de atendimento, redirecionando para
canais humanos da escola
```
```
Equipe
técnica
```
```
3 Bloquear criação de novas consultas e interações automatizadas
Equipe
técnica
```
##### 4

```
Notificar a direção, a gestão da rede e o comitê do piloto sobre o
acionamento do plano
```
```
Gestor do
piloto
```
##### 5

```
Preservar estado atual do banco de dados e dos logs (congelamento de
snapshot)
```
```
Equipe
técnica
```
```
6 Registrar o motivo, a data e o responsável pelo acionamento do plano de
descontinuidade
```
```
Gestor do
piloto
```
#### 3.2 Ações de estabilização (48 a 72 horas)

```
Ordem Ação Responsável
```
```
7 Revogar tokens de acesso e sessões ativas de todos os usuários Equipe técnica
```
```
8 Desativar convites pendentes de ingresso na plataforma Equipe técnica
```
```
9 Suspender Edge Functions (convites, embeddings) Equipe técnica
```
```
10 Revogar chaves de API dos provedores de IA (Groq) Equipe técnica
```
```
11 Manter o backend em modo somente leitura para extração de
relatórios finais
```
##### 12

```
Comunicar formalmente às escolas participantes sobre o
encerramento e o cronograma previsto
```
```
Gestor do piloto +
direção
```
## 4. Desativação Técnica

#### 4.1 Cronograma de desativação

```
Fase Prazo Descrição
```
```
Fase 1 — Contenção
Dia 0
(imediato)
```
```
Suspensão do atendimento automatizado e bloqueio de novas
interações
```
```
Fase 2 — Estabilização Dias 1 a 3 Revogação de acessos, suspensão de integrações, modo
somente leitura
```
```
Fase 3 — Extração e
relatórios
Dias 4 a 14
Geração de relatórios finais, exportação de dados
necessários, backups definitivos
```

```
Fase Prazo Descrição
```
```
Fase 4 — Descarte de
dados
```
```
Dias 15 a
30
```
```
Eliminação segura de dados pessoais conforme política de
retenção
```
```
Fase 5 —
Descomissionamento
```
```
Dias 31 a
45
```
```
Remoção de serviços de nuvem, encerramento de contas e
registros finais
```
#### 4.2 Procedimentos por componente

**4.2.1 Backend (Cloud Run)**

```
Etapa Ação
```
```
Fase 1 Desativar endpoints de atendimento por IA; manter endpoints administrativos para extração
```
```
Fase
3
Exportar logs do Cloud Run para arquivo definitivo
```
```
Fase
5
```
```
Excluir o serviço Cloud Run e a imagem Docker associada
```
**4.2.2 Frontend (Firebase Hosting)**

```
Etapa Ação
```
```
Fase 1 Substituir conteúdo por página de aviso de encerramento com redirecionamento
```
```
Fase 5 Remover o site do Firebase Hosting e excluir o target de deploy
```
**4.2.3 Banco de dados (Supabase)**

```
Etapa Ação
```
```
Fase 2 Congelar banco em modo somente leitura
```
```
Fase 3 Realizar backup completo e exportação de dados para arquivo seguro
```
```
Fase 4 Executar scripts de eliminação de dados pessoais (ver Seção 7)
```
```
Fase 5 Encerrar a instância Supabase após confirmação de descarte completo
```
**4.2.4 Provedores de IA (Groq e Google AI)**

```
Etapa Ação
```
```
Fase 1 Suspender chamadas à API
```
```
Fase 2 Revogar chaves de API
```

```
Etapa Ação
```
```
Fase 5 Encerrar contas ou remover o projeto dos provedores
```
**4.2.5 Autenticação (Supabase Auth)**

```
Etapa Ação
```
```
Fase 2 Revogar todas as sessões e tokens; desativar login
```
```
Fase 4 Eliminar registros de autenticação e convites
```
```
Fase 5 Encerrar junto com a instância Supabase
```
**4.2.6 Edge Functions**

```
Etapa Ação
```
```
Fase 2 Desativar funções de convite e embedding
```
```
Fase 5 Excluir funções do projeto Supabase
```
**4.2.7 Repositório de código**

```
Etapa Ação
```
```
Fase
3
Gerar tag/release final com estado do código no momento do encerramento
```
```
Fase
5
```
```
Arquivar repositório (modo somente leitura) — não excluir, para ns de auditoria e prestação
de contas
```
## 5. Mitigação de Riscos Remanescentes

#### 5.1 Riscos identificados na descontinuidade

```
Risco Nível Mitigação
```
```
Interrupção abrupta
do atendimento ao
público
```
```
Alto
Mensagem de redirecionamento imediata no canal; comunicação
prévia às escolas com orientação sobre canais alternativos
```
```
Perda de dados antes
do backup
```
```
Crítico
Congelamento de snapshot antes de qualquer ação de
modificação; backup completo na Fase 3
```

```
Risco Nível Mitigação
```
```
Dados pessoais
remanescentes após
encerramento
```
```
Alto
Execução de scripts de eliminação com verificação; certificação
de descarte pela equipe técnica
```
```
Dados retidos por
provedores de IA Médio
```
```
Revogação imediata de chaves de API; o provedor ativo (Groq) não
retém dados de inferência; verificação das políticas de retenção
dos provedores
```
```
Perda de trilhas de
auditoria antes de
relatório final de auditoria, incidentes, feedbacks
e correções antes de qualquer eliminação
```
```
Dependência
operacional das
escolas
```
```
Médio
```
```
Período de transição com comunicação gradual; orientação sobre
retorno aos fluxos anteriores de atendimento
```
```
Acesso indevido
durante o período de
encerramento
```
```
Médio
Revogação de tokens e sessões na Fase 2; desativação de login;
modo somente leitura
```
```
Obrigações legais de
guarda de dados Médio
```
```
Dados necessários para auditoria, defesa de direitos ou
cumprimento legal são preservados em arquivo seguro com
acesso restrito antes do descarte dos demais
```
#### 5.2 Verificação de riscos residuais

Antes de concluir o descomissionamento (Fase 5), a equipe técnica e o gestor do piloto devem verificar:

```
Todos os dados pessoais foram eliminados ou pseudonimizados conforme a política
Nenhuma chave de API permanece ativa
Nenhuma sessão de usuário permanece ativa
Os backups de auditoria estão armazenados em local seguro com acesso restrito
Os provedores de IA não retêm dados da plataforma
As escolas foram formalmente comunicadas e orientadas
O relatório final foi entregue ao MEC/SEAI
```
## 6. Comunicação às Instituições

#### 6.1 Plano de comunicação

```
Destinatário Momento Canal Conteúdo
```
```
MEC / SEAI /
Órgão
regulador
```
```
Imediatamente
após decisão de
encerramento
```
```
Ofício formal
```
```
Motivo do encerramento, data prevista, resumo
do plano de descontinuidade, compromisso com
relatório final
```

```
Destinatário Momento Canal Conteúdo
```
```
Direção das
escolas
participantes
```
```
Em até 48 horas
```
```
Comunicado
formal +
reunião
```
```
Motivo, cronograma de encerramento,
orientação sobre canais alternativos de
atendimento, compromisso com descarte de
dados
```
```
Secretaria e
equipe
operacional
```
```
Em até 48 horas
```
```
Comunicado
interno +
orientação
```
```
Suspensão do uso da plataforma,
procedimentos de transição, esclarecimento de
dúvidas
```
```
Famílias e
comunidade
escolar
```
```
Em até 5 dias
úteis
```
```
Comunicado
via escola
```
```
Encerramento do canal de IA, canais
alternativos disponíveis, garantia de proteção de
dados
```
```
Equipe
técnica Imediatamente
```
```
Reunião +
checklist
operacional
```
```
Ativação do plano, distribuição de
responsabilidades, cronograma fase a fase
```
```
Comitê do
piloto
Imediatamente
Reunião
extraordinária
```
```
Deliberação sobre o encerramento,
acompanhamento do plano, aprovação de
relatórios
```
#### 6.2 Conteúdo mínimo da comunicação às escolas

Toda comunicação de encerramento às escolas participantes deve conter, no mínimo:

```
. Identificação da entidade e da solução encerrada
. Motivo do encerramento (regulatório, voluntário, técnico ou por risco)
. Data efetiva de suspensão do atendimento automatizado
. Orientação sobre canais alternativos de atendimento disponíveis
. Garantia de que os dados pessoais serão eliminados conforme a política de retenção
. Informação sobre o direito de acesso aos dados antes do descarte
. Contato do responsável para esclarecimentos
```
#### 6.3 Registro da comunicação

Todas as comunicações de encerramento devem ser documentadas com:

```
data de envio
destinatário
canal utilizado
conteúdo ou referência ao documento enviado
confirmação de recebimento, quando possível
```
## 7. Descarte Seguro de Dados


#### 7.1 Princípios do descarte

O descarte de dados observa os seguintes princípios:

```
. Finalidade encerrada : dados cuja finalidade de tratamento cessou devem ser eliminados
. Obrigação legal preservada : dados necessários para cumprimento de obrigação legal ou defesa
de direitos são mantidos em arquivo restrito
. Proporcionalidade : o descarte deve ser proporcional à natureza do dado e ao risco residual
. Irreversibilidade : a eliminação de dados pessoais deve ser irreversível — não basta desativar o
acesso
. Rastreabilidade do descarte : toda operação de eliminação deve ser registrada
```
#### 7.2 Procedimentos de descarte por categoria de dados

```
Categoria Dados Procedimento Prazo
```
```
Sessões em
memória
(RAM)
```
```
Sessões temporárias de
atendimento
```
```
Descartadas automaticamente
com a desativação do serviço
```
```
Fase
1
```
```
Mensagens de
atendimento
```
```
consultation_messages
```
```
Eliminação irreversível após
exportação agregada para relatório
nal
```
```
Fase
4
```
```
Consultas
institucionais
```
```
institutional_consultatio
ns
```
```
Eliminação irreversível; preservar
apenas contagem agregada para
relatório
```
```
Fase
4
```
```
Respostas
automatizadas
```
```
assistant_responses
```
```
Preservar amostra anonimizada
para relatório final; eliminar
restante
```
```
Fase
4
```
```
Dados
cadastrais de
membros
```
```
school_members,
platform_members
```
```
Eliminação irreversível após
confirmação de que não há
obrigação de guarda
```
```
Fase
4
```
```
Trilhas de
auditoria
```
```
formal_audit_events,
interaction_source_eviden
ce
```
```
Exportar para arquivo seguro com
acesso restrito; eliminar do banco
```
```
Fase
4
```
```
Feedbacks e
incidentes
```
```
interaction_feedback,
incident_reports
```
```
Exportar para relatório final
anonimizado; eliminar do banco
```
```
Fase
4
```
```
Base de
conhecimento
```
```
knowledge_base,
knowledge_source_versions,
source_documents
```
```
Conteúdo institucional devolvido à
rede/escola; registros eliminados
do banco
```
```
Fase
4
```
```
Conteúdo
oficial
```
```
official_content_records Conteúdo devolvido à rede/escola;
registros eliminados do banco
```
```
Fase
4
```

```
Categoria Dados Procedimento Prazo
```
```
Configuração
de IA
```
```
ai_provider_settings Eliminação completa Fase
4
```
```
Registros de
autenticação
Supabase Auth
Eliminação completa com
encerramento da instância
```
```
Fase
5
```
```
Convites e
tokens
```
```
Tokens de convite, API keys Revogação e eliminação
```
```
Fase
2 /
Fase
5
```
```
Logs de
aplicação
Cloud Run logs
Exportar período do piloto para
arquivo; excluir do console
```
```
Fase
5
```
```
Backups
automáticos
Supabase backups
```
```
Solicitar exclusão ao Supabase
após confirmação de arquivo
definitivo
```
```
Fase
5
```
#### 7.3 Dados preservados para arquivo

Os seguintes dados serão preservados em arquivo seguro, com acesso restrito e prazo definido, para

fins de auditoria, relatório final e eventual prestação de contas:

```
Dado preservado Formato Prazo de guarda Acesso
```
```
Relatório final consolidado PDF 5 anos
Gestor do piloto,
responsável legal
```
```
Trilhas de auditoria
exportadas
```
```
JSON ou CSV
anonimizado
```
```
24 meses após
encerramento
```
```
Equipe técnica,
auditoria
```
```
Amostra anonimizada de
respostas
```
```
JSON ou CSV
24 meses após
encerramento
```
```
Equipe técnica
```
```
Registro de comunicações de
encerramento
```
```
PDF 5 anos Gestor do piloto,
responsável legal
```
```
Tag final do repositório de
código
Git archive
Indefinido (sem
dados pessoais)
Equipe técnica
```
```
Certificação de descarte de
dados
PDF assinado 5 anos
Responsável legal,
LGPD
```
#### 7.4 Certificação de descarte

Ao término da Fase 4, a equipe técnica emitirá documento formal de certificação de descarte

contendo:

```
. Lista dos conjuntos de dados eliminados
```

```
. Método de eliminação utilizado (DELETE irreversível, DROP TABLE, exclusão de instância)
. Data e hora da operação
. Confirmação de que os dados não são recuperáveis
. Identificação do responsável técnico pela execução
. Identificação do responsável institucional pela autorização
```
## 8. Relatórios Finais

#### 8.1 Relatório final ao MEC / SEAI

Será produzido relatório final consolidado contendo, no mínimo:

```
Seção Conteúdo
```
```
Identificação Entidade, solução, período de participação no Sandbox
```
```
Resumo executivo Objetivos do piloto, escopo executado, principais resultados
```
```
Indicadores
operacionais
```
```
Volume de atendimentos, taxa de confiança, taxa de abstinência, fallback
humano, cobertura da base
```
```
Indicadores de
governança
```
```
Incidentes registrados, feedbacks, correções aplicadas, tratamentos
realizados
```
```
Lições aprendidas Principais achados sobre eficácia, limitações e oportunidades de melhoria
```
```
Análise de riscos Riscos que se materializaram, eficácia das mitigações, riscos não previstos
```
```
Conformidade LGPD Resumo do tratamento de dados, medidas de proteção adotadas, status de
descarte
```
```
Descontinuidade
Resumo do plano executado, certificação de descarte, comunicações
realizadas
```
```
Recomendações Sugestões para política pública, regulamentação ou futuras implementações
```
#### 8.2 Relatório interno

Será produzido relatório interno complementar com:

```
detalhamento técnico das ações de encerramento
registro de decisões tomadas durante o processo
análise de aderência entre o plano previsto e a execução realizada
inventário de ativos descomissionados
registro de eventuais intercorrências e seu tratamento
```

#### 8.3 Prazo de entrega

```
Relatório Destinatário Prazo
```
```
Relatório final ao MEC/SEAI Órgão regulador
Até 30 dias após o encerramento
operacional
```
```
Relatório interno Comitê do piloto e
responsável legal
```
```
Até 15 dias após o encerramento
operacional
```
```
Certificação de descarte de
dados
```
```
Responsável legal,
responsável LGPD
```
```
Até 45 dias após o encerramento
operacional
```
## 9. Responsáveis

#### 9.1 Matriz de responsabilidades do plano de descontinuidade

```
Responsável Atribuição
```
```
Gestor do piloto
Coordenar a execução do plano de descontinuidade; decidir sobre acionamento;
aprovar comunicações e relatórios finais
```
```
Responsável
legal da entidade
```
```
Autorizar formalmente o encerramento; assinar comunicações ao MEC/SEAI e
certificação de descarte
```
```
Equipe técnica
Executar a desativação técnica fase a fase; realizar backups, exportações e
eliminações; emitir certificação de descarte
```
```
Responsável
LGPD
```
```
Supervisionar o descarte de dados pessoais; validar a certificação de descarte;
assegurar conformidade com a política de retenção
```
```
Direção das
escolas
```
```
Comunicar às equipes e à comunidade escolar; orientar a transição para canais
alternativos
```
```
Auditoria
Verificar a completude das trilhas exportadas; validar relatórios finais;
confirmar que não há dados remanescentes indevidos
```
```
Comitê do piloto
Deliberar sobre o encerramento; aprovar o relatório final; acompanhar a
execução do plano
```

#### 9.2 Cadeia de acionamento


## 10. Quadro-Resumo do Plano de Descontinuidade

```
Item exigido (Anexo
III)
O que o plano contempla
```
```
Identificação da
entidade e da
solução
```
```
Seção 1 — dados da entidade, descrição da solução, componentes
tecnológicos e categorias de dados tratados
```
```
Procedimentos de
encerramento
imediato
```
```
Seção 3 — 12 ações sequenciadas em duas fases (contenção em 24h e
estabilização em 72h)
```
```
Desativação técnica
Seção 4 — cronograma em 5 fases (45 dias), procedimentos detalhados por
componente (backend, frontend, banco, IA, auth, edge functions, repositório)
```
```
Mitigação de riscos
remanescentes
```
```
Seção 5 — 8 riscos identificados com mitigação, checklist de verificação de
riscos residuais
```
```
Comunicação às
instituições
```
```
Seção 6 — plano de comunicação com 6 destinatários, conteúdo mínimo
obrigatório e registro documental
```
```
Relatórios finais
Seção 8 — relatório ao MEC/SEAI (9 seções), relatório interno, prazos de
entrega
```
```
Descarte seguro de
dados
```
```
Seção 7 — 14 categorias de dados com procedimento e prazo, dados
preservados para arquivo, certificação formal de descarte
```
```
Responsáveis Seção 9 — 7 responsáveis com atribuições, cadeia de acionamento com 11
etapas
```

# ANEXO VI - TERMO DE COMPROMISSO DO

# INTERESSADO

**Edital 1 (6673004) SEI 23000.056786/2025-81 / pg. 17**

**Nome da Entidade:** RICARDO FRANCO CUSTODIO TECNOLOGIA DA INFORMACAO LTDA - ME

**CNPJ:** 44.650.266/0001-55

**Endereço:** Alameda Rio Negro 503, Sala 2020, Alphaville, Barueri/SP

**CEP:** 06454-000

**Telefone:** (61) 98259-3803

**E-mail:** desenvolvedor.ricardo@gmail.com^

**Dirigente responsável:** Ricardo Franco Custodio

**CPF:** 694.540.861-20

**Endereço:** [SQB Quadra 02 Bloco i Apto 603, Guara I, DF]

**CEP:** 71009-055

**Telefone:** (61) 98259-3803

**E-mail:** desenvolvedor.ricardo@gmail.com

Declaro, como dirigente responsável pela entidade acima identificada, que esta organização:

I – **ESTOU CIENTE E CONCORDO** com as disposições previstas no Edital de Chamamento Público para

Piloto do Sandbox Regulatório e que se responsabiliza, sob as penas da Lei, pela veracidade e

legitimidade das informações e documentos apresentados durante o processo de seleção, bem como

que atenderá plenamente às exigências nele contidas; e

II - A entidade dispõe de capacidade técnica (estrutura tecnológica e operacional) e econômica para

execução da solução de IA proposta pela entidade supramencionada no âmbito do Sandbox Regulatório

do MEC.

**ESTOU CIENTE** de que o Ministério da Educação (MEC) não fornecerá recursos técnicos e financeiros

para o desenvolvimento dos projetos aprovados no âmbito do Sandbox Regulatório e não disponibilizará

infraestrutura tecnológica ou ambiente em nuvem para a execução do projeto selecionado.

_(Edital 1 (6673004) SEI 23000.056786/2025-81 / pg. 18)_

Local/UF, 30 de março de 2026.

##### ___________________________________________________


**Assinatura**

**Ricardo Franco Custodio**

**Representante Legal**


# ANEXO IV — MODELO DE PROJETO DE IA

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governança Algorítmica

**Documento:** Respostas ao Modelo de Projeto de IA (Anexo IV do Edital)

**Finalidade:** Atender à exigência de submissão de projeto descrevendo a solução de IA para o Sandbox

Regulatório

**Versão:** 1.0

**Data:** Março de 2026

## 1. Qual o título/nome atribuído à sua solução de IA?

**Assistente Inteligente de Atendimento Escolar com Governança Algorítmica**

A solução é operada por meio da plataforma **LAB-IA Educação** , que integra atendimento institucional

assistido por inteligência artificial com mecanismos nativos de governança, auditoria, rastreabilidade e

supervisão humana posterior.

## 2. Qual a principal área de aplicação da sua solução de

## IA?

A solução atua em três áreas de aplicação complementares, dentre as previstas no edital:

```
Área de
aplicação
```
```
Justificativa
Gestão
educacional
(principal)
```
```
A plataforma organiza o atendimento institucional de redes públicas de educação,
estruturando conhecimento oficial, padronizando respostas, produzindo indicadores
gerenciais e criando trilhas de auditoria sobre o atendimento prestado pela IA
```
```
Inovação
pública
digital
```
```
A solução implementa um modelo de IA auditável com governança algorítmica nativa,
demonstrando como tecnologia generativa pode operar em ambiente público com
controle, transparência e responsabilidade institucional
```
```
Acesso,
permanência
e êxito
escolar
```
```
Ao ampliar e padronizar o acesso à informação institucional (matrícula, calendário,
documentos, procedimentos), a plataforma contribui para reduzir barreiras de
acesso e desinformação que afetam famílias e estudantes. O módulo de apoio
pedagógico com IA governada estende esse benefício ao contexto de sala de aula,
oferecendo aos estudantes — inicialmente da modalidade EJA — um canal de dúvidas
assistido por IA, com respostas ancoradas no material didático aprovado pelo
professor e supervisionadas pela coordenação pedagógica
```

## 3. Como a sua solução de IA se beneficiará da

## participação no Sandbox Regulatório?

A participação no Sandbox Regulatório beneficiará a solução em cinco dimensões:

```
. Validação institucional em ambiente controlado — O Sandbox oferece o enquadramento
regulatório necessário para testar a solução em rede pública real com supervisão do MEC, o que
seria inviável como iniciativa isolada da entidade.
```
```
. Calibração de governança algorítmica — A operação em ambiente regulado permitirá calibrar
thresholds de evidência, regras de abstinência, políticas de revisão humana e mecanismos de
escalonamento com base em dados reais de uso, sob acompanhamento regulatório.
```
```
. Amadurecimento da conformidade LGPD — O contexto do Sandbox exige rigor adicional em
proteção de dados, segregação por escola, minimização em prompts e atendimento a direitos do
titular, acelerando a consolidação dessas camadas na plataforma.
```
```
. Evidência para política pública — Os dados e indicadores gerados durante o piloto — taxa de
confiança, abstinência, incidentes, correções, lacunas de cobertura — podem servir como insumo
para futuras diretrizes do MEC sobre uso de IA em redes de educação.
```
```
. Teste de modelo replicável — A solução foi projetada com segregação por escola e configuração
por provedor. O Sandbox permitirá verificar se esse desenho é viável como modelo replicável em
outras redes, secretarias ou contextos educacionais.
```
## 4. Qual o TRL (Technology Readiness Level) da sua

## solução de IA?

**TRL 6 — Demonstração de sistema em ambiente relevante (pré-operacional)**

Justificativa:

```
Critério Estado atual
```
```
Código-fonte
Backend com mais de 150 endpoints operacionais, frontend com mais de 15
módulos de interface
```
```
Infraestrutura Ambiente de produção configurado em Cloud Run (GCP), Firebase Hosting,
Supabase PostgreSQL (sa-east-1)
```
```
Banco de dados Mais de 20 tabelas estruturantes com schema formalizado
```

```
Critério Estado atual
```
```
Autenticação e
acesso
```
```
Supabase Auth com JWT, RBAC com 12 perfis, permissões granulares por página
```
```
IA operacional Provedor Groq ativo (Llama 3.3 70B Versatile), arquitetura multiprovedores
```
```
Governança
Trilha de auditoria, feedback, incidentes, tratamentos, correções com aprovação
e aplicação automática
```
```
Base de
conhecimento
```
```
Documentos versionados, conteúdo oficial estruturado em 4 módulos
(calendário, matrícula, FAQ, avisos), conteúdo pedagógico curado por
disciplina com extração assistida de PDF e fluxo de aprovação
```
```
Deploy
Pipeline automatizado, container Docker, ambiente de desenvolvimento
configurado
```
```
Validação com
usuários reais
```
```
Ainda não realizada — o sistema nunca operou com usuários reais de
rede pública de ensino. A validação controlada em ambiente institucional
real é justamente o objetivo da participação no Sandbox.
```
A plataforma não é protótipo nem prova de conceito. É um sistema funcional com funcionalidades

implementadas e arquitetura completa, em condições de operar em piloto institucional real. Contudo,

nunca foi submetida a operação com usuários reais de rede pública de ensino. Essa lacuna — a

validação controlada em ambiente institucional real — é justamente o que o Sandbox se propõe a

preencher, o que posiciona a solução em fase inicial de operação pré-piloto (TRL 6), aderente ao

Art. 11, I do edital.

## 5. Quais os principais componentes arquiteturais da sua

## solução e que modelos de IA são utilizados?

#### 5.1 Componentes arquiteturais

```
Componente Tecnologia Função
```
```
Backend (API e
orquestração)
```
```
Node.js ≥18 / Express 5.1.0 em Cloud
Run (GCP)
```
```
Processamento de requisições, APIs
REST, orquestração de IA, auditoria e
governança
```
```
Frontend
administrativo
```
```
JavaScript Vanilla, Bootstrap 4.6.2,
AdminLTE 3.2, jQuery 3.6.0 em
Firebase Hosting
```
```
Interface de gestão com mais de 15
módulos especializados
```
```
Banco de dados
```
```
Supabase PostgreSQL gerenciado,
região São Paulo (sa-east-1)
```
```
Persistência de dados (consultas,
respostas, auditoria, conhecimento,
usuários)
```
```
Autenticação Supabase Auth (JWT)
Controle de sessão, identidade e
derivação de contexto autenticado
```
```
Provedor de IA
(respostas)
Groq — Llama 3.3 70B Versatile
Geração de respostas automatizadas
com grounding institucional
```
```
Edge Functions Supabase — Deno runtime
Operações serverless complementares
(convites, embeddings)
```

```
Componente Tecnologia Função
```
```
Containerização Docker — node:20-alpine
Empacotamento padronizado para
deploy
```
#### 5.2 Modelos de IA utilizados

```
Modelo Provedor Função Características
```
```
Llama
3.3 70B
Versatile
```
```
Groq
```
```
Geração de
respostas
dos
assistentes
```
```
Modelo open-source de alta performance; não há ne-tuning
— a especialização ocorre por grounding institucional,
prompts governados e thresholds de evidência
```
#### 5.3 Arquitetura de decisão da IA

O modelo generativo não opera isoladamente. A resposta é produto de uma cadeia composta:

Consulta do usuário

→ Roteamento por área institucional (heurístico)

→ Busca textual e semântica na base de conhecimento local

→ Avaliação de evidência (thresholds: 0.58 / 0.78)

→ Decisão: responder, responder com ressalva ou abster-se

→ Prompt governado com regras explícitas de comportamento

→ Modelo generativo externo (Groq)

No módulo de apoio pedagógico, a cadeia segue a mesma lógica com escopo específico:

Dúvida do estudante (chat por disciplina)

→ Identificação da disciplina e turma

→ Busca na base de conteúdo pedagógico aprovado para aquela disciplina

→ Avaliação de evidência (mesmos thresholds: 0.58 / 0.78)

→ Decisão: responder, responder com ressalva ou abster-se

→ Prompt governado com regras de comportamento pedagógico

→ Modelo generativo externo (Groq)

→ Registro de sessão, feedback e eventual incidente pedagógico

→ Resposta auditável com score, fonte, risco e trilha

A plataforma suporta múltiplos provedores de IA com configuração por escola, o que permite trocar ou

comparar provedores sem alteração estrutural do sistema.

#### 5.4 Licenciamento Open Source

Em conformidade com o art. 36 do Edital nº 1/2026, o código-fonte, os componentes técnicos, os pipelines de inferência, a documentação técnica e os artefatos desenvolvidos no âmbito do Sandbox Regulatório serão disponibilizados sob a licença **Apache License 2.0**.

A escolha pela Apache 2.0 se fundamenta em:
- licença permissiva recomendada pelo edital
- proteção explícita contra litígios de patente
- compatibilidade com componentes de terceiros utilizados (AdminLTE — MIT, Supabase — Apache 2.0, Express — MIT)
- equilíbrio entre abertura, interoperabilidade e preservação de propriedade intelectual

O sistema opera integralmente com modelos open-source (Llama 3.3 70B Versatile via Groq), sem dependência de modelos proprietários fechados, o que evidencia independência tecnológica e ausência de vinculação comercial preferencial.

## 6. Quais os objetivos da sua solução de IA?

#### 6.1 Objetivo geral

Apoiar redes públicas de educação no atendimento institucional a famílias, estudantes, servidores e

gestores, combinando inteligência artificial com governança algorítmica nativa para produzir respostas

rastreáveis, auditáveis e ancoradas em conhecimento oficial.

#### 6.2 Objetivos específicos


```
. Reduzir o volume de atendimentos manuais repetitivos — automatizar respostas a consultas
recorrentes sobre matrícula, calendário, documentos, procedimentos e horários, liberando
equipes para casos mais sensíveis ou estratégicos.
```
```
. Padronizar a informação prestada pela rede — garantir que famílias e servidores recebam
orientações consistentes, independentemente do canal, do servidor ou do horário da consulta.
```
```
. Estruturar a memória institucional da rede — organizar documentos, normativas e orientações
em base versionada, com histórico de atualizações e rastreabilidade de fontes.
```
```
. Implementar governança algorítmica como parte nativa do produto — registrar trilha de
auditoria, evidências, score de confiança, risco de alucinação, feedbacks, incidentes,
tratamentos e correções por cada interação da IA.
```
```
. Produzir inteligência de gestão a partir do atendimento — identificar temas recorrentes, lacunas
documentais, gargalos operacionais e oportunidades de melhoria por meio de indicadores e
relatórios.
```
```
. Demonstrar modelo replicável de IA governada em educação pública — produzir evidência sobre
viabilidade, limites e boas práticas para uso de IA generativa em serviços educacionais com
transparência e responsabilidade.
```
```
. Apoiar o estudo de estudantes da EJA com IA pedagógica governada — oferecer um canal de
dúvidas por disciplina com respostas ancoradas no material didático aprovado pelo professor,
sob supervisão da coordenação pedagógica e com integração nativa à gestão de incidentes.
```
## 7. Quais os benefícios da sua solução de IA para a

## sociedade?

#### 7.1 Benefícios para famílias e estudantes

```
Acesso mais rápido e padronizado a informações institucionais da escola
Redução da dependência de canais informais (grupos de mensagem, ligações avulsas) para obter
orientações
Maior clareza sobre procedimentos de matrícula, rematrícula, transferência, calendário e
documentos
Diminuição de deslocamentos desnecessários por falta de informação prévia
Apoio pedagógico acessível para estudantes da EJA, com IA que responde dúvidas sobre o
conteúdo da disciplina com base no material aprovado pelo professor
```
#### 7.2 Benefícios para a rede de educação

```
Redução da sobrecarga operacional de secretarias e equipes administrativas com demandas
repetitivas
Maior distribuição do trabalho entre setores, com triagem automatizada de consultas
Padronização das respostas institucionais, reduzindo contradições entre canais e servidores
Memória institucional organizada, com documentos versionados e histórico de atualizações
Governança pedagógica com painel de acompanhamento das interações dos alunos com a IA,
permitindo ao professor intervir quando necessário
```

#### 7.3 Benefícios para a gestão pública

```
Indicadores de atendimento com visão consolidada de temas recorrentes, gargalos e lacunas
Dados para revisão de comunicações institucionais, normativas e procedimentos internos
Dashboard de governança com métricas de confiança, abstinência, incidentes e correções
Capacidade de avaliar o comportamento da IA com base em evidências concretas, e não apenas
em percepção
```
#### 7.4 Benefícios para a política pública

```
Evidência empírica sobre como aplicar IA generativa em serviços educacionais com governança
Modelo documentado de governança algorítmica que pode servir de referência para outras redes
e secretarias
Dados para subsidiar futuras diretrizes do MEC sobre uso responsável de IA na educação
Demonstração de que é possível combinar inovação tecnológica com controle, auditoria e
proteção de dados
```
## 8. Quais os riscos (inclusive éticos) já foram mapeados

## e quais medidas foram tomadas para mitigá-los?

#### 8.1 Riscos mapeados e mitigações implementadas

**Riscos de resposta e governança da IA**

```
Risco Nível Mitigação implementada
```
```
Alucinação informacional
— resposta sem base
institucional suficiente
```
```
Alto
```
```
Thresholds de evidência (0.58 e 0.78), abstinência
automática quando não há fonte conável, resposta
conservadora em casos intermediários, registro de risco
de alucinação por resposta
```
```
Desatualização da base —
resposta apoiada em
conteúdo vencido
```
```
Médio/Alto
Versionamento de documentos e fontes, curadoria
contínua, monitoramento de lacunas por relatório
```
```
Interpretação excessiva
de norma — IA produz
leitura conclusiva ou
indevida
```
```
Alto
```
```
Delimitação de escopo por assistente, regras de prompt
que proíbem inventar normas ou prazos, revisão humana
obrigatória em temas sensíveis
```
```
Uso da IA fora do escopo
autorizado
Alto
Mensagens de limite, roteamento conservador, política de
uso responsável, exclusão de temas sensíveis
```

```
Risco Nível Mitigação implementada
```
```
Excesso de confiança do
usuário — resposta
tratada como decisão
oficial
```
```
Médio/Alto
Avisos de que a resposta não substitui ato administrativo
formal, linguagem orientativa, supervisão posterior
```
```
Dependência excessiva da
IA sem revisão humana
```
```
Alto
Checkpoints de governança, trilha de auditoria,
obrigatoriedade de revisão em casos sinalizados
```
**Riscos éticos**

```
Risco Nível Mitigação implementada
```
```
Viés de cobertura documental — IA responde
melhor sobre temas bem documentados, pior
sobre temas ausentes
```
```
Alto
```
```
Relatório de lacunas de cobertura,
curadoria ativa, indicadores por tema
```
```
Viés de formulação linguística — usuários com
menor capacidade de formular perguntas
recebem respostas menos adequadas
```
```
Médio
```
```
Recuperação semântica (não apenas
textual), prompts com instrução de
compreensão contextual
```
```
Exclusão por canal — atendimento apenas por
texto limita acessibilidade
```
```
Médio
Reconhecido como limitação do piloto;
planejada ampliação futura de canais
```
```
Viés de conservadorismo — abstinência
excessiva pode impedir respostas que um
humano consideraria seguras
```
```
Médio
Calibração de thresholds com base em
dados reais do piloto; revisão periódica
```
```
Tratamento inadequado de dados de menores Alto
```
```
Minimização de dados, segregação por
escola, plano LGPD com medidas
específicas, supervisão por responsável
LGPD
```
**Riscos de dados e segurança**

```
Risco Nível Mitigação implementada
```
```
Vazamento de dado pessoal Crítico
Controle por perfil (RBAC), segregação por escola, HTTPS,
tokens JWT, sistema de convites
```
```
Acesso indevido entre escolas Crítico
```
```
Isolamento por school_id, contexto autenticado
derivado da sessão
```
```
Dados pessoais transitados a
provedores de IA
Alto
Provedor Groq não retém dados de inferência; plano de
minimização/máscara antes do envio
```
#### 8.2 Documentação de riscos produzida

O projeto conta com documentação formal e detalhada de riscos:


```
Relatório de Impacto Algorítmico (RIA) — análise completa da lógica decisória, riscos,
mitigações, limites de uso e supervisão humana
Avaliação de Impacto de Proteção de Dados (DPIA/LGPD) — mapeamento de dados tratados,
finalidades, armazenamento, política de retenção e direitos do titular
Matriz de Riscos e Mitigação do Piloto — riscos operacionais com detecção, responsáveis e
gatilhos de interrupção
Model Card da IA — limitações, vieses conhecidos, nível de confiança e recomendações de uso
responsável
Política de Uso Responsável da IA — limites de uso, supervisão e governança ética
```
## 9. Como foi feita a coleta e tratamento dos dados?

#### 9.1 Natureza dos dados

A solução não realiza coleta massiva de dados externos. Os dados tratados são gerados no contexto da

própria operação do atendimento institucional:

```
Categoria Exemplos Origem
```
```
Dados cadastrais
de membros
```
```
Nome, email, papel, escola
vinculada
```
```
Cadastro institucional via convite
controlado
```
```
Identificadores de
solicitantes
```
```
Nome e contato informados no
atendimento
```
```
Fornecidos pelo próprio usuário ao iniciar
consulta
```
```
Mensagens de
atendimento
```
```
Texto das consultas e respostas Gerados durante a interação com os
assistentes
```
```
Metadados de
auditoria
```
```
Score de confiança, evidências,
risco de alucinação
```
```
Calculados automaticamente pelo sistema
a cada resposta
```
```
Base de
conhecimento
```
```
Documentos, normativas,
orientações institucionais
```
```
Inseridos e curados pela equipe
institucional (curadoria e secretaria)
```
```
Conteúdo oficial
Calendário, matrícula, FAQ,
avisos
```
```
Publicados pela rede/escola por meio dos
módulos da plataforma
```
```
Feedbacks e
incidentes
```
```
Registros de erro, severidade,
tratamento
```
```
Gerados por operadores e supervisores
durante a operação
```
```
Conteúdo
pedagógico
```
```
Material didático por disciplina,
texto validado pelo professor,
metadados de PDF
```
```
Inseridos por professores com aprovação
da coordenação pedagógica
```
```
Interações
pedagógicas
```
```
Sessões de chat do aluno com IA
por disciplina, histórico de
dúvidas e respostas
```
```
Gerados durante a interação do estudante
com o assistente pedagógico
```
#### 9.2 Processo de tratamento

O tratamento dos dados segue o ciclo funcional do atendimento:

```
. Ingresso controlado — membros são cadastrados por convite com token único, sem autocadastro
. Contexto autenticado — escola, papel e permissões são derivados automaticamente da sessão
```

```
. Atendimento governado — cada interação gera registro de mensagens, resposta, evidências,
score e auditoria
. Segregação por escola — todas as entidades possuem school_id para isolamento lógico
. Supervisão e melhoria — feedbacks, incidentes e correções alimentam ciclo de governança pós-
resposta
```
#### 9.3 Base institucional

A base de conhecimento que sustenta as respostas da IA é composta por documentos institucionais

fornecidos pela própria rede de educação. Esses documentos são importados, versionados e

publicados pela curadoria institucional. O sistema registra título, versão, checksum e data de cada

fonte, permitindo rastreabilidade completa da origem das respostas.

## 10. A sua aplicação de IA utiliza dados pessoais,

## definidos conforme o art. 5º, incisos I e II da Lei Geral de

## Proteção de Dados (Lei nº 13.709/2018), ou apenas

## dados anonimizados?

A aplicação **utiliza dados pessoais** , conforme definidos no art. 5º, inciso I, da LGPD.

#### 10.1 Dados pessoais tratados

```
Dado pessoal Finalidade Base legal aplicável
```
```
Nome e email de membros Autenticação, controle de acesso e
responsabilização
```
```
Execução de contrato /
legítimo interesse
```
```
Nome e contato de
solicitantes
```
```
Identificação no atendimento
institucional
```
```
Legítimo interesse /
consentimento
```
```
Mensagens de texto das
consultas
```
```
Atendimento, registro de trilha e
auditoria
Legítimo interesse
```
```
Metadados de interação (IP,
timestamps)
```
```
Segurança e rastreabilidade
operacional
```
```
Legítimo interesse
```
#### 10.2 Dados potencialmente sensíveis

O sistema não coleta sistematicamente dados sensíveis (art. 5º, inciso II). Contudo, reconhece que o

conteúdo de mensagens livres **pode conter** dados sensíveis inseridos pelo próprio usuário


(informações de saúde, dados de menores, situações disciplinares). Por essa razão, todas as

mensagens são tratadas como campo de risco ampliado, com medidas de proteção reforçadas.

#### 10.3 Dados não pessoais

A maior parte dos dados tratados pela plataforma é institucional e não pessoal: documentos

normativos, orientações administrativas, conteúdo oficial, configurações de IA e indicadores

operacionais.

#### 10.4 Dados anonimizados e sanitização na camada de inferência

O sistema não opera exclusivamente com dados anonimizados, mas implementa **sanitização ativa de dados pessoais (PII stripping) na camada de inferência**. Antes de qualquer mensagem ser enviada ao provedor de IA (Groq), um filtro automático detecta e substitui por placeholders neutros:

- **CPF** — padrões `XXX.XXX.XXX-XX` e variantes → `[CPF_REMOVIDO]`
- **E-mail** — endereços de e-mail → `[EMAIL_REMOVIDO]`
- **Telefone** — números com DDD, +55 e variantes → `[TELEFONE_REMOVIDO]`

Essa sanitização é aplicada tanto à mensagem do usuário quanto ao histórico de conversação enviado como contexto. O prompt de sistema (system prompt) não contém dados pessoais — apenas instruções pedagógicas, nome da disciplina, catálogo de materiais e trechos do material didático (dados institucionais).

Adicionalmente, o identificador do usuário que interage com a IA é registrado no banco como `"Aluno"` (hardcoded), sem vincular nome, e-mail ou qualquer dado identificável à sessão de chat enviada ao provedor.

Há também plano técnico formalizado para anonimização e pseudonimização em ciclo de vida dos dados, incluindo anonimização posterior de registros históricos para fins de métricas.

## 11. Que medidas você utilizou para proteger os direitos

## fundamentais dos titulares dos dados?

#### 11.1 Medidas implementadas

```
Direito / Princípio Medida adotada
```
```
Finalidade e
adequação
```
```
Dados são coletados e tratados exclusivamente para atendimento
institucional, governança e operação do sistema — sem finalidades comerciais,
de perfilamento ou marketing
```
```
Necessidade e
minimização
```
```
Ingresso por convite controlado (sem autocadastro); sessões temporárias com
expiração por inatividade (30 minutos); camada ativa de sanitização de PII
(CPF, e-mail, telefone) com remoção automática antes do envio ao provedor
de IA (ver Seção 10.4)
```
```
Transparência
```
```
Avisos de que a resposta é automatizada e não substitui ato administrativo
formal; documentação pública de governança incluindo RIA, DPIA, Model Card e
Política de Uso Responsável
```
```
Segurança
```
```
HTTPS em todos os ambientes; JWT para autenticação; RBAC com 12 perfis e
permissões granulares; segregação por escola; backups automáticos;
variáveis sensíveis em ambiente protegido
```
```
Não discriminação Análise de vieses conhecidos documentada no Model Card (viés de cobertura,
linguístico, de conservadorismo); medidas de mitigação previstas
```
```
Acesso e correção
```
```
Plano para implementação de fluxo de atendimento a direitos do titular
(confirmação, acesso, correção, eliminação), conforme estrutura
data_subject_requests prevista no plano LGPD
```

```
Direito / Princípio Medida adotada
```
```
Limitação de
retenção
```
```
Política de retenção proposta com prazos por categoria de dado (sessões: 30
min; mensagens: 6-12 meses; auditoria: 24 meses; membros: enquanto durar
vínculo)
```
```
Responsabilização
Trilha formal de auditoria por cada resposta da IA; registro de responsáveis por
ações no sistema; eventos de governança vinculados a autoria
```
#### 11.2 Medidas em consolidação

```
RLS (Row Level Security) completo em todas as tabelas centrais do banco
Fluxo operacional de atendimento a direitos do titular (portal ou canal dedicado)
Política técnica formalizada de descarte e anonimização em ciclo de vida
```

#### 11.3 Sanitização de PII na camada de inferência (implementada)

A camada de comunicação com o provedor de IA (`askAI`) inclui um filtro de sanitização que opera em
tempo real antes de cada chamada à API. O mecanismo:

1. **Intercepta** a mensagem do usuário e o histórico de conversação
2. **Detecta** padrões de dados pessoais via expressões regulares (CPF, e-mail, telefone)
3. **Substitui** por placeholders neutros (`[CPF_REMOVIDO]`, `[EMAIL_REMOVIDO]`, `[TELEFONE_REMOVIDO]`)
4. **Preserva** o prompt de sistema intacto (contém apenas dados institucionais)

O filtro é centralizado na função `askAI` do módulo `.qodo/services/ai/index.js`, garantindo que **toda** interação com o provedor de IA — independente do módulo chamador (chat pedagógico, recepcionista, agentes especializados) — passe pela sanitização.

Dados que **nunca** chegam ao provedor de IA:
- Identificadores de usuário (user_id, nome, e-mail de login)
- Identificadores de escola (school_id)
- Metadados de sessão (IP, timestamps)
- Dados de autenticação (JWT, tokens)

Dados que chegam ao provedor de IA (sanitizados):
- Texto da pergunta do usuário (com PII removida)
- Histórico de mensagens da sessão (com PII removida)
- Instruções pedagógicas e trechos do material didático (dados institucionais, não pessoais)
## 12. Os proprietários dos dados foram informados que

## eles seriam usados para treinar uma solução de IA?

#### 12.1 A solução não treina modelos com dados da plataforma

A plataforma **não realiza treinamento, ne-tuning ou adaptação de modelos de IA** com dados dos

usuários ou da operação. Os modelos utilizados (Llama 3.3 70B Versatile e text-embedding-3-small) são

modelos pré-treinados de terceiros, consumidos exclusivamente via API de inferência.

Isso signica que:

```
Nenhum dado pessoal, mensagem de atendimento ou conteúdo institucional é usado para treinar
ou ajustar pesos do modelo
Os dados enviados ao provedor de IA (Groq) são processados apenas para gerar a resposta e não
são retidos pelo provedor para treinamento
A "especialização" do sistema ocorre por grounding institucional (base de conhecimento local,
prompts governados e thresholds de evidência), não por treinamento do modelo
```
#### 12.2 Informação aos usuários

Os membros da plataforma são cadastrados por convite institucional controlado. O contexto do

Sandbox prevê comunicação formal sobre a natureza do projeto aos participantes, incluindo o fato de

que o canal opera com assistentes de IA e que as interações cam registradas para ns de auditoria,

governança e melhoria do atendimento.


## 13. Seu modelo é transparente ou explicável? Se não for,

## que mecanismos foram utilizados para validar a

## conabilidade e concretude do seu funcionamento?

#### 13.1 Natureza da transparência

O modelo generativo utilizado (Llama 3.3 70B Versatile) é, por sua natureza, um modelo de caixa-preta —

como todo LLM atual. Ele não oferece explicabilidade intrínseca de cada decisão interna.

Contudo, a plataforma implementa uma **camada de transparência operacional e institucional** que

torna o funcionamento do sistema auditável e compreensível para os agentes de governança:

#### 13.2 Mecanismos de transparência implementados

```
Mecanismo O que registra
```
```
Score de
confiança
```
```
Indicador operacional (0 a 1) derivado do suporte documental encontrado,
registrado em cada resposta
```
```
Score de evidência Qualidade da base institucional recuperada para sustentar a resposta
```
```
Risco de
alucinação
Classificação do nível de risco (baixo, médio, alto) por resposta
```
```
Fonte principal Título e versão do documento-fonte que sustentou a resposta
```
```
Evidências
consultadas
```
```
Lista de trechos da base institucional consultados, persistidos em
interaction_source_evidence
```
```
Status de revisão
Marcação de review_required e fallback_to_human quando a
evidência é insuficiente
```
```
Evento formal de
auditoria
```
```
Registro em formal_audit_events com tipo de evento, severidade, razão
e status de revisão
```
```
Feedback
estruturado
Avaliação por operadores e gestores (útil, não útil, incorreto)
```
```
Registro de
incidentes
```
```
Abertura formal com severidade, tipo e quarentena, vinculada à resposta
```
```
Correções com
trilha
```
```
Proposta, aprovação, aplicação automática na base e registro de antes/depois
```
```
Timeline de
histórico
```
```
Eventos-filhos vinculados ao evento original, formando trilha completa de
governança
```

#### 13.3 Estados decisórios explícitos

O sistema adota três estados decisórios documentados, com base em thresholds de evidência:

```
Estado Condição Comportamento
```
```
ABSTAIN_AN
D_REVIEW
```
```
Evidência insuficiente (score <
0.58) ou sem fonte confiável
```
```
Não responde conclusivamente; marca alto
risco e recomenda revisão humana
```
```
ANSWER_WIT
H_WARNING
```
```
Evidência parcial (score entre
0.58 e 0.78)
```
```
Responde de forma conservadora; marca
revisão requerida
```
```
SAFE_TO_AN
SWER
```
```
Evidência forte (score ≥ 0.78) e
fonte versionada
```
```
Responde com maior segurança; registra
fonte, confiança e auditoria
```
#### 13.4 Conclusão sobre transparência

Embora o modelo generativo em si seja opaco, o sistema é **operacionalmente transparente** : cada

resposta é acompanhada de score, fonte, risco, evidências e trilha de auditoria. Isso permite que perfis

de governança (auditores, direção, superadmin) reconstruam o percurso de qualquer resposta

automatizada e avaliem sua adequação.

## 14. Quais são os valores obtidos nas métricas de

## performance do seu modelo, nos conjuntos de

## treinamento e testes?

#### 14.1 Natureza da avaliação

A plataforma **não realiza treinamento proprietário** de modelos de IA. O modelo generativo (Llama 3.3

70B Versatile, Groq) é pré-treinado pelo fornecedor. Portanto, não há conjuntos de treinamento e teste

próprios no sentido convencional de machine learning supervisionado. Contudo, existem valores

quantitativos relevantes em três camadas: benchmarks públicos do modelo base, parâmetros de

calibração do sistema e métricas operacionais projetadas para medição no piloto.

#### 14.2 Benchmarks públicos do modelo base (Llama 3.3 70B)

O modelo Llama 3.3 70B Versatile, desenvolvido pela Meta e disponibilizado via Groq, possui os seguintes resultados publicados em benchmarks padronizados:

| Benchmark | Resultado | Descrição |
|-----------|-----------|-----------|
| MMLU (5-shot) | 86.0% | Compreensão multidisciplinar (ciências, humanidades, STEM) |
| MMLU-Pro (5-shot) | 55.0% | Variante mais rigorosa do MMLU com respostas de múltipla escolha estendidas |
| HumanEval (0-shot) | 88.4% | Geração de código |
| MATH (0-shot, CoT) | 77.0% | Resolução de problemas matemáticos |
| GPQA Diamond (0-shot) | 50.5% | Perguntas de pós-graduação em ciências |
| IFEval | 91.4% | Seguimento de instruções |
| Multilingual MGSM (0-shot, CoT) | 91.1% | Raciocínio matemático multilíngue |

*Fonte: Meta AI, dezembro de 2024. Resultados reportados no modelo card oficial do Llama 3.3 70B.*

A escolha do Llama 3.3 70B se justifica pela combinação de alta performance em compreensão de linguagem natural (MMLU 86%), forte aderência a instruções (IFEval 91.4%) e capacidade multilíngue (MGSM 91.1%) — características críticas para um assistente educacional em português que precisa seguir regras institucionais rígidas e lidar com conteúdo pedagógico multidisciplinar.

#### 14.3 Parâmetros de calibração do sistema

O sistema aplica parâmetros quantitativos calibrados na camada de governança que complementam o modelo base:

| Parâmetro | Valor | Efeito |
|-----------|-------|--------|
| `temperature` | 0.1 | Temperatura baixa para minimizar variabilidade e criatividade indesejada — prioriza respostas determinísticas e factuais |
| `match_threshold` (busca semântica) | 0.30 | Similaridade mínima de cosseno para um trecho da base ser considerado relevante |
| `match_count` | 5 | Número máximo de trechos recuperados por consulta RAG |
| `WARNING_EVIDENCE_SCORE` | 0.58 | Abaixo desse limiar, a resposta é marcada como `review_required` e pode receber aviso de evidência frágil |
| `SAFE_EVIDENCE_SCORE` | 0.78 | Acima desse limiar, a resposta é considerada segura (alto suporte documental) |
| `confidence_score` (sem evidência) | 0.18 | Score de confiança atribuído quando nenhuma fonte institucional relevante é encontrada — força abstinência ou ressalva explícita |
| `confidence_score` (com evidência frágil) | min(0.6, evidence_score) | Score limitado a 0.6 mesmo com evidência, impedindo confiança alta sem base sólida |

Esses valores não são arbitrários: foram calibrados durante o desenvolvimento para maximizar a segurança institucional (reduzir falsos positivos — respostas confiantes sem base) sem impedir respostas úteis quando há material disponível.

#### 14.4 Métricas operacionais do sistema

Em vez de métricas de acurácia de modelo, a plataforma foi projetada para medir a qualidade do

atendimento por meio de indicadores operacionais e de governança:

**Métricas de qualidade da resposta**

```
Métrica Descrição
```

```
Métrica Descrição
```
```
Score médio de
confiança
```
```
Média do confidence_score por período, assistente e escola
```
```
Score médio de
evidência
```
```
Média do evidence_score, indicando suporte documental das
respostas
```
```
Taxa de abstinência Percentual de respostas em que o sistema se absteve por falta de base
suficiente
```
```
Taxa de revisão
requerida
```
```
Percentual de respostas marcadas como review_required
```
```
Taxa de fallback
humano
```
```
Percentual de respostas com fallback_to_human recomendado
```
**Métricas de governança**

```
Métrica Descrição
```
```
Feedbacks por tipo Distribuição entre helpful, not_helpful e incorrect
```
```
Incidentes por
severidade
```
```
Volume de incidentes abertos por período, classificados por gravidade
```
```
Correções aplicadas
Número de correções propostas, aprovadas e efetivamente aplicadas na
base
```
```
Cobertura da base Percentual de temas recorrentes com cobertura documental identificada
```
```
Lacunas de
conhecimento
```
```
Temas consultados sem cobertura suficiente na base institucional
```
**Métricas de governança pedagógica**

```
Métrica Descrição
```
```
Conteúdos pedagógicos
por disciplina
Volume de materiais publicados e aprovados por disciplina e turma
```
```
Sessões pedagógicas Volume de interações dos alunos com o assistente pedagógico por
disciplina
```
```
Temas pedagógicos
mais consultados
Assuntos mais frequentes nas dúvidas dos estudantes por disciplina
```
```
Incidentes pedagógicos Ocorrências de respostas inadequadas ou dúvidas não resolvidas no
contexto pedagógico
```
```
Taxa de feedback
pedagógico
Distribuição de feedback dos estudantes sobre a utilidade das
respostas
```

**Métricas operacionais**

```
Métrica Descrição
```
```
Total de consultas Volume de atendimentos recebidos por período
```
```
Taxa de resolução Percentual de consultas efetivamente respondidas
```
```
Distribuição por assistente
Volume de consultas por área (público, secretaria, tesouraria,
direção)
```
```
Tempo médio até primeira
resposta
```
```
Latência entre envio da consulta e entrega da resposta
```
#### 14.5 Avaliação durante o piloto


O Plano de Teste do Piloto prevê coleta estruturada dessas métricas durante 13 semanas de operação,

com linha de base anterior (volume médio de atendimentos manuais, tempo de resposta, canais

utilizados) para comparação de impacto. Os resultados serão consolidados no relatório nal ao

MEC/SEAI.

## 15. Que mecanismos de mitigação de viés foram usados

## na curadoria dos dados e no processo de treinamento?

#### 15.1 Contexto: sem treinamento, com curadoria

Como a plataforma não treina modelos, não há curadoria de dados de treinamento no sentido

convencional. A mitigação de viés concentra-se em duas frentes: (a) a qualidade da base de

conhecimento institucional que alimenta as respostas e (b) os mecanismos da aplicação que modulam

o comportamento do modelo generativo.

#### 15.2 Mecanismos de mitigação de viés na curadoria

```
Mecanismo Descrição
```
```
Versionamento
de fontes
```
```
Cada documento da base possui versão, data e checksum, permitindo identificar
quando a fonte foi atualizada e qual era o estado da informação em cada momento
```
```
Publicação
controlada
```
```
Conteúdo oficial passa por ciclo de publicação (rascunho → publicado →
arquivado) com responsável identificado
```
```
Relatório de
lacunas
```
```
O sistema identifica temas consultados sem cobertura documental suficiente,
sinalizando viés de cobertura
```
```
Detecção de
conflitos
```
```
O módulo de FAQ implementa verificação de conflitos entre entradas antes da
publicação
```
```
Curadoria por
perfil
institucional
```
```
A organização da base é responsabilidade de perfis dedicados (curadoria,
secretaria), não de qualquer operador
```
```
Curadoria
pedagógica por
disciplina
```
```
No módulo de apoio pedagógico, o conteúdo é curado pelo professor da disciplina
e aprovado pela coordenação antes de ser disponibilizado para a IA, evitando
conteúdo não revisado ou inadequado à faixa etária e contexto de ensino
```
```
Múltiplos
módulos de
conteúdo
```
```
Separação entre conhecimento genérico, calendário, matrícula, FAQ e avisos evita
tratamento indiferenciado de fontes
```
#### 15.3 Mecanismos de mitigação de viés na aplicação

```
Mecanismo Descrição
```

```
Mecanismo Descrição
```
```
Abstinência em
base insuficiente
```
```
O sistema não especula quando não há fonte — se abstém e marca revisão. Isso
evita que vieses do modelo generativo preencham lacunas documentais
```
```
Busca híbrida
(textual +
semântica)
```
```
Reduz viés de vocabulário: perguntas formuladas com termos diferentes podem
recuperar a mesma base
```
```
Thresholds
calibráveis
```
```
Os limiares de evidência podem ser ajustados com base em resultados reais do
piloto
```
```
Prompt
governado
```
```
Regras explícitas para não inventar normas, prazos ou documentos; limitar-se ao
que está sustentado pelas fontes
```
```
Feedback
estruturado
```
```
Respostas classificadas como incorretas geram insumo para correção e
melhoria da base
```
```
Incidentes e
correções
```
```
Erros recorrentes em temas específicos podem ser tratados por correção formal
com aplicação automática na base
```
#### 15.4 Vieses conhecidos e monitorados

O Model Card da IA documenta os seguintes vieses conhecidos:

```
. Viés de cobertura documental — respostas melhores em temas bem documentados, piores em
temas ausentes
. Viés de formulação linguística — perguntas claras obtêm melhores resultados que perguntas
vagas
. Viés do provedor de base — herança de vieses linguístico-culturais do modelo third-party
. Viés de conservadorismo — abstinência excessiva em casos limítrofes
. Viés institucional — reprodução da linguagem e perspectiva presente nos documentos ociais
```
## 16. Como você avalia a presença de viés discriminatório

## no modelo treinado?

#### 16.1 Avaliação de viés discriminatório

A plataforma adota postura de **transparência sobre limitações** em vez de declarar ausência de viés. A

avaliação considera três camadas:

**Camada 1 — Modelo generativo (Llama 3.3 70B)**


O modelo é pré-treinado pelo fornecedor (Meta) com corpus amplo da internet. Como todo LLM, herda

vieses linguísticos, culturais e demográcos presentes nos dados de treinamento. A plataforma não

tem controle direto sobre esses vieses intrínsecos do modelo, mas mitiga seus efeitos por meio de:

```
Prompts com regras explícitas de comportamento (responder em português, não inventar,
limitar-se às fontes)
Grounding institucional que ancora a resposta em base local, reduzindo a dependência de
conhecimento genérico do modelo
Thresholds de evidência que impedem respostas sem suporte documental
```
**Camada 2 — Base institucional**

A base de conhecimento é composta por documentos ociais da rede de educação. O viés potencial

nesta camada é de **cobertura desigual** : temas bem documentados produzem melhores respostas,

enquanto temas sub-representados podem gerar abstinência ou respostas menos precisas.

Mecanismos de detecção:

```
Relatório de lacunas de cobertura por tema e período
Indicadores de abstinência por área e assistente
Monitoramento de feedback incorrect por tema
```
**Camada 3 — Acesso ao canal**

O atendimento por texto pode representar barreira de acesso para usuários com menor letramento

digital, restrições de leitura/escrita ou preferência por canais multimodais. Essa limitação é

reconhecida como viés de exclusão por canal, documentada no Model Card, com planejamento de

ampliação futura.

#### 16.2 Práticas de monitoramento contínuo

Durante o piloto, o viés discriminatório será monitorado por:

```
Análise de distribuição de feedbacks incorrect por tema e perfil de solicitante
Verificação de padrões de abstinência que possam indicar sub-representação de temas
relevantes
Acompanhamento de incidentes relacionados a respostas inadequadas por contexto ou público
Revisão periódica de thresholds de evidência com base em dados reais
```
## 17. Qual é o plano de testes sugerido?


#### 17.1 Visão geral

O plano de testes foi projetado como teste operacional controlado em ambiente real, com coleta

contínua de evidências quantitativas e qualitativas. O objetivo não é apenas verificar se a aplicação

funciona tecnicamente, mas medir se ela gera valor institucional sob supervisão, com limites de uso

adequados e comportamento observável diante de incerteza ou risco.

#### 17.2 Escopo do piloto

```
Dimensão Definição
```
```
Abrangência 1 rede ou secretaria parceira, 1 a 3 escolas participantes
```
```
Frentes de
atendimento
```
```
Atendimento público escolar + apoio à secretaria escolar
```
```
Assistentes
ativos
```
```
Público e Secretaria como núcleo principal; Tesouraria e Direção como frentes
secundárias ou de expansão controlada
```
```
Usuários
internos
7 a 19 credenciados (secretaria, curadoria, auditoria, TI, gestão)
```
```
Usuários
externos
```
```
150 a 500 usuários únicos ou 300 a 1.200 consultas registradas
```
#### 17.3 Duração e fases

```
Fase Período Objetivo
```
1. Preparação institucional
    Semanas 1 a
    3

```
Definir escopo, perfis, fontes, regras de uso e protocolo
do piloto
```
2. Implantação técnica
controlada

```
Semanas 4
a 5
```
```
Configurar ambiente, publicar base inicial, validar
acessos
```
3. Operação assistida
    Semanas 6
    a 11

```
Atendimento real com monitoramento próximo e coleta
de evidências
```
4. Avaliação e
consolidação

```
Semanas 12
a 13
```
```
Análise de indicadores, comparação com linha de base,
relatório final
```
#### 17.4 Cenários de teste estruturados

```
Grupo de cenário Exemplos
```
```
Atendimento público
recorrente
```
```
"Quais documentos preciso para matrícula?", "Qual o horário da secretaria?",
"Quando começa o período letivo?"
```

```
Grupo de cenário Exemplos
```
```
Secretaria escolar
"Como emitir declaração?", "Qual o fluxo de transferência?", "Onde encontrar
orientação sobre rematrícula?"
```
```
Conteúdo
parcialmente coberto
Perguntas sobre tema com documento incompleto ou desatualizado
```
```
Fora de escopo
Consulta jurídica individual, caso disciplinar sensível, decisão sobre
matrícula
```
```
Solicitação de
humano
```
```
"Quero falar com uma pessoa", "Me transfere para o atendimento humano"
```
```
Correção e incidente
Resposta contestada por operador, abertura de feedback incorrect ou
incidente
```
Recomenda-se bateria inicial de **20 a 40 perguntas de referência** , organizadas por criticidade e área.

#### 17.5 Instrumentos de coleta de evidência

```
Logs de interação e trilhas de auditoria (automáticos)
Registros de evidência, score e risco por resposta (automáticos)
Feedback de operadores e gestores (registrado na plataforma)
Incidentes e correções abertos durante a operação
Relatórios por período, assistente e lacunas de conhecimento
Reuniões de acompanhamento com equipe institucional
```
#### 17.6 Linha de base para comparação

Antes do início da operação assistida, será registrada linha de base contendo:

```
Volume médio de atendimentos manuais no período equivalente anterior
Tempo médio de resposta manual
Principais canais utilizados
Temas mais recorrentes
Nível atual de padronização e rastreabilidade
```
#### 17.7 Métricas avaliadas

```
Categoria Exemplos de métricas
```
```
Operacionais
Total de consultas, taxa de resolução, tempo médio até resposta, distribuição por
assistente
```
```
Qualidade
Score de confiança, score de evidência, taxa de abstinência, taxa de revisão
requerida, taxa de fallback
```

```
Categoria Exemplos de métricas
```
```
Governança Eventos de auditoria, incidentes por severidade, correções aplicadas, tratamentos
por destino
```
```
Valor público
Redução de demandas repetitivas, satisfação de operadores, ampliação de acesso a
informação
```
#### 17.8 Critérios de suficiência

O piloto atinge massa crítica mínima de avaliação quando reunir:

```
Uso ativo por ao menos dois perfis internos distintos
Volume recorrente de consultas ao longo de várias semanas
Ocorrência observável de feedbacks, revisões e ajustes
Dados suficientes para comparação com a linha de base anterior
```
#### 17.9 Gatilhos de interrupção

O plano prevê interrupção parcial ou total do teste quando:

```
Erro material em tema crítico sem contenção imediata
Incidente de segurança ou vazamento de dados
Recorrência grave de respostas incorretas com dano institucional
Supervisão humana obrigatória tornada inviável
Determinação regulatória do MEC ou da SEAI
```
#### 17.10 Entregas do piloto

```
Base de conhecimento institucional publicada e versionada
Módulos de conteúdo oficial ativados (calendário, matrícula, FAQ, avisos)
Atendimento webchat operante com assistentes por área
Painel de auditoria funcional com timeline e tratamento
Dashboard de indicadores operacionais e de governança
Relatório consolidado de indicadores do piloto
Plano de melhorias e recomendação institucional sobre continuidade
```
## Quadro-Resumo das Respostas ao Anexo IV

```
Pergunta Síntese da resposta
```
1. Título Assistente Inteligente de Atendimento Escolar com Governança Algorítmica


```
Pergunta Síntese da resposta
```
2. Área de
aplicação
    Gestão educacional (principal), inovação pública digital e acesso escolar
3. Benefício do
Sandbox

```
Validação institucional, calibração de governança, amadurecimento LGPD,
evidência para política pública
```
##### 4. TRL

```
TRL 6 — sistema funcional em ambiente pré-operacional, aguardando
validação com usuários reais de rede pública (objetivo do Sandbox)
```
5.
Componentes
e modelos

```
Backend Node.js/Express em Cloud Run, Supabase, Firebase; Llama 3.3 70B (Groq)
para respostas, text-embedding-3-small para busca semântica
```
6. Objetivos
    Reduzir atendimentos repetitivos, padronizar informação, estruturar memória
    institucional, implementar governança algorítmica nativa
7. Benefícios
    Acesso mais rápido a informações, redução de sobrecarga, padronização,
    indicadores de gestão, modelo replicável para educação pública
8. Riscos e
mitigações

```
Alucinação, desatualização, viés de cobertura, dados pessoais; mitigados por
thresholds, abstinência, auditoria, RBAC, segregação, LGPD
```
9. Coleta e
tratamento

```
Dados gerados na operação do atendimento; convite controlado, contexto
autenticado, base institucional versionada
```
10. Dados
pessoais

```
Sim — nome, email, mensagens; plano de minimização e anonimização em ciclo de
vida; sem dados sensíveis coletados sistematicamente
```
11. Direitos
fundamentais

```
RBAC, JWT, HTTPS, segregação, trilha de auditoria, minimização, política de
retenção, plano de atendimento a direitos do titular
```
12. Dados para
treinamento
    Não — plataforma não treina modelos; usa API de inferência; Groq não retém dados

##### 13.

Transparência

```
Modelo opaco com transparência operacional: score, evidência, fonte, risco,
auditoria, feedback, incidentes e correções rastreáveis
```
14. Métricas de
performance

```
Llama 3.3 70B: MMLU 86%, IFEval 91.4%, MGSM 91.1%; calibração
interna: temperature 0.1, thresholds de evidência 0.58/0.78, confiança
limitada a 0.6; métricas operacionais medidas no piloto
```
15. Mitigação
de viés

```
Versionamento, publicação controlada, relatório de lacunas, detecção de conflitos,
abstinência, busca híbrida, feedback
```
16. Viés
discriminatório

```
Transparência sobre limitações; monitoramento por cobertura, feedback,
incidentes e calibração de thresholds no piloto
```
17. Plano de
testes

```
13 semanas, 4 fases, 1-3 escolas, 7-19 usuários internos, 20-40 cenários
estruturados, métricas de qualidade e governança
```

```
Licenciamento
Open Source
```
```
Apache License 2.0 — código, pipelines, documentação e artefatos do
Sandbox; dependências de terceiros sob licença própria (art. 36 do edital)
```

# DECLARAÇÃO DE INEXISTÊNCIA DE CONFLITO

# DE INTERESSES

## 1. Objeto da Declaração

A presente declaração tem por objetivo atestar a inexistência de conflitos de interesses — reais,

potenciais ou aparentes — entre a entidade proponente, seus representantes legais, membros da

equipe técnica e de governança, e quaisquer partes envolvidas na submissão, avaliação, execução ou

supervisão do projeto no âmbito do Sandbox Regulatório de Inteligência Artificial na Educação,

instituído pelo Ministério da Educação (MEC) por meio da Secretaria de Educação e Articulação

Intersetorial (SEAI).

## 2. Declarações

O(a) representante legal abaixo identificado(a), em nome da entidade proponente, declara para os

devidos fins que:

## 2.1 Independência em relação ao órgão regulador

A entidade proponente, seus sócios, dirigentes e membros da equipe técnica do projeto **não possuem**

**vínculo funcional, contratual, societário ou de qualquer outra natureza** com o Ministério da Educação

(MEC), a Secretaria de Educação e Articulação Intersetorial (SEAI), ou com membros de comissões,

comitês ou grupos de trabalho responsáveis pela avaliação, seleção ou supervisão dos projetos

submetidos ao Sandbox Regulatório.

## 2.2 Independência em relação a provedores de tecnologia

A entidade proponente **não possui participação societária, acordo de exclusividade, contrato de**

**representação, comissão por indicação ou qualquer forma de remuneração vinculada** aos provedores

de inteligência artificial utilizados no projeto (Groq, Google AI ou outros). A arquitetura da plataforma é

multiprovedores por design, permitindo substituição de provedores sem alteração estrutural do

sistema, o que evidencia independência tecnológica e ausência de vinculação comercial preferencial.

## 2.3 Relação com instituições educacionais participantes


Eventuais parcerias com secretarias de educação, redes de ensino ou escolas para a realização do

piloto **não configuram favorecimento, contratação simulada, transferência financeira indevida ou**

**benefício econômico para nenhuma das partes**. A participação de instituições educacionais no piloto

será formalizada por instrumento próprio, com escopo delimitado, prazo definido e finalidade

exclusivamente ligada à validação do projeto no contexto do Sandbox.

#### 2.4 Uso de dados sem interesse comercial

A entidade proponente **não tem interesse em explorar comercialmente, compartilhar com terceiros**

**ou utilizar para fins de perfilamento, marketing ou comercialização** os dados pessoais de estudantes,

famílias, servidores ou gestores coletados ou tratados durante a operação do piloto. Os dados são

tratados exclusivamente para as finalidades de atendimento institucional, governança algorítmica e

operação do sistema, conforme documentado na Avaliação de Impacto de Proteção de Dados (DPIA) e

no Plano de Conformidade LGPD do projeto.

#### 2.5 Finalidade pública e não substitutiva

O projeto tem finalidade de **pesquisa aplicada, inovação e validação de modelo de governança**

**algorítmica em educação pública**. A solução não se propõe a substituir serviços públicos essenciais,

decisões administrativas formais ou atribuições de servidores públicos. O atendimento automatizado é

informativo e orientativo, com supervisão humana posterior obrigatória e mecanismos de abstinência

em caso de insuficiência documental.

#### 2.6 Equipe técnica

Os membros da equipe técnica e de governança do projeto **não ocupam cargos, funções**

**comissionadas ou posições de influência** em órgãos públicos responsáveis pela avaliação, seleção ou

supervisão do Sandbox Regulatório, nem possuem vínculos que possam gerar conflito entre seus

interesses pessoais ou profissionais e os objetivos do projeto ou do programa regulatório.

#### 2.7 Ausência de litígios ou impedimentos

A entidade proponente **não é parte em processos judiciais, administrativos ou arbitrais** contra o MEC,

a SEAI, ou contra instituições educacionais parceiras do piloto, que possam comprometer a

imparcialidade, a transparência ou a boa-fé na execução do projeto.

#### 2.8 Compromisso de comunicação superveniente

A entidade proponente **compromete-se a comunicar imediatamente** ao MEC/SEAI qualquer fato ou

circunstância superveniente que possa configurar conflito de interesses — real, potencial ou aparente

— durante a vigência da participação no Sandbox Regulatório, incluindo, mas não se limitando a:


```
Contratação de membro da equipe por órgão regulador ou vice-versa
Celebração de contrato comercial com provedor de IA que comprometa a independência
tecnológica
Aquisição de participação societária em empresa concorrente ou fornecedora
Início de relação funcional ou contratual com instituição educacional parceira fora do escopo do
piloto
Qualquer outro fato que possa comprometer a imparcialidade ou a finalidade pública do projeto
```
## 3. Fundamentação

Esta declaração atende aos princípios de:

```
Moralidade administrativa (art. 37, caput, CF/1988) — conduta ética e transparente perante a
administração pública
Impessoalidade (art. 37, caput, CF/1988) — ausência de favorecimento ou benefício pessoal
Probidade — compromisso com a integridade e a boa-fé na relação com o poder público
Transparência — disposição para prestar informações e esclarecer vínculos sempre que
solicitado
Boa governança — alinhamento com as exigências de governança do Sandbox Regulatório
```
## 4. Responsabilidade pela veracidade

O declarante assume **integral responsabilidade pela veracidade** das informações prestadas neste

documento, ciente de que a falsidade nas declarações poderá ensejar:

```
Exclusão do projeto do Sandbox Regulatório
Responsabilização civil e administrativa nos termos da legislação vigente
Comunicação aos órgãos de controle competentes
```
## 5. Assinatura

Declaro, sob as penas da lei, que as informações acima são verdadeiras e que não há, na presente data,

qualquer situação que configure conflito de interesses em relação à participação no Sandbox

Regulatório de Inteligência Artificial na Educação.

_Documento produzido para instrução do processo de inscrição no Sandbox Regulatório de Inteligência_

_Artificial na Educação — MEC/SEAI._



# Infraestrutura Disponível para Execução do Projeto

**Projeto:** Assistente Inteligente de Atendimento Escolar com Governança Algorítmica  
**Documento:** Descrição da infraestrutura física e tecnológica da entidade  
**Finalidade:** Demonstrar que a entidade dispõe de recursos próprios para desenvolver, operar e manter o projeto durante o período de participação no Sandbox Regulatório  
**Versão:** 2.0  
**Data:** Março de 2026

---

## 1. Declaração de Autossuficiência

A entidade proponente declara que toda a infraestrutura tecnológica descrita neste documento é contratada, mantida e custeada com recursos próprios. Nenhum componente de nuvem, hospedagem, banco de dados, provedor de IA ou ferramenta de desenvolvimento depende de fornecimento pelo Ministério da Educação ou por qualquer outro órgão público.

A plataforma já se encontra operacional, com ambiente de produção ativo, ambiente de desenvolvimento funcional e pipeline de deploy configurado. A infraestrutura foi dimensionada para suportar o escopo do piloto proposto e permite ampliação conforme a necessidade.

---

## 2. Infraestrutura de Nuvem

### 2.1 Computação e Hospedagem

| Recurso | Provedor | Serviço | Finalidade |
|---|---|---|---|
| Execução do backend | Google Cloud Platform | Cloud Run | Processamento de requisições, APIs, orquestração de IA |
| Hospedagem do frontend | Google / Firebase | Firebase Hosting | Distribuição de páginas, assets estáticos e roteamento |
| Containerização | Docker | Imagem node:20-alpine | Empacotamento padronizado para deploy |

O backend opera em Cloud Run com escalonamento automático horizontal, o que permite ajustar a capacidade de processamento conforme a demanda do piloto sem necessidade de provisionamento manual de servidores.

### 2.2 Banco de Dados

| Recurso | Provedor | Tecnologia | Finalidade |
|---|---|---|---|
| Banco de dados relacional | Supabase | PostgreSQL gerenciado | Persistência de dados do sistema (consultas, respostas, auditoria, conhecimento, usuários) |
| Autenticação de usuários | Supabase | Supabase Auth (JWT) | Controle de sessão e identidade |
| Edge Functions | Supabase | Deno runtime | Operações serverless complementares (convites, embeddings) |

O banco de dados opera na região de São Paulo (sa-east-1), com backups automáticos diários inclusos no plano contratado.

### 2.3 Provedor de Inteligência Artificial

| Recurso | Provedor | Modelo ativo | Finalidade |
|---|---|---|---|
| Geração de respostas | Groq | Llama 3.3 70B Versatile | Atendimento por assistentes, triagem, resposta a consultas recorrentes |
| Embeddings semânticos | Google AI | Generative AI API | Busca semântica na base de conhecimento |

A arquitetura da plataforma suporta múltiplos provedores de IA, com configuração por escola. O provedor ativo (Groq) utiliza modelos open-source de alta performance, o que favorece transparência, auditoria e soberania sobre o comportamento do modelo. A troca ou adição de provedores pode ser feita sem alteração estrutural do sistema.

---

## 3. Stack Tecnológica

### 3.1 Backend

| Componente | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | ≥ 18.0.0 |
| Framework web | Express.js | 5.1.0 |
| Linguagem | JavaScript (ES6+) | — |
| Padrão arquitetural | Monolito modular com API REST | — |
| Cliente do banco | @supabase/supabase-js | 2.81.1 |

O backend centraliza mais de 150 endpoints, incluindo autenticação, controle de acesso, APIs de atendimento, base de conhecimento, conteúdo oficial, auditoria, tratamentos, incidentes, correções, notificações, relatórios e configuração de provedores de IA.

### 3.2 Frontend

| Componente | Tecnologia | Versão |
|---|---|---|
| Linguagem | JavaScript (Vanilla, sem frameworks) | ES6+ |
| Interface | Bootstrap + AdminLTE | 4.6.2 / 3.2 |
| Componentes de UI | jQuery, SweetAlert2, Chart.js | 3.6.0 / 11.x / — |
| Padrão | Componentes modulares (IIFE) | — |

O frontend administrativo conta com mais de 15 módulos de interface especializados, incluindo dashboard, atendimento, auditoria, tratamentos, incidentes, correções, base de conhecimento, conteúdo oficial, FAQ, relatórios, gerenciamento de usuários, preferências de IA, quadro de avisos e fila de handoff humano.

---

## 4. Segurança e Controle de Acesso

### 4.1 Autenticação

- Tokens JWT gerenciados por Supabase Auth
- Refresh automático de tokens
- Validação obrigatória de sessão em todas as operações
- Contexto autenticado derivado automaticamente (escola, papel e permissões)

### 4.2 Autorização e Perfis

A plataforma implementa controle de acesso baseado em papéis (RBAC) com 9 perfis institucionais e 2 perfis de plataforma:

| Perfil | Escopo |
|---|---|
| Superadmin da Plataforma | Acesso completo, gestão global |
| Auditor da Plataforma | Supervisão transversal, sem alteração de dados |
| Direção | Conformidade, aprovação de correções, governança |
| Secretaria | Operação administrativa, atendimento |
| Coordenação | Acompanhamento pedagógico |
| Professor | Consulta e interação limitada |
| Auxiliar | Suporte operacional |
| Curadoria | Gestão de fontes e conteúdo oficial |
| Operação | Atendimento ao público |
| Portaria | Acesso restrito |
| Auditor escolar | Compliance institucional |

Cada perfil possui permissões granulares por página, configuráveis por escola.

### 4.3 Proteção de Dados

- Comunicação via HTTPS em todos os ambientes
- Segregação lógica por escola (school_id) em todas as entidades
- Plano de adequação LGPD com minimização de dados, retenção e segregação
- Trilha de auditoria formal para todas as respostas automatizadas
- Sistema de convites com tokens únicos para controle de ingresso

---

## 5. Ambientes Operacionais

### 5.1 Ambiente de Produção

| Aspecto | Configuração |
|---|---|
| Backend | Cloud Run (GCP) com escalonamento automático |
| Frontend | Firebase Hosting com CDN global |
| Banco de dados | Supabase PostgreSQL, região São Paulo |
| Provedor de IA | Groq (API dedicada) |
| Deploy | Pipeline automatizado via Firebase CLI |
| Backup | Automático diário (Supabase) + repositório Git |

### 5.2 Ambiente de Desenvolvimento

| Aspecto | Configuração |
|---|---|
| Servidor local | Node.js com hot reload (porta 8084) |
| Banco | Supabase CLI ou instância remota dedicada |
| Controle de versão | Git + GitHub (repositório privado) |
| Containerização | Docker (node:20-alpine) |
| Deploy | `firebase deploy` para publicação |

---

## 6. Observabilidade e Manutenção

### 6.1 Monitoramento

- Logs de aplicação disponíveis no console do Cloud Run (GCP)
- Logs de banco de dados e autenticação no dashboard do Supabase
- Trilha formal de auditoria dentro da aplicação (eventos, incidentes, tratamentos, correções)

### 6.2 Backup e Continuidade

| Recurso | Estratégia |
|---|---|
| Banco de dados | Backups automáticos diários pelo Supabase |
| Código-fonte | Repositório Git com histórico completo |
| Documentação | Versionada no repositório |
| Assets do frontend | Firebase Hosting com CDN |

---

## 7. Escalabilidade

A infraestrutura contratada oferece capacidade de crescimento compatível com a ampliação do piloto:

| Dimensão | Capacidade |
|---|---|
| Processamento | Cloud Run com escalonamento horizontal automático (0 a N instâncias) |
| Banco de dados | Supabase com escalabilidade gerenciada (compute, storage, connections) |
| IA | API Groq com quotas configuráveis; arquitetura permite adição de provedores |
| Frontend | Firebase Hosting com CDN global e cache automático |
| Serverless | Edge Functions do Supabase para operações complementares |

Para o escopo do piloto (1 a 3 escolas, 2 frentes de atendimento), a infraestrutura atual é suficiente. Para ampliação futura, o modelo de nuvem permite aumento de capacidade sem reprojetamento da arquitetura.

---

## 8. Custos e Sustentabilidade

Todos os serviços de nuvem, banco de dados, provedores de IA e ferramentas de desenvolvimento são contratados e custeados pela entidade proponente. Não há dependência de recursos públicos para a operação da infraestrutura.

O modelo de custos é baseado em consumo (pay-as-you-go), o que permite controle proporcional ao volume de uso durante o piloto e evita investimento inicial elevado em infraestrutura fixa.

| Serviço | Modelo de custeio |
|---|---|
| Google Cloud Run | Por requisição e tempo de execução |
| Firebase Hosting | Plano gratuito para volumes de piloto |
| Supabase | Plano contratado com recursos dedicados |
| Groq API | Por token processado |
| Google AI API | Por requisição de embedding |

A entidade se compromete a manter a infraestrutura operacional durante todo o período de participação no Sandbox Regulatório.

---

## 9. Quadro-Resumo da Infraestrutura

| Item exigido pelo edital | Recurso disponível |
|---|---|
| Infraestrutura tecnológica própria | Google Cloud Platform (Cloud Run, Firebase), Supabase, Groq API |
| Ambiente de produção | Operacional, com deploy automatizado e escalonamento automático |
| Ambiente de desenvolvimento | Configurado com servidor local, banco dedicado e controle de versão |
| Banco de dados | PostgreSQL gerenciado (Supabase), região São Paulo, backup automático |
| Provedor de IA | Groq (modelos open-source) com arquitetura multiprovedores |
| Segurança | JWT, RBAC com 12 perfis, segregação por escola, HTTPS |
| Equipe técnica | Capacidade de desenvolvimento, deploy e operação |
| Sustentabilidade financeira | Todos os custos arcados pela entidade, modelo pay-as-you-go |

---

**Data:** Março de 2026  
**Versão:** 2.0  
**Responsável:** Equipe de Desenvolvimento LAB-IA Educação
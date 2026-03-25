# Infraestrutura e Tecnologias - LAB-IA Educação

## Visão Geral

O **LAB-IA Educação** é uma plataforma de atendimento institucional e governança do conhecimento com IA auditável para redes e órgãos educacionais. O projeto foi estruturado para apoiar o uso seguro de IA em contextos públicos de educação, transformando interações em dados de gestão, rastreabilidade e aprendizagem institucional.

## Arquitetura da Solução

### Padrão Arquitetural
- **Monolito Modular** com separação clara entre frontend e backend
- **API REST** para comunicação entre camadas
- **SPA (Single Page Application)** no frontend
- **Server-Side Rendering** limitado (apenas páginas estáticas)

## Stack Tecnológica

### Backend
- **Runtime**: Node.js ≥18.0.0
- **Framework Web**: Express.js v5.1.0
- **Linguagem**: JavaScript (ES6+)
- **Arquitetura**: API REST com middleware pattern

### Frontend
- **Framework**: Vanilla JavaScript (sem frameworks)
- **UI Library**: Bootstrap 4.6.2 + AdminLTE 3.2
- **JavaScript Libraries**:
  - jQuery 3.6.0
  - SweetAlert2 11.x
  - Chart.js (para dashboards)
- **CSS**: Bootstrap + CSS customizado
- **Arquitetura**: Componentes modulares com IIFE (Immediately Invoked Function Expression)

### Banco de Dados
- **Plataforma**: Supabase (PostgreSQL)
- **ORM/Cliente**: @supabase/supabase-js v2.81.1
- **Migração**: SQL scripts manuais (`supabase/snippets/`)
- **Schema**: Definido em `schema.sql`

### Infraestrutura de Hospedagem

#### Produção
- **Plataforma**: Google Cloud Platform (GCP)
- **Serviço de Aplicação**: Cloud Run
- **Hospedagem Estática**: Firebase Hosting
- **Região**: us-central1 (Iowa, USA)
- **Domínio**: Configurado via Firebase Hosting

#### Desenvolvimento
- **Servidor Local**: Node.js nativo (porta 8084)
- **Banco Local**: Supabase CLI ou serviço remoto
- **Hot Reload**: Node.js --watch

### Containerização
- **Docker Engine**: Docker
- **Imagem Base**: node:20-alpine
- **Orquestração**: Cloud Run (gerenciado pelo GCP)
- **Build**: Multi-stage não utilizado (simples)

### Integrações de IA

#### Provedores de IA
- **Google AI**: @google/generative-ai v0.24.1
- **Google APIs**: googleapis v164.1.0

#### Funcionalidades de IA
- **Geração de Respostas**: Assistentes especializados por área
- **Embeddings**: Para busca semântica no knowledge base
- **Análise de Sentimentos**: Não implementado
- **Moderação de Conteúdo**: Não implementado

### Autenticação e Autorização
- **Provedor**: Supabase Auth
- **Método**: JWT tokens
- **RBAC**: Role-Based Access Control implementado no backend
- **Sessões**: Gerenciadas via sessionStorage

### Monitoramento e Observabilidade
- **Logs**: Console logging (básico)
- **Error Handling**: Try-catch com SweetAlert2 para UX
- **Performance**: Não instrumentado
- **Analytics**: Não implementado

## Dependências Principais

### Runtime Dependencies (package.json)
```json
{
  "@google/generative-ai": "^0.24.1",
  "@supabase/supabase-js": "^2.81.1",
  "axios": "^1.12.2",
  "chalk": "^4.1.2",
  "cors": "^2.8.5",
  "dayjs": "^1.11.18",
  "dotenv": "^17.2.3",
  "express": "^5.1.0",
  "googleapis": "^164.1.0",
  "open": "^8.4.2"
}
```

### Dependências de Desenvolvimento
- **Nodemon**: Para desenvolvimento local
- **Scripts**: Bootstrap de conhecimento, sincronização

## Estrutura de Diretórios

```
lab-ia-educacao/
├── .qodo/                 # Lógica de negócio e serviços
│   ├── api/              # Controladores da API
│   ├── services/         # Serviços (AI, auth, etc.)
│   ├── middleware/       # Middlewares Express
│   └── web/              # Rotas web
├── public/               # Assets estáticos
│   ├── dist/            # Build do frontend
│   └── js/              # JavaScript fonte
├── supabase/            # Configurações do banco
│   ├── functions/       # Edge functions
│   └── snippets/        # SQL migrations
├── scripts/             # Utilitários de manutenção
├── docs/                # Documentação
└── views/               # Templates (não utilizados)
```

## Configuração de Ambiente

### Variáveis de Ambiente (.env)
```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=xxxxx

# Google AI
GOOGLE_AI_API_KEY=xxxxx

# Servidor
PORT=8084
NODE_ENV=production
```

### Firebase Configuration
- **Projeto**: qnexy-22e3f
- **Target**: labia
- **Site**: lab-ia
- **Rewrites**: Todas as rotas direcionam para Cloud Run

## Segurança

### Autenticação
- JWT tokens via Supabase
- Refresh automático de tokens
- Validação de sessão obrigatória

### Autorização
- **9 Perfis de Acesso**:
  - Superadmin do Projeto
  - Gestor da Rede / Institucional
  - Curador de Conteúdo
  - Operador de Atendimento Público
  - Servidor da Secretaria
  - Servidor da Coordenação
  - Servidor da Tesouraria
  - Servidor da Direção
  - Auditor / Compliance

### Dados Sensíveis
- **Criptografia**: Não implementada para dados em trânsito
- **LGPD**: Estrutura básica implementada
- **Auditoria**: Logs de interação mantidos

## Escalabilidade

### Limitações Atuais
- **Monolito**: Sem microserviços
- **Estado**: Mantido em memória (sessionStorage)
- **Cache**: Não implementado
- **CDN**: Firebase Hosting (básico)

### Pontos de Escalabilidade
- **Cloud Run**: Auto-scaling horizontal
- **Supabase**: Escalabilidade automática do PostgreSQL
- **Edge Functions**: Para operações serverless

## Monitoramento e Manutenção

### Deploy
```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Deploy Firebase
firebase deploy --only hosting:labia
```

### Logs
- **Aplicação**: Console do Cloud Run
- **Banco**: Supabase Dashboard
- **Frontend**: Browser DevTools

### Backup
- **Banco**: Supabase automated backups
- **Código**: Git (GitHub)
- **Assets**: Firebase Hosting

## Requisitos de Sistema

### Desenvolvimento
- Node.js ≥18.0.0
- npm ou yarn
- Git
- Conta Supabase
- Conta Firebase
- Conta Google Cloud (para Cloud Run)

### Produção
- Cloud Run (GCP)
- Firebase Hosting
- Supabase Pro/Team plan
- APIs: Google AI

## Riscos e Dependências Externas

### Dependências Críticas
1. **Supabase**: Banco e autenticação
2. **Google AI**: Funcionalidade de IA principal
3. **Firebase**: Hospedagem e CDN
4. **Cloud Run**: Execução da aplicação

### Riscos
- **Vendor Lock-in**: Forte dependência do Supabase
- **Rate Limits**: APIs de IA podem limitar uso
- **Custos**: Escalabilidade pode gerar custos elevados
- **Compliance**: LGPD e dados educacionais

## Próximos Passos de Infraestrutura

### Melhorias Recomendadas
1. **Monitoramento**: Implementar logging estruturado (Winston)
2. **Cache**: Redis para sessões e dados frequentes
3. **CDN**: Cloudflare para assets estáticos
4. **Backup**: Estratégia de backup automatizada
5. **Security**: WAF e rate limiting
6. **Performance**: Code splitting e lazy loading

### Migração Potencial
- **Microserviços**: Separar IA, auth, e API
- **Kubernetes**: Para orquestração avançada
- **Multi-region**: Para alta disponibilidade

---

**Data de Geração**: Março 2026
**Versão da Documentação**: 1.0
**Responsável**: Equipe de Desenvolvimento LAB-IA Educação</content>
<parameter name="filePath">c:\Projects\lab-ia-educacao\docs\infraestrutura-tecnologia.md
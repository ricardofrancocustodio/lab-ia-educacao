# Módulo FAQ Oficial - Documentação de Implementação

## 📋 Visão Geral

O módulo FAQ Oficial implementa um sistema completo de perguntas e respostas estruturadas com suporte a:

- **Escopo Network e School**: FAQs em nível de rede (secretaria) e escolas individuais
- **Perguntas/Respostas Estruturadas**: Campos categorizados e validados
- **Status Multi-stagios**: DRAFT → REVIEW → PUBLISHED → ARCHIVED
- **Vigência Temporal**: Data de início e fim de validade
- **Versionamento**: Histórico completo de alterações
- **Auditoria**: Rastreamento de quem fez o quê e quando
- **Detecção de Conflitos**: Identifica duplicatas e respostas conflitantes entre rede e escola
- **Testes com IA**: Valida relevância de respostas antes de publicação
- **Indexação Seletiva**: Apenas FAQs publicadas e vigentes são indexadas para a IA

---

## 🗄️ Estrutura de Banco de Dados

### Tabelas Principais

#### `faq_items` - Itens de FAQ
```sql
- id (UUID, PK)
- school_id (FK → schools)
- scope_key (network | school)
- question TEXT
- answer TEXT
- category TEXT
- status (draft | review | published | archived)
- valid_from TIMESTAMP
- valid_to TIMESTAMP (nullable = permanente)
- item_order INTEGER (para ordenação)
- created_by, updated_by (FK → auth.users)
- created_by_email, updated_by_email
- created_at, updated_at
```

#### `faq_versions` - Histórico de versões
```sql
- id (UUID, PK)
- faq_item_id (FK → faq_items)
- version_number INTEGER
- question, answer, category, status, valid_from, valid_to
- change_summary TEXT
- created_by, created_by_email
- created_at
```

#### `faq_audit_log` - Auditoria de mudanças
```sql
- id (UUID, PK)
- faq_item_id (FK → faq_items)
- school_id (FK → schools)
- action (created | updated | published | archived | deleted | reviewed | rejected)
- user_id, user_email, user_role
- status_before, status_after
- changes_payload (JSONB)
- ip_address, user_agent
- created_at
```

#### `faq_conflicts` - Detecção de conflitos
```sql
- id (UUID, PK)
- school_id (FK → schools)
- faq_item_network_id, faq_item_school_id (FK → faq_items)
- conflict_type (duplicate_question | conflicting_answers | overlap | outdated_network)
- severity (low | medium | high)
- resolved BOOLEAN
- resolution_type (merge_to_network | merge_to_school | keep_both | archive_network | archive_school | manual_review)
- resolved_by, resolved_at
- created_at, updated_at
```

#### `faq_ai_test_results` - Resultados de testes com IA
```sql
- id (UUID, PK)
- faq_item_id (FK → faq_items)
- school_id (FK → schools)
- test_query TEXT
- ai_response TEXT
- ai_provider TEXT (groq | etc)
- match_score DECIMAL(3,2) [0-1]
- is_relevant BOOLEAN
- feedback_type (correct | needs_refinement | incorrect | missing_context)
- tester_id, tester_email
- test_date TIMESTAMP
```

---

## 🔌 APIs Backend

### Endpoints

#### GET `/api/faq?scope=school&status=published&category=Geral&search=matricula&limit=50&offset=0`
Lista FAQs com filtros opcionais.

**Response:**
```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "question": "Qual é o período de matrícula?",
      "answer": "De fevereiro a março",
      "category": "Administrativo",
      "status": "published",
      "valid_from": "2026-02-01T00:00:00Z",
      "valid_to": null,
      "created_by_email": "admin@school.br",
      "updated_at": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

#### POST `/api/faq?scope=school`
Cria novo FAQ.

**Body:**
```json
{
  "question": "Como faço para recuperar a senha?",
  "answer": "Clique em 'Esqueci a senha' na tela de login.",
  "category": "Tecnologia",
  "status": "draft",
  "valid_from": "2026-02-01",
  "valid_to": "2026-06-30"
}
```

#### PUT `/api/faq/{id}?scope=school`
Atualiza FAQ existente.

#### DELETE `/api/faq/{id}?scope=school`
Deleta FAQ.

#### POST `/api/faq/{id}/publish?scope=school`
Publica FAQ (muda status para published e torna indexável pela IA).

#### POST `/api/faq/{id}/test`
Testa FAQ com IA - valida se a resposta é relevante para perguntas relacionadas.

**Body:**
```json
{
  "test_query": "Como recuperar minha senha?",
  "ai_provider": "groq"
}
```

**Response:**
```json
{
  "ok": true,
  "testResult": {
    "match_score": 0.92,
    "is_relevant": true,
    "ai_response": "Uma resposta muito apropriada para esta pergunta..."
  }
}
```

#### GET `/api/faq/conflicts`
Lista conflitos detectados entre FAQs de rede e escola.

---

## 🎨 Interface Frontend

### Abas da Página de Conteúdo Oficial

A página `/conteudo-oficial` possui abas para:
- Calendário Oficial
- Matrícula e Documentos
- **FAQ Oficial** ← Nova aba
- Comunicados Oficiais

### Funcionalidades da Interface FAQ

#### 1. **Adicionar Pergunta**
```javascript
OfficialContentPage.addFaqItem()
```
Adiciona novo campo de FAQ com:
- Pergunta (texto)
- Resposta (textarea)
- Categoria (dropdown)
- Público-alvo (texto)
- Vigência início/fim (date picker)
- Botão "Testar com IA"
- Botão "Remover"

#### 2. **Importar CSV**
```javascript
OfficialContentPage.importFaqCsv(file)
```

Formato CSV esperado:
```csv
pergunta,resposta,categoria,publico_alvo,vigencia_inicio,vigencia_fim,escopo
"Qual é o período de matrícula?","De fevereiro a março.","Administrativo","Responsáveis","2026-02-01","2026-03-31","school"
"Quais documentos são necessários?","RG, CPF e histórico escolar.","Administrativo","Responsáveis","2026-02-01","","school"
```

#### 3. **Baixar Template CSV**
```javascript
OfficialContentPage.downloadFaqTemplate()
```

#### 4. **Testar com IA**
Clique no botão "Testar com IA" para validar se a resposta é relevante.

O sistema testa a pergunta contra múltiplas variações:
- Pergunta original
- Variações com "Como..."
- Variações com "Me explique..."
- Variações com "Qual é..."

Resultado: Score 0-100%
- Verde (≥70%): Resposta muito clara e relevante
- Amarelo (50-69%): Pode ser melhorada
- Vermelho (<50%): Precisa revisão

#### 5. **Salvar FAQ**
```javascript
OfficialContentPage.saveFaq()
```

Salva todas as FAQs locais no banco de dados como versão publicada, criando:
- Registro em `faq_items`
- Entrada em `faq_versions` (v1)
- Log em `faq_audit_log`
- Detecção automática de conflitos

---

## 🔐 Controle de Acesso (RLS)

### Permissões por Função

| Função | Ler | Criar | Editar | Publicar | Rede | Escola |
|--------|-----|-------|--------|----------|------|--------|
| superadmin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| network_manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| content_curator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| secretariat | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| direction | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| coordination | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| auditor | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Políticas RLS

```sql
-- Leitura: usuários veem FAQs de suas escolas + FAQs publicadas
-- Criação: apenas editores de conteúdo
-- Atualização: apenas autores ou editores
-- Auditoria: apenas auditores e superadmins
```

---

## 📊 Workflow de Publicação

```
DRAFT (Rascunho)
    ↓ (Editar e refinar)
REVIEW (Análise)
    ↓ (Revisor aprova)
PUBLISHED (Publicado)
    ├─ Indexado pela IA
    ├─ Visível para público
    └─ Com vigência ativa
    
Opcional: ARCHIVED (Arquivado)
    ├─ Não indexado
    └─ Histórico preservado
```

---

## 🧪 Teste Manual com IA

### Passo 1: Preparar FAQ
1. Vá para `/conteudo-oficial` → Aba "FAQ Oficial"
2. Clique em "Nova pergunta"
3. Preencha campos obrigatórios:
   - Pergunta: ❓ Qual é o período de matrícula?
   - Resposta: 📝 De fevereiro a março de cada ano.
   - Categoria: 📋 Administrativo

### Passo 2: Testar com IA
1. Clique em "Testar com IA"
2. Sistema testa 4 variações de pergunta
3. Visualize resultado (score 0-100%)

**Variações testadas:**
- ❓ Qual é o período de matrícula?
- 🤔 Como é o período de matrícula
- 📖 Me explique sobre período de matrícula
- 🔍 Qual é a resposta para período de matrícula

### Passo 3: Validar Resultado

| Resultado | Ação |
|-----------|------|
| ✅ Verde (≥70%) | Publicar direto |
| ⚠️ Amarelo (50-69%) | Revisar termos-chave |
| ❌ Vermelho (<50%) | Reescrever resposta |

**Exemplo de melhoria:**
```
ANTES (Score 45%):
"De fevereiro a março."

DEPOIS (Score 92%):
"O período de matrícula ocorre de fevereiro a março de cada ano. 
As inscrições são realizadas presencialmente ou online no site da escola."
```

### Passo 4: Salvar
1. Clique em "Salvar FAQ oficial"
2. Sistema cria versão publicada
3. FAQ fica indexada para IA em 2-5 minutos

---

## 🔍 Monitoramento e Auditoria

### Visualizar Histórico
```sql
SELECT * FROM faq_audit_log 
WHERE school_id = 'seu-id' 
ORDER BY created_at DESC;
```

### Detectar Conflitos
```sql
SELECT * FROM faq_conflicts 
WHERE school_id = 'seu-id' 
AND resolved = false;
```

### Validar Indexação
Queries que retornam FAQs indexadas pela IA:
```sql
SELECT * FROM faq_items 
WHERE status = 'published' 
  AND (valid_to IS NULL OR valid_to > NOW())
  AND scope_key = 'network' or school_id IN (...)
ORDER BY updated_at DESC;
```

---

## 🚀 Próximas Melhorias

- [ ] Integração com tradutor automático (PT↔EN)
- [ ] Análise de similaridade entre FAQs (detectar duplicatas)
- [ ] Dashboard de métricas (FAQs mais consultadas)
- [ ] Feedback de usuários ("Esta resposta foi útil?")
- [ ] Sincronização automática network → school
- [ ] Testes A/B de respostas alternativas

---

## 📝 Notas de Implementação

1. **Migration SQL**: Executar `faq_module_migration.sql` no Supabase
2. **Requer Node.js 18+** com express e supabase-js
3. **Browser**: Chrome 90+, Firefox 88+, Safari 14+
4. **Tests**: Implementar via `/api/faq/:id/test` com IA provider configurado


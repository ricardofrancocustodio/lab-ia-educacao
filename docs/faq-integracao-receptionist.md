# 🤖 Integração FAQ com Receptionist (Sistema de IA)

## 📌 Visão Geral

As FAQs publicadas e vigentes são automaticamente indexadas e consultadas pela assistente de IA (Receptionist) durante o fluxo de respostas a perguntas dos usuários.

---

## 🔄 Fluxo de Integração

```
Usuário faz pergunta
    ↓
Receptionist (assistente IA) recebe
    ↓
Sistema busca FAQs PUBLICADAS e VIGENTES
    ↓
Similares aparecem no contexto
    ↓
IA compila resposta com FAQ como fonte
    ↓
Resposta é entregue com badge "resposta baseada em FAQ Oficial"
```

---

## 📁 Arquivos de Integração

### 1. Serviço de IA (`.qodo/services/supabase.js`)

**Função:** `loadOfficialContentKnowledgeRows(scopeSchoolIds)`

```javascript
async function loadOfficialContentKnowledgeRows(scopeSchoolIds = []) {
  if (!supabase || !scopeSchoolIds.length) return [];

  // QUERY: Busca FAQs publicadas e vigentes
  const { data, error } = await supabase
    .from('faq_items')
    .select('id, school_id, scope_key, title, question, answer, status, source_document_id, source_version_id, updated_at')
    .in('school_id', scopeSchoolIds)
    .eq('status', 'published')  // ← Apenas publicadas
    .filter('valid_from', 'lte', new Date().toISOString())  // ← Vigentes
    .filter('valid_to', 'is', null)
    .or(`valid_to.gte.${new Date().toISOString()}`);

  if (error) {
    console.error('Erro ao buscar FAQs para IA:', error.message);
    return [];
  }

  // Converter para formato de documento de conhecimento
  return buildOfficialContentRows(data || []);
}
```

### 2. Match de FAQs (`.qodo/services/knowledgeBase/faqMatcher.js`)

**Função:** `matchFaqToUserQuestion(userQuestion)`

```javascript
async function matchFaqToUserQuestion(userQuestion = '') {
  if (!userQuestion || !supabase) return null;

  // Busca FAQs com similitude semântica
  const { data, error } = await supabase
    .rpc('match_faqs', {
      query_embedding: await embedQuestion(userQuestion),
      match_threshold: 0.5,  // 50% de similitude
      match_count: 5  // Top 5 FAQs relacionadas
    });

  if (error) {
    console.warn('Erro ao buscar FAQs similares:', error);
    return null;
  }

  // Retornar melhor match
  return data && data.length > 0 ? data[0] : null;
}
```

### 3. Build de Knowledge Rows (`.qodo/services/supabase.js`)

**Função:** `buildOfficialContentRows(records)`

```javascript
function buildOfficialContentRows(records = []) {
  return records
    .filter(item => item.module_key === 'faq')
    .map(item => ({
      row_id: item.id,
      school_id: item.school_id,
      source_title: item.title || 'FAQ Oficial',
      source_type: 'official_content',
      retrieval_method: 'official_content',
      content_text: `${item.question}\n${item.answer}`,
      evidence_score: 0.95,  // FAQs oficiais têm score alto
      source_excerpt: item.answer.substring(0, 200),
      metadata: {
        module_key: 'faq',
        scope_key: item.scope_key,
        question: item.question,
        category: item.category,
        valid_from: item.valid_from,
        valid_to: item.valid_to,
        updated_at: item.updated_at
      }
    }));
}
```

---

## 🎯 Exemplo de Uso pela IA

### Cenário: Pergunta sobre Matrícula

**Entrada:**
```
Usuário: "Como faço para matricular meu filho?"
```

**Processo Interno:**
1. Sistema busca FAQs com "matrícula"
2. Encontra 3 FAQs similares:
   - 🟢 "Qual é o período de matrícula?" (92% similitude)
   - 🟡 "Quais documentos são necessários?" (78% similitude)
   - 🟡 "Como faço para se escrever?" (65% similitude)

3. IA compila resposta:
```
"A matrícula acontece no período de fevereiro a março. 
Você pode se inscrever presencialmente na escola ou online 
através do sistema SEEDF. São necessários: CPF do responsável, 
RG ou certidão de nascimento do estudante, e comprovante de residência.

Fonte: FAQ Oficial publicada em 15/01/2026"
```

**Saída:**
```json
{
  "response_text": "A matrícula acontece no período de fevereiro a março...",
  "confidence_score": 0.94,
  "supporting_sources": [
    {
      "source_title": "FAQ Oficial",
      "source_excerpt": "A matrícula é feita online no sistema SEEDF...",
      "evidence_score": 0.95,
      "source_type": "official_content",
      "faq_item_id": "uuid-123"
    }
  ],
  "source_retrieval_method": "official_content"
}
```

---

## 🔌 API de Customização

### Função para Consultar FAQs Diretamente

```javascript
// Não é exposta ao frontend, mas pode ser usada no backend
async function queryFaqForContext(schoolIds, query) {
  if (!supabase) return [];
  
  // Busca FAQs por termo-chave
  const { data } = await supabase
    .from('faq_items')
    .select('id, question, answer, category, valid_from, valid_to')
    .in('school_id', schoolIds)
    .eq('status', 'published')
    .or(`question.ilike.%${query}%,answer.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(5);
  
  return data || [];
}
```

---

## 📊 Métricas e Monitoramento

### Query para Acompanhar Uso

```sql
-- FAQs mais consultadas pela IA (últimos 30 dias)
SELECT 
  fi.answer,
  COUNT(art.id) as test_count,
  AVG(art.match_score) as avg_relevance,
  COUNT(CASE WHEN art.is_relevant THEN 1 END) as relevant_tests
FROM faq_items fi
LEFT JOIN faq_ai_test_results art ON fi.id = art.faq_item_id
WHERE fi.status = 'published'
  AND (fi.valid_to IS NULL OR fi.valid_to > NOW())  
  AND art.test_date > NOW() - INTERVAL '30 days'
GROUP BY fi.id
ORDER BY test_count DESC
LIMIT 20;
```

### Dashboard de Cobertura

```sql
-- Percentual de perguntas com FAQ apropriada
SELECT 
  school_id,
  COUNT(*) as total_faqs,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
  ROUND(
    COUNT(CASE WHEN status = 'published' THEN 1 END)::NUMERIC / 
    COUNT(*) * 100, 2
  ) as coverage_percent
FROM faq_items
GROUP BY school_id;
```

---

## 🔐 Segurança e Privacidade

### FAQs Visíveis por Contexto

**Rede (SEEDF):**
- Acessado por cidadão geral
- Ve apenas FAQs da rede (`scope_key = 'network'`)

```sql
SELECT * FROM faq_items 
WHERE scope_key = 'network' 
  AND status = 'published'
  AND school_id = 'SEEDF_NETWORK_ID';
```

**Escola Específica:**
- Acesso de responsável
- Ve FAQs da rede + FAQs da escola específica

```sql
SELECT * FROM faq_items 
WHERE status = 'published'
  AND (
    scope_key = 'network' 
    OR (scope_key = 'school' AND school_id = 'SPECIFIC_SCHOOL_ID')
  );
```

---

## 🚀 Ativação

### 1. Publicar First FAQ
```bash
# Via interface
1. /conteudo-oficial → FAQ Oficial
2. "Nova pergunta"
3. Fill fields + "Salvar FAQ oficial"
```

### 2. Validar Indexação (2-5 minutos após publicação)
```sql
SELECT COUNT(*) FROM faq_items 
WHERE status = 'published' 
  AND (valid_to IS NULL OR valid_to > NOW());
```

### 3. Testar com Receptionist
```
Usuário: "Qual é o período de matrícula?"
Esperado: Resposta com FAQ Oficial como fonte
```

---

## 📈 Próximas Otimizações

1. **Embedding Automático** - Pré-computar embeddings de FAQs
2. **Reranking by Relevance** - Ordenar FAQs por score de relevância
3. **Feedback Loop** - Usuário marca se resposta foi útil
4. **A/B Testing** - Testar diferentes versões de respostas
5. **FAQ Sugest** - Sugerir novas FAQs baseado em perguntas sem resposta

---

## 🧪 Testes de Integração

### Teste 1: Pergunta Direta
**Input:** "Como recuperar senha?"  
**Expected:** FAQ de tecnologia retornada  
**Validation:**
```sql
-- Verificar que FAQ foi retornada com support_sources
SELECT * FROM assistant_responses 
WHERE supported_source_title LIKE '%FAQ%' 
LIMIT 1;
```

### Teste 2: Pergunta com Variação Semântica
**Input:** "Esqueci minha senha, como faço?"  
**Expected:** Mesma FAQ com score ≥ 0.75  
**Validation:** Score derivado de embedding similarity

### Teste 3: FAQ Expirada
**Input:** "Pergunta sobre FAQ com valid_to = 2025-12-31"  
**Expected:** NOT retornada (está expirada)  
**SQL Validation:**
```sql
SELECT * FROM faq_items 
WHERE valid_to < NOW() AND status = 'published';
-- Esperado: 0 registros retornados na query da IA
```


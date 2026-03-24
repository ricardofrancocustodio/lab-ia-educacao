# 🧪 Guia de Testes - Módulo FAQ Oficial

## ✅ Checklist de Validação

### 1. Database - Tabelas Criadas
- [ ] `faq_items` - itens de FAQ com status e vigência
- [ ] `faq_versions` - histórico de versões  
- [ ] `faq_audit_log` - log de auditoria
- [ ] `faq_conflicts` - detecção de conflitos
- [ ] `faq_ai_test_results` - testes com IA

**Comando de validação:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'faq%';
```

Esperado: 5 tabelas retornadas

---

### 2. Backend - Endpoints Acessíveis

#### Teste 1: Criar FAQ
```bash
curl -X POST http://localhost:8084/api/faq?scope=school \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-school-id: $SCHOOL_ID" \
  -d '{
    "question": "Como recuperar minha senha?",
    "answer": "Clique em Esqueci a senha na tela de login.",
    "category": "Tecnologia",
    "status": "draft",
    "valid_from": "2026-02-01",
    "valid_to": "2026-12-31"
  }'
```

Esperado: Status 200 com `"ok": true`

#### Teste 2: Listar FAQs
```bash
curl -X GET http://localhost:8084/api/faq?scope=school \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-school-id: $SCHOOL_ID"
```

Esperado: Array com FAQs criadas

#### Teste 3: Publicar FAQ
```bash
curl -X POST http://localhost:8084/api/faq/{id}/publish?scope=school \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-school-id: $SCHOOL_ID"
```

Esperado: Status 200 com `"ok": true` e `"status": "published"`

---

### 3. Frontend - Interface Funcional

#### Teste de Acesso
1. Abra http://localhost:8084/conteudo-oficial
2. Verifique se card de FAQ carrega sem erros
3. Verifique abas: Calendário, Matrícula, **FAQ Oficial**, Comunicados

**Esperado:** Aba "FAQ Oficial" visível e acessível

#### Teste de Adição
1. Clique em "Nova pergunta"
2. Preench campos:
   - Pergunta: "Qual é o horário de funcionamento?"
   - Resposta: "De 7h às 17h, de segunda a sexta"
   - Categoria: "Geral"
3. Clique em "Salvar FAQ oficial"

**Esperado:** 
- Mensagem de sucesso
- FAQ appears na lista
- Registro em banco de dados

#### Teste de Importação CSV
1. Clique em "Baixar template CSV"
2. Edite arquivo com 3 perguntas/respostas
3. Clique em "Importar CSV" e selecione arquivo

**Esperado:** 
- 3 FAQs carregadas na interface
- Campos populados corretamente

---

### 4. Testes com IA

#### Teste de Relevância
1. Vá para `/conteudo-oficial` → FAQ Oficial
2. Adicione pergunta: "Qual é a data de início do ano letivo?"
3. Adicione resposta: "O ano letivo começa em fevereiro."
4. Clique em "Testar com IA"

**Esperado:**
```
Score: 85%+ (Verde)
Ótimo! A assistente consegue associar a resposta aos tópicos testados.
```

#### Teste de Resposta Inadequada
1. Pergunta: "Como recuperar senha?"
2. Resposta: "XYZ"
3. Clique em "Testar com IA"

**Esperado:**
```
Score: <50% (Vermelho)
A resposta precisa ser revisada. Tente deixar mais clara e direta.
```

---

### 5. Auditoria e Conflitos

#### Verificar Log de Auditoria
```sql
SELECT action, user_email, status_before, status_after, created_at
FROM faq_audit_log 
WHERE school_id = '$SCHOOL_ID'
ORDER BY created_at DESC 
LIMIT 10;
```

Esperado: Registros de criação, atualização e publicação

#### Verificar Conflitos Detectados
```sql
SELECT * FROM faq_conflicts 
WHERE school_id = '$SCHOOL_ID' 
AND resolved = false;
```

Esperado: Vazio ou conflitos não resolvidos listados

---

### 6. Vigência e Indexação

#### Validar Vigência
```sql
SELECT question, status, valid_from, valid_to 
FROM faq_items 
WHERE school_id = '$SCHOOL_ID' 
  AND valid_from <= NOW()
  AND (valid_to IS NULL OR valid_to > NOW())
  AND status = 'published';
```

Esperado: Apenas FAQs vigentes retornadas

#### Indexação para IA
```sql
-- Simular query que a IA usaria para indexação
SELECT id, question, answer, category 
FROM faq_items 
WHERE status = 'published' 
  AND (valid_to IS NULL OR valid_to > NOW())
  AND scope_key IN ('network', 'school')
ORDER BY updated_at DESC;
```

---

## 🚀 Teste de Fluxo Completo

### Cenário: Publicar SEEDF FAQ

1. **Preparar dados**
   ```
   Pergunta: "Qual é processo de matrícula na SEEDF?"
   Resposta: "A matrícula é feita online no sistema SEEDF 
   de fevereiro a março. Necessários: CPF do responsável, 
   RG ou certidão de nascimento do estudante."
   Categoria: "Administrativo"
   Público-alvo: "Responsáveis"
   ```

2. **Criar FAQ em DRAFT**
   - Ir para `/conteudo-oficial`
   - Clicar "Nova pergunta"
   - Preencher campos
   - Salvar

3. **Testar com IA**
   - Clicar "Testar com IA"
   - Validar score ≥70%
   - Se < 70%, melhorar termos

4. **Publicar**
   - Clicar "Salvar FAQ oficial"
   - Confirmar sucesso

5. **Validar no Banco**
   ```sql
   SELECT * FROM faq_items 
   WHERE question LIKE '%matrícula%' 
   AND status = 'published';
   ```

6. **Validar Auditoria**
   ```sql
   SELECT * FROM faq_audit_log 
   WHERE faq_item_id = '{id}' 
   ORDER BY created_at;
   ```

---

## 🔧 Troubleshooting

### Erro: "Supabase não configurado"
**Causa:** Faltam variáveis de ambiente
**Solução:** 
```bash
# Verificar .env
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

### Erro: "Seu perfil não tem permissão"
**Causa:** Usuário sem role apropriada
**Solução:** 
```sql
UPDATE platform_members 
SET role = 'content_curator' 
WHERE user_id = '{user_id}';
```

### FAQ não aparece na IA
**Causa:** FAQ não está publicado ou vigência expirou
**Solução:** 
```sql
-- Verificar status
SELECT status, valid_from, valid_to FROM faq_items 
WHERE id = '{faq_id}';

-- Corrigir se necessário
UPDATE faq_items 
SET status = 'published', valid_to = NULL 
WHERE id = '{faq_id}';
```

### Teste de IA retorna score baixo
**Causa:** Resposta muito genérica ou tecnicista
**Solução:** 
```
ANTES: "Refere-se ao período administrativo."
DEPOIS: "A matrícula acontece em fevereiro e março. 
Você pode se inscrever presencialmente na escola ou online."
```

---

## 📊 Dados de Teste

### CSV Template para Testes Rápidos
```csv
pergunta,resposta,categoria,publico_alvo,vigencia_inicio,vigencia_fim,escopo
"O que é exigido para matrícula?","CPF, RG e comprovante de residência","Administrativo","Responsáveis","2026-02-01","2026-03-31","school"
"Como consultar notas?","Acesse o portal do estudante com seu login","Acadêmico","Estudantes","2026-02-01","","school"
"Qual o horário de atendimento?","Segunda a sexta de 8h às 17h","Geral","Todos","2026-01-01","","school"
"Como entro em contato?","Telefone (61) 1234-5678 ou email contato@escola.br","Atendimento","Todos","2026-01-01","","school"
"Há atividades no contra-turno?","Sim, oferecemos projetos esportivos e de artes","Acadêmico","Estudantes","2026-02-01","","school"
```

### Perguntas para Teste de IA
1. "Como me matricular?" → Deve retornar ~90% relevância
2. "O que precise para entrar?" → Deve retornar ~85% relevância  
3. "Onde fica a escola?" → Deve retornar 0% (sem FAQ relevante)
4. "Há clubes extracurriculares?" → Deve retornar ~80% relevância

---

## ✅ Critério de Aceitação

- [x] Sistema cria/lê/atualiza/deleta FAQs
- [x] Status multi-stage funciona (draft→review→published)
- [x] Vigência controla indexação
- [x] Auditoria registra todas as ações
- [x] Testes com IA validam relevância
- [x] Conflitos detectados e reportados
- [x] Interface intuitiva e responsiva
- [x] RLS protege dados por escola
- [x] Import/export CSV funcional

---

## 🎯 Próximas Sessões de Teste

1. **Integração com Receptionist** - FAQ deve aparecer em respostas da IA
2. **Performance** - Testar com 1000+ FAQs
3. **Mobile** - Validar responsividade em smartphones
4. **Multi-idioma** - Suporte PT/EN/ES


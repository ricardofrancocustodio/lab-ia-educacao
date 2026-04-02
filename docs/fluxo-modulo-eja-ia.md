# Fluxo Mínimo — Módulo de Apoio Pedagógico com IA Governada (EJA)

## 1. Tela de Curadoria de Conteúdo (Professor/Coordenador) — ✅ Implementado (31/03/2026)
- ✅ Upload de PDF, links, vídeos, roteiros
- ✅ Extração assistida de texto do PDF (pdf-parse v2)
- ✅ Tela de comparação lado a lado: PDF original x texto extraído (modal near-fullscreen)
- ✅ Campo de texto oficial validado pelo professor para corrigir falhas de extração
- ✅ Campos: disciplina, série/módulo, turma, assunto
- ✅ Lista de materiais com filtro por status (rascunho, aguardando aprovação, publicado, arquivado)
- ✅ Fluxo de aprovação/reprovação: professor envia para coordenação → coordenador aprova (publica) ou reprova (volta para rascunho com justificativa). Professor não pode publicar diretamente. Coordenador não vê rascunhos.
- ✅ Histórico de versões (com carregamento on-demand do texto de cada versão)

## 2. Integração com Moodle — 🔜 Adiado para fase posterior
> **Justificativa:** Não há instância Moodle disponível no momento. A integração será implementada após a conclusão das telas do aluno, professor e incidentes (Partes 3–5), quando o fluxo interno estiver completo e validado. A arquitetura atual (API REST + Supabase JWT) já suporta a adição futura de LTI 1.3 ou link externo autenticado sem refatoração.

- 🔜 Plugin ou link externo autenticado (SSO) — recomendação: LTI 1.3
- 🔜 Sincronização de usuários (aluno/professor) — via launch LTI ou importação
- 🔜 Acesso ao chat IA via Moodle ou painel externo

## 3. Tela do Aluno: Chat com IA — ✅ Implementado (consolidado em simulador-chat.html)
- ✅ Campo para digitar dúvidas
- ✅ IA responde apenas com base no material aprovado daquela disciplina/turma
- ✅ Botão "Falar com professor" se a dúvida não for resolvida (com aviso de fluxo em definição)
- ✅ Histórico das interações
- ✅ Feedback: "A resposta foi útil?" (sim/não/incidente)

## 4. Tela do Professor: Painel de Governança — ✅ Implementado (01/04/2026)
- ✅ Visualização de interações dos alunos com a IA
- ✅ Filtros por aluno, disciplina, data, tipo de dúvida
- ✅ Notificações de incidentes/dúvidas não resolvidas
- ✅ Relatórios de uso, temas mais consultados, incidentes abertos/fechados

## 5. Tela de Gestão de Incidentes — ✅ Integrado (já existente na LAB-IA)
- ✅ Lista de incidentes abertos (resposta inadequada, dúvida não resolvida, etc.)
- ✅ Detalhe do incidente: pergunta, resposta da IA, contexto, ação tomada
- ✅ Marcar como resolvido, adicionar comentário, encaminhar para revisão

## 6. Arquitetura Mínima — ✅ Verificado
- ✅ Backend LAB-IA: upload, extração assistida de PDF, versionamento, logs, incidentes, chat IA
- 🔜 Integração Moodle: plugin ou API REST para autenticação e passagem de contexto
- ✅ Banco de dados: separação entre conteúdo institucional e pedagógico (Supabase)
- ✅ Camada de governança: logs, trilha de auditoria (formal_audit_events), painel de incidentes

## 7. Fluxo de Publicação com PDF — ✅ Implementado
- ✅ Professor envia o PDF original do material
- ✅ Sistema extrai automaticamente o texto disponível no PDF
- ✅ Interface apresenta comparação lado a lado entre o arquivo original e o texto extraído
- ✅ Professor revisa, corrige e complementa o texto oficial validado
- ✅ Somente o texto validado é publicado como base oficial para a IA
- ✅ O PDF permanece armazenado como documento de origem para conferência humana, auditoria e reabertura futura
*** Add File: c:\Projects\lab-ia-educacao\supabase\snippets\teaching_content_pdf_storage.sql
alter table public.knowledge_source_versions
	add column if not exists storage_bucket text null;

alter table public.knowledge_source_versions
	add column if not exists storage_path text null;

---

**Resumo:**
- Professor publica e gerencia material didático
- Aluno acessa chat IA (via Moodle ou painel externo) para dúvidas sobre o conteúdo
- IA responde só com base no material aprovado
- Professor acompanha, recebe alertas e pode intervir
- Incidentes são registrados e tratados
- Tudo auditável, iterável e sob controle institucional

# Modelo de Vinculo Institucional

## Objetivo

Preparar o sistema para o teste real de isolamento entre secretarias e escolas, deixando explicito:

- qual tipo de instituicao cada registro em `schools` representa
- como cada perfil pode ser vinculado
- quais perfis sao internos e quais podem ser externos

## Novos conceitos

### schools.institution_type

Valores suportados:

- `education_department`: secretaria de educacao, rede ou mantenedora
- `school_unit`: unidade escolar vinculada a uma secretaria/rede

### schools.parent_school_id

- obrigatorio para `school_unit`
- deve apontar para uma instituicao `education_department`

### school_members.member_scope

Valores suportados:

- `department_staff`
- `school_staff`
- `external_auditor`
- `external_observer`

## Regras por perfil

- `network_manager`: somente em `education_department`, com `department_staff`
- `secretariat`: somente em `education_department`, com `department_staff`
- `treasury`: somente em `education_department`, com `department_staff`
  Observacao: perfil legado. Enquanto nao houver modulo financeiro, nao deve ser oferecido na criacao de usuarios.
- `direction`: interno (`department_staff` ou `school_staff`)
- `coordination`: interno (`department_staff` ou `school_staff`)
- `public_operator`: interno (`department_staff` ou `school_staff`)
- `content_curator`: interno (`department_staff` ou `school_staff`)
- `auditor`: `department_staff` ou `external_auditor`
- `observer`: `department_staff` ou `external_observer`

## Impacto no isolamento

Com esse modelo:

- uma secretaria pode existir como instituicao propria
- uma escola pode ficar subordinada a uma secretaria
- cada membro passa a ter vinculo institucional explicito
- o teste entre Escola A e Escola B deixa de depender de convencao manual

## Proximo teste recomendado

1. Criar uma secretaria `education_department`
2. Criar ao menos 2 `school_unit` com `parent_school_id` apontando para essa secretaria
3. Vincular perfis internos e externos com `member_scope` coerente
4. Reexecutar o Bloco 2 de isolamento

## SQL de aplicacao

Executar:

- `supabase/snippets/institution_affiliation_hardening.sql`



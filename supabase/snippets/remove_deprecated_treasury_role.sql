-- Migration: descontinuar o perfil de acesso treasury
-- Objetivo:
-- 1. Reclassificar membros legados de treasury para secretariat
-- 2. Remover permissoes por papel ainda vinculadas a treasury
-- 3. Preservar assistentes tematicos como administration.treasury

begin;

update public.school_members
set role = 'secretariat',
    updated_at = now()
where lower(coalesce(role, '')) = 'treasury';

delete from public.role_page_permissions
where lower(coalesce(role, '')) = 'treasury';

commit;
# Checklist Funcional Pos-Deploy do RLS LGPD

## Objetivo

Validar se o deploy de RLS e do endurecimento de acesso manteve o sistema funcionando e bloqueou acesso indevido entre escolas.

## Preparacao

Antes de iniciar:

- tenha pelo menos 2 escolas com dados reais ou de homologacao
- tenha usuarios de teste para os perfis:
  - `superadmin`
  - `network_manager`
  - `content_curator`
  - `secretariat`
  - `direction`
  - `auditor`
  - `observer`
- tenha pelo menos 1 usuario ativo em cada escola
- execute antes o SQL de validacao estrutural em `supabase/snippets/lgpd_rls_validation_queries.sql`

## Smoke Test Inicial

- login com usuario valido continua funcionando
- pagina inicial carrega sem erro de sessao
- menus respeitam o perfil
- nao ha erro 401/403 inesperado nas paginas principais

## Teste de Isolamento Entre Escolas

Com um usuario do CEF 01 (DF):

- abrir dashboard e confirmar que os numeros pertencem apenas ao CEF 01
- abrir conteudo oficial e confirmar que nao aparecem registros do CEPI Lyceu (GO)
- abrir base de conhecimento e confirmar que nao aparecem fontes do CEPI Lyceu (GO)
- abrir auditoria e confirmar que nao aparecem eventos do CEPI Lyceu (GO)

Resultado esperado:

- nenhum dado do CEPI Lyceu (GO) deve ser visivel

## Teste por Perfil

### superadmin

Deve conseguir:

- acessar dashboard
- acessar auditoria
- acessar usuarios
- acessar conteudo oficial
- acessar base de conhecimento
- acessar preferencias de IA

Validar:

- consegue ler e salvar conteudo oficial
- consegue alterar provider/modelo de IA
- consegue visualizar historico de fontes

### network_manager

Deve conseguir:

- acessar dashboard
- acessar auditoria
- acessar usuarios
- acessar conteudo oficial
- acessar base de conhecimento
- acessar preferencias

Validar:

- consegue gerenciar membros/permissoes
- consegue publicar nova fonte de conhecimento
- consegue alterar configuracao de IA

### content_curator

Deve conseguir:

- acessar dashboard
- acessar auditoria
- acessar base de conhecimento
- acessar conteudo oficial

Validar:

- consegue importar/publicar fontes
- consegue editar conteudo oficial
- nao consegue alterar configuracao de IA
- nao consegue administrar usuarios

### secretariat

Deve conseguir:

- acessar atendimento
- acessar base de conhecimento
- acessar conteudo oficial
- acessar dashboard operacional, se este for permitido na escola

Validar:

- consegue ler consultas e historico operacional
- consegue editar conteudo oficial
- nao consegue alterar configuracao de IA
- nao consegue acessar governanca detalhada se o front tentar expor mais do que deve

### direction

Deve conseguir:

- acessar dashboard
- acessar auditoria
- acessar base de conhecimento
- acessar conteudo oficial
- acessar preferencias de IA

Validar:

- consegue visualizar auditoria e incidentes
- consegue alterar configuracao de IA
- consegue gerenciar conteudo institucional

### auditor

Deve conseguir:

- acessar dashboard
- acessar auditoria

Validar:

- consegue ler auditoria, incidentes e evidencias
- nao consegue editar conteudo oficial
- nao consegue alterar configuracao de IA
- nao consegue administrar usuarios

### observer

Deve conseguir:

- acessar dashboard permitido
- acessar base de conhecimento permitida

Validar:

- nao consegue editar nenhum dado institucional
- nao consegue acessar auditoria sensivel
- nao consegue acessar configuracao de IA

## Testes de Operacao Critica

### Conteudo Oficial

- listar registros
- salvar calendario
- salvar FAQ
- validar que um perfil sem permissao recebe bloqueio

### Base de Conhecimento

- listar fontes
- abrir historico de versoes
- publicar nova versao com perfil autorizado
- validar bloqueio com perfil nao autorizado

### Preferencias de IA

- ler provider/modelos atuais
- salvar nova configuracao com `network_manager` ou `direction`
- validar bloqueio com `content_curator`, `secretariat`, `observer`

### Dashboard

- abrir dashboard com perfis autorizados
- garantir ausencia de erro 401/403 indevido
- validar que os dados carregam apenas da escola correta

### Auditoria e Incidentes

- abrir auditoria com `auditor` e `direction`
- validar que `observer` e perfis operacionais sem governanca nao acessam detalhes sensiveis

## Testes Negativos

- remover token da sessao e tentar chamar rota protegida
- alterar `school_id` manualmente no client e repetir chamada
- usar usuario do CEF 01 (DF) para tentar acessar dado conhecido do CEPI Lyceu (GO)

Resultado esperado:

- backend responde com bloqueio
- nenhum dado cruzado aparece

## Sinais de Regressao

Se ocorrer qualquer um destes casos, interromper o deploy:

- usuarios ativos perdem acesso ao proprio contexto escolar sem motivo
- `observer` consegue editar dados
- `secretariat` consegue alterar provider de IA
- `auditor` consegue alterar conteudo operacional
- dados de outra escola aparecem para usuario autenticado
- telas principais passam a depender de `school_id` livre do navegador

## Evidencias a Registrar

Para cada perfil testado, registrar:

- usuario usado
- escola usada
- paginas testadas
- operacoes permitidas com sucesso
- operacoes negadas corretamente
- prints ou logs de erro, se houver

## Encerramento

A liberacao so deve acontecer quando:

- o SQL de validacao estrutural passar
- os testes por perfil passarem
- o isolamento entre escolas estiver confirmado
- nao houver credenciais sensiveis expostas no repositorio

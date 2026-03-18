param(
  [string]$OutputFile = "project-context-for-ai.md"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = Join-Path $root $OutputFile

function RelPath([string]$fullPath) {
  $uriRoot = New-Object System.Uri(($root.TrimEnd('\') + '\'))
  $uriPath = New-Object System.Uri($fullPath)
  return [System.Uri]::UnescapeDataString($uriRoot.MakeRelativeUri($uriPath).ToString()).Replace('/', '\')
}

function Get-TreeText {
  param(
    [string]$BasePath,
    [int]$MaxDepth = 3,
    [string[]]$ExcludeDirs = @("node_modules", ".git", ".firebase", "test-results")
  )

  $lines = New-Object System.Collections.Generic.List[string]

  function Walk([string]$CurrentPath, [string]$Prefix, [int]$Depth) {
    if ($Depth -gt $MaxDepth) { return }

    $items = Get-ChildItem -LiteralPath $CurrentPath -Force |
      Where-Object { -not ($_.PSIsContainer -and $ExcludeDirs -contains $_.Name) } |
      Sort-Object @{ Expression = { -not $_.PSIsContainer } }, Name

    for ($i = 0; $i -lt $items.Count; $i++) {
      $item = $items[$i]
      $isLast = $i -eq ($items.Count - 1)
      $branch = if ($isLast) { "\-- " } else { "+-- " }
      $lines.Add("$Prefix$branch$($item.Name)")

      if ($item.PSIsContainer -and $Depth -lt $MaxDepth) {
        $nextPrefix = if ($isLast) { "$Prefix    " } else { "$Prefix|   " }
        Walk -CurrentPath $item.FullName -Prefix $nextPrefix -Depth ($Depth + 1)
      }
    }
  }

  $rootName = Split-Path $BasePath -Leaf
  if ([string]::IsNullOrWhiteSpace($rootName)) {
    $rootName = $BasePath
  }
  $lines.Add($rootName)
  Walk -CurrentPath $BasePath -Prefix "" -Depth 1
  return ($lines -join "`r`n")
}

function Add-FeatureTable {
  param(
    [System.Text.StringBuilder]$Builder,
    [string]$Title,
    [object[]]$Rows
  )

  [void]$Builder.AppendLine("### $Title")
  [void]$Builder.AppendLine("")
  [void]$Builder.AppendLine("| Caminho | Funcionalidade |")
  [void]$Builder.AppendLine("|---|---|")
  foreach ($row in $Rows) {
    [void]$Builder.AppendLine("| ``$($row.Path)`` | $($row.Description) |")
  }
  [void]$Builder.AppendLine("")
}

$backendFeatures = @(
  @{ Path = "server.js"; Description = "Servidor Node.js com Express. Centraliza APIs do produto: eventos publicos, pagamentos Mercado Pago, monitor social, importacao de autorizacoes, notificacoes e webhooks." },
  @{ Path = ".qodo\web\webhook.js"; Description = "Webhook complementar do ecossistema Qodo/Webchat, plugado no servidor principal em `/webhook`." },
  @{ Path = ".qodo\api\webchat.js"; Description = "API complementar do webchat, plugada em `/api/webchat`." },
  @{ Path = "schema.sql"; Description = "Schema base inicial do banco. Serve como referencia estrutural do projeto." },
  @{ Path = "supabase\snippets\activity_finance_schema.sql"; Description = "Estrutura de financiamento de atividades, pagina publica e controle de pagamentos por responsavel." },
  @{ Path = "supabase\snippets\events_and_trips_schema.sql"; Description = "Estrutura principal de eventos e passeios: cadastro, configuracao, pagina publica e fluxo de adesao." },
  @{ Path = "supabase\snippets\event_authorization_csv_schema.sql"; Description = "Base para importar publico-alvo e autorizacoes de eventos via CSV." },
  @{ Path = "supabase\snippets\event_attendance_schema.sql"; Description = "Persistencia da lista de presenca operacional por evento e aluno." },
  @{ Path = "supabase\snippets\notice_board_schema.sql"; Description = "Mural/notice board com abas de gestao e publicacao." },
  @{ Path = "supabase\snippets\social_monitor_schema.sql"; Description = "Monitor social com conectores, mensagens recebidas, triagem sensivel e fila de revisao da diretoria." },
  @{ Path = "supabase\snippets\rbac_page_permissions.sql"; Description = "Permissoes de pagina e controle RBAC por escola e papel." },
  @{ Path = "supabase\snippets\notification_user_settings_migration.sql"; Description = "Preferencias individuais de notificacao por usuario." },
  @{ Path = "supabase\snippets\notifications_per_user_delivery.sql"; Description = "Entrega e rastreio de notificacoes por usuario." },
  @{ Path = "supabase\snippets\sync_school_members_role_entities.sql"; Description = "Sincronizacao entre membros da escola, papeis e entidades relacionadas." },
  @{ Path = "scripts"; Description = "Scripts utilitarios para manutencao, exportacao de contexto, testes isolados e automacoes locais." }
)

$frontendFeatures = @(
  @{ Path = "public\dist\components"; Description = "Componentes compartilhados do layout: head, header, sidebar e footer." },
  @{ Path = "public\dist\js\components-loader.js"; Description = "Carrega os componentes compartilhados nas paginas do frontend." },
  @{ Path = "public\dist\js\session.js"; Description = "Gerencia sessao no frontend e auxilia protecao de paginas." },
  @{ Path = "public\dist\js\permissions.js"; Description = "Mapa de permissoes por pagina/funcao para esconder ou liberar modulos na interface." },
  @{ Path = "public\dist\dashboard.html"; Description = "Dashboard principal da escola." },
  @{ Path = "public\dist\js\dashboard"; Description = "KPIs, graficos e consolidacao do dashboard principal." },
  @{ Path = "public\dist\crm.html"; Description = "Tela de CRM comercial/relacionamento." },
  @{ Path = "public\dist\js\crm.js"; Description = "Logica principal do CRM." },
  @{ Path = "public\dist\leads.html"; Description = "Tela de gestao de leads." },
  @{ Path = "public\dist\js\leads"; Description = "Arquitetura modular dos leads: controller, service e UI." },
  @{ Path = "public\dist\calendar.html"; Description = "Calendario operacional." },
  @{ Path = "public\dist\js\calendar-logic.js"; Description = "Regras de calendario e agenda visual." },
  @{ Path = "public\dist\agenda-atendimentos.html"; Description = "Agenda de atendimentos/visitas." },
  @{ Path = "public\dist\js\agenda-atendimentos.js"; Description = "Fluxo operacional dos atendimentos agendados." },
  @{ Path = "public\dist\chat-manager.html"; Description = "Tela de conversa/chat da operacao." },
  @{ Path = "public\dist\js\chat\chat-manager.js"; Description = "Gerencia UI de conversas, mensagens e atendimento." },
  @{ Path = "public\dist\events.html"; Description = "Gestao de eventos e passeios: cadastro, escopo por segmento/turmas, pagamentos, autorizacoes e lista operacional." },
  @{ Path = "public\dist\js\events\events-manager.js"; Description = "Motor do modulo de eventos: modal, regras de negocio, lista operacional, presenca, exportacoes e integracao com pagina publica." },
  @{ Path = "public\dist\event-public.html"; Description = "Pagina publica do evento para familia autorizar, visualizar detalhes e pagar." },
  @{ Path = "public\dist\js\events\event-public.js"; Description = "Fluxo publico do evento: elegibilidade, autorizacao, tracking e pagamento." },
  @{ Path = "public\dist\activity-finance.html"; Description = "Gestao interna de financiamento de atividades." },
  @{ Path = "public\dist\js\activity-finance\activity-finance-manager.js"; Description = "CRUD, regras e painel operacional de financiamento." },
  @{ Path = "public\dist\activity-finance-public.html"; Description = "Pagina publica de pagamento/adesao do financiamento." },
  @{ Path = "public\dist\js\activity-finance\activity-finance-public.js"; Description = "Fluxo publico de financiamento, elegibilidade e pagamento." },
  @{ Path = "public\dist\notice-board.html"; Description = "Mural interno com abas de gestao e publicacao." },
  @{ Path = "public\dist\js\notice-board"; Description = "Core do mural e abas especializadas para gestao e mural." },
  @{ Path = "public\dist\social-monitor.html"; Description = "Painel de monitoramento de Instagram, Facebook e TikTok com triagem sensivel e fila manual." },
  @{ Path = "public\dist\js\social\social-monitor.js"; Description = "Frontend do monitor social: overview, simulacao, fila sensivel e configuracao de conectores." },
  @{ Path = "public\dist\reports.html"; Description = "Hub de relatorios da operacao." },
  @{ Path = "public\dist\js\reports"; Description = "Graficos e relatorios especificos: funil, demanda, impacto IA, heatmap, status e correlatos." },
  @{ Path = "public\dist\preferences-notifications.html"; Description = "Tela de preferencias e notificacoes." },
  @{ Path = "public\dist\js\preferences"; Description = "Configuracoes gerais, dados, UI e notificacoes por usuario." },
  @{ Path = "public\dist\profile.html"; Description = "Perfil do usuario autenticado." },
  @{ Path = "public\dist\js\profile"; Description = "Edicao de perfil e validacao de senha." },
  @{ Path = "public\dist\users.html"; Description = "Gestao de usuarios e acessos." },
  @{ Path = "public\dist\js\users\users.js"; Description = "Cadastro/edicao de usuarios, papeis e rotulos de paginas." }
)

$backendFlowNotes = @(
  "Eventos e passeios: o backend expõe endpoints publicos para consultar evento, validar elegibilidade, registrar autorizacao, rastrear acessos e processar pagamentos.",
  "Financiamento de atividades: replica o modelo publico/privado dos eventos, mas focado em arrecadacao/adesao financeira.",
  "Monitor social: recebe mensagens de conectores/redes, classifica o teor, bloqueia respostas sensiveis, cria alertas para a diretoria e tenta responder automaticamente quando permitido.",
  "Mercado Pago: recebe webhooks, cria pagamentos PIX/cartao e atualiza o status operacional.",
  "Notificacoes: possui rotas para lembretes, notificacao em comunidade e preferencias por usuario."
)

$frontendFlowNotes = @(
  "Frontend administrativo em `public\\dist`, com paginas HTML por modulo e JS separado por dominio funcional.",
  "A UI usa componentes compartilhados e mapa de permissao para montar menu e acesso conforme o papel do usuario.",
  "Cada modulo principal possui pagina interna e, quando necessario, pagina publica correspondente para familia/responsavel.",
  "Eventos, financiamento e monitor social ja estao organizados de forma que outra IA consiga reproduzir a experiencia completa olhando HTML + JS + schema backend correspondente."
)

[string]$mdFence = '```'

$builder = New-Object System.Text.StringBuilder
[void]$builder.AppendLine('# Contexto do Projeto Qnexy para Reproducao por IA')
[void]$builder.AppendLine("")
[void]$builder.AppendLine("Gerado em: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')")
[void]$builder.AppendLine("")
[void]$builder.AppendLine('## Visao Geral')
[void]$builder.AppendLine("")
[void]$builder.AppendLine('- Stack principal: Node.js + Express no backend, Supabase como banco/autenticacao e frontend administrativo estatico em `public\dist`.')
[void]$builder.AppendLine('- Arquivo principal do backend: `server.js`.')
[void]$builder.AppendLine('- Banco: migrations/snippets SQL em `supabase\snippets` e schema base em `schema.sql`.')
[void]$builder.AppendLine('- Objetivo geral do produto: plataforma escolar com CRM, leads, calendario, eventos/passeios, financiamento de atividades, mural, relatorios, perfil/permissoes e monitor social com IA.')
[void]$builder.AppendLine("")
[void]$builder.AppendLine('## Estrutura de Pastas')
[void]$builder.AppendLine("")
[void]$builder.AppendLine('### Raiz')
[void]$builder.AppendLine("")
[void]$builder.AppendLine("$mdFence" + 'text')
[void]$builder.AppendLine((Get-TreeText -BasePath $root -MaxDepth 2))
[void]$builder.AppendLine($mdFence)
[void]$builder.AppendLine("")
[void]$builder.AppendLine('### Backend')
[void]$builder.AppendLine("")
[void]$builder.AppendLine("$mdFence" + 'text')
[void]$builder.AppendLine((Get-TreeText -BasePath (Join-Path $root "supabase") -MaxDepth 2))
[void]$builder.AppendLine($mdFence)
[void]$builder.AppendLine("")
[void]$builder.AppendLine("$mdFence" + 'text')
[void]$builder.AppendLine('server.js')
[void]$builder.AppendLine('schema.sql')
if (Test-Path (Join-Path $root "scripts")) {
  [void]$builder.AppendLine('scripts')
}
if (Test-Path (Join-Path $root ".qodo")) {
  [void]$builder.AppendLine('.qodo')
}
[void]$builder.AppendLine($mdFence)
[void]$builder.AppendLine("")
[void]$builder.AppendLine('### Frontend')
[void]$builder.AppendLine("")
[void]$builder.AppendLine("$mdFence" + 'text')
[void]$builder.AppendLine((Get-TreeText -BasePath (Join-Path $root "public\\dist") -MaxDepth 3))
[void]$builder.AppendLine($mdFence)
[void]$builder.AppendLine("")
[void]$builder.AppendLine('## Backend')
[void]$builder.AppendLine("")
[void]$builder.AppendLine('### Papel do Backend')
[void]$builder.AppendLine("")
foreach ($note in $backendFlowNotes) {
  [void]$builder.AppendLine("- $note")
}
[void]$builder.AppendLine("")
Add-FeatureTable -Builder $builder -Title "Arquivos e Modulos do Backend" -Rows $backendFeatures
[void]$builder.AppendLine('## Frontend')
[void]$builder.AppendLine("")
[void]$builder.AppendLine('### Papel do Frontend')
[void]$builder.AppendLine("")
foreach ($note in $frontendFlowNotes) {
  [void]$builder.AppendLine("- $note")
}
[void]$builder.AppendLine("")
Add-FeatureTable -Builder $builder -Title "Arquivos e Modulos do Frontend" -Rows $frontendFeatures
[void]$builder.AppendLine('## Como Outra IA Pode Reproduzir o Projeto')
[void]$builder.AppendLine("")
[void]$builder.AppendLine('1. Recriar primeiro a estrutura de dados do Supabase a partir de `schema.sql` e dos arquivos em `supabase\snippets`.')
[void]$builder.AppendLine('2. Implementar o backend Express usando `server.js` como eixo central de rotas e integracoes.')
[void]$builder.AppendLine('3. Reproduzir o frontend por dominio funcional em `public\dist`, mantendo o padrao `pagina.html` + `js/modulo/*.js`.')
[void]$builder.AppendLine('4. Garantir RBAC e carregamento de componentes compartilhados antes de montar os modulos especificos.')
[void]$builder.AppendLine('5. Validar principalmente os fluxos criticos: evento publico, financiamento publico, mural, permissoes e monitor social.')
[void]$builder.AppendLine("")
[System.IO.File]::WriteAllText($outputPath, $builder.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Arquivo gerado com sucesso: $outputPath"

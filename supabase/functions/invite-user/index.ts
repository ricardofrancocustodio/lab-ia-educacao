// invite-user/index.ts - VERSÃO COM RESEND
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inicializa Resend
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_KEY') ??
      ''

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados na Edge Function.')
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const body = await req.json()
    const { email, nome, role, school_id } = body
    const appBaseUrl = (Deno.env.get('APP_BASE_URL') || 'http://localhost:8084').replace(/\/$/, '')
    const acceptInviteUrl = `${appBaseUrl}/dist/accept-invite.html`
    const sendInvite = body?.send_invite !== false
    const authOnly = body?.auth_only === true
    const emailNorm = String(email || '').trim().toLowerCase()

    console.log("Processando usuário:", emailNorm, "| Escola:", school_id, "| send_invite:", sendInvite, "| auth_only:", authOnly)

    // Validação
    if (!emailNorm || !school_id) {
      throw new Error("E-mail e School ID são obrigatórios.")
    }

    async function findAuthUserByEmail(targetEmail: string) {
      let page = 1
      const perPage = 100
      while (page <= 10) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (error) throw error

        const users = data?.users || []
        const found = users.find((u) => String(u.email || '').toLowerCase() === targetEmail)
        if (found) return found
        if (users.length < perPage) break
        page += 1
      }
      return null
    }

    let authUser = await findAuthUserByEmail(emailNorm)

    // ✅ Sempre garante usuário no Auth ANTES de qualquer outra operação
    if (!authUser) {
      const tempPassword = `${crypto.randomUUID()}Aa1!`
      const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          full_name: nome,
          school_id: school_id,
          role: role
        }
      })

      if (createErr && !String(createErr.message || '').toLowerCase().includes('already')) {
        throw createErr
      }

      authUser = createdData?.user || await findAuthUserByEmail(emailNorm)
    }

    if (!authUser?.id) {
      throw new Error('Não foi possível obter o UUID do usuário no Authentication.')
    }

    // 🔒 Etapa 1: somente garantir usuário no Auth (sem tocar school_members)
    if (authOnly) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Usuário garantido no Authentication.',
        user_id: authUser.id,
        email: emailNorm
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let emailId: string | null = null
    let actionLink: string | null = null

    if (sendInvite) {
      // ✅ 1. Tenta link de convite.
      // Se o usuário já estiver registrado no Auth, faz fallback para magiclink.
      let inviteData: any = null
      let inviteError: any = null
      ;({ data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: emailNorm,
        options: {
          data: {
            full_name: nome,
            school_id: school_id,
            role: role
          },
          redirectTo: acceptInviteUrl
        }
      }))

      if (inviteError) {
        const inviteMsg = String(inviteError?.message || '').toLowerCase()
        const alreadyRegistered = inviteMsg.includes('already been registered') || inviteMsg.includes('already registered')

        if (!alreadyRegistered) {
          console.error("Erro ao gerar link de convite:", inviteError)
          throw inviteError
        }

        console.log("Usuário já registrado no Auth. Gerando magiclink para acesso.")
        const { data: magicData, error: magicErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: emailNorm,
          options: {
            data: {
              full_name: nome,
              school_id: school_id,
              role: role
            },
            redirectTo: acceptInviteUrl
          }
        })

        if (magicErr) {
          console.error("Erro ao gerar magiclink:", magicErr)
          throw magicErr
        }

        actionLink = magicData?.properties?.action_link || null
      } else {
        actionLink = inviteData?.properties?.action_link || null
      }

      if (!actionLink) {
        throw new Error('Não foi possível gerar link de acesso para o usuário.')
      }

      // ✅ 2. ENVIA EMAIL COM RESEND
      const { data: resendData, error: emailError } = await resend.emails.send({
        from: 'LAB-AI Educacao <no-reply@lab-ai.local>',
        to: [emailNorm],
        subject: 'Convite para acessar o LAB-AI Educacao',
        html: generateInviteEmailHTML(nome, actionLink),
        tags: [
          { name: 'category', value: 'invite' },
          { name: 'school_id', value: school_id }
        ]
      })

      if (emailError) {
        console.error("Erro ao enviar email:", emailError)
        throw new Error(`Falha no envio de email: ${emailError.message}`)
      }

      emailId = resendData?.id || null
      console.log("✅ Email enviado via Resend:", emailId)
    }

    // ✅ 3. Registra no banco com user_id quando disponível
    const status = sendInvite ? 'invited' : 'pending'
    const active = false
    const { error: dbError } = await supabaseAdmin
      .from('school_members')
      .upsert({
        email: emailNorm,
        name: nome,
        role: role,
        school_id: school_id,
        user_id: authUser.id,
        status,
        active,
        invite_sent_at: sendInvite ? new Date().toISOString() : null,
        invite_token: actionLink ? actionLink.split('token=')[1]?.split('&')[0] || null : null
      }, { onConflict: 'school_id,email' })

    if (dbError) {
      throw new Error(`school_members upsert falhou: ${dbError.message}`)
    }

    // ✅ 4. SE QUISER, também cria o usuário no Auth (opcional)
    // Mas como já geramos o link, o usuário pode se registrar quando clicar
    // Se quiser criar previamente:
    /*
    const { data: userData } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: false,  // Não confirmado ainda
      user_metadata: { 
        full_name: nome, 
        school_id: school_id, 
        role: role 
      }
    })
    */

    return new Response(JSON.stringify({ 
      success: true, 
      message: sendInvite ? "Convite enviado com sucesso!" : "Usuário sincronizado com sucesso!",
      email_id: emailId,
      resend_status: sendInvite ? "sent" : "not_sent",
      user_id: authUser?.id || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("ERRO NA EXECUÇÃO:", error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// ✅ Função para gerar HTML do email (baseado no seu template)
function generateInviteEmailHTML(nome: string, confirmationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; padding: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; background-color: #f4f6f9; }
        .button { 
            background-color: #007bff; 
            color: #ffffff; 
            padding: 15px 35px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            display: inline-block; 
            font-size: 16px;
            transition: background-color 0.3s;
        }
        .button:hover { background-color: #0069d9 !important; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .button { padding: 12px 25px; font-size: 14px; }
        }
    </style>
</head>
<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); max-width: 100%;" class="container">
                    <tr>
                        <td align="center" style="padding: 40px 0; background-color: #007bff; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">LAB-AI</h1>
                            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Atendimento institucional e governanca com IA auditavel</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">Olá, ${nome}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 24px; margin-bottom: 30px;">
                                Você recebeu um convite para acessar a plataforma <strong style="color: #007bff;">LAB-AI Educacao</strong>.
                                Clique no botão abaixo para ativar sua conta e configurar sua senha de acesso.
                            </p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                       <a href="${confirmationUrl}" 
                                           class="button"
                                           style="font-color:'#ffffff';"
                                           target="_blank">
                                           Ativar Minha Conta →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #999999; font-size: 14px; margin-top: 30px; line-height: 20px;">
                                <strong>⚠️ Link válido por 24 horas</strong><br>
                                Se o botão não funcionar, copie e cole este link no navegador:<br>
                                <code style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; word-break: break-all; font-size: 12px; display: inline-block; margin-top: 5px;">
                                    ${confirmationUrl}
                                </code>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #eeeeee; text-align: center;">
                            <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                                Este é um email automático. Por favor, não responda.<br>
                                &copy; ${new Date().getFullYear()} LAB-AI Educacao. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `
}

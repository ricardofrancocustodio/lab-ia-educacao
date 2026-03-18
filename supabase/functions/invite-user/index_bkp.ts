import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Cabeçalhos CORS atualizados para aceitar os headers do SDK do Supabase
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Responde à verificação de segurança (Preflight) do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Chave mestre necessária
    )

    // ✅ CORREÇÃO CRÍTICA: Lemos o JSON apenas uma vez e armazenamos em uma constante
    const body = await req.json()
    const { email, nome, role, school_id } = body

    // Log para depuração interna (aparece nos logs do Supabase)
    console.log("Processando convite para:", email, "| Escola:", school_id)

    // Validação de presença de dados
    if (!email || !school_id) {
      throw new Error("E-mail e School ID são obrigatórios.")
    }

    // 2. Dispara o convite oficial pelo Auth Admin do Supabase
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        full_name: nome, 
        school_id: school_id, 
        role: role 
      },
      redirectTo: 'https://app.qnexy.com/dist/accept-invite.html'
    })

    // Se o erro for que o usuário já existe, não travamos o processo, apenas seguimos para o banco
    if (inviteError && !inviteError.message.includes("already registered")) {
        throw inviteError
    }

    // 3. Registra ou atualiza o vínculo na sua tabela school_members
    const { error: dbError } = await supabaseAdmin
      .from('school_members')
      .upsert({
        email: email,
        name: nome,
        role: role,
        school_id: school_id,
        active: false
      }, { onConflict: 'email' })

    if (dbError) throw dbError

    // Resposta de sucesso
    return new Response(JSON.stringify({ success: true, message: "Convite processated!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("ERRO NA EXECUÇÃO:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
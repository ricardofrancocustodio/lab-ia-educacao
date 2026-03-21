import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
      throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nao configurados na Edge Function.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()
    const emailNorm = String(body?.email || '').trim().toLowerCase()
    const nome = String(body?.nome || '').trim()
    const role = String(body?.role || '').trim().toLowerCase()
    const schoolId = String(body?.school_id || '').trim()
    const userId = String(body?.user_id || '').trim() || null
    const previousEmail = String(body?.previous_email || '').trim().toLowerCase() || null
    const sandboxPassword = String(body?.password || Deno.env.get('SANDBOX_DEFAULT_PASSWORD') || '123456789').trim()

    if (!emailNorm || !schoolId || !role) {
      throw new Error('Email, school_id e role sao obrigatorios.')
    }

    async function findAuthUserByEmail(targetEmail: string) {
      let page = 1
      const perPage = 100
      while (page <= 20) {
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

    let authUser = null
    if (userId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (!error) authUser = data?.user || null
    }
    if (!authUser && previousEmail) {
      authUser = await findAuthUserByEmail(previousEmail)
    }
    if (!authUser) {
      authUser = await findAuthUserByEmail(emailNorm)
    }

    if (authUser?.id) {
      const { data: updatedData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        email: emailNorm,
        password: sandboxPassword,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          full_name: nome,
          school_id: schoolId,
          role
        }
      })
      if (updateErr) throw updateErr
      authUser = updatedData?.user || authUser
    } else {
      const { data: createdData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailNorm,
        password: sandboxPassword,
        email_confirm: true,
        user_metadata: {
          full_name: nome,
          school_id: schoolId,
          role
        }
      })
      if (createErr) throw createErr
      authUser = createdData?.user || null
    }

    if (!authUser?.id) {
      throw new Error('Nao foi possivel obter o usuario no Authentication.')
    }
    let existingMember = null

    if (authUser.id) {
      const { data, error } = await supabaseAdmin
        .from('school_members')
        .select('id, school_id, email, user_id')
        .eq('school_id', schoolId)
        .eq('user_id', authUser.id)
        .maybeSingle()
      if (error) throw error
      existingMember = data || null
    }

    if (!existingMember && previousEmail) {
      const { data, error } = await supabaseAdmin
        .from('school_members')
        .select('id, school_id, email, user_id')
        .eq('school_id', schoolId)
        .eq('email', previousEmail)
        .maybeSingle()
      if (error) throw error
      existingMember = data || null
    }

    if (!existingMember) {
      const { data, error } = await supabaseAdmin
        .from('school_members')
        .select('id, school_id, email, user_id')
        .eq('school_id', schoolId)
        .eq('email', emailNorm)
        .maybeSingle()
      if (error) throw error
      existingMember = data || null
    }

    const memberPayload = {
      school_id: schoolId,
      email: emailNorm,
      name: nome,
      role,
      user_id: authUser.id,
      status: 'active',
      active: true,
      invite_sent_at: null,
      invite_token: null
    }

    let dbError = null
    if (existingMember?.id) {
      const result = await supabaseAdmin
        .from('school_members')
        .update(memberPayload)
        .eq('id', existingMember.id)
      dbError = result.error
    } else {
      const result = await supabaseAdmin
        .from('school_members')
        .insert(memberPayload)
      dbError = result.error
    }

    if (dbError) {
      throw new Error(`school_members sync falhou: ${dbError.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      mode: 'sandbox',
      message: 'Usuario criado/atualizado em modo sandbox.',
      user_id: authUser.id,
      email: emailNorm,
      password: sandboxPassword
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('ERRO NA EXECUCAO:', error?.message || error)
    return new Response(JSON.stringify({
      error: error?.message || 'Falha inesperada na Edge Function.',
      code: error?.code || 'UNKNOWN_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractKeywords(text: string) {
  const stopwords = new Set(['a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'como', 'que', 'se', 'na', 'no', 'nas', 'nos', 'uma', 'um', 'as', 'os'])

  return [...new Set(
    String(text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9s]/g, ' ')
      .split(/s+/)
      .filter((token) => token.length >= 4 && !stopwords.has(token))
  )].slice(0, 8)
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    if (!text) throw new Error('Texto e obrigatorio')

    const keywords = extractKeywords(text)

    return new Response(
      JSON.stringify({ embedding: null, keywords, mode: 'keyword_only' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

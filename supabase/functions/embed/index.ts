// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import OpenAI from 'https://esm.sh/openai@4.28.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Colocamos 'any' aqui para o VS Code parar de reclamar do tipo
serve(async (req: any) => {
  // 1. Tratamento do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Verificar Chave da API
    // @ts-ignore
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!apiKey) {
      throw new Error("Chave OPENAI_API_KEY não configurada no Supabase.")
    }

    const { text } = await req.json()
    if (!text) throw new Error("Texto é obrigatório")

    const openai = new OpenAI({ apiKey: apiKey })

    // 3. Gerar Embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    const embedding = embeddingResponse.data[0].embedding

    // 4. Gerar Keywords
    let keywords = []
    try {
        const kwResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Retorne um JSON array com 5 palavras-chave deste texto." },
                { role: "user", content: text.substring(0, 500) }
            ],
            temperature: 0.3,
        })
        
        const content = kwResponse.choices[0].message.content || "[]"
        keywords = JSON.parse(content)
    } catch (e) {
        console.error("Erro keywords:", e)
    }

    return new Response(
      JSON.stringify({ embedding, keywords }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
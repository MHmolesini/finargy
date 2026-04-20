import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Manejo de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'stocks'

    // Configuración de Supabase
    // Usamos SERVICE_ROLE_KEY para poder escribir en las tablas de cache (saltando RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- CONFIGURACIÓN DE CAPAS MEDALLION ---
    const cacheConfigs: Record<string, { table: string, url: string, goldTable?: string }> = {
      'notes': { table: 'bronze_live_letras', url: 'https://data912.com/live/arg_notes', goldTable: 'gold_live_letras' },
      'bonds': { table: 'bronze_live_bonos', url: 'https://data912.com/live/arg_bonds', goldTable: 'gold_live_bonos' },
      'cedears': { table: 'bronze_live_cedears', url: 'https://data912.com/live/arg_cedears', goldTable: 'gold_live_cedears' },
      'stocks': { table: 'bronze_live_stocks', url: 'https://data912.com/live/arg_stocks', goldTable: 'gold_live_stocks' },
      'dolar': { table: 'gold_live_dolar', url: '', goldTable: 'gold_live_dolar' }
    }

    const config = cacheConfigs[type]
    if (!config) throw new Error('Tipo de activo no soportado')

    // --- 1. INTENTO DE LEER DESDE CACHE (Capa GOLD) ---
    const checkTable = config.goldTable || config.table
    const { data: latest } = await supabaseClient
      .from(checkTable)
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Si la data es fresca (menos de 30 segundos), la devolvemos de inmediato
    if (latest && (new Date().getTime() - new Date(latest.updated_at).getTime() < 30000)) {
      const { data: cached } = await supabaseClient
        .from(checkTable)
        .select(config.goldTable ? '*' : 'data')
        .order(config.goldTable ? 'symbol' : 'id', { ascending: true })

      if (cached && cached.length > 0) {
        console.log(`[Cache Hit] ${type} desde ${checkTable}`)
        const result = config.goldTable ? cached : cached.map((item: any) => item.data)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // --- 2. SI NO HAY CACHE O ES VIEJA, FETCH Y ACTUALIZACIÓN ---
    let liveData: any[] = []
    if (config.url) {
      console.log(`[Fetch Directo] Solicitando ${type} desde ${config.url}`)
      const response = await fetch(config.url)
      const rawData = await response.json()

      if (Array.isArray(rawData)) {
        try {
          const toUpsert = rawData.map(item => ({
            symbol: item.symbol,
            data: item,
            updated_at: new Date().toISOString()
          }))

          // Guardamos en BRONZE (esto dispara la cadena de triggers: Bronze -> Silver -> Gold)
          await supabaseClient.from(config.table).upsert(toUpsert, { onConflict: 'symbol' })
          
          // Importante: Devolvemos desde GOLD después del upsert para obtener los campos calculados
          if (config.goldTable) {
            const { data: processed } = await supabaseClient
              .from(config.goldTable)
              .select('*')
              .order('symbol', { ascending: true })
            liveData = processed || rawData
          } else {
            liveData = rawData
          }
        } catch (upsertErr) {
          console.error(`Error actualizando ${config.table}:`, upsertErr)
          liveData = rawData
        }
      } else {
        liveData = rawData
      }
    } else {
      // Caso para tipos sin URL como 'dolar'
      const { data: processed } = await supabaseClient
        .from(config.goldTable!)
        .select('*')
        .order('symbol', { ascending: true })
      liveData = processed || []
    }

    return new Response(JSON.stringify(liveData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

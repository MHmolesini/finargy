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

    let liveData: any[] = []

    // --- CONFIGURACIÓN DE CACHE ESCALABLE (Capas Bronze) ---
    const cacheConfigs: Record<string, { table: string, url: string, goldTable?: string }> = {
      'notes': { table: 'bronze_live_letras', url: 'https://data912.com/live/arg_notes', goldTable: 'gold_live_letras' },
      'bonds': { table: 'bronze_live_bonos', url: 'https://data912.com/live/arg_bonds' },
      'cedears': { table: 'bronze_live_cedears', url: 'https://data912.com/live/arg_cedears' },
      'stocks': { table: 'bronze_live_stocks', url: 'https://data912.com/live/arg_stocks' }
    }

    const config = cacheConfigs[type]

    // --- 1. INTENTO DE LEER DESDE CACHE (Ahora desde la capa GOLD si existe) ---
    if (config) {
      try {
        const checkTable = config.goldTable || config.table
        const { data: latest } = await supabaseClient
          .from(checkTable)
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latest && (new Date().getTime() - new Date(latest.updated_at).getTime() < 30000)) {
          // Si tenemos datos frescos en Gold/Bronze, los devolvemos
          // Nota: Si es Gold, devolvemos todo el registro. Si es Bronze, solo la columna 'data'
          const { data: cached } = await supabaseClient.from(checkTable).select(config.goldTable ? '*' : 'data')
          if (cached && cached.length > 0) {
            console.log(`[Cache Hit] ${type} desde ${checkTable}`)
            liveData = config.goldTable ? cached : cached.map(item => item.data)
          }
        }
      } catch (err) {
        console.error(`Error en cache de ${type}:`, err)
      }
    }

    // --- 2. SI NO HAY CACHE, HACEMOS FETCH Y ACTUALIZAMOS BRONZE ---
    if (liveData.length === 0) {
      const apiUrl = config?.url || (type === 'cedears' ? 'https://data912.com/live/arg_cedears' : 'https://data912.com/live/stocks_bue')
      
      console.log(`[Fetch Directo] Solicitando ${type} desde ${apiUrl}`)
      const response = await fetch(apiUrl)
      const rawData = await response.json()

      if (config && Array.isArray(rawData)) {
        try {
          const toUpsert = rawData.map(item => ({
            symbol: item.symbol,
            data: item,
            updated_at: new Date().toISOString()
          }))

          // 1. Guardamos en BRONZE (esto dispara el TRIGGER en Postgres)
          await supabaseClient.from(config.table).upsert(toUpsert, { onConflict: 'symbol' })
          console.log(`[Bronze Update] ${toUpsert.length} registros en ${config.table}`)

          // 2. Si hay tabla GOLD, leemos el resultado procesado
          if (config.goldTable) {
            const { data: processed } = await supabaseClient.from(config.goldTable).select('*')
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
    }

    // 2. Fetch de metadatos desde Postgres
    const { data: metadataList, error } = await supabaseClient
      .from('assets_metadata')
      .select('*')

    if (error) throw error

    // Si los datos vienen de GOLD, ya están enriquecidos y listos
    if (config?.goldTable) {
      return new Response(JSON.stringify(liveData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const metadataMap = Object.fromEntries(metadataList.map(m => [m.symbol, m]))

    // 3. Enriquecimiento manual (solo para activos sin capa GOLD)
    const enrichedData = liveData.map((asset: any) => {
      let baseSymbol = asset.symbol;
      const meta = metadataMap[baseSymbol];
      
      let moneda = 'ARS';
      let precio_final_estimado = null;

      // Lógica específica para Bonos/Lecaps
      if (type === 'notes' || type === 'bonds') {
        if (meta?.fecha_emision && meta?.fecha_vencimiento && meta?.tasa_licitacion) {
          const emision = new Date(meta.fecha_emision);
          const vencimiento = new Date(meta.fecha_vencimiento);
          const diffTime = vencimiento.getTime() - emision.getTime();
          const diasReales = Math.round(diffTime / (1000 * 60 * 60 * 24));
          const diasCalc = Math.max(0, diasReales - 1);
          precio_final_estimado = 100 * Math.pow((1 + meta.tasa_licitacion), diasCalc / 30.0);
        }
      }

      // Lógica de Moneda para Cedears/Stocks
      if (type === 'stocks' || type === 'cedears') {
        if ((baseSymbol.endsWith('D') || baseSymbol.endsWith('C')) && baseSymbol.length > 2) {
            // Excepción específica: YPFD es peso
            if (baseSymbol !== 'YPFD') {
              moneda = 'USD';
              const potentialParent = baseSymbol.slice(0, -1);
              if (metadataMap[potentialParent]) baseSymbol = potentialParent;
            }
        }
        // Excepciones manuales
        if (asset.symbol === 'BMA.D' || asset.symbol === 'ALUAD') moneda = 'USD';
      }

      const finalMeta = metadataMap[baseSymbol] || meta;

      return {
        ...asset,
        sector: finalMeta?.sector || 'General',
        industria: finalMeta?.industria || 'General',
        tipo_activo: finalMeta?.tipo_activo || (type === 'bonds' ? 'bono' : 'acciones'),
        fecha_vencimiento: finalMeta?.fecha_vencimiento || null,
        precio_final_estimado,
        moneda
      };
    });

    return new Response(JSON.stringify(enrichedData), {
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

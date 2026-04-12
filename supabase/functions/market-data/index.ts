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

    let apiUrl = ''
    if (type === 'notes') apiUrl = 'https://data912.com/live/arg_notes'
    else if (type === 'bonds') apiUrl = 'https://data912.com/live/arg_bonds'
    else if (type === 'cedears') apiUrl = 'https://data912.com/live/arg_cedears'
    else apiUrl = 'https://data912.com/live/stocks_bue'

    const response = await fetch(apiUrl)
    const liveData = await response.json()

    // --- LÓGICA DE CACHE PARA LETRAS ---
    if (type === 'notes' && Array.isArray(liveData)) {
      try {
        const toUpsert = liveData.map(item => ({
          symbol: item.symbol,
          data: item,
          updated_at: new Date().toISOString()
        }))

        // Upsert masivo en la tabla de cache
        const { error: upsertError } = await supabaseClient
          .from('live_letras')
          .upsert(toUpsert, { onConflict: 'symbol' })
        
        if (upsertError) console.error('Error actualizando cache de letras:', upsertError)
      } catch (e) {
        console.error('Error procesando cache:', e)
      }
    }

    // 2. Fetch de metadatos desde Postgres
    const { data: metadataList, error } = await supabaseClient
      .from('assets_metadata')
      .select('*')

    if (error) throw error

    const metadataMap = Object.fromEntries(metadataList.map(m => [m.symbol, m]))

    // 3. Enriquecimiento (Lógica portada de index.ts)
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

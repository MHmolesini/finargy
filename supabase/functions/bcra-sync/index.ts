import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- CONFIGURACIÓN DE FECHAS ---
    const url = new URL(req.url);
    const isHistory = url.searchParams.get('history') === 'true';
    
    const today = new Date();
    const past = new Date();
    
    if (isHistory) {
      // Desde el 1 de Enero de 2024
      past.setFullYear(2024, 0, 1);
      console.log(`[BCRA Sync] MODO HISTÓRICO: Sincronizando desde 2024-01-01`);
    } else {
      // Por defecto 5 días para la sincronización diaria rápida
      past.setDate(today.getDate() - 5);
    }
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const fechaDesde = formatDate(past);
    const fechaHasta = formatDate(today);

    // --- CONFIGURACIÓN DE SERIES ---
    const targetSeries = url.searchParams.get('series'); // null, 'cer' o 'tc'
    
    let seriesToSync = [
      { id: 30, table: 'bcra_cer', name: 'CER', key: 'cer' },
      { id: 5,  table: 'bcra_tc',  name: 'A3500', key: 'tc' }
    ];

    // Si se especifica una serie, filtramos el array
    if (targetSeries) {
      seriesToSync = seriesToSync.filter(s => s.key === targetSeries);
    }

    const results = [];

    for (const serie of seriesToSync) {
      console.log(`[BCRA Sync] Sincronizando ${serie.name} (${serie.id})...`);
      const bcraUrl = `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/${serie.id}?Desde=${fechaDesde}&Hasta=${fechaHasta}`;
      
      const response = await fetch(bcraUrl);
      if (!response.ok) {
        console.error(`Error en serie ${serie.name}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.results && data.results[0] && data.results[0].detalle) {
        const seriesData = data.results[0].detalle;
        const toUpsert = seriesData.map((item: any) => ({
          fecha: item.fecha,
          valor: item.valor
        }));

        const { error: upsertError } = await supabaseClient
          .from(serie.table)
          .upsert(toUpsert, { onConflict: 'fecha' });

        if (upsertError) {
          console.error(`Error upsert ${serie.table}:`, upsertError);
        } else {
          results.push({ name: serie.name, count: seriesData.length });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      range: { desde: fechaDesde, hasta: fechaHasta }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[BCRA Sync] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

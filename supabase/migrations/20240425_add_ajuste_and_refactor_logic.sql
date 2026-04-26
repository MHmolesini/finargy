-- MIGRACIÓN: 20240425_add_ajuste_and_refactor_logic.sql
-- DESCRIPCIÓN: Integra las columnas tipo_activo y ajuste de assets_metadata en el pipeline Silver -> Gold.

-- 1. ASEGURAR COLUMNAS EN CAPA SILVER Y GOLD
DO $$ 
BEGIN
    -- SILVER LETRAS
    ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS ajuste text;
    ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS tipo_activo text;
    ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;

    -- SILVER BONOS
    ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS ajuste text;
    ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS tipo_activo text;
    ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;

    -- GOLD LETRAS
    ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS ajuste text;
    ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tipo_activo text;
    ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;
    ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS cer_inicial numeric;

    -- GOLD BONOS
    ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS ajuste text;
    ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tipo_activo text;
    ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;
    ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS cer_inicial numeric;
END $$;

-- 2. ACTUALIZAR FUNCIÓN DE PROCESAMIENTO BRONZE -> SILVER
CREATE OR REPLACE FUNCTION public.process_bronze_to_silver()
RETURNS TRIGGER AS $$
DECLARE
    v_cer_inicial numeric;
    v_tasa_licitacion numeric;
    v_tipo_activo text;
    v_ajuste text;
    v_fecha_emision date;
BEGIN
    -- Obtener metadata completa desde assets_metadata
    SELECT tipo_activo, fecha_emision, tasa_licitacion, ajuste 
    INTO v_tipo_activo, v_fecha_emision, v_tasa_licitacion, v_ajuste
    FROM public.assets_metadata 
    WHERE symbol = NEW.symbol;

    -- Fallback de tipo_activo si no existe en metadata
    IF v_tipo_activo IS NULL THEN
        v_tipo_activo := CASE 
            WHEN TG_TABLE_NAME = 'bronze_live_letras' THEN 'lecap'
            WHEN TG_TABLE_NAME = 'bronze_live_bonos' THEN 'bono'
            ELSE 'otro'
        END;
    END IF;

    -- LÓGICA DE CER INICIAL (Solo si el ajuste es CER)
    IF v_ajuste = 'cer' AND v_fecha_emision IS NOT NULL THEN
        -- Para LECER (Letras) usamos fecha exacta, para BONCER (Bonos) usamos LAG de 10 días
        IF v_tipo_activo = 'lecer' THEN
            SELECT valor INTO v_cer_inicial
            FROM public.bcra_cer WHERE fecha <= v_fecha_emision ORDER BY fecha DESC LIMIT 1;
        ELSE
            SELECT valor INTO v_cer_inicial
            FROM (
                SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
                FROM public.bcra_cer WHERE fecha < v_fecha_emision AND extract(dow from fecha) BETWEEN 1 AND 5
            ) sub WHERE rn = 10;
        END IF;
        
        -- Fallback si no hay datos
        IF v_cer_inicial IS NULL THEN
            SELECT valor INTO v_cer_inicial FROM public.bcra_cer ORDER BY fecha ASC LIMIT 1;
        END IF;
    END IF;

    -- Ingesta a Silver (Letras)
    IF TG_TABLE_NAME = 'bronze_live_letras' THEN
        INSERT INTO public.silver_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, ajuste, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, v_ajuste, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            v = EXCLUDED.v, 
            cer_inicial = COALESCE(EXCLUDED.cer_inicial, silver_live_letras.cer_inicial), 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_letras.tipo_activo),
            tasa_licitacion = COALESCE(EXCLUDED.tasa_licitacion, silver_live_letras.tasa_licitacion),
            ajuste = COALESCE(EXCLUDED.ajuste, silver_live_letras.ajuste),
            updated_at = NOW();

    -- Ingesta a Silver (Bonos)
    ELSIF TG_TABLE_NAME = 'bronze_live_bonos' THEN
        INSERT INTO public.silver_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, ajuste, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, v_ajuste, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            v = EXCLUDED.v, 
            cer_inicial = COALESCE(EXCLUDED.cer_inicial, silver_live_bonos.cer_inicial), 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_bonos.tipo_activo),
            tasa_licitacion = COALESCE(EXCLUDED.tasa_licitacion, silver_live_bonos.tasa_licitacion),
            ajuste = COALESCE(EXCLUDED.ajuste, silver_live_bonos.ajuste),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. ACTUALIZAR FUNCIÓN DE CÁLCULO FINANCIERO (GOLD)
CREATE OR REPLACE FUNCTION public.calculate_gold_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_vto date;
    v_fecha_emision date;
    v_cer_actual numeric;
    v_precio_final numeric;
    v_days_to_vto integer;
    v_tasa_directa numeric;
    v_tem numeric;
    v_tea numeric;
BEGIN
    -- Obtener metadata crítica
    SELECT fecha_emision, fecha_vencimiento INTO v_fecha_emision, v_fecha_vto
    FROM public.assets_metadata WHERE symbol = NEW.symbol;

    -- Obtener último CER
    SELECT valor INTO v_cer_actual FROM public.bcra_cer ORDER BY fecha DESC LIMIT 1;

    -- LÓGICA DE PRECIO FINAL (VALOR TÉCNICO AL VTO)
    IF NEW.ajuste = 'tasa' AND NEW.tasa_licitacion IS NOT NULL AND v_fecha_emision IS NOT NULL AND v_fecha_vto IS NOT NULL THEN
        -- LECAPs / BONCAPs: Capitalización Compuesta (Tasa Mensual)
        v_precio_final := 100 * POWER(1 + NEW.tasa_licitacion, (v_fecha_vto - v_fecha_emision)::numeric / 30);
    
    ELSIF NEW.ajuste = 'cer' AND NEW.cer_inicial > 0 AND v_cer_actual IS NOT NULL THEN
        -- LECERs / BONCERs: Ajuste por Inflación
        v_precio_final := 100 * (v_cer_actual / NEW.cer_inicial);
    
    ELSE
        -- Default (Nominal o sin datos)
        v_precio_final := 100;
    END IF;

    -- CÁLCULOS DE RENDIMIENTO (TEM / TEA)
    v_days_to_vto := v_fecha_vto - CURRENT_DATE;
    
    IF NEW.c > 0 AND v_days_to_vto > 0 AND v_precio_final > 0 THEN
        v_tasa_directa := (v_precio_final / NEW.c) - 1;
        v_tem := POWER(1 + v_tasa_directa, 30.0 / v_days_to_vto) - 1;
        v_tea := POWER(1 + v_tem, 12) - 1;
    ELSE
        v_tasa_directa := 0; v_tem := 0; v_tea := 0;
    END IF;

    -- ACTUALIZACIÓN DE CAPA GOLD (Letras)
    IF TG_TABLE_NAME = 'silver_live_letras' THEN
        INSERT INTO public.gold_live_letras (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, ajuste, tasa_licitacion, cer_inicial, tasa_directa, tem, tea, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, v_days_to_vto, v_precio_final, NEW.tipo_activo, NEW.ajuste, NEW.tasa_licitacion, NEW.cer_inicial, v_tasa_directa, v_tem * 100, v_tea * 100, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            daysToVto = EXCLUDED.daysToVto,
            precio_final_estimado = EXCLUDED.precio_final_estimado,
            ajuste = EXCLUDED.ajuste,
            tasa_licitacion = EXCLUDED.tasa_licitacion,
            cer_inicial = EXCLUDED.cer_inicial,
            tasa_directa = EXCLUDED.tasa_directa,
            tem = EXCLUDED.tem,
            tea = EXCLUDED.tea,
            updated_at = NOW();

    -- ACTUALIZACIÓN DE CAPA GOLD (Bonos)
    ELSIF TG_TABLE_NAME = 'silver_live_bonos' THEN
        INSERT INTO public.gold_live_bonos (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, ajuste, tasa_licitacion, cer_inicial, tasa_directa, tem, tea, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, v_days_to_vto, v_precio_final, NEW.tipo_activo, NEW.ajuste, NEW.tasa_licitacion, NEW.cer_inicial, v_tasa_directa, v_tem * 100, v_tea * 100, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            daysToVto = EXCLUDED.daysToVto,
            precio_final_estimado = EXCLUDED.precio_final_estimado,
            ajuste = EXCLUDED.ajuste,
            tasa_licitacion = EXCLUDED.tasa_licitacion,
            cer_inicial = EXCLUDED.cer_inicial,
            tasa_directa = EXCLUDED.tasa_directa,
            tem = EXCLUDED.tem,
            tea = EXCLUDED.tea,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RECALCULO TOTAL (FORZAR ACTIVACIÓN DE TRIGGERS)
UPDATE public.bronze_live_letras SET updated_at = NOW();
UPDATE public.bronze_live_bonos SET updated_at = NOW();

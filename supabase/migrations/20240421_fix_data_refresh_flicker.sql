-- 1. ASEGURAR COLUMNAS EN TODAS LAS CAPAS (Sincronización Total)
ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;
ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS cer_inicial numeric;
ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS tipo_activo text;
ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;
ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS cer_inicial numeric;
ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS tipo_activo text;

ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS precio_final_estimado numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tipo_activo text;
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS precio_final_estimado numeric;
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tipo_activo text;

-- 2. TRIGGER DEFINITIVO BRONZE -> SILVER (Protección contra NULLs)
CREATE OR REPLACE FUNCTION public.process_bronze_to_silver()
RETURNS TRIGGER AS $$
DECLARE
    v_cer_inicial numeric;
    v_tasa_licitacion numeric;
    v_tipo_activo text;
    v_fecha_emision date;
BEGIN
    -- Intentar obtener metadata desde la tabla maestra
    SELECT tipo_activo, fecha_emision, tasa_licitacion 
    INTO v_tipo_activo, v_fecha_emision, v_tasa_licitacion
    FROM public.assets_metadata 
    WHERE symbol = NEW.symbol;

    -- Lógica de obtención del CER inicial (Solo si no viene en metadata y es necesario)
    IF v_fecha_emision IS NOT NULL AND v_tipo_activo IN ('lecap', 'lecer', 'boncap', 'boncer') THEN
        SELECT valor INTO v_cer_inicial
        FROM (
            SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
            FROM public.bcra_cer
            WHERE fecha < v_fecha_emision
            AND extract(dow from fecha) BETWEEN 1 AND 5
        ) sub
        WHERE rn = 10;
        
        IF v_cer_inicial IS NULL THEN
            SELECT valor INTO v_cer_inicial FROM public.bcra_cer ORDER BY fecha ASC LIMIT 1;
        END IF;
    END IF;

    -- Ingesta a Silver (Bonos) con persistencia defensiva
    IF TG_TABLE_NAME = 'bronze_live_bonos' THEN
        INSERT INTO public.silver_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            v = EXCLUDED.v, 
            pct_change = EXCLUDED.pct_change,
            px_bid = EXCLUDED.px_bid,
            px_ask = EXCLUDED.px_ask,
            -- COALESCE previene el parpadeo al no pisar campos existentes con NULL
            cer_inicial = COALESCE(EXCLUDED.cer_inicial, silver_live_bonos.cer_inicial), 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_bonos.tipo_activo),
            tasa_licitacion = COALESCE(EXCLUDED.tasa_licitacion, silver_live_bonos.tasa_licitacion),
            updated_at = NOW();

    -- Ingesta a Silver (Letras) con persistencia defensiva
    ELSIF TG_TABLE_NAME = 'bronze_live_letras' THEN
        INSERT INTO public.silver_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            cer_inicial = COALESCE(EXCLUDED.cer_inicial, silver_live_letras.cer_inicial), 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_letras.tipo_activo),
            tasa_licitacion = COALESCE(EXCLUDED.tasa_licitacion, silver_live_letras.tasa_licitacion),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER DEFINITIVO SILVER -> GOLD (Cálculo Inmune al Parpadeo)
CREATE OR REPLACE FUNCTION public.calculate_gold_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_vto date;
    v_fecha_emision date;
    v_cer_actual numeric;
    v_precio_final numeric;
BEGIN
    -- Obtener metadata para fechas críticas del cálculo
    SELECT fecha_emision, fecha_vencimiento INTO v_fecha_emision, v_fecha_vto
    FROM public.assets_metadata WHERE symbol = NEW.symbol;

    -- Obtener el último CER para activos ajustables
    SELECT valor INTO v_cer_actual FROM public.bcra_cer ORDER BY fecha DESC LIMIT 1;

    -- LÓGICA DE PRECIO TÉCNICO (PRECIO FINAL ESTIMADO)
    IF NEW.tipo_activo IN ('lecap', 'boncap') AND NEW.tasa_licitacion IS NOT NULL AND v_fecha_emision IS NOT NULL AND v_fecha_vto IS NOT NULL THEN
        -- Fórmula BONCAP / LECAP
        v_precio_final := 100 * POWER(1 + NEW.tasa_licitacion, (v_fecha_vto - v_fecha_emision)::numeric / 30);
    
    ELSIF NEW.tipo_activo IN ('lecer', 'boncer') AND NEW.cer_inicial > 0 AND v_cer_actual IS NOT NULL THEN
        -- Fórmula BONCER / LECER
        v_precio_final := 100 * (v_cer_actual / NEW.cer_inicial);
    END IF;

    -- Actualización de Gold con persistencia: Si el nuevo cálculo falla (NULL), mantenemos el valor PREVIO.
    IF TG_TABLE_NAME = 'silver_live_letras' THEN
        INSERT INTO public.gold_live_letras (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, (v_fecha_vto - CURRENT_DATE), v_precio_final, NEW.tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            px_bid = EXCLUDED.px_bid, 
            px_ask = EXCLUDED.px_ask,
            precio_final_estimado = COALESCE(EXCLUDED.precio_final_estimado, gold_live_letras.precio_final_estimado),
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, gold_live_letras.tipo_activo),
            updated_at = NOW();
    
    ELSIF TG_TABLE_NAME = 'silver_live_bonos' THEN
        INSERT INTO public.gold_live_bonos (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, (v_fecha_vto - CURRENT_DATE), v_precio_final, NEW.tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            px_bid = EXCLUDED.px_bid, 
            px_ask = EXCLUDED.px_ask,
            precio_final_estimado = COALESCE(EXCLUDED.precio_final_estimado, gold_live_bonos.precio_final_estimado),
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, gold_live_bonos.tipo_activo),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RECALCULO DE SEGURIDAD (Eliminar cualquier NULL residual de una vez por todas)
UPDATE public.silver_live_bonos s SET tasa_licitacion = m.tasa_licitacion FROM public.assets_metadata m WHERE s.symbol = m.symbol AND s.tasa_licitacion IS NULL;
UPDATE public.bronze_live_bonos SET updated_at = NOW();
UPDATE public.bronze_live_letras SET updated_at = NOW();

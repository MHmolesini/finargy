-- 1. REFUERZO DE CAPA SILVER (Captura Dinámica de CER)
CREATE OR REPLACE FUNCTION public.process_bronze_to_silver()
RETURNS TRIGGER AS $$
DECLARE
    v_cer_inicial numeric;
    v_tasa_licitacion numeric;
    v_tipo_activo text;
    v_fecha_emision date;
BEGIN
    -- Metadata Core
    SELECT tipo_activo, fecha_emision, tasa_licitacion 
    INTO v_tipo_activo, v_fecha_emision, v_tasa_licitacion
    FROM public.assets_metadata WHERE symbol = NEW.symbol;

    -- CRUCE DINÁMICO DE CER (Sin hardcodear)
    -- Si es LECER, buscamos la fecha exacta de emisión
    IF v_tipo_activo = 'lecer' AND v_fecha_emision IS NOT NULL THEN
        SELECT valor INTO v_cer_inicial FROM public.bcra_cer WHERE fecha <= v_fecha_emision ORDER BY fecha DESC LIMIT 1;
    
    -- Si es BONCER, buscamos con el lag histórico de 10 días hábiles
    ELSIF v_tipo_activo = 'boncer' AND v_fecha_emision IS NOT NULL THEN
        SELECT valor INTO v_cer_inicial FROM (
            SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
            FROM public.bcra_cer WHERE fecha < v_fecha_emision AND extract(dow from fecha) BETWEEN 1 AND 5
        ) sub WHERE rn = 10;
        IF v_cer_inicial IS NULL THEN SELECT valor INTO v_cer_inicial FROM public.bcra_cer ORDER BY fecha ASC LIMIT 1; END IF;
    END IF;

    -- Inserción/Update en Silver con COALESCE defensivo
    IF TG_TABLE_NAME = 'bronze_live_letras' THEN
        INSERT INTO public.silver_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            v = EXCLUDED.v, 
            cer_inicial = COALESCE(EXCLUDED.cer_inicial, silver_live_letras.cer_inicial), 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_letras.tipo_activo),
            tasa_licitacion = COALESCE(EXCLUDED.tasa_licitacion, silver_live_letras.tasa_licitacion),
            updated_at = NOW();
    
    ELSIF TG_TABLE_NAME = 'bronze_live_bonos' THEN
        INSERT INTO public.silver_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            cer_inicial = COALESCE(EXCLUDED.cer_inicial, silver_live_bonos.cer_inicial), 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_bonos.tipo_activo),
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. REFUERZO DE CAPA GOLD (Cálculo con Redundancia Anti-NULL)
CREATE OR REPLACE FUNCTION public.calculate_gold_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_vto date;
    v_fecha_emision date;
    v_cer_actual numeric;
    v_precio_final numeric;
    v_cer_inicial_lookup numeric;
BEGIN
    SELECT fecha_emision, fecha_vencimiento INTO v_fecha_emision, v_fecha_vto
    FROM public.assets_metadata WHERE symbol = NEW.symbol;

    SELECT valor INTO v_cer_actual FROM public.bcra_cer ORDER BY fecha DESC LIMIT 1;

    -- LÓGICA DE PRECIO TÉCNICO
    IF NEW.tipo_activo IN ('lecap', 'boncap') AND NEW.tasa_licitacion IS NOT NULL AND v_fecha_emision IS NOT NULL AND v_fecha_vto IS NOT NULL THEN
        v_precio_final := 100 * POWER(1 + NEW.tasa_licitacion, (v_fecha_vto - v_fecha_emision)::numeric / 30);
    
    ELSIF NEW.tipo_activo IN ('lecer', 'boncer') AND v_cer_actual IS NOT NULL THEN
        -- REDUNDANCIA: Si la capa Silver falló, Gold lo busca de vuelta
        v_cer_inicial_lookup := NEW.cer_inicial;
        
        IF v_cer_inicial_lookup IS NULL OR v_cer_inicial_lookup = 0 THEN
            IF NEW.tipo_activo = 'lecer' THEN
                SELECT valor INTO v_cer_inicial_lookup FROM public.bcra_cer WHERE fecha <= v_fecha_emision ORDER BY fecha DESC LIMIT 1;
            ELSE
                SELECT valor INTO v_cer_inicial_lookup FROM (
                    SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
                    FROM public.bcra_cer WHERE fecha < v_fecha_emision AND extract(dow from fecha) BETWEEN 1 AND 5
                ) sub WHERE rn = 10;
            END IF;
        END IF;

        IF v_cer_inicial_lookup > 0 THEN
            v_precio_final := 100 * (v_cer_actual / v_cer_inicial_lookup);
        END IF;
    END IF;

    -- Update Gold
    IF TG_TABLE_NAME = 'silver_live_letras' THEN
        INSERT INTO public.gold_live_letras (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, (v_fecha_vto - CURRENT_DATE), v_precio_final, NEW.tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            precio_final_estimado = COALESCE(EXCLUDED.precio_final_estimado, gold_live_letras.precio_final_estimado),
            updated_at = NOW();
    ELSIF TG_TABLE_NAME = 'silver_live_bonos' THEN
        INSERT INTO public.gold_live_bonos (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, (v_fecha_vto - CURRENT_DATE), v_precio_final, NEW.tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            precio_final_estimado = COALESCE(EXCLUDED.precio_final_estimado, gold_live_bonos.precio_final_estimado),
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. IMPACTO FINAL
UPDATE public.bronze_live_letras SET updated_at = NOW();
UPDATE public.bronze_live_bonos SET updated_at = NOW();

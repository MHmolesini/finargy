-- 1. ASEGURAR COLUMNAS EN SILVER Y GOLD PARA BONOS
ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;
ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS cer_inicial numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tasa_licitacion numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS cer_inicial numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS precio_final_estimado numeric;

-- 2. ACTUALIZAR FUNCIÓN DE PROCESAMIENTO BRONZE -> SILVER
-- Ahora capturamos también la tasa_licitacion de metadata
CREATE OR REPLACE FUNCTION public.process_bronze_to_silver()
RETURNS TRIGGER AS $$
DECLARE
    v_cer_inicial numeric;
    v_tasa_licitacion numeric;
    v_tipo_activo text;
    v_fecha_emision date;
BEGIN
    -- Obtener metadata del activo
    SELECT tipo_activo, fecha_emision, tasa_licitacion 
    INTO v_tipo_activo, v_fecha_emision, v_tasa_licitacion
    FROM public.assets_metadata 
    WHERE symbol = NEW.symbol;

    IF v_tipo_activo IS NULL THEN
        v_tipo_activo := CASE 
            WHEN TG_TABLE_NAME = 'bronze_live_letras' THEN 'lecap'
            WHEN TG_TABLE_NAME = 'bronze_live_bonos' THEN 'bono'
            WHEN TG_TABLE_NAME = 'bronze_live_stocks' THEN 'accion'
            WHEN TG_TABLE_NAME = 'bronze_live_cedears' THEN 'cedear'
        END;
        
        INSERT INTO public.assets_metadata (symbol, tipo_activo)
        VALUES (NEW.symbol, v_tipo_activo)
        ON CONFLICT (symbol) DO NOTHING;
    END IF;

    -- Lógica de obtención del CER inicial (Lag 10 días hábiles)
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

    -- Ingesta a Silver (Letras)
    IF TG_TABLE_NAME = 'bronze_live_letras' THEN
        INSERT INTO public.silver_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, v = EXCLUDED.v, cer_inicial = EXCLUDED.cer_inicial, 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_letras.tipo_activo),
            tasa_licitacion = EXCLUDED.tasa_licitacion,
            updated_at = NOW();

    -- Ingesta a Silver (Bonos)
    ELSIF TG_TABLE_NAME = 'bronze_live_bonos' THEN
        INSERT INTO public.silver_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, tasa_licitacion, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, v_tipo_activo, v_tasa_licitacion, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, v = EXCLUDED.v, cer_inicial = EXCLUDED.cer_inicial, 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_bonos.tipo_activo),
            tasa_licitacion = EXCLUDED.tasa_licitacion,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. UNIFICAR LÓGICA DE CAPA GOLD (Cálculo Financiero)
-- Esta función calculará el precio_final_estimado basándose en el tipo de activo
CREATE OR REPLACE FUNCTION public.calculate_gold_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_fecha_vto date;
    v_fecha_emision date;
    v_cer_actual numeric;
    v_precio_final numeric;
BEGIN
    -- Obtener metadata para fechas
    SELECT fecha_emision, fecha_vencimiento INTO v_fecha_emision, v_fecha_vto
    FROM public.assets_metadata WHERE symbol = NEW.symbol;

    -- Obtener el último CER disponible
    SELECT valor INTO v_cer_actual FROM public.bcra_cer ORDER BY fecha DESC LIMIT 1;

    -- LÓGICA POR TIPO DE ACTIVO
    IF NEW.tipo_activo IN ('lecap', 'boncap') AND NEW.tasa_licitacion IS NOT NULL AND v_fecha_emision IS NOT NULL AND v_fecha_vto IS NOT NULL THEN
        -- Fórmula: 100 * (1 + TEM)^((Vto - Emision) / 30)
        v_precio_final := 100 * POWER(1 + (NEW.tasa_licitacion / 100), (v_fecha_vto - v_fecha_emision)::numeric / 30);
    
    ELSIF NEW.tipo_activo IN ('lecer', 'boncer') AND NEW.cer_inicial > 0 AND v_cer_actual IS NOT NULL THEN
        -- Fórmula Simple CER: 100 * (CER_actual / CER_inicial)
        v_precio_final := 100 * (v_cer_actual / NEW.cer_inicial);
    
    ELSE
        -- Default (No ajustable o sin datos suficientes)
        v_precio_final := 100;
    END IF;

    -- Actualizar los campos en la tabla Gold (Suponiendo que Gold se actualiza después de Silver)
    -- Si gold_live_bonos es una tabla física, la actualizamos aquí.
    IF TG_TABLE_NAME = 'silver_live_letras' THEN
        INSERT INTO public.gold_live_letras (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, (v_fecha_vto - CURRENT_DATE), v_precio_final, NEW.tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            px_bid = EXCLUDED.px_bid, 
            px_ask = EXCLUDED.px_ask, 
            precio_final_estimado = EXCLUDED.precio_final_estimado,
            updated_at = NOW();
    
    ELSIF TG_TABLE_NAME = 'silver_live_bonos' THEN
        INSERT INTO public.gold_live_bonos (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, (v_fecha_vto - CURRENT_DATE), v_precio_final, NEW.tipo_activo, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            px_bid = EXCLUDED.px_bid, 
            px_ask = EXCLUDED.px_ask, 
            precio_final_estimado = EXCLUDED.precio_final_estimado,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. VINCULAR TRIGGERS DE SILVER -> GOLD
DROP TRIGGER IF EXISTS trigger_silver_notes_to_gold ON public.silver_live_letras;
CREATE TRIGGER trigger_silver_notes_to_gold
AFTER INSERT OR UPDATE ON public.silver_live_letras
FOR EACH ROW EXECUTE FUNCTION public.calculate_gold_metrics();

DROP TRIGGER IF EXISTS trigger_silver_bonds_to_gold ON public.silver_live_bonos;
CREATE TRIGGER trigger_silver_bonds_to_gold
AFTER INSERT OR UPDATE ON public.silver_live_bonos
FOR EACH ROW EXECUTE FUNCTION public.calculate_gold_metrics();

-- 5. FORZAR RECALCULO TOTAL
UPDATE public.bronze_live_bonos SET updated_at = NOW();
UPDATE public.bronze_live_letras SET updated_at = NOW();

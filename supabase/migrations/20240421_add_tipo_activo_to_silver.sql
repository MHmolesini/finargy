-- 1. AÑADIR COLUMNA A TABLAS SILVER Y GOLD
ALTER TABLE public.silver_live_letras ADD COLUMN IF NOT EXISTS tipo_activo text;
ALTER TABLE public.silver_live_bonos ADD COLUMN IF NOT EXISTS tipo_activo text;
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tipo_activo text;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tipo_activo text;

-- 2. ACTUALIZAR FUNCIÓN DE PROCESAMIENTO BRONZE -> SILVER
CREATE OR REPLACE FUNCTION public.process_bronze_to_silver()
RETURNS TRIGGER AS $$
DECLARE
    v_cer_inicial numeric;
    v_tipo_activo text;
    v_fecha_emision date;
BEGIN
    -- 1. CRUCE PRIORITARIO POR SÍMBOLO CON METADATA
    SELECT tipo_activo, fecha_emision 
    INTO v_tipo_activo, v_fecha_emision 
    FROM public.assets_metadata 
    WHERE symbol = NEW.symbol;

    -- 2. SI NO EXISTE EN METADATA, CREAR EL REGISTRO CON TIPO DEFAULT
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

    -- 3. LÓGICA DE OBTENCIÓN DEL CER INICIAL (Solo para activos CER/CAP)
    IF v_fecha_emision IS NOT NULL AND v_tipo_activo IN ('lecap', 'lecer', 'boncap', 'boncer') THEN
        SELECT valor INTO v_cer_inicial
        FROM (
            SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
            FROM public.bcra_cer
            WHERE fecha < v_fecha_emision
            AND extract(dow from fecha) BETWEEN 1 AND 5 -- Días hábiles (L-V)
        ) sub
        WHERE rn = 10;
        
        IF v_cer_inicial IS NULL THEN
            SELECT valor INTO v_cer_inicial FROM public.bcra_cer ORDER BY fecha ASC LIMIT 1;
        END IF;
    END IF;

    -- Ingesta a Silver (Letras)
    IF TG_TABLE_NAME = 'bronze_live_letras' THEN
        INSERT INTO public.silver_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, updated_at)
        VALUES (
            NEW.symbol, 
            (NEW.data->>'c')::numeric, 
            (NEW.data->>'pct_change')::numeric, 
            (NEW.data->>'q_bid')::numeric, 
            (NEW.data->>'px_bid')::numeric, 
            (NEW.data->>'px_ask')::numeric, 
            (NEW.data->>'q_ask')::numeric, 
            (NEW.data->>'v')::numeric, 
            (NEW.data->>'q_op')::numeric, 
            v_cer_inicial, 
            v_tipo_activo, 
            NOW()
        )
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            v = EXCLUDED.v, 
            cer_inicial = EXCLUDED.cer_inicial, 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_letras.tipo_activo),
            updated_at = NOW();

    -- Ingesta a Silver (Bonos)
    ELSIF TG_TABLE_NAME = 'bronze_live_bonos' THEN
        INSERT INTO public.silver_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, tipo_activo, updated_at)
        VALUES (
            NEW.symbol, 
            (NEW.data->>'c')::numeric, 
            (NEW.data->>'pct_change')::numeric, 
            (NEW.data->>'q_bid')::numeric, 
            (NEW.data->>'px_bid')::numeric, 
            (NEW.data->>'px_ask')::numeric, 
            (NEW.data->>'q_ask')::numeric, 
            (NEW.data->>'v')::numeric, 
            (NEW.data->>'q_op')::numeric, 
            v_cer_inicial, 
            v_tipo_activo, 
            NOW()
        )
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            v = EXCLUDED.v, 
            cer_inicial = EXCLUDED.cer_inicial, 
            tipo_activo = COALESCE(EXCLUDED.tipo_activo, silver_live_bonos.tipo_activo),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. REPOBLAR DATOS PARA ACTIVOS EXISTENTES
-- Esto forzará que el trigger se dispare para cada fila y rellene la columna tipo_activo
UPDATE public.bronze_live_letras SET updated_at = NOW();
UPDATE public.bronze_live_bonos SET updated_at = NOW();

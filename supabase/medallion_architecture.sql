-- 1. RESTAURAR DATOS ORIGINALES EN METADATA (Fecha emisión real)
UPDATE public.assets_metadata 
SET 
    fecha_emision = '2024-02-01', 
    fecha_vencimiento = '2026-06-30', 
    ajuste = 'cer' 
WHERE symbol = 'TZX26';

UPDATE public.assets_metadata 
SET 
    fecha_emision = '2024-02-01', 
    fecha_vencimiento = '2027-06-30', 
    ajuste = 'cer' 
WHERE symbol = 'TZX27';

UPDATE public.assets_metadata 
SET 
    fecha_emision = '2024-02-01', 
    fecha_vencimiento = '2028-06-30', 
    ajuste = 'cer' 
WHERE symbol = 'TZX28';

-- 2. ACTUALIZAR FUNCIÓN CON LAG DINÁMICO DE 10 DÍAS HÁBILES
CREATE OR REPLACE FUNCTION public.process_bronze_to_silver()
RETURNS TRIGGER AS $$
DECLARE
    v_cer_inicial numeric;
    v_tipo_activo text;
    v_fecha_emision date;
BEGIN
    -- Identificar tipo de activo
    v_tipo_activo := CASE 
        WHEN TG_TABLE_NAME = 'bronze_live_letras' THEN 'lecap'
        WHEN TG_TABLE_NAME = 'bronze_live_bonos' THEN 'bono'
        WHEN TG_TABLE_NAME = 'bronze_live_stocks' THEN 'accion'
        WHEN TG_TABLE_NAME = 'bronze_live_cedears' THEN 'cedear'
    END;

    -- Sincronizar metadata automáticamente (Sin sobreescribir)
    INSERT INTO public.assets_metadata (symbol, tipo_activo)
    VALUES (NEW.symbol, v_tipo_activo)
    ON CONFLICT (symbol) DO NOTHING;

    -- Obtener la fecha de emisión real de la tabla de metadatos
    SELECT fecha_emision INTO v_fecha_emision FROM public.assets_metadata WHERE symbol = NEW.symbol;

    -- Lógica de obtención del CER inicial con LAG de 10 días hábiles
    IF v_tipo_activo IN ('lecap', 'bono') AND v_fecha_emision IS NOT NULL THEN
        SELECT valor INTO v_cer_inicial
        FROM (
            SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
            FROM public.bcra_cer
            WHERE fecha < v_fecha_emision
            AND extract(dow from fecha) BETWEEN 1 AND 5 -- Días hábiles (L-V)
        ) sub
        WHERE rn = 10;
        
        -- Si no encuentra exactamente el 10 (ej: pocos datos), buscar el más antiguo disponible como fallback
        IF v_cer_inicial IS NULL THEN
            SELECT valor INTO v_cer_inicial FROM public.bcra_cer ORDER BY fecha ASC LIMIT 1;
        END IF;
    END IF;

    -- Ingesta a Silver (Letras)
    IF TG_TABLE_NAME = 'bronze_live_letras' THEN
        INSERT INTO public.silver_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, NOW())
        ON CONFLICT (symbol) DO UPDATE SET c = EXCLUDED.c, v = EXCLUDED.v, cer_inicial = EXCLUDED.cer_inicial, updated_at = NOW();

    -- Ingesta a Silver (Bonos)
    ELSIF TG_TABLE_NAME = 'bronze_live_bonos' THEN
        INSERT INTO public.silver_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, q_op, cer_inicial, updated_at)
        VALUES (NEW.symbol, (NEW.data->>'c')::numeric, (NEW.data->>'pct_change')::numeric, (NEW.data->>'q_bid')::numeric, (NEW.data->>'px_bid')::numeric, (NEW.data->>'px_ask')::numeric, (NEW.data->>'q_ask')::numeric, (NEW.data->>'v')::numeric, (NEW.data->>'q_op')::numeric, v_cer_inicial, NOW())
        ON CONFLICT (symbol) DO UPDATE SET c = EXCLUDED.c, v = EXCLUDED.v, cer_inicial = EXCLUDED.cer_inicial, updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Forzar recalculo masivo
UPDATE public.bronze_live_bonos SET updated_at = NOW();
UPDATE public.bronze_live_letras SET updated_at = NOW();

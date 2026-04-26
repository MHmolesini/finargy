-- 1. ASEGURAR COLUMNAS FINANCIERAS EN CAPA GOLD
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS cer_inicial numeric;
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tasa_directa numeric;
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tem numeric;
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS tea numeric;

ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS cer_inicial numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tasa_directa numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tem numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS tea numeric;

-- 2. TRIGGER CALCULADORA FINANCIERA INTEGRAL
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
    v_cer_inicial_lookup numeric;
BEGIN
    -- 1. Obtener Metadatos
    SELECT fecha_emision, fecha_vencimiento INTO v_fecha_emision, v_fecha_vto
    FROM public.assets_metadata WHERE UPPER(TRIM(symbol)) = UPPER(TRIM(NEW.symbol));

    -- 2. Obtener CER Actual (770.89...)
    SELECT valor INTO v_cer_actual FROM public.bcra_cer ORDER BY fecha DESC LIMIT 1;

    -- 3. Definir CER Inicial (con redundancia)
    v_cer_inicial_lookup := NEW.cer_inicial;
    IF (v_cer_inicial_lookup IS NULL OR v_cer_inicial_lookup = 0) AND v_fecha_emision IS NOT NULL THEN
        -- Backup Lookup si Silver falló
        IF NEW.tipo_activo = 'lecer' THEN
            SELECT valor INTO v_cer_inicial_lookup FROM public.bcra_cer WHERE fecha <= v_fecha_emision ORDER BY fecha DESC LIMIT 1;
        ELSIF NEW.tipo_activo = 'boncer' THEN
            SELECT valor INTO v_cer_inicial_lookup FROM (
                SELECT valor, row_number() OVER (ORDER BY fecha DESC) as rn
                FROM public.bcra_cer WHERE fecha < v_fecha_emision AND extract(dow from fecha) BETWEEN 1 AND 5
            ) sub WHERE rn = 10;
        END IF;
    END IF;

    -- 4. Cálculo del Monto al Vencimiento (Precio Final Estimado)
    IF NEW.tipo_activo IN ('lecap', 'boncap') AND NEW.tasa_licitacion IS NOT NULL AND v_fecha_emision IS NOT NULL AND v_fecha_vto IS NOT NULL THEN
        v_precio_final := 100 * POWER(1 + NEW.tasa_licitacion, (v_fecha_vto - v_fecha_emision)::numeric / 30);
    ELSIF NEW.tipo_activo IN ('lecer', 'boncer') AND v_cer_inicial_lookup > 0 AND v_cer_actual IS NOT NULL THEN
        v_precio_final := 100 * (v_cer_actual / v_cer_inicial_lookup);
    ELSE
        v_precio_final := 100; -- Fallback nominal
    END IF;

    -- 5. CÁLCULOS DE RENDIMIENTO (TEM / TEA)
    -- Solo si el precio actual (c) es válido y el activo no ha vencido
    v_days_to_vto := v_fecha_vto - CURRENT_DATE;
    
    IF NEW.c > 0 AND v_days_to_vto > 0 AND v_precio_final > 0 THEN
        -- Tasa Directa: (MontoVto / PrecioActual) - 1
        v_tasa_directa := (v_precio_final / NEW.c) - 1;
        
        -- TEM: ((1 + TasaDirecta)^(30 / DiasVto)) - 1
        v_tem := POWER(1 + v_tasa_directa, 30.0 / v_days_to_vto) - 1;
        
        -- TEA: ((1 + TEM)^12) - 1
        v_tea := POWER(1 + v_tem, 12) - 1;
    ELSE
        v_tasa_directa := 0; v_tem := 0; v_tea := 0;
    END IF;

    -- 6. ACTUALIZACIÓN DE CAPA GOLD (Letras)
    IF TG_TABLE_NAME = 'silver_live_letras' THEN
        INSERT INTO public.gold_live_letras (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, cer_inicial, tasa_directa, tem, tea, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, v_days_to_vto, v_precio_final, NEW.tipo_activo, v_cer_inicial_lookup, v_tasa_directa, v_tem * 100, v_tea * 100, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            daysToVto = EXCLUDED.daysToVto,
            precio_final_estimado = EXCLUDED.precio_final_estimado,
            cer_inicial = EXCLUDED.cer_inicial,
            tasa_directa = EXCLUDED.tasa_directa,
            tem = EXCLUDED.tem,
            tea = EXCLUDED.tea,
            updated_at = NOW();

    -- 7. ACTUALIZACIÓN DE CAPA GOLD (Bonos)
    ELSIF TG_TABLE_NAME = 'silver_live_bonos' THEN
        INSERT INTO public.gold_live_bonos (symbol, c, pct_change, px_bid, px_ask, daysToVto, precio_final_estimado, tipo_activo, cer_inicial, tasa_directa, tem, tea, updated_at)
        VALUES (NEW.symbol, NEW.c, NEW.pct_change, NEW.px_bid, NEW.px_ask, v_days_to_vto, v_precio_final, NEW.tipo_activo, v_cer_inicial_lookup, v_tasa_directa, v_tem * 100, v_tea * 100, NOW())
        ON CONFLICT (symbol) DO UPDATE SET 
            c = EXCLUDED.c, 
            daysToVto = EXCLUDED.daysToVto,
            precio_final_estimado = EXCLUDED.precio_final_estimado,
            cer_inicial = EXCLUDED.cer_inicial,
            tasa_directa = EXCLUDED.tasa_directa,
            tem = EXCLUDED.tem,
            tea = EXCLUDED.tea,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RECALCULO FINAL (El "Shaking" definitivo)
UPDATE public.silver_live_letras SET updated_at = NOW();
UPDATE public.silver_live_bonos SET updated_at = NOW();

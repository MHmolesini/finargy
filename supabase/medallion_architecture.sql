-- 1. Agregar la columna vol_monto a las tablas GOLD
ALTER TABLE public.gold_live_letras ADD COLUMN IF NOT EXISTS vol_monto numeric;
ALTER TABLE public.gold_live_bonos ADD COLUMN IF NOT EXISTS vol_monto numeric;

-- 2. ACTUALIZAR FUNCIÓN DE LETRAS (Incluyendo vol_monto)
CREATE OR REPLACE FUNCTION process_silver_to_gold_letras()
RETURNS TRIGGER AS $$
DECLARE
    meta RECORD;
    v_precio_final numeric;
    v_days_to_vto integer;
    v_vol_monto numeric;
BEGIN
    SELECT * INTO meta FROM assets_metadata WHERE TRIM(symbol) = TRIM(NEW.symbol);
    
    -- Filtro de vencimiento
    IF meta.symbol IS NOT NULL AND meta.fecha_vencimiento < CURRENT_DATE THEN
        DELETE FROM public.gold_live_letras WHERE symbol = NEW.symbol;
        RETURN NEW;
    END IF;

    -- Cálculo de Volumen en $ (v / 100 * c)
    IF NEW.v IS NOT NULL AND NEW.c IS NOT NULL THEN
        v_vol_monto := (NEW.v / 100.0) * NEW.c;
    END IF;

    IF meta.symbol IS NOT NULL THEN
        IF meta.fecha_emision IS NOT NULL AND meta.fecha_vencimiento IS NOT NULL AND meta.tasa_licitacion IS NOT NULL THEN
            v_precio_final := 100 * POWER((1 + meta.tasa_licitacion), ((meta.fecha_vencimiento - meta.fecha_emision) - 1) / 30.0);
        END IF;
        v_days_to_vto := (meta.fecha_vencimiento - CURRENT_DATE);
    END IF;

    INSERT INTO public.gold_live_letras (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, vol_monto, q_op, spread, daystovto, precio_final_estimado, tasa_directa, tem, tea, updated_at)
    VALUES (
        NEW.symbol, NEW.c, NEW.pct_change, NEW.q_bid, NEW.px_bid, NEW.px_ask, NEW.q_ask, NEW.v, v_vol_monto, NEW.q_op,
        CASE WHEN NEW.px_bid > 0 THEN ((NEW.px_ask - NEW.px_bid) / NEW.px_bid) * 100 ELSE 0 END,
        v_days_to_vto, v_precio_final,
        CASE WHEN v_precio_final > 0 AND NEW.c > 0 THEN (v_precio_final / NEW.c - 1) * 100 ELSE NULL END,
        CASE WHEN v_precio_final > 0 AND NEW.c > 0 AND v_days_to_vto > 0 THEN (POWER(v_precio_final / NEW.c, 30.0 / v_days_to_vto) - 1) * 100 ELSE NULL END,
        CASE WHEN v_precio_final > 0 AND NEW.c > 0 AND v_days_to_vto > 0 THEN (POWER(v_precio_final / NEW.c, 365.0 / v_days_to_vto) - 1) * 100 ELSE NULL END,
        NOW()
    )
    ON CONFLICT (symbol) DO UPDATE SET c = EXCLUDED.c, px_bid = EXCLUDED.px_bid, px_ask = EXCLUDED.px_ask, spread = EXCLUDED.spread, daystovto = EXCLUDED.daystovto, precio_final_estimado = EXCLUDED.precio_final_estimado, tasa_directa = EXCLUDED.tasa_directa, tem = EXCLUDED.tem, tea = EXCLUDED.tea, v = EXCLUDED.v, vol_monto = EXCLUDED.vol_monto, updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. ACTUALIZAR FUNCIÓN DE BONOS (Incluyendo vol_monto)
CREATE OR REPLACE FUNCTION process_silver_to_gold_bonos()
RETURNS TRIGGER AS $$
DECLARE
    meta RECORD;
    v_days_to_vto integer;
    v_vol_monto numeric;
BEGIN
    SELECT * INTO meta FROM assets_metadata WHERE TRIM(symbol) = TRIM(NEW.symbol);
    
    -- Filtro de vencimiento
    IF meta.symbol IS NOT NULL AND meta.fecha_vencimiento < CURRENT_DATE THEN
        DELETE FROM public.gold_live_bonos WHERE symbol = NEW.symbol;
        RETURN NEW;
    END IF;

    -- Cálculo de Volumen en $ (v / 100 * c)
    IF NEW.v IS NOT NULL AND NEW.c IS NOT NULL THEN
        v_vol_monto := (NEW.v / 100.0) * NEW.c;
    END IF;

    IF meta.symbol IS NOT NULL THEN
        v_days_to_vto := (meta.fecha_vencimiento - CURRENT_DATE);
    END IF;

    INSERT INTO public.gold_live_bonos (symbol, c, pct_change, q_bid, px_bid, px_ask, q_ask, v, vol_monto, q_op, spread, daystovto, updated_at)
    VALUES (
        NEW.symbol, NEW.c, NEW.pct_change, NEW.q_bid, NEW.px_bid, NEW.px_ask, NEW.q_ask, NEW.v, v_vol_monto, NEW.q_op,
        CASE WHEN NEW.px_bid > 0 THEN ((NEW.px_ask - NEW.px_bid) / NEW.px_bid) * 100 ELSE 0 END,
        v_days_to_vto, NOW()
    )
    ON CONFLICT (symbol) DO UPDATE SET c = EXCLUDED.c, px_bid = EXCLUDED.px_bid, px_ask = EXCLUDED.px_ask, spread = EXCLUDED.spread, daystovto = EXCLUDED.daystovto, v = EXCLUDED.v, vol_monto = EXCLUDED.vol_monto, updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. FORZAR ACTUALIZACIÓN
UPDATE public.bronze_live_letras SET updated_at = NOW();
UPDATE public.bronze_live_bonos SET updated_at = NOW();

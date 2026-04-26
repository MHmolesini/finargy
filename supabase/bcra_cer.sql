-- Crear la tabla para el índice CER
CREATE TABLE IF NOT EXISTS public.bcra_cer (
    fecha date PRIMARY KEY,
    valor numeric NOT NULL,
    created_at timestamptz DEFAULT NOW()
);

-- Habilitar RLS (Opcional, pero recomendado por seguridad)
ALTER TABLE public.bcra_cer ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todos
CREATE POLICY "Lectura pública para bcra_cer" 
ON public.bcra_cer FOR SELECT 
USING (true);

-- Comentario descriptivo
COMMENT ON TABLE public.bcra_cer IS 'Serie histórica del Coeficiente de Estabilización de Referencia (CER) obtenida de la API del BCRA.';

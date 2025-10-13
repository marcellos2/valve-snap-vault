-- Criar índices para otimizar queries no inspection_records
-- Índice para busca por data (usado frequentemente no filtro)
CREATE INDEX IF NOT EXISTS idx_inspection_records_date ON public.inspection_records(inspection_date DESC);

-- Índice para busca por código de válvula (usado na pesquisa)
CREATE INDEX IF NOT EXISTS idx_inspection_records_valve_code ON public.inspection_records(valve_code);

-- Índice composto para otimizar queries que filtram por data e código
CREATE INDEX IF NOT EXISTS idx_inspection_records_date_valve ON public.inspection_records(inspection_date DESC, valve_code);
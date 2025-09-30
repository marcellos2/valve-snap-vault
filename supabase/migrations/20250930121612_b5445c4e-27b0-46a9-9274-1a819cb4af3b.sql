-- Criar storage bucket para fotos das válvulas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'valve-photos',
  'valve-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Criar tabela de registros fotográficos
CREATE TABLE public.inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valve_code TEXT,
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_initial_url TEXT,
  photo_during_url TEXT,
  photo_final_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspection_records ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir leitura pública para facilitar uso
CREATE POLICY "Permitir leitura pública de inspeções"
ON public.inspection_records
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção pública de inspeções"
ON public.inspection_records
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de inspeções"
ON public.inspection_records
FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão pública de inspeções"
ON public.inspection_records
FOR DELETE
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_inspection_records_updated_at
BEFORE UPDATE ON public.inspection_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas de storage para fotos das válvulas
CREATE POLICY "Permitir leitura pública de fotos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'valve-photos');

CREATE POLICY "Permitir upload público de fotos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'valve-photos');

CREATE POLICY "Permitir atualização pública de fotos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'valve-photos');

CREATE POLICY "Permitir exclusão pública de fotos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'valve-photos');
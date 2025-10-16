-- Adicionar coluna de status para controlar etapas da inspeção
ALTER TABLE public.inspection_records
ADD COLUMN status text DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.inspection_records.status IS 'Status da inspeção: em_andamento (faltam fotos) ou concluido (todas as fotos anexadas)';

-- Atualizar registros existentes que já têm todas as fotos como concluídos
UPDATE public.inspection_records
SET status = 'concluido'
WHERE photo_initial_url IS NOT NULL 
  AND photo_during_url IS NOT NULL 
  AND photo_final_url IS NOT NULL;
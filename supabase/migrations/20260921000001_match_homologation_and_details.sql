-- BaseOS — Saneamento de Schema P0: Homologação e Detalhes Operacionais da Partida
-- Formalização e versionamento das colunas aplicadas manualmente na produção VOLTZ.
-- Migration aditiva e idempotente; não altera dados preexistentes.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS homologated_at timestamptz,
  ADD COLUMN IF NOT EXISTS homologated_by uuid,
  ADD COLUMN IF NOT EXISTS checked_in_athlete_ids text[],
  ADD COLUMN IF NOT EXISTS custom_set_format text,
  ADD COLUMN IF NOT EXISTS is_wo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wo_reason text;

-- Índices auxiliares para consultas operacionais e de homologação
CREATE INDEX IF NOT EXISTS idx_matches_homologated_at
  ON public.matches (homologated_at)
  WHERE homologated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_is_wo
  ON public.matches (is_wo)
  WHERE is_wo = true;

COMMENT ON COLUMN public.matches.homologated_at IS 'Data/hora oficial em que o resultado da partida foi homologado pela coordenação.';
COMMENT ON COLUMN public.matches.homologated_by IS 'Identificador do usuário (coordenador/admin) responsável pela homologação da partida.';
COMMENT ON COLUMN public.matches.checked_in_athlete_ids IS 'Lista de IDs dos atletas que realizaram check-in/validação presencial para a partida.';
COMMENT ON COLUMN public.matches.custom_set_format IS 'Formato customizado de sets da partida (ex: 3-sets, 5-sets), quando diferente do padrão da competição.';
COMMENT ON COLUMN public.matches.is_wo IS 'Indica se a partida foi encerrada por Walkover (W.O.).';
COMMENT ON COLUMN public.matches.wo_reason IS 'Motivo ou justificativa técnica/operacional registrada para a ocorrência do W.O.';

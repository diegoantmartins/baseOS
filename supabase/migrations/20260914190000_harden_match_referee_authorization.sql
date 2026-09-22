-- BaseOS — Fase 9.9.1: Hardening de Autorização de Partidas (Árbitros e Mesários)
--
-- Objetivo:
--   1. Espelhar fielmente no PostgreSQL a regra de negócio existente no domínio
--      (TenantSecurityService.canSubmitMatchScore):
--      - Se a partida possui escala nominal (referees não vazio), apenas árbitros/mesários
--        nominalmente escalados (por nome ou e-mail) podem atualizar o jogo.
--      - Se a partida NÃO possui escala nominal (referees = '[]' ou NULL), qualquer
--        árbitro ou mesário credenciado pode operar a súmula.
--   2. Proteger a própria equipe de arbitragem (coluna referees) contra autoescalação ou
--      alteração por árbitros e mesários.
--   3. Blindar 100% dos campos estruturais e administrativos da tabela matches:
--      id, competition_id, team_a_id, team_b_id, team_a_name, team_b_name,
--      team_a_short_name, team_b_short_name, venue, court, scheduled_time,
--      round, match_number, phase, group_name, slot_id, created_at.
--   4. Preservar a capacidade operacional de referee e scorer para:
--      status, sets, winner_id, observations, lineups, highlight_athlete_id, updated_at.
--   5. Preservar o controle irrestrito de admin e organizer sobre todas as colunas.
--   6. Manter o bloqueio absoluto de escrita para role='team' e role='viewer'.

CREATE OR REPLACE FUNCTION public.trg_protect_match_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_name text;
  v_caller_email text;
BEGIN
  -- 1. Identificar dados do usuário autenticado no public.profiles
  SELECT role, lower(trim(name)), lower(trim(email))
  INTO v_caller_role, v_caller_name, v_caller_email
  FROM public.profiles
  WHERE id = auth.uid();

  -- Se for admin ou organizer, permissão total sem restrições
  IF v_caller_role IN ('admin', 'organizer') THEN
    RETURN NEW;
  END IF;

  -- 2. Para referee e scorer: aplicar regras estritas de súmula e escala
  IF v_caller_role IN ('referee', 'scorer') THEN

    -- (A) REGRA DA ESCALA NOMINAL (espelhamento exato de TenantSecurityService.canSubmitMatchScore):
    -- Se OLD.referees contém árbitros escalados (array não vazio), o chamador
    -- OBRIGATORIAMENTE deve constar na escala por nome ou por e-mail.
    IF OLD.referees IS NOT NULL
       AND jsonb_typeof(OLD.referees) = 'array'
       AND jsonb_array_length(OLD.referees) > 0 THEN

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(OLD.referees) AS r
        WHERE lower(trim(COALESCE(r->>'name', ''))) IN (v_caller_name, v_caller_email)
      ) THEN
        RAISE EXCEPTION 'Acesso negado: árbitro/mesário não está escalado nesta partida.';
      END IF;
    END IF;

    -- (B) PROTEÇÃO DE ESCALAÇÃO:
    -- Árbitros e mesários NÃO podem alterar a escala de arbitragem da partida.
    IF NEW.referees IS DISTINCT FROM OLD.referees THEN
      RAISE EXCEPTION 'Acesso negado: árbitro/mesário não pode alterar a equipe de arbitragem.';
    END IF;

    -- (C) PROTEÇÃO DE TODAS AS COLUNAS ESTRUTURAIS E ADMINISTRATIVAS:
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar o ID de partidas.';
    END IF;
    IF NEW.competition_id IS DISTINCT FROM OLD.competition_id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar competition_id de partidas.';
    END IF;
    IF NEW.team_a_id IS DISTINCT FROM OLD.team_a_id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar team_a_id de partidas.';
    END IF;
    IF NEW.team_b_id IS DISTINCT FROM OLD.team_b_id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar team_b_id de partidas.';
    END IF;
    IF NEW.team_a_name IS DISTINCT FROM OLD.team_a_name THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar team_a_name de partidas.';
    END IF;
    IF NEW.team_b_name IS DISTINCT FROM OLD.team_b_name THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar team_b_name de partidas.';
    END IF;
    IF NEW.team_a_short_name IS DISTINCT FROM OLD.team_a_short_name THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar team_a_short_name de partidas.';
    END IF;
    IF NEW.team_b_short_name IS DISTINCT FROM OLD.team_b_short_name THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar team_b_short_name de partidas.';
    END IF;
    IF NEW.venue IS DISTINCT FROM OLD.venue THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar venue de partidas.';
    END IF;
    IF NEW.court IS DISTINCT FROM OLD.court THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar court de partidas.';
    END IF;
    IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar scheduled_time de partidas.';
    END IF;
    IF NEW.round IS DISTINCT FROM OLD.round THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar round de partidas.';
    END IF;
    IF NEW.match_number IS DISTINCT FROM OLD.match_number THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar match_number de partidas.';
    END IF;
    IF NEW.phase IS DISTINCT FROM OLD.phase THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar phase de partidas.';
    END IF;
    IF NEW.group_name IS DISTINCT FROM OLD.group_name THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar group_name de partidas.';
    END IF;
    IF NEW.slot_id IS DISTINCT FROM OLD.slot_id THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar slot_id de partidas.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Acesso negado: não é permitido alterar created_at de partidas.';
    END IF;

    -- Campos permitidos para atualização operacional de súmula:
    -- status, sets, winner_id, observations, lineups, highlight_athlete_id, updated_at
    RETURN NEW;
  END IF;

  -- 3. Qualquer outro role (team, viewer ou não definido) é sumariamente bloqueado
  RAISE EXCEPTION 'Acesso negado: perfil % não possui permissão para alterar partidas.', v_caller_role;
END;
$$;

-- Garantir recriação do trigger BEFORE UPDATE na tabela public.matches
DROP TRIGGER IF EXISTS trg_protect_match_admin_fields ON public.matches;
CREATE TRIGGER trg_protect_match_admin_fields
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_match_admin_fields();

-- ============================================================================
-- BASEOS - GATE 2A.12 / 2A.13: RECONCILIAÇÃO CADASTRAL CONTROLADA
--
-- Migration Template para Reconciliação Cadastral da Atleta Laura Moraes de Andrade
-- e Desbloqueio da Criação do UNIQUE INDEX (uq_athletes_normalized_cpf).
--
-- AVISO CRÍTICO:
-- Este script NÃO deve ser executado com dados fictícios.
-- As variáveis __NOVO_NORMALIZED_CPF__ e __NOVA_DATA_NASCIMENTO__ devem ser
-- preenchidas com os dados reais confirmados pela organização, ou definidas
-- como NULL caso formalmente confirmado que o documento não foi fornecido.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PRECONDITIONS OBRIGATÓRIAS DE IDENTIDADE E SEGURANÇA
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_laura record;
  v_kelly record;
  v_dup_count integer;
BEGIN
  -- 1.1 Validar identidade da Laura
  SELECT * INTO v_laura
  FROM public.athletes
  WHERE id = 'ath-c2f5b9a6-0770-4114-b0c5-adf3ee237de9';

  IF v_laura IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: Atleta Laura (ath-c2f5b9a6-0770-4114-b0c5-adf3ee237de9) não encontrada!';
  END IF;

  IF v_laura.name <> 'Laura Moraes de Andrade' THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: Nome divergente para Laura. Esperado: Laura Moraes de Andrade, Obtido: %', v_laura.name;
  END IF;

  IF v_laura.organization_id <> 'org-voltz' THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: Organização divergente para Laura. Esperado: org-voltz, Obtido: %', v_laura.organization_id;
  END IF;

  IF v_laura.normalized_cpf <> '09727646905' THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: CPF atual da Laura divergente do esperado duplicado (09727646905). Obtido: %', v_laura.normalized_cpf;
  END IF;

  -- 1.2 Validar identidade da Kelly
  SELECT * INTO v_kelly
  FROM public.athletes
  WHERE id = 'ath-556d3fa9-20f9-46d4-ba19-2ffbcc81e583';

  IF v_kelly IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: Atleta Kelly (ath-556d3fa9-20f9-46d4-ba19-2ffbcc81e583) não encontrada!';
  END IF;

  IF v_kelly.name <> 'Kelly de Cássia Macagnan Stunpf' THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: Nome divergente para Kelly. Esperado: Kelly de Cássia Macagnan Stunpf, Obtido: %', v_kelly.name;
  END IF;

  IF v_kelly.normalized_cpf <> '09727646905' THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: CPF de Kelly divergente do canônico (09727646905). Obtido: %', v_kelly.normalized_cpf;
  END IF;

  -- 1.3 Validar que existe a duplicidade esperada antes da correção
  SELECT count(*) INTO v_dup_count
  FROM public.athletes
  WHERE normalized_cpf = '09727646905';

  IF v_dup_count <> 2 THEN
    RAISE EXCEPTION 'PRECONDITION FALHOU: Esperado exatamente 2 registros com CPF 09727646905, obtido: %', v_dup_count;
  END IF;

  RAISE NOTICE 'Preconditions validadas com sucesso: Kelly e Laura identificadas, duplicidade confirmada.';
END $$;

-- ----------------------------------------------------------------------------
-- 2. ATUALIZAÇÃO ATÔMICA CONTROLADA
-- ----------------------------------------------------------------------------
-- 2.1 Atualiza athletes: Altera estritamente normalized_cpf e birth_date (se confirmado)
-- Mantém ID, Nome, Organização, created_at 100% intactos.
UPDATE public.athletes
SET normalized_cpf = NULL, -- SUBSTITUIR POR: public.normalize_cpf('CPF_REAL') OU NULL
    birth_date = COALESCE(NULL, birth_date), -- SUBSTITUIR POR: DATE 'AAAA-MM-DD' OU manter
    updated_at = now()
WHERE id = 'ath-c2f5b9a6-0770-4114-b0c5-adf3ee237de9'
  AND name = 'Laura Moraes de Andrade'
  AND organization_id = 'org-voltz';

-- 2.2 Atualiza competition_athletes: Sincroniza o document_number e birth_date da inscrição
UPDATE public.competition_athletes
SET document_number = NULL, -- SUBSTITUIR POR: 'CPF_REAL_COM_MASCARA' OU NULL
    birth_date = COALESCE(NULL, birth_date), -- SUBSTITUIR POR: DATE 'AAAA-MM-DD' OU manter
    updated_at = now()
WHERE athlete_id = 'ath-c2f5b9a6-0770-4114-b0c5-adf3ee237de9'
  AND competition_team_id = 'ct-ad0302e4-5804-4911-805d-a28e7398dfce';

-- ----------------------------------------------------------------------------
-- 3. VALIDAÇÃO OBRIGATÓRIA DE PÓS-CONDIÇÕES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dup_count integer;
  v_kelly record;
  v_laura record;
BEGIN
  -- 3.1 Garantir ZERO duplicidades globais de CPF
  SELECT count(*) INTO v_dup_count
  FROM public.athletes
  WHERE normalized_cpf IS NOT NULL
  GROUP BY normalized_cpf
  HAVING count(*) > 1;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'POS-CONDITION FALHOU: Ainda existem % duplicidades de CPF na base!', v_dup_count;
  END IF;

  -- 3.2 Garantir preservação estrita de Kelly
  SELECT * INTO v_kelly FROM public.athletes WHERE id = 'ath-556d3fa9-20f9-46d4-ba19-2ffbcc81e583';
  IF v_kelly.normalized_cpf <> '09727646905' OR v_kelly.name <> 'Kelly de Cássia Macagnan Stunpf' THEN
    RAISE EXCEPTION 'POS-CONDITION FALHOU: Identidade de Kelly foi alterada!';
  END IF;

  -- 3.3 Garantir integridade de Laura
  SELECT * INTO v_laura FROM public.athletes WHERE id = 'ath-c2f5b9a6-0770-4114-b0c5-adf3ee237de9';
  IF v_laura.name <> 'Laura Moraes de Andrade' OR v_laura.organization_id <> 'org-voltz' THEN
    RAISE EXCEPTION 'POS-CONDITION FALHOU: Identidade de Laura foi corrompida!';
  END IF;

  RAISE NOTICE 'Pós-condições validadas com sucesso: Zero duplicidades globais, integridade referencial mantida.';
END $$;

COMMIT;

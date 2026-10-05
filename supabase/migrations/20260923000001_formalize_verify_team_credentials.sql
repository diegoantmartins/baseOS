-- BaseOS — Formalização Canônica da RPC verify_team_credentials
--
-- STATUS: CANDIDATE / NÃO VALIDADA CONTRA PRODUÇÃO
-- Motivo: Definição SQL original no banco VOLTZ não pôde ser recuperada diretamente via
-- pg_proc / pg_get_functiondef devido a restrições de rede/portas na infraestrutura VPS.
-- Esta proposta foi construída com base em evidências forenses do Gate 1B e Gate 1C:
-- 1) OpenAPI PostgREST (/rest/v1/) da VOLTZ;
-- 2) Sondagem comportamental não destrutiva (parâmetros vazios, tokens inexistentes, senhas incorretas);
-- 3) Engenharia reversa do bundle de frontend servido em produção (index-C7AnobpH.js);
-- 4) Espelhamento exato do modelo de senhas (bcrypt/pgcrypto) de provision_team_user (20260914000001).
--
-- CONTRATO COMPROVADO:
-- - p_token text (obrigatório): access_token em public.competition_teams.access_token
-- - p_password text (obrigatório): senha fornecida ao dirigente
-- - Retorno (jsonb):
--     Token vazio:  {"ok": false, "error": "Token de acesso não fornecido."}
--     Senha vazia:  {"ok": false, "error": "Senha de acesso obrigatória."}
--     Token não encontrado: {"ok": false, "error": "Inscrição de equipe não encontrada para o link fornecido."}
--     Senha incorreta ou sem usuário: {"ok": false, "error": "Senha de acesso incorreta. Verifique a senha recebida."}
--     Sucesso: {"ok": true, "email": "<email_do_dirigente>"}
--
-- SEGURANÇA E ARQUITETURA:
-- - SECURITY DEFINER: permite que chamadores anônimos (anon) validem a senha contra auth.users sem permissão direta de SELECT em auth.
-- - SET search_path = public, extensions: defesa em profundidade contra search_path hijacking.
-- - GRANTS: explicitamente concedidos para anon, authenticated e service_role.

CREATE OR REPLACE FUNCTION public.verify_team_credentials(
  p_token text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ct_id text;
  v_user_email text;
  v_encrypted_password text;
  v_norm_token text;
  v_norm_password text;
BEGIN
  -- 1. Validação estrita de parâmetros de entrada
  v_norm_token := btrim(COALESCE(p_token, ''));
  v_norm_password := btrim(COALESCE(p_password, ''));

  IF v_norm_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Token de acesso não fornecido.');
  END IF;

  IF v_norm_password = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Senha de acesso obrigatória.');
  END IF;

  -- 2. Localização da equipe pelo token de acesso
  SELECT id INTO v_ct_id
  FROM public.competition_teams
  WHERE access_token = v_norm_token
  LIMIT 1;

  IF v_ct_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Inscrição de equipe não encontrada para o link fornecido.'
    );
  END IF;

  -- 3. Localização do usuário dirigente vinculado a esta equipe
  --    (criado originalmente via provision_team_user)
  SELECT u.email, u.encrypted_password
  INTO v_user_email, v_encrypted_password
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.competition_team_id = v_ct_id
    AND p.role = 'team'
  LIMIT 1;

  -- Fallback de compatibilidade caso o profile ainda não esteja indexado por competition_team_id
  IF v_user_email IS NULL THEN
    SELECT u.email, u.encrypted_password
    INTO v_user_email, v_encrypted_password
    FROM auth.users u
    WHERE u.raw_user_meta_data ->> 'competition_team_id' = v_ct_id
    LIMIT 1;
  END IF;

  -- Se não há usuário provisionado para a equipe, retorna erro idêntico de credenciais
  IF v_user_email IS NULL OR v_encrypted_password IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Senha de acesso incorreta. Verifique a senha recebida.'
    );
  END IF;

  -- 4. Verificação de senha criptografada via bcrypt (pgcrypto)
  IF v_encrypted_password <> extensions.crypt(v_norm_password, v_encrypted_password) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Senha de acesso incorreta. Verifique a senha recebida.'
    );
  END IF;

  -- 5. Sucesso: retorna e-mail para que o cliente complete o signInWithPassword
  RETURN jsonb_build_object(
    'ok', true,
    'email', v_user_email
  );
END;
$$;

-- Permissões explícitas:
REVOKE ALL ON FUNCTION public.verify_team_credentials(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_team_credentials(text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.verify_team_credentials(text, text) IS
  'CANDIDATE GATE 1C: Valida token e senha de dirigente de equipe e retorna o e-mail associado para login Supabase Auth.';

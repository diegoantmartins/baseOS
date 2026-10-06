BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_cpf(p_cpf text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_cleaned text;
BEGIN
  IF p_cpf IS NULL OR btrim(p_cpf) = '' THEN
    RETURN NULL;
  END IF;

  v_cleaned := regexp_replace(p_cpf, '\D', '', 'g');

  IF length(v_cleaned) <> 11 THEN
    RETURN NULL;
  END IF;

  RETURN v_cleaned;
END;
$function$;

COMMENT ON FUNCTION public.normalize_cpf(text)
IS 'Normaliza CPF para identidade canônica de atletas: remove caracteres não numéricos e retorna NULL quando o resultado não possui 11 dígitos.';

COMMIT;

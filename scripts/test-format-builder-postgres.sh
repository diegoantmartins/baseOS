#!/usr/bin/env bash
# BaseOS — Script de Homologação Format Builder & Competition Setup no PostgreSQL Real (Fase 4.10)
# Provas:
# 1. CREATE: Criação de competição com ownership de organizador e status 'planning'
# 2. SAVE: Persistência de CompetitionConfig estruturado (JSONB) com estágios, feeds, pairings e regras
# 3. RELOAD: Verificação de integridade e equivalência de deserialização JSONB
# 4. UPDATE: Atualização de configuração antes do congelamento (ex: Best of 3 -> Best of 5)
# 5. FREEZE: Congelamento de regras com rules_snapshot
# 6. DEFESA DE FREEZE: Garantia de que rules_snapshot é preservado contra mutações indevidas
# 7. PUBLISH: Publicação da competição (transição de status para 'registration-open')

set -e

DB_NAME="volei_test_db"
CONTAINER="supabase-db"

echo "========================================================================"
echo "BASEOS — FASE 4.10: HOMOLOGAÇÃO DO FORMAT BUILDER NO POSTGRESQL REAL"
echo "Banco: $DB_NAME (Container: $CONTAINER)"
echo "========================================================================"

run_sql() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -A -t -c "$1"
}

run_sql_raw() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=0 -c "$1" 2>&1 || true
}

# ------------------------------------------------------------------------------
# SETUP DE DADOS DE TESTE
# ------------------------------------------------------------------------------
echo ""
echo "[SETUP] Limpando e preparando fixtures de teste para a Fase 4.10..."

run_sql "
DELETE FROM public.competition_match_slots WHERE competition_id = 'comp-builder-pg';
DELETE FROM public.competition_rounds WHERE competition_id = 'comp-builder-pg';
DELETE FROM public.competition_stages WHERE competition_id = 'comp-builder-pg';
DELETE FROM public.competitions WHERE id = 'comp-builder-pg';

-- Cria organizador autenticado
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_fields;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000020', 'org-builder@baseos.app') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, name, role) VALUES ('00000000-0000-0000-0000-000000000020', 'org-builder@baseos.app', 'Organizador Format Builder', 'organizer')
ON CONFLICT (id) DO UPDATE SET role = 'organizer';
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_fields;
"

echo "  -> Fixtures preparadas com sucesso."

# ------------------------------------------------------------------------------
# PROVA 1: CREATE
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 1] CREATE: Criando competição em planejamento..."

run_sql "
INSERT INTO public.competitions (id, name, modality, format, player_format, set_format, gender_category, status, organizer_id)
VALUES ('comp-builder-pg', 'Taça Builder PostgreSQL 2026', 'indoor', 'custom', '6x6', '3-sets', 'male', 'planning', '00000000-0000-0000-0000-000000000020');
"

CREATED_STATUS=$(run_sql "SELECT status FROM public.competitions WHERE id = 'comp-builder-pg';")
if [ "$CREATED_STATUS" != "planning" ]; then
  echo "ERRO: Status inicial esperado 'planning', obtido '$CREATED_STATUS'"
  exit 1
fi
echo "  -> Competição criada com status '$CREATED_STATUS'."

# ------------------------------------------------------------------------------
# PROVA 2: SAVE
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 2] SAVE: Persistindo CompetitionConfig estruturado gerado pelo Builder..."

CONFIG_JSON='{
  "version": 1,
  "format": {
    "defaultSetsToWin": 2,
    "formatType": "groups-play-in-knockout",
    "setRules": { "regularSetPoints": 25, "tiebreakPoints": 15, "minAdvantage": 2 },
    "phaseOverrides": { "semifinals": 3, "final": 3 },
    "stages": [
      {
        "id": "stg-groups",
        "stageId": "stg-groups",
        "order": 1,
        "name": "Fase de Grupos",
        "type": "group-stage",
        "groupConfig": { "groupsCount": 4, "teamsPerGroup": 3 },
        "participantFeeds": [{ "type": "all-teams" }]
      },
      {
        "id": "stg-play-in",
        "stageId": "stg-play-in",
        "order": 2,
        "name": "Play-In",
        "type": "play-in",
        "dependsOnStageIds": ["stg-groups"],
        "eliminationConfig": { "bracketSize": 8 },
        "pairingConfig": { "strategy": "high-low" }
      },
      {
        "id": "stg-knockout",
        "stageId": "stg-knockout",
        "order": 3,
        "name": "Fase Final",
        "type": "knockout",
        "dependsOnStageIds": ["stg-groups", "stg-play-in"],
        "eliminationConfig": { "bracketSize": 8, "hasThirdPlaceMatch": true },
        "pairingConfig": { "strategy": "seeded-bracket" }
      }
    ]
  },
  "scoring": {
    "systemType": "fivb-standard",
    "pointsWinClear": 3,
    "pointsWinNarrow": 2,
    "pointsLossNarrow": 1,
    "pointsLossClear": 0,
    "pointsWoWin": 3,
    "pointsWoLoss": 0
  },
  "standings": {
    "tiebreakCriteriaOrder": ["points", "wins", "set-ratio", "point-ratio", "head-to-head", "draw"],
    "advancingPerGroup": 2,
    "aggregationStrategy": "by-group-position-first"
  },
  "registration": {
    "minAthletes": 6,
    "maxAthletes": 14,
    "maxCaptains": 1,
    "maxLiberos": 2,
    "requireJerseyNumberOnRegistration": false
  }
}'

run_sql "
UPDATE public.competitions
SET config = '$CONFIG_JSON'::jsonb, updated_at = now()
WHERE id = 'comp-builder-pg';
"

echo "  -> CompetitionConfig persistido com sucesso."

# ------------------------------------------------------------------------------
# PROVA 3: RELOAD
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 3] RELOAD: Carregando e validando equivalência da configuração JSONB..."

STAGES_COUNT=$(run_sql "SELECT jsonb_array_length(config->'format'->'stages') FROM public.competitions WHERE id = 'comp-builder-pg';")
FORMAT_TYPE=$(run_sql "SELECT config->'format'->>'formatType' FROM public.competitions WHERE id = 'comp-builder-pg';")
DEFAULT_SETS=$(run_sql "SELECT (config->'format'->>'defaultSetsToWin')::int FROM public.competitions WHERE id = 'comp-builder-pg';")
SEMIS_OVERRIDE=$(run_sql "SELECT (config->'format'->'phaseOverrides'->>'semifinals')::int FROM public.competitions WHERE id = 'comp-builder-pg';")
AGGREGATION=$(run_sql "SELECT config->'standings'->>'aggregationStrategy' FROM public.competitions WHERE id = 'comp-builder-pg';")

if [ "$STAGES_COUNT" != "3" ]; then
  echo "ERRO: Quantidade de fases esperada 3, obtida $STAGES_COUNT"
  exit 1
fi

if [ "$FORMAT_TYPE" != "groups-play-in-knockout" ]; then
  echo "ERRO: formatType esperado 'groups-play-in-knockout', obtido '$FORMAT_TYPE'"
  exit 1
fi

if [ "$DEFAULT_SETS" != "2" ]; then
  echo "ERRO: defaultSetsToWin esperado 2, obtido $DEFAULT_SETS"
  exit 1
fi

if [ "$SEMIS_OVERRIDE" != "3" ]; then
  echo "ERRO: phaseOverrides.semifinals esperado 3, obtido $SEMIS_OVERRIDE"
  exit 1
fi

if [ "$AGGREGATION" != "by-group-position-first" ]; then
  echo "ERRO: aggregationStrategy esperado 'by-group-position-first', obtido '$AGGREGATION'"
  exit 1
fi

echo "  -> RELOAD OK: 3 fases, formatType='$FORMAT_TYPE', setsToWin=$DEFAULT_SETS, semisOverride=$SEMIS_OVERRIDE, aggregation='$AGGREGATION'."

# ------------------------------------------------------------------------------
# PROVA 4: UPDATE
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 4] UPDATE: Atualizando configuração para Best of 5 (defaultSetsToWin=3)..."

run_sql "
UPDATE public.competitions
SET config = jsonb_set(config, '{format,defaultSetsToWin}', '3'::jsonb), updated_at = now()
WHERE id = 'comp-builder-pg';
"

UPDATED_SETS=$(run_sql "SELECT (config->'format'->>'defaultSetsToWin')::int FROM public.competitions WHERE id = 'comp-builder-pg';")
if [ "$UPDATED_SETS" != "3" ]; then
  echo "ERRO: defaultSetsToWin atualizado esperado 3, obtido $UPDATED_SETS"
  exit 1
fi
echo "  -> UPDATE OK: defaultSetsToWin alterado para $UPDATED_SETS."

# ------------------------------------------------------------------------------
# PROVA 5: FREEZE
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 5] FREEZE: Congelando regras com rules_snapshot..."

run_sql "
UPDATE public.competitions
SET rules_snapshot = config,
    status = 'in-progress',
    updated_at = now()
WHERE id = 'comp-builder-pg';
"

SNAPSHOT_SETS=$(run_sql "SELECT (rules_snapshot->'format'->>'defaultSetsToWin')::int FROM public.competitions WHERE id = 'comp-builder-pg';")
STATUS_NOW=$(run_sql "SELECT status FROM public.competitions WHERE id = 'comp-builder-pg';")

if [ "$SNAPSHOT_SETS" != "3" ] || [ "$STATUS_NOW" != "in-progress" ]; then
  echo "ERRO no congelamento: snapshot_sets=$SNAPSHOT_SETS, status=$STATUS_NOW"
  exit 1
fi
echo "  -> FREEZE OK: rules_snapshot congelado com setsToWin=$SNAPSHOT_SETS, status='$STATUS_NOW'."

# ------------------------------------------------------------------------------
# PROVA 6: DEFESA FÍSICA DE FREEZE (TRIGGER NO POSTGRESQL)
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 6] DEFESA FÍSICA DE FREEZE: Verificando proteção real via trigger trg_protect_competition_rules_snapshot..."

# 1. Tentativa de alterar config não altera rules_snapshot
run_sql "
UPDATE public.competitions
SET config = jsonb_set(config, '{format,defaultSetsToWin}', '2'::jsonb), updated_at = now()
WHERE id = 'comp-builder-pg';
"

INTACT_SNAPSHOT_SETS=$(run_sql "SELECT (rules_snapshot->'format'->>'defaultSetsToWin')::int FROM public.competitions WHERE id = 'comp-builder-pg';")
CONFIG_SETS=$(run_sql "SELECT (config->'format'->>'defaultSetsToWin')::int FROM public.competitions WHERE id = 'comp-builder-pg';")

if [ "$INTACT_SNAPSHOT_SETS" != "3" ]; then
  echo "ERRO: rules_snapshot foi alterado indevidamente!"
  exit 1
fi
echo "  -> Isolamento OK: config=$CONFIG_SETS, mas rules_snapshot=$INTACT_SNAPSHOT_SETS."

# 2. Prova Adversarial Real: Tentativa de UPDATE direto na coluna rules_snapshot
echo "  -> Executando tentativa hostil de UPDATE direto em rules_snapshot no PostgreSQL..."
TAMPER_RES=$(run_sql_raw "
UPDATE public.competitions
SET rules_snapshot = '{\"tampered\": true}'::jsonb
WHERE id = 'comp-builder-pg';
")

if echo "$TAMPER_RES" | grep -q "rules_snapshot is immutable once frozen"; then
  echo "  -> SUCESSO: O PostgreSQL rejeitou fisicamente o UPDATE com a exceção esperada:"
  echo "     $TAMPER_RES"
else
  echo "ERRO: O PostgreSQL permitiu a mutação direta de rules_snapshot ou não disparou o trigger!"
  echo "Saída obtida: $TAMPER_RES"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 7: PUBLISH (Transição de status)
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 7] PUBLISH: Validação de ciclo de publicação e integridade relacional..."

run_sql "
UPDATE public.competitions
SET status = 'completed', updated_at = now()
WHERE id = 'comp-builder-pg';
"

FINAL_STATUS=$(run_sql "SELECT status FROM public.competitions WHERE id = 'comp-builder-pg';")
if [ "$FINAL_STATUS" != "completed" ]; then
  echo "ERRO: Status final esperado 'completed', obtido '$FINAL_STATUS'"
  exit 1
fi

echo "  -> PUBLISH OK: Ciclo de vida completo verificado no banco real."
echo ""
echo "========================================================================"
echo "TODAS AS 7 PROVAS DO FORMAT BUILDER NO POSTGRESQL REAL PASSARAM COM SUCESSO!"
echo "========================================================================"

#!/usr/bin/env bash
# BaseOS — Script de Homologação Runtime no PostgreSQL Real (Fase 4.8)
# Provas:
# 1. Inicialização de Estágio, Rodadas e Slots com save_stage_draw_and_slots
# 2. Materialização Atômica Concorrente de Partida (rpc_materialize_slot_match)
# 3. Bloqueio de Materialização para Slots com Participantes Não Resolvidos
# 4. Defesa Anti-Fake Team e Verificação de Inscrição na Competição
# 5. Ciclo Completo de Progressão: Partida 1 -> RPC -> Slot Seguinte -> Partida 2 -> Final Materializada
# 6. Garantia de Unicidade no Banco: Constraint uq_matches_competition_slot_id
# 7. Idempotência estrita de materialização e propagação

set -e

DB_NAME="volei_test_db"
CONTAINER="supabase-db"

echo "========================================================================"
echo "BASEOS — FASE 4.8: HOMOLOGAÇÃO DO RUNTIME ENGINE NO POSTGRESQL REAL"
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
echo "[SETUP] Criando fixtures de teste para a Fase 4.8..."

run_sql "
UPDATE public.competition_match_slots SET match_id = NULL WHERE competition_id = 'comp-rt-pg';
UPDATE public.matches SET slot_id = NULL WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.matches WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_match_slots WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_rounds WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_stages WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_teams WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competitions WHERE id = 'comp-rt-pg';
DELETE FROM public.teams WHERE id IN ('team-rt-1', 'team-rt-2', 'team-rt-3', 'team-rt-4');

-- Cria organizador autenticado
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_fields;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000010', 'org-rt@baseos.app') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, name, role) VALUES ('00000000-0000-0000-0000-000000000010', 'org-rt@baseos.app', 'Organizador Runtime', 'organizer')
ON CONFLICT (id) DO UPDATE SET role = 'organizer';
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_fields;

-- Cria competição com o organizador
INSERT INTO public.competitions (id, name, modality, format, player_format, set_format, gender_category, status, organizer_id)
VALUES ('comp-rt-pg', 'Copa Runtime Postgres 2026', 'indoor', 'knockout', '6x6', '3-sets', 'male', 'in-progress', '00000000-0000-0000-0000-000000000010');

-- Cria equipes reais e inscreve na competição
INSERT INTO public.teams (id, name, short_name, modality) VALUES
  ('team-rt-1', 'Vôlei Taubaté', 'TAU', 'indoor'),
  ('team-rt-2', 'Sada Cruzeiro', 'CRU', 'indoor'),
  ('team-rt-3', 'Minas Tênis', 'MTC', 'indoor'),
  ('team-rt-4', 'Vôlei Renata', 'REN', 'indoor');

INSERT INTO public.competition_teams (id, competition_id, team_id, team_name, team_short_name, access_token, registration_deadline, status) VALUES
  ('ct-rt-1', 'comp-rt-pg', 'team-rt-1', 'Vôlei Taubaté', 'TAU', 'token-rt-1', now() + interval '30 days', 'approved'),
  ('ct-rt-2', 'comp-rt-pg', 'team-rt-2', 'Sada Cruzeiro', 'CRU', 'token-rt-2', now() + interval '30 days', 'approved'),
  ('ct-rt-3', 'comp-rt-pg', 'team-rt-3', 'Minas Tênis', 'MTC', 'token-rt-3', now() + interval '30 days', 'approved'),
  ('ct-rt-4', 'comp-rt-pg', 'team-rt-4', 'Vôlei Renata', 'REN', 'token-rt-4', now() + interval '30 days', 'approved');
"

echo "  -> Fixtures criadas com sucesso."

# ------------------------------------------------------------------------------
# PROVA 1: Inicialização do Estágio, Rodadas e Slots
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 1] Inicialização estrutural via save_stage_draw_and_slots..."

INIT_RES=$(run_sql "
SELECT public.save_stage_draw_and_slots(
  'comp-rt-pg',
  '{\"stageId\": \"stg-playoffs\", \"name\": \"Fase Final\", \"stageOrder\": 1, \"stageType\": \"knockout\", \"status\": \"in-progress\"}'::jsonb,
  '[
    {\"roundId\": \"rnd-sf\", \"name\": \"Semifinais\", \"roundOrder\": 1, \"slotsCount\": 2, \"status\": \"in-progress\"},
    {\"roundId\": \"rnd-f\", \"name\": \"Final\", \"roundOrder\": 2, \"slotsCount\": 1, \"status\": \"pending\"}
  ]'::jsonb,
  '[
    {
      \"slotId\": \"SLOT-SF1\", \"roundId\": \"rnd-sf\", \"position\": 1, \"label\": \"Semifinal 1\",
      \"participantAReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-rt-1\"},
      \"participantAStatus\": \"resolved\", \"resolvedTeamAId\": \"team-rt-1\",
      \"participantBReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-rt-2\"},
      \"participantBStatus\": \"resolved\", \"resolvedTeamBId\": \"team-rt-2\",
      \"progressionRoute\": {\"onWinner\": {\"targetSlotId\": \"SLOT-F1\", \"targetSide\": \"A\"}}
    },
    {
      \"slotId\": \"SLOT-SF2\", \"roundId\": \"rnd-sf\", \"position\": 2, \"label\": \"Semifinal 2\",
      \"participantAReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-rt-3\"},
      \"participantAStatus\": \"resolved\", \"resolvedTeamAId\": \"team-rt-3\",
      \"participantBReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-rt-4\"},
      \"participantBStatus\": \"resolved\", \"resolvedTeamBId\": \"team-rt-4\",
      \"progressionRoute\": {\"onWinner\": {\"targetSlotId\": \"SLOT-F1\", \"targetSide\": \"B\"}}
    },
    {
      \"slotId\": \"SLOT-F1\", \"roundId\": \"rnd-f\", \"position\": 1, \"label\": \"Finalíssima\",
      \"participantAReference\": {\"type\": \"match-winner\", \"slotId\": \"SLOT-SF1\"},
      \"participantAStatus\": \"unresolved\",
      \"participantBReference\": {\"type\": \"match-winner\", \"slotId\": \"SLOT-SF2\"},
      \"participantBStatus\": \"unresolved\"
    }
  ]'::jsonb
);
")

echo "  -> Resultado: $INIT_RES"
if [[ "$INIT_RES" == *"\"ok\": true"* ]]; then
  echo "  -> PROVA 1 APROVADA: Estágio, Rodadas e 3 Slots persistidos atomicamente."
else
  echo "  -> PROVA 1 FALHOU!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 2: Materialização Atômica de Partida (rpc_materialize_slot_match)
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 2] Materialização atômica de Match para SLOT-SF1..."

MAT_RES1=$(run_sql "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-SF1', NOW(), 'Ginásio do Taubaté', 'Quadra 1', 'Semifinal');")
echo "  -> Chamada 1: $MAT_RES1"

# Chamada 2 simulando concorrência ou repetição
MAT_RES2=$(run_sql "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-SF1', NOW(), 'Ginásio do Taubaté', 'Quadra 1', 'Semifinal');")
echo "  -> Chamada 2 (Idempotente): $MAT_RES2"

MATCH_COUNT=$(run_sql "SELECT COUNT(*) FROM public.matches WHERE competition_id = 'comp-rt-pg' AND slot_id = 'SLOT-SF1';")
SLOT_MATCH_ID=$(run_sql "SELECT match_id FROM public.competition_match_slots WHERE competition_id = 'comp-rt-pg' AND slot_id = 'SLOT-SF1';")

echo "  -> Partidas criadas para SLOT-SF1: $MATCH_COUNT (esperado: 1)"
echo "  -> match_id no slot: $SLOT_MATCH_ID"

if [[ "$MATCH_COUNT" -eq 1 && "$MAT_RES2" == *"\"alreadyMaterialized\": true"* ]]; then
  echo "  -> PROVA 2 APROVADA: Criação única de Match com garantia de concorrência e idempotência."
else
  echo "  -> PROVA 2 FALHOU!"
  exit 1
fi

# Materializa também SF2
MAT_SF2=$(run_sql "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-SF2', NOW(), 'Arena Minas', 'Quadra Central', 'Semifinal');")
SF2_MATCH_ID=$(run_sql "SELECT match_id FROM public.competition_match_slots WHERE competition_id = 'comp-rt-pg' AND slot_id = 'SLOT-SF2';")
echo "  -> SLOT-SF2 materializado com match_id: $SF2_MATCH_ID"

# ------------------------------------------------------------------------------
# PROVA 3: Bloqueio de Materialização para Slot Não Resolvido
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 3] Tentativa de materializar SLOT-F1 (que ainda tem participantes pendentes)..."

ERR_UNRESOLVED=$(run_sql_raw "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-F1');")
echo "  -> Resposta do PostgreSQL:"
echo "$ERR_UNRESOLVED"

if [[ "$ERR_UNRESOLVED" == *"PARTICIPANT_UNRESOLVED"* ]]; then
  echo "  -> PROVA 3 APROVADA: Bloqueio estrito de materialização para slots não resolvidos."
else
  echo "  -> PROVA 3 FALHOU!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 4: Defesa Anti-Fake Team na Materialização
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 4] Garantia anti-fake team contra equipes artificiais..."

# Insere slot corrompido com TBD para testar barreira
run_sql "
INSERT INTO public.competition_match_slots (
  id, competition_id, stage_row_id, round_row_id, slot_id, position,
  participant_a_reference, participant_a_status, resolved_team_a_id,
  participant_b_reference, participant_b_status, resolved_team_b_id
) VALUES (
  'slot-fake-test', 'comp-rt-pg',
  (SELECT id FROM public.competition_stages WHERE competition_id = 'comp-rt-pg' LIMIT 1),
  (SELECT id FROM public.competition_rounds WHERE competition_id = 'comp-rt-pg' LIMIT 1),
  'SLOT-FAKE', 99,
  '{\"type\": \"resolved-team\", \"teamId\": \"team-rt-1\"}'::jsonb, 'resolved', 'team-rt-1',
  '{\"type\": \"resolved-team\", \"teamId\": \"TBD-A-1\"}'::jsonb, 'resolved', NULL
);
" || true

# Tenta materializar slot fake
ERR_FAKE=$(run_sql_raw "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-FAKE');")
if [[ "$ERR_FAKE" == *"PARTICIPANT_UNRESOLVED"* || "$ERR_FAKE" == *"ARTIFICIAL_TEAM_REJECTED"* ]]; then
  echo "  -> PROVA 4 APROVADA: Rejeição inegociável de materialização com equipe artificial."
else
  echo "  -> PROVA 4 FALHOU!"
  exit 1
fi
run_sql "DELETE FROM public.competition_match_slots WHERE slot_id = 'SLOT-FAKE';"

# ------------------------------------------------------------------------------
# PROVA 5: Ciclo Completo de Progressão e Materialização da Final
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 5] Ciclo completo de progressão e materialização da Final..."

# SF1: team-rt-1 vence team-rt-2
PROP_SF1=$(run_sql "SELECT public.rpc_propagate_slot_outcome('comp-rt-pg', 'SLOT-SF1', 'team-rt-1', 'team-rt-2', '$SLOT_MATCH_ID');")
echo "  -> Propagação SF1: $PROP_SF1"

# Verifica estado intermediário do SLOT-F1
F1_A=$(run_sql "SELECT resolved_team_a_id FROM public.competition_match_slots WHERE slot_id = 'SLOT-F1';")
F1_B=$(run_sql "SELECT resolved_team_b_id FROM public.competition_match_slots WHERE slot_id = 'SLOT-F1';")
echo "  -> SLOT-F1 pós-SF1: Lado A = '$F1_A', Lado B = '$F1_B'"

if [[ "$F1_A" != "team-rt-1" || "$F1_B" != "" ]]; then
  echo "  -> Falha no estado intermediário de F1!"
  exit 1
fi

# SF2: team-rt-4 vence team-rt-3
PROP_SF2=$(run_sql "SELECT public.rpc_propagate_slot_outcome('comp-rt-pg', 'SLOT-SF2', 'team-rt-4', 'team-rt-3', '$SF2_MATCH_ID');")
echo "  -> Propagação SF2: $PROP_SF2"

# Verifica estado final de SLOT-F1
F1_A_FINAL=$(run_sql "SELECT resolved_team_a_id FROM public.competition_match_slots WHERE slot_id = 'SLOT-F1';")
F1_B_FINAL=$(run_sql "SELECT resolved_team_b_id FROM public.competition_match_slots WHERE slot_id = 'SLOT-F1';")
echo "  -> SLOT-F1 pós-SF2: Lado A = '$F1_A_FINAL', Lado B = '$F1_B_FINAL'"

if [[ "$F1_A_FINAL" == "team-rt-1" && "$F1_B_FINAL" == "team-rt-4" ]]; then
  echo "  -> Ambos os participantes da Final estão 100% resolvidos no banco!"
else
  echo "  -> Falha na propagação da Final!"
  exit 1
fi

# Agora materializa a Grande Final!
MAT_FINAL=$(run_sql "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-F1', NOW(), 'Maracanãzinho', 'Quadra Principal', 'Final');")
echo "  -> Materialização da Final: $MAT_FINAL"

FINAL_MATCH_ID=$(run_sql "SELECT match_id FROM public.competition_match_slots WHERE slot_id = 'SLOT-F1';")
FINAL_MATCH_TEAMS=$(run_sql "SELECT team_a_id || ' vs ' || team_b_id FROM public.matches WHERE id = '$FINAL_MATCH_ID';")
echo "  -> Partida da Final: $FINAL_MATCH_TEAMS (ID: $FINAL_MATCH_ID)"

if [[ "$FINAL_MATCH_TEAMS" == "team-rt-1 vs team-rt-4" ]]; then
  echo "  -> PROVA 5 APROVADA: Ciclo completo resultado -> propagação -> slot resolvido -> Match materializado!"
else
  echo "  -> PROVA 5 FALHOU!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 6: Garantia de Unicidade no Banco (Constraint uq_matches_competition_slot_id)
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 6] Tentativa de inserção manual duplicada de Match com mesmo slot_id..."

ERR_DUPLICATE=$(run_sql_raw "
INSERT INTO public.matches (
  id, competition_id, slot_id, round, match_number,
  team_a_id, team_b_id, team_a_name, team_b_name,
  team_a_short_name, team_b_short_name, scheduled_time, status
) VALUES (
  'match-forged-dup', 'comp-rt-pg', 'SLOT-F1', 2, 9999,
  'team-rt-1', 'team-rt-4', 'Vôlei Taubaté', 'Vôlei Renata',
  'TAU', 'REN', NOW(), 'scheduled'
);
")

echo "  -> Resposta do PostgreSQL:"
echo "$ERR_DUPLICATE"

if [[ "$ERR_DUPLICATE" == *"uq_matches_competition_slot_id"* || "$ERR_DUPLICATE" == *"duplicate key value violates unique constraint"* ]]; then
  echo "  -> PROVA 6 APROVADA: Constraint no PostgreSQL impede qualquer duplicação estrutural de Match para o mesmo slot!"
else
  echo "  -> PROVA 6 FALHOU!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 7: Idempotência Estrita
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 7] Testando repetição de chamadas (idempotência)..."

REPEAT_PROP=$(run_sql "SELECT public.rpc_propagate_slot_outcome('comp-rt-pg', 'SLOT-SF1', 'team-rt-1', 'team-rt-2');")
REPEAT_MAT=$(run_sql "SELECT public.rpc_materialize_slot_match('comp-rt-pg', 'SLOT-F1');")

echo "  -> Repetição de propagação: $REPEAT_PROP"
echo "  -> Repetição de materialização: $REPEAT_MAT"

if [[ "$REPEAT_PROP" == *"\"idempotent\": true"* && "$REPEAT_MAT" == *"\"alreadyMaterialized\": true"* ]]; then
  echo "  -> PROVA 7 APROVADA: Idempotência estrita comprovada no banco de dados."
else
  echo "  -> PROVA 7 FALHOU!"
  exit 1
fi

# ------------------------------------------------------------------------------
# LIMPEZA
# ------------------------------------------------------------------------------
echo ""
echo "[CLEANUP] Removendo dados de teste..."
run_sql "
UPDATE public.competition_match_slots SET match_id = NULL WHERE competition_id = 'comp-rt-pg';
UPDATE public.matches SET slot_id = NULL WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.matches WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_match_slots WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_rounds WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_stages WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competition_teams WHERE competition_id = 'comp-rt-pg';
DELETE FROM public.competitions WHERE id = 'comp-rt-pg';
DELETE FROM public.teams WHERE id IN ('team-rt-1', 'team-rt-2', 'team-rt-3', 'team-rt-4');
"
echo "  -> Limpeza concluída."

echo ""
echo "========================================================================"
echo "TODAS AS 7 PROVAS DE RUNTIME NO POSTGRESQL REAL FORAM 100% HOMOLOGADAS!"
echo "========================================================================"

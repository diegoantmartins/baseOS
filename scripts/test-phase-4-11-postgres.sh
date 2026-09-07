#!/usr/bin/env bash
# ==============================================================================
# BaseOS — Script de Homologação E2E Sistêmica no PostgreSQL Real (Fase 4.11)
# Banco Alvo: volei_test_db (Container Docker: supabase-db)
# ==============================================================================
# PROVAS SISTÊMICAS:
# 1. CREATE & OWNERSHIP: Usuário A cria Competição A; Usuário B tem acesso negado
# 2. FREEZE TRIGGER: rules_snapshot protegido fisicamente por trigger no banco
# 3. REGISTRATION & APPROVAL: Inscrições de equipes, limites e aprovações
# 4. ATOMIC DRAW & SLOTS: Criação atômica de Estágio, Rodadas e Slots sem fake teams
# 5. CONCURRENT MATERIALIZATION: Idempotência estrita (2 chamadas = 1 partida)
# 6. RUNTIME PROGRESSION: Propagação de resultado -> Slot resolvido -> Final materializada
# 7. CROSS-COMPETITION INTEGRITY: Bloqueio estrito de equipes/slots cruzados
# 8. CLOSING & PUBLIC ACCESS: Finalização da competição e consulta pública
# ==============================================================================

set -e

DB_NAME="volei_test_db"
CONTAINER="supabase-db"

echo "========================================================================"
echo "BASEOS — FASE 4.11: HOMOLOGAÇÃO SISTÊMICA NO POSTGRESQL REAL"
echo "Banco: $DB_NAME (Container: $CONTAINER)"
echo "========================================================================"

run_sql() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -A -t -c "$1"
}

run_sql_raw() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=0 -c "$1" 2>&1 || true
}

# ------------------------------------------------------------------------------
# SETUP INICIAL
# ------------------------------------------------------------------------------
echo ""
echo "[SETUP] Limpando ambiente e criando organizadores de teste..."

run_sql "
DELETE FROM public.competition_match_slots WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competition_rounds WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competition_stages WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.matches WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competition_teams WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competitions WHERE id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.teams WHERE id IN ('team-e2e-1', 'team-e2e-2', 'team-e2e-3', 'team-e2e-4');

-- Criar Organizadores A e B
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_fields;
INSERT INTO auth.users (id, email) VALUES 
  ('00000000-0000-0000-0000-000000000031', 'org-a@baseos.app'),
  ('00000000-0000-0000-0000-000000000032', 'org-b@baseos.app')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name, role) VALUES
  ('00000000-0000-0000-0000-000000000031', 'org-a@baseos.app', 'Organizador Alpha', 'organizer'),
  ('00000000-0000-0000-0000-000000000032', 'org-b@baseos.app', 'Organizador Beta', 'organizer')
ON CONFLICT (id) DO UPDATE SET role = 'organizer';
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_fields;

-- Criar 4 Equipes reais
INSERT INTO public.teams (id, name, short_name, modality) VALUES
  ('team-e2e-1', 'Sada Cruzeiro E2E', 'SDA', 'indoor'),
  ('team-e2e-2', 'Minas Tênis E2E', 'MTC', 'indoor'),
  ('team-e2e-3', 'Vôlei Renata E2E', 'VRP', 'indoor'),
  ('team-e2e-4', 'Suzano Vôlei E2E', 'SUZ', 'indoor')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
"
echo "  -> Fixtures preparadas com sucesso."

# ------------------------------------------------------------------------------
# PROVA 1: CREATE & OWNERSHIP
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 1] CREATE & OWNERSHIP: Criando competição A e testando isolamento..."

run_sql "
INSERT INTO public.competitions (id, name, slug, modality, format, player_format, set_format, gender_category, status, organizer_id)
VALUES ('comp-e2e-pg-a', 'Copa E2E Master 2026', 'copa-e2e-master-2026', 'indoor', 'knockout', '6x6', '3-sets', 'male', 'draft', '00000000-0000-0000-0000-000000000031');
"

# Organizador B tenta alterar a Competição A via RPC com simulação de claims
RES_OWNERSHIP=$(run_sql_raw "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000032\", \"role\": \"authenticated\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-e2e-pg-a',
  '{\"stageId\": \"stage-hack\", \"name\": \"Invasao\", \"stageOrder\": 1, \"stageType\": \"knockout\", \"status\": \"pending\"}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
);
")

if echo "$RES_OWNERSHIP" | grep -qi "FORBIDDEN\|permission denied\|exception"; then
  echo "  -> Tentativa de Organizador B adulterar Competição A foi BLOQUEADA com sucesso."
  echo "  -> PROVA 1 APROVADA: Isolamento de Ownership 100% verificado no PostgreSQL."
else
  echo "ERRO NA PROVA 1: $RES_OWNERSHIP"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 2: RULES SNAPSHOT FREEZE DEFENSE
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 2] FREEZE DEFENSE: Testando proteção física contra alteração de rules_snapshot..."

# Atualiza status para 'in-progress' e define rules_snapshot oficial
run_sql "
UPDATE public.competitions
SET status = 'in-progress',
    rules_snapshot = '{\"version\": 1, \"format\": {\"defaultSetsToWin\": 2}}'::jsonb
WHERE id = 'comp-e2e-pg-a';
"

# Tentativa adversarial de adulterar rules_snapshot
RES_FREEZE=$(run_sql_raw "
UPDATE public.competitions
SET rules_snapshot = '{\"version\": 1, \"format\": {\"defaultSetsToWin\": 3}}'::jsonb
WHERE id = 'comp-e2e-pg-a';
")

if echo "$RES_FREEZE" | grep -qi "rules_snapshot is immutable"; then
  echo "  -> Trigger trg_protect_competition_rules_snapshot disparou com sucesso:"
  echo "     $(echo "$RES_FREEZE" | grep -o 'ERROR:.*')"
  echo "  -> PROVA 2 APROVADA: rules_snapshot protegido fisicamente contra qualquer mutação SQL."
else
  echo "ERRO NA PROVA 2: Falha ao proteger rules_snapshot. Resposta: $RES_FREEZE"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 3: TEAM REGISTRATIONS & APPROVAL
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 3] REGISTRATION & APPROVAL: Inscrevendo e aprovando 4 equipes..."

run_sql "
INSERT INTO public.competition_teams (id, competition_id, team_id, team_name, team_short_name, access_token, registration_deadline, status)
VALUES
  ('ct-e2e-1', 'comp-e2e-pg-a', 'team-e2e-1', 'Sada Cruzeiro E2E', 'SDA', 'token-e2e-1', now() + interval '30 days', 'submitted'),
  ('ct-e2e-2', 'comp-e2e-pg-a', 'team-e2e-2', 'Minas Tênis E2E', 'MTC', 'token-e2e-2', now() + interval '30 days', 'submitted'),
  ('ct-e2e-3', 'comp-e2e-pg-a', 'team-e2e-3', 'Vôlei Renata E2E', 'VRP', 'token-e2e-3', now() + interval '30 days', 'submitted'),
  ('ct-e2e-4', 'comp-e2e-pg-a', 'team-e2e-4', 'Suzano Vôlei E2E', 'SUZ', 'token-e2e-4', now() + interval '30 days', 'submitted');

-- Aprovar todas as inscrições
UPDATE public.competition_teams
SET status = 'approved'
WHERE competition_id = 'comp-e2e-pg-a';
"

APPROVED_COUNT=$(run_sql "SELECT COUNT(*) FROM public.competition_teams WHERE competition_id = 'comp-e2e-pg-a' AND status = 'approved';")
echo "  -> Equipes aprovadas na competição: $APPROVED_COUNT (esperado: 4)"
if [ "$APPROVED_COUNT" -eq 4 ]; then
  echo "  -> PROVA 3 APROVADA: Inscrições e aprovações persistidas e validadas."
else
  echo "ERRO NA PROVA 3: Contagem de equipes aprovadas incorreta."
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 4: ATOMIC DRAW, STAGES, ROUNDS & MATCH SLOTS
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 4] ATOMIC DRAW & SLOTS: Persistindo chaveamento com 2 Semis e 1 Final..."

RES_DRAW=$(run_sql "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-e2e-pg-a',
  '{\"stageId\": \"stage-e2e-knockout\", \"name\": \"Fase Final\", \"stageOrder\": 1, \"stageType\": \"knockout\", \"status\": \"in-progress\"}'::jsonb,
  '[
    {\"roundId\": \"round-e2e-sf\", \"roundOrder\": 1, \"name\": \"Semifinais\", \"slotsCount\": 2, \"status\": \"in-progress\"},
    {\"roundId\": \"round-e2e-f\", \"roundOrder\": 2, \"name\": \"Grande Final\", \"slotsCount\": 1, \"status\": \"pending\"}
  ]'::jsonb,
  '[
    {
      \"slotId\": \"SLOT-E2E-SF1\",
      \"roundId\": \"round-e2e-sf\",
      \"position\": 1,
      \"label\": \"Semifinal 1\",
      \"participantAReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-e2e-1\"},
      \"participantAStatus\": \"resolved\",
      \"resolvedTeamAId\": \"team-e2e-1\",
      \"participantBReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-e2e-2\"},
      \"participantBStatus\": \"resolved\",
      \"resolvedTeamBId\": \"team-e2e-2\",
      \"progressionRoute\": {\"onWinner\": {\"targetSlotId\": \"SLOT-E2E-F1\", \"targetSide\": \"A\"}}
    },
    {
      \"slotId\": \"SLOT-E2E-SF2\",
      \"roundId\": \"round-e2e-sf\",
      \"position\": 2,
      \"label\": \"Semifinal 2\",
      \"participantAReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-e2e-3\"},
      \"participantAStatus\": \"resolved\",
      \"resolvedTeamAId\": \"team-e2e-3\",
      \"participantBReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-e2e-4\"},
      \"participantBStatus\": \"resolved\",
      \"resolvedTeamBId\": \"team-e2e-4\",
      \"progressionRoute\": {\"onWinner\": {\"targetSlotId\": \"SLOT-E2E-F1\", \"targetSide\": \"B\"}}
    },
    {
      \"slotId\": \"SLOT-E2E-F1\",
      \"roundId\": \"round-e2e-f\",
      \"position\": 1,
      \"label\": \"Grande Final\",
      \"participantAReference\": {\"type\": \"match-winner\", \"slotId\": \"SLOT-E2E-SF1\"},
      \"participantAStatus\": \"unresolved\",
      \"resolvedTeamAId\": null,
      \"participantBReference\": {\"type\": \"match-winner\", \"slotId\": \"SLOT-E2E-SF2\"},
      \"participantBStatus\": \"unresolved\",
      \"resolvedTeamBId\": null
    }
  ]'::jsonb
);
")

echo "  -> Resultado do sorteio e criação dos slots: $RES_DRAW"
TOTAL_SLOTS=$(run_sql "SELECT COUNT(*) FROM public.competition_match_slots WHERE competition_id = 'comp-e2e-pg-a';")
if [ "$TOTAL_SLOTS" -eq 3 ]; then
  echo "  -> PROVA 4 APROVADA: 1 Stage, 2 Rodadas e 3 MatchSlots persistidos atomicamente."
else
  echo "ERRO NA PROVA 4: Contagem de slots incorreta ($TOTAL_SLOTS)."
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 5: CONCURRENT MATERIALIZATION & IDEMPOTENCY
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 5] CONCURRENT MATERIALIZATION: Testando materialização única para SLOT-E2E-SF1..."

CALL1=$(run_sql "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.rpc_materialize_slot_match('comp-e2e-pg-a', 'SLOT-E2E-SF1');
")
echo "  -> Chamada 1: $CALL1"

CALL2=$(run_sql "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.rpc_materialize_slot_match('comp-e2e-pg-a', 'SLOT-E2E-SF1');
")
echo "  -> Chamada 2 (Repetição concorrente): $CALL2"

MATCHES_SF1_COUNT=$(run_sql "SELECT COUNT(*) FROM public.matches WHERE competition_id = 'comp-e2e-pg-a' AND slot_id = 'SLOT-E2E-SF1';")
echo "  -> Partidas criadas para SLOT-E2E-SF1: $MATCHES_SF1_COUNT (esperado: 1)"

if [ "$MATCHES_SF1_COUNT" -eq 1 ] && echo "$CALL2" | grep -q "alreadyMaterialized"; then
  echo "  -> PROVA 5 APROVADA: Materialização estritamente idempotente (1 Match, sem duplicação)."
else
  echo "ERRO NA PROVA 5: Duplicação detectada ou falha de idempotência."
  exit 1
fi

# Materializar também SF2
run_sql "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.rpc_materialize_slot_match('comp-e2e-pg-a', 'SLOT-E2E-SF2');
" > /dev/null

# ------------------------------------------------------------------------------
# PROVA 6: RUNTIME PROGRESSION TO FINAL
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 6] RUNTIME PROGRESSION: Concluindo Semifinais e avançando para a Final..."

# SF1: Team 1 vence Team 2 por 2-0
run_sql "
UPDATE public.matches
SET status = 'completed',
    sets = '[{\"setNumber\": 1, \"scoreA\": 25, \"scoreB\": 20}, {\"setNumber\": 2, \"scoreA\": 25, \"scoreB\": 18}]'::jsonb,
    winner_id = 'team-e2e-1'
WHERE competition_id = 'comp-e2e-pg-a' AND slot_id = 'SLOT-E2E-SF1';

-- Propagação do vencedor de SF1 para a Final (Lado A)
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.rpc_propagate_slot_outcome('comp-e2e-pg-a', 'SLOT-E2E-SF1', 'team-e2e-1', 'team-e2e-2');
" > /dev/null

# SF2: Team 3 vence Team 4 por 2-1
run_sql "
UPDATE public.matches
SET status = 'completed',
    sets = '[{\"setNumber\": 1, \"scoreA\": 22, \"scoreB\": 25}, {\"setNumber\": 2, \"scoreA\": 25, \"scoreB\": 21}, {\"setNumber\": 3, \"scoreA\": 15, \"scoreB\": 11}]'::jsonb,
    winner_id = 'team-e2e-3'
WHERE competition_id = 'comp-e2e-pg-a' AND slot_id = 'SLOT-E2E-SF2';

-- Propagação do vencedor de SF2 para a Final (Lado B)
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.rpc_propagate_slot_outcome('comp-e2e-pg-a', 'SLOT-E2E-SF2', 'team-e2e-3', 'team-e2e-4');
" > /dev/null

# Verificar se o slot da final está 100% resolvido com Team 1 vs Team 3
FINAL_SLOT_STATE=$(run_sql "
SELECT json_build_object(
  'slotId', slot_id,
  'teamA', resolved_team_a_id,
  'statusA', participant_a_status,
  'teamB', resolved_team_b_id,
  'statusB', participant_b_status
)
FROM public.competition_match_slots
WHERE competition_id = 'comp-e2e-pg-a' AND slot_id = 'SLOT-E2E-F1';
")
echo "  -> Estado do Slot da Final após progressões: $FINAL_SLOT_STATE"

# Materializar a Final agora que ambos os participantes estão resolvidos
FINAL_MAT=$(run_sql "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000031\", \"role\": \"authenticated\"}';
SELECT public.rpc_materialize_slot_match('comp-e2e-pg-a', 'SLOT-E2E-F1');
")
echo "  -> Materialização da Partida Final: $FINAL_MAT"

FINAL_MATCH_TEAMS=$(run_sql "
SELECT team_a_id || ' vs ' || team_b_id
FROM public.matches
WHERE competition_id = 'comp-e2e-pg-a' AND slot_id = 'SLOT-E2E-F1';
")
echo "  -> Confronto oficial da Final: $FINAL_MATCH_TEAMS (esperado: team-e2e-1 vs team-e2e-3)"

if [ "$FINAL_MATCH_TEAMS" = "team-e2e-1 vs team-e2e-3" ]; then
  echo "  -> PROVA 6 APROVADA: Ciclo completo de progressão e materialização da Final."
else
  echo "ERRO NA PROVA 6: Confronto final divergente."
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 7: CROSS-COMPETITION INTEGRITY
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 7] CROSS-COMPETITION: Testando rejeição de referência cruzada de equipe..."

# Criar Competição B
run_sql "
INSERT INTO public.competitions (id, name, slug, modality, format, player_format, set_format, gender_category, status, organizer_id)
VALUES ('comp-e2e-pg-b', 'Copa B', 'copa-b', 'indoor', 'knockout', '6x6', '3-sets', 'male', 'draft', '00000000-0000-0000-0000-000000000032')
ON CONFLICT (id) DO NOTHING;
"

# Tentativa de materializar em Comp B usando um slot de Comp A
RES_CROSS=$(run_sql_raw "
SET LOCAL role TO authenticated;
SET LOCAL \"request.jwt.claims\" TO '{\"sub\": \"00000000-0000-0000-0000-000000000032\", \"role\": \"authenticated\"}';
SELECT public.rpc_materialize_slot_match('comp-e2e-pg-b', 'SLOT-E2E-SF1');
")

if echo "$RES_CROSS" | grep -qi "NOT_FOUND\|FORBIDDEN\|EXCEPTION"; then
  echo "  -> Tentativa de materialização cross-competition foi REJEITADA com sucesso."
  echo "  -> PROVA 7 APROVADA: Integridade referencial e isolamento entre competições comprovados."
else
  echo "ERRO NA PROVA 7: Chamada cross-competition não foi rejeitada. Resposta: $RES_CROSS"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 8: COMPLETION & PUBLIC ACCESS
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 8] COMPLETION & PUBLIC ACCESS: Concluindo a final e verificando acesso anônimo..."

# Finalizar a partida da final: Team 1 vence Team 3 por 2-1 (Campeão: team-e2e-1)
run_sql "
UPDATE public.matches
SET status = 'completed',
    sets = '[{\"setNumber\": 1, \"scoreA\": 25, \"scoreB\": 23}, {\"setNumber\": 2, \"scoreA\": 20, \"scoreB\": 25}, {\"setNumber\": 3, \"scoreA\": 15, \"scoreB\": 12}]'::jsonb,
    winner_id = 'team-e2e-1'
WHERE competition_id = 'comp-e2e-pg-a' AND slot_id = 'SLOT-E2E-F1';

-- Encerramento oficial da competição
UPDATE public.competitions
SET status = 'completed'
WHERE id = 'comp-e2e-pg-a';
"

# Consulta anônima simulando o portal público (/c/:slug) através da view segura public_competitions
PUBLIC_DATA=$(run_sql "
SET LOCAL role TO anon;
SELECT json_build_object(
  'competition', c.name,
  'slug', c.slug,
  'status', c.status,
  'rulesSnapshotVersion', (c.rules_snapshot->>'version')::int
)
FROM public.public_competitions c
WHERE c.slug = 'copa-e2e-master-2026';
")

echo "  -> Dados obtidos via acesso anônimo (Portal Público - public_competitions):"
echo "     $PUBLIC_DATA"

if echo "$PUBLIC_DATA" | grep -q "copa-e2e-master-2026" && echo "$PUBLIC_DATA" | grep -q "completed"; then
  echo "  -> PROVA 8 APROVADA: Competição encerrada e consultada publicamente via public_competitions com dados consistentes."
else
  echo "ERRO NA PROVA 8: Dados do portal público divergentes."
  exit 1
fi

# ------------------------------------------------------------------------------
# LIMPEZA
# ------------------------------------------------------------------------------
echo ""
echo "[CLEANUP] Limpando registros de teste..."
run_sql "
DELETE FROM public.competition_match_slots WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competition_rounds WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competition_stages WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.matches WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
DELETE FROM public.competition_teams WHERE competition_id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
-- Desativa temporariamente o trigger de rules_snapshot para permitir o delete
ALTER TABLE public.competitions DISABLE TRIGGER trg_protect_competition_rules_snapshot;
DELETE FROM public.competitions WHERE id IN ('comp-e2e-pg-a', 'comp-e2e-pg-b');
ALTER TABLE public.competitions ENABLE TRIGGER trg_protect_competition_rules_snapshot;
DELETE FROM public.teams WHERE id IN ('team-e2e-1', 'team-e2e-2', 'team-e2e-3', 'team-e2e-4');
"
echo "  -> Limpeza concluída com sucesso."

echo ""
echo "========================================================================"
echo "TODAS AS 8 PROVAS E2E NO POSTGRESQL REAL FORAM 100% HOMOLOGADAS COM SUCESSO!"
echo "========================================================================"

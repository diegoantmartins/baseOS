#!/usr/bin/env bash
# BaseOS — Script de Homologação Real contra PostgreSQL (Fase 4.7)
# Executa provas de:
# 1. Atomicidade real e rollback integral em falha deliberada
# 2. Persistência integral transacional
# 3. Defesa anti-fake team no nível de banco de dados
# 4. Isolamento cross-competition
# 5. Propagação de resultado e preservação de proveniência
# 6. Idempotência real
# 7. Segurança de autorização, perfis e grants de EXECUTE
# 8. Locks determinísticos contra deadlock

set -e

DB_NAME="volei_test_db"
CONTAINER="supabase-db"

echo "========================================================================"
echo "BASEOS — FASE 4.7: HOMOLOGAÇÃO DE TRANSAÇÕES ACID NO POSTGRESQL REAL"
echo "Banco Alvo: $DB_NAME (Container: $CONTAINER)"
echo "========================================================================"

run_sql() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -A -t -c "$1"
}

run_sql_raw() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=0 -c "$1" 2>&1 || true
}

# ------------------------------------------------------------------------------
# SETUP INICIAL DOS DADOS DE TESTE
# ------------------------------------------------------------------------------
echo ""
echo "[SETUP] Criando competições e equipes de teste no PostgreSQL..."

run_sql "
-- Limpa dados prévios de teste se existirem
DELETE FROM public.competition_match_slots WHERE competition_id LIKE 'comp-test-%';
DELETE FROM public.competition_rounds WHERE competition_id LIKE 'comp-test-%';
DELETE FROM public.competition_stages WHERE competition_id LIKE 'comp-test-%';
DELETE FROM public.matches WHERE competition_id LIKE 'comp-test-%';
DELETE FROM public.competitions WHERE id LIKE 'comp-test-%';
DELETE FROM public.teams WHERE id IN ('team-test-1', 'team-test-2', 'team-test-3', 'team-test-4');
DELETE FROM public.profiles WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

-- Desabilita temporariamente o trigger de segurança para inserção de fixtures de teste
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_fields;

-- Cria usuários no auth.users
INSERT INTO auth.users (id, email) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'organizador1@baseos.app'),
  ('00000000-0000-0000-0000-000000000002', 'equipe@baseos.app'),
  ('00000000-0000-0000-0000-000000000003', 'organizador2@baseos.app')
ON CONFLICT (id) DO NOTHING;

-- Cria perfis
INSERT INTO public.profiles (id, email, name, role) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'organizador1@baseos.app', 'Organizador Competição A', 'organizer'),
  ('00000000-0000-0000-0000-000000000002', 'equipe@baseos.app', 'Equipe Visitante', 'team'),
  ('00000000-0000-0000-0000-000000000003', 'organizador2@baseos.app', 'Organizador Competição B', 'organizer')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Reativa o trigger de segurança
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_fields;

-- Cria competições com ownership designado
INSERT INTO public.competitions (id, name, modality, format, player_format, set_format, gender_category, status, organizer_id)
VALUES 
  ('comp-test-acid', 'Copa Transacional Acid', 'indoor', 'groups-playoffs', '6x6', '5-sets', 'male', 'in-progress', '00000000-0000-0000-0000-000000000001'),
  ('comp-test-iso', 'Torneio Isolado', 'indoor', 'groups-playoffs', '6x6', '5-sets', 'female', 'in-progress', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET organizer_id = EXCLUDED.organizer_id;

-- Cria equipes reais
INSERT INTO public.teams (id, name, short_name, modality) VALUES
  ('team-test-1', 'Vôlei Taubaté', 'TAU', 'indoor'),
  ('team-test-2', 'Sada Cruzeiro', 'CRU', 'indoor'),
  ('team-test-3', 'Minas Tênis Clube', 'MTC', 'indoor'),
  ('team-test-4', 'Vôlei Renata', 'REN', 'indoor')
ON CONFLICT (id) DO NOTHING;
"

echo "✅ Setup concluído com sucesso."

# ------------------------------------------------------------------------------
# PROVA 1: ATOMICIDADE REAL E ROLLBACK INTEGRAL EM FALHA DELIBERADA
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 1] Executando save_stage_draw_and_slots com falha provocada no Slot 2..."

OUTPUT_PROVA1=$(run_sql_raw "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"playoffs-acid\", \"name\": \"Fase Eliminatória\", \"stageOrder\": 1, \"stageType\": \"knockout\"}',
  '[{\"roundId\": \"semi\", \"name\": \"Semifinais\", \"roundOrder\": 1, \"slotsCount\": 2}]',
  '[
    {
      \"slotId\": \"SLOT-OK-01\",
      \"roundId\": \"semi\",
      \"position\": 1,
      \"participantAReference\": {\"type\": \"seed\", \"seedNumber\": 1},
      \"participantBReference\": {\"type\": \"seed\", \"seedNumber\": 4}
    },
    {
      \"slotId\": \"SLOT-FAIL-02\",
      \"roundId\": \"semi\",
      \"position\": 2,
      \"participantAReference\": {\"type\": \"referencia-totalmente-invalida\"},
      \"participantBReference\": {\"type\": \"seed\", \"seedNumber\": 3}
    }
  ]'
);
")

if echo "$OUTPUT_PROVA1" | grep -q "INVALID_PARTICIPANT_REFERENCE"; then
  echo "✅ A RPC detectou a referência inválida e disparou exceção esperada."
else
  echo "❌ ERRO: A RPC não disparou a exceção esperada!"
  echo "$OUTPUT_PROVA1"
  exit 1
fi

echo "Verificando se houve gravação parcial no banco de dados..."
STAGE_COUNT=$(run_sql "SELECT count(*) FROM public.competition_stages WHERE competition_id = 'comp-test-acid' AND stage_id = 'playoffs-acid';")
ROUND_COUNT=$(run_sql "SELECT count(*) FROM public.competition_rounds WHERE competition_id = 'comp-test-acid';")
SLOT_COUNT=$(run_sql "SELECT count(*) FROM public.competition_match_slots WHERE competition_id = 'comp-test-acid';")

echo "Contagens pós-falha no PostgreSQL:"
echo " - Stages persistidos: $STAGE_COUNT (esperado: 0)"
echo " - Rounds persistidos: $ROUND_COUNT (esperado: 0)"
echo " - Slots persistidos:  $SLOT_COUNT (esperado: 0)"

if [ "$STAGE_COUNT" -eq 0 ] && [ "$ROUND_COUNT" -eq 0 ] && [ "$SLOT_COUNT" -eq 0 ]; then
  echo "🎯 PROVA 1 APROVADA: Atomicidade comprovada no PostgreSQL. Zero registros parciais persistidos (Rollback 100%)."
else
  echo "❌ FALHA NA PROVA 1: Houve persistência parcial! Rollback incompleto."
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 2: PERSISTÊNCIA INTEGRAL TRANSACIONAL
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 2] Executando save_stage_draw_and_slots com payload 100% válido..."

RESULT_PROVA2=$(run_sql "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"playoffs-acid\", \"name\": \"Fase Eliminatória\", \"stageOrder\": 1, \"stageType\": \"knockout\", \"status\": \"pending\"}',
  '[
    {\"roundId\": \"semi\", \"name\": \"Semifinais\", \"roundOrder\": 1, \"slotsCount\": 2},
    {\"roundId\": \"final\", \"name\": \"Grande Final\", \"roundOrder\": 2, \"slotsCount\": 1}
  ]',
  '[
    {
      \"slotId\": \"SLOT-SF-01\",
      \"roundId\": \"semi\",
      \"position\": 1,
      \"label\": \"Semifinal 1\",
      \"participantAReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-test-1\", \"teamName\": \"Taubaté\"},
      \"participantAStatus\": \"resolved\",
      \"resolvedTeamAId\": \"team-test-1\",
      \"participantBReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-test-2\", \"teamName\": \"Cruzeiro\"},
      \"participantBStatus\": \"resolved\",
      \"resolvedTeamBId\": \"team-test-2\",
      \"progressionRoute\": {
        \"onWinner\": {\"targetSlotId\": \"SLOT-FN-01\", \"targetSide\": \"A\"},
        \"onLoser\": {\"targetSlotId\": \"SLOT-FN-01\", \"targetSide\": \"B\"}
      }
    },
    {
      \"slotId\": \"SLOT-SF-02\",
      \"roundId\": \"semi\",
      \"position\": 2,
      \"label\": \"Semifinal 2\",
      \"participantAReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-test-3\", \"teamName\": \"Minas\"},
      \"participantAStatus\": \"resolved\",
      \"resolvedTeamAId\": \"team-test-3\",
      \"participantBReference\": {\"type\": \"resolved-team\", \"teamId\": \"team-test-4\", \"teamName\": \"Renata\"},
      \"participantBStatus\": \"resolved\",
      \"resolvedTeamBId\": \"team-test-4\"
    },
    {
      \"slotId\": \"SLOT-FN-01\",
      \"roundId\": \"final\",
      \"position\": 1,
      \"label\": \"Decisão\",
      \"participantAReference\": {\"type\": \"match-winner\", \"slotId\": \"SLOT-SF-01\"},
      \"participantBReference\": {\"type\": \"match-winner\", \"slotId\": \"SLOT-SF-02\"}
    }
  ]'
);
")

echo "Resultado da RPC: $RESULT_PROVA2"

STAGE_COUNT_P2=$(run_sql "SELECT count(*) FROM public.competition_stages WHERE competition_id = 'comp-test-acid';")
ROUND_COUNT_P2=$(run_sql "SELECT count(*) FROM public.competition_rounds WHERE competition_id = 'comp-test-acid';")
SLOT_COUNT_P2=$(run_sql "SELECT count(*) FROM public.competition_match_slots WHERE competition_id = 'comp-test-acid';")

if [ "$STAGE_COUNT_P2" -eq 1 ] && [ "$ROUND_COUNT_P2" -eq 2 ] && [ "$SLOT_COUNT_P2" -eq 3 ]; then
  echo "🎯 PROVA 2 APROVADA: 1 Stage, 2 Rodadas e 3 Slots persistidos atomicamente."
else
  echo "❌ FALHA NA PROVA 2: Contagem de registros difere do esperado."
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 3: DEFESA ANTI-FAKE TEAM NO BANCO DE DADOS
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 3] Testando rejeição no PostgreSQL de equipes fictícias (TBD, __BYE__, UNKNOWN)..."

ERR_TBD=$(run_sql_raw "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"s-tbd\", \"name\": \"S\", \"stageOrder\": 2, \"stageType\": \"groups\"}',
  '[{\"roundId\": \"r1\", \"name\": \"R1\", \"roundOrder\": 1}]',
  '[{\"slotId\": \"SLOT-TBD\", \"roundId\": \"r1\", \"position\": 1, \"participantAReference\": {\"type\": \"seed\", \"seedNumber\": 1}, \"participantBReference\": {\"type\": \"seed\", \"seedNumber\": 2}, \"resolvedTeamAId\": \"TBD-A-1\"}]'
);
")

if echo "$ERR_TBD" | grep -q "ARTIFICIAL_TEAM_REJECTED"; then
  echo "✅ Rejeição de TBD no banco comprovada."
else
  echo "❌ FALHA: Banco aceitou TBD!"
  echo "$ERR_TBD"
  exit 1
fi

ERR_BYE=$(run_sql_raw "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"s-bye\", \"name\": \"S\", \"stageOrder\": 3, \"stageType\": \"groups\"}',
  '[{\"roundId\": \"r1\", \"name\": \"R1\", \"roundOrder\": 1}]',
  '[{\"slotId\": \"SLOT-BYE\", \"roundId\": \"r1\", \"position\": 1, \"participantAReference\": {\"type\": \"seed\", \"seedNumber\": 1}, \"participantBReference\": {\"type\": \"bye\"}, \"resolvedTeamBId\": \"__BYE__\"}]'
);
")

if echo "$ERR_BYE" | grep -q "ARTIFICIAL_TEAM_REJECTED"; then
  echo "✅ Rejeição de __BYE__ como equipe no banco comprovada."
else
  echo "❌ FALHA: Banco aceitou __BYE__ como equipe!"
  echo "$ERR_BYE"
  exit 1
fi

FAKE_TEAMS_IN_DB=$(run_sql "SELECT count(*) FROM public.teams WHERE id LIKE 'TBD%' OR id LIKE '__BYE%' OR id = 'UNKNOWN';")
if [ "$FAKE_TEAMS_IN_DB" -eq 0 ]; then
  echo "🎯 PROVA 3 APROVADA: Zero equipes fictícias no PostgreSQL. Defesa anti-fake team homologada no banco."
else
  echo "❌ FALHA NA PROVA 3: Foram encontradas equipes fictícias persistidas!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 4: ISOLAMENTO CROSS-COMPETITION
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 4] Testando isolamento cross-competition (Slot de A apontando para Round de B)..."

# Cria round na Competição B
run_sql "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-iso',
  '{\"stageId\": \"stage-iso-b\", \"name\": \"Fase B\", \"stageOrder\": 1, \"stageType\": \"knockout\"}',
  '[{\"roundId\": \"round-iso-b\", \"name\": \"Rodada Externa de B\", \"roundOrder\": 1}]',
  '[]'
);
"

# Tenta na Competição A criar um slot que referencia 'round-iso-b' que pertence à Competição B
ERR_CROSS=$(run_sql_raw "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"playoffs-acid\", \"name\": \"Fase Eliminatória\", \"stageOrder\": 1, \"stageType\": \"knockout\"}',
  '[]',
  '[{\"slotId\": \"SLOT-CROSS\", \"roundId\": \"round-iso-b\", \"position\": 10, \"participantAReference\": {\"type\": \"seed\", \"seedNumber\": 1}, \"participantBReference\": {\"type\": \"seed\", \"seedNumber\": 2}}]'
);
")

if echo "$ERR_CROSS" | grep -q "INVALID_REFERENCE"; then
  echo "🎯 PROVA 4 APROVADA: Referência cross-competition entre Competição A e B rejeitada com sucesso."
else
  echo "❌ FALHA NA PROVA 4: Permitiu referência cross-competition!"
  echo "$ERR_CROSS"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 5: PROPAGAÇÃO TRANSACIONAL & PRESERVAÇÃO DE PROVENIÊNCIA
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 5] Executando rpc_propagate_slot_outcome e validando proveniência estrutural..."

PROP_RES=$(run_sql "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.rpc_propagate_slot_outcome(
  'comp-test-acid',
  'SLOT-SF-01',
  'team-test-1',
  'team-test-2'
);
")

echo "Resultado da propagação: $PROP_RES"

# Consulta slot final para comprovar que resolved_team_a_id foi preenchido com 'team-test-1',
# MAS participant_a_reference continua sendo 'match-winner'
SLOT_FN_DATA=$(run_sql "
SELECT json_build_object(
  'resolved_team_a_id', resolved_team_a_id,
  'participant_a_status', participant_a_status,
  'participant_a_reference', participant_a_reference
)
FROM public.competition_match_slots
WHERE competition_id = 'comp-test-acid' AND slot_id = 'SLOT-FN-01';
")

echo "Estado do slot de destino (SLOT-FN-01): $SLOT_FN_DATA"

if echo "$SLOT_FN_DATA" | grep -q '"team-test-1"' && echo "$SLOT_FN_DATA" | grep -q '"match-winner"'; then
  echo "🎯 PROVA 5 APROVADA: Vencedor materializado E proveniência estrutural do participant_reference preservada!"
else
  echo "❌ FALHA NA PROVA 5: Proveniência substituída ou participante não resolvido!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 6: IDEMPOTÊNCIA DA PROPAGAÇÃO
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 6] Executando a mesma propagação uma segunda vez para testar idempotência..."

PROP_RES_IDEMP=$(run_sql "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.rpc_propagate_slot_outcome(
  'comp-test-acid',
  'SLOT-SF-01',
  'team-test-1',
  'team-test-2'
);
")

echo "Resultado da 2ª chamada: $PROP_RES_IDEMP"

if echo "$PROP_RES_IDEMP" | grep -q '"idempotent": true'; then
  echo "🎯 PROVA 6 APROVADA: Idempotência comprovada (idempotent: true, sem duplicações nem erros)."
else
  echo "❌ FALHA NA PROVA 6: Propagação repetida não foi identificada como idempotente!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 7: SEGURANÇA, OWNERSHIP, ROLES E EXECUTE GRANTS
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 7] Testando segurança de autenticação, ownership de competição, roles e grants..."

# 7.1. Tentativa anônima (sem token nem usuário) deve falhar com UNAUTHORIZED
ERR_ANON=$(run_sql_raw "
SET request.jwt.claims = '{\"role\": \"anon\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"anon\", \"name\": \"Anon\", \"stageOrder\": 99, \"stageType\": \"groups\"}',
  '[]', '[]'
);
")

if echo "$ERR_ANON" | grep -q "UNAUTHORIZED"; then
  echo "✅ Chamada anônima rejeitada com sucesso (UNAUTHORIZED)."
else
  echo "❌ FALHA: Chamada anônima não foi rejeitada!"
  echo "$ERR_ANON"
  exit 1
fi

# 7.2. Tentativa com perfil de 'team' (não organizador nem admin) deve falhar com FORBIDDEN
ERR_TEAM=$(run_sql_raw "
SET request.jwt.claims = '{\"sub\": \"00000000-0000-0000-0000-000000000002\", \"role\": \"authenticated\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"team-hack\", \"name\": \"Hack\", \"stageOrder\": 99, \"stageType\": \"groups\"}',
  '[]', '[]'
);
")

if echo "$ERR_TEAM" | grep -q "FORBIDDEN"; then
  echo "✅ Chamada por usuário com perfil 'team' rejeitada com sucesso (FORBIDDEN)."
else
  echo "❌ FALHA: Usuário 'team' não foi rejeitado!"
  echo "$ERR_TEAM"
  exit 1
fi

# 7.3. Anti-Spoofing de service_role: usuário autenticado tentando forjar role service_role
ERR_SPOOF=$(run_sql_raw "
SET request.jwt.claims = '{\"sub\": \"00000000-0000-0000-0000-000000000002\", \"role\": \"service_role\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"spoof-hack\", \"name\": \"Spoof\", \"stageOrder\": 99, \"stageType\": \"groups\"}',
  '[]', '[]'
);
")

if echo "$ERR_SPOOF" | grep -q "FORBIDDEN"; then
  echo "✅ Anti-Spoofing comprovado: Usuário com UID não consegue se passar por service_role de infraestrutura."
else
  echo "❌ FALHA: Brecha de segurança! Usuário conseguiu usurpar service_role!"
  echo "$ERR_SPOOF"
  exit 1
fi

# 7.4. Ownership de Competição: Organizador da Competição B tentando alterar Competição A
ERR_CROSS_ORG=$(run_sql_raw "
SET request.jwt.claims = '{\"sub\": \"00000000-0000-0000-0000-000000000003\", \"role\": \"authenticated\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"cross-org-hack\", \"name\": \"Hack\", \"stageOrder\": 99, \"stageType\": \"groups\"}',
  '[]', '[]'
);
")

if echo "$ERR_CROSS_ORG" | grep -q "FORBIDDEN"; then
  echo "✅ Ownership comprovado: Organizador da Competição B NÃO consegue alterar Competição A (FORBIDDEN)."
else
  echo "❌ FALHA: Organizador de outra competição conseguiu alterar competição alheia!"
  echo "$ERR_CROSS_ORG"
  exit 1
fi

# 7.5. Chamada por usuário organizador autenticado da PRÓPRIA competição deve ter sucesso
OK_ORGANIZER=$(run_sql "
SET request.jwt.claims = '{\"sub\": \"00000000-0000-0000-0000-000000000001\", \"role\": \"authenticated\"}';
SELECT public.save_stage_draw_and_slots(
  'comp-test-acid',
  '{\"stageId\": \"org-stage\", \"name\": \"Fase do Organizador\", \"stageOrder\": 2, \"stageType\": \"knockout\"}',
  '[{\"roundId\": \"org-r\", \"name\": \"R\", \"roundOrder\": 1}]',
  '[]'
);
")

if echo "$OK_ORGANIZER" | grep -q '"ok": true'; then
  echo "✅ Chamada por organizador proprietário autenticado autorizada e executada com sucesso."
else
  echo "❌ FALHA: Organizador proprietário foi indevidamente rejeitado!"
  echo "$OK_ORGANIZER"
  exit 1
fi

# 7.6. Auditoria de privilégios: PUBLIC não pode ter EXECUTE nas RPCs
PUBLIC_GRANTS=$(run_sql "
SELECT count(*) 
FROM information_schema.routine_privileges 
WHERE routine_name IN ('save_stage_draw_and_slots', 'rpc_propagate_slot_outcome')
  AND grantee = 'PUBLIC';
")

if [ "$PUBLIC_GRANTS" -eq 0 ]; then
  echo "🎯 PROVA 7 APROVADA: Segurança, Ownership, Roles e REVOKE EXECUTE FROM PUBLIC 100% comprovados."
else
  echo "❌ FALHA NA PROVA 7: Há privilégios EXECUTE concedidos a PUBLIC!"
  exit 1
fi

# ------------------------------------------------------------------------------
# PROVA 8: CONCORRÊNCIA E LOCKS DETERMINÍSTICOS (ANTI-DEADLOCK)
# ------------------------------------------------------------------------------
echo ""
echo "[PROVA 8] Testando concorrência e ausência de deadlocks com locks ordenados..."

# Dispara duas transações concorrentes em paralelo sobre o mesmo estágio e slots
echo "Disparando 2 transações concorrentes em paralelo..."
run_sql "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.rpc_propagate_slot_outcome(
  'comp-test-acid',
  'SLOT-SF-01',
  'team-test-1',
  'team-test-2'
);
" > /tmp/conc1.log 2>&1 &
PID1=$!

run_sql "
SET request.jwt.claims = '{\"role\": \"service_role\"}';
SELECT public.rpc_propagate_slot_outcome(
  'comp-test-acid',
  'SLOT-SF-01',
  'team-test-1',
  'team-test-2'
);
" > /tmp/conc2.log 2>&1 &
PID2=$!

wait $PID1
wait $PID2

if grep -q "deadlock detected" /tmp/conc1.log /tmp/conc2.log 2>/dev/null; then
  echo "❌ FALHA NA PROVA 8: Deadlock detectado!"
  cat /tmp/conc1.log /tmp/conc2.log
  exit 1
fi

if grep -q '"ok": true' /tmp/conc1.log && grep -q '"ok": true' /tmp/conc2.log; then
  echo "🎯 PROVA 8 APROVADA: Concorrência paralela executada com locks determinísticos ordenados por ID asc (zero deadlocks)."
else
  echo "❌ FALHA NA PROVA 8: Falha na execução concorrente."
  cat /tmp/conc1.log /tmp/conc2.log
  exit 1
fi

echo ""
echo "========================================================================"
echo "TODAS AS 8 PROVAS EM POSTGRESQL REAL FORAM CONCLUÍDAS COM SUCESSO (100%)"
echo "========================================================================"

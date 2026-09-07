# BASEOS — FASE 4.6: WALKTHROUGH FINAL

**Projeto:** BaseOS  
**Fase:** 4.6 — Implementação da Fundação de Persistência do Competition Format Engine  
**Status:** CONCLUÍDA  
**Certificação:** OPÇÃO A — IMPLEMENTAÇÃO CONCLUÍDA — FUNDAÇÃO DE PERSISTÊNCIA HOMOLOGADA  
**Data:** 05/09/2026  

---

## 1. BASELINE REAL (ANTES DA ALTERAÇÃO)

Antes de iniciar qualquer edição no código ou criação de migrations, o baseline real do repositório foi executado e registrado:

- **Git Commit HEAD:** `a9e42ac` (`docs: document technical gate 4.5 approval`)
- **Status do Repositório:** Limpo (`git status --short` vazio)
- **TypeScript:** 0 erros (`npx tsc -p tsconfig.app.json --noEmit`)
- **Testes:** 86 arquivos de teste, 710 testes (710 passed, 0 failed, 175.85s)
- **ESLint:** 0 erros, 1 warning preexistente (`DrawArenaCanvas.tsx:438:6`)
- **Build:** Sucesso em 59.97s (Vite production bundle)

---

## 2. IMPLEMENTAÇÃO REALIZADA

A Fase 4.6 construiu a fundação de persistência relacional do novo Competition Format Engine sem quebrar nenhuma dependência pré-existente e sem criar equipes falsas.

### Arquivos Modificados e Criados:
1. `supabase/migrations/20260905000006_competition_format_runtime.sql`:
   - DDL para enums, tabelas, foreign keys, constraints únicas, CHECK constraints e RLS.
2. `src/lib/supabaseClient.ts`:
   - Registradas as tabelas `competitionStages`, `competitionRounds` e `competitionMatchSlots` no catálogo `SUPABASE_TABLES`.
3. `src/types/entities.ts`:
   - Tipos de domínio runtime: `StageRecord`, `RoundRecord`, `MatchSlotRecord`, `StageRuntimeStatus`, `RoundRuntimeStatus`, `SlotParticipantStatus`.
4. `src/services/dataAccess.ts`:
   - Implementação simétrica no `localStorageAdapter` e no `supabaseAdapter`.
   - Funções utilitárias: `validateParticipantReference` (8 tipos canônicos) e `isArtificialTeamId` (proteção anti-TBD/BYE).
   - Métodos de CRUD para Stages, Rounds e MatchSlots.
   - Atualização de limpeza e ciclo de vida: `clearAllCompetitionData`, `clearEntireDatabase`, `ensureSeeded`, `deleteCompetition`.
5. `src/test/stagePersistenceRepository.test.ts`:
   - 33 testes cobrindo todo o ciclo de vida, integridade, unicidade, BYE e isolamento.
6. `src/test/dataAccessAdapter.test.ts`:
   - Mock do query builder Supabase atualizado com encadeamentos `.order()`, `.limit()` e `.delete()`.
   - 2 novos testes validando a conversão snake_case/camelCase para estágios e match slots no adaptador Supabase.

---

## 3. DATABASE: TABELAS CRIADAS

1. **`public.competition_stages`**:
   Armazena o estado de execução de cada fase declarada na `CompetitionConfig`.
2. **`public.competition_rounds`**:
   Armazena as rodadas estruturais pertencentes a cada estágio (ex.: quartas, semifinal, final).
3. **`public.competition_match_slots`**:
   Armazena a intenção estrutural de confronto (`participant_reference`) e a materialização derivada (`resolved_team_id`), separada da partida esportiva concreta (`matches.id`).

---

## 4. CONSTRAINTS APLICADAS

- **`uq_stages_comp_stage_id`**: `UNIQUE (competition_id, stage_id)` — impede duplicação do mesmo estágio lógico.
- **`uq_stages_comp_order`**: `UNIQUE (competition_id, stage_order)` — impede conflito de ordem de estágios.
- **`uq_rounds_stage_round_id`**: `UNIQUE (stage_row_id, round_id)` — unicidade da rodada no estágio.
- **`uq_rounds_stage_order`**: `UNIQUE (stage_row_id, round_order)` — ordenação única de rodadas no estágio.
- **`uq_slots_comp_slot_id`**: `UNIQUE (competition_id, slot_id)` — unicidade do identificador de slot na competição.
- **`uq_slots_round_position`**: `UNIQUE (round_row_id, position)` — posição única do confronto dentro da rodada.
- **`chk_participant_a_ref_type`** & **`chk_participant_b_ref_type`**: CHECK constraints que garantem que as referências JSONB possuam a chave `'type'` e pertençam rigorosamente aos 8 tipos canônicos aprovados.
- **Foreign Keys**:
  - `competition_stages.competition_id -> competitions.id (ON DELETE CASCADE)`
  - `competition_rounds.stage_row_id -> competition_stages.id (ON DELETE CASCADE)`
  - `competition_rounds.competition_id -> competitions.id (ON DELETE CASCADE)`
  - `competition_match_slots.round_row_id -> competition_rounds.id (ON DELETE CASCADE)`
  - `competition_match_slots.stage_row_id -> competition_stages.id (ON DELETE CASCADE)`
  - `competition_match_slots.competition_id -> competitions.id (ON DELETE CASCADE)`
  - `competition_match_slots.resolved_team_a_id -> teams.id (ON DELETE SET NULL, NULLABLE)`
  - `competition_match_slots.resolved_team_b_id -> teams.id (ON DELETE SET NULL, NULLABLE)`
  - `competition_match_slots.match_id -> matches.id (ON DELETE SET NULL, NULLABLE)`

---

## 5. ÍNDICES APLICADOS

- `idx_competition_stages_competition` on `competition_stages(competition_id)`
- `idx_competition_stages_status` on `competition_stages(status)`
- `idx_competition_rounds_stage` on `competition_rounds(stage_row_id)`
- `idx_competition_rounds_competition` on `competition_rounds(competition_id)`
- `idx_competition_match_slots_comp` on `competition_match_slots(competition_id)`
- `idx_competition_match_slots_stage` on `competition_match_slots(stage_row_id)`
- `idx_competition_match_slots_round` on `competition_match_slots(round_row_id)`
- `idx_competition_match_slots_team_a` on `competition_match_slots(resolved_team_a_id)`
- `idx_competition_match_slots_team_b` on `competition_match_slots(resolved_team_b_id)`
- `idx_competition_match_slots_match` on `competition_match_slots(match_id)`

---

## 6. REPOSITÓRIO: MÉTODOS IMPLEMENTADOS

Integrados à fachada `dataAccess`:
- **Estágios**: `listStages`, `getStage`, `getStageByLogicalId`, `createStage`, `updateStage`, `deleteStage`.
- **Rodadas**: `listRounds`, `getRound`, `getRoundByLogicalId`, `createRound`, `updateRound`, `deleteRound`.
- **Slots**: `listMatchSlots`, `listMatchSlotsByRound`, `getMatchSlot`, `getMatchSlotByLogicalId`, `createMatchSlot`, `updateMatchSlot`, `deleteMatchSlot`.

---

## 7. RLS: POLÍTICAS APLICADAS

- `public.competition_stages`:
  - `SELECT`: Público (`using (true)`).
  - `INSERT / UPDATE / DELETE`: Restrito a organizadores, administradores e `service_role`.
- `public.competition_rounds`:
  - `SELECT`: Público (`using (true)`).
  - `INSERT / UPDATE / DELETE`: Restrito a organizadores, administradores e `service_role`.
- `public.competition_match_slots`:
  - `SELECT`: Público (`using (true)`).
  - `INSERT / UPDATE / DELETE`: Restrito a organizadores, administradores e `service_role`.

---

## 8. RESULTADOS DE TESTES E QUALIDADE (REAL)

### Suíte Completa de Testes (`npm test`):
```text
Test Files  87 passed (87)
     Tests  745 passed (745)
  Duration  190.37s
```
- **Total de Arquivos:** 87 (86 baseline + 1 novo)
- **Total de Testes:** 745 (710 baseline + 35 novos)
- **Falhas:** 0 (100% de sucesso)

### Typecheck TypeScript (`npx tsc -p tsconfig.app.json --noEmit`):
- **Erros:** 0

### Linter (`npm run lint`):
- **Erros:** 0
- **Warnings:** 1 (preexistente em `DrawArenaCanvas.tsx:438:6`)

### Build de Produção (`npm run build`):
- **Status:** Sucesso (1m 3s, 4110 módulos transformados, 0 erros)

---

## 9. LIMITAÇÕES RECONHECIDAS E PENDÊNCIAS

### Para a Fase 4.7 (Transações PL/pgSQL & Security):
1. Criação das funções transacionais `save_stage_draw_and_slots` e `rpc_propagate_slot_outcome`.
2. Locks pessimistas transacionais (`SELECT ... FOR UPDATE`) em cascata de slots.
3. Auditoria de segurança de ownership por competição.

### Para a Fase 4.8 (Runtime & Progression Integration):
1. Integração do `genericProgressionEngine` com o encerramento de partidas no banco.
2. Transição gradual do `playoffsService` para ler os slots persistidos.

### Para a Fase 4.9 (Bracket & UI):
1. Novo componente `TournamentBracket` consumindo a nova hierarquia.
2. Draw Arena multi-fases conectada aos estágios.

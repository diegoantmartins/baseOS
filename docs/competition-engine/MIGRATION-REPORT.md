# BASEOS — RELATÓRIO DA MIGRATION: 20260905000006_competition_format_runtime.sql

**Documento:** MIGRATION-REPORT.md  
**Fase:** 4.6  
**Arquivo de Migration:** `supabase/migrations/20260905000006_competition_format_runtime.sql`  
**Status:** IMPLEMENTADA E HOMOLOGADA  
**Data:** 05/09/2026  

---

## 1. IDENTIFICAÇÃO E CONVENÇÃO

- **Caminho:** `supabase/migrations/20260905000006_competition_format_runtime.sql`
- **Timestamp de Sequência:** `20260905000006` (sucessor imediato da migration `20260905000005_audit_logs.sql`).
- **Natureza:** Aditiva / Incremental e idempotente (`IF NOT EXISTS` / `CREATE TYPE ... EXCEPTION WHEN duplicate_object`).

---

## 2. OBJETOS DE BANCO DE DADOS CRIADOS

### 2.1 Enums PostgreSQL
1. `public.stage_runtime_status`: `'pending'`, `'in-progress'`, `'completed'`, `'cancelled'`.
2. `public.round_runtime_status`: `'pending'`, `'in-progress'`, `'completed'`.
3. `public.slot_participant_status`: `'unresolved'`, `'resolved'`, `'bye'`, `'disqualified'`.

### 2.2 Tabelas
1. `public.competition_stages`:
   - `id TEXT PRIMARY KEY`
   - `competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE`
   - `stage_id TEXT NOT NULL`
   - `name TEXT NOT NULL`
   - `stage_order INTEGER NOT NULL`
   - `stage_type TEXT NOT NULL`
   - `status public.stage_runtime_status NOT NULL DEFAULT 'pending'`
   - `is_locked BOOLEAN NOT NULL DEFAULT false`
   - `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

2. `public.competition_rounds`:
   - `id TEXT PRIMARY KEY`
   - `competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE`
   - `stage_row_id TEXT NOT NULL REFERENCES public.competition_stages(id) ON DELETE CASCADE`
   - `round_id TEXT NOT NULL`
   - `name TEXT NOT NULL`
   - `round_order INTEGER NOT NULL`
   - `slots_count INTEGER NOT NULL DEFAULT 0`
   - `status public.round_runtime_status NOT NULL DEFAULT 'pending'`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

3. `public.competition_match_slots`:
   - `id TEXT PRIMARY KEY`
   - `competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE`
   - `stage_row_id TEXT NOT NULL REFERENCES public.competition_stages(id) ON DELETE CASCADE`
   - `round_row_id TEXT NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE`
   - `slot_id TEXT NOT NULL`
   - `position INTEGER NOT NULL`
   - `label TEXT`
   - `participant_a_reference JSONB NOT NULL`
   - `participant_a_status public.slot_participant_status NOT NULL DEFAULT 'unresolved'`
   - `resolved_team_a_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL`
   - `participant_b_reference JSONB NOT NULL`
   - `participant_b_status public.slot_participant_status NOT NULL DEFAULT 'unresolved'`
   - `resolved_team_b_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL`
   - `match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL`
   - `progression_route JSONB`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 3. CONSTRAINTS DE INTEGRIDADE

1. **Unicidade de Estágios:**
   - `uq_stages_comp_stage_id UNIQUE (competition_id, stage_id)`
   - `uq_stages_comp_order UNIQUE (competition_id, stage_order)`
2. **Unicidade de Rodadas:**
   - `uq_rounds_stage_round_id UNIQUE (stage_row_id, round_id)`
   - `uq_rounds_stage_order UNIQUE (stage_row_id, round_order)`
3. **Unicidade de Match Slots:**
   - `uq_slots_comp_slot_id UNIQUE (competition_id, slot_id)`
   - `uq_slots_round_position UNIQUE (round_row_id, position)`
4. **CHECK Constraints Estruturais em JSONB:**
   - `chk_participant_a_ref_type`: garante que `participant_a_reference ? 'type'` e que o tipo pertence exatamente aos 8 canônicos (`'resolved-team', 'group-position', 'overall-ranking', 'stage-position', 'match-winner', 'match-loser', 'seed', 'bye'`).
   - `chk_participant_b_ref_type`: validação idêntica para o lado B.

---

## 4. ÍNDICES CRIADOS

1. `idx_competition_stages_competition ON public.competition_stages(competition_id)`
2. `idx_competition_stages_status ON public.competition_stages(status)`
3. `idx_competition_rounds_stage ON public.competition_rounds(stage_row_id)`
4. `idx_competition_rounds_competition ON public.competition_rounds(competition_id)`
5. `idx_competition_match_slots_comp ON public.competition_match_slots(competition_id)`
6. `idx_competition_match_slots_stage ON public.competition_match_slots(stage_row_id)`
7. `idx_competition_match_slots_round ON public.competition_match_slots(round_row_id)`
8. `idx_competition_match_slots_team_a ON public.competition_match_slots(resolved_team_a_id)`
9. `idx_competition_match_slots_team_b ON public.competition_match_slots(resolved_team_b_id)`
10. `idx_competition_match_slots_match ON public.competition_match_slots(match_id)`

---

## 5. ALTERAÇÕES EM OBJETOS EXISTENTES

- **`competitions`**: NENHUMA alteração de colunas ou constraints.
- **`teams`**: NENHUMA alteração.
- **`matches`**: NENHUMA alteração. Colunas `team_a_id` e `team_b_id` permanecem `NOT NULL`.
- **`draws`**: NENHUMA alteração. Constraint `UNIQUE(competition_id)` mantida intacta.

---

## 6. DADOS AFETADOS vs. DADOS NÃO AFETADOS

- **Dados Afetados:** Nenhum. As tabelas criadas são completamente novas.
- **Dados Legados:** 100% preservados. Nenhuma competição, time, partida ou sorteio existente sofreu modificação.
- **Backfill:** Nenhum backfill massivo ou compulsório foi executado. O sistema legado continua lendo `draws` e `matches` normalmente.

---

## 7. ANÁLISE DE RISCO E ESTRATÉGIA DE ROLLBACK

- **Risco de Quebra:** Baixíssimo (zero alterações destrutivas ou modificações em tabelas ativas).
- **Estratégia de Rollback:**
  ```sql
  DROP TABLE IF EXISTS public.competition_match_slots CASCADE;
  DROP TABLE IF EXISTS public.competition_rounds CASCADE;
  DROP TABLE IF EXISTS public.competition_stages CASCADE;
  DROP TYPE IF EXISTS public.slot_participant_status;
  DROP TYPE IF EXISTS public.round_runtime_status;
  DROP TYPE IF EXISTS public.stage_runtime_status;
  ```
- **Ambiente de Teste:**
  - Validado contra suite de testes Vitest (jsdom e mock adapter Supabase).
  - TypeScript AST typecheck executado com zero erros (`npx tsc --noEmit`).

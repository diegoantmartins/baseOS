# ARQUITETURA DE TRANSAÇÕES ACID EM POSTGRESQL / SUPABASE RPC

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Camada de Persistência  
**Fase:** 4.7  
**Status:** HOMOLOGADO  

---

## 1. O MODELO TRANACIONAL CORRETO NO POSTGRESQL

No ecossistema PostgreSQL / Supabase, funções PL/pgSQL chamadas via `supabase.rpc(...)` operam sob um modelo transacional estrito e transparente:

### 1.1. Por que NÃO usar `BEGIN ... COMMIT` dentro da Função?
Diferente de procedures executadas com `CALL`, uma função PostgreSQL (`CREATE FUNCTION ... RETURNS JSONB LANGUAGE plpgsql`) chamada dentro de uma requisição PostgREST / RPC **já executa integralmente dentro da transação iniciada pelo PostgreSQL para aquela chamada**.

Tentar colocar `COMMIT` ou `ROLLBACK` explícitos dentro de um bloco de função PL/pgSQL é inválido e rejeitado pelo compilador do PostgreSQL (`ERROR: 2D000: cannot commit while a subtransaction is active`).

### 1.2. Mecanismo de Atomicidade por Exceção
A garantia de atomicidade total (ACID - *All or Nothing*) é estruturada no ciclo canônico do motor relacional:

```text
Chamada do Cliente (supabase.rpc)
       ↓
PostgreSQL abre transação única da requisição
       ↓
Executa public.save_stage_draw_and_slots(...)
       ↓
   [Etapa 1] Valida Autenticação e Ownership da Competição
   [Etapa 2] Lock Pessimista na Competição (FOR UPDATE)
   [Etapa 3] Upsert de Stage
   [Etapa 4] Validação e Upsert de Rounds
   [Etapa 5] Validação Estrutural e Upsert de MatchSlots
       ↓
Alguma constraint foi violada ou parâmetro é inválido?
   ├── SIM ──→ RAISE EXCEPTION '...' (PostgreSQL aborta a chamada e reverte 100% das alterações)
   └── NÃO ──→ Função retorna JSONB de sucesso (PostgreSQL confirma o COMMIT da transação)
```

---

## 2. RPC: `save_stage_draw_and_slots`

### 2.1. Assinatura e Modificadores
```sql
CREATE OR REPLACE FUNCTION public.save_stage_draw_and_slots(
  p_competition_id TEXT,
  p_stage JSONB,
  p_rounds JSONB,
  p_slots JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;
```

### 2.2. Fluxo Transacional Passo a Passo
1. **Verificação de Identidade e Autorização:**
   - Extrai o role do JWT (`auth.jwt()->>'role'`) e o UID do chamador (`COALESCE(auth.uid(), NULLIF(auth.jwt()->>'sub', '')::UUID)`).
   - Valida se a chamada é de infraestrutura confiável (`service_role` com `auth.uid() IS NULL`).
   - Caso seja um usuário autenticado, consulta a tabela `public.profiles` para garantir que o papel de negócio seja `organizer` ou `admin`. Chamadas anônimas e perfis como `team` ou `referee` são abortadas imediatamente com código SQLSTATE `42501`.
2. **Lock Pessimista e Validação de Ownership:**
   - Executa `SELECT id, organizer_id INTO v_comp_id, v_comp_organizer_id FROM public.competitions WHERE id = p_competition_id FOR UPDATE;`.
   - Garante a serialização ACID de alterações concorrentes sobre a mesma competição.
   - Se a competição possuir `organizer_id` definido, verifica se o usuário autenticado é o proprietário designado ou um administrador global. Se um organizador da Competição A tentar salvar dados na Competição B, a função aborta com `FORBIDDEN`.
3. **Upsert do Estágio (`competition_stages`):**
   - Valida campos obrigatórios (`stageId`, `name`, `stageOrder`, `stageType`).
   - Bloqueia e atualiza o registro existente ou gera um novo ID físico e insere a linha.
4. **Iteração e Upsert de Rodadas (`competition_rounds`):**
   - Para cada elemento em `p_rounds`, valida unicidade de `round_order` e `round_id`.
   - Insere ou atualiza e registra o mapeamento do `round_id` lógico para o ID primário relacional.
5. **Iteração e Validação Profunda de Slots (`competition_match_slots`):**
   - Garante que a rodada associada pertence rigorosamente ao estágio e competição atuais (isolamento cross-competition).
   - Valida a conformidade canônica dos JSONBs de `participantAReference` e `participantBReference` via `public.validate_participant_reference_jsonb`.
   - Executa a defesa anti-fake team via `public.is_artificial_team_id`: qualquer ocorrência de `TBD%`, `__BYE%`, `UNKNOWN` ou `PLACEHOLDER%` em `resolved_team_id` dispara aborto imediato.
   - Valida existência prévia das equipes na tabela `teams` e de partidas na tabela `matches`.
   - Mantém `participant_reference` JSONB estritamente imutável, gravando apenas o time resolvido em `resolved_team_a_id` / `resolved_team_b_id`.

---

## 3. RPC: `rpc_propagate_slot_outcome`

### 3.1. Assinatura e Modificadores
```sql
CREATE OR REPLACE FUNCTION public.rpc_propagate_slot_outcome(
  p_competition_id TEXT,
  p_slot_id TEXT,
  p_winner_team_id TEXT DEFAULT NULL,
  p_loser_team_id TEXT DEFAULT NULL,
  p_match_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;
```

### 3.2. Idempotência e Locks Determinísticos
1. **Lock no Slot de Origem:** Bloqueia o slot que concluiu a partida.
2. **Avaliação de Idempotência:**
   - Compara o estado atual dos slots de destino com o vencedor e perdedor informados.
   - Se os slots de destino já refletem exatamente o resultado que seria propagado, retorna `{ "ok": true, "idempotent": true }` imediatamente, evitando escritas redundantes ou deadlocks.
3. **Locks Ordenados Anti-Deadlock:**
   - Coleta todos os IDs dos slots de destino (extraídos de `progression_route` ou por referências invertidas `match-winner`/`match-loser`).
   - Aplica `SELECT ... FOR UPDATE` ordenando deterministicamente por `id ASC`.
   - Esse padrão matemático elimina qualquer possibilidade de cycle deadlock quando duas partidas encerram simultaneamente e tentam alimentar os mesmos confrontos futuros.
4. **Materialização com Preservação de Proveniência:**
   - Atualiza `resolved_team_a_id` ou `resolved_team_b_id`.
   - Atualiza `participant_a_status` ou `participant_b_status` para `'resolved'`.
   - O objeto `participant_reference` JSONB permanece com seu tipo canônico (ex.: `{"type": "match-winner", "slotId": "SLOT-SF-01"}`), preservando o histórico esportivo para relatórios e renderização de chaves.

---

## 4. CONVIVÊNCIA COM O MODELO LEGADO

| Operação | Tecnologia | Nível de Transacionalidade | Status |
| :--- | :--- | :--- | :--- |
| `saveDrawWithMatches` (Legado) | Múltiplas chamadas REST Supabase (`DELETE` $\to$ `INSERT` $\to$ `UPSERT`) | Não Transacional (Risco de inconsistência se abortado no meio) | Mantido provisoriamente até a Fase 4.8 |
| `saveStageDrawAndSlots` (Novo) | PostgreSQL RPC `save_stage_draw_and_slots` | Transacional ACID (Single call transaction, 100% atômica) | Homologado na Fase 4.7 |
| `propagateSlotOutcome` (Novo) | PostgreSQL RPC `rpc_propagate_slot_outcome` | Transacional ACID com Idempotência e Locks Determinísticos | Homologado na Fase 4.7 |

> [!CAUTION]
> A presença da nova RPC não confere automaticamente atomicidade às operações antigas. O fluxo legado será gradualmente descontinuado na Fase 4.8 em favor do Runtime Progression Engine.

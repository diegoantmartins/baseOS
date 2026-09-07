# Arquitetura de Materialização de Partidas (Fase 4.8)

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Match Materialization  
**Documento:** `MATCH-MATERIALIZATION.md`  
**Status:** Homologado

---

## 1. O Conceito de Materialização

No BaseOS, um `MatchSlot` representa o **espaço estrutural** de um confronto no chaveamento do torneio (ex.: "Quartas de Final 1", "Vencedor Jogo 1 vs Segundo Colocado Grupo B").

Um `Match` representa o **evento esportivo concreto**, com horário, local, súmula, árbitros e placar.

> **Materialização** é o ato de instanciar um `Match` a partir de um `MatchSlot` no momento exato em que ambos os seus participantes tornam-se conhecidos e válidos.

---

## 2. Condições Rigorosas para Elegibilidade de Materialização

Um `MatchSlot` só é elegível para materialização se satisfizer **cumulativamente** todas as seguintes condições:

1. **Estado de Participantes**:
   - `participantAStatus === 'resolved'`
   - `participantBStatus === 'resolved'`
   - `resolvedTeamAId !== null`
   - `resolvedTeamBId !== null`
2. **Inexistência de Pré-Materialização**:
   - `matchId === null`
   - Nenhum registro em `matches` com `slot_id = slot.slotId`
3. **Defesa Anti-Fake Team**:
   - `resolvedTeamAId` e `resolvedTeamBId` NÃO podem conter prefixos artificiais (`TBD-`, `BYE-`, `seed-`, `winner-`, `loser-`, `__BYE__`).
4. **Verificação de Existência Real**:
   - Ambas as equipes devem existir fisicamente na tabela `public.teams`.
5. **Pertencimento à Competição**:
   - Ambas as equipes devem possuir registro de inscrição confirmado/aprovado na tabela `public.competition_teams` para a respectiva competição.

---

## 3. A RPC como Autoridade Absoluta (`rpc_materialize_slot_match`)

A autoridade da materialização reside inteiramente no banco de dados através da função PL/pgSQL:

```sql
public.rpc_materialize_slot_match(
  p_competition_id TEXT,
  p_slot_id TEXT,
  p_scheduled_time TIMESTAMPTZ,
  p_venue TEXT,
  p_court TEXT,
  p_phase TEXT
) RETURNS JSONB
```

### Etapas de Execução no PostgreSQL:

1. **Autorização e Tenant Security**:
   - Valida se o chamador possui role `service_role` ou se é o organizador autenticado proprietário da competição.
2. **Bloqueio Pessimista de Linha (Row-Level Lock)**:
   ```sql
   SELECT * INTO v_slot
   FROM public.competition_match_slots
   WHERE competition_id = p_competition_id AND slot_id = p_slot_id
   FOR UPDATE;
   ```
   - Nenhuma outra transação pode ler ou alterar este slot até a conclusão desta transação.
3. **Checagem de Idempotência Atômica**:
   - Se `v_slot.match_id` já estiver preenchido:
     ```sql
     RETURN jsonb_build_object(
       'ok', true,
       'matchId', v_slot.match_id,
       'alreadyMaterialized', true,
       'message', 'Partida já materializada e vinculada ao slot'
     );
     ```
4. **Validação de Participantes e Integridade**:
   - Rejeição imediata com `RAISE EXCEPTION 'PARTICIPANT_UNRESOLVED'` caso algum lado esteja pendente.
   - Rejeição com `RAISE EXCEPTION 'ARTIFICIAL_TEAM_REJECTED'` para IDs falsos.
   - Rejeição com `RAISE EXCEPTION 'TEAM_NOT_FOUND'` caso a equipe não exista em `teams`.
   - Rejeição com `RAISE EXCEPTION 'TEAM_NOT_ENROLLED'` caso a equipe não esteja inscrita na competição.
5. **Cálculo Determinístico de Número de Partida**:
   - Obtém `COALESCE(MAX(match_number), 0) + 1` dentro do contexto transacional.
6. **Inserção do Match Esportivo**:
   - Insere na tabela `public.matches` vinculando `slot_id`.
7. **Vinculação no MatchSlot**:
   - Atualiza `competition_match_slots.match_id = v_match_id` e `status = 'scheduled'`.
8. **Retorno de Sucesso**:
   - Retorna JSONB contendo o `matchId`, `matchNumber`, equipes e status.

---

## 4. Camadas de Defesa Contra Duplicação e Race Conditions

```text
[ Requisição Concorrente 1 ]          [ Requisição Concorrente 2 ]
             │                                     │
             ▼                                     ▼
    rpc_materialize_slot_match            rpc_materialize_slot_match
             │                                     │
             ▼                                     │
   [ SELECT ... FOR UPDATE ]                       │
   (Obtém LOCK no Slot)                            │
             │                           [ AGUARDA LOCK... ]
   * Verifica match_id IS NULL                     │
   * Insere em matches                             │
   * Atualiza slot.match_id                        │
             │                                     │
   [ COMMIT TRANSAÇÃO 1 ]                          │
             │                                     ▼
             │                           [ ADQUIRE LOCK ]
             │                           * Detecta match_id preenchido!
             │                           * Retorna alreadyMaterialized: true
             │                                     │
             ▼                                     ▼
     (Match 1 Criado)                     (Match 1 Reutilizado)
```

Além do bloqueio pessimista, uma **segunda barreira física** existe no nível de schema:
```sql
CREATE UNIQUE INDEX uq_matches_competition_slot_id
  ON public.matches (competition_id, slot_id)
  WHERE slot_id IS NOT NULL;
```
Qualquer tentativa externa ou manual de inserir outra partida vinculada ao mesmo `(competition_id, slot_id)` aborta com violação de chave única.

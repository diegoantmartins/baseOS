# CONCORRÊNCIA, LOCKS DETERMINÍSTICOS E ANTI-DEADLOCK

**Projeto:** BaseOS  
**Fase:** 4.7  
**Escopo:** Controle de Concorrência Transacional e Serialização de Partidas  
**Status:** HOMOLOGADO  

---

## 1. DESAFIOS DE CONCORRÊNCIA EM GESTÃO DE TORNEIOS

Em competições esportivas com múltiplas quadras simultâneas, dois cenários de alta concorrência ocorrem com frequência:
1. **Sorteios ou Edições Simultâneas de Chaves:** Dois organizadores ou requisições assíncronas tentam salvar o chaveamento da mesma fase simultaneamente.
2. **Finalizações Concorrentes Alimentando o Mesmo Slot:** Em semifinais simultâneas (SF1 e SF2), as duas partidas podem terminar no mesmo minuto. O encerramento da SF1 tenta atualizar a Final (lado A), enquanto o encerramento da SF2 tenta atualizar a Final (lado B). Se o bloqueio das linhas for feito de forma desordenada, ocorre **Deadlock (Cycle Wait)** no PostgreSQL.

---

## 2. ESTRATÉGIA DE LOCKS DA FASE 4.7

### 2.1. Serialização em Nível de Competição (Sorteios e Estrutura)
Na RPC `save_stage_draw_and_slots`, a integridade do grafo do torneio exige que apenas uma alteração estrutural ocorra por vez na mesma competição:

```sql
SELECT id, organizer_id INTO v_comp_id, v_comp_organizer_id
FROM public.competitions
WHERE id = p_competition_id
FOR UPDATE;
```
- A transação adquire lock exclusivo de linha sobre a competição.
- Qualquer outra chamada concorrente para a mesma competição aguarda a conclusão (COMMIT/ROLLBACK) da primeira, eliminando condições de corrida na numeração de rodadas ou posições de slots.

### 2.2. Locks Determinísticos Ordenados por ID (Propagação de Resultados)
Na RPC `rpc_propagate_slot_outcome`, o algoritmo protege a chave contra deadlocks através do seguinte fluxo:

1. **Bloqueio do Slot de Origem:**
   ```sql
   SELECT * INTO v_source_slot
   FROM public.competition_match_slots
   WHERE competition_id = p_competition_id AND slot_id = p_slot_id
   FOR UPDATE;
   ```
2. **Coleta de Todos os Slots de Destino Afetados:**
   ```sql
   SELECT ARRAY_AGG(id ORDER BY id ASC) INTO v_target_row_ids
   FROM public.competition_match_slots
   WHERE competition_id = p_competition_id
     AND (
       (v_winner_target_slot_id IS NOT NULL AND slot_id = v_winner_target_slot_id)
       OR (v_loser_target_slot_id IS NOT NULL AND slot_id = v_loser_target_slot_id)
       OR (participant_a_reference->>'slotId' = p_slot_id OR participant_a_reference->>'slot_id' = p_slot_id)
       OR (participant_b_reference->>'slotId' = p_slot_id OR participant_b_reference->>'slot_id' = p_slot_id)
     );
   ```
3. **Aquisição Determinística dos Locks:**
   ```sql
   PERFORM 1 FROM public.competition_match_slots
   WHERE id = ANY(v_target_row_ids)
   ORDER BY id ASC
   FOR UPDATE;
   ```

### 2.3. Prova Matemática Anti-Deadlock
Para que ocorra deadlock, 4 condições de Coffman devem ser satisfeitas: Exclusão Mútua, Posse e Espera, Não Preempção e **Espera Circular**.

Ao impor que qualquer transação adquira locks sobre múltiplos slots **estritamente na ordem crescente de sua chave primária (`ORDER BY id ASC`)**, cria-se uma relação de ordem total sobre o conjunto de recursos:
$$\forall (R_i, R_j), \text{ se } i < j \implies R_i \text{ é bloqueado antes de } R_j$$

Isso torna a **espera circular matematicamente impossível**. Se a Transação 1 e a Transação 2 precisarem dos slots `slot-1` e `slot-2`, ambas tentarão obter primeiro o lock de `slot-1`. A vencedora prossegue e obtém `slot-2`, enquanto a perdedora aguarda sem reter recursos em ordem invertida.

---

## 3. IDEMPOTÊNCIA NATIVA

Mensagens de rede repetidas ou retries automáticos de requisições poderiam gerar processamento duplicado ou inconsistências.

**Mecanismo de Idempotência:**
Antes de aplicar mutações nos slots de destino, a função verifica se o estado já corresponde ao resultado desejado:
```sql
-- Avalia se todos os slots de destino já têm o time e status corretos
IF v_already_propagated THEN
  RETURN jsonb_build_object(
    'ok', true,
    'sourceSlotId', p_slot_id,
    'idempotent', true,
    'updatedCount', 0,
    'message', 'Resultado já havia sido propagado anteriormente (idempotente)'
  );
END IF;
```
Se o resultado já foi propagado, a função retorna imediatamente sucesso com flag `idempotent: true`, liberando locks sem executar escritas no disco.

---

## 4. EVIDÊNCIA DE VALIDAÇÃO CONCORRENTE NO POSTGRESQL REAL

Na **Prova 8** do script de homologação (`scripts/test-postgres-transactions.sh`):
- Duas transações reais foram disparadas simultaneamente em background contra o PostgreSQL:
  ```bash
  run_sql "SELECT public.rpc_propagate_slot_outcome(...);" > /tmp/conc1.log 2>&1 &
  run_sql "SELECT public.rpc_propagate_slot_outcome(...);" > /tmp/conc2.log 2>&1 &
  wait $PID1
  wait $PID2
  ```
- **Resultado:**
  - Ambas retornaram `"ok": true`.
  - Zero ocorrências de `deadlock detected`.
  - Estado final do slot determinístico e consistente.

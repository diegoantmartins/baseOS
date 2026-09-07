# Concorrência e Idempotência no Runtime (Fase 4.8)

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Concurrency & Idempotency  
**Documento:** `IDEMPOTENCY-AND-CONCURRENCY.md`  
**Status:** Homologado

---

## 1. O Problema da Concorrência em Torneios Esportivos

Em aplicações de gestão esportiva em tempo real:
- Dois mesários ou árbitros podem tentar finalizar a mesma partida simultaneamente.
- Um operador pode reenviar formulários de encerramento de partida em rápida sucessão devido a oscilações de conexão.
- Processos em background podem reexecutar reconciliação de chaveamento enquanto uma partida está sendo salva.

Sem garantias rigorosas de idempotência e isolamento transacional, ocorrem:
1. **Duplicação de Partidas**: Dois registros de `Match` criados para a mesma "Final".
2. **Inconsistência de Chaveamento**: Um slot apontando para o Match $A$ enquanto outro componente referencia o Match $B$.
3. **Propagação Corrompida**: Vencedores propagados duas vezes para lados opostos do mesmo slot.

---

## 2. As Soluções Arquiteturais Adotadas

### 2.1. Idempotência em `rpc_propagate_slot_outcome`
Ao receber uma requisição de propagação de resultado:
1. A RPC verifica o status atual do slot de origem.
2. Se o slot de origem já estiver com `status = 'completed'` e o resultado (vencedor/perdedor) já estiver refletido nos slots-alvo, a RPC não falha nem duplica dados.
3. Retorna imediatamente:
   ```json
   {
     "ok": true,
     "idempotent": true,
     "sourceSlotId": "SLOT-SF1",
     "updatedCount": 0,
     "message": "Resultado do slot já foi propagado anteriormente"
   }
   ```

### 2.2. Idempotência em `rpc_materialize_slot_match`
Ao receber uma requisição de materialização:
1. Adquire `FOR UPDATE` no registro de `competition_match_slots`.
2. Se `v_slot.match_id IS NOT NULL`, retorna o ID existente com status idempotente:
   ```json
   {
     "ok": true,
     "matchId": "match-uuid-existente",
     "alreadyMaterialized": true,
     "message": "Partida já materializada e vinculada ao slot"
   }
   ```
3. Se o slot ainda não tiver partida, cria a partida e vincula `match_id` no slot.

### 2.3. Isolamento e Bloqueio Pessimista (`FOR UPDATE`)
A materialização é uma operação de escrita crítica. O uso de `FOR UPDATE` serializa requisições concorrentes sobre a mesma linha de slot, transformando potenciais conflitos de chave única em leituras seguras pós-commit.

### 2.4. Barreiras Físicas no Esquema do Banco (PostgreSQL Constraints)
Para blindar o sistema contra bugs de aplicação ou comandos diretos no banco:
- `uq_matches_competition_slot_id`: Impede múltiplos `matches` com o mesmo `(competition_id, slot_id)`.
- `uq_slots_match_id`: Impede que múltiplos slots apontem para o mesmo `match_id`.
- `fk_matches_competition_match_slot`: Garante integridade referencial contextualizada pela competição.

---

## 3. Matriz de Cenários e Respostas do Sistema

| Cenário | Comportamento do Runtime | Resultado no Banco | Código / Status |
| :--- | :--- | :--- | :--- |
| **Dois cliques rápidos no botão "Finalizar Súmula"** | Primeira chamada propaga e materializa; segunda chamada detecta `alreadyMaterialized` | Exatamente 1 Match criado | `alreadyMaterialized: true`, HTTP 200 |
| **Materialização de slot com time A pendente** | RPC valida status dos participantes e aborta imediatamente | Nenhuma alteração | `PARTICIPANT_UNRESOLVED` (ERRCODE 22023) |
| **Tentativa de materializar com time "TBD-1"** | Defesa anti-fake team acionada na RPC | Nenhuma alteração | `ARTIFICIAL_TEAM_REJECTED` (ERRCODE 22023) |
| **Tentativa de materializar time não inscrito** | RPC valida existência em `competition_teams` | Nenhuma alteração | `TEAM_NOT_ENROLLED` (ERRCODE 23503) |
| **Inserção manual de partida duplicada via SQL** | PostgreSQL intercepta violação de índice único | Rollback da transação | Violates `uq_matches_competition_slot_id` |
| **Reconciliação disparada após queda de servidor** | Localiza slots elegíveis e materializa apenas os pendentes | Partidas pendentes criadas | Reconciliação com sucesso |

---

## 4. Evidência Experimental

No teste de homologação real (`scripts/test-runtime-postgres.sh`):
- **Prova 2**: Chamadas consecutivas de materialização geraram exatamente 1 Match para o `SLOT-SF1`.
- **Prova 6**: Tentativa direta de inserção SQL com duplicidade de `slot_id` foi rejeitada pelo PostgreSQL com erro `duplicate key value violates unique constraint "uq_matches_competition_slot_id"`.
- **Prova 7**: Repetição de propagação e materialização retornou status idempotente (`idempotent: true`, `alreadyMaterialized: true`) sem mutações indesejadas.

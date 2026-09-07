# PROGRESSION-PERSISTENCE: Persistência e Execução de Rotas de Progressão

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Status:** ESPECIFICAÇÃO DE PERSISTÊNCIA CONCLUÍDA — SEM ALTERAÇÃO DE CÓDIGO  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. O CONCEITO DE PROGRESSÃO NO BASEOS

No BaseOS, a **progressão** é o mecanismo determinístico que conecta o desfecho esportivo de um confronto anterior ao participante de um confronto posterior.

A auditoria identificou que o código legado em `src/services/playoffsService.ts` resolvia o avanço através de caminhos hardcoded no código TypeScript (`quartas[0]` $\to$ `semis[0].teamA`, etc.).

Na nova arquitetura, a progressão é **100% declarativa** e suporta qualquer desenho de torneio (chave simples, repescagem, disputa de 3º lugar, play-in preliminar e formatos multicamadas).

---

## 2. PERSISTÊNCIA DA CONFIGURAÇÃO DE PROGRESSÃO

A definição das rotas de avanço reside na configuração canônica da fase (`StageDefinition.progressionRoutes` ou `progression` dentro de `competitions.config` / `rules_snapshot`):

### 2.1. Contrato da Rota de Progressão
```typescript
export interface ProgressionRoute {
  sourceSlotId: string;
  onWinner?: ProgressionTarget;
  onLoser?: ProgressionTarget;
}

export interface ProgressionTarget {
  targetStageId: string;
  targetRoundId: string;
  targetSlotId: string;
  targetSide: 'A' | 'B';
}
```

### 2.2. Exemplo Real Persistido no Banco (JSONB em `competitions.config`):
Para a partida do Play-in 1 (onde o 5º Geral enfrenta o 12º Geral, e o vencedor avança para enfrentar o 4º Geral nas Quartas 2):
```json
{
  "sourceSlotId": "PI-1",
  "onWinner": {
    "targetStageId": "knockout",
    "targetRoundId": "qf",
    "targetSlotId": "QF-2",
    "targetSide": "B"
  }
}
```
E para a Semifinal 1 (onde o vencedor vai para a Final e o perdedor vai para a Disputa de 3º Lugar):
```json
{
  "sourceSlotId": "SF-1",
  "onWinner": {
    "targetStageId": "knockout",
    "targetRoundId": "final",
    "targetSlotId": "FINAL-1",
    "targetSide": "A"
  },
  "onLoser": {
    "targetStageId": "knockout",
    "targetRoundId": "third_place",
    "targetSlotId": "BRONZE-1",
    "targetSide": "A"
  }
}
```

---

## 3. MECANISMO DE EXECUÇÃO E PROPAGAÇÃO NO RUNTIME

Quando uma partida é finalizada ou sua súmula é homologada, a propagação ocorre de forma estritamente transacional através do fluxo abaixo:

```text
               Homologação de Partida no Banco
                              │
                              ▼
        CompetitionRulesService.getCanonicalMatchResult
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   Resultado Não-Canônico            Resultado Canônico Válido
    (partida incompleta)             (isCompleted = true, winnerId)
             │                                 │
     Nenhuma ação disparada                    ▼
                            Busca ProgressionRoute(sourceSlotId)
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                           onWinner Alvo               onLoser Alvo
                                 │                           │
                                 ▼                           ▼
                        UPDATE match_slots          UPDATE match_slots
                      (targetSlotId, side 'B')     (targetSlotId, side 'A')
```

### 3.1. Transação PostgreSQL de Propagação (`rpc_propagate_slot_outcome`)
Para garantir integridade ACID concorrente, a propagação é executada por uma função transacional no banco de dados:

```sql
CREATE OR REPLACE FUNCTION public.rpc_propagate_slot_outcome(
  p_competition_id TEXT,
  p_source_slot_id TEXT,
  p_winner_id TEXT,
  p_loser_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_route JSONB;
  v_target_winner JSONB;
  v_target_loser JSONB;
BEGIN
  -- 1. Obtém a rota configurada para o slot de origem
  SELECT progression_route INTO v_route
  FROM public.competition_match_slots
  WHERE competition_id = p_competition_id AND slot_id = p_source_slot_id;

  IF v_route IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'message', 'Nenhuma rota de progressão configurada.');
  END IF;

  v_target_winner := v_route->'onWinner';
  v_target_loser := v_route->'onLoser';

  -- 2. Propaga Vencedor (se houver rota e vencedor válido)
  IF v_target_winner IS NOT NULL AND p_winner_id IS NOT NULL THEN
    IF (v_target_winner->>'targetSide') = 'A' THEN
      UPDATE public.competition_match_slots
      SET resolved_team_a_id = p_winner_id,
          participant_a_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id 
        AND slot_id = (v_target_winner->>'targetSlotId');
    ELSE
      UPDATE public.competition_match_slots
      SET resolved_team_b_id = p_winner_id,
          participant_b_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id 
        AND slot_id = (v_target_winner->>'targetSlotId');
    END IF;
  END IF;

  -- 3. Propaga Perdedor (se houver rota e perdedor válido)
  IF v_target_loser IS NOT NULL AND p_loser_id IS NOT NULL THEN
    IF (v_target_loser->>'targetSide') = 'A' THEN
      UPDATE public.competition_match_slots
      SET resolved_team_a_id = p_loser_id,
          participant_a_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id 
        AND slot_id = (v_target_loser->>'targetSlotId');
    ELSE
      UPDATE public.competition_match_slots
      SET resolved_team_b_id = p_loser_id,
          participant_b_status = 'resolved',
          updated_at = NOW()
      WHERE competition_id = p_competition_id 
        AND slot_id = (v_target_loser->>'targetSlotId');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
```

---

## 4. INTEGRIDADE DE GRAFO ACÍCLICO (DAG) E PREVENÇÃO DE CICLOS

### 4.1. Garantia no Domínio (SSOT)
O `StageGraphEngine` (implementado e validado com testes na Fase 4.4.1) já realiza a ordenação topológica e verificação formal de ciclos em memória antes de qualquer fase ser salva no banco. Se uma configuração contiver um ciclo (ex: Slot 1 depende de Slot 2, e Slot 2 depende de Slot 1), a configuração é rejeitada antes da persistência.

### 4.2. Garantia na Persistência
Para evitar corrupção por edições manuais ou concorrentes, a transação impede auto-referências:
```sql
ALTER TABLE public.competition_match_slots
  ADD CONSTRAINT chk_slot_not_self_progression
  CHECK (progression_route IS NULL OR (progression_route->'onWinner'->>'targetSlotId') <> slot_id);
```

---

## 5. TRATAMENTO DE REVERSÃO E CORREÇÃO DE SÚMULA (ROLLBACK DE PROGRESSÃO)

O que acontece se uma partida foi homologada por engano com o vencedor errado, ou se uma súmula foi cancelada para retificação?

### Regra Esportiva de Desfazimento (Progression Rollback):
1. O sistema verifica se o slot de destino (`targetSlotId`) já iniciou sua partida:
   - **Se o jogo de destino AINDA NÃO iniciou (`status = 'scheduled'` ou sem partida):**
     O sistema reverte o slot de destino para `resolved_team_id = NULL` e `status = 'unresolved'`, permitindo a retificação do jogo de origem.
   - **Se o jogo de destino JÁ INICIOU ou foi FINALIZADO:**
     A retificação do jogo anterior é **estritamente bloqueada no banco** até que a organização desfaça o jogo subsequente, impedindo anomalias temporais no histórico do campeonato.

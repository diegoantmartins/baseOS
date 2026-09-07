# Runtime de Progressão e Resolução de Participantes (Fase 4.8)

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Progression Orchestration  
**Documento:** `PROGRESSION-RUNTIME.md`  
**Status:** Homologado

---

## 1. Visão Geral

O runtime de progressão é responsável por transformar o desfecho de eventos esportivos ou o fechamento de fases de grupos em avanços estruturais na árvore da competição.

A progressão no BaseOS opera sob os seguintes pilares:
1. **Desacoplamento Funcional**: Os cálculos de quem avança e para onde avança são puramente matemáticos (`GenericProgressionEngine` e `ParticipantResolutionEngine`).
2. **Persistência Atômica**: As mutações na árvore de slots são persistidas via RPCs PostgreSQL com transacionalidade ACID.
3. **Resolução Preguiçosa e Sob Demanda**: Slots futuros aguardam seus predecessores sem a necessidade de criar equipes falsas como `TBD` ou `__BYE__`.

---

## 2. Tipos de Progressão Suportados pelo Runtime

### 2.1. Progressão Direta de Chaveamento (`winner-advances` / `loser-advances`)
- **Origem:** Slot predecessor (`SLOT-SF1`).
- **Gatilho:** Finalização da partida vinculada.
- **Mapeamento:** Rota declarativa `progressionRoute`:
  ```json
  {
    "onWinner": { "targetSlotId": "SLOT-F1", "targetSide": "A" },
    "onLoser": { "targetSlotId": "SLOT-3RD", "targetSide": "A" }
  }
  ```
- **Ação:** O `GenericProgressionEngine` avalia o resultado canônico e emite `AdvancementEntry(type = 'winner-advances', targetSlotId = 'SLOT-F1', teamId = 'team-1', targetSide = 'A')`. A RPC `rpc_propagate_slot_outcome` atualiza o slot destino.

### 2.2. Resolução por Classificação de Grupo (`group-position`)
- **Origem:** Fechamento de jogos da fase de grupos.
- **Gatilho:** Conclusão de partidas da rodada ou cálculo de tabela.
- **Referência do Participante:**
  ```json
  {
    "type": "group-position",
    "stageId": "stage-groups",
    "groupIndex": 0,
    "position": 1
  }
  ```
- **Ação:** O runtime constrói o `ResolutionContext` com as classificações oficiais calculadas pelo `ScoringEngine` e `TieBreakEngine`. O `ParticipantResolutionEngine` localiza a equipe no índice correspondente e resolve o slot para `status = 'resolved'`.

### 2.3. Resolução por Ranking Geral Multi-Grupo (`overall-ranking`)
- **Origem:** Ranking unificado entre múltiplos grupos (ex.: Fase de Grupos -> Play-In / QF).
- **Gatilho:** Conclusão da fase de grupos.
- **Referência do Participante:**
  ```json
  {
    "type": "overall-ranking",
    "stageId": "stage-groups",
    "position": 5
  }
  ```
- **Ação:** O runtime invoca o `OverallStandingsEngine.computeOverallStandings()` aplicando as regras de ordenação e desempate configuradas em `CompetitionConfig`. O `ParticipantResolutionEngine` extrai a equipe na posição correspondente ($N$-ésima posição geral) e popula o slot.

### 2.4. Avanço Automático por BYE (`bye-advance`)
- **Origem:** Chaveamento assimétrico (ex.: 5 equipes em chave de 8).
- **Gatilho:** Inicialização da rodada ou avanço do chaveamento.
- **Referência do Participante:** Um dos participantes possui `isBye = true` ou `reference.type = 'bye'`.
- **Regra de Ouro (Gate 4):** O runtime **não** contém lógica de desvio (`if (isBye) advance()`). Ele invoca `GenericProgressionEngine.evaluate()`, que reconhece o BYE e emite uma entrada de avanço automático (`AdvancementEntry(type = 'bye-advance')`), que é então propagada de maneira uniforme.

---

## 3. Pipeline de Execução de `handleMatchCompleted`

```typescript
// src/services/competitionRuntimeService.ts

async handleMatchCompleted(competitionId: string, matchId: string): Promise<ProgressionRuntimeResult> {
  // 1. Resolução do Resultado Canônico
  const { match, canonicalResult } = await this.resolveMatchResult(competitionId, matchId);
  if (!canonicalResult.isCompleted || !canonicalResult.winnerTeamId) {
    return { ok: false, error: 'MATCH_NOT_COMPLETED' };
  }

  // 2. Identificação do Slot de Origem
  const sourceSlot = await this.findSourceSlot(competitionId, matchId, match);

  // 3. Avaliação Pura de Progressão
  const advancements = await this.resolveProgression(competitionId, sourceSlot, canonicalResult);

  // 4. Persistência Transacional via RPC
  const propagation = await this.persistProgression(competitionId, sourceSlot.slotId, canonicalResult);

  // 5. Resolução de Participantes e Materialização de Slots Elegíveis
  const targetSlotIds = advancements.map(a => a.targetSlotId);
  const affected = await this.processAffectedSlots(competitionId, targetSlotIds);

  return {
    ok: true,
    sourceSlotId: sourceSlot.slotId,
    advancements,
    affectedSlots: affected.affectedSlots,
    materializedMatches: affected.materializedMatches,
  };
}
```

---

## 4. Recuperação e Reconciliação (`reconcileCompetitionRuntime`)

Em situações de falha de rede, reinício do servidor ou crash durante a execução, o runtime fornece o método `reconcileCompetitionRuntime(competitionId)`.

Este método:
1. Localiza todos os slots da competição.
2. Identifica partidas já concluídas cujos slots não foram marcados como `completed`.
3. Executa a propagação pendente.
4. Identifica slots que já possuem ambos os participantes resolvidos mas não possuem `match_id`.
5. Materializa atomicamente as partidas pendentes via `materializeEligibleMatches()`.
6. Retorna um relatório completo de reconciliação para auditoria do operador.

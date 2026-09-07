# BaseOS — GenericProgressionEngine: Implementação e Resolução de Avanços

**Data:** 05/09/2026  
**Módulo:** `src/services/genericProgressionEngine.ts`  
**Objetivo:** Especificação de como os resultados de partidas são propagados através de rotas de progressão.

---

## 1. Princípio de Autoridade Esportiva

O `GenericProgressionEngine` opera sob o princípio estrito de que:
> **A autoridade esportiva do resultado reside exclusivamente em `CanonicalMatchResult`.**

O motor de progressão:
- **NUNCA** recalcula parciais de sets;
- **NUNCA** soma ou recalcula pontos de sets;
- **NUNCA** altera ou tenta redefinir quem venceu a partida;
- **NUNCA** modifica posições de classificação.

Ele atua estritamente como um **roteador funcional de participantes** entre slots de origem e slots de destino.

---

## 2. Contrato de Rota de Progressão (`ProgressionRoute`)

```typescript
export interface ProgressionTarget {
  targetStageId: string;
  targetRoundId: string;
  targetSlotId: string;
  targetSide: 'A' | 'B';
}

export interface ProgressionRoute {
  sourceSlotId: string;
  onWinner?: ProgressionTarget;
  onLoser?: ProgressionTarget;
}
```

---

## 3. Fluxo de Propagação

Para cada rota registrada:

1. **Inspeção de Origem**:
   - Se o slot de origem tiver um participante em folga esportiva (`isBye = true`), o participante do lado oposto é considerado vencedor automaticamente (`type: 'bye-advance'`).
   - Caso contrário, consulta o mapa de resultados canônicos homologados (`context.canonicalResultsBySlot[sourceSlotId]`).

2. **Verificação de Conclusão**:
   - Se a partida não tiver ocorrido, for inválida ou não estiver completada (`!result.isCompleted || !result.winnerId`), a rota é contabilizada como pendente (`pendingRoutesCount++`), mantendo o slot de destino com status `'unresolved'`.
   - Se a partida estiver concluída e homologada, extrai `result.winnerId` e `result.loserId`.

3. **Materialização no Destino**:
   - Vencedor é roteado para `onWinner.targetSlotId` no lado `onWinner.targetSide`.
   - Perdedor (quando aplicável, ex: disputa de 3º lugar) é roteado para `onLoser.targetSlotId` no lado `onLoser.targetSide`.
   - O estado do participante no slot de destino é atualizado para:
     - `status: 'resolved'`
     - `resolvedTeamId: winnerId`
     - `isBye: false`

---

## 4. Suporte a Estado Parcial e Idempotência

- **Estado Parcial**: Se a Semi 1 terminou e a Semi 2 ainda está em andamento, a Grande Final exibe Participant A resolvido e Participant B pendente. O sistema nunca bloqueia a representação da competição por conta de jogos pendentes.
- **Idempotência**: A re-avaliação do grafo com novos resultados concluídos preserva as resoluções anteriores sem alterar slots inalterados.

# BaseOS — Fase 4.4.1: Walkthrough da Implementação

**Data:** 05/09/2026  
**Fase:** 4.4.1  
**Status Oficial:** FASE 4.4.1 — IMPLEMENTAÇÃO DOS CONTRATOS E ENGINES PUROS CONCLUÍDA E HOMOLOGADA  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. Baseline Pré-Implementação

Antes de qualquer modificação no código, os testes e ferramentas de qualidade foram executados no ambiente real:

- **Vitest**: 81 arquivos de teste, 673 testes passando, 0 falhas (159.25s).
- **TypeScript (`npx tsc --noEmit`)**: 0 erros.
- **ESLint (`npm run lint`)**: 0 erros, 1 warning (`DrawArenaCanvas.tsx`).
- **Vite Build (`npm run build`)**: Concluído com sucesso em 53.54s.

---

## 2. Implementação: Arquivos Criados e Modificados

### Contratos e Tipos Modificados:
- `src/types/competitionConfig.ts`:
  - Adicionados `RoundDefinition`, `ParticipantReference`, `ParticipantResolutionStatus`, `ParticipantSlotState`, `ProgressionRoute`, `ProgressionRule`, `MatchSlot`, `PairingDefinition` e helpers `getStageId`, `createByeParticipantSlot`, `createResolvedParticipantSlot`, `createUnresolvedParticipantSlot`.

### Motores Puros Implementados:
- `src/services/stageGraphEngine.ts`: Classe `StageGraph`, método estático `StageGraph.validate()`, detecção de ciclos 3-color DFS, catálogo de erros `StageEngineError` e ordenação topológica.
- `src/services/participantResolutionEngine.ts`: Resolução pura para todos os 8 tipos de referência esportiva, com suporte a BYE e estados `resolved`, `unresolved`, `invalid`, `bye`.
- `src/services/genericPairingEngine.ts`: Emparelhamento puro determinístico com estratégias `high-low`, `same-position-cross`, `seeded-bracket` (com potências de 2 e sementes opostas), `round-robin` (Berger circle) e `custom`.
- `src/services/genericProgressionEngine.ts`: Propagação funcional orientada a `CanonicalMatchResult`, chaveamento parcial e idempotência.

### Testes Unitários Implementados:
- `src/test/stageGraph.test.ts` (10 testes)
- `src/test/participantResolution.test.ts` (8 testes)
- `src/test/genericPairing.test.ts` (8 testes)
- `src/test/genericProgression.test.ts` (4 testes)
- `src/test/stageFormatScenarios.test.ts` (7 testes)

---

## 3. Resumo dos Contratos

```text
StageDefinition { id, type, name, order, rounds, pairing, participantFeed, progressionRoutes }
       ↓
RoundDefinition { roundId, stageId, order, name, slotsCount }
       ↓
MatchSlot { slotId, stageId, roundId, position, participantA, participantB, progressionRoute }
       ↓
ParticipantReference { resolved-team | group-position | overall-ranking | stage-position | match-winner | match-loser | seed | bye }
       ↓
ParticipantSlotState { side, reference, status, resolvedTeamId, displayPlaceholder, isBye }
       ↓
ProgressionRoute { sourceSlotId, onWinner: ProgressionTarget, onLoser: ProgressionTarget }
```

---

## 4. Pairing: Algoritmos Implementados

1. **High-Low**: Emparelha extremidades ($1 \times N, 2 \times (N-1) \dots$ ou $5 \times 12, 6 \times 11, 7 \times 10, 8 \times 9$).
2. **Same-Position Cross**: Cruzamento de 1ºs e 2ºs colocados entre $G$ grupos ($1ºA \times 2ºB, 1ºB \times 2ºA$).
3. **Seeded Bracket**: Algoritmo recursivo canônico de sementes para potências de 2 ($[1, 8], [4, 5], [2, 7], [3, 6]$), garantindo que os favoritos só se enfrentem na final.
4. **Round Robin**: Método do círculo de Berger em turno único com rotação estável e folga (BYE) em caso de número ímpar.
5. **Custom**: Emparelhamento declarativo livre.

---

## 5. Progression: Resolução de Referências

- O `GenericProgressionEngine` recebe `CanonicalMatchResult` já homologado.
- Nunca recalcula placar, sets ou pontuação da partida.
- Roteia `winnerId` para `onWinner.targetSlotId` no lado `onWinner.targetSide`.
- Roteia `loserId` para `onLoser.targetSlotId` (ex: disputa de 3º lugar).
- Partidas pendentes não impedem a propagação das partidas já finalizadas (suporte completo a estado parcial).

---

## 6. DAG: Detecção de Ciclos

Implementado através de busca em profundidade com coloração em 3 estados (UNVISITED = 0, VISITING = 1, VISITED = 2):
- **Ciclo Direto (`DIRECT_CYCLE`)**: $A \to A$;
- **Ciclo Indireto (`INDIRECT_CYCLE`)**: $A \to B \to A$;
- **Ciclo Complexo (`COMPLEX_CYCLE`)**: $A \to B \to C \to \dots \to A$.
- Em caso de aciclicidade, fornece a `topologicalOrder` garantida dos estágios.

---

## 7. Tratamento Conceitual de BYE

- Não cria equipes fictícias com nomes como "BYE" na tabela `teams`;
- Não gera registros falsos de `matches`;
- Se um slot possui `participantB.isBye = true` e `participantA` resolvido, `GenericProgressionEngine` e `ParticipantResolutionEngine` reconhecem `participantA` como qualificado por avanço direto (`bye-advance`).

---

## 8. Demonstração dos Cenários Esportivos

### 8.1 Cenário de 12 Equipes
- 4 grupos de 3 equipes;
- Ranking geral intergrupos apurado pelo `OverallStandingsEngine` via estratégia `by-group-position-first`;
- Posições 1 a 4 avançam direto para as Quartas de Final;
- Posições 5 a 12 disputam o Play-In via pareamento High-Low:
  - $5 \times 12$
  - $6 \times 11$
  - $7 \times 10$
  - $8 \times 9$
- **Validação comprovada em teste**: Nenhum confronto ou time hardcoded; os jogos resultaram puramente do algoritmo!

### 8.2 Cenário de 6 Equipes
- 2 grupos de 3 equipes;
- 1ºs e 2ºs cruzam em semifinais ($1ºA \times 2ºB$ e $1ºB \times 2ºA$);
- Vencedores disputam a Grande Final.

### 8.3 Chave de 5 Equipes com 3 BYEs
- Chave de 8 slots;
- Seeds 1, 2 e 3 enfrentam BYE e avançam automaticamente para as semifinais;
- Seed 4 e Seed 5 disputam a única partida real das quartas de final;
- Sem nenhuma partida fantasma ou equipe fictícia criada.

---

## 9. Limitações e Fora de Escopo da Fase 4.4.1

Conforme planejado e aprovado:
1. **Sem persistência relacional**: `MatchSlot` e `StageGraph` rodam estritamente em memória nesta fase.
2. **Sem migrations / DDL**: Colunas `team_a_id` e `team_b_id` permanecem inalteradas no banco até a Fase 4.5.
3. **Sem integração visual**: Telas de Sorteio, Jogos e Chaveamento continuam usando as rotinas vigentes.
4. **Sem substituição de `playoffsService.ts`**: Mantido para validação comparativa pré-migração.

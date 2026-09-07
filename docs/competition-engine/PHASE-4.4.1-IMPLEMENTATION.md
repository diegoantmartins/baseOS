# BaseOS — Fase 4.4.1: Implementação dos Contratos de Domínio e Engines Puros

**Data:** 05/09/2026  
**Fase:** 4.4.1  
**Status:** IMPLEMENTADO EM MEMÓRIA  
**Escopo:** Camada de Domínio Puro, Algoritmos Determinísticos, In-Memory, TDD  

---

## 1. Visão Geral

A Fase 4.4.1 materializou a primeira camada executável da nova arquitetura de competição do BaseOS, conforme aprovado no blueprint da Fase 4.4:

```text
CompetitionConfig (SSOT)
       ↓
Stage Graph (DAG)
       ↓
Participant Feed
       ↓
Pairing Engine
       ↓
Match Slot
       ↓
Canonical Result
       ↓
Progression Engine
       ↓
Next Match Slot
       ↓
Next Stage
```

Esta implementação foi desenvolvida com **rigor estrito de isolamento**:
- **100% em memória**: Sem chamadas de banco, sem novas migrations, sem alterações no schema do PostgreSQL/Supabase;
- **Zero UI**: Nenhuma modificação em componentes visuais (`MatchesPage.tsx`, `DrawPage.tsx`, `TournamentBracket.tsx`);
- **Preservação de Legados**: `playoffsService.ts` e `competitionBracketService.ts` foram mantidos intactos para comparação controlada;
- **Independência de Torneio**: Nenhum formato ou algoritmo hardcoded; nenhum campeonato específico (incluindo Voltz) é referenciado no código do motor.

---

## 2. Artefatos de Código Criados e Modificados

| Arquivo | Camada | Responsabilidade |
| :--- | :--- | :--- |
| `src/types/competitionConfig.ts` | Tipos / Contratos | Definições de `RoundDefinition`, `ParticipantReference`, `ParticipantSlotState`, `ProgressionRoute`, `ProgressionRule`, `MatchSlot`, `PairingDefinition` e helpers. |
| `src/services/stageGraphEngine.ts` | Serviço de Domínio | Modelagem do Grafo de Estágios, validador de DAG, detecção de ciclos (direto, indireto e complexo) e ordenação topológica. |
| `src/services/participantResolutionEngine.ts` | Serviço de Domínio | Resolução funcional de referências esportivas (`resolved-team`, `group-position`, `overall-ranking`, `match-winner`, etc.) e tratamento nativo de BYE. |
| `src/services/genericPairingEngine.ts` | Serviço de Domínio | Emparelhamento puro determinístico (`high-low`, `same-position-cross`, `seeded-bracket`, `round-robin` Berger e `custom`). |
| `src/services/genericProgressionEngine.ts` | Serviço de Domínio | Propagação de avanços a partir de `CanonicalMatchResult` para alvos declarativos, com suporte a chaveamento parcial e re-avaliação idempotente. |
| `src/test/stageGraph.test.ts` | Teste Unitário | 10 testes de DAG: grafos lineares, bifurcados, convergentes, ciclos diretos/indiretos/complexos e detecção de erros. |
| `src/test/participantResolution.test.ts` | Teste Unitário | 8 testes de resolução de participantes para os 8 tipos de referência e estados `resolved`, `unresolved`, `invalid`, `bye`. |
| `src/test/genericPairing.test.ts` | Teste Unitário | 8 testes de emparelhamento determinístico (high-low, cross de grupos, bracket olímpico com BYEs, Berger e idempotência). |
| `src/test/genericProgression.test.ts` | Teste Unitário | 4 testes de progressão: consumo de CanonicalMatchResult, estado parcial, BYE e idempotência. |
| `src/test/stageFormatScenarios.test.ts` | Teste Unitário | 7 testes cobrindo cenários de 12 equipes (4x3 grupos $\to$ play-in 5..12), 6 equipes, chaves de 8/4/2 e 5 equipes com 3 BYEs. |

---

## 3. Conformidade com as Regras de Domínio

1. **SSOT Único**: `CompetitionConfig` continua sendo a única fonte de verdade; nenhum `CompetitionConfigV2` foi criado.
2. **Identidade Estável**: `stageId`, `roundId` e `slotId` possuem strings unívocas; posições de array (`array[0]`) nunca são usadas para identificar semanticamente elementos esportivos.
3. **Consumo Exclusivo de CanonicalMatchResult**: O `GenericProgressionEngine` nunca recalcula placares, sets ou vencedores.
4. **Sem Equipes Fictícias**: O tratamento de folgas esportivas (`BYE`) é nativo no motor de pareamento e resolução, eliminando o antipadrão de inserir registros fictícios de time no banco.
5. **Determinismo Absoluto**: Zero uso de `Math.random()` ou `Date.now()` para tomada de decisões esportivas.

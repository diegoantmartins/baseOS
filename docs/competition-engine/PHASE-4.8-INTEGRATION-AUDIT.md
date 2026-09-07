# BaseOS — Fase 4.8: Auditoria de Integração e Mapa Runtime

**Data:** 05/09/2026  
**Fase:** 4.8 — Runtime Integration & Progression Engine  
**Documento:** `docs/competition-engine/PHASE-4.8-INTEGRATION-AUDIT.md`  
**Status:** Concluído / Homologado para Implementação  

---

## 1. Contexto e Objetivo

As Fases 4.1 a 4.7 estabeleceram o `CompetitionConfig` como Single Source of Truth (SSOT), criaram os motores puros de domínio (`StageGraphEngine`, `ParticipantResolutionEngine`, `GenericPairingEngine`, `GenericProgressionEngine`, `ScoringEngine`, `TieBreakEngine`, `OverallStandingsEngine`), modelaram a persistência relacional (`competition_stages`, `competition_rounds`, `competition_match_slots`) e implementaram transações atômicas ACID no PostgreSQL (`save_stage_draw_and_slots`, `rpc_propagate_slot_outcome`).

O objetivo desta auditoria é mapear com precisão cirúrgica onde cada conceito reside no repositório real antes de qualquer linha de implementação do runtime orquestrador, garantindo que:
1. Nenhum motor seja recriado ou duplicado.
2. `MatchSlot` (intenção estrutural) e `Match` (evento esportivo real) permaneçam estritamente separados.
3. Não haja persistência dupla nem competição entre o fluxo novo e o legado.
4. Nenhuma equipe fictícia (`TBD`, `__BYE__`, `UNKNOWN`) seja injetada no sistema.

---

## 2. Respostas Obrigatórias do Mapa de Integração

### 7.1 Onde nasce um Stage?
- **Definição Declarativa (SSOT):** No modelo de configuração `CompetitionConfig.stageDefinitions` (`src/types/competitionConfig.ts`).
- **Validação de Domínio:** Em `StageGraphEngine` (`src/services/stageGraphEngine.ts`), que valida o grafo como um DAG (Directed Acyclic Graph) e calcula a ordenação topológica.
- **Persistência Relacional:** Na tabela `competition_stages` via `dataAccess.saveStageDrawAndSlots` (chamando a RPC `save_stage_draw_and_slots` no PostgreSQL ou `LocalStorageAdapter` em desenvolvimento local), além de `dataAccess.createCompetitionStage`.
- **Contraste com o Legado:** No modelo legado não havia entidade nem tabela de estágio; existia apenas uma coluna `phase` (ex: `'groups'`, `'quarterfinals'`, `'semifinals'`, `'finals'`) solta nas tabelas `matches` e `draws`.

### 7.2 Onde são persistidos os Rounds?
- **Tabela Relacional:** `competition_rounds`.
- **Persistência Atômica:** Persistidos em lote atomicamente junto com o estágio e slots via `dataAccess.saveStageDrawAndSlots` (linhas 1485–1525 em `src/services/dataAccess.ts` e linhas 307–359 na migration `20260905000007_competition_format_transactions.sql`).
- **Operações Granulares:** `dataAccess.createCompetitionRound`, `dataAccess.listCompetitionRounds(stageRowId)`.

### 7.3 Onde são persistidos os MatchSlots?
- **Tabela Relacional:** `competition_match_slots`.
- **Persistência Transacional:** Persistidos via `dataAccess.saveStageDrawAndSlots` e manipulados via `dataAccess.createMatchSlot`, `dataAccess.updateMatchSlot`, `dataAccess.listMatchSlots(competitionId)`.
- **Colunas Fundamentais:**
  - `participant_a_reference` / `participant_b_reference`: JSONB imutável com a intenção estrutural (8 tipos canônicos: `resolved-team`, `group-position`, `overall-ranking`, `stage-position`, `match-winner`, `match-loser`, `seed`, `bye`).
  - `participant_a_status` / `participant_b_status`: status da ponta (`unresolved`, `resolved`, `invalid`, `bye`).
  - `resolved_team_a_id` / `resolved_team_b_id`: UUID/ID real da equipe resolvida (NULL enquanto não qualificada).
  - `match_id`: ID da partida esportiva real (NULL até que ambos os participantes estejam resolvidos).
  - `progression_route`: rotas `onWinner` e `onLoser` para avanço direcionado.

### 7.4 Onde um Match é criado?
- **Modelo Legado:**
  - Em `DrawPage.tsx:309` via `useDrawOperation.ts:109` -> `dataAccess.saveDrawWithMatches`. Cria partidas antecipadamente com placeholders ou IDs provisórios.
  - Em `playoffsService.ts:340` via `generateBracketMatches`.
- **Novo Modelo Relacional (Fase 4.8):**
  - Um `Match` esportivo real (`matches`) **SÓ PODE SER CRIADO** quando `resolvedTeamAId` e `resolvedTeamBId` forem ambos conhecidos, válidos e não nulos, sem nenhuma equipe fictícia.
  - Criado via `dataAccess.createMatch({ competitionId, teamAId, teamBId, phase, round, ... })`.
  - O `match.id` gerado é imediatamente vinculado ao slot correspondente via `dataAccess.updateMatchSlot(slot.id, { matchId: match.id })`.

### 7.5 Onde o resultado oficial entra no sistema?
- **Pontos de Entrada na UI:**
  1. `src/pages/MatchesPage.tsx` (`handleFinalizeMatch` nas linhas 264–320 e modal de validação/homologação nas linhas 940–960).
  2. `src/components/match/LiveScorerDeskModal.tsx` (`handleQuickFinalize` nas linhas 264–295 e finalização por set nas linhas 230–255).
  3. `src/pages/MatchSheetPage.tsx` (registro e assinatura de súmula).
- **Mutação de Dados:** Chamada a `dataAccess.updateMatch(matchId, { status: 'completed' | 'homologated', sets, winnerId, ... })` e `OperationalAuditService.recordMatchResult(...)`.

### 7.6 Onde `CanonicalMatchResult` é produzido?
- **Autoridade Única:** `CompetitionRulesService.getCanonicalMatchResult(competition, match)` em `src/services/competitionRulesService.ts:380-440`.
- **Propriedades Retornadas:** `isValid`, `isCompleted`, `isHomologated`, `winnerId`, `loserId`, `winnerSide`, `setsWonA`, `setsWonB`, `pointsScoredA`, `pointsScoredB`, `setScores`, `isWo`, `isInconsistent`.
- **Princípio:** O runtime consome diretamente este resultado. É estritamente proibido recalcular placares ou inferir vencedores manualmente.

### 7.7 Onde o vencedor e perdedor são determinados?
- **Determinação:** Exclusivamente nos campos `winnerId` e `loserId` retornados por `CanonicalMatchResult`.
- Não existe determinação paralela em controladores, páginas ou adapters.

### 7.8 Onde `GenericProgressionEngine` pode ser conectado?
- **Ponto de Conexão:** No novo serviço de orquestração runtime: `src/services/competitionRuntimeService.ts`.
- **Papel:** Avalia o estado atual dos slots (`MatchSlot[]`) contra os resultados canônicos (`canonicalResultsBySlot`), derivando as rotas de avanço (`AdvancementEntry`: `sourceSlotId`, `targetSlotId`, `targetSide`, `teamId`, `type`).
- Trata nativamente o avanço imediato por `BYE` quando uma ponta for folga esportiva e a outra for equipe resolvida.

### 7.9 Onde `rpc_propagate_slot_outcome` deve ser chamado?
- **Ponto de Chamada:** Em `competitionRuntimeService.propagateSlotResult(competitionId, slotId, canonicalResult)`.
- **Acesso:** Via porta única `dataAccess.propagateSlotOutcome({ competitionId, slotId, winnerTeamId, loserTeamId, matchId })`.
- **Garantias ACID:**
  - Lock pessimista ordenado por ID (`FOR UPDATE`) para eliminar deadlocks em partidas finalizadas simultaneamente.
  - Idempotência total: chamadas repetidas com o mesmo vencedor não duplicam atualizações nem avanços.
  - Atualiza `resolved_team_a_id` / `resolved_team_b_id` nos slots dependentes preservando o `participant_reference` intacto.

### 7.10 Onde o fluxo legado ainda interfere?
- **`src/pages/MatchesPage.tsx` (linhas 276–308):** Ao homologar partida, o código atual invoca `CompetitionBracketService.advancePlayoffBrackets` e chama `dataAccess.updateMatch(adv.id, ...)` em partidas futuras presumidas no array legado de `matches`.
- **Risco:** Se a competição estiver usando o novo modelo de `competition_match_slots`, disparar o avanço legado causará colisão ou atualização incorreta de registros que não pertencem ao chaveamento relacional.
- **Solução:** Condicionar o avanço legado apenas para competições que NÃO possuem `competition_match_slots` persistidos. Para competições com slots, delegar para `CompetitionRuntimeService.handleMatchCompleted`.

### 7.11 Quais componentes podem permanecer temporariamente legados?
- **`DrawPage.tsx` e `useDrawOperation.ts`:** Continuam atendendo o fluxo legado de sorteio com `saveDrawWithMatches` até a Fase 4.10 (Format Builder & Draw Wizard).
- **`playoffsService.ts`:** Permanece como motor em memória de brackets clássicos onde a estrutura relacional de slots ainda não foi instanciada.
- **`TournamentBracket.tsx`:** Permanece para renderização visual do chaveamento existente, podendo consumir slots relacionais quando disponíveis.

### 7.12 Quais são os pontos de risco de dupla persistência?
1. **Dupla Atualização de Partidas Futuras:** O legado tentando atualizar `teamAId` em um `match` pré-criado enquanto o novo runtime tenta criar um novo `Match` a partir de um `MatchSlot` resolvido.
   - *Mitigação:* Isolar estritamente: competições com `competition_match_slots` usam o runtime orquestrador; competições legadas sem slots usam o `CompetitionBracketService.advancePlayoffBrackets`.
2. **Duplicação de Partida ao Materializar Slot:** Dois eventos concorrentes tentando criar `Match` para o mesmo slot resolvido.
   - *Mitigação:* Verificação atômica de `slot.matchId`. Se `slot.matchId` já existir ou se já existir um match com `slotId` / `(competitionId, slotId)`, reutilizar o `matchId` existente.
3. **Idempotência de Resultado:** Submeter novamente a finalização da mesma partida.
   - *Mitigação:* `rpc_propagate_slot_outcome` já retorna `idempotent: true` e `updatedCount: 0` se os dados forem idênticos, não disparando novas materializações.

---

## 3. Matriz de Componentes e Responsabilidades da Fase 4.8

| Componente | Tipo | Responsabilidade na Fase 4.8 |
| :--- | :--- | :--- |
| `CompetitionRuntimeService` | Novo Serviço | Orquestrador runtime puro de coordenação entre engines, dataAccess e RPCs. |
| `StageGraphEngine` | Engine Puro | Validação estrutural de DAG, dependências e ordenação topológica. |
| `ParticipantResolutionEngine` | Engine Puro | Resolução de referências abstratas contra contexto real (times, standings, canonical). |
| `GenericProgressionEngine` | Engine Puro | Avaliação de rotas de avanço (vencedor, perdedor, BYE). |
| `ScoringEngine` | Engine Puro | Cálculo de pontos de partida para classificação (sem regras ad-hoc). |
| `CompetitionRulesService` | Serviço de Regras | Emissão do `CanonicalMatchResult` oficial da partida. |
| `dataAccess.ts` | Adapter Único | Porta exclusiva para `saveStageDrawAndSlots`, `propagateSlotOutcome`, `createMatch`. |
| `rpc_propagate_slot_outcome` | PL/pgSQL RPC | Propagação transacional, atômica, idempotente e thread-safe no PostgreSQL. |
| `MatchesPage.tsx` | UI / Controller | Ponto de integração: ao homologar/completar partida, aciona o runtime orchestrator. |

---

## 4. Conclusão da Auditoria

O repositório está perfeitamente preparado para a implementação do `CompetitionRuntimeService`. A fundação construída nas Fases 4.1–4.7 possui todos os blocos necessários (motores puros, entidades relacionais, RPCs transacionais). A Fase 4.8 construirá a ponte operacional sem violar nenhum princípio arquitetural.

# Auditoria de UI e Integração do Chaveamento (Fase 4.9)

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Bracket & Operational UI  
**Documento:** `PHASE-4.9-UI-AUDIT.md`  
**Data:** 05/09/2026  
**Modo:** Auditoria Somente-Leitura (Pré-Implementação)  
**Status:** Concluída

---

## 1. Contexto e Motivação

As Fases 4.1 a 4.8 construíram e homologaram a fundação matemática e relacional do Competition Format Engine:
- `CompetitionConfig` como fonte canônica e Single Source of Truth (SSOT);
- `StageGraphEngine`, `ParticipantResolutionEngine`, `GenericPairingEngine`, `GenericProgressionEngine`, `ScoringEngine`, `TieBreakEngine`, `OverallStandingsEngine`;
- Tabelas relacionais `competition_stages`, `competition_rounds`, `competition_match_slots`;
- Orquestrador desacoplado `CompetitionRuntimeService`;
- RPCs transacionais atômicas e seguras com lock pessimista (`rpc_materialize_slot_match`, `rpc_propagate_slot_outcome`);
- Defesa anti-fake team no nível de banco de dados;
- Tratamento estrutural de BYEs sem equipes fictícias.

No entanto, **a interface com o usuário (UI) ainda reflete o modelo legado**, com componentes visuais acoplados a arrays de partidas, formatos estáticos de 4 grupos e falta de visualização de estágios multi-fases, slots pendentes e referências dinâmicas.

A regra fundamental da Fase 4.9 é:
> **A UI não é dona da lógica da competição.**  
> A interface apenas lê o estado canônico, constrói um View Model de apresentação, renderiza a árvore e dispara comandos de negócio.

---

## 2. Respostas às 10 Questões Obrigatórias de Auditoria

### 2.1. Onde a UI atualmente calcula progressão?
1. **`src/pages/CompetitionsPage.tsx` (linhas 200–226):**
   - O hook `useMemo` para `bracketMatches` itera sobre `selectedMatches`, filtra `m.phase !== 'group-stage'`, agrupa por `m.round` numérico, e calcula manualmente sets vencidos (`setsWon`) e vencedor (`winnerId === m.teamAId ? 'A' : 'B'`), entregando uma matriz bidimensional para o `TournamentBracket`.
2. **`src/pages/MatchesPage.tsx` (linhas 370–440 - `handleSyncPlayoffsFromGroups`):**
   - Invoca `computeStandingsByGroup` e chama `CompetitionBracketService.generatePlayoffSlots(comp, groupStandings)` e `CompetitionBracketService.buildPlayoffMatchRecords(...)` para tentar criar partidas de playoffs diretamente no cliente.
3. **`src/pages/MatchesPage.tsx` (linhas 282–314 - `handleHomologateMatch` legado):**
   - No ramo de fallback legado, se não houver slots, chama `CompetitionBracketService.advancePlayoffBrackets(...)` no cliente para propagar times.
4. **`src/components/match/LiveScorerDeskModal.tsx` (linhas 164–188):**
   - Similarmente, no fluxo de finalização rápida legado sem slots, chama `CompetitionBracketService.advancePlayoffBrackets(...)`.

### 2.2. Onde existem cruzamentos hardcoded?
1. **`src/services/playoffsService.ts`:**
   - `generateFourGroupPlayoffs`: Hardcode explícito de cruzamento olímpico para 4 grupos (`1A x 2B`, `1C x 2D`, `1B x 2A`, `1D x 2C`).
   - `generateTwoGroupPlayoffs`: Hardcode para 2 grupos (`1A x 2B`, `1B x 2A`).
   - `generateSingleGroupPlayoffs`: Hardcode para 1 grupo (`1º x 2º` na final, `3º x 4º` no 3º lugar).
2. **`src/components/competition/TournamentBracket.tsx` (linhas 28–45):**
   - Array estático `mockBracket` com 4 Quartas de Final, 2 Semifinais e 1 Final fixos com nomes de clubes pré-definidos (Osasco, Barueri, etc.).
3. **`src/pages/MatchesPage.tsx` (linhas 411–414):**
   - Restrição explícita em alerta de tela: *"Geração automática disponível para 1, 2 ou 4 grupos. Torneio configurado com N grupos."*

### 2.3. Onde existem textos como "Quartas", "Semifinal", etc. tratados como lógica?
1. **`src/components/competition/TournamentBracket.tsx` (linha 51):**
   - `const roundNames = ['Quartas de Final', 'Semifinal', 'Final'];`
   - Indexado diretamente como `roundNames[roundIdx] || 'Rodada ${roundIdx + 1}'`. Assume obrigatoriamente que a rodada 0 são quartas, rodada 1 são semis e rodada 2 é a final.
2. **`src/services/playoffsService.ts` (linhas 20–40):**
   - `export type PlayoffPhase = 'oitavas' | 'quartas' | 'semifinal' | 'terceiro_lugar' | 'final';`
   - O tipo restringe o vocabulário e impede estágios customizados como `play-in`, `repescagem`, `rodada-1`, etc.
3. **`src/pages/MatchesPage.tsx` (linhas 215–216):**
   - Filtros de abas que usam strings mágicas para separar mata-mata: `m.phase !== 'group-stage' && m.phase !== 'classificatória'`.

### 2.4. Onde a UI assume quantidade fixa de grupos?
1. **`src/services/competitionBracketService.ts` (linhas 155–175):**
   - `if (groupsCount >= 4) return generateFourGroupPlayoffs(...)`
   - `if (groupsCount === 2) return generateTwoGroupPlayoffs(...)`
   - `if (groupsCount === 1) return generateSingleGroupPlayoffs(...)`
   - Se houver 3 grupos, 5 grupos ou chaveamento híbrido com Play-In, o serviço falha ou retorna array vazio.
2. **`src/pages/MatchesPage.tsx` (linha 412):**
   - Bloqueia a sincronização caso o número de grupos não seja 1, 2 ou 4.

### 2.5. Onde a UI assume quantidade fixa de partidas?
1. **`src/components/competition/TournamentBracket.tsx` (linhas 65–70, 84–103):**
   - Calcula o espaçamento vertical entre cards presumindo chave binária clássica simétrica ($2^N$):
     `style={{ gap: `${Math.pow(2, roundIdx + 1) * 16}px` }}`.
   - Presume que a última rodada possui exatamente 1 partida e que seu vencedor é o campeão:
     `matches[matches.length - 1][0].winner === 'A' ? ...`.
   - Quebra completamente para disputas de 3º lugar (que ocorrem na mesma rodada da final), play-ins assimétricos ou formatos de dupla eliminação.
2. **`src/services/playoffsService.ts`:**
   - 4 jogos em QF, 2 em SF, 1 em Final. Qualquer número diferente não é suportado pelo gerador legado.

### 2.6. Onde `TBD` ou IDs artificiais ainda aparecem?
1. **`src/services/playoffsService.ts` (linhas 221–226):**
   - `teamAId: teamA?.id ?? 'TBD-A-${slot.matchIndex}'`
   - `teamBId: teamB?.id ?? 'TBD-B-${slot.matchIndex}'`
   - `teamAShortName: teamA?.shortName ?? 'TBD'`
2. **`src/components/competition/TournamentBracket.tsx` (linhas 133, 164):**
   - `match.teamA?.name || 'A definir'` — Não exibe a intenção estrutural da vaga (ex.: "1º Grupo A", "Vencedor SF1"), exibindo apenas um texto genérico.
3. **`src/components/match/dialogs/ScheduleMatchDialog.tsx` (linhas 128, 144):**
   - Fallback de texto `{t.name} ({t.shortName || 'TBD'})`.

### 2.7. Onde `advancePlayoffBrackets()` ainda pode ser chamado?
1. **`src/pages/MatchesPage.tsx` (linha 295):**
   - No método `handleHomologateMatch`. Na Fase 4.8 foi colocado o gate:
     ```typescript
     const compSlots = await dataAccess.listMatchSlots(currentMatch.competitionId);
     if (compSlots.length > 0) {
       await CompetitionRuntimeService.handleMatchCompleted(currentMatch.competitionId, matchId);
     } else {
       // Legado
       CompetitionBracketService.advancePlayoffBrackets(...);
     }
     ```
2. **`src/components/match/LiveScorerDeskModal.tsx` (linha 171):**
   - Mesma guarda implementada na Fase 4.8.
3. **`src/pages/MatchesPage.tsx` (linha 370 - `handleSyncPlayoffsFromGroups`):**
   - Ainda utiliza a geração legada via `CompetitionBracketService.buildPlayoffMatchRecords`.

### 2.8. Quais componentes podem ser reutilizados?
1. **`src/components/ui/StatusBadge.tsx`:** Badges consistentes para os status de partida e estágios.
2. **`src/components/ui/Section.tsx` (`SectionCard`):** Contêineres com padding, borda e tipografia do design system Enterprise Dark.
3. **`src/components/ui/button.tsx`, `badge.tsx`, `StateContainer.tsx`:** Tratamento universal de estados de carregamento, vazio e erro.
4. **`src/components/match/LiveScorerDeskModal.tsx`:** Mesa do apontador eletrônica; pode ser aberta diretamente ao clicar em uma partida materializada.
5. **`src/components/match/LiveScoreboardModal.tsx`:** Telão ao vivo para partidas em andamento.
6. **`src/components/competition/StandingsTable.tsx`:** Tabela de classificação oficial por grupo.

### 2.9. Quais componentes precisam ser substituídos ou refatorados?
1. **`src/components/competition/TournamentBracket.tsx`:**
   - **Substituição / Refatoração Profunda:** O componente atual é estático, frágil e desconhece slots relacionais. Deve ser substituído por um componente de chaveamento verdadeiramente genérico (`GenericTournamentBracket`), capaz de renderizar qualquer estágio, rodada e slot a partir de um View Model puro.
2. **`src/components/competition/tabs/CompetitionStandingsTab.tsx`:**
   - **Refatoração:** Atualmente renderiza o bracket derivando partidas de `bracketMatches: BracketMatch[][]`. Deve ser adaptado para consultar a nova camada de View Model e exibir múltiplos estágios ou chaveamento relacional.
3. **`src/pages/CompetitionsPage.tsx`:**
   - **Refatoração:** O cálculo rudimentar em `useMemo` para `bracketMatches` deve ser desacoplado e substituído pela chamada ao `CompetitionBracketViewModel`.
4. **`src/pages/MatchesPage.tsx`:**
   - **Refatoração:** Na aba `mata-mata`, atualmente é exibida apenas uma lista tabular de partidas com um botão legado de sincronização. Deve incorporar a visualização do chaveamento gráfico relacional e suporte à operação de slots.

### 2.10. Quais tipos atuais não representam adequadamente MatchSlot?
1. **`BracketMatch` (`TournamentBracket.tsx`):**
   - Não possui `slotId`, `stageId`, `roundId`, nem referências declarativas (`ParticipantReference`).
   - Não distingue entre `MatchSlot` (estrutura de chaveamento) e `Match` (partida materializada).
   - Não suporta estados intermediários (`pending`, `partial`, `resolved-unmaterialized`, `materialized`, `in-progress`, `completed`, `bye`).
2. **`PlayoffMatchSlot` (`playoffsService.ts`):**
   - Estrutura legada plana acoplada a `matchIndex` numérico e fases fixas.

---

## 3. Riscos e Dependências Identificados

1. **Risco de Duplicação de Regras Esportivas:**
   - Se o frontend tentar deduzir se um participante avançou ou não, ou calcular quem é o 1º de um grupo, criará uma segunda fonte de verdade conflitante com `ScoringEngine` e `TieBreakEngine`.
   - **Mitigação:** O `CompetitionBracketViewModel` deve apenas projetar dados já persistidos ou computados pelo domínio (`dataAccess.listStages`, `listRounds`, `listMatchSlots`, `OverallStandingsEngine`).
2. **Risco de Concorrência e Duplo Clique:**
   - Clicar rapidamente em "Iniciar Partida" ou "Materializar" em um slot não pode disparar chamadas concorrentes descontroladas.
   - **Mitigação:** O frontend deve desabilitar os botões durante a mutação (`isMutating`) e a persistência no PostgreSQL já possui a barreira atômica `rpc_materialize_slot_match` com `FOR UPDATE`.
3. **Risco de Quebra em Competições Legadas:**
   - Competições antigas que não possuem `competition_match_slots` continuam dependendo do chaveamento pré-gerado em `matches`.
   - **Mitigação:** Isolação estrita com função de detecção `isRuntimeControlledCompetition(slots)`. Se não houver slots, utiliza o adaptador de apresentação legado.

---

## 4. Plano de Migração e Arquitetura da Fase 4.9

```text
┌─────────────────────────────────────────────────────────────┐
│                       BASE DE DADOS                         │
│  competition_stages  │  competition_rounds  │  match_slots  │
│  matches             │  competition_teams   │  teams        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATA ACCESS                          │
│  listStages()  │  listRounds()  │  listMatchSlots()         │
│  listMatches() │  materializeSlotMatch()                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                COMPETITION BRACKET VIEW MODEL               │
│  src/services/competitionBracketViewModel.ts                │
│                                                             │
│  - Transforma dados brutos em árvore hierárquica visual:    │
│    CompetitionBracketViewModel                              │
│      ├── StageViewModel[]                                   │
│      │     └── RoundViewModel[]                             │
│      │           └── MatchSlotViewModel[]                   │
│  - Mapeia ParticipantReference para texto legível           │
│    (ex.: "1º Grupo A", "5º Geral", "Vencedor QF1", "BYE")   │
│  - Computa estado visual (pending, resolved, materialized)  │
│  - NÃO calcula regras esportivas                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      BRACKET UI GENÉRICO                    │
│  src/components/competition/bracket/                        │
│    ├── GenericTournamentBracket.tsx                         │
│    ├── BracketStageNav.tsx                                  │
│    ├── BracketRoundColumn.tsx                               │
│    ├── MatchSlotCard.tsx                                    │
│    └── ParticipantSlotRow.tsx                               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     PÁGINAS OPERACIONAIS                    │
│  MatchesPage.tsx (Aba Mata-mata com visualizador e tabela)  │
│  CompetitionsPage.tsx (Aba Classificação com novo Bracket)  │
└─────────────────────────────────────────────────────────────┘
```

Esta auditoria confirma a viabilidade técnica e define os limites estritos para a implementação.

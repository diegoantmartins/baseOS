# BaseOS — Integração do Runtime com a Interface de Competição

**Status:** Homologado  
**Versão:** 1.0  
**Data:** 2026-09-05  
**Autor:** Antigravity / Gemini  
**Arquivos de Implementação:**  
- `src/hooks/useCompetitionBracket.ts`  
- `src/components/competition/tabs/CompetitionStandingsTab.tsx`  
- `src/pages/MatchesPage.tsx`  
- `src/pages/CompetitionsPage.tsx`

---

## 1. Fluxo de Vida dos Dados

```
[UI Trigger: Iniciar ou Finalizar Partida]
                     │
                     ▼
       [LiveScorerDeskModal / Súmula]
                     │
                     ▼
         [CanonicalMatchResult]
                     │
                     ▼
      [CompetitionRuntimeService]
    ├── rpc_propagate_slot_outcome (PostgreSQL)
    └── rpc_materialize_slot_match (PostgreSQL)
                     │
                     ▼
          [refetch() disparado]
                     │
                     ▼
         [useCompetitionBracket]
    ├── dataAccess.getCompetitionStages()
    ├── dataAccess.getCompetitionRounds()
    ├── dataAccess.getCompetitionMatchSlots()
    ├── dataAccess.getMatches()
    └── dataAccess.getTeams()
                     │
                     ▼
    [buildCompetitionBracketViewModel]
                     │
                     ▼
        [Atualização Reativa da UI]
```

---

## 2. O Hook `useCompetitionBracket`

O hook foi projetado para ser consumido em qualquer ponto da aplicação (Aba de Classificação/Playoffs, Página de Partidas, Telão de Transmissão, etc.):

```typescript
const {
  viewModel,
  loading,
  error,
  refetch,
  reprocessRuntime,
  isReprocessing
} = useCompetitionBracket(competitionId);
```

### 2.1 Suporte a Chaveamentos Novos e Legados
Se a competição possuir `competition_match_slots` persistidos, o hook executa a projeção moderna com o `CompetitionBracketViewModelBuilder.build()`. Caso a competição seja do formato legado (criada antes da Fase 4.5), o hook executa automaticamente `CompetitionBracketViewModelBuilder.buildLegacy()`, garantindo retrocompatibilidade contínua.

### 2.2 Sincronização Operacional Segura (`reprocessRuntime`)
O operador pode clicar no botão "Sincronizar Chaveamento". Isso não cria partidas pela UI, mas chama:
```typescript
await competitionRuntimeService.reconcileRuntime(competitionId);
await refetch();
```
que valida atomicamente se há slots elegíveis para propagação ou materialização no banco de dados.

---

## 3. Integração na Página de Partidas (`MatchesPage.tsx`)

Na aba "Mata-mata" da `MatchesPage`, o operador conta agora com um seletor visual:
1. **Chaveamento Visual (Bracket):** Apresenta o diagrama em árvore interativo renderizado pelo `GenericTournamentBracket`. Clicar no card de uma partida que possui `canOpenMatch === true` abre instantaneamente a mesa do apontador (`LiveScorerDeskModal`).
2. **Tabela de Jogos:** Visão tabular tradicional por lista de jogos com placares e filtros.

Ao finalizar uma partida na mesa ou homologar um placar, a função `refetchBracket()` é chamada imediatamente, propagando os vencedores para a próxima fase do diagrama sem necessidade de recarregar a página.

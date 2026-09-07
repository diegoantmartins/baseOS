# BaseOS — Fase 4.9: Arquitetura de UI e Integração Operacional do Bracket

**Status:** Homologado  
**Versão:** 1.0  
**Data:** 2026-09-05  
**Autor:** Antigravity / Gemini  
**Escopo:** Integração de UI Reativa, View Model Puro e Chaveamento Universal (Fase 4.9)

---

## 1. Visão Geral e Princípio Arquitetural

A Fase 4.9 conecta o Competition Format Engine (Fases 4.1–4.4), a Persistência Transacional (Fases 4.5–4.7) e o Runtime Progression Engine (Fase 4.8) a uma interface visual e operacional no frontend do BaseOS.

O princípio central desta fase é:

> **A UI e o View Model são estritamente projeções do estado de competição, nunca motores de decisão.**

```
┌───────────────────────────────────────────────────────────┐
│                  Banco de Dados PostgreSQL                │
│   (competition_stages, rounds, match_slots, matches)      │
└─────────────────────────────┬─────────────────────────────┘
                              │ dataAccess.ts
                              ▼
┌───────────────────────────────────────────────────────────┐
│              CompetitionRuntimeService                    │
│   (Regras puras, CanonicalMatchResult, RPCs idempotentes) │
└─────────────────────────────┬─────────────────────────────┘
                              │ useCompetitionBracket hook
                              ▼
┌───────────────────────────────────────────────────────────┐
│          CompetitionBracketViewModelBuilder               │
│   (Função pura de mapeamento, detecção de inconsistência)│
└─────────────────────────────┬─────────────────────────────┘
                              │ BracketStageViewModel / Round / Slot
                              ▼
┌───────────────────────────────────────────────────────────┐
│               GenericTournamentBracket                    │
│    (Componentes React visuais, acessibilidade WCAG)       │
└─────────────────────────────┬─────────────────────────────┘
                              │ canOpenMatch / onOpenMatch
                              ▼
┌───────────────────────────────────────────────────────────┐
│              LiveScorerDeskModal / Súmula                 │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Decisões Estruturais Chave

### 2.1 viewState como Estado de Apresentação (UI View State)
Conforme deliberado no item 2 do ajuste técnico, estados visuais como `resolved_unmaterialized` e `inconsistent` pertencem **exclusivamente** à projeção visual da UI (`MatchSlotVisualState`). Nenhuma coluna artificial foi criada no PostgreSQL para refletir estados temporários de renderização da UI.

### 2.2 Proibição Estrita de Materialização Arbitrária pela UI
A UI nunca chama `dataAccess.createMatch()`. A criação esportiva de uma partida ocorre via:
1. Materialização automática pelo `CompetitionRuntimeService` no momento em que os participantes A e B estão 100% resolvidos;
2. Botão operacional de "Sincronizar Chaveamento", que dispara `runtimeService.reconcileRuntime(competitionId)`.

### 2.3 Desacoplamento de Carregamento via Hook
A página `CompetitionsPage.tsx` não se tornou um agregador massivo de dados. Foi criado o hook desacoplado `useCompetitionBracket(competitionId)` que isola o ciclo de vida, refetch paralelo e cacheamento dos dados do chaveamento.

### 2.4 Consistência Primeiro, Realtime Depois
A sincronização com a mesa do apontador e finalizações de partidas adota o fluxo determinístico:
`Finaliza Partida` ➔ `Runtime Reconcile` ➔ `Persistência RPC` ➔ `Refetch/Invalidate` ➔ `Reconstrução Pura do View Model` ➔ `Renderização Reativa`.

### 2.5 Isolamento Operacional da Mesa de Jogo (`canOpenMatch`)
Um slot sem partida real (`matchId === null`) não pode abrir o `LiveScorerDeskModal`. O View Model expõe:
```typescript
canOpenMatch = Boolean(matchId) && slot.visualState !== 'inconsistent';
```
Garantindo que apenas eventos esportivos reais e consistentes acessem a súmula e a mesa.

---

## 3. Topologia de Componentes

```
src/components/competition/bracket/
├── GenericTournamentBracket.tsx   # Container mestre com seleção de estágios e pódio
├── BracketStageNav.tsx            # Navegação em abas para múltiplos estágios
├── BracketRoundColumn.tsx         # Coluna de rodada com scroll e alinhamento
├── MatchSlotCard.tsx              # Card individual de confronto com botão semântico
├── ParticipantSlotRow.tsx         # Linha de participante (equipe, seed, placar, BYE)
└── index.ts                       # Exportação pública
```

E o componente legado:
```
src/components/competition/TournamentBracket.tsx
```
foi transformado em um adaptador leve (thin adapter) de compatibilidade que consome `buildLegacy()` e delega 100% da renderização ao `GenericTournamentBracket`.

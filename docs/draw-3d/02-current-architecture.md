# BASEOS — FASE 3.1: Arquitetura Atual do Sistema de Sorteio

> **STATUS: LEGADO / SUPERADO**
> Documento histórico da Fase 3.1. Descreve a arquitetura antes da implementação
> 3D. A arquitetura oficial vigente é o Draw Arena Cinematográfico
> (`DrawPage → LiveDrawModal → DrawArenaController → State Machine → Canvas + HUD`),
> documentado em `44-phase-3.4-etapa-12-cleanup-report.md`.

## 1. Visao Geral

O sistema de sorteio do BASEOS e composto por tres camadas bem definidas:
1. **Motor** (logica de negocio)
2. **Hook** (gerenciamento de estado de operacao)
3. **Apresentacao** (UI desacoplada)

A animacao atual e 100% CSS + Framer Motion em DOM puro.

## 2. Diagrama de Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────────┐
│                         DrawPage.tsx                            │
│  (pagina principal — configuracao, validacao, persistencia)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ groups, teams, competition
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LiveDrawModal.tsx                           │
│  (wrapper de compatibilidade — retorna null se isOpen=false)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ DrawResult + teams + competition
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DrawPresentation.tsx                          │
│  (componente de apresentacao 2D — ONLY apresenta o resultado)  │
│                                                                 │
│  buildRevealSequence() → DrawRevealEvent[]                     │
│  handleNext() → revealDurationMs (2500ms padrao)               │
│  Framer Motion: scale, opacity, y, rotate, blur                │
│  Background: radial-gradient + backdrop-blur                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────────┐   ┌────────────────┐
│  drawService.ts  │    │  drawValidator.ts    │   │  dataAccess.ts │
│                  │    │                      │   │                │
│ mulberry32()     │    │ validateDrawConfig() │   │ LocalStorage   │
│ distributeTeams()│    │ formatValidation...()│   │ Supabase       │
│ generateMatches()│    │ getValidationSummary │   │ saveDraw...()  │
│ runDraw()        │    │                      │   │ updateDraw...()│
└──────────────────┘    └──────────────────────┘   └────────────────┘

┌──────────────────┐
│ useDrawOperation │
│                  │
│ state: 'idle'   │
│ 'running'        │
│ 'saving'         │
│ runPreview()     │
│ saveWithMatches()│
│ showValidation() │
└──────────────────┘
```

## 3. Camadas Detalhadas

### 3.1 Motor de Sorteio (`src/services/drawService.ts`)

**Responsabilidade**: logica de negocio pura — sem side effects, sem UI.

**APIs publicas**:
- `mulberry32(seed)` — PRNG determinisco
- `groupNameForIndex(i)` — "Grupo A", "Grupo B"...
- `shuffle(items, rand)` — Fisher-Yates
- `buildBalancedCapacities(total, groupsCount)` — distribuicao inicial
- `distributeTeamsIntoGroups(entries, groupsCount, config)` — algoritimo guloso
- `generateGroupRoundRobin(teamIds)` — Berger table
- `generateDrawMatches(groups, phase)` — gera todos os jogos
- `runDraw(competition, teams, config)` — orquestrador completo
- `roundRobinMatchCount(n)` — utilitario
- `roundRobinRoundCount(n)` — utilitario

**Invariantes**:
- Same seed → same result (determinismo)
- Groups sempre balanceados (diferenca de capacidade entre grupos <= 1)
- Head seeds: modo 'seeded' distribui uma por grupo; modo 'random' embaralha tudo

### 3.2 Validacao (`src/services/drawValidator.ts`)

**Responsabilidade**: verificar configuracao antes da execucao.

**APIs publicas**:
- `validateDrawConfig(config, teams)` — retorna `ValidationResult`
- `formatValidationErrors(result)` — string legivel
- `getValidationSummary(result)` — contador de erros/warnings

**Regras validadas**:
- Numero de equipes >= 2
- Numero de grupos >= 1
- Equipes >= grupos
- Capacidade maxima nao excedida
- Head seeds validos e sem duplicacao
- Semente numerica positiva

### 3.3 Hook de Operacao (`src/hooks/useDrawOperation.ts`)

**Responsabilidade**: centralizar estado de operacao e orquestrar motor + persistencia.

**Estado**: `'idle' | 'running' | 'saving'`

**APIs publicas**:
- `runPreview(competition, teams, config)` — executa sem persistir
- `saveWithMatches(...)` — executa e persiste
- `showValidationErrors(config, teams)` — valida sem executar

**Propriedades**: `isRunning`, `isSaving`, `isIdle`

### 3.4 Apresentacao (`src/components/draw/DrawPresentation.tsx`)

**Responsabilidade**: ONLY apresentar visualmente o resultado. Nao calcula nada.

**Props**:
```typescript
interface DrawPresentationProps {
  result: DrawResult;           // somente leitura
  teams: TeamRecord[];
  competition: CompetitionRecord;
  revealDurationMs?: number;    // padrao: 2500
  onClose?: () => void;
}
```

**Interfaces exportadas**:
```typescript
export interface DrawRevealEvent {
  teamId: string;
  groupName: string;
  order: number;
}

export function buildRevealSequence(groups: DrawGroup[]): DrawRevealEvent[]
```

**Fluxo de revelacao**:
1. `buildRevealSequence` gera array de `DrawRevealEvent`
2. Sequencia: coluna por coluna (todas equipes posicao 0, depois posicao 1...)
3. `handleNext()` incrementa `currentIndex`
4. `currentTeam` e `currentDraw` derivados do estado
5. Framer Motion `AnimatePresence` anima entrada/saida
6. Botao "Sortear Proximo" ate `currentIndex >= length - 1`

**Animacoes Framer Motion**:
- Entrada: `{ scale: 0.5, opacity: 0, y: 50 }` → `{ scale: 1, opacity: 1, y: 0 }`
- Transicao: `spring` com `damping: 15`, `stiffness: 100`
- Rotacao: `{ rotate: -5 }` → `{ rotate: 0 }` com `bounce: 0.5`
- Saida: `{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }`
- Fundo: `{ opacity: 0, scale: 0 }` → `{ opacity: 0.5, scale: 2 }` com `blur(100px)`

### 3.5 Wrapper de Compatibilidade (`src/components/draw/LiveDrawModal.tsx`)

**Responsabilidade**: ponto de extensao para futuras implementacoes 3D.

```typescript
interface LiveDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: DrawGroup[];
  teams: TeamRecord[];
  competition: CompetitionRecord;
}
```

Constrói `DrawResult` in-place e passa para `DrawPresentation`.

### 3.6 Persistencia (`src/services/dataAccess.ts`)

**LocalStorage**: `draws`, `matches` (chave: `${competitionId}-${drawId}`)

**Supabase**: tabelas `draws` + `matches` com campo `status`

**Metodos relevantes**:
- `saveDrawWithMatches(drawResult, matchProposals)` — persiste atomica
- `updateDrawStatus(drawId, status)` — atualiza status

## 4. Fluxo de Dados Completo

```
1. Usuario configura seed, modo, headSeeds, grupos
2. DrawPage valida via drawValidator.ts
3. DrawPage executa runDraw() → DrawResult (motor puro)
4. Preview exibido em DrawPage com drag-and-drop
5. Usuario inicia revelacao ao vivo
6. LiveDrawModal abre DrawPresentation com DrawResult
7. DrawPresentation.buildRevealSequence() gera sequencia
8. Revelacao passo a passo via handleNext()
9. Framer Motion anima cada revelacao
10. Ao final, drawService.runDraw() chamado novamente para salvar
11. dataAccess.saveDrawWithMatches() persiste resultado
```

## 5. Pontos de Extensao Identificados

| Ponto | Estado Atual | Oportunidade |
|-------|--------------|--------------|
| `LiveDrawModal.tsx` | Apenas wrapper para DrawPresentation | Substituir por orquestrador 3D |
| `DrawRevealEvent` | Array plano de eventos | Estender para incluir metadata 3D (posicao, rotacao, cor) |
| `buildRevealSequence` | Sequencia fixa coluna-por-coluna | Parametrizar ordem de revelacao |
| Animacoes | Somente Framer Motion (DOM) | Integrar camada 3D com fallback |
| Temas | CSS custom properties HSL | Suportar tema 3D (cores de iluminacao) |
| Modal fullscreen | `fixed inset-0` com z-50 | Adaptar para canvas 3D responsivo |

## 6. Contexto de Tipo DrawResult

```typescript
type DrawResult = {
  competitionId: string;
  config: DrawConfig;           // gruposCount, seedingMode, seed, headSeeds
  groups: DrawGroup[];          // [{ name, teams: DrawTeamEntry[] }]
  matches: DrawMatchProposal[]; // [{ round, matchNumber, teamAId, teamBId, ... }]
  status?: DrawStatus;         // 'preview' | 'official' | 'locked'
};
```

O `DrawResult` e **imutavel apos gerado**. Qualquer alteracao requer novo sorteio. Este principio e fundamental e deve ser preservado na arquitetura 3D.

## 7. Convencoes de Codigo

- Nomenclatura: camelCase para variaveis/funcoes, PascalCase para tipos/componentes
- Comment style: JSDoc para funcoes exportadas
- Imports: path alias `@/` para `src/`
- Estado: React hooks locais (useState/useMemo/useEffect) em componentes de apresentacao
- Side effects: concentrados em hooks e services, nunca em componentes puros

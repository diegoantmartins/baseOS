# FASE 3.4 — ETAPA 2: PLANO DE ALTERAÇÃO

## Data
31 de Agosto de 2026

## Status
Arquitetura mapeada. Pronto para implementação.

---

## 1. ARQUITETURA EXISTENTE CONFIRMADA

### Motor de Sorteio (INTOCÁVEL)

```
src/services/drawService.ts
├── mulberry32(seed)              — PRNG determinístico
├── distributeTeamsIntoGroups()   — Distribuição balanceada
├── generateGroupRoundRobin()     — Tabela Berger (turno único)
├── generateDrawMatches()         — Geração de jogos
└── runDraw()                      — Orquestrador puro
```

**Testes:** 27 passando ✅  
**Status:** 100% isolado, nenhuma modificação

---

### Fluxo Atual de Sorteio

```
DrawPage
  │
  ├── [Estado Local]
  │   ├── selected: CompetitionRecord
  │   ├── registeredTeams: TeamRecord[]
  │   ├── groupsCount: number
  │   ├── seedingMode: 'random' | 'seeded'
  │   ├── headSeeds: string[]
  │   ├── seed: number
  │   ├── preview: { groups, matches }
  │   └── isLiveModalOpen: boolean
  │
  └── handleRunDraw()
      └── const config: DrawConfig = { groupsCount, seedingMode, seed, headSeeds }
          └── const result = runDraw(selected, registeredTeams, config)
              ├── result.groups: DrawGroup[]
              ├── result.matches: DrawMatchProposal[]
              └── setPreview(result)
                  └── setIsLiveModalOpen(true)
                      └── <LiveDrawModal isOpen={true} result={preview} ... />
                          └── <DrawScene3D result={preview} teams={teams} ... />
```

**Ponto de Integração:** `LiveDrawModal`

---

### Types Existentes

```typescript
// DrawConfig — entrada do motor
{
  groupsCount: number
  seedingMode: 'random' | 'seeded'
  seed: number
  headSeeds: string[]
}

// DrawResult — saída do motor (NUNCA MODIFICAR)
{
  competitionId: string
  config: DrawConfig
  groups: DrawGroup[]      ← [ { name, teams } ]
  matches: DrawMatchProposal[]
  status: 'preview' | 'official' | 'locked'
}

// DrawGroup
{
  name: string
  teams: DrawTeamEntry[]   ← [ { teamId, seed } ]
}

// DrawMatchProposal
{
  round: number
  matchNumber: number
  teamAId: string
  teamBId: string
  groupName: string
  phase: string
}
```

---

## 2. PLANO DE ALTERAÇÃO

### Princípio Fundamental

**NADA MUDA EM:**
- `src/services/drawService.ts`
- `src/types/draw.ts`
- `src/pages/DrawPage.tsx`
- Testes existentes
- Fluxo de execução do sorteio

**O QUE MUDA:**
- `src/components/draw/LiveDrawModal.tsx` — **adiciona feature flag**
- Novos arquivos em `src/components/draw/` — **nova camada visual**

---

### Arquivos A CRIAR

#### 1. Feature Flag Manager

```
src/config/drawArenaFeatures.ts
├── DRAW_ARENA_3D_ENABLED: boolean
├── AUTO_DETECT_WEBGL: boolean
└── DEGRADATION_MODE: 'high' | 'medium' | 'low' | 'fallback'
```

#### 2. Controlador de Estado

```
src/components/draw/cinematic/DrawArenaController.tsx
├── Recebe: DrawResult (do motor)
├── Responsabilidade: Orquestrar fluxo visual
├── Não altera: resultado do sorteio
└── Exporta: DrawArenaController component
```

#### 3. Máquina de Estados

```
src/components/draw/cinematic/useDrawArenaStateMachine.ts
├── Estados: IDLE, INTRO, READY, DRAWING, REVEAL, GROUP_UPDATE, COMPLETE, ERROR
├── Responsabilidade: Transições visuais
├── Fonte de verdade: DrawResult do motor
└── Não executa lógica de negócio
```

#### 4. Canvas 3D

```
src/components/draw/cinematic/DrawArena3D.tsx
├── Canvas (Three.js + React Three Fiber)
├── Scene com:
│   ├── Urna (geometria procedural)
│   ├── Team objects (esferas/tokens)
│   ├── Lighting (key + fill)
│   └── Camera (cinematográfica)
└── Não toma decisões sobre o sorteio
```

#### 5. HUD (2D overlay)

```
src/components/draw/cinematic/DrawArenaHUD.tsx
├── Header (competição, logo)
├── Progress bar
├── Current team card
├── Group status
├── Controls (play/pause/close)
└── Framer Motion para animações
```

#### 6. Tipos Adicionais (Novo Arquivo)

```
src/types/drawCinematic.ts
├── CinematicState
├── CameraPosition
├── ArenaObject
└── (NÃO altera DrawResult nem DrawConfig)
```

---

### Arquivos A MODIFICAR

#### LiveDrawModal.tsx

**Antes:**
```typescript
export function LiveDrawModal({ isOpen, onClose, result, groups, teams, competition }) {
  return (
    <DrawScene3D result={result} teams={teams} competition={competition} onClose={onClose} />
  );
}
```

**Depois:**
```typescript
import { DRAW_ARENA_3D_ENABLED } from '@/config/drawArenaFeatures';

export function LiveDrawModal({ isOpen, onClose, result, groups, teams, competition }) {
  if (!isOpen) return null;

  return DRAW_ARENA_3D_ENABLED ? (
    <DrawArenaController 
      result={result} 
      teams={teams} 
      competition={competition}
      onClose={onClose}
    />
  ) : (
    <DrawScene3D 
      result={result} 
      teams={teams} 
      competition={competition} 
      onClose={onClose}
    />
  );
}
```

**Impacto:** Mínimo. Apenas condicional simples.

---

## 3. FLUXO DE DADOS (NÃO MUDA)

```
DrawPage.handleRunDraw()
  └── runDraw(competition, teams, config)  ← Motor puro
      └── DrawResult {
          competitionId
          config
          groups: [ { name, teams: [ { teamId, seed } ] } ]
          matches: [ { round, matchNumber, teamAId, teamBId, groupName } ]
          status: 'preview'
        }
        └── setPreview(result)
            └── <LiveDrawModal result={result} ... />
                ├─ IF DRAW_ARENA_3D_ENABLED:
                │  └─ <DrawArenaController result={result} />
                │     └─ Consome result, renderiza visualmente
                │     └─ NÃO modifica, NÃO altera, NÃO executa motor
                │
                └─ ELSE:
                   └─ <DrawScene3D result={result} />  (fallback)
```

**Garantia:** Motor continua retornando exatamente o mesmo resultado.

---

## 4. ESTRUTURA FINAL DE PASTAS

```
src/components/draw/
├── cinematic/                       [NOVO]
│   ├── DrawArenaController.tsx
│   ├── DrawArena3D.tsx
│   ├── DrawArenaHUD.tsx
│   ├── useDrawArenaStateMachine.ts
│   ├── useDrawArenaCamera.ts        [OPCIONAL]
│   ├── useDrawArenaAnimation.ts     [OPCIONAL]
│   └── constants/
│       └── arenaConfig.ts
│
├── LiveDrawModal.tsx                [MODIFICADO: +feature flag]
├── DrawScene3D.tsx                  [INTOCADO: fallback]
├── drawRevealSequence.ts            [INTOCADO]
└── [outros]
```

---

## 5. FEATURE FLAG STRATEGY

### Opção 1: Arquivo de Config (Recomendado)

```typescript
// src/config/drawArenaFeatures.ts
export const DRAW_ARENA_FEATURES = {
  ENABLED: process.env.VITE_DRAW_ARENA_3D === 'true' ?? false,
  WEBGL_DETECTION: true,
  PERFORMANCE_MODE: 'auto' as 'high' | 'medium' | 'low' | 'auto',
};
```

### Opção 2: Environment Variable

```bash
VITE_DRAW_ARENA_3D=true npm run dev
```

### Opção 3: Query Parameter (Desenvolvimento)

```
http://localhost:5173/sorteio/comp-1?arena=3d
```

**Recomendação:** Opção 1 + Opção 2 (config file + env var)

---

## 6. DEPENDÊNCIAS A INSTALAR

### Obrigatórias

```bash
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

### Já Existentes

```
framer-motion       ✅ Já em uso
react               ✅ Já em uso
typescript          ✅ Já em uso
```

### Verificação Prévia

```bash
npm list three @react-three/fiber @react-three/drei
```

Se não existirem → instalar. Se existirem → usar versão existente.

---

## 7. GARANTIAS ARQUITETURAIS

### O Motor NÃO Muda

```
✅ drawService.ts — 0 modificações
✅ mulberry32 — 0 modificações
✅ distributeTeamsIntoGroups — 0 modificações
✅ generateGroupRoundRobin — 0 modificações
✅ runDraw — 0 modificações
✅ Testes (27) — 100% passam
```

### O Fluxo NÃO Muda

```
✅ DrawPage → handleRunDraw → runDraw → setPreview (IDÊNTICO)
✅ DrawResult flui igual
✅ Resultado de sorteio é IDÊNTICO
✅ Persistência é IDÊNTICA
```

### A Apresentação É Aditiva

```
✅ DrawScene3D (fallback) continua funcionando
✅ Feature flag permite on/off
✅ Sem quebra de interface
✅ Sem quebra de compatibilidade
```

---

## 8. CHECKPOINTS DE VALIDAÇÃO

### Após Instalar Dependências

```bash
[ ] npm run build — sucesso
[ ] npm run lint — 0 erros
[ ] npm test — 27/27 passam (drawService)
```

### Após Criar Feature Flag

```bash
[ ] DRAW_ARENA_3D_ENABLED = false
[ ] npm run build — sucesso
[ ] npm test — 27/27 passam
[ ] Draw existente funciona igual
```

### Após Criar DrawArenaController (Mínimo)

```bash
[ ] Canvas renderiza
[ ] Sem erros WebGL
[ ] Recebe DrawResult corretamente
[ ] Não modifica DrawResult
[ ] Pode fechar modal
```

### Após Conectar ao Fluxo Real

```bash
[ ] Clicar "Realizar Sorteio"
[ ] DrawResult flui até DrawArenaController
[ ] 3D renderiza
[ ] Fechar funciona
[ ] DrawScene3D fallback também funciona
```

---

## 9. CRONOGRAMA ETAPAS 3-8 (DA FASE 3.4)

```
ETAPA 3:  Preparar dependências          (1 dia)
ETAPA 4:  Criar feature flag             (1 dia)
ETAPA 5:  Criar controller + state       (2 dias)
ETAPA 6:  Criar Canvas 3D mínimo         (2 dias)
ETAPA 7:  Criar urna 3D                  (1 dia)
ETAPA 8:  Criar câmera cinematográfica   (2 dias)
ETAPA 9:  Criar HUD                      (1 dia)
ETAPA 10: Conectar ao resultado REAL     (1 dia)
ETAPA 11: Fallback + acessibilidade      (2 dias)
ETAPA 12: Performance + otimização       (2 dias)
ETAPA 13: Testes integração              (1 dia)
ETAPA 14: Build + validação              (1 dia)
ETAPA 15: Auditoria final                (1 dia)
---
TOTAL:    ~18 dias de trabalho contínuo
```

---

## 10. REGRA FINAL DESTA ETAPA

✅ Arquitetura mapeada
✅ Plano de alteração definido
✅ Dependências identificadas
✅ Nenhuma mudança feita ao código
✅ Motor de sorteio 100% protegido
✅ Fallback garantido
✅ Pronto para ETAPA 3

---

## Autorização

Proceder com **ETAPA 3: Preparar Dependências**?

Validação pré-instalação:
```bash
npm list three @react-three/fiber @react-three/drei 2>/dev/null | grep -E "three|fiber|drei"
```

Se não encontrar → instalar  
Se encontrar → usar versão existente

**RESPOSTA ESPERADA:** SIM / NÃO

# 16 — Pontos de Extensão

## Arquitetura Proposta para Futura Experiência Visual 3D

## Separação de Conceitos

### 1. DRAW ENGINE vs DRAW PRESENTATION

```typescript
// DRAW ENGINE (Business Logic)
// - drawService.ts
// - distributeTeamsIntoGroups()
// - generateDrawMatches()
// - runDraw()
// - Puro, sem dependências de UI
// - Pode ser unit testado isoladamente

// DRAW PRESENTATION (Visual)
// - LiveDrawModal.tsx
// - DrawPage.tsx (UI components)
// - Componentes 3D, parallax, animações
// - Consome apenas DRAW ENGINE
```

### 2. Pontos de Extensão Identificados

#### A. Motor de Sorteio Alternativo

**Local:** `src/services/drawService.ts`

**Como integrar:**
```typescript
// drawService.ts
export interface DrawEngine {
  runDraw(competition, teams, config): DrawResult;
}

export class StandardDrawEngine implements DrawEngine {
  runDraw(...) { /* Berger Table + Distribuição */ }
}

export class HybridDrawEngine implements DrawEngine {
  runDraw(...) { /* Critérios personalizados */ }
}
```

#### B. Visualização 3D

**Local:** `src/components/draw/LiveDrawModal.tsx`

**Como integrar:**
```typescript
// LiveDrawModal.tsx
interface DrawPresentationProps {
  drawResult: DrawResult;
  onReveal: (team: DrawTeamEntry) => void;
  theme: '3d' | '2d';
}

// Novos componentes:
// - Draw3DCamera.tsx
// - Draw3DGroup.tsx
// - Draw3DTeamCard.tsx
// - ParallaxWrapper.tsx
```

#### C. Configurador de Critérios

**Local:** `src/types/draw.ts` (ExtendedDrawConfig)

```typescript
interface ExtendedDrawConfig extends DrawConfig {
  sortCriteria?: SortCriteria[];
  forbiddenPairs?: string[][];
  executionMode?: 'standard' | 'hierarchical' | 'iterative';
}
```

#### D. Validador de Restrições

**Local:** Novo arquivo `src/services/drawValidator.ts`

```typescript
interface DrawValidator {
  validate(groups: DrawGroup[], config: ExtendedDrawConfig): ValidationResult;
  checkFeasibility(config: ExtendedDrawConfig): FeasibilityReport;
}
```

#### E. Persistência de Estado Visual

**Local:** `src/services/dataAccess.ts` (DrawRecord)

```typescript
interface VisualDrawRecord extends DrawRecord {
  visualState?: {
    currentReveal: number;
    cameraPosition: { x: number; y: number; z: number };
    animations: AnimationState[];
  };
}
```

---

## Arquitetura Futura Proposta

```
┌─────────────────────────────────────────────────┐
│           LAYER 1: CONFIGURATION                  │
│  DrawPage (config form, validation)              │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           LAYER 2: DRAW ENGINE                   │
│  - StandardDrawEngine (atual)                    │
│  - HybridDrawEngine (novo)                       │
│  - DrawValidator (novo)                          │
│  - Critérios de distribuição                     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           LAYER 3: DRAW RESULT                   │
│  - DrawResult (freeze output)                    │
│  - DrawRecord (persisted)                        │
│  - VisualState (optional)                        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           LAYER 4: PRESENTATION                  │
│  - LiveDrawModal (atual)                         │
│  - Draw3DCamera (novo)                           │
│  - ParallaxWrapper (novo)                        │
│  - Team3DCard (novo)                             │
│  - Group3DScene (novo)                           │
└─────────────────────────────────────────────────┘
```

## Regras de Separação

1. **Lóica de Negócio NUNCA toca UI**
2. **UI NUNCA modify o DrawResult**
3. **DrawResult é "congelado" após execução**
4. **UI pode apenas renderizar e animar**
5. **Configuração é feita antes do sorteio**
6. **Resultado é persistido como snapshot**

## Pontos de Injeção para 3D

| Componente | Substituir por | Como |
|------------|---------------|------|
| LiveDrawModal | Draw3DScene | Wrapper completo |
| Group Card | Group3DScene | Componente 3D |
| Team Row | Team3DCard | Componente 3D |
| Reveal Animation | Particle3DReveal | Efeito visual |
| Background | ParallaxBackground | Efeito de profundidade |

## Dependências Futuras (NÃO instalar agora)

- `@react-three/drei` (3D components)
- `@react-three/fiber` (3D renderer)
- `three` (3D engine)
- `@vibrate/web` (haptics)
- `canvas-confetti` (particle effects)

## Conclusão

A arquitetura atual já é **bem separada** entre lógica e apresentação. Os pontos de extensão identificados permitem adicionar novos algoritmos de distribuição e novas experiências visualmente sem acoplar código de negócio com código de UI.
# BASEOS — FASE 3.1: Proposta de Arquitetura 3D

> **STATUS: LEGADO / SUPERADO**
> Documento histórico da Fase 3.1 (proposta). A proposta de `useWebGLCapability`,
> `useDrawReveal` e `DrawOrchestrator` evoluiu na implementação: o roteamento passou
> a ser feito por `LiveDrawModal`, a state machine por `useDrawArenaStateMachine`, e o
> fallback por `DrawScene3D`. Ver `44-phase-3.4-etapa-12-cleanup-report.md`.

## 1. Principios Fundamentais

1. **Motor e a unica fonte da verdade**: o `DrawResult` gerado por `drawService.ts` e imutavel. A animacao/3D nunca controla o sorteio.
2. **Fallback obrigatorio**: se WebGL nao estiver disponivel, a apresentacao 2D existente continua funcionando.
3. **Separacao de responsabilidades**: arquitetura em camadas com boundaries claros.
4. **Determinismo preservado**: mesmo seed, mesmo resultado, sempre.

## 2. Arquitetura Proposta

### 2.1 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                     DrawPage.tsx                                │
│        (NAO MODIFICADO — continua chamando LiveDrawModal)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ isOpen, groups, teams, competition
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DrawOrchestrator.tsx                           │
│                                                                 │
│  1. Recebe DrawResult do DrawPage                              │
│  2. Detecta suporte WebGL via useWebGLCapability()             │
│  3. Seleciona modo: <DrawScene3D> ou <DrawPresentation2D>      │
│  4. Gerencia state machine de revelacao (via useDrawReveal)     │
│  5. NUNCA modifica o DrawResult                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│    DrawScene3D.tsx       │  │   DrawPresentation2D.tsx          │
│                          │  │   (existente, renomeado)          │
│  Canvas 3D (Three.js /  │  │                                  │
│  @react-three/fiber)     │  │  Framer Motion (DOM)             │
│                          │  │  DrawRevealSequence              │
│  Recebe:                 │  │  Fallback quando WebGL falta     │
│  - drawResult (readonly) │  │                                  │
│  - revealState           │  │  Complementar ao 3D:              │
│  - themeColors           │  │  - Botoes de controle            │
│                          │  │  - Barra de progresso            │
│  Objetos 3D:             │  │  - Informacao de equipe          │
│  - Esferas com logos     │  │                                  │
│  - Potes/urns de sorteio │  │                                  │
│  - Particulas celebracao  │  │                                  │
└──────────────────────────┘  └──────────────────────────────────┘
                           │
                           │ currentIndex, isRevealing, revealDuration
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      useDrawReveal.ts                           │
│                                                                 │
│  State machine: IDLE → READY → DRAWING → REVEALING →           │
│                  REVEALED → COMPLETED (+ ERROR, CANCELLED)      │
│                                                                 │
│  Gerencia sequencia de revelacao (buildRevealSequence)          │
│  Timing de animacoes                                            │
│  Eventos de teclado (espaco, seta)                             │
│  Acessibilidade: prefers-reduced-motion                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Novo Arquivo: useDrawReveal.ts

```typescript
// Hook de revelacao do sorteio — estado e sequencia
// Reutiliza buildRevealSequence de DrawPresentation.tsx

export type RevealState =
  | 'idle'           // Inicial, aguardando
  | 'ready'          // Sequencia preparada, aguardando inicio
  | 'drawing'        // Animacao de selecao em andamento
  | 'revealing'      // Revelando resultado atual
  | 'revealed'       // Resultado atual visivel
  | 'completed'      // Todos os itens revelados
  | 'error'          // Erro durante revelacao
  | 'cancelled';     // Usuario cancelou

export interface UseDrawRevealOptions {
  result: DrawResult;
  teams: TeamRecord[];
  revealDurationMs?: number;  // padrao: 2500
  drawDurationMs?: number;    // duracao da animacao de "sorteio" (3D)
  onRevealItem?: (event: DrawRevealEvent, team: TeamRecord) => void;
  onComplete?: (events: DrawRevealEvent[]) => void;
}

export function useDrawReveal(options: UseDrawRevealOptions): UseDrawRevealReturn {
  // state: RevealState
  // currentIndex: number
  // currentEvent: DrawRevealEvent | null
  // currentTeam: TeamRecord | null
  // sequence: DrawRevealEvent[]
  // isComplete: boolean
  // progress: number  // 0-100
  // next(): void      // avanca para proximo item
  // reset(): void     // reinicia do inicio
  // cancel(): void    // cancela e volta a idle
}
```

### 2.3 Novo Arquivo: useWebGLCapability.ts

```typescript
// Detecta capacidade WebGL do browser

export function useWebGLCapability(): {
  isSupported: boolean;
  isMobile: boolean;
  renderer: string | null;  // e.g. "Apple GPU", "Adreno 660"
  vendor: string | null;
  maxTextureSize: number;
  preferLowPower: boolean;  // bateria baixa ou GPU lenta
}
```

Implementacao:
1. Cria canvas temporario
2. Obtem `WebGLRenderingContext`
3. Le `UNMASKED_RENDERER_WEBGL`, `UNMASKED_VENDOR_WEBGL`
4. Le `MAX_TEXTURE_SIZE`
5. Detecta mobile via `navigator.maxTouchPoints > 0`
6. Heuristica: Apple GPU + mobile → preferLowPower

### 2.4 Novo Arquivo: DrawOrchestrator.tsx

```typescript
interface DrawOrchestratorProps {
  isOpen: boolean;
  result: DrawResult;
  teams: TeamRecord[];
  competition: CompetitionRecord;
  onClose: () => void;
  revealDurationMs?: number;
  drawDurationMs?: number;
}

export function DrawOrchestrator({
  isOpen,
  result,
  teams,
  competition,
  onClose,
  revealDurationMs,
  drawDurationMs,
}: DrawOrchestratorProps) {
  const { isSupported, isMobile, preferLowPower } = useWebGLCapability();
  const { state, currentIndex, sequence, next, reset } = useDrawReveal({
    result,
    teams,
    revealDurationMs,
    drawDurationMs,
  });

  if (!isSupported || preferLowPower) {
    return (
      <DrawPresentation2D
        result={result}
        teams={teams}
        competition={competition}
        revealDurationMs={revealDurationMs}
        onClose={onClose}
        // Props expandidas para suportar o hook
        externalState={state}
        externalSequence={sequence}
        onExternalNext={next}
      />
    );
  }

  return (
    <DrawScene3D
      result={result}
      teams={teams}
      competition={competition}
      sequence={sequence}
      currentIndex={currentIndex}
      isMobile={isMobile}
      onReveal={next}
      onClose={onClose}
    />
  );
}
```

### 2.5 Novo Arquivo: DrawScene3D.tsx

```typescript
interface DrawScene3DProps {
  result: DrawResult;
  teams: TeamRecord[];
  competition: CompetitionRecord;
  sequence: DrawRevealEvent[];
  currentIndex: number;
  isMobile: boolean;
  onReveal: () => void;
  onClose: () => void;
}

export function DrawScene3D({
  result,
  teams,
  competition,
  sequence,
  currentIndex,
  isMobile,
  onReveal,
  onClose,
}: DrawScene3DProps) {
  // THREE.js Scene via @react-three/fiber
  // Canvas responsivo (resize observer)
  // Objetos 3D: esferas com logos, animacao de entrada
  // Particulas via @react-three/drei Particles ou confetti
  // Camera fixa ou com leve animacao
  // Iluminacao: ambiente + direcional
}
```

## 3. Interfaces de Contrato

### 3.1 DrawRevealSequence (estendida)

```typescript
// Estende DrawRevealEvent existente em DrawPresentation.tsx
// Adiciona metadata para renderizacao 3D

export interface DrawRevealSequenceItem extends DrawRevealEvent {
  team: TeamRecord;                    // Resolvido pelo orchestrator
  position3D?: { x: number; y: number; z: number };  // Posicao no espaco 3D
  color?: string;                       // Cor do grupo (para diferenciao)
  animationDelayMs?: number;            // Delay individual
}
```

### 3.2 DrawSceneConfig

```typescript
export interface DrawSceneConfig {
  // Objetos
  showPots: boolean;           // Mostrar potes/urns de sorteio
  showParticles: boolean;       // Particulas de celebracao
  particleCount: number;       // Quantidade de particulas (default: 50)

  // Camera
  cameraPreset: 'front' | 'top' | 'orbit';
  enableOrbitControls: boolean;

  // Performance
  dpr: number;                 // Device pixel ratio (max: isMobile ? 1 : 2)
  shadowMapEnabled: boolean;  // Sombras (desligar em mobile)
  antialias: boolean;

  // Iluminacao
  ambientIntensity: number;
  directionalIntensity: number;
  accentColor: string;        // Cor de acento do tema BASEOS
}
```

## 4. Maquina de Estados de Revelacao

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         │
┌──────────┐    next()    ┌──────┐    timeout     ┌──────────┐  │
│   IDLE   │──────────────│READY │───────────────▶│ REVEALING│  │
└──────────┘              └──────┘                └────┬─────┘  │
   ▲  ▲  ▲                 │                           │        │
   │  │  │ reset()         │ next()                    │ timeout │
   │  │  │                 ▼                           ▼        │
   │  │  │              ┌──────────┐              ┌─────────┐   │
   │  │  │              │ DRAWING │              │REVEALED │   │
   │  │  │              └────┬─────┘              └────┬────┘   │
   │  │  │                   │                         │        │
   │  │  │                   │ next()                  │ next() │
   │  │  │                   ▼                         │        │
   │  │  │               CANCELLED ◀──────────────┐  │        │
   │  │  │                                       │  │        │
   │  │  │                                   ┌──┴──┴───┐   │
   │  │  │              ┌─────────┐           │COMPLETED│◀──┘   │
   │  │  │              │  ERROR  │           └─────────┘       │
   │  └──┼──────────────┤         │                            │
   │     └──────────────└─────────┘                            │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

### Transicoes

| De | Para | Gatilho |
|----|------|---------|
| `idle` | `ready` | `prepareSequence()` |
| `ready` | `drawing` | `next()` (inicia animacao de selecao) |
| `drawing` | `revealing` | `timeout` (animacao de selecao concluida) |
| `drawing` | `cancelled` | `cancel()` |
| `revealing` | `revealed` | `timeout` (resultado visivel) |
| `revealed` | `drawing` | `next()` (proximo item) |
| `revealed` | `completed` | `next()` (ultimo item) |
| Qualquer | `error` | excecao nao tratada |
| `drawing` | `cancelled` | `cancel()` |
| `cancelled` | `idle` | `reset()` |
| `error` | `idle` | `reset()` |

## 5. Fallback 2D (Descritor)

O `DrawPresentation.tsx` existente sera renomeado para `DrawPresentation2D.tsx` e
subclassificado pelo `DrawOrchestrator` quando WebGL falhar.

O fallback 2D mantem:
- Todas as animacoes Framer Motion existentes
- Interface `DrawRevealEvent`
- Sequencia `buildRevealSequence()`
- Timing de `revealDurationMs`

O fallback 2D ganha:
- Props de controle externo (`externalState`, `externalSequence`, `onExternalNext`)
- Sincronizacao com o hook `useDrawReveal`
- Barra de progresso
- Atalhos de teclado

## 6. Configuracao de Build (vite.config.ts)

```typescript
// Adicionar ao manualChunks existente
if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
  return 'vendor-three';
}
if (id.includes('three')) {
  return 'vendor-three-core';
}
```

Resultado esperado:
- `vendor-three-core`: three (bundle ~500KB)
- `vendor-three`: @react-three/fiber + @react-three/drei (bundle ~200KB)
- Lazy loading: `DrawScene3D` carregado sob demanda via `React.lazy()`

## 7. Plano de Migracao

**Fase 3.2** (implementacao):
1. Criar `useWebGLCapability.ts`
2. Criar `useDrawReveal.ts` com state machine
3. Criar `DrawOrchestrator.tsx` com deteccao de suporte
4. Criar `DrawScene3D.tsx` (esfera basica com logo, sem animacao complexa)
5. Renomear `DrawPresentation.tsx` → `DrawPresentation2D.tsx`
6. Atualizar `LiveDrawModal.tsx` para usar `DrawOrchestrator`
7. Lazy load do DrawScene3D
8. Lazy load das libs Three.js
9. Testes

**Fase 3.3** (animacoes):
- Animacao de entrada das esferas
- Pot/urna de sorteio
- Particulas de celebracao
- Camera cinematica

**Fase 3.4** (otimizacao):
- Performance em mobile
- Preloading de assets
- Cache de geometrias

## 8. Riscos Enderecados pela Arquitetura

| Risco | Mitigacao |
|-------|-----------|
| WebGL nao suportado | Fallback 2D automatico via `useWebGLCapability` |
| Mobile lento | `preferLowPower` detection, DPR dinamico, shadows off |
| Bundle inflation | Lazy loading via `React.lazy` + dynamic import |
| Sorteio diferente 2D vs 3D | Motor واحد (DrawResult), mesma sequencia `buildRevealSequence` |
| Conflito de estado | State machine centralizada em `useDrawReveal`, UI apenas reage |
| Memória 3D | Cleanup de geometrias/materials no unmount do Canvas |

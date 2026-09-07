# 30 — Draw Arena Implementation Plan

## Visão Geral

Plano sequencial para implementar a Draw Arena Cinematográfica sem quebrar o sorteio existente.

---

## FASE 1: Setup e Infraestrutura (1-2 semanas)

### 1.1 Dependências

```bash
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

**Validação:**
```bash
npm run build  # Sem erros
npm run lint   # Sem erros
npm test       # Todos os testes passam
```

### 1.2 Estrutura de Pastas

```
src/components/draw/
├── cinematic/
│   ├── DrawArenaCinematic.tsx
│   ├── ArenaScene.tsx
│   ├── ArenaUrn.tsx
│   ├── ArenaTeamToken.tsx
│   ├── ArenaGroups.tsx
│   ├── ArenaCameraController.tsx
│   ├── ArenaLighting.tsx
│   └── ArenaParticles.tsx
│
├── hud/
│   ├── DrawArenaHUD.tsx
│   ├── CompetitionHeader.tsx
│   ├── DrawProgress.tsx
│   ├── CurrentTeamCard.tsx
│   ├── GroupStatusPanel.tsx
│   └── PresentationControls.tsx
│
├── state/
│   ├── useDrawArenaState.ts
│   ├── useDrawArenaCamera.ts
│   └── useDrawArenaAnimation.ts
│
└── constants/
    └── drawArenaCinematic.ts
```

### 1.3 Configuration File

**`src/components/draw/constants/drawArenaCinematic.ts`**

```typescript
export const ARENA_CONFIG = {
  // Timings
  INTRO_DURATION: 2500,
  PREPARE_DURATION: 800,
  SELECT_DURATION: 1200,
  FLIGHT_DURATION: 1500,
  IMPACT_DURATION: 800,
  RETURN_DURATION: 700,
  
  // Positions
  ESTABLISHING_SHOT: { x: 0, y: -250, z: 700 },
  CLOSEUP_URN: { x: 0, y: 0, z: 350 },
  FINAL_REVEAL: { x: 0, y: -300, z: 1200 },
  
  // Sizes
  URN_RADIUS: 80,
  TEAM_TOKEN_SIZE: 20,
  GROUP_SIZE: { width: 200, height: 150 },
  
  // Colors
  GOLD: 0xf6c76b,
  BLUE: 0x3b82f6,
  PURPLE: 0x8b5cf6,
  BLACK_BG: 0x020816
};
```

### 1.4 Types Estendidos

**`src/types/drawCinematic.ts`** (NOVO)

```typescript
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  duration: number;
  easing?: string;
}

export interface ArenaState {
  state: 'idle' | 'intro' | 'ready' | 'prepare' | 'select' | 
         'flying' | 'impact' | 'return' | 'final' | 'complete';
  currentTeamIndex: number;
  currentGroupIndex: number;
  progress: number;
  isPaused: boolean;
}

export interface TeamTokenData {
  teamId: string;
  position: [number, number, number];
  highlighted: boolean;
  flying: boolean;
  settled: boolean;
}
```

---

## FASE 2: Camada 3D Básica (2-3 semanas)

### 2.1 Componente Principal

**`src/components/draw/cinematic/DrawArenaCinematic.tsx`**

```typescript
import { Canvas } from '@react-three/fiber';
import { ArenaScene } from './ArenaScene';

export function DrawArenaCinematic({ result, teams, competition }) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Canvas camera={{ position: [0, -250, 700], fov: 45 }}>
        <ArenaScene 
          result={result} 
          teams={teams} 
          competition={competition}
        />
      </Canvas>
    </div>
  );
}
```

### 2.2 Cena 3D Base

**`src/components/draw/cinematic/ArenaScene.tsx`**

```typescript
export function ArenaScene({ result, teams, competition }) {
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[200, 300, 200]} 
        intensity={0.8}
        castShadow
      />
      
      {/* Environment */}
      <mesh position={[0, -100, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color={0x050c1d} />
      </mesh>
      
      {/* Arena Objects */}
      <DrawUrn />
      <ArenaTeamTokens teams={teams} />
      <ArenaGroups groups={result.groups} />
      
      {/* Camera */}
      <ArenaCameraController state={arenaState} />
    </>
  );
}
```

### 2.3 Urna

**`src/components/draw/cinematic/ArenaUrn.tsx`**

```typescript
export function DrawUrn() {
  const urnRef = useRef();
  
  // Rotação contínua
  useFrame(() => {
    if (urnRef.current) {
      urnRef.current.rotation.z += 0.01;
    }
  });
  
  return (
    <mesh ref={urnRef} castShadow>
      <icosahedronGeometry args={[80, 4]} />
      <meshStandardMaterial
        color={0xf6c76b}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}
```

### 2.4 Team Tokens

**`src/components/draw/cinematic/ArenaTeamToken.tsx`**

```typescript
export function ArenaTeamToken({ team, index, isHighlighted }) {
  const tokenRef = useRef();
  
  useFrame(() => {
    if (tokenRef.current && !isHighlighted) {
      // Órbita
      const angle = (index / 24) * Math.PI * 2 + time * 0.01;
      tokenRef.current.position.x = Math.cos(angle) * 150;
      tokenRef.current.position.y = Math.sin(angle) * 150 * 0.6;
    }
  });
  
  return (
    <mesh 
      ref={tokenRef} 
      castShadow
      scale={isHighlighted ? 1.4 : 1}
    >
      <sphereGeometry args={[20, 32, 32]} />
      <meshStandardMaterial
        map={textureLoader.load(team.logoUrl)}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}
```

### 2.5 Grupos

**`src/components/draw/cinematic/ArenaGroups.tsx`**

```typescript
export function ArenaGroups({ groups }) {
  const positions = [
    [-280, -200],  // A
    [280, -200],   // B
    [-280, 200],   // C
    [280, 200]     // D
  ];
  
  return (
    <>
      {groups.map((group, i) => {
        const [x, y] = positions[i] || [0, 0];
        return (
          <DrawGroupStation 
            key={group.name}
            group={group}
            position={[x, y, 0]}
          />
        );
      })}
    </>
  );
}
```

### 2.6 Testes Fase 2

```bash
npm test src/components/draw/cinematic/

Checklist:
- [ ] ArenaUrn renderiza
- [ ] TeamTokens renderizam em órbita
- [ ] ArenaGroups renderizam corretamente
- [ ] No console errors
- [ ] Build sem warnings
```

---

## FASE 3: State Machine e Animações (2-3 semanas)

### 3.1 Hook de Estado

**`src/components/draw/state/useDrawArenaState.ts`**

```typescript
export function useDrawArenaState(result: DrawResult) {
  const [state, setState] = useState<ArenaState>('idle');
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const advance = () => {
    // Lógica de transição entre estados
  };
  
  const pause = () => setState(prev => ({ ...prev, isPaused: true }));
  const resume = () => setState(prev => ({ ...prev, isPaused: false }));
  
  return { state, advance, pause, resume, currentIndex };
}
```

### 3.2 Controlador de Câmera

**`src/components/draw/state/useDrawArenaCamera.ts`**

```typescript
export function useDrawArenaCamera(arenaState) {
  const camera = useThree((state) => state.camera);
  
  useEffect(() => {
    const targetState = getCameraState(arenaState.state);
    animateCamera(camera, targetState);
  }, [arenaState.state]);
  
  return camera;
}
```

### 3.3 Orquestrador de Animações

**`src/components/draw/state/useDrawArenaAnimation.ts`**

```typescript
export function useDrawArenaAnimation(state, result) {
  const drawSequence = useMemo(
    () => buildRevealSequence(result.groups),
    [result.groups]
  );
  
  useEffect(() => {
    // Executar state machine baseado em tempo
    const timer = setInterval(() => {
      updateState();
    }, 16);  // ~60 FPS
    
    return () => clearInterval(timer);
  }, [state]);
}
```

### 3.4 Testes Fase 3

```bash
npm test src/components/draw/state/

Checklist:
- [ ] State machine transitions correctly
- [ ] Camera moves according to state
- [ ] Timings são precisos (±50ms)
- [ ] Keyboard controls funcionam
- [ ] Pause/Resume funcionam
```

---

## FASE 4: HUD e UI (1-2 semanas)

### 4.1 HUD Principal

**`src/components/draw/hud/DrawArenaHUD.tsx`**

```typescript
export function DrawArenaHUD({ state, competition }) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <CompetitionHeader competition={competition} />
      <DrawProgress state={state} />
      <PresentationControls state={state} />
      <GroupStatusPanel state={state} />
    </div>
  );
}
```

### 4.2 Componentes HUD

- `CompetitionHeader.tsx` - Título, logo, identificação
- `DrawProgress.tsx` - Barra de progresso
- `CurrentTeamCard.tsx` - Equipe selecionada
- `GroupStatusPanel.tsx` - Status dos grupos
- `PresentationControls.tsx` - Botões play/pause/skip

### 4.3 Testes Fase 4

```bash
npm test src/components/draw/hud/

Checklist:
- [ ] HUD renderiza sem sobreposição
- [ ] Texto é legível
- [ ] Controles são clickáveis
- [ ] Responsive em mobile
```

---

## FASE 5: Post-Processing e Estilização (1 semana)

### 5.1 Bloom e Effects

```typescript
// Usar EffectComposer de drei
import { EffectComposer, Bloom } from '@react-three/postprocessing';

<EffectComposer>
  <Bloom strength={1.5} />
  {/* Outros passes */}
</EffectComposer>
```

### 5.2 Color Grading (Opcional)

Adicionar LUT para look cinematográfico

### 5.3 Testes Fase 5

```bash
Checklist:
- [ ] Bloom aplica corretamente
- [ ] Sem artefatos de rendering
- [ ] Performance mantém 60 FPS
```

---

## FASE 6: Otimização e Testes (1-2 semanas)

### 6.1 Performance

- Implementar instancing
- Adicionar LOD
- Otimizar texturas
- Profile com Chrome DevTools

### 6.2 Acessibilidade

- Testes com axe
- Screen reader testing
- Keyboard navigation
- Reduced motion

### 6.3 Cross-browser

- Chrome, Firefox, Safari
- Desktop e mobile
- Diferentes resoluções

### 6.4 Testes Finais

```bash
npm run build
npm run lint
npm run test -- --coverage

Resultado esperado:
- ✅ Build sem warnings
- ✅ ESLint: 0 erros
- ✅ 80%+ coverage
- ✅ Bundle size < 500KB gzipped
- ✅ 60 FPS desktop, 30 FPS mobile
```

---

## FASE 7: Integração com DrawPage (1 semana)

### 7.1 Conexão

Adicionar flag para mostrar `DrawArenaCinematic` ou `DrawScene3D` (fallback)

```typescript
export function LiveDrawModal({ result, teams, competition }) {
  const [useCinematic, setUseCinematic] = useState(true);
  
  return (
    <>
      {useCinematic ? (
        <DrawArenaCinematic 
          result={result}
          teams={teams}
          competition={competition}
        />
      ) : (
        <DrawScene3D  /* fallback existente */
          result={result}
          teams={teams}
          competition={competition}
        />
      )}
    </>
  );
}
```

### 7.2 Feature Flag

```typescript
// Ativar Draw Arena Cinematográfica via:
// 1. localStorage
// 2. Query param (?cinema=true)
// 3. A/B testing backend
```

---

## FASE 8: Documentação e Deploy (1 semana)

### 8.1 Documentação

- README da Draw Arena
- Guia de contribuição
- API docs para componentes
- Troubleshooting guide

### 8.2 Deploy

```bash
# Tag release
git tag -a v2.1.0 -m "Draw Arena Cinematográfica"

# Deploy para staging
npm run build
# Test em staging

# Deploy para produção
# Rollback plan: git revert --no-commit
```

---

## Timeline Total

```
Semana  1-2:  Fase 1 (Setup)
Semana  3-5:  Fase 2 (3D Base)
Semana  6-8:  Fase 3 (State Machine)
Semana  9-10: Fase 4 (HUD)
Semana 11:    Fase 5 (Effects)
Semana 12-13: Fase 6 (Otimização)
Semana 14:    Fase 7 (Integração)
Semana 15:    Fase 8 (Deploy)
---
Total: ~15 semanas (3.5 meses)
```

---

## Checkpoints de Validação

### Depois de Fase 2
- ✅ 3D renderiza
- ✅ Sem erros WebGL
- ✅ 60 FPS baseline

### Depois de Fase 3
- ✅ State machine funciona
- ✅ Animações são suaves
- ✅ Timings precisos

### Depois de Fase 4
- ✅ HUD acessível
- ✅ Controles funcionam
- ✅ Responsivo

### Depois de Fase 6
- ✅ Performance targets atingidos
- ✅ Acessibilidade completa
- ✅ Cross-browser OK

### Depois de Fase 7
- ✅ Integração seamless
- ✅ Fallback funciona
- ✅ Nenhuma regressão

### Depois de Fase 8
- ✅ Documentação completa
- ✅ Testes de smoke OK
- ✅ Pronto para produção

---

## Conclusão

Plano de implementação:
- ✅ Sequencial e incremental
- ✅ Validação em cada fase
- ✅ Nenhuma quebra do sorteio existente
- ✅ Rollback plan em cada etapa

**Próximo:** Análise de Riscos

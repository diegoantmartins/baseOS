# 26 — Draw Arena Camera Architecture

## Visão Geral

A câmera cinematográfica é o elemento crítico que transforma uma apresentação 2D em uma experiência imersiva 3D.

**Princípio:** A câmera não é um observador passivo. Ela narra a história do sorteio.

---

## 1. CONCEITOS FUNDAMENTAIS

### 1.1 Tipos de Movimentos

**Dolly (Trucking)**
- Câmera se aproxima ou afasta do objeto
- Mantém ângulo fixo
- Cria sensação de profundidade
- Uso: Aproximar para sorteio, afastar para visão geral

**Pan**
- Câmera rotaciona horizontalmente
- Sem movimento de posição
- Uso: Revelar grupo destino

**Tilt**
- Câmera rotaciona verticalmente
- Uso: Ver de cima para baixo

**Tracking Shot**
- Câmera segue um objeto em movimento
- Mantém objeto no enquadramento
- Uso: Acompanhar equipe voando

**Establishing Shot**
- Vista inicial que mostra localização geral
- Larga profundidade
- Uso: Abertura e retorno após cada sorteio

### 1.2 Propriedades da Câmera

```typescript
interface CameraState {
  // Posição 3D
  position: { x: number; y: number; z: number };
  
  // Ponto para onde câmera olha (look-at target)
  target: { x: number; y: number; z: number };
  
  // Rotação (pitch, yaw, roll)
  rotation: { x: number; y: number; z: number };
  
  // Field of view (FOV)
  fov: number;
  
  // Distância focal (para depth of field)
  focusDistance: number;
  
  // Velocidade de movimento
  speed: number;
  
  // Duração da transição
  transitionDuration: number;
}
```

---

## 2. POSIÇÕES DE CÂMERA MAPEADAS

### 2.1 Establishing Shot (Repouso)

**Uso:** Estados IDLE, ARENA_READY, após RETURN_TO_URN

```
Posição:
  x: 0
  y: -250  (ligeiramente abaixo para ver os grupos)
  z: 700   (afastada)

Target (Look-at):
  x: 0
  y: 0
  z: 0

FOV: 45°
Distância: 700px
Ângulo: ~45° acima da horizontal
```

**Referência visual:**
```
        Câmera
           ↓ (afastada e acima)
     
        Urna (centro)
        /    \
    Grupo A  Grupo B
    /          \
Grupo C  Grupo D
```

### 2.2 Close-up da Urna (Preparação)

**Uso:** Estado DRAWING_PREPARE

```
Posição:
  x: 0
  y: 0      (alinhado com urna)
  z: 350    (próximo)

Target:
  x: 0
  y: 0
  z: 0

FOV: 50° (ligeiramente zoom)
Distância: 350px
Ângulo: ~30° acima
```

**Transição:**
- De: Establishing Shot
- Para: Close-up
- Duração: 0.8s
- Easing: easeOutQuad

### 2.3 Tracking Shot (Voo da Equipe)

**Uso:** Estado TEAM_FLYING

```
Câmera acompanha a equipe:

T(0):   Posição da urna
        Position: (0, 0, 350)

T(0.5): Meio do caminho
        Position: interpolada

T(1.0): Posição do grupo
        Position: (grupo.x * 0.5, grupo.y * 0.5, 250)

Distância mantida: ~250px da equipe
Ângulo: Sempre apontando para equipe
Profundidade: Acompanha Z da trajetória
```

**Parâmetros:**
- Duração: 1.5s
- Easing: easeInOutCubic
- Lead distance: 50px à frente da equipe

### 2.4 Impacto no Grupo (GROUP_IMPACT)

**Uso:** Estado GROUP_IMPACT

```
Posição:
  x: grupo.x (ligeiramente deslocada)
  y: grupo.y
  z: 200    (mais próximo)

Target:
  x: grupo.x
  y: grupo.y
  z: 0

FOV: 55° (zoom mais próximo)
Distância: 200px do grupo
Ângulo: ~35° para ver os membros
```

**Duração:** 0.8s
**Transição:** easeOutQuad

### 2.5 Wide Shot Final (FINAL_REVEAL)

**Uso:** Estado FINAL_REVEAL

```
Posição:
  x: 0
  y: -300  (acima e afastada)
  z: 1200  (muito afastada)

Target:
  x: 0
  y: 0
  z: 0

FOV: 35° (zoom-out, visão completa)
Distância: 1200px
Ângulo: ~60° acima (bird's eye)
```

**Sensação:** Ver toda a arena como uma composição final

---

## 3. INTERPOLAÇÃO E EASING

### 3.1 Tipos de Easing

**easeInOutQuad**
- Uso: Transições suaves e rápidas
- Curva: Aceleração no início, desaceleração no fim
- Ideal para movimentos de câmera

**easeInOutCubic**
- Uso: Movimentos mais naturais
- Curva: Mais suave que Quad
- Ideal para tracking shots

**easeOutQuad**
- Uso: Aproximações rápidas
- Curva: Início rápido, desaceleração suave
- Ideal para Dolly In

**linear**
- Uso: Raramente
- Cria sensação mecânica, evitar

### 3.2 Interpolação de Posição

```javascript
// Lerp linear
position = start + (target - start) * t;

// Com easing
eased_t = easeFunction(t);
position = start + (target - start) * eased_t;

// Onde t vai de 0 a 1 durante transitionDuration
t = elapsed / transitionDuration;
```

### 3.3 Interpolação de Look-At

```javascript
// Quaternion SLERP para rotação suave
rotation = slerp(startRotation, targetRotation, t);

// OU simplesmente lerp de target
target = start_target + (end_target - start_target) * eased_t;
```

---

## 4. CONSTRAINTS E LIMITES

### 4.1 Espaço de Câmera

```
Limites:
  x: [-800, 800]  (lado a lado)
  y: [-600, 400]  (cima e baixo)
  z: [200, 1500]  (profundidade)

Distância mínima de urna: 200px
Distância máxima de tela: 1500px
FOV mínimo: 35°
FOV máximo: 60°
```

### 4.2 Colisões

Neste caso, sem colisão com objetos (arena é vazia).

Mas no futuro, possível adicionar:
- Câmera não penetra urna
- Câmera não atravessa grupos
- Câmera respeita "parede" de fundo

### 4.3 Near/Far Clipping Planes

```
Near plane: 10px
Far plane: 2000px

Tudo fora desse range é culled (não renderizado)
```

---

## 5. MOVIMENTOS COMPOSTOS

### 5.1 Tracking + Pan (Voo + Revelação)

**Cenário:** Equipe voa enquanto câmera segue e pana para grupo

```
Início (T=0):
  Câmera aponta para urna
  Equipe sai

Meio (T=0.5):
  Câmera segue trajetória
  Começa a pan para grupo destino

Fim (T=1.0):
  Câmera aponta para grupo
  Equipe chega
```

**Parâmetros:**
- Position: Segue equipe (suave)
- Target: Transiciona de urna para grupo
- Easing: easeInOutCubic para ambos

### 5.2 Zoom + Dolly (Aproximação Dramática)

**Cenário:** Câmera se aproxima E faz zoom IN

```
Proprietários animados:
- position.z: 700 → 350 (Dolly In)
- fov: 45° → 55° (Zoom In)

Duração: 0.8s
Easing: easeOutQuad
```

**Efeito:** Intensifica foco na urna

---

## 6. COMPORTAMENTO DINÂMICO

### 6.1 Responsividade a Interações

**Mouse em desktop:**
- Levar câmera se afastar levemente no repouso
- Seguir movimento de mouse para pequena rotação
- Sensibilidade: ~0.01 rad por pixel

**Touch em mobile:**
- Gesto de pinch: zoom in/out
- Gesto de rotação: pan horizontal
- Sensibilidade reduzida (não quebrar cinematografia)

### 6.2 Shake/Tremor (Opcional)

**Usa:** Em momentos de impacto dramático (GROUP_IMPACT)

```
Parâmetros:
  Amplitude: 2-3px
  Frequência: 8-10 Hz
  Duração: 0.4s
  Decay: Exponencial (diminui com o tempo)

Efeito: Sensação de impacto sem parecer "glitch"
```

### 6.3 Depth of Field (Bokeh)

**Conceito:** Focar em um ponto, deixar resto embaçado

**Uso:**
- Quando equipe é selecionada: Focar na equipe, urna levemente desfocada
- Quando equipe voa: Focar na equipe, grupos mais desfocados

**Parâmetros:**
- Focus distance: 300-400px (onde câmera foca)
- Blur radius: 10-20px (quanto desfoca)
- F-stop: Simular abertura da lente

**Implementação:** Post-processing em Three.js ou shader

---

## 7. COMPATIBILIDADE COM REDUCED MOTION

**Câmera normal:**
- Dolly suave (0.8s)
- Tracking elegante (1.5s)
- Easing sofisticado

**Câmera com reduced-motion:**
- Cortes imediatos entre posições (sem transição)
- FOV muda instantaneamente
- Sem tracking progressivo
- Sem depth of field

**Resultado:** Ainda narra a história, mas sem movimento contínuo

---

## 8. IMPLEMENTAÇÃO (Three.js + React Three Fiber)

### 8.1 Hook de Controle de Câmera

```typescript
interface CameraController {
  // Mover câmera para estado
  moveToState: (
    state: CameraState,
    duration: number,
    easing: EasingFunction
  ) => Promise<void>;
  
  // Transição suave entre dois estados
  transitionTo: (
    targetState: CameraState,
    duration: number,
    easing?: EasingFunction
  ) => void;
  
  // Obter câmera para ajustes manuais
  getCamera: () => THREE.Camera;
  
  // Reset para estado inicial
  reset: () => void;
}
```

### 8.2 Componente React Three Fiber

```typescript
<Canvas camera={{ position: [0, -250, 700], fov: 45 }}>
  <PerspectiveCamera makeDefault position={[0, -250, 700]} fov={45} />
  <CameraController state={arenaState} />
  {/* Scene content */}
</Canvas>
```

### 8.3 Animação com Framer Motion

```typescript
const cameraControls = useAnimationControls();

// Animar movimento
useEffect(() => {
  cameraControls.start({
    x: targetState.position.x,
    y: targetState.position.y,
    z: targetState.position.z,
    transition: {
      duration: 0.8,
      ease: "easeInOutQuad"
    }
  });
}, [targetState]);
```

---

## 9. PERFORMANCE CONSIDERATIONS

### 9.1 Frame Rate

**Target:** 60 FPS durante animations

**Otimização:**
- Usar Three.js para renderização eficiente
- Batching de geometrias
- LOD (Level of Detail) para grupos distantes
- Frustum culling automático

### 9.2 Cálculo de Posição

**Cada frame (60 FPS):**
1. Obter `t` (tempo decorrido / duração)
2. Aplicar easing para `eased_t`
3. Interpolar posição: `lerp(start, target, eased_t)`
4. Atualizar câmera
5. Re-render

**Custo:** Negligenciável (~0.1ms por frame)

---

## 10. TESTES E VALIDAÇÃO

### 10.1 Checklist

- [ ] Câmera não penetra urna
- [ ] Movimentos são suaves (sem "saltos")
- [ ] Equipe é sempre visível durante voo
- [ ] Grupos são visíveis quando câmera se move
- [ ] Transições não causam motion sickness
- [ ] Funciona em 2 monitores diferentes
- [ ] Reduzido movimento respeita preferências

### 10.2 Edge Cases

- Tela muito pequena (mobile) - verificar z-fighting
- Câmera em canto (near plane) - verificar clipping
- FOV extremo - verificar distorção
- Múltiplos sorteios em sequência - câmera reseta bem

---

## 11. TIMELINE SUGERIDA

```
Tempo | Evento           | Posição Câmera
------|------------------|-------------------------------
0.0s  | Início           | Establishing Shot
0.8s  | Prep             | Transiciona para Close-up
1.2s  | Seleção          | Permanece Close-up
2.7s  | Voo              | Tracking Shot (acompanha equipe)
4.2s  | Impacto          | Move para grupo
5.0s  | Retorno          | Volta a Establishing Shot
5.7s  | Próximo prep     | Pronto para próximo
```

---

## 12. CONCLUSÃO

A arquitetura de câmera:
- ✅ Prioriza cinematografia suave
- ✅ Narra visualmente o sorteio
- ✅ Mantém informações visíveis
- ✅ Respeita acessibilidade
- ✅ Otimizado para performance

**Próximo:** Arquitetura 3D (modelos, luzes, partículas)

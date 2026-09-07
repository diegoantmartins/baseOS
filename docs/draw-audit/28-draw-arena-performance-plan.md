# 28 — Draw Arena Performance Plan

## Metas de Performance

- ✅ 60 FPS em desktop moderno (GPU dedicada)
- ✅ 30 FPS aceitável em desktop médio
- ✅ Degradação progressiva em mobile
- ✅ Bundle size < 500KB gzipped
- ✅ Sem travamentos ou stutters
- ✅ Tempos de animação precisos (±50ms)

---

## 1. ANÁLISE DE CARGA

### 1.1 Objetos na Cena

**Quantidade padrão:**

```
Urna:             1
Team Tokens:     24 (máximo)
Groups:           4
Lights:           6 (1 ambient + 1 directional + 4 dinâmicos)
Particles:       ~100 (internas + flying)
Cameras:          1
Post-processing:  3 passes (Bloom, DOF, Color Grading)
Total triangles:  ~500K (com texturas)
```

### 1.2 Operações por Frame

**Durante sorteio (frame rendering):**

1. Update state machine (1ms)
2. Update camera position (2ms)
3. Update team animations (3ms)
4. Update light positions (1ms)
5. Render 3D scene (5-8ms)
6. Post-processing passes (3-5ms)
7. Update HUD / React (2ms)
8. Browser rendering (1ms)

**Total por frame:** ~18-25ms → 60 FPS ✅

---

## 2. OTIMIZAÇÕES PRIORITÁRIAS

### Priority 1: CRÍTICO

**Instancing para Team Tokens**
- Impacto: Reduz drawcalls de 24 para 1
- Custo: ~15% do tempo de render
- Implementação: 4h
- Benefício: Essencial para 60 FPS

**Frustum Culling**
- Impacto: Evita renderizar fora-de-câmera
- Custo: ~5% do tempo (automático no Three.js)
- Benefício: Essencial para mobile

**Shader Optimization**
- Usar shaders simples quando possível
- Evitar cálculos complexos por pixel
- Impacto: ~10% de melhoria

### Priority 2: IMPORTANTE

**LOD (Level of Detail)**
- Reduzir complexidade em distância
- Impacto: ~20% em mobile
- Implementação: 6h

**Texture Atlasing**
- Combinar múltiplas texturas em uma
- Reduz texture swaps
- Impacto: ~5% de melhoria

**Particle Count Reduction**
- Em mobile: 50% → 25% partículas
- Impacto: ~3-5% de melhoria em mobile

### Priority 3: NICE-TO-HAVE

**Depth of Field Optimization**
- Usar shader mais eficiente
- Impacto: ~2-3% de melhoria

**Shadow Optimization**
- Cascade shadow maps
- Impacto: ~5% se implementado

---

## 3. MÉTRICAS E MONITORAMENTO

### 3.1 Ferramentas

```typescript
// Chrome DevTools Performance
const perfStart = performance.now();
renderScene();
const perfEnd = performance.now();
console.log(`Frame time: ${perfEnd - perfStart}ms`);

// Three.js Stats
import Stats from 'three/examples/jsm/libs/stats.module.js';
const stats = new Stats();
renderer.domElement.appendChild(stats.dom);

// Diagnosticar GPU
const renderer = new THREE.WebGLRenderer({ antialias: true });
console.log(renderer.capabilities);
console.log(renderer.info);  // Triangles, textures, etc.
```

### 3.2 Benchmark Plan

**Desktop:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Resolution: 1920x1080

**Mobile:**
- iPhone 12+
- Samsung Galaxy S21+
- iPad Air (5th gen)

**Esperado:**
- Desktop: 55-60 FPS
- Mobile: 25-30 FPS

---

## 4. BUNDLE SIZE MANAGEMENT

### 4.1 Current Size (Baseline)

```
Atual (sem Three.js):
├── React + React Router:      200KB
├── Framer Motion:              50KB
├── UI Components (shadcn):    100KB
├── Tailwind CSS:               75KB
└── Other:                      80KB
---
Total:                         505KB
```

### 4.2 With Three.js Addition

```
Novo (com Three.js):
├── Three.js core:            600KB
├── React Three Fiber:         30KB
├── Drei:                     200KB
├── Existing:                 505KB
---
Total:                      1,335KB

Gzipped:
├── Three.js:                150KB
├── React Three Fiber:        10KB
├── Drei:                      50KB
├── Existing:                125KB
---
Total:                       335KB (novo add ~130KB)
```

### 4.3 Optimizações de Bundle

**Code-splitting:**
```typescript
// Lazy load DrawArena cinematográfica
const DrawArenaCinematic = lazy(() => 
  import('@/components/draw/cinematic/DrawArenaCinematic')
);

// Só carrega quando necessário
{isLiveModalOpen && <Suspense><DrawArenaCinematic /></Suspense>}
```

**Tree-shaking:**
- Usar ESM imports
- Evitar default exports
- Webpack/Vite removerá unused code

**Minification:**
- Vite automatic (build mode)
- Tamanho reduzido 40-50%

**Expected Final Size:**
```
Gzipped Three.js + Draw Arena: ~230KB
Total app with Arena: ~355KB
Acceptable para feature premium
```

---

## 5. DEGRADAÇÃO PROGRESSIVA

### 5.1 Hardware Detection

```typescript
function getGPUTier() {
  const capabilities = renderer.capabilities;
  
  // Tier 1: High-end (GPU dedicada, memory > 4GB)
  // Tier 2: Medium (GPU integrada, memory 2-4GB)
  // Tier 3: Low (old GPU, memory < 2GB)
  // Mobile: Special handling
}
```

### 5.2 Settings por Tier

| Aspecto | Tier 1 | Tier 2 | Tier 3 | Mobile |
|---------|--------|--------|--------|--------|
| Bloom | ✅ Full | ✅ Half | ⚠️ Subtle | ❌ Off |
| DOF | ✅ Yes | ⚠️ Cheap | ❌ No | ❌ No |
| Particles | 100 | 50 | 25 | 10 |
| Shadows | ✅ 2048 | ⚠️ 1024 | ❌ Off | ❌ Off |
| Texture Res | ✅ 4K | ⚠️ 2K | ❌ 1K | ❌ 512 |
| Poly Detail | 32 | 16 | 8 | 4 |
| FPS Target | 60 | 30 | 24 | 20-30 |

### 5.3 Fallback Mode

```typescript
if (performanceLevel === 'low') {
  // Desabilitar 3D, usar 2D + Framer Motion
  return <DrawScene2DFallback />;
}
```

---

## 6. CACHING E PRELOADING

### 6.1 Asset Preloading

```typescript
// Preload texturas antes da cena começar
const textureLoader = new THREE.TextureLoader();
const textures = await Promise.all([
  textureLoader.loadAsync('arena.jpg'),
  textureLoader.loadAsync('urn.jpg'),
  teamLogos.map(url => textureLoader.loadAsync(url))
]);
```

### 6.2 Shader Caching

```typescript
// Three.js cache shaders automaticamente
// Primeira vez: compila
// Próximas vezes: usa cache

// Browser cache (service worker)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 7. PROFILING DURANTE DESENVOLVIMENTO

### 7.1 Chrome Profiler

```
1. Abrir Chrome DevTools (F12)
2. Aba "Performance"
3. Record durante sorteio
4. Analisar flame chart
5. Identificar bottlenecks
```

### 7.2 Three.js Profiler

```typescript
renderer.info.autoReset = false;

function logPerformance() {
  console.log('Geometries:', renderer.info.memory.geometries);
  console.log('Textures:', renderer.info.memory.textures);
  console.log('Programs:', renderer.info.programs.length);
  console.log('Calls:', renderer.info.render.calls);
  console.log('Triangles:', renderer.info.render.triangles);
  console.log('Points:', renderer.info.render.points);
  console.log('Lines:', renderer.info.render.lines);
}
```

---

## 8. TESTES DE STRESS

### 8.1 Teste de Volume

```typescript
// 100 equipes (ao invés de 24)
const stress_test_teams = 100;

// Rodar sorteio completo
// Target: Manter 30 FPS mínimo
```

### 8.2 Teste de Duração

```typescript
// Rodar sorteio múltiplas vezes
for (let i = 0; i < 10; i++) {
  await runDraw();
}

// Verificar memory leaks
// Target: Memória não cresce indefinidamente
```

---

## 9. REAL-WORLD SCENARIOS

### 9.1 Desktop Presentation

**Setup:** 1920x1200, Projector, 60 FPS required

**Optimization:**
- Render to 1080p interno, scale para projetor
- Disable vsync constraints (60 FPS locked)
- High quality bloom e DOF

### 9.2 Mobile Preview

**Setup:** iPhone 13, 800x600

**Optimization:**
- Render to 50% resolution internal
- Aggressive culling
- No bloom, no DOF
- Simple shaders

### 9.3 Multiple Simultaneous

**Setup:** Multiple browsers open

**Optimization:**
- Pause animations quando em background tab
- Reduzir framerate para 30 FPS
- Minimal particle count

---

## 10. BENCHMARKS ESPERADOS

### Desktop (High-end GPU)

```
Frame time:   16-18ms
FPS:          55-60 ✅
GPU load:     70-80%
Memory:       ~300MB
```

### Desktop (Medium GPU)

```
Frame time:   25-33ms
FPS:          30-40 ✅
GPU load:     85-95%
Memory:       ~250MB
```

### Mobile (iOS)

```
Frame time:   33-50ms
FPS:          20-30 ✅
GPU load:     90%+
Memory:       ~200MB
Battery:      ~2-3% por minuto
```

---

## 11. CHECKLIST PRE-LAUNCH

- [ ] 60 FPS em desktop high-end
- [ ] 30 FPS em desktop medium
- [ ] 20+ FPS em mobile
- [ ] Sem memory leaks (5 runs)
- [ ] Texture memory < 150MB
- [ ] Bundle size < 500KB gzipped
- [ ] Funciona offline (com cache)
- [ ] Graceful degradation em mobile
- [ ] Chrome DevTools: zero warnings
- [ ] Lighthouse Performance > 80

---

## 12. MONITORAMENTO PÓS-LAUNCH

### 12.1 Telemetry

```typescript
// Coletar dados de performance real
analytics.track('draw_arena', {
  fps_average: avgFPS,
  frame_time_max: maxFrameTime,
  gpu_memory_used: gpuMemory,
  duration_seconds: totalDuration,
  device_type: 'desktop|mobile|tablet',
  os: navigator.platform
});
```

### 12.2 Error Reporting

```typescript
// Reportar issues de rendering
window.addEventListener('error', (e) => {
  if (e.message.includes('WebGL')) {
    errorTracker.captureException(e);
  }
});
```

---

## 13. ROADMAP DE OTIMIZAÇÃO

### Fase 1 (MVP)
- Instancing + LOD
- Code-splitting
- Basic preloading

### Fase 2 (Depois de 1 mês)
- Cascade shadows
- Particle system optimization
- Better texture atlasing

### Fase 3 (Future)
- GPU compute shaders
- Advanced profiling
- Machine learning-based optimization

---

## Conclusão

A estratégia de performance:
- ✅ Realista e atingível
- ✅ Degradação progressiva
- ✅ Monitoramento contínuo
- ✅ Roadmap claro

**Target:** 60 FPS desktop, 30 FPS mobile, sem sacrificar visual

Próximo: **Plano de Acessibilidade**

# BASEOS — FASE 3.1: Analise de Stack de Renderizacao

## 1. Objetivo

Analisar bibliotecas 3D/canvas candidatas para a camada de apresentacao do sorteio, comparando bundle, performance, suporte mobile, e adequacao ao contexto BASEOS.

## 2. Candidatas Analisadas

| Biblioteca | Categoria | Versao de Referencia |
|------------|-----------|---------------------|
| Three.js | Motor 3D core | latest (~0.170) |
| @react-three/fiber | React renderer para Three.js | latest (~8.x) |
| @react-three/drei | Helpers para R3F | latest (~9.x) |
| Framer Motion | Animacoes DOM (existente) | v12.29.0 |
| canvas-confetti | Particulas 2D em canvas | latest |
| GSAP | Animacoes avancadas | v3.12+ |

## 3. Three.js

### 3.1 Caracteristicas

- Motor 3D completo: geometrias, materiais, luzes, camera, renderer
- WebGL com fallback para WebGPU em navegadores modernos
- ECS-like: cena, objetos (Mesh), materiais, luzes
- Suporte a sombras, post-processing, physics (via plug-ins)
- Bundler: tree-shakeable via ES modules

### 3.2 Bundle Size

| Modulo | Tamanho Aproximado |
|--------|-------------------|
| three (core) | ~500KB minificado + gzip ~150KB |
| three (sem examples) | ~450KB |
| three + OrbitControls | ~520KB |

### 3.3 Performance

- 60 FPS sustentado com ate ~10.000 meshes (GPU dependente)
- Geometry instancing para multiplos objetos identicos
- LOD (Level of Detail) para objetos distantes
- Shadow maps sao custosos: desativar em mobile

### 3.4 Compatibilidade

- Browsers: Chrome 9+, Firefox 4+, Safari 8+, Edge 17+
- WebGL 1.0: suporte universal em devices fabricados apos 2012
- WebGL 2.0: Chrome 56+, Firefox 51+, Safari 15+
- Mobile: iOS Safari 8+, Chrome Android

### 3.5 Adecuacao ao BASEOS

**Pros:**
- Padrao da industria para 3D na web
- Maior comunidade e documentacao
- Ecossistema maduro com R3F
- Tree-shakeable — carrega apenas o que usa

**Contras:**
- Bundle significativo (~500KB)
- Curva de aprendizado moderada
- Gerenciamento manual de memoria (geometrias, materiais)

## 4. @react-three/fiber (R3F)

### 4.1 Caracteristicas

- React renderer para Three.js
- Componentes como primitivos 3D: `<mesh>`, `<camera>`, `<light>`
- Declarativo: estado React controla cena 3D
- Suspense, error boundaries nativos
- hooks especiales: useFrame, useThree, useLoader

### 4.2 Bundle Size

| Componente | Tamanho Aproximado |
|------------|-------------------|
| @react-three/fiber | ~100KB |
| three (peer dep) | ~500KB |
| **Total** | **~600KB** |

### 4.3 Performance

- Reconciler otimizado para 3D (diferente do React DOM reconciler)
- Renderiza apenas o que mudou (comparacao de props)
- Suporte a `invalidate()` e `advance()` para controle granular
- Performance monitor via `@react-three/drei`

### 4.4 Adecuacao ao BASEOS

**Pros:**
- Integração natural com React (BASEOS usa React 18)
- Composable: `<Canvas>` com children declarativos
- Ecossistema drei oferece componentes prontos
- Suspense para loading de modelos/texturas

**Contras:**
- Requer Three.js (bundle composto)
- Overhead do reconciler em scenes simples
- Debug mais complexo (React DevTools + 3D)

## 5. @react-three/drei

### 5.1 Componentes Principais

- `<Html>` — renderizar HTML dentro do canvas 3D
- `<OrbitControls>` — camera interativa
- `<Stars>`, `<Sparkles>` — particulas
- `<Text>` — texto 3D com font loader
- `<Image>` — texturas em planos
- `<Environment>` — HDR lighting
- `<Float>`, `<Marathon>` — animacoes
- `<Bounds>`, `<Center>` — layout
- `<useTexture>` — loading de texturas

### 5.2 Bundle Size

| Componente | Tamanho Aproximado |
|------------|-------------------|
| @react-three/drei completo | ~300KB |
| Importacao por componente | 10-30KB cada |

**Recomendacao**: importar apenas componentes necessarios:
```typescript
import { OrbitControls, Stars } from '@react-three/drei';
// Nao importar o pacote inteiro
```

### 5.3 Adecuacao ao BASEOS

**Pros:**
- Componentes prontos: `<Stars>` para fundo, `<Float>` para animacao de esferas
- `<Html>` para exibir info de equipe sobre objetos 3D
- Abstrai complexidade de Three.js puro

**Contras:**
- Bundle adicional (~300KB se importar tudo)
- Dependencias transitivas (alguns componentes tem deps extras)

## 6. Framer Motion (Existente)

### 6.1 Caracteristicas

- Animacoes declarativas em DOM
- AnimatePresence, motion.div, variants
- Gestures: drag, pan, tap
- Layout animations (layoutId)
- Shared transitions

### 6.2 Bundle Size

| Componente | Tamanho Aproximado |
|------------|-------------------|
| framer-motion core | ~50KB (tree-shakeable) |
| Layout animations | +10KB |

### 6.3 Uso Atual no Sorteio

- Revelacao de equipes: scale, opacity, y, rotate, blur
- Background: radial-gradient com glow effect
- Spring transitions
- AnimatePresence para enter/exit

### 6.4 Adecuacao ao BASEOS

**Pros:**
- Ja presente no projeto (~50KB)
- Exatamente o que a apresentacao 2D precisa
- Nao substituido por 3D — complementar

**Contras:**
- Nao renders 3D — apenas DOM
- Usado apenas no fallback 2D

## 7. canvas-confetti

### 7.1 Caracteristicas

- Particulas 2D em canvas overlay
- Configuravel: cores, formas, forca, gravidade
- Suporte a promises (conffetti.async)
- Nao bloqueia UI

### 7.2 Bundle Size

| Biblioteca | Tamanho Aproximado |
|------------|-------------------|
| canvas-confetti | ~20KB |
| canvas-confetti (min+gzip) | ~7KB |

### 7.3 Adecuacao ao BASEOS

**Pros:**
- Leve (~20KB)
- Efeito de celebracao simples e eficaz
- Funciona sobre canvas 3D

**Contras:**
- 2D, nao 3D (particulas planas)
- Nao se integra naturalmente ao R3F

**Alternativa 3D**: `<Sparkles>` do drei ou sistema de particulas custom com Three.js

## 8. GSAP

### 8.1 Caracteristicas

- Animacoes de alto desempenho (rewrite com核心竞争力)
- Timeline para sequenciar animacoes
- ScrollTrigger, Flip
- Plugins: MorphSVG, ScrollSmoother

### 8.2 Bundle Size

| Componente | Tamanho Aproximado |
|------------|-------------------|
| GSAP core | ~60KB |
| ScrollTrigger | +25KB |
| Flip | +10KB |

### 8.3 Adecuacao ao BASEOS

**Pros:**
- Performance maxima para animacoes DOM
- Timeline para sincronizar sequencia de revelacao

**Contras:**
- Bundle extra (~60-95KB)
- Framer Motion ja cumpre papel similar
- Nao renderiza 3D

## 9. Recomendacao de Stack

### Stack Completa (3D)

| Biblioteca | Uso | Bundle Estimado |
|-----------|-----|-----------------|
| three | Core 3D engine | ~500KB |
| @react-three/fiber | React renderer | ~100KB |
| @react-three/drei | Helpers (seletivos) | ~50-100KB |
| **Total 3D** | | **~650-700KB** |
| framer-motion | Fallback 2D (existente) | ~50KB |
| **Total com fallback** | | **~700-750KB** |

### Carregamento

```typescript
// Lazy loading — carrega apenas quando necessario
const DrawScene3D = lazy(() => import('./components/draw/DrawScene3D'));

// Dynamic import das libs 3D
const DrawScene3D = lazy(async () => {
  const [r3f, drei, three] = await Promise.all([
    import('@react-three/fiber'),
    import('@react-three/drei'),
    import('three'),
  ]);
  // Combina em um unico chunk
  return import('./components/draw/DrawScene3D');
});
```

Via Vite `manualChunks`:
```typescript
// vite.config.ts
manualChunks(id) {
  if (id.includes('node_modules/three')) return 'vendor-three-core';
  if (id.includes('@react-three')) return 'vendor-three';
}
```

### Abordagem Recomendada

1. **Instalar apenas three + @react-three/fiber + drei** (sem alternatives)
2. **Importacao seletiva no drei**: importar apenas componentes necessarios
3. **Lazy loading**: `React.lazy` + `Suspense` para DrawScene3D
4. **Fallback 2D**: manter Framer Motion existente
5. **Nao instalar**: GSAP, canvas-confetti, ou outras libs de animacao

## 10. Suporte a WebGPU (Futuro)

Three.js ja suporta WebGPU como renderer alternativo:
```typescript
import { WebGLRenderer } from 'three/examples/jsm/renderers/WebGLRenderer';
// versus
import { WebGPURenderer } from 'three/examples/jsm/renderers/WebGPURenderer';
```

R3F suporta atraves do renderer:
```tsx
<Canvas
  gl={(canvas) => new WebGPURenderer({ canvas })}
  // ou
  gl={{ antialias: true }} // WebGL padrao
>
```

**Recomendacao**: manter WebGL por enquanto. WebGPU ainda esta em rollout ativo (Chrome 113+, Safari 17.4+). A arquitetura proposta deve ser agnóstica ao renderer.

## 11. Comparativo Final

| Criterio | Three.js + R3F | Canvas Only | CSS + Framer |
|----------|---------------|-------------|--------------|
| Realismo 3D | Excelente | Baixo | Nenhum |
| Bundle | ~650KB | ~0KB | ~50KB |
| Curva de aprendizado | Media-Alta | Baixa | Baixa |
| Mobile performance | Boa (com otimizacao) | Excelente | Excelente |
| Particulas 3D | Sim | 2D | Nao |
| Manutencao | Moderada | Baixa | Baixa |
| Experiencia premium | Alta | Media | Baixa |

# BASEOS — FASE 3.1: Estrategia de Performance

## 1. Principios

- Desktop e notebook: experiencia 3D completa com sombras e partıculas
- Mobile e dispositivos lentos: 3D simplificado ou fallback 2D
- Lazy loading: libs 3D carregadas apenas quando necessario
- Budget de objetos: manter a cena leve

## 2. Budget de Objetos 3D

Para o sorteio (tipico: ate 32 equipes em 4 grupos):

| Tipo | Quantidade | Justificativa |
|------|-----------|--------------|
| Esferas com logos | ate 32 | Uma por equipe |
| Geometrias de fundo | 2-5 | Chão + backdrop simples |
| Luzes | 3 | Ambiente + direcional + ponto |
| Particulas | 50-100 | Celebracao, opcional |
| **Total** | **< 150** | Manter 60 FPS |

Budgetmaximo de vertices: ~500.000 (esferas de 32x32 segmentos cada)

## 3. Device Pixel Ratio (DPR)

```typescript
// useWebGLCapability ou dentro do Canvas
const dpr = Math.min(
  window.devicePixelRatio,
  isMobile ? 1.5 : 2.0
);

<Canvas dpr={dpr} />
```

- Desktop: ate 2x
- Mobile: ate 1.5x
- Bateria baixa: 1x

## 4. Geometrias e Materiais

### 4.1 Geometrias Compartilhadas

```typescript
// Criar uma geometria e reutilizar para todas as esferas
const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 32, 32), []);

// Criar materiais individuais por equipe
const teamMaterial = useMemo(
  () => new THREE.MeshStandardMaterial({
    map: teamTexture,
    roughness: 0.3,
    metalness: 0.1,
  }),
  [teamTexture]
);
```

### 4.2 Texturas Otimizadas

- Tamanho maximo: 256x256px para logos (suficiente para esfera pequena)
- Formato: WebP com fallback PNG
- Mipmapping: habilitado
- Anisotropic filtering: 4x para logos inclinados

### 4.3 Instancing

Se houver mais de 50 esferas identicas:
```typescript
const instancedMesh = new THREE.InstancedMesh(
  geometry,
  material,
  count
);
```

## 5. Iluminacao

### 5.1 Configuracao Desktop

```typescript
<>
  <ambientLight intensity={0.4} />
  <directionalLight
    position={[5, 5, 5]}
    intensity={1.0}
    castShadow
    shadow-mapSize={[1024, 1024]}
  />
  <pointLight position={[-3, 3, 0]} intensity={0.5} color="#6366f1" />
</>
```

### 5.2 Configuracao Mobile

```typescript
<>
  <ambientLight intensity={0.6} />
  <directionalLight
    position={[5, 5, 5]}
    intensity={0.8}
    castShadow={false}  // Sem sombras
  />
</>
```

## 6. Lazy Loading

### 6.1 Componente com Lazy Import

```typescript
// DrawOrchestrator.tsx
import { lazy, Suspense } from 'react';

const DrawScene3D = lazy(() => import('./DrawScene3D'));

export function DrawOrchestrator(props) {
  const { isSupported, preferLowPower } = useWebGLCapability();

  if (!isSupported || preferLowPower) {
    return <DrawPresentation2D {...props} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DrawScene3D {...props} />
    </Suspense>
  );
}
```

### 6.2 Loading de libs 3D

```typescript
// Em vite.config.ts — chunks dedicados
manualChunks(id) {
  if (id.includes('node_modules/three/build')) {
    return 'vendor-three-core';
  }
  if (id.includes('@react-three')) {
    return 'vendor-three-react';
  }
}
```

## 7. Gerenciamento de Memoria

### 7.1 Cleanup no Unmount

```typescript
useEffect(() => {
  return () => {
    // Limpar geometrias
    sphereGeometry.dispose();
    // Limpar materiais
    teamMaterial.dispose();
    // Limpar texturas
    teamTexture.dispose();
    // Limpar renderer
    gl.dispose();
  };
}, []);
```

### 7.2 Cleanup Automatico via R3F

R3F dispose automaticamente geometrias e materiais quando componentes sao removidos. Garantir que:
- Texturas sejam carregadas via `useTexture` (cleanup automatico)
- Geometrias customizadas usem `useMemo` com cleanup

## 8. FPS Target

| Dispositivo | Target FPS | Estrategia |
|-------------|-----------|-----------|
| Desktop | 60 | Sombras, partıculas, alta qualidade |
| Notebook | 45-60 | Qualidade media |
| Tablet | 30-45 | Sem sombras, menos partıculas |
| Mobile | 24-30 | 3D simplificado ou 2D |

### 8.1 Performance Monitor

```typescript
import { PerformanceMonitor } from '@react-three/drei';

<Canvas>
  <PerformanceMonitor
    onDecline={() => setQuality('low')}
    onIncline={() => setQuality('high')}
  >
    <Scene quality={quality} />
  </PerformanceMonitor>
</Canvas>
```

## 9. Resize Handling

```typescript
// DrawScene3D.tsx
const { gl, size } = useThree();

useEffect(() => {
  gl.setSize(size.width, size.height);
}, [size, gl]);

// Nao recriar o renderer no resize
// Apenas ajustar o tamanho do viewport
gl.setViewport(0, 0, size.width, size.height);
```

## 10. Checklist de Performance

- [ ] DPR dinamico (max 1.5 mobile, 2 desktop)
- [ ] Lazy loading de DrawScene3D
- [ ] Lazy loading de libs Three.js
- [ ] Chunks separados no Vite
- [ ] Sem sombras em mobile
- [ ] Geometrias compartilhadas
- [ ] Texturas otimizadas (256px, WebP)
- [ ] < 150 objetos na cena
- [ ] Cleanup no unmount
- [ ] PerformanceMonitor para fallback automatico
- [ ] Resize handler otimizado

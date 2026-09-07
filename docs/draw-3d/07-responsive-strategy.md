# BASEOS — FASE 3.1: Estrategia de Responsividade

## 1. Breakpoints

| Nome | Largura | Contexto |
|------|---------|---------|
| mobile | < 640px | Smartphones |
| tablet | 640px - 1024px | Tablets, telefones grandes |
| desktop | 1025px - 1440px | Notebooks, desktops |
| wide | > 1440px | Monitores grandes |

## 2. Layout 3D Responsivo

### 2.1 Canvas Fullscreen

```typescript
// DrawScene3D.tsx — canvas ocupa toda a tela
<Canvas
  style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
  camera={{ position: [0, 0, 8], fov: 50 }}
/>
```

### 2.2 Posicionamento de Objetos

```typescript
const getLayout = (width: number, teamCount: number) => {
  if (width < 640) {
    // Mobile: esfera central + UI embaixo
    return { sphereScale: 1.2, cameraZ: 6, infoPosition: 'bottom' };
  }
  if (width < 1024) {
    // Tablet: esfera levemente menor
    return { sphereScale: 1.0, cameraZ: 7, infoPosition: 'bottom' };
  }
  // Desktop: esfera padrao + UI lateral
  return { sphereScale: 1.0, cameraZ: 8, infoPosition: 'right' };
};
```

## 3. UI Overlay Responsiva

### 3.1 Informacoes da Equipe

| Breakpoint | Layout | Tamanho do Card |
|-----------|--------|-----------------|
| mobile | Abaixo do canvas | Full-width, compacto |
| tablet | Abaixo do canvas | Full-width, medio |
| desktop | Lado direito | 400px, expandido |

### 3.2 Barra de Progresso

```typescript
// Sempre visivel, posicionamento fixo
<div
  className={cn(
    "fixed z-10",
    // Mobile: topo da tela
    "top-0 left-0 right-0",
    // Desktop: topo + margem
    "md:top-4 md:left-4 md:right-auto md:w-80"
  )}
>
  <ProgressBar progress={progress} />
</div>
```

### 3.3 Botoes de Controle

| Breakpoint | Posicao | Tamanho |
|-----------|---------|---------|
| mobile | Centro inferior | 56px (touch-friendly) |
| tablet | Centro inferior | 56px |
| desktop | Centro inferior ou lateral | 48px |

## 4. Touch vs Mouse

```typescript
// useWebGLCapability.ts
const isTouch = useMemo(
  () => navigator.maxTouchPoints > 0,
  []
);

// Controles de camera
{isTouch ? (
  <TouchControls />
) : (
  <OrbitControls enablePan={false} enableZoom={false} />
)}
```

## 5. Orientacao do Dispositivo

```typescript
// Detectar orientacao portrait/landscape
const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

useEffect(() => {
  const handler = () => {
    setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// Ajustar camera baseada na orientacao
const cameraFov = orientation === 'portrait' ? 60 : 50;
```

## 6. Fullscreen

```typescript
// Toggle fullscreen
const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
};

// Canvas responsivo em fullscreen
<Canvas
  style={{ width: '100%', height: '100vh' }}
  gl={{ antialias: true, alpha: true }}
/>
```

## 7. Loading States

| Contexto | Feedback |
|---------|----------|
| Carregando libs 3D | Skeleton com shimmer + texto "Preparando sorteio..." |
| Carregando texturas | Spinner centralizado |
| WebGL detectando | Tela de verificacao rapida |

## 8. Testes de Responsividade

- [ ] Mobile (< 640px): Canvas fullscreen, controles touch
- [ ] Tablet (640-1024px): Canvas fullscreen, controles touch
- [ ] Desktop (1025-1440px): Canvas fullscreen, UI lateral
- [ ] Wide (> 1440px): Canvas fullscreen, UI expandida
- [ ] Portrait: FOV ajustado, layout portrait
- [ ] Landscape: Layout padrao
- [ ] Fullscreen: Navegador oculto
- [ ] Resize dinamico: Canvas redimensiona sem recriar renderer

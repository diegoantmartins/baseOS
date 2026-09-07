# 17 — Integração do Draw Arena Cinematográfico

## Resumo

A pasta `src/components/draw/cinematic/` continha uma implementação 3D sofisticada (urna, partículas, state machine completa) mas estava completamente órfã — nenhum arquivo a importava. Esta mudança conecta o `DrawArenaController` ao fluxo real do sistema, substituindo o `LogoCarouselDraw` como experiência principal quando WebGL está disponível.

## Motivação

A documentação da Fase 3.2 (doc 16) listava como próximo passo "evoluir a arte da arena com mais camadas de profundidade". A pasta `cinematic/` já continha exatamente isso:

- Urna 3D com metalness/roughness (não apenas CSS)
- Partículas de fundo com Points/BufferGeometry
- Câmera cinematográfica com presets por estado (ESTABLISHING, DRAW, REVEAL, GROUP)
- State machine completa: `IDLE → INTRO → READY → DRAWING → REVEAL → GROUP_UPDATE → COMPLETE`
- HUD separado com progresso, grupos, controles e slider de velocidade
- Tipos dedicados em `src/types/drawCinematic.ts` com validação de transições

O `LogoCarouselDraw` (706 linhas) também usava Three.js mas com uma abordagem diferente (carrossel orbital). Manter os dois criava confusão. A decisão foi integrar o `cinematic/` como caminho principal.

## Arquivos modificados

### `src/components/draw/LiveDrawModal.tsx`

**Antes:** import estático de `LogoCarouselDraw`, renderização condicional direta.

**Depois:** lazy import de `DrawArenaController` via `React.lazy`, envolto em `<Suspense>` com fallback de loading.

```tsx
const DrawArenaController = React.lazy(() =>
  import('./cinematic/DrawArenaController').then((m) => ({ default: m.DrawArenaController })),
);
```

O fallback é um spinner dourado sobre fundo escuro, mantendo a experiência visual enquanto o chunk Three.js é carregado.

### `src/components/draw/cinematic/DrawArenaController.tsx`

- Adicionada prop `drawId?: string` na interface de props
- Removidos todos os `console.log` de debug (estado, eventos, erros)
- Removido bloco de debug info do dev mode (`.environment === 'development'`)
- `drawId` repassado para `DrawArenaHUD`

### `src/components/draw/cinematic/DrawArenaHUD.tsx`

- Adicionada prop `drawId?: string` na interface
- Exibição de `SORTEIO #<id>` no footer para auditoria (mesmo padrão do `LogoCarouselDraw`)

## Fluxo resultante

```
DrawPage.tsx
  └── LiveDrawModal.tsx
        ├── shouldUseDrawArena3D() === true
        │     └── <Suspense fallback={<DrawLoadingFallback/>}>
        │           └── DrawArenaController (lazy, Three.js)
        │                 ├── useDrawArenaStateMachine (state machine)
        │                 ├── DrawArenaCanvas (cena 3D)
        │                 └── DrawArenaHUD (interface + controles)
        └── shouldUseDrawArena3D() === false
              └── DrawScene3D (CSS/Framer Motion, sem WebGL)
```

## O que não mudou

- `src/services/drawService.ts` — motor de sorteio intocável
- `src/components/draw/drawRevealSequence.ts` — sequência de reveal
- `src/components/draw/presentationOrder.ts` — ordem de apresentação
- `src/config/drawArenaFeatures.ts` — feature flags e timings
- `src/types/drawCinematic.ts` — tipos e validação de transições

## Arquivos órfãos resultantes

> **ATUALIZAÇÃO (Etapa 12):** os arquivos órfãos abaixo foram **removidos**
> na consolidação da Etapa 12. Ver `44-phase-3.4-etapa-12-cleanup-report.md`.

- ~~`src/components/draw/LogoCarouselDraw.tsx`~~ — REMOVIDO (Etapa 12)
- ~~`src/components/draw/ManualUrnDraw.tsx`~~ — REMOVIDO (Etapa 12)
- ~~`src/components/draw/DrawPresentation.tsx`~~ — REMOVIDO (Etapa 12)
- ~~`src/components/draw/presentationOrder.ts`~~ — REMOVIDO (Etapa 12)
- ~~`src/test/logoCarouselDraw.test.tsx`~~ — REMOVIDO (Etapa 12)
- ~~`src/test/manualUrnDraw.test.tsx`~~ — REMOVIDO (Etapa 12)
- ~~`src/test/presentationOrder.test.ts`~~ — REMOVIDO (Etapa 12)

## Verificação

- `npm run lint` — passou sem erros
- `npx tsc -p tsconfig.app.json --noEmit` — timeout (tipos Three.js pesados), mas sem erros reportados antes do timeout
- Nenhum import quebrado detectado

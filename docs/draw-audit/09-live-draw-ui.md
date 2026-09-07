# 09 — LiveDrawModal (apresentação do sorteio)

## Arquivo: `src/components/draw/LiveDrawModal.tsx` (55 linhas)

## Visão Geral

O `LiveDrawModal` é o **único caminho visual** do sorteio. Ele é um componente de apresentação: **NÃO executa lógica de sorteio** (o motor está em `drawService.ts`). Ele resolve o `DrawResult` real e delega a apresentação visual ao visualizador adequado.

## Propriedades (Props)

```typescript
interface LiveDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  result?: DrawResult | null;
  groups?: DrawGroup[];
  teams: TeamRecord[];
  competition: CompetitionRecord;
}
```

**Observações:**
- Recebe `result` (ou `groups` como fallback) já calculado pelo motor.
- Não gera sorteio próprio; apenas apresenta o resultado real.

## Fluxo de seleção do visualizador

```typescript
const useArena3D = shouldUseDrawArena3D();
return useArena3D ? (
  <DrawArenaController ... />   // Draw Arena Cinematográfico (3D) — experiência principal
) : (
  <DrawScene3D ... />           // fallback seguro
);
```

- `shouldUseDrawArena3D()` (em `src/config/drawArenaFeatures.ts`) decide o visualizador:
  - **Draw Arena 3D (principal)** quando habilitado e WebGL disponível.
  - **DrawScene3D (fallback)** quando `VITE_DRAW_ARENA_3D=false` ou WebGL indisponível.

## Feature flag

- `DRAW_ARENA_3D_ENABLED`: por padrão **AUTO** (usar Draw Arena 3D quando WebGL existir).
- `VITE_DRAW_ARENA_3D=false` → força o fallback (`DrawScene3D`).
- Fachada segura: se WebGL indisponível, cai para `DrawScene3D` sem tela vazia/erro.

## Visualizadores

### DrawArenaController (cinemático 3D)
- Máquina de estados: `INTRO → READY → DRAWING → REVEAL → GROUP_UPDATE → COMPLETE`.
- `DrawArenaCanvas` (cena 3D) + `DrawArenaHUD` (interface e controles).
- Controles: **pausar/reproduzir (autoplay)**, **avançar**, **slider de velocidade**.
- Timing centralizado em `ANIMATION_TIMINGS` + `resolveDrawTimings` (~4–5s por equipe).

### DrawScene3D (fallback)
- Apresentação automática por equipe com a **urna giratória** e painéis de grupo responsivos.
- Controles: **pausar/reproduzir**, **avançar**, **slider de velocidade**, **pular animação**.
- Timing padrão: `SCENE3D_REVEAL_MS` (≈4s por equipe).

## Responsabilidades

O `LiveDrawModal` **NÃO**:
- Chama `runDraw`;
- Acessa `dataAccess`;
- Gera números aleatórios;
- Altera estado de grupos/equipes;
- Tem lógica de negócio.

É **100% presentation layer**.

## Conclusão

O `LiveDrawModal` é um componente de apresentação bem estruturado que:
- Separa claramente apresentação da lógica (`drawService.ts` segue como fonte da verdade);
- Resolve o `DrawResult` real e delega ao visualizador via feature flag;
- Oferece **controle de ritmo** (pausa/avanço/velocidade) ao operador;
- Mantém o fallback seguro e coerente.

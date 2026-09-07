# 43 — Fase 3.4 — Etapa 10.1 — Relatório de Implementação

## Escopo

Correções de **responsividade e ritmo** do sorteio ao vivo (Draw Arena / DrawScene3D), conforme apontado na validação docs × código (`43-validation-responsividade-ritmo.md`).

- **NÃO** alterou o motor de sorteio (`drawService.ts`).
- **NÃO** alterou algoritmo, distribuição, seed, head seeds ou persistência.
- **NÃO** criou novo motor, nova máquina de estados ou nova arquitetura 3D.
- **NÃO** houve alteração do resultado do sorteio (continuidade com o `DrawResult` real).

**MOTOR DE SORTEIO ALTERADO: NÃO.**

## Problemas identificados (antecedência — doc 43-read-only)

| # | Problema | Causa raiz |
|---|----------|------------|
| R1 | Sorteio rápido demais (~2,4–3,2s/equipe reais) vs. ~5s prescritos | Default do `DrawScene3D` em 2400ms; HUD sem controle de velocidade |
| R2 | `VITE_DRAW_ARENA_3D` default desligado → fallback (mais rápido e sem slider) era a experiência padrão | flag `false` por padrão |
| R3 | Fallback (`DrawScene3D`) sem pausa/avanço/velocidade | sem controles de ritmo |
| R4 | `DrawScene3D` painéis de grupo com posições fixas → quebra no mobile | grid absoluto (`left:12/36/60%`) |
| R5 | Docs 09/02/FINAL-AUDIT descreviam o `LiveDrawModal` antigo (211 linhas, isRevealing 2.5s) | documentação desatualizada |

## O que foi alterado

### 1. Default do Draw Arena 3D — `src/config/drawArenaFeatures.ts`

- `DRAW_ARENA_3D_ENABLED` agora é **`'auto'`** por padrão → **Draw Arena 3D é a experiência principal** quando WebGL disponível.
- `VITE_DRAW_ARENA_3D=false` continua forçando o fallback (`DrawScene3D`).
- `shouldUseDrawArena3D()` mantém o fallback seguro (`supportsWebGL()`), sem tela vazia/erro.

### 2. Timing centralizado (fonte única, sem números mágicos)

- `ANIMATION_TIMINGS` expõe os tempos de leitura/confirmação por equipe:
  - `REVEAL_HOLD_MS: 2000` (leitura da equipe revelada)
  - `GROUP_HOLD_MS: 1500` (confirmação do grupo destino)
  - `PREPARE_MS: 2400` (urna/fase DRAWING)
  - `SCENE3D_REVEAL_MS: 4000` (default do fallback)
- `resolveDrawTimings(revealDurationMs)` deriva os holds **proporcionalmente** ao controle de velocidade (ratios `0.55` / `0.4`), garantindo um único sistema de velocidade.
- Limites do slider: `MIN_REVEAL_MS=1200`, `MAX_REVEAL_MS=6000`, `STEP_MS=100`.
- Soma das sub-fases por equipe: **~4–6s**, alinhada à prescrição documental (~5s).

### 3. `DrawArenaController.tsx`

- Consome `resolveDrawTimings` para modular `prepare`, `revealHold` e `groupHold`.
- **Removido** o efeito que sobrescrevia o slider com magic numbers (`3200`/`2600`) — o valor escolhido pelo operador passa a ser respeitado em todo o ciclo.

### 4. `DrawArenaHUD.tsx`

- Slider de velocidade usa `ANIMATION_TIMINGS.MIN/MAX/STEP_MS` (removidos valores mágicos `400`/`5000`).

### 5. `DrawScene3D.tsx` (fallback)

- Default de `revealDurationMs` = `SCENE3D_REVEAL_MS` (**4000ms**).
- Controles de ritmo adicionados: **Pausar/Reproduzir (autoplay)**, **Avançar**, **slider de velocidade**, **Pular animação**.
- `handleNext` revisado (sem `!isRevealing` que causava deadlock).
- **Responsividade**: painéis de grupo em CSS grid (`grid-cols-1 sm:grid-cols-2`) substituindo posições absolutas fixas; urna com tamanhos responsivos (`h-[300px] w-[300px] sm:... md:...`).

## Falha/Política de fallback

- WebGL indisponível OU `VITE_DRAW_ARENA_3D=false` → `DrawScene3D`.
- Em nenhum caso há tela vazia/erro.

## Fidelidade ao sorteio real

- Ambos os visualizadores consomem o `DrawResult` resolvido pelo motor (`drawService.js`) via `LiveDrawModal`.
- Os controles de ritmo (pausa/avanço/velocidade) afetam **somente** timers/duração/progressão visual — **nunca** o resultado.

## Documentação atualizada (docs antes contraditórios)

| Doc | Ajuste |
|-----|--------|
| `09-live-draw-ui.md` | Reescrito para o `LiveDrawModal` atual (55 linhas, delegação via feature flag, controles de ritmo) |
| `02-architecture.md` | Fluxo 2 da apresentação ao vivo atualizado (máquina de estados + feature flag + controles) |
| `FINAL-AUDIT.md` | Seção "LiveDrawModal" atualizada (sem `isRevealing 2.5s`) |
| `README.md` | Doc 43 de validação já estava indexado; adicionado o relatório |

## Testes

Adicionados/alargados:

- `src/test/drawArenaFeatures.test.ts` (novo): `SCENE3D_REVEAL_MS` dentro de ~3,5–6s; soma das sub-fases ~4–6s; proporções de `resolveDrawTimings`; limites do slider.
- `src/test/drawScene3D.test.tsx` (ampliado): controles de ritmo visíveis após iniciar; pausa interrompe autoplay + avanço manual funciona; avançar em autoplay revela a próxima equipe.

## Validação final

Todos os comandos de verificação passam:

```bash
npx tsc -p tsconfig.app.json --noEmit   # ✅ sem erros
npm run lint                            # ✅ 0 erros
npm test                                # ✅ 61 arquivos / 469 testes
npm run build                           # ✅ build de produção OK
```

## Conclusão

A etapa corrigiu os três pilares apontados na validação: **ritmo** (~4–5s/equipe, fonte única de timing), **controle** (pausa/avanço/velocidade nos dois visualizadores) e **experiência padrão 3D** (com fallback seguro), além de **responsividade mobile** do fallback e **documentação**. O motor de sorteio permaneceu intacto.

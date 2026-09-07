# 44 — Fase 3.4 · Etapa 12 · Relatório de Consolidação e Limpeza Arquitetural

## 1. Resumo

O Draw Arena Cinematográfico foi consolidado como **arquitetura oficial** da
apresentação do sorteio. Foi realizada uma limpeza profunda do módulo para
remover código legado, componentes órfãos, implementações abandonadas, testes de
funcionalidades removidas, imports mortos, tipos sem consumidor e documentação
desatualizada. O motor de sorteio (`drawService.ts`) permaneceu **intocado**.

Fonte oficial vigente:

```
DrawPage → LiveDrawModal → DrawArenaController → State Machine → Canvas + HUD
```

---

## 2. Arquivos removidos

| Arquivo | Motivo | Dependências verificadas |
| ------- | ------ | ------------------------ |
| `src/components/draw/LogoCarouselDraw.tsx` | Arquitetura abandonada (carrossel orbital). Substituída pelo Cinematic. Nenhum consumidor de produção. | Nenhum (grep global vazio após remoção) |
| `src/components/draw/ManualUrnDraw.tsx` | Arquitetura abandonada (urna manual). Substituída pelo Cinematic. Nenhum consumidor de produção. | Nenhum (grep global vazio) |
| `src/components/draw/DrawPresentation.tsx` | Antiga apresentação 2D (Fase 3.2). Órfã desde o Cinematic. | Nenhum (grep global vazio) |
| `src/components/draw/presentationOrder.ts` | Módulo de ordenação usado apenas por `LogoCarouselDraw` e `ManualUrnDraw`. Morto após remoção dos dois. | Não usado pelo Cinematic (grep vazio) |
| `src/test/logoCarouselDraw.test.tsx` | Testes exclusivos do componente removido. | Componente removido |
| `src/test/manualUrnDraw.test.tsx` | Testes exclusivos do componente removido. | Componente removido |
| `src/test/presentationOrder.test.ts` | Testes exclusivos do módulo removido. | Módulo removido |

---

## 3. Exports removidos de `drawArenaFeatures.ts`

| Export removido | Motivo |
| --------------- | ------ |
| `PerformanceMode` (tipo) | Sem consumidor — performance não é modulada por tipo no Cinematic |
| `PERFORMANCE_MODE` | Sem consumidor |
| `TARGET_FPS` | Sem consumidor |
| `CHOREO_RATIOS` | Coreografia de urna/carrossel abandonada |
| `resolveChoreography` | Coreografia de urna/carrossel abandonada |
| `isMobileDevice` | Sem consumidor no Cinematic |
| `getPerformanceMode` | Sem consumidor (complemento do módulo performance) |

---

## 4. Arquivos mantidos

| Arquivo | Por que continua |
| ------- | ---------------- |
| `src/components/draw/LiveDrawModal.tsx` | **Orquestrador oficial.** Roteia entre Cinematic (WebGL) e fallback. |
| `src/components/draw/DrawScene3D.tsx` | **Fallback oficial** para ambientes sem WebGL (único fallback). |
| `src/components/draw/drawRevealSequence.ts` | Sequência de reveal fiel ao motor. Usada pela state machine. |
| `src/components/draw/cinematic/DrawArenaController.tsx` | Controller principal (Three.js, lazy-loaded). |
| `src/components/draw/cinematic/useDrawArenaStateMachine.ts` | State machine oficial (IDLE→INTRO→…→COMPLETE). |
| `src/components/draw/cinematic/DrawArenaCanvas.tsx` | Cena 3D (urna, partículas, câmera, iluminação). |
| `src/components/draw/cinematic/DrawArenaHUD.tsx` | Interface (grupos, progresso, controles, drawId). |
| `src/components/draw/cinematic/groupArena.ts` | Construção dos cards de grupo para HUD. |
| `src/types/drawCinematic.ts` | Tipos da state machine. Todos preservados (estados, eventos, transições, contexto). |
| `src/config/drawArenaFeatures.ts` | Feature flags, timings (ANIMATION_TIMINGS, resolveDrawTimings), SCENE3D_REVEAL_MS, MAX_PIXEL_RATIO, shouldUseDrawArena3D. Consumers reais. |
| `src/test/useDrawArenaStateMachine.test.ts` | Testes da state machine oficial. |
| `src/test/drawArenaFeatures.test.ts` | Testes de timing centralizado. |
| `src/test/drawScene3D.test.tsx` | Testes do fallback oficial. |
| `src/test/drawService.test.ts` | Testes do motor (contém `buildGroupArena` — usado pelo HUD). |

---

## 5. Limpeza de debug

- Removidos `console.warn` de transições inválidas em
  `useDrawArenaStateMachine.ts` (atividade de debug, sem função operacional).
- Confirmado: nenhum `console.log` / `console.debug` / `console.info` /
  `console.warn` / `debugger` restante em `src/components/draw/`.
- O bloco de debug info dev do controller já havia sido removido na etapa anterior.

---

## 6. Arquitetura final

```
                  DrawPage
                     │
                     ▼
              LiveDrawModal
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     WebGL disponível       Sem WebGL
          │                     │
          ▼                     ▼
  DrawArenaController      DrawScene3D (fallback)
  (React.lazy + Suspense)
          │
          ▼
 State Machine (useDrawArenaStateMachine)
   IDLE → INTRO → READY → DRAWING → REVEAL → GROUP_UPDATE → COMPLETE
          │
     ┌────┼────────┐
     ▼    ▼        ▼
  Canvas  HUD    Timing
 (three) (overlay)(drawArenaFeatures)
```

- **Uma** experiência principal (Cinematic).
- **Um** fallback oficial (DrawScene3D).
- **Sem** componentes abandonados, sem concorrência de experiências.

---

## 7. Testes / Verificação

| Verificação | Resultado |
| ----------- | --------- |
| `npm run lint` | **PASS** (0 erros) |
| `npx tsc -p tsconfig.app.json --noEmit` | **PASS** (exit 0, sem timeout) |
| Testes do módulo sorteio (6 arquivos) | **PASS** — 71 testes |
| `npm run build` | **PASS** (exit 0; chunk `DrawArenaController-Dn_kbqkX.js` 20.83 kB confirma lazy-load) |

Nota sobre a suíte completa: a execução via `vitest run` ultrapassa o limite de
tempo da infraestrutura de execução (280s) por natureza da suíte larga e do
ambiente jsdom. Os testes diretamente afetados por esta etapa (sorteio/state
machine/fallback/motor) passam em todos os casos. Um teste
(`competitionRegistrationsPage.test.tsx`) apresentou falha única por flak de
timing e passou integralmente nas execuções subsequentes não relacionadas a esta
etapa.

---

## 8. Integridade (motor de sorteio)

```
MOTOR DE SORTEIO ALTERADO: NÃO
```

- `git diff -- src/services/drawService.ts`: o único diff presente refere-se ao
  cabeçalho de comentário do arquivo, proveniente de etapa anterior **fora do
  escopo desta limpeza**. Nenhum algoritmo, PRNG, distribuição, Berger ou
  persistência foi tocado nesta etapa.
- `src/components/draw/drawRevealSequence.ts`: **intacto** (nenhuma alteração).
- `presentationOrder.ts`: removido por ser módulo de apresentação morto (não é o
  motor; não afeta a lógica de sorteio).

---

## 9. Documentação

Documentos históricos de decisão marcados como **LEGADO / SUPERADO**:
`01-phase3-discovery.md`, `02-current-architecture.md`,
`03-3d-architecture-proposal.md`, `11-3d-implementation.md`.

`17-cinematic-integration.md` atualizado para refletir a remoção dos órfãos.
Criado este documento (`44-phase-3.4-etapa-12-cleanup-report.md`) como fonte
oficial da arquitetura vigente.

---

## 10. Pendências

- Nenhuma pendência arquitetural desta etapa.
- Evolução visual da arena 3D (iluminação, profundidade da urna, partículas,
  câmera cinematográfica) fica reservada à **próxima fase**, sobre a base
  consolidada — conforme escopo do pedido, nada foi alterado visualmente nesta
  etapa.

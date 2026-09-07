# Relatório 44 — DRAW ARENA: Refinamento Cinematográfico Premium (ETAPA 12)

## Objetivo

Elevar `LogoCarouselDraw` a "transmissão oficial de sorteio esportivo": profundidade de campo contínua, movimento com inércia/desaceleração, suspense, revelação limpa com queda da logo até o grupo, âncora BaseOS e HUD limpo. O foco é **100% polish visual + cinematografia + UX** — o motor de sorteio (`src/services/drawService.ts`) permanece intocado. Validado em 5 viewports, reduced-motion coberto por teste, e gerado este relatório encerrando com `MOTOR DE SORTEIO ALTERADO: NÃO`.

> Critério-mestre: CLAREZA → DETERMINISMO → FLUIDEZ → LEGIBILIDADE → PROFISSIONALISMO. Nenhum efeito visual novo que dependa de novo dado/algoritmo; nada de new RNG/regra/modo/automação.

---

## 1. Resultado técnico

| Verificação | Resultado |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | OK (exit 0) |
| `npm run lint` | OK (exit 0) |
| `npx vitest run` | **64 arquivos / 487 testes PASS** (745s; exit 0) |
| `npm run build` | OK (4m16s; warnings pré-existentes de chunk) |

### 1.1 Testes-alvo do motor de coreografia

`CHOREO_RATIOS` foi rebalanceado de `0.38/0.24/0.24/0.14` → **`0.34/0.22/0.26/0.18`** (soma exatamente **1.0**). Como `CHOREO_TOTAL = PREPARE_MS` (=soma das proporções sobre `baseMs`) e `CYCLE_TOTAL = 2400 + REVEAL_HOLD_MS`, os testes que amarram os timings continuam verdes:

- `src/test/logoCarouselDraw.test.tsx` (7 testes)
- `src/test/manualUrnDraw.test.tsx` (6 testes)

Ambos **13/13 PASS** isolados e incluídos no suite completo de 487.

---

## 2. Resultado visual (validação real, produção via `vite preview :5174`)

Ambiente: build de produção servido por `vite preview` (evita HMR `ERR_NETWORK_CHANGED` do dev) + Playwright chromium headless (login demo "Administrador"). **Resultado: 41 PASS / 0 FAIL / 1 WARN** (WARN = limitação headless de `readPixels`, ver §2.5). Screenshots em `/tmp/opencode/shots/etapa12/`.

### 2.1 Responsividade — 5 viewports (30 checagens)

| Viewport | overflowX | header no viewport | footer no viewport | "Sorteio Oficial" | sem "Sorteio Inicial" | Grupos A/B |
|---|---|---|---|---|---|---|
| 1440×900 | 0 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1280×720 | 0 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1024×768 | 0 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 768×1024 | 0 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 390×844 | 0 | ✓ | ✓ | ✓ | ✓ | ✓ |

Nenhum overflow horizontal do overlay (`scrollWidth - clientWidth = 0`) e nenhum elemento-chave (header com título/logo, footer com controles) fora da viewport — inclusive no mobile 390×844 (HUD e board de grupos continuam alcançáveis sem scroll horizontal). Evidências: `viewport-<nome>.png`.

### 2.2 Sorteio Puro — fluxo completo até o fim (768×1024) — PASS

- **8 revelações executadas** até a conclusão, todas com **time e grupo reais não vazios** (capturados durante a janela de revelação, sem perder o nome):
  Titanium Vol. · Vortex V. Clube · Águias do Planalto · Fênix Vôlei Brasil · Siderúrgica Vôlei · Aurora E.C. · Trovão da Serra · Guarani Vol.
- **Último sorteio**: na 8ª revelação o HUD atinge `8 DE 8 TIMES`, o estado vai para `SORTEIO CONCLUÍDO` e o botão muda para `CONCLUIR SORTEIO` (SORTEAR desabilitado corretamente — guarda de conclusão). Evidências: `pure-reveal-1..8.png`.
- Estado final íntegro: board de grupos preenchido (4/4) com `CONCLUIR SORTEIO`.

### 2.3 Sorteio Dirigido — 3 grupos + cabeças (390×844) — PASS

- Painel expõe 8 equipes; FASE `CABEÇAS DE CHAVE`.
- **3 cabeças em 3 grupos distintos**: `Caiu no Grupo A / B / C` (validação real de distribuição 1-por-grupo).
- Transição para `SORTEIO DAS EQUIPES` após a fase de cabeças.
- **Equipes restantes sorteadas: 5/5** até a conclusão. Evidências: `directed-head-1..3.png`.

### 2.4 Idle BaseOS + auditoria (1440×900) — PASS

- Âncora central do idle apresenta o **logo/BaseOsLogo** (svg presente) e o **canvas 3D** do carrossel.
- `SORTEIO #DRAW-MASCULINO-2026` — ID real de auditoria exibido discretamente. Evidência: `with-audit-id.png`, `desktop-idle.png`.

### 2.5 Canvas 3D — renderização confirmada (WARN = limitação headless)

- Canvas presente com **dimensões reais** (1440×625) em todos os viewports; a revelação/animação é visível nos screenshots e no fluxo frame-a-frame (estado `REALIZANDO O SORTEIO...` → `EQUIPE SORTEADA` → `CAIU NO GRUPO X` → idle).
- **WARN único**: `readPixels` no headless devolve 0 (three não usa `preserveDrawingBuffer`; SwiftShader). É artefato do ambiente, **não** de comportamento — já evidenciado na ETAPA 11.1 por análise de pixels (`stddev≈29`). Em navegador real a renderização é completa.

### 2.6 Reconhecimento do motor (não intrusão)

- O fluxo segue manual e orquestrado por `resolveChoreography()`/`resolveDrawTimings()` (timings centralizados, sem números mágicos).
- Sequências e grupos exibidos vêm **apenas** do resultado real do `drawService`.

---

## 3. Alterações na ETAPA 12

| Arquivo | Mudança |
|---|---|
| `src/config/drawArenaFeatures.ts` | Rebalanceou `CHOREO_RATIOS` para `0.34/0.22/0.26/0.18` (soma 1.0) com comentários cinematográficos (suspense/desaceleração em MIX; voo ao grupo em EXIT). Sem mudança de API/timings base. |
| `src/components/draw/LogoCarouselDraw.tsx` | Reescrita cinematográfica — detalhes em §4. |

---

## 4. Implementação cinematográfica (LogoCarouselDraw)

Reutiliza as peças já existentes (`presentationOrder`, `resolveChoreography`, `BaseOsLogo`, locks de reveal) e adiciona camadas visuais autorizadas (formas de nuvens/flares a partir de texturas existentes — sem new asset binário):

- **Profundidade contínua**: `baseScale 0.42+0.58×depth`, `baseOpacity (0.32..)+0.68×depth`, `brightness 0.5+0.5×depth`; `fog near 10 / far 20` (cor = BG) para haze de profundidade.
- **Movimento com inércia**: `damp` exponencial (lambda `reducedMotion ? 7 : 2.7`) com desaceleração e parada precisa; micro-oscilação orgânica da órbita (`1+0.07·sin(t·0.55)`) e "bob" por sprite (`sin(t·0.7+i·1.15)·0.05`) — desligados em reduced-motion.
- **Suspense**: opacidade ×0.8 nos não-focados durante `drawing` + vinheta radial DOM durante a desaceleração.
- **Revelação limpa**: card central com entrada `fade + translateY`, stagger (badge ~0.05s, disco ~0.1s `scale 0.92→1`, nome ~0.3s `y:14`, chip "Caiu no Grupo X" a partir de `groupupdate`); guarda `!isComplete` removida para o último time permanecer visível até o idle.
- **Queda da logo ao grupo**: elemento de voo em `groupupdate` (medido via `revealCardRef` + `groupCardRefs`), keyframes x/y em arco, escala `[1,1.08,0.84,0.5]`, duração `max(0.25, choreo.exit/1000)`, skip em reduced-motion; card de grupo com micro-pulse no encaixe.
- **Âncora BaseOS**: shrink discreto `1 → 0.5` (ativo) via damp.

---

## MOTOR DE SORTEIO ALTERADO: NÃO

- `git diff -- src/services/drawService.ts` = **apenas comentários** pré-existentes (7 ins. / 3 del.) — renovação da nota de cabeças; **nenhuma linha de lógica/PRNG/distribuição/tabela tocada** nesta ou em etapas anteriores.
- As sequências exibidas (puro/dirigido, A/B/C, ordem de cabeças) vêm do resultado real do `drawService`.
- Nenhum novo modo/regra/automação/aleatoriedade/entidade adicionado.

---

## Limites mantidos

- Não alterou algoritmo/PRNG/distribuição/tabela do `drawService.ts`.
- Não automatizou o sorteio inteiro (fluxo manual `SORTEAR PRÓXIMO` preservado).
- Não criou nova aleatoriedade.
- Não removeu o fallback `DrawScene3D` (ambiente sem WebGL).

---

## Cenários validados (resumo)

- **5 viewports** (1440, 1280, 1024, 768, 390) com overflow/ocupação nulos.
- **Sorteio Puro completo** (8/8, último sorteio, estado final) e **Dirigido com 3 grupos** (3 cabeças distintas + 5 equipes restantes).
- **Idle** (BaseOS + canvas) e **auditoria** (ID real).
- **Reduced-motion** coberto por teste unitário (`logoCarouselDraw` test 7: reduz animação mantendo fluxo/informação).
- **Motor intocado** (diff de comentários apenas).

---

MOTOR DE SORTEIO ALTERADO: NÃO

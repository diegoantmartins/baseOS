# 43 — Validação da Documentação de Implantação: Responsividade e Ritmo do Sorteio

## Contexto

Este documento valida a **documentação de implantação do módulo de sorteio** (`docs/draw-audit/`) contra o **código real** (`src/components/draw/`). O objetivo é confirmar (ou refutar) as seguintes percepções do usuário:

1. A documentação afirma uma **responsividade** que não se sustenta no código real (responsividade "ruim").
2. A documentação prescreve um **ritmo** mais lento do que o sorteio realmente executa (sorteio "muito rápido", precisa desacelerar para realizar).

**Modo:** READ-ONLY. Nenhuma alteração de código foi feita. Este documento lista achados e sugestões para validação do usuário.

---

## 1. Fluxo ativo em produção

A feature flag `DRAW_ARENA_3D` está **desativada por padrão**:

- `src/config/drawArenaFeatures.ts:11` → `DRAW_ARENA_3D_ENABLED = (import.meta.env.VITE_DRAW_ARENA_3D === 'true') || false`
- `.env.local.example` → `VITE_DRAW_ARENA_3D=false`

Portanto, `LiveDrawModal.tsx:40` escolhe o **`DrawScene3D` (fallback)** como visualizador real, e não o `DrawArenaController`/`DrawArenaHUD`/`DrawArenaCanvas` (Draw Arena 3D cinematic).

| Camada | Código usado (default) | Código existente (flag on) |
|---|---|---|
| Visualizador | `DrawScene3D.tsx` | `DrawArenaController.tsx` (Draw Arena 3D) |
| HUD/controles | HUD embutido no `DrawScene3D` | `DrawArenaHUD.tsx` |
| Tempo de reveal | 2400 ms | 2600–3600 ms |
| Controle de ritmo | Botão "Sortear Próximo" (manual) | Slider de duração (400–5000 ms) + Autoplay |

> **Consequência para o usuário:** como o default é `DrawScene3D`, o usuário está vendo o componente **mais rápido** (2.4 s) e **sem o controle de duração** (o slider existe apenas no Draw Arena 3D). Isso explica diretamente a percepção de "sorteio muito rápido e sem forma de desacelerar".

---

## 2. Achado A — Ritmo mais rápido que o documentado

### 2.1 Documentado (prescrição de ~5 s por equipe)

- `24-draw-arena-visual-concept.md:85` → **"Duração total por equipe: ~5 segundos (ajustável por ritmo)"**.
- `24-...md:329-334` e `30-...md` → Base 5000 ms; Prepare 800 ms; Select 1200 ms; Flight 1500 ms; Impact 800 ms; Return 700 ms → soma ≈ **5.0 s**.
- `09-live-draw-ui.md:197` (componente legado) → animação de 2.5 s.

### 2.2 Real no código

| Componente | Parâmetro | Valor |
|---|---|---|
| `DrawScene3D.tsx:52` | `revealDurationMs` default | **2400 ms (2.4 s)** |
| `DrawArenaController.tsx:45` | `revealDurationMs` inicial | 3600 ms |
| `DrawArenaController.tsx:88` | reduzido em REVEAL | 3200 ms |
| `DrawArenaController.tsx:91` | reduzido em GROUP_UPDATE | 2600 ms |
| `DrawArenaController.tsx:120` | pausa de leitura do time (REVEAL) | 1800 ms |
| `DrawArenaController.tsx:130` | pausa de leitura do grupo | 1200 ms |
| `drawArenaFeatures.ts:40-48` | `ANIMATION_TIMINGS` (não usados pelo controller) | sum ≈ 5.0 s |

### 2.3 Conclusão do Achado A

O sorteio ativo **roda ~40–50% mais rápido** do que a documentação prescreve:

- Documentado: **~5 s/equipe**
- Draw Arena 3D (flag on): **~3.2 s/equipe**
- DrawScene3D (flag off / default): **2.4 s/equipe**

Adicionalmente, os `ANIMATION_TIMINGS` (que somam 5 s) existem em `drawArenaFeatures.ts` mas **não são consumidos** pelo `DrawArenaController`, que usa valores locais menores. Há, portanto, um descompasso entre constante config e valor usado em runtime.

---

## 3. Achado B — Responsividade documentada não reflete o real

### 3.1 Documentado (afirmações "ok")

- `42-phase-3.4-etapa-10-report.md:210-228` → "Mobile: prioridade preservada 1. equipe 2. grupo 3. progresso 4. status 5. urna. Não houve overflow crítico."
- `41-...etapa-9-report.md:190-193` → "comportamento aceitável sem nova refatoração de layout."
- `24-draw-arena-visual-concept.md:185-189` → layout por quantidade de grupos: 2 esq/dir, 3 triangular, 4 quadrado, 5+ circular.

### 3.2 Real no código — `DrawScene3D.tsx` (default)

- **Posicionamento absoluto e fixo dos painéis de grupo** (`DrawScene3D.tsx:253-256`):
  ```
  left: index === 0 ? '12%' : index === 1 ? '36%' : index === 2 ? '60%' : '42%',
  top:  index === 3 ? '68%' : index < 3 ? '62%' : '50%',
  ```
  Com 3 grupos, todos ficam em `top: 62%`, lado a lado em `left: 12/36/60%` em **todas** as larguras de tela. Em telas estreitas (< 700 px) os cards de `w-[160px]` se sobrepõem à urna central e entre si.
- **Dimensões da urna fixas** (`DrawScene3D.tsx:176`): `h-[360px] w-[360px] md:h-[520px] md:w-[520px]` — em telas < 400 px tende a estourar/sobrepor.
- **Card de grupo fixo** `w-[160px] md:w-[200px]` e `group.teams.slice(0, 4)` (`DrawScene3D.tsx:252,267`) — limita a 4 equipes exibidas e trunca nomes.
- **O layout por quantidade documentado (triangular/quadrado/circular) NÃO é implementado.** O código usa sempre o mesmo arranjo horizontal fixo em `top: 62–68%`.

### 3.3 Real no código — `DrawArenaHUD.tsx` (flag on)

- Grid de grupos: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` (`DrawArenaHUD.tsx:110`).
- Container geral `h-screen w-full overflow-hidden` (`DrawArenaController.tsx:166`) + HUD `absolute inset-0 flex flex-col justify-between` (`DrawArenaHUD.tsx:76`).
- Com 3–4 grupos em telas `sm–xl` + header + área central + footer de controles, o conteúdo vertical pode estourar o `h-screen` e ser cortado pelo `overflow-hidden` (especialmente em telas baixas / landscape mobile).

### 3.4 Conclusão do Achado B

As etapas 9 e 10 declaram responsividade "aceitável/OK" **sem benchmark em viewport real pequeno** dos componentes ativos. No código, o `DrawScene3D` (default) usa posicionamento absoluto com coordenadas fixas que **não** se adaptam — divergindo do layout responsivo por quantidade descrito no doc 24.

---

## 4. Achado C — Documentação desatualizada (implantação ≠ código)

Vários documentos descrevem o `LiveDrawModal` **antigo** (pareciam de ~211 linhas, com geração própria de sequência "coluna por coluna"), mas o componente real foi refatorado:

- `09-live-draw-ui.md` (todo) descreve um `LiveDrawModal` de 211 linhas com `drawSequence` interno em `useState` e animação fixa de 2.5 s, "não é configurável / não suporta pausar".
- Real: `src/components/draw/LiveDrawModal.tsx` tem **55 linhas**, resolve `result` e delega a `DrawArenaController`/`DrawScene3D` (`LiveDrawModal.tsx:40-53`). O `DrawArenaHUD` **suporta pausar/avançar** e **slider de duração** (`DrawArenaHUD.tsx:191-200`), e o `DrawArenaController` tem autoplay (`DrawArenaController.tsx:44`).
- `02-architecture.md:117` e `FINAL-AUDIT.md` ainda descrevem o fluxo com `isRevealing = true (2.5s)`, sem refletir a máquina de estados cinematográfica.

> A suíte de testes (60 arquivos / 460 testes) referenciada na etapa 10 valida mais a máquina de estados e o motor; **não há teste de snapshot/regressão de responsividade por viewport** (nenhum teste checa breakpoints do `DrawScene3D`/`DrawArenaHUD`).

---

## 5. Sugestões de melhoria (para validação do usuário)

### 5.1 Ritmo — desacelerar o sorteio

| # | Sugestão | Arquivo(s) | Impacto |
|---|---|---|---|
| R1 | Subir o default de `DrawScene3D` de 2400 → **4000–5000 ms** para alinhar com o documentado (~5 s). | `DrawScene3D.tsx:52` | Baixo, 1 linha |
| R2 | **Consumir `ANIMATION_TIMINGS`** (que já somam ~5 s) no `DrawArenaController` em vez dos valores locais 3200/2600. | `drawArenaFeatures.ts` → `DrawArenaController.tsx` | Baixo |
| R3 | Adicionar **controle de ritmo (slider/pausa/avançar)** no `DrawScene3D` (default), espelhando o `DrawArenaHUD` — hoje só existe no Draw Arena 3D. | `DrawScene3D.tsx` | Médio |
| R4 | Implementar **automático vs manual por equipe** (avançar por clique vs autoplay), permitindo ritmo espectador em eventos. | `DrawScene3D.tsx`, `DrawArenaController.tsx:44` | Médio |
| R5 | Definir constantes de ritmo centralizadas (ex.: `DRAW_REVEAL_MS`) com fallback `prefers-reduced-motion` mais lento. | `drawArenaFeatures.ts` | Baixo |

### 5.2 Responsividade — corrigir o que a doc "aprovou cedo demais"

| # | Sugestão | Arquivo(s) | Impacto |
|---|---|---|---|
| Q1 | Tornar o **layout dos painéis de grupo responsivo por quantidade** (triangular/quadrado/circular do doc 24) em `DrawScene3D`, em vez de coordenadas fixas em `top: 62–68%`. | `DrawScene3D.tsx:237-284` | Médio |
| Q2 | Dimensionar a **urna e os cards por breakpoint** (`sm/md/lg`) com `%`/`clamp()` em vez de px fixos. | `DrawScene3D.tsx:176,252` | Baixo |
| Q3 | Garantir scroll/overlay correto no `DrawArenaController` (`h-screen overflow-hidden` + HUD `justify-between`) em telas baixas e landscape mobile. | `DrawArenaController.tsx:166`, `DrawArenaHUD.tsx:76` | Médio |
| Q4 | Adicionar **testes de regressão de responsividade por viewport** (não existem hoje). | `src/test/drawScene3D.test.tsx` etc. | Médio |

### 5.3 Documentação

| # | Sugestão | Arquivo(s) |
|---|---|---|
| D1 | Atualizar `09-live-draw-ui.md` para refletir o `LiveDrawModal` atual (55 linhas, delegação via feature flag, controles de pausa/avanço/duração). | `09-live-draw-ui.md` |
| D2 | Corrigir `02-architecture.md` e `FINAL-AUDIT.md` (isRevealing 2.5 s → máquina de estados). | `02-architecture.md`, `FINAL-AUDIT.md` |
| D3 | Registrar quilts de ritmo real (2.4/3.2 s) **vs** prescrito (5 s) na etapa 10 como pendência. | `42-...etapa-10-report.md` |

---

## 6. Evidências (arquivo → linha)

- Flag default off: `src/config/drawArenaFeatures.ts:11`; `.env.local.example`
- Select de visualizador: `src/components/draw/LiveDrawModal.tsx:40-53`
- `DrawScene3D` revealDefault: `src/components/draw/DrawScene3D.tsx:52`
- `DrawScene3D` posições de grupo: `src/components/draw/DrawScene3D.tsx:237-284`
- `DrawScene3D` urna/cards: `src/components/draw/DrawScene3D.tsx:176,252,267`
- `DrawArenaController` timings: `src/components/draw/cinematic/DrawArenaController.tsx:45,88,91,120,130`
- `DrawArenaHUD` grid e controles: `src/components/draw/cinematic/DrawArenaHUD.tsx:110,191-200`
- `ANIMATION_TIMINGS` (~5 s) não consumidos: `src/config/drawArenaFeatures.ts:40-48`
- Prescrição ~5 s: `docs/draw-audit/24-draw-arena-visual-concept.md:85,329-334`
- Docs de responsividade "ok": `docs/draw-audit/42-...etapa-10-report.md:210-228`, `41-...etapa-9-report.md:190-193`
- Docs desatualizados (LiveDrawModal antigo): `docs/draw-audit/09-live-draw-ui.md:197`, `02-architecture.md:117`, `FINAL-AUDIT.md`

---

## 7. Recomendação do usuário (próximos passos)

Prioridade sugerida (valide antes de implementar):

1. **R3/R4** — dar controle de ritmo e desacelerar o default (atende a queixa principal: "preciso mais devagar para realizar o sorteio").
2. **Q1/Q3** — responsividade dos painéis e do container no viewport real Mobile/Tablet.
3. **D1/D2** — corrigir docs desatualizados que contradizem o código.

Status: **Validação concluída (README-only). Aguardando decisão do usuário sobre quais sugestões implementar.**

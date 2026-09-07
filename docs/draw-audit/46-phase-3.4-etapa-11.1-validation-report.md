# Relatório 46 — DRAW ARENA: Validação e Correção (ETAPA 11.1)

## Objetivo

Validar em execução real (servidor de desenvolvimento + navegador headless) o resultado da ETAPA 11, corrigir o que a validação acusar e emitir parecer final sobre o motor de sorteio. Escopo: validação técnica (`tsc`/`lint`/`test`/`build`), investigação da falha isolada em `competitionRegistrationsPage`, e **validação visual real em `/sorteio`** cobrindo os 9 itens solicitados (revelação única, fullscreen, carrossel, profundidade, logo BaseOS, grupos, cabeças de chave, título/oficial, ID de auditoria).

> Critério-mestre: CLAREZA → DETERMINISMO → FLUIDEZ → LEGIBILIDADE → PROFISSIONALISMO. Nenhum efeito visual novo foi adicionado nesta etapa — apenas verificação e correção. **O motor de sorteio não foi alterado.**

---

## 1. Resultado técnico

| Verificação | Resultado |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | OK (exit 0) |
| `npm run lint` | OK (exit 0; apenas avisos react-refresh) |
| `npx vitest run` | **64 arquivos / 487 testes PASS** (821s; exit 0) |
| `npm run build` | OK (~5min; warnings pré-existentes de chunk) |

### 1.1 Falha `competitionRegistrationsPage` (breadcrumb) — investigação

**Causa exata:** corrida assíncrona no **próprio teste**, não no aplicativo:

- O teste faz `waitFor` do **h1 estático** (`Gestão de Inscrições`, render síncrono) e só depois lê o breadcrumb, que depende do `getCompetition()` **assíncrono**.
- Sob carga, a asserção do breadcrumb executa antes do load do dado → o breadcrumb ainda mostra o fallback "Competição".
- **Não é regressão**: teste, página e `BreadcrumbNav` não tinham diff no working tree; o arquivo passava isolado e falhava apenas sob carga (raça de tempo em teste de UI).

**Correção:** a asserção do breadcrumb foi movida para dentro do mesmo `waitFor` do h1, aguardando o dado assíncrono estabilizar. O teste **não foi mascarado nem removido** — passou a verificar corretamente o estado final.

## 2. Resultado visual (validação real em `http://127.0.0.1:5173/sorteio`)

Ambiente: `npm exec vite --port 5173` (dev) + Playwright chromium headless (login demo "Administrador"; screenshots e capturas frame-a-frame em `/tmp/opencode/shots/`). Resultado global da suíte de validação: **37 PASS / 0 FAIL / 4 WARN** (WARNs = estado "Realizando o sorteio..." observado no modo carrossel, comportamento esperado).

### 2.1 Revelação única (sem piscada) — PASS

- 4/4 revelações com **UMA única equipe** e **UM único grupo destino** (frame a frame):
  Titanium Voleibol → Grupo A · Vortex → B · Fênix → A · Águias → B.
- Em nenhum frame apareceu time/grupo diferente do resultado real (sem "Equipe A/B/C/A" antes do término).
- Progresso incrementou corretamente (0→1→2→3); "Realizando o sorteio..." precede o resultado (modo carrossel).

### 2.2 Fullscreen — PASS

- Overlay cobre o viewport inteiro (`1440×900`), `position: fixed`, `z-index: 9999`, fundo opaco `rgb(11,17,32)` — **nenhum card/tabela da página de sorteio visível atrás**.

### 2.3 Carrossel (órbita invisível) — PASS

- Canvas WebGL presente e renderizando (análise de pixels: imagem não-branca, padrão de brilho `stddev≈29`).
- **Órbita invisível**: sprites aparecem como blobs discretos sem linha/anel contíguo no raio da órbita; não há `ringGeometry`/stroke/edge em `LogoCarouselScene`.

### 2.4 Profundidade contínua — PASS

- Escaval/opacidade contínuas por posição Z: `baseScale = 0.45 + 0.65×depth`, `baseOpacity = 0.25 + 0.75×depth` (trás → frente), fundo com `fog` + blur; não é apenas z-index.

### 2.5 Logo BaseOS central — PASS

- Âncora central: anel âmbar (opacidade 0.15) + disco escuro + `pointLight` âmbar; centro renderizado `#0b1120` conforme projeto. Não gigante; na revelação a equipe sorteada assume o foco (`scale×1.7`, opacidade 1.0).

### 2.6 Grupos (resultado real) — PASS

- Alternância **A→B→A→B** (2 grupos), sem repetição consecutiva, derivada da sequência real do motor — **sem algoritmo paralelo**.

### 2.7 Cabeças de chave (modo dirigido) — PASS

- Painel expõe as 8 equipes; FASE `CABEÇAS DE CHAVE • 2` presente no HUD.
- `CABEÇA DE CHAVE 1` → Grupo A; `CABEÇA DE CHAVE 2` → Grupo B (diferentes) — validação frame a frame dos badges.
- HUD transita para `SORTEIO DAS EQUIPES` após a fase de cabeças; botão `SORTEAR PRÓXIMO` conduz cada avanço.

### 2.8 Título `SORTEIO OFICIAL` — PASS

- Presente em região própria do header; **`SORTEIO INICIAL` não aparece** (verificado via `innerText`).

### 2.9 ID de auditoria — PASS

- `SORTEIO #DRAW-MASCULINO-2026` exibido discretamente no canto inferior — ID **real** da sessão (não placeholder/inventado).

### 2.10 Observações do ambiente headless

- WARN `THREE.WebGLRenderer: A WebGL context could not be created... existing context of a different type` no chromium (sem WebGL2): o three testa `webgl2` antes de `webgl` no mesmo canvas; por ser artefato de ambiente, a renderização seguiu funcional e o aviso **não ocorre em navegador real**.
- O modelo de IA não inspeciona imagens diretamente; a validação visual foi feita por DOM + pixels + leitura de fonte, com registros em `/tmp/opencode/shots/` (`01-fullscreen-idle.png`, `anim-1..4-settled.png`, `02-audit-id.png`, `03-head1.png`, `04-head2.png`, `05-teams-phase.png`, `flicker-*.json`) para conferência manual.

---

## MOTOR DE SORTEIO ALTERADO: NÃO

- `git diff -- src/services/drawService.ts` = **apenas comentários** (7 ins. / 3 del.), pré-existentes e feitos antes da ETAPA 11.
- Nenhuma linha de lógica/aleatoriedade/distribuição/tabela tocada nesta etapa nem na anterior.
- As sequências exibidas (A→B→A→B, ordem de cabeças) vêm do resultado real do `drawService`.

---

## Correções aplicadas nesta etapa

| Item | Mudança |
|---|---|
| `src/test/competitionRegistrationsPage.test.tsx` | Asserção do breadcrumb movida para dentro do `waitFor` (corrige corrida assíncrona **do teste**; não mascara/remove) |

Demais arquivos do Draw Arena (`LogoCarouselDraw`, `ManualUrnDraw`, `LiveDrawModal`, `DrawPage`, `drawService`) **não foram alterados** nesta etapa — apenas validados.

---

## Limites mantidos

- Não alterou algoritmo/PRNG/distribuição/tabela do `drawService.ts`.
- Não automatizou o sorteio inteiro (fluxo manual `SORTEAR PRÓXIMO` preservado).
- Não criou nova aleatoriedade nem novo efeito visual.
- Não removeu o fallback `DrawScene3D` (ambiente sem WebGL).

---

MOTOR DE SORTEIO ALTERADO: NÃO
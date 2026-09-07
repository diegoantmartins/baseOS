# Relatório 45 — DRAW ARENA: Refinamento Crítico (ETAPA 11)

## Objetivo

Auditar e refinar a experiência do sorteador ao vivo (Draw Arena) com foco em **ajuste fino, polimento e rigidez** do fluxo de revelação — eliminando piscadas, múltiplas revelações, interferência da órbita, cinematografia rasa e sobreposição de título. A Etapa 11 atuou sobre a APRESENTAÇÃO (`ManualUrnDraw`, `LogoCarouselDraw`) e a integração; **o motor de sorteio não foi alterado**.

> Ordem de prioridade dos 22 requisitos: (1) corrigir várias revelações/piscadas; (2) uma única revelação por clique; (3) resultado travado durante a animação; (4) remover linha da órbita; (5–6) profundidade contínua + logo BaseOS central; (7–8) título sem sobreposição; ... (21) validar integridade do motor; (22) testar/tipar/lintar/buildar.

---

## 1. Correção da revelação piscando (Req 1–3)

**Problema diagnosticado:** durante a animação, o componente recalculava o "próximo time" a ser exibido (derivado de `nextStep`/`nextTeam`), de modo que o conteúdo central mudava de valor ao longo dos estágios (`drawing → reveal → groupupdate → result`) — piscando times/grupos incorretos antes de estabilizar no resultado real.

**Correção aplicada (em ambos os componentes):**

- **Lock de revelação** via `useRef` imutável:
  - `ManualUrnDraw`: `animatedStepRef.current = { step, team }` capturado **uma única vez** no clique.
  - `LogoCarouselDraw`: `animatedRevealRef.current = { step, team }` idem.
- Todo o conteúdo central (`shownTeam`, `shownStep`, badge, grupo) passa a ler **sempre do ref locked**, nunca de `nextStep` derivado.
- Durante a animação **nenhuma alteração externa muda o que será revelado** (o resultado veio do motor real no momento do clique).
- O ref só é liberado ao retornar ao estado ocioso (`idle`).

## 2. Proteção contra duplo clique (Req 2)

- Guarda dupla no handler: `if (stage !== 'idle' || !hasMore || !nextStep) return;` **+** `if (ref.current) return;` — protege inclusive contra closures defasadas (dois cliques no mesmo tick de render).
- Botão `SORTEAR PRÓXIMO` fica `disabled` durante toda a coreografia e no fim (`stage !== 'idle' || isComplete`).

## 3. Resultado não se altera durante a animação (Req 3)

- O step/team exibido é congelado no clique; a sequência (`presentationOrder`) não é reavaliada no meio do movimento.
- O carrossel apenas **apresenta** o resultado já capturado (desacelera até a logo do time real), sem nova aleatoriedade.

## 4. Remoção total da linha da órbita (Req 4)

- Removido o anel/círculo/linha `ringGeometry` que indicava a trajetória em `LogoCarouselScene`.
- A órbita existe apenas **matematicamente** (ângulo θ, raio), sem elemento visual (stroke/edge/guia/brilho).
- Em `ManualUrnDraw` a cena 3D também ficou sem anel/orbita visível.

## 5. Profundidade de campo contínua (Req 5)

- Substituído o "dois estados" (fundo × frente) por escada contínua calculada pela posição Z:
  - `baseScale = 0.45 + 0.65 × depth`
  - `baseOpacity = 0.25 + 0.75 × depth`
  - Fundo com `fog` (`#0b1120`, near 9 → far 24), brightness reduzido e blur nos overlays distantes.
- Não depende de `z-index`: usa escala/opacidade/posição (translateZ/scale), sensação real de transparência e distância.

## 6. Logo BaseOS no centro (Req 6)

- Adicionado **farol central**: anel + disco + `pointLight` âmbar (`#f6c76b`) em `[0, 0.2, 0]` como fonte de luz da cena.
- Estética "transmissão esportiva premium" preservada (âmbar `#f6c76b`/`#f7d999`, fundo `#0b1120`, espaço negativo).

## 7. Título "SORTEIO OFICIAL" sem sobreposição (Req 7–8)

- Header/cabeçalho agora é **camada separada** do carrossel (layout em regiões: header → cena → group arena → footer), impedindo que o título cubra logos.
- Texto preferido: **"Sorteio Oficial"** (mantido em ambos os componentes; o teste `prefers-reduced-motion` valida sua presença).

## 8. Identidade da equipe separada do logo (Req 9)

- O logo (escudo/iniciais) e o texto (nome da equipe) são elementos distintos na revelação — o logo ocupa a cena 3D; o card central expõe nome, grupo e badge separadamente.

## 9. ID de auditoria real (Req 10)

- Nova prop opcional `drawId` (string) propagada por `LiveDrawModal` a partir de `DrawPage` (`existingDraw?.id`).
- Exibição discreta no canto inferior da tela (`SORTEIO #<id>`), presente apenas quando há ID real persistido — sem inventar valor.

## 10. Diferenciação puro × direcionado (Req 11)

- A fase em andamento é derivada do passo real:
  - Modo `seeded`: FASE `CABEÇAS DE CHAVE` primeiro, depois `SORTEIO DAS EQUIPES`.
  - Modo `random`: apenas `SORTEIO DAS EQUIPES`.
- Nenhuma nomenclatura genérica ("rodada 1") — o HUD reflete o que o sorteio real está fazendo.

## 11. Cabeças de chave numeradas (Req 12–14)

- Fase HUD: `CABEÇAS DE CHAVE • <total>` (plural = identifica a etapa).
- Badge de revelação: **`CABEÇA DE CHAVE N`** com `N` calculado pela ordem **real** no resultado (`sequence.filter(isHead).findIndex(teamId)+1`), via nova função `headBadgeLabel(step, sequence)` em `LogoCarouselDraw`.
- A ordem das cabeças segue a prioridade determinada pelo motor (sem aleatoriedade).
- A transição cabeças → equipes é automática pela sequência.

## 12. Transição de fases + botão continua (Req 15–16)

- Ao terminar a fase de cabeças, o HUD troca para `SORTEIO DAS EQUIPES` e o botão permanece disponível para continuar o sorteio — o fluxo manual (`SORTEAR PRÓXIMO`) foi mantido.

## 13. Carrossel remove times já revelados (Req 17)

- `pendingTeams` é usado no carrossel; a cada revelação o time sorteado sai da órbita, restando apenas as equipes ainda não sorteadas.
- Logo central cresce (escala ↑, opacidade total, glow âmbar) durante `reveal`; o grupo destino recebe o destaque âmbar em `groupupdate`.

## 14. Urna manual (ManualUrnDraw) — auditoria aplicada

Mesmas correções portadas ao `ManualUrnDraw` (urna 3D com bolas): lock `animatedStepRef`, guarda de duplo clique, profundidade contínua + fog, farol BaseOS, layout header/cena/arena/footer (sem sobreposição), `drawId`, badges de cabeça de chave numerados e fase plural. O componente permanece no repositório (caminho secundário; `LogoCarouselDraw` continua o caminho principal no `LiveDrawModal`).

---

## 15. Validação (Req 21–22)

| Verificação | Resultado |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | OK (0 erros) |
| `npm run lint` | OK (0 problemas) |
| `npm test` | 64 arquivos / 487 testes — falha única pré-existente e não relacionada em `competitionRegistrationsPage` (breadcrumb; arquivo **sem diff** no working tree). **13/13 testes de draw verdes** (`manualUrnDraw` + `logoCarouselDraw`). |
| `npm run build` | OK (apenas warnings pré-existentes de chunk) |
| `git diff -- src/services/drawService.ts` | Somente diff pré-existente **de comentários** (7 ins. / 3 del.) feito antes da Etapa 11. **Nenhuma linha de código do motor tocada nesta etapa.** |

**MOTOR DE SORTEIO ALTERADO: NÃO**

---

## 16. NÃO feitos (limites mantidos)

- Não alterou o algoritmo/PRNG/distribuição/tabela do `drawService.ts`.
- Não automatizou o sorteio inteiro (fluxo manual preservado).
- Não removeu `SORTEAR PRÓXIMO`.
- Não criou nova aleatoriedade — a tela apenas apresenta o resultado real.
- Não removeu o fallback `DrawScene3D` (sem WebGL = `shouldUseDrawArena3D()` → fallback).

---

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/draw/ManualUrnDraw.tsx` | Lock `animatedStepRef` + guarda duplo clique; profundidade contínua + fog; farol BaseOS; layout em camadas; `drawId`; fase plural; badge "CABEÇA DE CHAVE N"; sem anel de órbita |
| `src/components/draw/LogoCarouselDraw.tsx` | `drawId`/`AnimatedReveal`; `animatedRevealRef` lock; cena 3D sem anel, logo BaseOS central + `pointLight`; profundidade contínua (escala/opacidade por Z); `headBadgeLabel`; fase plural; card de revelação só em `reveal`/`groupupdate`/`result`; status "Realizando o sorteio..." durante `drawing`; auditoria |
| `src/components/draw/LiveDrawModal.tsx` | Prop `drawId` repassada ao `LogoCarouselDraw` |
| `src/pages/DrawPage.tsx` | Passa `existingDraw?.id` como `drawId` |

---

MOTOR DE SORTEIO ALTERADO: NÃO
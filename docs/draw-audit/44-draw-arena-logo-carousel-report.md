# Relatório 44 — DRAW ARENA: Carrossel 3D de Logos

## Objetivo

Substituir a experiência da urna de bolinhas por um **carrossel tridimensional de logos** com revelação e queda para o grupo, criando a percepção de um sorteio esportivo profissional (linguagem BaseOS, âmbar, cinematográfico). O operador avança **uma equipe por clique** em [`SORTEAR PRÓXIMO`].

O sorteio em si **não é executado por esta tela** — ela apenas APRESENTA o resultado real do motor (`drawService.ts`).

---

## 1. Conceito

- **Carrossel 3D de logos** como elemento central (substitui a urna/bingo/bolinhas).
- Estética "transmissão esportiva premium" / broadcast / SaaS enterprise.
- NÃO parece jogo, cassino, bingo ou máquina infantil.
- Fundo `#0b1120` (dark SaaS existente), detalhes em âmbar da identidade (`#f6c76b`), muito espaço negativo, contraste alto.

---

## 2. Arquitetura

```
OPERADOR → SORTEAR PRÓXIMO → RESULTADO REAL → DRAW ARENA → ANIMAÇÃO
```

- Componente principal novo: `src/components/draw/LogoCarouselDraw.tsx`
- Integração: `src/components/draw/LiveDrawModal.tsx` (agora aponta para `LogoCarouselDraw` como principal; `DrawScene3D` permanece como fallback sem WebGL).
- A sequência de exibição (fases + rodadas) está em `src/components/draw/presentationOrder.ts` (reutilizada).
- Timings/ritmo em `src/config/drawArenaFeatures.ts` (`ANIMATION_TIMINGS`, `resolveChoreography`, `MAX_PIXEL_RATIO`).

### Infraestrutura reutilizada (onde seguro)

| Módulo | Uso |
|---|---|
| `presentationOrder.ts` (`buildPresentationOrder`) | Deriva etapa por etapa (FASE cabeças → FASE equipes, rodadas A→B→C→A→B→C) a partir do resultado real. Nenhuma aleatoriedade. |
| `drawArenaFeatures.ts` (`resolveChoreography`, `ANIMATION_TIMINGS`, `MAX_PIXEL_RATIO`) | Um único controle de RITMO modula todas as durações; nenhum número mágico. |
| `LiveDrawModal.tsx` | Ponto único de integração; decisão WebGL (flag `VITE_DRAW_ARENA_3D`). |

Não foi refeito o motor. `drawService.ts` permanece **funcionalmente intacto**.

---

## 3. Fullscreen isolado

- Portal via `createPortal(content, document.body)` com `z-[9999]`, `100vw × 100vh`.
- Nenhum conteúdo da página anterior (cards/config/tabelas/formulários/resultados antigos) permanece visível.
- Ao fechar: `onClose` é chamado; timers são limpos no `useEffect` de desmontagem.

---

## 4. Carrossel 3D (Atos 1)

- Cena Three.js / React Three Fiber (`LogoCarouselScene`).
- Logos em **órbita circular horizontal** (`radius = 5.2`), posição `(cosθ·R, y, sinθ·R)`.
- **Profundidade real**: escala e opacidade variam com a posição em `z` (distante = menor/transparente; centro/frente = maior/nítido).
- Cada logo é um `SHEET`/`sprite` com textura Canvas gerada em runtime (`makeTeamTexture`): exibe o escudo (`logoUrl`) ou as iniciais do time; com fallback de material sólido (robusto em jsdom).
- Cache de texturas por `team.id` (evita recriação).
- Loop contínuo lento (hipnótico/previsível) enquanto aguarda; para ao concluir.

---

## 5. Parallax / profundidade

- Três planos no overlay: fundo radial + grade sutil + carrossel 3D.
- As logos distantes têm menor escala/opacidade (sensação de profundidade), sem parallax excessivo.

---

## 6. Revelação (Ato 2)

- No clique, o carrossel **desacelera** (easing `THREE.MathUtils.damp`) até a logo do time real parar exatamente no centro.
- A logo escolhida é **a do resultado real** (`nextTeam` → próximo passo da sequência). Nenhuma aleatoriedade nova.
- No centro: a logo cresce (escala ~1.15–1.6), fica opaca, ganha glow âmbar sutil.
- Hierarquia: `LOGO → EQUIPE SORTEADA → NOME → CAIU NO GRUPO X`.

---

## 7. Queda para o grupo (Ato 3)

- Durante `groupupdate` o card do grupo de destino recebe destaque âmbar (borda + glow + pulse).
- A equipe já sorteada aparece encaixada dentro do card do grupo (histórico visual), permanecendo visível durante o resto do sorteio.

---

## 8. Dinâmica de destino

- O destino da logo é derivado do `groupName` do passo real (`shownStep.groupName`), não hardcoded por posição.
- O grupo correto é destacado via `groupBoard` (cálculo por `groupIndexFor(teamId)`).

---

## 9. Identidade BaseOS

- Âmbar `#f6c76b`/`#f7d999` para foco, borda, glow e confirmação.
- Sem neon/roxo/arco-íris/estética gamer.
- Fundo dark `#0b1120`, muito espaço negativo, contraste alto.

---

## 10. Botão SORTEAR PRÓXIMO (manual)

- **Não** foi removido nem automatizado.
- A cada equipe: clique → animação → resultado → aguarda → clique novamente.
- Desabilitado durante a coreografia (`disabled={stage !== 'idle' || isComplete}`) e com guarda de clique único.
- Botões/disposição 100% em português.

---

## 11. Fases e rodadas

- **Cabeças de chave** (modo seeded): FASE `CABEÇAS DE CHAVE` primeiro (cabeça → grupo conforme o motor), depois `SORTEIO DAS EQUIPES`.
- **Sorteio puro** (random): apenas `SORTEIO DAS EQUIPES`.
- Rodadas derivadas de `buildPresentationOrder`: A→B→A→B (2 grupos), A→B→C→A→B→C (3 grupos), sempre respeitando o resultado real/capacidade.

---

## 12. RITMO

- Slider `Lento ←→ Rápido` (`MIN_REVEAL_MS`..`MAX_REVEAL_MS`, passo `STEP_MS`).
- Modula **somente** durações/animação (via `resolveChoreography`); nunca altera resultado.
- Default ≈3–5s por equipe.

---

## 13. Group Arena

- Cards de grupos na parte inferior (scroll horizontal em mobile), não dominam a tela.
- Hierarquia: carrossel/logo → revelação → grupos → HUD.
- Cada card mostra as equipes já sorteadas com logo/ícone + `X/Y`.

---

## 14. Responsividade

- Desktop: carrossel amplo.
- Mobile: carrossel continua (logos menores/mais transparentes por profundidade), grupos em painel inferior com scroll horizontal, sem sobreposição dos controles (operador fora da área da apresentação).

---

## 15. Fallback

- Sem WebGL (`shouldUseDrawArena3D()` → false) o `LiveDrawModal` renderiza `DrawScene3D`.
- Novamente, o motor continua intacto em ambos os caminhos.

---

## 16. Performance

- Carrossel puramente **matemático** (ângulo, raio, profundidade, escala, opacidade) — sem física pesada.
- Geometrias/materiais reutilizados; texturas cacheadas; DPR limitado via `MAX_PIXEL_RATIO`.
- Canvas com `powerPreference: 'high-performance'`.

---

## 17. Acessibilidade

- Respeita `prefers-reduced-motion` (`getReducedMotion`): reduz velocidade/movimento do carrossel e mantém opacidade mínima das logos, mas preserva logo/equipe/grupo/progresso/resultado.

---

## 18. Testes

Novo arquivo `src/test/logoCarouselDraw.test.tsx` (7 testes):

- Exibe competição + botão `SORTEAR PRÓXIMO` em português (e ausência de "next").
- Sorteio puro 2 grupos: primeiro time → Grupo A (ordem A→B→A→B).
- Segundo clique → Grupo B (alternância).
- Cabeças de chave: FASE `CABEÇAS DE CHAVE` revela a cabeça no Grupo A.
- Duplo clique durante a animação **não** revela dois times.
- Conclusão: botão desabilitado + `SORTEIO CONCLUÍDO` + `CONCLUIR SORTEIO`.
- `prefers-reduced-motion`: reduz animação, mantém fluxo e informação.

Reutilizado/regredido: `src/test/presentationOrder.test.ts` (5 testes). O teste antigo `manualUrnDraw.test.tsx` continua verde (o componente antigo permanece no repositório, mas não é mais o caminho principal).

**Resultado da suíte completa:** 64 arquivos / 487 testes passando.

---

## 19. Validação

```bash
npx tsc -p tsconfig.app.json --noEmit   # OK
npm run lint                            # OK (0 erros)
npm test                                # 64 arquivos / 487 testes OK
npm run build                           # OK (apenas warnings pré-existentes de chunk)
```

Integridade do motor: `git diff -- src/services/drawService.ts` → apenas comentário no cabeçalho (7 inserções / 3 exclusões, todas linhas de comentário). **Nenhuma alteração funcional.**

---

## 20. NÃO feitos (limites mantidos)

- Não usa urna/bingo/bolinhas como elemento principal.
- Não cria novo algoritmo/aleatoriedade.
- Não altera `drawService.ts`.
- Não automatiza o sorteio inteiro.
- Não remove `SORTEAR PRÓXIMO`.
- Não mostra a interface antiga atrás da apresentação.

---

## Arquivos alterados/criados

- `src/components/draw/LogoCarouselDraw.tsx` (novo — carrossel 3D de logos).
- `src/components/draw/LiveDrawModal.tsx` (atualizado — usa `LogoCarouselDraw` como principal).
- `src/test/logoCarouselDraw.test.tsx` (novo — 7 testes).

---

MOTOR DE SORTEIO ALTERADO: NÃO

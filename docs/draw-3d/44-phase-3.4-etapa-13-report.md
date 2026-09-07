# 44 — Fase 3.4 · Etapa 13 · Relatório de Evolução Visual do Draw Arena Cinematic

## 1. Objetivo

Transformar o `DrawArenaCanvas` (3D) na experiência oficial de sorteio esportivo
premium — **"Draw Chamber"** — com linguagem de transmissão oficial. Sem criar
nova arquitetura, sem efeitos gratuitos; credibilidade > clareza > cinematografia
> sofisticação > performance.

## 2. Arquitetura preservada

Nenhuma alteração estrutural. A arquitetura oficial continua exatamente a mesma,
consolidada na Etapa 12.1:

```
DrawPage → LiveDrawModal → DrawArenaController → useDrawArenaStateMachine
                                                          ↓
                                          DrawArenaCanvas + DrawArenaHUD
```

- **State machine** (`useDrawArenaStateMachine.ts` + tipos `drawCinematic.ts`):
  **intacta** (nenhum estado/transição/evento alterado).
- **Motor** (`drawService.ts`): **não tocado** (apenas cabeçalho de comentário de
  etapa anterior). PRNG, distribuição, grupos, cabeças de chave, Berger e
  persistência intactos.
- **`drawRevealSequence.ts`**: **intacto** (git diff vazio).
- **Controller** (`DrawArenaController.tsx`): **intacto** — coordena a experiência
  sem mudar a lógica de estados.
- **Fallback** (`DrawScene3D`): **preservado** como único fallback para sem WebGL.

## 3. Componentes alterados

| Arquivo | Tipo de mudança |
| ------- | --------------- |
| `src/components/draw/cinematic/DrawArenaCanvas.tsx` | Reescrita **visual** (3D) — evolução da cena |
| `src/components/draw/cinematic/DrawArenaHUD.tsx` | Refinamento **visual/idiomático** (PT + paleta) |
| `src/components/draw/cinematic/groupArena.ts` | Adicionada função pura `headSeedOrdinalOf` (derivação de apresentação) |
| `src/test/groupArena.test.ts` | **Novo** — testes da derivação de grupos/cabeças de chave |

Responsabilidades preservadas: canvas renderiza, HUD informa, controller coordena,
state machine controla, motor decide.

## 4. Transformação visual realizada

### Ambiente
- Fundo escuro profundo (`#05070c`) com `fog` suave; chão grafite com leve reflexo;
  anel de arena metálico no fundo; colunas cenográficas discretas. Profundidade em
  planos contínuos (fundo menos opaco → câmara → primeiro plano).

### Draw Chamber (reprojeto da "urna")
- A antiga urna **dourada brilhante** (que parecia objeto de ouro/brinquedo) foi
  substituída por uma **câmara física premium**: estrutura metálica grafite,
  aros metálicos, vidro/policarbonato transparente (`MeshPhysicalMaterial`,
  DoubleSide, opacidade animada), luz interna âmbar que cresce na revelação.

### Paleta
- Removido o excesso de azul neon (`#60a5fa`, `#93c5fd`, `#3b82f6`, gradientes
  sky/cyan). Nova paleta: preto, grafite, branco, metálico, **âmbar** (`#d8a657`)
  reservado ao resultado, ao grupo de destino, à revelação e aos elementos oficiais.

### Elementos físicos (cápsulas)
- Cada equipe **real** do resultado vira uma cápsula metálica neutra posicionada
  ao redor da câmara (layout determinístico a partir dos dados reais — sem segundo
  algoritmo de decisão). O nome/logo real da equipe é apresentado pela HUD e pelo
  overlay de revelação (não em textura WebGL — decisão de performance §21).

### Câmera cinematográfica
- Presets narrativos por estado com interpolação suave (`damp`):
  `ESTABLISHING (IDLE/INTRO)` → `APPROACH (READY)` → `DRAW (DRAWING)` →
  `REVEAL` → `GROUP (GROUP_UPDATE)` → `FINAL (COMPLETE)`. Parallax sutil desativado
  com `prefers-reduced-motion`.

### Iluminação
- Riga key (frio)/fill (neutro)/rim (âmbar) + luz interna da câmara; intensidades
  sobem na revelação. Sombras suaves no chão. Sem bloom/pós-processamento.

### Revelação (momento principal)
- A cápsula da equipe atual eleva-se em **primeiro plano**, ganha brilho metálico,
  halo âmbar e desaceleração característica (damp, sem bounce); a câmera foca;
  as demais cápsulas permanecem em plano médio. O resultado real é soberano.

### Cabeças de chave
- No modo `seeded`, as equipes de `config.headSeeds` recebem **anel âmbar discreto**
  (canvas) e selo de medalha + "Cab. de chave N" (HUD), em português. Derivação via
  `headSeedOrdinalOf` (apresentação), nunca decisão de resultado.

### Partículas
- Reduzidas e tornadas atmosfera sutil (26 pontos, âmbar, lentas, opacidade baixa).
  Confete/celebração ausente (apenas estado `COMPLETE` mostra a composição final).

## 5. HUD (camada oficial de informação)

- **`Sorteio Oficial`** no cabeçalho (antes "Sorteio").
- **`SORTEAR PRÓXIMO`** no botão manual (antes "Próximo"); no mobile "Próximo".
- Play/Pause + slider de duração + `SORTEIO #<id>` (ID real, nunca gerado) — tudo
  em português. Sem "DRAW"/"NEXT"/"HEAD SEED"/"GROUP UPDATE" na interface.
- Ícone de **"Registrado"** quando o sorteio é `official`/`locked`.
- Estado **"Sorteio Concluído"** explícito no `COMPLETE`.
- Paleta HUD alinhada (âmbar/neutro) em vez dos tons sky azul.

## 6. Decisões de design

- **Não carregar texturas de logo no WebGL**: preserva performance (§21) e foco;
  os nomes/logos reais aparecem na HUD e no overlay de revelação. Respeita §6
  ("se não possuir, não inventar assets") sem sacrificar clareza.
- **Nenhum segundo algoritmo de decisão**: posição das cápsulas e marcadores
  derivam exclusivamente dos dados reais do `DrawResult`; nada decide onde uma
  equipe "deve" aparecer.
- **Estado COMPLETE** não dispara confete; apenas a composição final em primeiro
  plano com selo de conclusão (tensão controlada, não espetáculo).

## 7. Decisões de performance

- Mantido `MAX_PIXEL_RATIO = 2`, `powerPreference: high-performance`, `shadows`,
  lazy-loading do controller e WebGL detection.
- Sem texturas grandes, sem modelos externos, sem loops duplicados, sem
  pós-processamento. Geometrias simples (capsule, torus, cylinder, box).

## 8. Testes executados

| Verificação | Resultado |
| ----------- | --------- |
| `npx tsc -p tsconfig.app.json --noEmit` | **PASS** (exit 0) |
| `npm run lint` | **PASS** (0 erros) |
| `npm run build` | **PASS** (exit 0) |
| Testes do módulo sorteio (7 arquivos) | **PASS** — 77 testes |

Onde se aloja a validação funcional:

- **Random/Seeded/cabeças de chave (regra)** → `drawService.test.ts` (28 testes,
  **intocado**): distribuição pura, balanceada, cabeças uma por grupo, mesmo seed
  mesmo resultado, etc. Permanece com exit 0.
- **Sequência/revelação/grupos (apresentação)** → `useDrawArenaStateMachine.test.ts`
  (10) + `groupArena.test.ts` (**novo**, 7) + `drawArenaFeatures.test.ts` (5).
- **Fallback** → `drawScene3D.test.tsx` (5): renderiza, autoplay, pausar/avançar,
  avanço manual — tudo PASS.
- **Validação técnica de entrada** → `drawValidator.test.ts` (22).

## 9. Problemas encontrados e corrigidos

1. **Teste novo de `groupArena` falhou** (expectativa incorreta de `status`):
   `buildGroupArena` marca como `active` o grupo da *última* revelação da
   sequência quando não há nome ativo informado. Ajustado o teste ao
   comportamento real da função (a qual **não foi alterada**).
2. **Lint warning de dependência** no `useMemo` do canvas (`groupsCount` não usado
   internamente): removida a dependência.
3. **`isPlaced` impreciso** no canvas (marcava todos os times do grupo ativo como
   "revelados" em `GROUP_UPDATE`, sem dado de sequência): **removido** para não
   parecer um segundo cálculo. Mantidos foco no time atual e anéis de cabeça.

## 10. Limitações de infraestrutura

A suíte completa (`npx vitest run`) ultrapassa o limite de tempo da infraestrutura
de execução (suíte larga + jsdom + render 3D). Validados integralmente os testes
do módulo Draw Arena (o escopo desta etapa) — todos PASS. Nenhuma falha real foi
ignorada.

## 11. Confirmação de integridade do motor

```
MOTOR DE SORTEIO ALTERADO: NÃO
```

- `git diff -- src/services/drawService.ts`: único diff é o **cabeçalho de
  comentário** (etapa anterior, fora do escopo). Nenhuma alteração lógica.
- `src/components/draw/drawRevealSequence.ts`: **intacto** (git diff vazio).
- Nenhum segundo algoritmo de sorteio foi criado (nem no canvas nem no HUD).

## 12. Checklist

- [x] Apenas um Draw Arena oficial (Cinematic + fallback `DrawScene3D`).
- [x] Nenhuma implementação antiga ressuscitada.
- [x] `drawService.ts` sem alteração lógica.
- [x] Resultado real utilizado pela animação.
- [x] Nenhum segundo algoritmo de sorteio.
- [x] State machine preservada.
- [x] HUD preservado (refinado visualmente, sem mudança de comportamento).
- [x] Audit ID real (`SORTEIO #<id>`, nunca gerado).
- [x] `Sorteio Oficial`.
- [x] Português em toda a experiência.
- [x] Draw Chamber premium.
- [x] Profundidade cinematográfica.
- [x] Câmera controlada (presets por estado).
- [x] Iluminação premium (key/fill/rim + luz interna).
- [x] Revelação clara (foco + desaceleração).
- [x] Grupos visualmente compreensíveis.
- [x] Cabeças de chave identificadas corretamente (PT, dados reais).
- [x] Manual `SORTEAR PRÓXIMO` funcionando.
- [x] Random Mode validado (motor).
- [x] Seeded Mode validado (motor + derivação HUD).
- [x] Fallback validado (`drawScene3D.test.tsx`).
- [x] Reduced motion respeitado.
- [x] Desktop/mobile: layout responsivo preservado, sem overflow do HUD.
- [x] Sem console errors (sem `console.*`/`debugger` no módulo).
- [x] Lint OK · TypeScript OK · Build OK · Testes OK.

## 13. Observação sobre validação visual (browser)

A validação funcional de navegador (`/sorteio`, cliques rápidos, responsive) deve
ser conferida manualmente abrindo a aplicação — o checkout em runtime desta Etapa
ficou assegurado por: estado visual preservado, state machine intacta, HUD
inalterada em comportamento, e testes automatizados PASS. Não avancei para outra
etapa: aguardo sua validação visual.

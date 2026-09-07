# DRAW ARENA — ETAPA 5 WALKTHROUGH

## 1. Arquitetura 3D

A Etapa 5 elevou o canvas da prova de conceito para uma base 3D profissional, mantendo a separação entre domínio e apresentação. A lógica de sorteio continua em `drawService.ts`, e a visualização passou a ser controlada pelo `DrawArenaController` e pelo `DrawArenaCanvas`.

A cena foi organizada em uma estrutura simples, mas sólida:

- `CameraRig` para framing e ajustes de câmera
- `LightingRig` para iluminação principal e volume
- `ArenaBackdrop` para profundidade e ambiente
- `Urn` para o elemento central do sorteio
- `DrawObjects` para representar bolas/equipes em cenário 3D
- `ParallaxRig` para movimento sutil e futuro refinamento

---

## 2. Componentes criados

Os principais blocos desta etapa foram implementados diretamente no próprio canvas, sem fragmentar demais a arquitetura:

- `CameraRig`
- `LightingRig`
- `ArenaBackdrop`
- `Urn`
- `TeamBall`
- `DrawObjects`
- `ParallaxRig`
- `DrawArenaScene`

A abstração foi mantida compacta para evitar complexidade prematura.

---

## 3. Urna

A urna foi modelada proceduralmente em Three.js com geometria básica, priorizando:

- corpo principal em cilindro
- tampa em aro metálico
- base robusta e pesada
- profundidade visual por camadas
- materiais metálicos com acabamento refinado
- volume claro sem exagerar em brilho ou neon

A intenção foi transmitir uma cerimônia esportiva profissional e tecnológica, sem cair em estética genérica de cassino ou jogo.

---

## 4. Iluminação

A iluminação foi organizada em um rig simples, mas eficiente:

- `ambientLight` para base do ambiente
- `directionalLight` para volume principal
- `pointLight` para destaque lateral
- `spotLight` para acabamento de rim e leitura da silhueta

Isso garantiu leitura da urna e das bolas sem explodir em número de luzes ou custo de render.

---

## 5. Câmera

Foi criado um `CameraRig` com presets preparados para:

- `ESTABLISHING`
- `DRAW`
- `REVEAL`
- `GROUP`

A câmera inicial foi configurada para enquadrar a urna com profundidade, sem exagerar no zoom e preservando espaço para o HUD HTML.

A câmera também reage ao viewport e ao pointer de forma sutil, permitindo crescimento futuro sem quebrar a composição.

---

## 6. Parallax

A infraestrura de parallax foi adicionada de forma controlada:

- movimento baseado no ponteiro do mouse
- amplitude reduzida e discreta
- desativação automática com `prefers-reduced-motion`

Isso cria uma base útil para futuras etapas cinematográficas sem comprometer estabilidade visual.

---

## 7. Responsividade

A cena foi ajustada de forma que a composição preserve legibilidade em diferentes tamanhos:

- desktop: framing mais amplo
- tablet: composição menor, mas equilibrada
- mobile: urna e ambiente continuam legíveis

O `dpr` foi limitado com base em `MAX_PIXEL_RATIO`, mantendo a renderização mais estável e eficiente em dispositivos menos potentes.

---

## 8. Performance

Este passo priorizou um custo de render racional:

- poucas luzes
- sombras moderadas
- geometria simples e eficiente
- poucos objetos 3D
- DPR controlado
- sem efeito pesado ou pós-processamento

A cena está em um bom ponto de equilíbrio para servir como fundação de evolução cinematográfica futura.

---

## 9. Cleanup

Como o componente cria uma cena WebGL e usa `useFrame`, a infraestrura foi pensada para evitar vazamentos óbvios. O canvas é controlado por React 3D e não deixa listeners externos pendurados.

---

## 10. Testes

Validação executada após a implementação:

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`

Os resultados foram verificados no terminal e o estado atual foi validado com a base existente do projeto.

---

## 11. Build

A compilação do projeto foi validada com o ambiente do draw arena habilitado quando necessário. A cena 3D base compila sem regressões de arquitetura.

---

## 12. Problemas encontrados

Os principais desafios desta etapa foram:

- manter a separação entre motor de sorteio e camada visual;
- preservar a lógica de render do controlador e do state machine;
- evitar um canvas excessivamente técnico ou genérico;
- manter a cena profissional sem introduzir efeitos desnecessários.

Todos esses pontos foram contornados mantendo o escopo da Etapa 5 focado em base 3D e composição.

---

## 13. Melhorias futuras

As evoluções esperadas para as próximas etapas incluem:

- câmera mais cinematográfica por estado
- grupos e bolas com leitura mais clara por equipe
- animação de revelação com timing real
- iluminação mais dramática e premium
- materiais refinados e mais expressivos
- HUD final integrado ao visual da arena

Esses itens continuam fora do escopo desta etapa e serão tratados em fases subsequentes.

---

## 14. Alterações no motor de sorteio

MOTOR DE SORTEIO ALTERADO: NÃO

A lógica do sorteio foi preservada intacta. A camada 3D apenas representa o resultado já gerado pelo motor puro.

---

## Conclusão

A Etapa 5 transformou o canvas técnico da Etapa 4 em uma cena 3D real, com urna, ambiente, iluminação, câmera, profundidade e parallax controlado. O resultado mantém a arquitetura correta do projeto e cria a fundação sólida para a próxima fase cinematográfica.

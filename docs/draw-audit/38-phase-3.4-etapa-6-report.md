# DRAW ARENA — ETAPA 6 WALKTHROUGH

## 1. Cinematografia implementada

A Etapa 6 elevou o Draw Arena de uma cena 3D estática para uma experiência de sorteio com ritmo, foco e relação clara entre resultado real e apresentação visual. A regra de arquitetura foi respeitada: a animação não inventa o resultado e o motor de sorteio continua sendo o único responsável pela lógica de negócio.

O fluxo passou a ser guiado pela sequência:

- `INTRO`
- `READY`
- `DRAWING`
- `REVEAL`
- `GROUP_UPDATE`
- `DRAWING`
- `COMPLETE`

A cena foi organizada para transmitir antecipação, tensão e confirmação sem transformar o processo em uma simulação artificial.

---

## 2. Sequência de animação

A coreografia implementada no canvas foi estruturada em torno de 4 momentos principais:

1. Estabelecimento da cena
2. Preparação da urna
3. Movimento de sorteio
4. Revelação da equipe e confirmação do grupo

A movimentação da câmera, a rotação da urna e a iluminação foram parametrizados pela fase atual do estado visual, respeitando a transição do `state machine`.

---

## 3. Estados utilizados

A máquina de estados da etapa continuou sendo a base da narrativa:

- `INTRO`: entrada visual
- `READY`: estabilidade e presença
- `DRAWING`: tensão da seleção e movimento da urna
- `REVEAL`: foco na equipe sorteada
- `GROUP_UPDATE`: confirmação do grupo e retorno da composição
- `COMPLETE`: conclusão da cerimônia

O que foi reforçado nesta etapa foi o vínculo entre estado visual e comportamento 3D, eliminando sequências mecânicas e tornando cada fase perceptivelmente distinta.

---

## 4. Eventos

Os eventos do estado visual continuaram orientando o processo, e a implementação trouxe uma lógica de sincronização mais explícita entre a máquina e a cena 3D. O sistema destaca a divisão correta:

- `START` → inicia a coreografia
- `INTRO_COMPLETE` → entrada concluída
- `DRAW_STARTED` → início do efeito visual de sorteio
- `DRAW_RESULT_READY` → próximo resultado real disponível para apresentação
- `REVEAL_COMPLETE` → revelação visual concluída
- `GROUP_UPDATE_COMPLETE` → grupo confirmado
- `DRAW_COMPLETE` → encerramento do fluxo

Esse padrão preserva a estabilidade da arquitetura já existente e evita a lógica “cronômetro sem significado”.

---

## 5. Câmeras

A câmera passou a variar por estado, com uma abordagem de framing mais cinematográfica:

- `ESTABLISHING` para a intro
- `DRAW` para a fase de sorteio
- `REVEAL` para a equipe destacada
- `GROUP` para confirmação do grupo

A câmera continua funcionando como ferramenta de narrativa e não como decoração. Isso cria uma sensação de profundidade e atenção ao evento principal, sem exagerar no movimento.

---

## 6. Animação da urna

A urna foi animada em função do estado atual:

- rotação mais intensa em `DRAWING`
- leve inclinação durante `REVEAL`
- estabilidade em `READY`
- presença mais forte em `GROUP_UPDATE`

Esse movimento foi aplicado de forma controlada para enfatizar a cerimônia sem transformar a urna em um elemento caótico ou visualmente cansativo.

---

## 7. Animação da bola

A bola do sorteio foi visualmente reforçada como centro da ação. Sua presença foi ligada ao estado:

- destaque durante o sorteio
- elevação ao entrar em foco
- reforço de iluminação durante a revelação
- redução de intensidade em momentos de retorno

A bola não representa o algoritmo; ela é apenas a representação visual do evento real que já ocorreu no domínio.

---

## 8. Revelação

A revelação recebeu um destaque explícito com foco de câmera e iluminação. O processo foi desenhado para tornar cada sorteio uma ação bem definida:

- entrada no foco
- destaque da equipe
- confirmação da apresentação
- retorno da arena para o próximo evento

A intenção foi que o usuário percebesse “o que caiu” e “o que isso significa” de forma imediata e clara.

---

## 9. Group Update

A confirmação do grupo foi integrada sem criar nova regra de negócio. O que foi feito foi mostrar visualmente o contexto em que a equipe foi revelada, promovendo entendimento do que acabou de acontecer.

A atualização visual funciona como fechamento do ato de revelação, não como reinterpretação do sorteio.

---

## 10. HUD

O HUD foi atualizado para deixar a comunicação mais clara:

- estado em linguagem contextual
- nome da equipe revelada com foco
- grupo atual em destaque
- progresso e contagem do sorteio
- controles de reprodução, avanço e fechamento

A leitura operacional continua em HTML/React, enquanto o 3D continua responsável por sensação de cerimônia e profundidade.

---

## 11. Acessibilidade

A etapa também preservou a sensibilidade à preferência de movimento reduzido. Quando a preferência for ativada, o parallax e os movimentos de câmera e iluminação sofrem redução. Isso garante que a experiência continue funcional e legível sem depender da performance visual.

---

## 12. Performance

A versão desta etapa foi projetada para evitar ruído de render e objetos excessivos:

- poucas luzes
- geometria simples
- movimentação vetorial de baixa complexidade
- parallax moderado
- DPR controlado
- nenhum loop sem necessidade

A ideia foi manter a cena elegante e responsiva, sem cair em efeitos improdutivos.

---

## 13. Cleanup

O componente de controller foi ajustado para evitar comportamentos repetidos em reabertura. O processo foi reforçado para evitar:

- duplicação de início do estado
- fechamento duplicado em `COMPLETE`
- animações persistindo após fechamento do modal

O fluxo de abertura/fechamento agora é mais seguro.

---

## 14. Testes

A validação da etapa foi executada com a suíte relevante do projeto:

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`
- `npm test -- --run src/test/drawService.test.ts`
- `npm run build`

Resultado verificado: a regressão do sorteio não ocorreu e os testes do motor continuam válidos.

---

## 15. Build

O projeto foi compilado com sucesso após a etapa. O build segue estável, com warnings existentes de chunk size e módulos externos que não bloqueiam o funcionamento da funcionalidade.

---

## 16. Problemas encontrados

Os principais desafios desta etapa foram:

- manter a coreografia sincronizada com o `state machine`
- não inventar resultado visual
- evitar excesso de movimento
- manter a narrativa clara e profissional
- preservar performance em desktop e mobile

A solução foi manter a animação sempre como expressão do estado real, não como geradora de resultados.

---

## 17. Melhorias futuras

Futuras evoluções podem incluir:

- sequência de bolas mais sofisticada
- iluminação por etapas de maior contraste
- foco formal por equipe e grupo
- refinamento do HUD final
- presets de câmera mais diferenciados por competição
- ajustes específicos de mobile para ritmo e proporção

Esses itens continuam sendo evoluções posteriores, sem comprometer a base atual.

---

## 18. Alterações no motor

MOTOR DE SORTEIO ALTERADO: NÃO

A lógica do sorteio, dados, regras, seed e persistência foram preservados. A Etapa 6 apenas agrega cinema ao resultado já calculado.

---

## Conclusão

A Etapa 6 transformou o Draw Arena em uma cerimônia visual de sorteio com direção clara, foco na equipe revelada e sincronização correta entre estado, animação e resultado real. O sistema continua fiel ao motor de sorteio, porém com muito mais presença, clareza e senso de evento esportivo.

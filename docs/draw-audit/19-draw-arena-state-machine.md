# 19 — Draw Arena State Machine

## Estados visuais
- `idle`: arena em repouso
- `preparing`: preparação da mistura
- `revealing`: equipe selecionada em destaque
- `moving`: caminho da equipe para o grupo
- `completed`: sorteio concluído

## Fluxo atual
1. A tela abre com a arena ativa.
2. A equipe da sequência é destacada.
3. O grupo correspondente recebe atenção visual.
4. A animação avança para a próxima equipe.
5. O progress bar indica avanço do sorteio.

## Observação
A state machine visual orienta apenas a apresentação. O resultado é sempre definido pelo motor.

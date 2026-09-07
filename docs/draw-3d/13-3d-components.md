# 13 — Componentes 3D e Apresentação

## Componentes principais
### `DrawScene3D`
Responsável pela arena, bolas, grupos, iluminação, HUD e sequência de revelação.

### `LiveDrawModal`
Abre a apresentação e entrega o resultado real da competição.

### `drawRevealSequence`
Cria a ordem de revelação das equipes a partir dos grupos calculados.

## Comportamento visual
- centro da cena: urna/arena central
- grupos em painéis laterais
- bolas com identidade visual por equipe
- destaque da equipe atual
- estados visuais com brilho e contraste moderados

## Manutenção
A apresentação foi construída de forma isolada do motor e pode ser evoluída sem tocar na regra de negócio.

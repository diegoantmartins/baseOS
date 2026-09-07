# 17 — Draw Arena Architecture

## Visão geral
A fase de apresentação do sorteio evoluiu para uma experiência visual de arena esportiva, mantendo a lógica do sorteio intacta.

## Principio de arquitetura
- `drawService.ts` continua sendo a fonte oficial do resultado.
- `DrawScene3D.tsx` apenas apresenta o resultado que já foi calculado.
- A sequência visual é derivada do resultado e não interfere em sua regra de negócio.

## Fluxo
1. Usuário configura sorteio.
2. `runDraw` calcula o `DrawResult`.
3. `DrawPage` abre a modal com o resultado real.
4. `LiveDrawModal` entrega o `DrawResult` para a cena.
5. `DrawScene3D` transforma o resultado em narrativa visual.

## Responsabilidades
### Draw engine
- distribuição
- seed
- grupos
- Berger
- resultados finais

### Presentation layer
- revelação da equipe
- movimentos de arena
- destaque da equipe selecionada
- progresso visual
- grupos e HUD

## Regra central
A animação consulta o resultado. Ela não escolhe, não decide, não recalcula.

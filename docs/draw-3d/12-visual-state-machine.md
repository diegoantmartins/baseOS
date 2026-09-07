# 12 — Máquina de Estados Visual do Sorteio

## Estados principais
- `idle`: aguardando início
- `running`: mistura e preparação da arena
- `revealing`: equipe atual sendo destacada
- `allocated`: equipe confirmada no grupo
- `completed`: sequência finalizada

## Sequência narrativa
1. Arena em repouso
2. Mistura das bolas
3. Destaque de uma equipe
4. Elaboração do túnel de luz
5. Revelação do nome e do grupo
6. Confirmação visual no painel do grupo
7. Retorno à visão geral
8. Próximo item

## Controle de UI
- Botão "Iniciar Sorteio"
- Botão "Sortear Próximo"
- Botão "Pular animação"
- Suporte a reduced motion

## Racional
A máquina visual não define o resultado. Ela apenas organiza a experiência de apresentação para o usuário.

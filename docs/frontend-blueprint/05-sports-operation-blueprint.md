# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 05. Operação Esportiva & Motor de Voleibol (Sports Operation Blueprint)

---

## 1. FLUXO OPERACIONAL DA MESA DO APONTADOR (LIVE SCORER DESK)

O módulo de mesa ao vivo (`src/components/match/LiveScorerDeskModal.tsx` e `MatchSheetInterface.tsx`) é o coração operacional do sistema durante os jogos. O redesign estabelece os seguintes padrões:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MESA DO APONTADOR — CABEÇALHO DO JOGO AO VIVO                                          │
│ Jogo #14 · Set 3 · Taça Brasil 2026 · Ginásio Poliesportivo (Quadra Central)           │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ EQUIPE A: VÔLEI CLUBE ALPHA               │ EQUIPE B: MINAS TÊNIS CLUBE                │
│ Sets Vencidos: [ 1 ] (25-22, 21-25)       │ Sets Vencidos: [ 1 ] (22-25, 25-21)        │
│ Placar do Set Atual:                      │ Placar do Set Atual:                       │
│ ┌───────────────────────────────────────┐ │ ┌────────────────────────────────────────┐ │
│ │                  21                   │ │ │                   19                   │ │
│ └───────────────────────────────────────┘ │ └────────────────────────────────────────┘ │
│ [ + Ponto ]              [ - Corrigir ]   │ [ + Ponto ]              [ - Corrigir ]    │
│ Tempos Pedidos: [ ● ] [ ○ ] (1 restante)  │ Tempos Pedidos: [ ● ] [ ● ] (0 restantes)  │
│ Sacador Ativo: #7 Lucas Silva (Posição 1) │ Sacador Ativo: #10 Bruno Rezende           │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│ CONTROLES DE QUADRA & SANÇÕES:                                                         │
│ [ ⏱ Pedir Tempo Técnico (30s) ] [ 🔄 Registrar Substituição ] [ 🟨 Cartão Amarelo/Vermelho ]│
│ [ 📄 Visualizar Súmula Oficial em PDF ]                        [ 🏁 Finalizar Partida ]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Regras de Usabilidade da Mesa de Quadra:
1. **Botões de Toque Amplos**: Botões de adição de ponto com altura de 56px (`h-14`) e largura de 100%, facilitando a marcação rápida por toque na beira da quadra.
2. **Prevenção de Cliques Acidentais**: O botão de decrementar ponto (`- Corrigir`) fica isolado em tamanho menor para evitar toques incorretos.
3. **Cronômetro de Tempo Técnico (Timeout Timer)**: Modal integrado com contagem regressiva sonora e visual de 30 segundos ao solicitar tempo.

---

## 2. REGRAS OFICIAIS DE CLASSIFICAÇÃO & DESEMPATE (FIVB / CBV)

O motor em `src/services/standingsService.ts` calcula a tabela com fidelidade estrita às regras internacionais:

```text
CRITÉRIOS DE DESEMPATE HIERÁRQUICOS (ORDEM OFICIAL):
1. Pontos na Tabela (FIVB/CBV):
   - Vitória por 3-0 ou 3-1: 3 pontos para o vencedor, 0 para o perdedor.
   - Vitória por 3-2: 2 pontos para o vencedor, 1 ponto para o perdedor.
   - Derrota por W.O.: 0 pontos com parciais fixadas em 0-25, 0-25, 0-25.
2. Número de Vitórias (V)
3. Confronto Direto (Head-to-head - aplicado quando o empate envolve exatamente 2 equipes)
4. Set Average / Razão de Sets (Sets Pró / Sets Contra com 4 casas decimais)
5. Points Average / Razão de Pontos (Pontos Pró / Pontos Contra com 4 casas decimais)
6. Saldo de Sets (Sets Pró - Sets Contra)
7. Saldo de Pontos (Pontos Pró - Pontos Contra)
8. Sorteio Determinístico / Moeda (Lottery)
```

---

## 3. REGRAS DE ELENCO & INSCRIÇÃO DE ATLETAS

As validações em `src/services/registrationService.ts` protegem a homologação das equipes:
- **Tamanho do Elenco**: Mínimo de 6 atletas e máximo de 14 a 18 atletas (conforme categoria de quadra ou praia).
- **Numeração de Camisa**: 1 a 99 obrigatória e estritamente única dentro da mesma equipe.
- **Capitão Único**: Exatamente 1 atleta designado como Capitão (`isCaptain: true`).
- **Líberos**: No máximo 2 atletas designados como Líberos (`isLibero: true`).
- **Bloqueio Automático por Prazo**: O link de inscrição é automaticamente bloqueado para edição após a data limite (`registrationDeadline`), permitindo apenas visualização.

---

## 4. ESCALAÇÃO TÁTICA EM QUADRA (`CourtLineupDnd`)

A ferramenta de posicionamento tático reproduz a meia-quadra oficial de voleibol com 6 posições de rodízio no sentido anti-horário:

```text
          REDE (ZONA DE ATAQUE)
  ┌──────────┬──────────┬──────────┐
  │ Posição 4│ Posição 3│ Posição 2│  (Ataque / Rede)
  ├──────────┼──────────┼──────────┤
  │ Posição 5│ Posição 6│ Posição 1│  (Fundo / P1 = Sacador)
  └──────────┴──────────┴──────────┘
```
- Os atletas são arrastados da lista de relacionados diretamente para as posições de 1 a 6.
- A posição 1 exibe um ícone indicativo de saque (`Volleyball`).

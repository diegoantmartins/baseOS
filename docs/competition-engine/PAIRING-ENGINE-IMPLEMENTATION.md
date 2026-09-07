# BaseOS — GenericPairingEngine: Implementação e Algoritmos

**Data:** 05/09/2026  
**Módulo:** `src/services/genericPairingEngine.ts`  
**Objetivo:** Detalhamento dos algoritmos matemáticos determinísticos de pareamento esportivo.

---

## 1. Estratégias Suportadas

O `GenericPairingEngine` é um motor puramente matemático e in-memory que consome uma lista de `ParticipantSlotState` e uma `PairingDefinition`, gerando uma lista de `MatchSlot`.

### 1.1 High-Low
Confronto entre os extremos da classificação ou semente:
- Entrada com $N$ participantes:
  - Jogo 1: $1 \times N$
  - Jogo 2: $2 \times (N-1)$
  - Jogo 3: $3 \times (N-2)$
  - ...
- Se $N$ for ímpar, insere uma folga (`BYE`) no lado B do último jogo.

#### Aplicação no Play-In de 12 Equipes:
Classificados do ranking geral do 5º ao 12º colocados:
- Jogo 1: 5º $\times$ 12º
- Jogo 2: 6º $\times$ 11º
- Jogo 3: 7º $\times$ 10º
- Jogo 4: 8º $\times$ 9º

---

### 1.2 Same-Position Cross
Cruzamento determinístico de mesma posição entre múltiplos grupos:
- Para 2 grupos (A e B) com classificados 1º e 2º:
  - Semi 1: 1ºA $\times$ 2ºB
  - Semi 2: 1ºB $\times$ 2ºA
- Para $G$ grupos: o 1º do grupo $i$ enfrenta o 2º do grupo $(i + 1) \pmod G$.

---

### 1.3 Seeded Bracket (Chave Olímpica Clássica)
Gera o emparelhamento clássico para potências de 2 (2, 4, 8, 16...), garantindo que as sementes 1 e 2 apenas possam se enfrentar na final:

```typescript
export function getSeededPairings(bracketSize: number): Array<[number, number]> {
  let size = 2;
  while (size < bracketSize) size *= 2;

  let rounds = [1, 2];
  while (rounds.length < size) {
    const nextRound: number[] = [];
    const currentSum = rounds.length * 2 + 1;
    for (const seed of rounds) {
      nextRound.push(seed);
      nextRound.push(currentSum - seed);
    }
    rounds = nextRound;
  }

  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < rounds.length; i += 2) {
    pairs.push([rounds[i], rounds[i + 1]]);
  }
  return pairs;
}
```

- Para tamanho 8:
  - Slot 1: [1, 8]
  - Slot 2: [4, 5]
  - Slot 3: [2, 7]
  - Slot 4: [3, 6]

---

### 1.4 Round Robin (Método do Círculo de Berger)
Gera todas as rodadas de turno único para um grupo de participantes.
- Fixa o participante `items[0]` e rotaciona ciclicamente os demais a cada rodada.
- Se a quantidade de equipes for ímpar, adiciona uma folga (`BYE`), de modo que em cada rodada uma equipe folgue, sem gerar partidas contra equipes fantasmas.

---

### 1.5 Custom
Emparelhamento declarativo configurado por lista explícita de cruzamentos (`customCrossings`).

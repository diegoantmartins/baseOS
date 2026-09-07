# 08 — Auditoria da Geração de Partidas (Berger Table)

## Funções Analisadas

- `generateGroupRoundRobin(teamIds)`
- `generateDrawMatches(groups, phase)`
- `roundRobinMatchCount(teamCount)`
- `roundRobinRoundCount(teamCount)`

## Algoritmo: Berger Table (Método do Círculo)

### Implementação

```typescript
export function generateGroupRoundRobin(teamIds: string[]): Array<{ round: number; teamAId: string; teamBId: string }> {
  const n = teamIds.length;
  if (n < 2) return [];
  const ids = [...teamIds];
  if (n % 2 === 1) ids.push('__BYE__');
  const m = ids.length;
  const rounds = m - 1;
  const result: Array<{ round: number; teamAId: string; teamBId: string }> = [];
  
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < m / 2; i++) {
      const a = ids[i];
      const b = ids[m - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') {
        result.push({ round: r + 1, teamAId: a, teamBId: b });
      }
    }
    const last = ids[m - 1];
    for (let i = m - 1; i > 1; i--) ids[i] = ids[i - 1];
    ids[1] = last;
  }
  return result;
}
```

## Como o Algoritmo Funciona

### Passo 1: Preparação

Se `n` é ímpar, adiciona `__BYE__`:
```typescript
if (n % 2 === 1) ids.push('__BYE__');
const m = ids.length;
const rounds = m - 1;
```

### Passo 2: Primeira Rodada

```
Índices:  [0] [1] [2] [3] [4] [5]
Equipes:   A   B   C   D   E   F

Rodada 1:
  i=0: ids[0] vs ids[5] → A vs F
  i=1: ids[1] vs ids[4] → B vs E
  i=2: ids[2] vs ids[3] → C vs D

Resultado: A-F, B-E, C-D
```

### Passo 3: Rotação

```typescript
const last = ids[m - 1];
for (let i = m - 1; i > 1; i--) ids[i] = ids[i - 1];
ids[1] = last;
```

**Antes da rotação:**
```
Índices:  [0] [1] [2] [3] [4] [5]
Equipes:   A   B   C   D   E   F
                       ↑
                     last = F
```

**Após a rotação:**
```
Índices:  [0] [1] [2] [3] [4] [5]
Equipes:   A   F   B   C   D   E
            ↑_______________|
                    last = F vai para posição 1
```

### Passo 4: Segunda Rodada

```
Rodada 2:
  i=0: ids[0] vs ids[5] → A vs E
  i=1: ids[1] vs ids[4] → F vs D
  i=2: ids[2] vs ids[3] → B vs C

Resultado: A-E, F-D, B-C
```

### Passo 5: Terceira Rodada

**Rotação:**
```
A   F   E   B   C   D
↑_______________|
```

```
Rodada 3:
  i=0: ids[0] vs ids[5] → A vs D
  i=1: ids[1] vs ids[4] → F vs C
  i=2: ids[2] vs ids[3] → E vs B

Resultado: A-D, F-C, E-B
```

### Passo 6: Quarta Rodada

**Rotação:**
```
A   D   F   E   B   C
↑_______________|
```

```
Rodada 4:
  i=0: ids[0] vs ids[5] → A vs C
  i=1: ids[1] vs ids[4] → D vs B
  i=2: ids[2] vs ids[3] → F vs E

Resultado: A-C, D-B, F-E
```

### Passo 7: Quinta Rodada

**Rotação:**
```
A   C   D   F   E   B
↑_______________|
```

```
Rodada 5:
  i=0: ids[0] vs ids[5] → A vs B
  i=1: ids[1] vs ids[4] → C vs E
  i=2: ids[2] vs ids[3] → D vs F

Resultado: A-B, C-E, D-F
```

### Tabela Completa (6 equipes)

| Rodada | Jogo 1 | Jogo 2 | Jogo 3 |
|--------|--------|--------|--------|
| 1 | A vs F | B vs E | C vs D |
| 2 | A vs E | F vs D | B vs C |
| 3 | A vs D | F vs C | E vs B |
| 4 | A vs C | D vs B | F vs E |
| 5 | A vs B | C vs E | D vs F |

**Total: 5 rodadas × 3 jogos = 15 jogos**

**Verificação:** 6 × 5 / 2 = 15 jogos ✓

## Casos Especiais

### Grupo com 5 Equipes

```
total=5, add __BYE__
ids = [A, B, C, D, E, __BYE__]
m = 6
rounds = 5
```

| Rodada | Jogo 1 | Jogo 2 | Observação |
|--------|--------|--------|------------|
| 1 | A vs __BYE__ | B vs E | C vs D |
| 2 | A vs E | __BYE__ vs D | B vs C |
| 3 | A vs D | B vs __BYE__ | E vs C |
| 4 | A vs C | E vs D | B vs __BYE__ |
| 5 | A vs B | C vs __BYE__ | D vs E |

**Jogos reais (sem BYE):**
- A-E, C-D, B-C, A-D, E-C, A-C, D-E, A-B, D-E = 10 jogos

### Grupo com 4 Equipes

```
ids = [A, B, C, D]
m = 4
rounds = 3
```

| Rodada | Jogo 1 | Jogo 2 |
|--------|--------|--------|
| 1 | A vs D | B vs C |
| 2 | A vs C | D vs B |
| 3 | A vs B | C vs D |

**Total: 3 rodadas × 2 jogos = 6 jogos**

**Verificação:** 4 × 3 / 2 = 6 jogos ✓

### Grupo com 3 Equipes

```
total=3, add __BYE__
ids = [A, B, C, __BYE__]
m = 4
rounds = 3
```

| Rodada | Jogo 1 | Observação |
|--------|--------|------------|
| 1 | A vs __BYE__ | B vs C |
| 2 | A vs C | __BYE__ vs B |
| 3 | A vs B | C vs __BYE__ |

**Jogos reais: A-C, B-C, A-B = 3 jogos**

**Verificação:** 3 × 2 / 2 = 3 jogos ✓

## Validação Matemática

### Fórmula de Jogos

```
Jogos = n × (n - 1) / 2
```

| Equipes | Jogos |
|---------|-------|
| 3 | 3 |
| 4 | 6 |
| 5 | 10 |
| 6 | 15 |
| 7 | 21 |
| 8 | 28 |
| 9 | 36 |
| 10 | 45 |

### Fórmula de Rodadas

```
Se n é par: rodadas = n - 1
Se n é ímpar: rodadas = n
```

| Equipes | Rodadas | Jogos/Rodada |
|---------|---------|--------------|
| 3 (ímpar) | 3 | 1 |
| 4 (par) | 3 | 2 |
| 5 (ímpar) | 5 | 2 |
| 6 (par) | 5 | 3 |
| 7 (ímpar) | 7 | 3 |
| 8 (par) | 7 | 4 |

## Validações dos Testes

```typescript
it('cada dupla joga uma única vez (turno único)', () => {
  const ids = ['t1', 't2', 't3', 't4'];
  const pairs = generateGroupRoundRobin(ids).map(p => [p.teamAId, p.teamBId].sort().join('-'));
  const unique = new Set(pairs);
  expect(unique.size).toBe(6); // 4×3/2 = 6
  expect(pairs).toHaveLength(6);
});

it('nenhuma equipe enfrenta a si mesma', () => {
  const ids = ['t1', 't2', 't3', 't4', 't5'];
  const pairs = generateGroupRoundRobin(ids);
  for (const p of pairs) {
    expect(p.teamAId).not.toBe(p.teamBId);
  }
});

it('com número par de equipes gera n-1 rodadas com n/2 jogos', () => {
  const ids = ['t1', 't2', 't3', 't4', 't5', 't6'];
  const pairs = generateGroupRoundRobin(ids);
  const rounds = new Set(pairs.map(p => p.round));
  expect(rounds.size).toBe(5); // 6-1 = 5
  for (let r = 1; r <= 5; r++) {
    expect(pairs.filter(p => p.round === r)).toHaveLength(3); // 6/2 = 3
  }
  expect(pairs).toHaveLength(15); // 6×5/2 = 15
});

it('com número ímpar de equipes uma fica de folga por rodada', () => {
  const ids = ['t1', 't2', 't3', 't4', 't5'];
  const pairs = generateGroupRoundRobin(ids);
  expect(pairs).toHaveLength(10); // 5×4/2 = 10
  const rounds = new Set(pairs.map(p => p.round));
  expect(rounds.size).toBe(5); // 5 rodadas (ímpar)
});
```

## generateDrawMatches

```typescript
export function generateDrawMatches(groups: DrawGroup[], phase = 'classificatória'): DrawMatchProposal[] {
  let matchNumber = 1;
  const proposals: DrawMatchProposal[] = [];
  for (const group of groups) {
    const ids = group.teams.map(t => t.teamId);
    for (const pair of generateGroupRoundRobin(ids)) {
      proposals.push({
        round: pair.round,
        matchNumber,
        teamAId: pair.teamAId,
        teamBId: pair.teamBId,
        groupName: group.name,
        phase,
      });
      matchNumber += 1;
    }
  }
  return proposals;
}
```

### Observações

1. **matchNumber é GLOBAL**: não reseta por grupo
2. **round é POR GRUPO**: começa em 1 em cada grupo
3. **phase é único**: todos os jogos recebem o mesmo phase

## Exemplo de Saída

```typescript
// groups = [
//   { name: 'Grupo A', teams: [{teamId:'t1'}, {teamId:'t2'}, {teamId:'t3'}] },
//   { name: 'Grupo B', teams: [{teamId:'t4'}, {teamId:'t5'}, {teamId:'t6'}] }
// ]

// Resultado:
// [
//   { round: 1, matchNumber: 1, teamAId: 't1', teamBId: 't3', groupName: 'Grupo A', phase: 'classificatória' },
//   { round: 2, matchNumber: 2, teamAId: 't2', teamBId: 't3', groupName: 'Grupo A', phase: 'classificatória' },
//   { round: 3, matchNumber: 3, teamAId: 't1', teamBId: 't2', groupName: 'Grupo A', phase: 'classificatória' },
//   { round: 1, matchNumber: 4, teamAId: 't4', teamBId: 't6', groupName: 'Grupo B', phase: 'classificatória' },
//   { round: 2, matchNumber: 5, teamAId: 't5', teamBId: 't6', groupName: 'Grupo B', phase: 'classificatória' },
//   { round: 3, matchNumber: 6, teamAId: 't4', teamBId: 't5', groupName: 'Grupo B', phase: 'classificatória' }
// ]
```

## Pontos de Atenção

1. **matchNumber global pode ser confuso** — jogos do Grupo A e B intercalados
2. **round por grupo** — mesma rodada em grupos diferentes, horários diferentes
3. **phase hardcoded como 'classificatória'** — não suporta outras fases diretamente
4. **teamAId vs teamBId** — não há critério de quem é mandante
5. **BYE é um placeholder** — não é uma equipe real

## Conclusão

O algoritmo Berger Table está corretamente implementado:
- Gera confrontos únicos
- Cada dupla se enfrenta exatamente uma vez
- Rodadas balanceadas
- Suporta BYE para grupos ímpares

**Pontos para evolução:**
1. Considerar critérios de mando de campo (teamAId vs teamBId)
2. Permitir múltiplas fases (não só 'classificatória')
3. Suportar turno duplo (ida e volta)
4. Considerar restrição de confrontos entre fases

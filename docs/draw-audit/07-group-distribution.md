# 07 — Auditoria da Distribuição de Grupos

## Função Principal: `distributeTeamsIntoGroups`

## Algoritmo de Balanceamento

### `buildBalancedCapacities(total, groupsCount)`

```typescript
function buildBalancedCapacities(total: number, groupsCount: number): number[] {
  const base = Math.floor(total / groupsCount);
  const extra = total % groupsCount;
  return Array.from({ length: groupsCount }, (_, i) => base + (i < extra ? 1 : 0));
}
```

**Lógica:**
- `base = floor(total / groupsCount)` — capacidade base
- `extra = total % groupsCount` — equipes excedentes
- Os primeiros `extra` grupos ganham +1 equipe

### Casos de Teste Mental

| Equipes | Grupos | Base | Extra | Distribuição |
|---------|--------|------|-------|--------------|
| 8 | 2 | 4 | 0 | [4, 4] |
| 8 | 3 | 2 | 2 | [3, 3, 2] |
| 8 | 4 | 2 | 0 | [2, 2, 2, 2] |
| 10 | 3 | 3 | 1 | [4, 3, 3] |
| 12 | 3 | 4 | 0 | [4, 4, 4] |
| 12 | 4 | 3 | 0 | [3, 3, 3, 3] |
| 14 | 4 | 3 | 2 | [4, 4, 3, 3] |
| 16 | 4 | 4 | 0 | [4, 4, 4, 4] |
| 17 | 4 | 4 | 1 | [5, 4, 4, 4] |
| 20 | 4 | 5 | 0 | [5, 5, 5, 5] |

### Validação Matemática

- Soma das capacidades = `base * n + extra = (total/n) * n + (total % n) = total` ✓
- Diferença máxima entre grupos = 1 ✓
- Quando `total % n == 0`, todos os grupos são iguais ✓

## Algoritmo de Distribuição

### Modo 'seeded' com Cabeças

```typescript
if (config.seedingMode === 'seeded') {
  head.forEach((entry, i) => {
    const g = i % groupsCountSafe;
    groups[g].teams.push(entry);
    capacity[g] -= 1;
  });
}
```

**Fluxo:**
1. Cabeças ordenadas por prioridade (headIds.indexOf)
2. Distribuídas via `i % n` (round-robin)
3. Capacidade decrementada

### Distribuição do Restante (ambos os modos)

```typescript
const shuffled = shuffle(rest, rand);
for (const entry of shuffled) {
  const candidates = capacity
    .map((space, i) => ({ i, space }))
    .filter(c => c.space > 0)
    .sort((a, b) => b.space - a.space || a.i - b.i);
  const chosen = candidates[0];
  if (!chosen) break;
  groups[chosen.i].teams.push(entry);
  capacity[chosen.i] -= 1;
}
```

**Algoritmo Guloso:**
1. Embaralha equipes restantes (Fisher-Yates com mulberry32)
2. Para cada equipe:
   - Filtra grupos com vagas
   - Ordena por: capacidade (desc), índice (asc)
   - Escolhe o primeiro (mais vagas, menor índice)
   - Decrementa capacidade

### Normalização Final

```typescript
return groups.map(g => ({ ...g, teams: g.teams.sort((a, b) => a.seed - b.seed) }));
```

- Cada grupo é reordenado por `seed` (menor primeiro)

## Análise de Casos Específicos

### Caso 1: 8 equipes / 2 grupos

```
total=8, groupsCount=2
base=4, extra=0
capacity = [4, 4]

Sem cabeças (modo random):
shuffled = [E5, E2, E8, E1, E6, E3, E7, E4]

Iteração:
E5: cand = [(A,4), (B,4)] → A (i=0, empate por índice)
E2: cand = [(A,3), (B,4)] → B (i=1, mais vagas)
E8: cand = [(A,3), (B,3)] → A (i=0, empate)
E1: cand = [(A,2), (B,3)] → B
E6: cand = [(A,2), (B,2)] → A
E3: cand = [(A,1), (B,2)] → B
E7: cand = [(A,1), (B,1)] → A
E4: cand = [(A,0), (B,1)] → B

Resultado:
Grupo A: [E5, E8, E6, E7] → ordenado por seed → varia
Grupo B: [E2, E1, E3, E4] → ordenado por seed → varia
```

### Caso 2: 10 equipes / 3 grupos

```
total=10, groupsCount=3
base=3, extra=1
capacity = [4, 3, 3]

Sem cabeças:
shuffled = [E1, E2, E3, E4, E5, E6, E7, E8, E9, E10]

Iteração:
E1: cap=[4,3,3] → A (4 vagas)
E2: cap=[3,3,3] → A (3 vagas, mas empate com B,C, A tem menor índice)
E3: cap=[2,3,3] → B (3 vagas)
E4: cap=[2,2,3] → C (3 vagas)
E5: cap=[2,2,2] → A (2 vagas, menor índice)
E6: cap=[1,2,2] → B (2 vagas, menor índice que C)
E7: cap=[1,1,2] → C
E8: cap=[1,1,1] → A
E9: cap=[0,1,1] → B
E10: cap=[0,0,1] → C

Resultado:
Grupo A: 4 equipes [E1, E2, E5, E8]
Grupo B: 3 equipes [E3, E6, E9]
Grupo C: 3 equipes [E4, E7, E10]
```

### Caso 3: 14 equipes / 4 grupos

```
total=14, groupsCount=4
base=3, extra=2
capacity = [4, 4, 3, 3]

Sem cabeças:
shuffled = [E1..E14]

Iteração (resumida):
E1..E4: A,B,C,D (primeiro mais vagas, depois A,B,C,D por índice)
E5: cap=[3,3,2,2] → A (3 vagas, menor índice)
E6: cap=[2,3,2,2] → B
E7: cap=[2,2,2,2] → A (empate, menor índice)
E8: cap=[1,2,2,2] → B
E9: cap=[1,1,2,2] → C
E10: cap=[1,1,1,2] → D
E11: cap=[1,1,1,1] → A
E12: cap=[0,1,1,1] → B
E13: cap=[0,0,1,1] → C
E14: cap=[0,0,0,1] → D

Resultado:
Grupo A: 4 equipes [E1, E5, E7, E11]
Grupo B: 4 equipes [E2, E6, E8, E12]
Grupo C: 3 equipes [E3, E9, E13]
Grupo D: 3 equipes [E4, E10, E14]
```

### Caso 4: 16 equipes / 4 grupos

```
total=16, groupsCount=4
base=4, extra=0
capacity = [4, 4, 4, 4]

Sem cabeças:
shuffled = [E1..E16]

Iteração:
Cada round distribui uma equipe por grupo (round-robin via algoritmo guloso)

Resultado (aproximado):
Grupo A: 4 equipes
Grupo B: 4 equipes
Grupo C: 4 equipes
Grupo D: 4 equipes
```

### Caso 5: 17 equipes / 4 grupos

```
total=17, groupsCount=4
base=4, extra=1
capacity = [5, 4, 4, 4]

Sem cabeças:
shuffled = [E1..E17]

Iteração:
E1..E4: A,B,C,D (round-robin)
E5: cap=[4,3,3,3] → A
E6: cap=[3,3,3,3] → A
E7: cap=[2,3,3,3] → B
E8: cap=[2,2,3,3] → C
E9: cap=[2,2,2,3] → D
E10..E17: continua round-robin

Resultado:
Grupo A: 5 equipes
Grupo B: 4 equipes
Grupo C: 4 equipes
Grupo D: 4 equipes
```

## Comportamento com Cabeças de Chave

### Exemplo: 8 equipes / 2 grupos, headSeeds=['t1', 't2']

```
total=8, groupsCount=2
base=4, extra=0
capacity = [4, 4]

Modo seeded:
head = [t1, t2] (ordenado por prioridade)
head.forEach:
  t1 (i=0) → grupo A, cap[A]=3
  t2 (i=1) → grupo B, cap[B]=3

rest = [t3, t4, t5, t6, t7, t8]
shuffled = [t5, t3, t7, t4, t8, t6]

Iteração:
t5: cap=[3,3] → A
t3: cap=[2,3] → B
t7: cap=[2,2] → A
t4: cap=[1,2] → B
t8: cap=[1,1] → A
t6: cap=[0,1] → B

Resultado:
Grupo A: [t1, t5, t7, t8] → 4 equipes (com t1 como cabeça)
Grupo B: [t2, t3, t4, t6] → 4 equipes (com t2 como cabeça)
```

## Casos Extremos

### groupsCount = 1

```typescript
// groupsCountSafe = 1
// capacity = [total]
// Todas equipes vão para grupo 0
```

### groupsCount = total (1 equipe por grupo)

```typescript
// Cada grupo recebe 1 equipe
// capacity = [1, 1, 1, ..., 1]
```

### groupsCount > total (clamped)

```typescript
// groupsCountSafe = Math.min(groupsCount, total) = total
// Capacidade calculada normalmente
```

### total = 0

```typescript
// if (total === 0) return [];
// Retorna array vazio
```

## Observações Importantes

1. **Balanceamento garantido**: Diferença máxima de 1 entre grupos
2. **Ordem determinística**: Com mesmo seed, mesma distribuição
3. **Reordenação por seed**: Após distribuição, grupos são reordenados por seed
4. **Sem critérios customizados**: Não há como priorizar grupos específicos
5. **Sem restrições**: Equipes não podem ser excluídas de grupos

## Resumo

| Aspecto | Comportamento |
|---------|---------------|
| Balanceamento | Garante diferença máxima de 1 |
| Algoritmo | Guloso por capacidade |
| Modo random | Embaralha todas equipes |
| Modo seeded | Heads primeiro, depois embaralha resto |
| Edge cases | Trata 0 equipes, groupsCount > total |
| Ordenação final | Por seed (não por sorteio) |

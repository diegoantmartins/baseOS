# 05 — Auditoria do Sorteio Aleatório (Random)

## Modo: `seedingMode: 'random'`

## Comportamento Atual

O modo `'random'` implementa o que pode ser chamado de "sorteio puro" ou "sorteio totalmente aleatório".

### Fluxo de Execução

```
runDraw(competition, teams, config { seedingMode: 'random', seed, headSeeds })
   ↓
distributeTeamsIntoGroups(entries, groupsCount, config)
   ↓
1. Separa entries em head (headSeeds) e rest
   ↓
2. MODO RANDOM: rest.push(...head)  ← cabeças entram no sorteio geral
   ↓
3. Embaralha TODO o array (shuffle com mulberry32)
   ↓
4. Distribui respeitando capacidade balanceada
   ↓
generateDrawMatches(groups)
```

### Código Relevante

```typescript
// drawService.ts:90-93
if (config.seedingMode === 'seeded') {
  // ... (não executa no random)
} else {
  // Sorteio puro: as cabeças de chave entram no sorteio geral.
  rest.push(...head);
}

// drawService.ts:95
const shuffled = shuffle(rest, rand);
```

## Análise Detalhada

### 1. Embaralhamento

O embaralhamento é feito com Fisher-Yates modificado usando o PRNG `mulberry32`:

```typescript
function shuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

**Características:**
- Algoritmo Fisher-Yates (Knuth shuffle)
- Usa PRNG determinístico (mulberry32)
- Complexidade O(n)
- **Cria cópia do array** (`[...items]`)

### 2. Distribuição

Após embaralhar, a distribuição é feita preenchendo grupos com mais vagas:

```typescript
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

**Algoritmo:**
1. Filtra grupos com `space > 0`
2. Ordena por: capacidade (desc) → índice (asc)
3. Pega o primeiro candidato (mais vagas, menor índice)
4. Adiciona a equipe
5. Decrementa capacidade

**Observação Importante:** A distribuição NÃO é puramente sequencial. Ela prioriza preencher grupos com mais vagas primeiro, o que pode ser considerado "balanceamento guloso".

### 3. Normalização Final

```typescript
return groups.map(g => ({ ...g, teams: g.teams.sort((a, b) => a.seed - b.seed) }));
```

Após a distribuição, os grupos são **reordenados por seed** dentro de cada grupo. Isso significa que a ordem visual final é por seed, não pela ordem de sorteio.

## COMPORTAMENTO ATUAL vs COMPORTAMENTO DESEJADO

### O que o produto DESEJA:

```
1. Todas as equipes são colocadas em uma ordem aleatória
2. Essa ordem é distribuída sequencialmente entre os grupos

Exemplo (4 grupos):
01 → A
02 → B
03 → C
04 → D
05 → A
06 → B
07 → C
08 → D
```

### O que o código FAZ:

```
1. Todas as equipes são embaralhadas (Fisher-Yates com mulberry32)
2. Distribuídas respeitando capacidade balanceada:
   - Algoritmo guloso preenche grupos com mais vagas primeiro
   - NÃO é distribuição sequencial
   - Tende a balancear tamanhos (importante quando há resto)

Exemplo (8 equipes, 3 grupos, capacidade [3,3,2]):
shuffled = [E5, E2, E8, E1, E6, E3, E7, E4]
  E5 → Grupo A (cap [3,3,2]) → A.cap=3 é maior
  E2 → Grupo A (cap [2,3,2]) → A.cap=2 é igual a C.cap=2, mas A.index=0
  E8 → Grupo A (cap [1,3,2]) → B.cap=3 é maior
  E1 → Grupo B (cap [1,2,2]) → B.cap=2 é igual a C.cap=2, mas B.index=1
  E6 → Grupo B (cap [1,1,2]) → C.cap=2 é maior
  E3 → Grupo C (cap [1,1,1]) → A.cap=1, B.cap=1, C.cap=1 → A.index=0 wins
  E7 → Grupo B (cap [1,0,1]) → C.cap=1 maior
  E4 → Grupo C (cap [1,0,0]) → A.cap=1 maior

Resultado:
  Grupo A: [E5, E2, E3]
  Grupo B: [E8, E1, E7]
  Grupo C: [E6, E4]
```

### Divergências Identificadas

| Aspecto | Comportamento Atual | Comportamento Desejado |
|---------|---------------------|------------------------|
| Algoritmo de embaralhamento | Fisher-Yates com mulberry32 | (provavelmente similar) |
| Distribuição | Gulosa por capacidade máxima | Sequencial 1→A, 2→B, 3→C, 4→D, 5→A... |
| Balanceamento | Garante capacidade exata | Pode gerar grupos desiguais |
| Ordem visual | Ordenada por seed após sorteio | Ordem de sorteio |
| Cabeças (headSeeds) | Entram no sorteio geral (linha 92) | Provavelmente deveriam ser respeitadas |

## Análise de Comportamento de "Cabeças" no Modo Random

```typescript
// drawService.ts:90-93
} else {
  // Sorteio puro: as cabeças de chave entram no sorteio geral.
  rest.push(...head);
}
```

**Observação Crítica:** No modo random, as `headSeeds` **NÃO SÃO RESPEITADAS**. Elas são adicionadas ao pool geral e embaralhadas junto com as demais equipes.

**Implicação:** Se o usuário marcar equipes como cabeças de chave e selecionar modo random, essas marcações são ignoradas.

## Validações dos Testes

- ✓ "distribui as equipes de forma balanceada (2 grupos para 6 equipes)"
- ✓ "equipes com números ímpares deixa grupos com diferença de no máximo 1"
- ✓ "modo seeded sem cabeças de chave distribui tudo aleatoriamente e balanceado"
- ✓ "é determinístico: mesma semente gera o mesmo sorteio"
- ✓ "sementes diferentes geram sorteios diferentes (alta probabilidade)"

## Análise de Possíveis Problemas

### 1. Duplicidade de Equipes
- **Status:** IMPOSSÍVEL verificar diretamente pelos testes existentes
- **Análise:** Como o embaralhamento é uma permutação do array original e a distribuição move equipes únicas para grupos únicos, não há duplicidade

### 2. Equipes Ausentes
- **Status:** IMPOSSÍVEL verificar diretamente pelos testes existentes
- **Análise:** Mesma razão acima — todos os entries são distribuídos

### 3. Distribuição Desequilibrada
- **Status:** CORRETO — algoritmo garante balanceamento via capacidade

### 4. Comportamento com Poucas Equipes
- **Edge case:** `groupsCount > total` é clamped para `total`
- **Edge case:** `total === 0` retorna `[]`

## Determinismo

O modo random é **determinístico** quando o mesmo seed é usado:
- Teste confirma: "mesma semente gera o mesmo sorteio"
- Mas o usuário pode gerar um seed novo a qualquer momento (botão "Nova")

## Conclusão

O modo `'random'` implementa um sorteio **balanceado** mas **não sequencial**. A distribuição usa algoritmo guloso, o que difere do comportamento de "snake draft" ou "distribuição sequencial" mencionado no comentário do arquivo:

```typescript
// 2. Distribuição serpentina balanceada em grupos (modo 'seeded') ou
//    distribuição totalmente aleatória (modo 'random').
```

**Nota:** O comentário menciona "distribuição serpentina", mas a implementação atual não é serpentina. A distribuição é puramente aleatória com balanceamento por capacidade.

## Recomendações para FASE 2 (SEM IMPLEMENTAÇÃO)

1. **Clarificar o algoritmo desejado**: "sequencial" ou "balanceado"?
2. **Documentar o algoritmo implementado** com mais precisão
3. **Adicionar testes explícitos** para sequenciamento e ausência de duplicidade
4. **Considerar comportamento das cabeças** no modo random

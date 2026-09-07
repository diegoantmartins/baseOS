# 06 — Auditoria do Sorteio Dirigido (Seeded)

## Modo: `seedingMode: 'seeded'`

## Comportamento Atual

O modo `'seeded'` implementa o "sorteio dirigido" com cabeças de chave. É o modo padrão no estado inicial da DrawPage.

### Fluxo de Execução

```
runDraw(competition, teams, config { seedingMode: 'seeded', seed, headSeeds })
   ↓
distributeTeamsIntoGroups(entries, groupsCount, config)
   ↓
1. Separa entries em head (headSeeds) e rest
   ↓
2. Ordena heads por ordem de prioridade (headIds.indexOf)
   ↓
3. MODO SEEDED: heads.forEach → distribui uma por grupo (i % n)
   ↓
4. Decrementa capacidade dos grupos que receberam heads
   ↓
5. Embaralha rest com mulberry32
   ↓
6. Distribui rest respeitando capacidade restante
```

### Código Relevante

```typescript
// drawService.ts:74-89
const headIds = config.headSeeds ?? [];
const head: DrawTeamEntry[] = [];
const rest: DrawTeamEntry[] = [];
for (const entry of entries) {
  if (headIds.includes(entry.teamId)) head.push(entry);
  else rest.push(entry);
}
head.sort((a, b) => headIds.indexOf(a.teamId) - headIds.indexOf(b.teamId));

if (config.seedingMode === 'seeded') {
  // Cabeças de chave: uma por grupo (ordem de prioridade).
  head.forEach((entry, i) => {
    const g = i % groupsCountSafe;
    groups[g].teams.push(entry);
    capacity[g] -= 1;
  });
}
```

## Como as Cabeças São Escolhidas

### Na UI (DrawPage)

```typescript
// DrawPage.tsx:349-381
{seedingMode === 'seeded' && (
  <div>
    {registeredTeams.map(team => (
      <label>
        <Checkbox
          checked={headSeeds.includes(team.id)}
          onCheckedChange={checked => {
            setHeadSeeds(prev => {
              const next = checked
                ? [...prev, team.id]
                : prev.filter(id => id !== team.id);
              return next.slice(0, groupsCount);
            });
          }}
        />
        {team.name}
      </label>
    ))}
  </div>
)}
```

**Observações:**
- Checkboxes para cada equipe
- Limite: `groupsCount` cabeças
- A ordem na array `headSeeds` reflete a ordem de marcação
- **Não há indicação visual de prioridade** (1ª, 2ª, etc.)

## Quantas Cabeças Podem Existir

### Validação na UI
```typescript
return next.slice(0, groupsCount);
```
- Máximo: `groupsCount`
- Mínimo: 0

### Validação no Motor
**Nenhuma validação rígida** — o motor processa qualquer array `headSeeds`.

## Como as Cabeças São Associadas aos Grupos

### Algoritmo

```typescript
head.forEach((entry, i) => {
  const g = i % groupsCountSafe;
  groups[g].teams.push(entry);
  capacity[g] -= 1;
});
```

**Comportamento:**
- Cabeça 0 (head[0]) → Grupo 0 (A)
- Cabeça 1 (head[1]) → Grupo 1 (B)
- Cabeça 2 (head[2]) → Grupo 2 (C)
- ...
- Cabeça N → Grupo N % groupsCount

### Mapeamento Round-Robin

| Ordem da Cabeça | Grupo |
|------------------|-------|
| 1ª (priority 1) | Grupo A (i=0) |
| 2ª (priority 2) | Grupo B (i=1) |
| 3ª (priority 3) | Grupo C (i=2) |
| 4ª (priority 4) | Grupo D (i=3) |
| 5ª (priority 5) | Grupo A (i=0, 4%4=0) |

## Sistema Garante Uma Cabeça Por Grupo?

### Caso Normal (headSeeds.length === groupsCount)
- **SIM** — cada cabeça ocupa um grupo único
- Distribuição: 1ª → A, 2ª → B, 3ª → C, 4ª → D

### Menos Cabeças que Grupos (headSeeds.length < groupsCount)
- **SIM** — cabeças são distribuídas uma por grupo
- Grupos sem cabeça recebem equipes aleatórias

### Mais Cabeças que Grupos (headSeeds.length > groupsCount)
- **NÃO** — algoritmo usa `i % groupsCount`
- Cabeças excedentes **sobrescrevem** grupos já preenchidos
- Exemplo: 5 cabeças, 2 grupos
  - Cabeça 0 → Grupo A
  - Cabeça 1 → Grupo B
  - Cabeça 2 → Grupo A (sobrescreve)
  - Cabeça 3 → Grupo B (sobrescreve)
  - Cabeça 4 → Grupo A (sobrescreve)
- **Comportamento inesperado** — pode haver mais de uma cabeça por grupo

**Atenção:** A UI limita cabeças a `groupsCount`, mas o motor não tem essa proteção.

## Quais Grupos São Considerados Prioritários

**NENHUM** — a distribuição é puramente sequencial (0, 1, 2, 3...).

Não há conceito de "Grupo A é prioritário" ou "cabeça 1 deve ir para o grupo mais forte".

## Como os Demais Times São Sorteados

### Algoritmo

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

**Comportamento:**
1. Equipes restantes são embaralhadas com `mulberry32`
2. Cada equipe vai para o grupo com **mais vagas** disponíveis
3. Em caso de empate, menor índice tem prioridade

## Como o Equilíbrio é Calculado

**Antes da distribuição:**
- Capacidade = `[floor(total/n), floor(total/n), ...]` com resto distribuído
- Exemplo: 10 equipes, 3 grupos → `[4, 3, 3]`

**Após heads:**
- Capacidade é decrementada para grupos com cabeça
- Exemplo: 4 grupos, 1 cabeça em A → `[3, 4, 4, 4]`

**Após distribuição do resto:**
- Algoritmo guloso garante que capacidades sejam respeitadas

## Conflitos Identificados

### 1. headSeeds.length > groupsCount

**Cenário:** 6 cabeças marcadas, mas 4 grupos.

```typescript
// Teste mental
headSeeds = ['t1', 't2', 't3', 't4', 't5', 't6']
groupsCount = 4

// Iteração:
i=0, t1 → grupo 0
i=1, t2 → grupo 1
i=2, t3 → grupo 2
i=3, t4 → grupo 3
i=4, t5 → grupo 0  ← sobrescreve
i=5, t6 → grupo 1  ← sobrescreve

// Resultado:
// Grupo A: [t1, t5, ...] (2 cabeças)
// Grupo B: [t2, t6, ...] (2 cabeças)
// Grupo C: [t3, ...]
// Grupo D: [t4, ...]
```

**Comportamento:** Múltiplas cabeças no mesmo grupo.

### 2. headSeeds com IDs Inválidos

**Cenário:** `headSeeds = ['t99']` mas `entries` não contém `t99`.

**Comportamento:** 
- `head` array será vazio para esse ID
- A equipe simplesmente não é marcada como cabeça
- Silenciosamente ignorado

### 3. headSeeds Duplicados

**Cenário:** `headSeeds = ['t1', 't1']` (impossível pela UI, mas tecnicamente)

**Comportamento:** `Array.includes` trata como único, mas a iteração pode distribuir duas vezes.

## Validações dos Testes

- ✓ "modo seeded: cabeças de chave ficam uma por grupo" (com 2 cabeças e 2 grupos)

```typescript
const groups = distributeTeamsIntoGroups(entries, 2, {
  seedingMode: 'seeded',
  seed: 99,
  headSeeds: ['team-1', 'team-2'],
});
expect(groups[0].teams.some(t => t.teamId === 'team-1')).toBe(true);
expect(groups[0].teams.some(t => t.teamId === 'team-2')).toBe(false);
expect(groups[1].teams.some(t => t.teamId === 'team-2')).toBe(true);
expect(groups[1].teams.some(t => t.teamId === 'team-1')).toBe(false);
```

## Resumo do Comportamento

| Cenário | Comportamento |
|---------|---------------|
| heads.length === groupsCount | Distribuição 1-para-1 |
| heads.length < groupsCount | Primeiros N grupos têm cabeça, demais sem |
| heads.length > groupsCount | Round-robin `i % n` (sobrescreve) |
| heads contém IDs inválidos | Silenciosamente ignorados |
| heads duplicados | Possível duplicidade na distribuição |
| Modo seeded + 0 cabeças | Equivale a modo random |

## Ordem das Equipes nos Grupos

Após distribuição, os grupos são **reordenados por seed**:

```typescript
return groups.map(g => ({ ...g, teams: g.teams.sort((a, b) => a.seed - b.seed) }));
```

**Implicação:** A ordem visual final é por seed, não pela ordem em que foram sorteadas. Isso pode confundir o usuário durante drag-and-drop.

## Conclusão

O modo seeded implementa:
- Distribuição round-robin de cabeças
- Embaralhamento determinístico do restante
- Balanceamento por capacidade

**Pontos fracos identificados:**
1. Sem proteção contra heads > groupsCount
2. Sem validação de IDs de cabeças
3. Sem indicação visual de prioridade
4. Algoritmo de distribuição do restante é guloso, não sequencial
5. Reordenação por seed pode confundir durante drag-and-drop

## Recomendações para FASE 2

1. Adicionar validação explícita de `headSeeds.length <= groupsCount`
2. Considerar modo de distribuição alternativo (sequencial)
3. Documentar claramente o algoritmo no código
4. Considerar testes para casos extremos (heads > groupsCount, IDs inválidos)

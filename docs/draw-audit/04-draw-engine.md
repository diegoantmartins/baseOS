# 04 — Auditoria do Motor de Sorteio (Draw Engine)

## Arquivo: `src/services/drawService.ts` (194 linhas)

## Visão Geral

O `drawService.ts` é o motor puro de lógica de sorteio. Não possui dependências de UI, apenas de tipos. Implementa três algoritmos principais:

1. **PRNG determinístico** (mulberry32)
2. **Distribuição balanceada em grupos** (serpentina)
3. **Geração de tabela de jogos** (Berger Table)

## Função 1: `mulberry32(seed)`

### Assinatura
```typescript
export function mulberry32(seed: number): () => number
```

### Descrição
PRNG (Pseudo-Random Number Generator) determinístico de 32 bits. Implementação do algoritmo **mulberry32**.

### Comportamento
```typescript
let a = seed >>> 0;
return () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
```

### Características
- **Determinístico**: mesmo seed → mesma sequência
- **32 bits de estado**
- **Saída**: float [0, 1)
- **Período**: 2^32

### Validação pelos Testes
- Teste 1: "mesmo seed produz a mesma sequência" ✓
- Teste 2: "produz valores entre 0 e 1" ✓

---

## Função 2: `groupNameForIndex(index)`

### Assinatura
```typescript
export function groupNameForIndex(index: number): string
```

### Descrição
Gera nome de grupo em sequência alfabética (A, B, C...).

### Comportamento
```typescript
const letter = String.fromCharCode(65 + index);
return `Grupo ${letter}`;
```

### Mapeamento
- 0 → "Grupo A"
- 1 → "Grupo B"
- 2 → "Grupo C"
- 25 → "Grupo Z"

**Atenção:** Não suporta mais de 26 grupos (limite do alfabeto).

---

## Função 3: `shuffle<T>(items, rand)`

### Assinatura
```typescript
function shuffle<T>(items: T[], rand: () => number): T[]
```

### Descrição
Embaralhamento Fisher-Yates usando PRNG customizado.

### Comportamento
```typescript
const arr = [...items];
for (let i = arr.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
return arr;
```

### Características
- Cria cópia (não muta original)
- Complexidade O(n)
- Usa PRNG passado como parâmetro (não `Math.random`)

---

## Função 4: `buildBalancedCapacities(total, groupsCount)`

### Assinatura
```typescript
function buildBalancedCapacities(total: number, groupsCount: number): number[]
```

### Descrição
Calcula quantas equipes cada grupo deve receber.

### Comportamento
```typescript
const base = Math.floor(total / groupsCount);
const extra = total % groupsCount;
return Array.from({ length: groupsCount }, (_, i) => base + (i < extra ? 1 : 0));
```

### Exemplos
| Equipes | Grupos | Distribuição |
|---------|--------|--------------|
| 8 | 2 | [4, 4] |
| 10 | 3 | [4, 3, 3] |
| 12 | 3 | [4, 4, 4] |
| 14 | 4 | [4, 4, 3, 3] |
| 16 | 4 | [4, 4, 4, 4] |
| 17 | 4 | [5, 4, 4, 4] |

---

## Função 5: `distributeTeamsIntoGroups(entries, groupsCount, config)`

### Assinatura
```typescript
export function distributeTeamsIntoGroups(
  entries: DrawTeamEntry[],
  groupsCount: number,
  config: Pick<DrawConfig, 'seedingMode' | 'seed' | 'headSeeds'>,
): DrawGroup[]
```

### Entrada
- `entries: DrawTeamEntry[]` — array de `{ teamId, seed }`
- `groupsCount: number` — número desejado de grupos
- `config.seedingMode: 'random' | 'seeded'` — modo de sorteio
- `config.seed: number` — semente do PRNG
- `config.headSeeds: string[]` — IDs das cabeças (modo seeded)

### Saída
- `DrawGroup[]` — array de `{ name, teams[] }`

### Comportamento

**Passo 1: Validação**
```typescript
if (total === 0) return [];
const groupsCountSafe = Math.max(1, Math.min(groupsCount, total));
```
- 0 equipes → retorna `[]`
- `groupsCount` é limitado entre 1 e `total`

**Passo 2: Inicialização**
- Cria `groupsCountSafe` grupos vazios
- Calcula `capacity` por grupo
- Inicializa PRNG com `mulberry32(config.seed >>> 0)`

**Passo 3: Separação de cabeças**
```typescript
for (const entry of entries) {
  if (headIds.includes(entry.teamId)) head.push(entry);
  else rest.push(entry);
}
head.sort((a, b) => headIds.indexOf(a.teamId) - headIds.indexOf(b.teamId));
```

**Passo 4: Modo 'seeded'**
```typescript
head.forEach((entry, i) => {
  const g = i % groupsCountSafe;
  groups[g].teams.push(entry);
  capacity[g] -= 1;
});
```
- Cabeças são distribuídas uma por grupo (round-robin)
- Se `headSeeds > groupsCount`, as cabeças excedentes sobrescrevem grupos (i % n)

**Passo 5: Modo 'random'**
```typescript
rest.push(...head); // cabeças entram no sorteio geral
```

**Passo 6: Distribuição do restante**
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

**Algoritmo de distribuição:**
- Ordena grupos por capacidade (descendente) e índice (ascendente)
- Sempre coloca no grupo com mais vagas disponíveis
- Em caso de empate, menor índice tem prioridade

**Passo 7: Normalização**
```typescript
return groups.map(g => ({ ...g, teams: g.teams.sort((a, b) => a.seed - b.seed) }));
```
- Ordena equipes dentro de cada grupo por seed

### Estado
**NÃO altera estado** — função pura.

### Randomização
- Determinística via `mulberry32`
- Modo random: todas as equipes embaralhadas
- Modo seeded: apenas as não-cabeças são embaralhadas

### Persistência
- **NÃO persiste** — função pura que retorna resultado

### Validação
- Apenas `total === 0`
- `groupsCount` clamped entre 1 e `total`
- Não valida se `headSeeds` são IDs válidos

### Erros
- **NÃO lança exceções** — comportamento defensivo com fallback

---

## Função 6: `generateGroupRoundRobin(teamIds)`

### Assinatura
```typescript
export function generateGroupRoundRobin(
  teamIds: string[]
): Array<{ round: number; teamAId: string; teamBId: string }>
```

### Entrada
- `teamIds: string[]` — IDs das equipes do grupo

### Saída
- Array de pares `{ round, teamAId, teamBId }`

### Comportamento

**Algoritmo Berger Table (Método do Círculo):**

1. Se `n < 2`, retorna `[]`
2. Se `n` é ímpar, adiciona `__BYE__`
3. Cria lista de `m` equipes (m = n ou n+1)
4. Para cada rodada (m-1 rodadas):
   - Emparelha extremos: `ids[i]` vs `ids[m-1-i]`
   - Ignora confrontos com `__BYE__`
5. Rotação: move o último elemento para posição 1

### Exemplo (4 equipes: A, B, C, D)

| Rodada | Jogos |
|--------|-------|
| 1 | A vs D, B vs C |
| 2 | A vs C, D vs B |
| 3 | A vs B, C vs D |

### Validação
- Grupos pares: `n-1` rodadas
- Grupos ímpares: `n` rodadas (com BYE)
- Total de jogos: `n*(n-1)/2`

---

## Função 7: `generateDrawMatches(groups, phase)`

### Assinatura
```typescript
export function generateDrawMatches(
  groups: DrawGroup[],
  phase = 'classificatória'
): DrawMatchProposal[]
```

### Entrada
- `groups: DrawGroup[]` — grupos sorteados
- `phase: string` — fase da competição (padrão: 'classificatória')

### Saída
- `DrawMatchProposal[]` — propostas de jogos

### Comportamento
```typescript
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
```

**Observações:**
- `matchNumber` é sequencial GLOBAL (não reseta por grupo)
- `phase` tem valor padrão `'classificatória'`
- Todos os jogos recebem o mesmo phase

---

## Função 8: `runDraw(competition, teams, config)`

### Assinatura
```typescript
export function runDraw(
  competition: CompetitionRecord,
  teams: TeamRecord[],
  config: DrawConfig
): DrawResult
```

### Entrada
- `competition: CompetitionRecord` — competição alvo
- `teams: TeamRecord[]` — equipes inscritas
- `config: DrawConfig` — configuração completa

### Saída
- `DrawResult` — resultado completo do sorteio

### Comportamento
```typescript
const entries: DrawTeamEntry[] = teams
  .map((team, index) => ({ teamId: team.id, seed: index + 1 }))
  .sort((a, b) => a.seed - b.seed);

const groups = distributeTeamsIntoGroups(entries, config.groupsCount, config);
const matches = generateDrawMatches(groups);

return {
  competitionId: competition.id,
  config: { ...config, headSeeds: [...config.headSeeds] },
  groups,
  matches,
};
```

### Observações
- Cria entries com `seed = index + 1` (baseado na ordem do array)
- Chama `distributeTeamsIntoGroups` e `generateDrawMatches`
- Retorna cópia defensiva do `config.headSeeds`

### Estado
**NÃO altera estado** — função pura.

### Persistência
- **NÃO persiste** — retorna apenas o resultado
- Quem persiste é o chamador (DrawPage.handleSaveDraw → dataAccess.saveDraw)

---

## Funções Auxiliares

### `roundRobinMatchCount(teamCount)`
```typescript
export function roundRobinMatchCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.floor((teamCount * (teamCount - 1)) / 2);
}
```

### `roundRobinRoundCount(teamCount)`
```typescript
export function roundRobinRoundCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}
```

## Resumo de Comportamento

| Aspecto | Implementação |
|---------|---------------|
| Aleatoriedade | PRNG mulberry32 determinístico |
| Persistência | Função pura (não persiste) |
| Validação | Mínima (apenas total === 0) |
| Erros | Defensiva (não lança exceções) |
| Mutabilidade | Não muta parâmetros |
| Performance | O(n) para distribuição |

## Pontos de Atenção

1. **Função pura**: Não acopla com persistência
2. **Sem validação de headSeeds duplicados ou inválidos**
3. **Não suporta restrições** (ex: equipes que não podem estar no mesmo grupo)
4. **Sem critérios customizados** (região, ranking, etc.)
5. **matchNumber é global**, não por grupo
6. **Sem geração de horários** — apenas IDs de equipes

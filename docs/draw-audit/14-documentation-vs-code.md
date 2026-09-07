# 14 — Documentação × Código: Análise de Divergências

## Comparação entre Documentação e Implementação Real

## Tabela de Comparação

| Item | Documentação (Código/Comentário) | Código Real | Divergência |
|------|--------------------------------|-------------|-------------|
| **Random Mode** | "distribuição totalmente aleatória" | Fisher-Yates com mulberry32 + distribuição gulosa | ⚠️ Parcial |
| **Seeded Mode** | "sorteio dirigido — cabeças de chave ficam uma por grupo" | Cabeças distribuídas via `i % groupsCount` | ✓ Correto |
| **Seed** | "semente numérica para um sorteio determinístico e reproduzível" | mulberry32(seed) → mesmo seed = mesma sequência | ✓ Correto |
| **Cabeças de Chave** | "IDs das equipes cabeças de chave, em ordem de prioridade" | Array de IDs, ordem = prioridade | ✓ Correto |
| **Distribuição** | "distribuição serpentina balanceada em grupos" | Distribuição gulosa por capacidade | ❌ **Divergente** |
| **Berger** | "método do círculo (Berger table)" | Berger Table implementado corretamente | ✓ Correto |
| **Persistência** | "um sorteio por competição" | Unique index em competition_id | ✓ Correto |
| **Drag-and-drop** | Não documentado no draw.ts | Implementado na DrawPage | ℹ️ Complementar |
| **LiveDrawModal** | Não documentado no draw.ts | Implementado em separado | ℹ️ Complementar |
| **Modo de distribuição** | "serpentina balanceada" | Gulos por capacidade máxima | ❌ **Divergente** |
| **headSeeds no random** | Não mencionado | São adicionadas ao pool geral (ignora) | ℹ️ Não documentado |

## Detalhamento das Divergências

### 1. "Distribuição Serpentina Balanceada" vs Implementação Real

**Documentação em `drawService.ts`:**
```typescript
// 2. Distribuição serpentina balanceada em grupos (modo 'seeded') ou
//    distribuição totalmente aleatória (modo 'random').
```

**Implementação Real:**
```typescript
const candidates = capacity
  .map((space, i) => ({ i, space }))
  .filter(c => c.space > 0)
  .sort((a, b) => b.space - a.space || a.i - b.i);
const chosen = candidates[0];
```

**Divergência:**
- O comentário menciona "serpentina" (distribuição alternada A, B, C, D, A, B, C, D)
- A implementação usa algoritmo guloso (sempre escolhe grupo com mais vagas)
- A implementação é "balanceada" mas NÃO é "serpentina"

**Exemplo de Diferença:**

```
Desejado (serpentina - 8 equipes, 4 grupos):
Posição 1: E1→A, E2→B, E3→C, E4→D
Posição 2: E5→D, E6→C, E7→B, E8→A

Implementado (guloso - 8 equipes, 4 grupos):
Resultado depende da ordem do shuffle, não há padrão fixo
```

**Impacto:** Baixo — o algoritmo é funcional, mas o nome está incorreto.

---

### 2. headSeeds no Modo Random

**Documentação em `types/draw.ts`:**
```typescript
export type DrawConfig = {
  /** 'random' = sorteio puro; 'seeded' = sorteio dirigido com cabeças de chave. */
  seedingMode: DrawSeedingMode;
  /** IDs das equipes cabeças de chave, em ordem de prioridade (1ª = mais forte). */
  headSeeds: string[];
};
```

**Implementação Real:**
```typescript
if (config.seedingMode === 'seeded') {
  // Cabeças de chave: uma por grupo
} else {
  // Sorteio puro: as cabeças de chave entram no sorteio geral.
  rest.push(...head);
}
```

**Divergência:**
- Documentação sugere que `headSeeds` é relevante para ambos os modos
- Código ignora `headSeeds` no modo random (adiciona ao pool geral)
- Se usuário selecionar modo random após marcar cabeças, elas são simplesmente ignoradas

**Impacto:** Médio — Usuário pode ficar confuso ao marcar cabeças e selecionar random.

---

### 3. Termos Usados

| Termo na Documentação | Significado Técnico Real |
|----------------------|--------------------------|
| "Sorteio puro" | Fisher-Yates + distribuição gulosa |
| "Sorteio dirigido" | Heads primeiro, depois Fisher-Yates no resto |
| "Cabeças de chave" | IDs em array, ordem = prioridade |
| "Semente" | Input para PRNG mulberry32 |
| "Distribuição serpentina" | Gulos com prioridade por capacidade |

---

## Documentação Existente vs Código

### Onde Está Documentado

| Arquivo | Tipo de Documentação |
|---------|---------------------|
| `src/types/draw.ts` | Tipos TypeScript + JSDoc |
| `src/services/drawService.ts` | Header de arquivo + JSDoc em funções |
| `src/data/helpArticles.ts` | Artigos de ajuda para usuários |

### O Que Está Documentado

**Em `types/draw.ts`:**
```typescript
export type DrawSeedingMode = 'random' | 'seeded';
export type DrawConfig = {
  groupsCount: number;
  seedingMode: DrawSeedingMode;
  seed: number;
  headSeeds: string[];
};
export type DrawGroup = { name: string; teams: DrawTeamEntry[]; };
export type DrawMatchProposal = { round, matchNumber, teamAId, teamBId, groupName, phase };
```

**Em `drawService.ts`:**
```typescript
// Motor de sorteio do VolleyPro.
//
// Algoritmos:
//  1. PRNG determinístico (mulberry32) — mesmo seed, mesmo sorteio.
//  2. Distribuição serpentina balanceada em grupos (modo 'seeded') ou
//     distribuição totalmente aleatória (modo 'random').
//  3. Tabela de jogos pelo método do círculo (Berger table): turno único,
//     todas as duplas se enfrentam uma vez.
```

### O Que NÃO Está Documentado

- ❌ Comportamento exato do algoritmo de distribuição
- ❌ O que acontece com headSeeds no modo random
- ❌ Limites e constraints (groupsCount, total de equipes)
- ❌ Edge cases (0 equipes, 1 equipe, etc.)
- ❌ Interação com drag-and-drop
- ❌ Persistência e lifecycle do draw

---

## Qualidade da Documentação

| Aspecto | Avaliação |
|---------|-----------|
| Tipos bem definidos | ✓ Bons — TypeScript explicita estrutura |
| JSDoc em funções | ✓ Básico — descreve propósito geral |
| Comentários no código | ⚠️ Parcial — alguns termos incorretos |
| Documentação de edge cases | ❌ Ausente |
| Documentação de interação | ❌ Ausente |
| Documentação de limites | ❌ Ausente |

---

## Recomendações para FASE 2

1. **Corrigir documentação do `drawService.ts`** — "serpentina" deve ser substituído por "gulosa por capacidade"
2. **Documentar headSeeds no modo random** — adicionar JSDoc ou注释 aclarando que são ignorados
3. **Adicionar seção de LIMITATIONS no código** — documentar restriçõesknown
4. **Criar documento ARCHITECTURE.md** — explicar design decisions
5. **Adicionar JSDoc para edge cases** — documentar comportamento com 0, 1, etc.

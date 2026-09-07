# 15 — Problemas Identificados e Riscos

## Classificação de Problemas

| Severidade | Definição |
|------------|-----------|
| **CRÍTICO** | Dano imediato a dados ou funcionalidade |
| **ALTO** | Perda de dados, integridade comprometida |
| **MÉDIO** | Comportamento inconsistente, confusão do usuário |
| **BAIXO** | Detalhes estéticos, melhoria de UX |
| **INFORMATIVO** | Informação, sem impacto direto |

---

## Problemas por Severidade

### CRÍTICOS (1)

| ID | Problema | Arquivo | Local | Causa | Impacto | Recomendação |
|----|----------|---------|-------|-------|---------|--------------|
| C1 | Falha parcial durante criação de jogos | DrawPage.tsx | 193-223 | Falta de transação entre saveDraw e createMatch | Estado draw salvo com jogos incompletos ou faltando | Envolver em transação ou validar pós-save |

---

### ALTOS (2)

| ID | Problema | Arquivo | Local | Causa | Impacto | Recomendação |
|----|----------|---------|-------|-------|---------|--------------|
| A1 | Race condition no salvamento | DrawPage.tsx | 177-235 | Múltiplos cliques geram múltiplos saveDraw/salvos de jogos | Jogos duplicados, draw sobrescrito | Debounce, verificação de versão, ou lock |
| A2 | Não há proteção contra sorteio após início | dataAccess.ts, competitions.ts | Não implementado | Nenhum mecanismo de lock | Sorteio pode ser alterado após partidas começadas | Flag `drawLocked` ou `status` na competição |

---

### MÉDIOS (4)

| ID | Problema | Arquivo | Local | Causa | Impacto | Recomendação |
|----|----------|---------|-------|-------|---------|--------------|
| M1 | Nome "serpentina" é incorreto | drawService.ts | Comentário no header | Documentação confere com implementação gulosa | Confusão sobre algoritmo | Atualizar comentário para "gulosa por capacidade" |
| M2 | headSeeds ignorado no modo random | drawService.ts | Linha 90-93 | Código move heads para o pool geral | Usuário confuso ao marcar cabeças e usar random | Validar ou documentar behavior |
| M3 | Sem validação de headSeeds duplicados | drawService.ts | Linha 74-81 | Não verifica duplicatas | Possível comportamento inesperado | Validar ou warn |
| M4 | Sem histórico de movimentações drag | DrawPage.tsx | Estado preview | Drag-and-drop não salva histórico | Usuário não pode desfazer arraste | Adicionar histório no estado |

---

### BAIXOS (3)

| ID | Problema | Arquivo | Local | Causa | Impacto | Recomendação |
|----|----------|---------|-------|-------|---------|--------------|
| B1 | Horário de partidas artificial | DrawPage.tsx | 203 | Fórmula `hour = 9 + (i % 8)` | Falta considerar disponibilidade real | Sistema de agenda mais sophisticated |
| B2 | matchNumber global confuso | drawService.ts | Linha 141-157 | Número sequencial por toda fase | Usuário não vê agrupamento lógico | Pensar em refatorar |
| B3 | Sem tooltip para drag | DrawPage.tsx | DraggableTeamRow | UI minimalista | Usuário não sabe o que é dragável | Adicionar tooltip ou texto |

---

### INFORMATIVOS (3)

| ID | Observação | Arquivo | Detalhe |
|----|------------|---------|---------|
| I1 | Não há limite máximo de grupos | drawService.ts | `suggestGroupsCount` capping em UI, mas não no motor |
| I2 | Não há rate limiting | DrawPage.tsx | Botões podem ser clicados infinitamente |
| I3 | Sem audit log | dataAccess.ts | Não registra quem fez o que |

---

## Problemas Específicos do Sorteio

### Problema: Distribuição Não Serpentina

**Descrição:** Comentário no código afirma "distribuição serpentina", mas implementação é gulosa.

**Local:** `src/services/drawService.ts:5-8`

**Código Comentário:**
```typescript
//  2. Distribuição serpentina balanceada em grupos (modo 'seeded') ou
//     distribuição totalmente aleatória (modo 'random').
```

**Código Real:**
```typescript
const candidates = capacity
  .map((space, i) => ({ i, space }))
  .filter(c => c.space > 0)
  .sort((a, b) => b.space - a.space || a.i - b.i);
const chosen = candidates[0];
```

**Impacto:** Semântico — o comportamento funciona, mas é diferente do descrito.

---

### Problema: headSeeds no Modo Random

**Descrição:** Usuário pode marcar cabeças e selecionar modo random, mas cabeças são ignoradas.

**Local:** `src/services/drawService.ts:83-93`

**Fluxo:**
1. Usuário marca t1, t2 como cabeças
2. Seleciona modo "random"
3. Sorteio executado
4. Resultado: cabeças distribuídas aleatoriamente como qualquer outra equipe

**Impacto:** Experiência do usuário — confusão.

---

### Problema: Seed Determinístico, mas Não Versionado

**Descrição:** O seed é usado para reprodutibilidade, mas não há versionamento do algoritmo.

**Local:** `src/services/drawService.ts:19-28`

**Risco:** Se o algoritmo mudar (ex: refatoração), sorteios antigos não podem ser reproduzidos.

---

## Matriz de Riscos

| Área | Probabilidade | Impacto | Risco |
|------|---------------|---------|-------|
| Sorteio duplicado | Médio | Alto | Alto |
| Estado inconsistente | Baixo | Crítico | Alto |
| Concorrência | Baixo | Alto | Médio |
| cabeça de chave ignorada | Alto | Médio | Médio |
| Horário artificial | N/A | Baixo | Baixo |

---

## Resumo Final

| Severidade | Quantidade |
|------------|------------|
| Crítico | 1 |
| Alto | 2 |
| Médio | 4 |
| Baixo | 3 |
| Informativo | 3 |
| **Total** | **13** |

**Prioridade de Trabalho para FASE 2:**
1. CRÍTICO: Transacionalidade no save
2. ALTOS: Lock de sorteio, evitar race conditions
3. MÉDIOS: Corrigir documentação, validar headSeeds

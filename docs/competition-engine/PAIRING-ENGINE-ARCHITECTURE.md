# Arquitetura do Motor de Emparelhamento — Pairing Engine (Fase 4.4 — Revisão Definitiva)

**Data:** 05/09/2026  
**Fase:** 4.4 — Ajustes Obrigatórios Pós-Auditoria  
**Status:** ARQUITETURA REVISADA E APROVADA  

---

## 1. Escopo e Limites Rigorosos do Pairing Engine

O **Pairing Engine** é um componente puramente matemático e funcional. Ele responde a uma única pergunta:
> *"Dada essa lista ordenada de participantes e essa configuração de emparelhamento, quais confrontos (`MatchSlot[]`) devem ser montados?"*

### O Que o Pairing Engine FAZ:
- **RECEBE:**
  1. `participants: ParticipantSlotState[]` (lista de participantes, resolvidos ou com referências pendentes);
  2. `config: PairingConfig` (especificação do método e opções de emparelhamento).
- **PRODUZ:**
  - `MatchSlot[]` (lista ordenada de slots de partida com identificadores estáveis, referências de mandante/visitante e posições na chave).

### O Que o Pairing Engine NÃO FAZ (Inegociável):
- ❌ **Não calcula vencedores ou perdedores;**
- ❌ **Não calcula tabelas de classificação ou critérios de desempate;**
- ❌ **Não altera o `CompetitionConfig`;**
- ❌ **Não realiza chamadas de I/O, API ou banco de dados;**
- ❌ **Não possui dependências de tela ou elementos visuais da UI.**

---

## 2. Métodos de Emparelhamento Suportados por Design

```typescript
export type PairingMethod =
  | 'high-low'            // Mais bem classificado contra menos bem classificado
  | 'same-position-cross' // Cruzamento entre mesmos níveis de grupos distintos
  | 'seeded-bracket'      // Chaveamento olímpico tradicional com sementes em lados opostos
  | 'round-robin'         // Todos contra todos (tabela de Berger em círculo)
  | 'custom';             // Pareamentos declarados explicitamente (apenas para casos especiais)
```

### 2.1. `high-low`
Para uma lista de $N$ participantes ($p_1, p_2 \dots p_N$) onde $N$ é par:
- $\text{Slot } 1: p_1 \times p_N$
- $\text{Slot } 2: p_2 \times p_{N-1}$
- $\dots$
- $\text{Slot } k: p_k \times p_{N - k + 1}$

### 2.2. `same-position-cross`
Para participantes oriundos de grupos distintos:
- Em 2 grupos: $1ºA \times 2ºB$ e $1ºB \times 2ºA$;
- Em 4 grupos: $1ºA \times 2ºB$, $1ºC \times 2ºD$, $1ºB \times 2ºA$, $1ºD \times 2ºC$.

### 2.3. `seeded-bracket`
Distribuição em árvore eliminatória de modo que os dois maiores seeds (Seed 1 e Seed 2) fiquem em ramos opostos da chave e só possam se enfrentar na Grande Final:
- Ramo Superior: $1 \times 8$, $4 \times 5$
- Ramo Inferior: $2 \times 7$, $3 \times 6$

---

## 3. Demonstração dos Cenários de Expressividade

### 3.1. Cenário 1: Torneio de 12 Equipes (4 Grupos $\times$ 3)
- **Origem dos Dados:** O `OverallStandingsEngine` consolidou o ranking geral de 1 a 12 usando a estratégia `by-group-position-first`.
- **Feed do Play-In:** Configurado com `rankRange: [5, 12]` (8 participantes: Seeds 5, 6, 7, 8, 9, 10, 11, 12).
- **Pairing Config:** `{ method: 'high-low' }`.
- **Execução Matemática do Pairing Engine:**
  - Confronto 1: Participante de Rank 5 $\times$ Participante de Rank 12
  - Confronto 2: Participante de Rank 6 $\times$ Participante de Rank 11
  - Confronto 3: Participante de Rank 7 $\times$ Participante de Rank 10
  - Confronto 4: Participante de Rank 8 $\times$ Participante de Rank 9

> **Ponto Crítico de Rigor:**  
> Os confrontos $5 \times 12$, $6 \times 11$, $7 \times 10$ e $8 \times 9$ **NÃO estão escritos no código**.  
> Eles surgem puramente da aplicação do algoritmo `high-low` sobre a lista de participantes provida pelo feed `[5, 12]`. Nunca existe um `if (rank === 5)`!

---

### 3.2. Cenário 2: Torneio de 6 Equipes (2 Grupos $\times$ 3)
- **Origem dos Dados:** 2 grupos de 3 equipes produzem ranking de 1 a 6.
  - Seeds 1 e 2: Campeões de grupo $\to$ Avanço direto para Semifinais (`rankRange: [1, 2]`);
  - Seeds 3 a 6: Segundos e terceiros colocados $\to$ Disputam Play-In (`rankRange: [3, 6]`).
- **Feed do Play-In:** 4 participantes (Seeds 3, 4, 5, 6).
- **Pairing Config:** `{ method: 'high-low' }`.
- **Execução Matemática do Pairing Engine:**
  - Confronto 1: Participante de Rank 3 $\times$ Participante de Rank 6
  - Confronto 2: Participante de Rank 4 $\times$ Participante de Rank 5
- **Limites e Consistência Matemática:**
  - O número de participantes no play-in é par ($N = 4$), produzindo 2 vencedores;
  - Os 2 vencedores do play-in somam-se aos 2 cabeças de chave com avanço direto, totalizando exatamente 4 semifinalistas ($2 + 2 = 4$);
  - As semifinais e final operam em potências de 2 puras. Nenhuma regra precisou ser inventada ou adaptada silenciosamente.

---

## 4. Idempotência e Determinismo Matemático

O Pairing Engine garante que:
$$\text{mesmos participantes} + \text{mesma configuração} \implies \text{mesmos confrontos idênticos}$$
- Não há ordenação dependente da ordem física em que o PostgreSQL retorna registros;
- Não há uso de `Math.random()` não semeado;
- Confrontos entre cabeças de chave preservam a posição clássica da chave sem alternâncias indesejadas.

---

## 5. DECISÕES ARQUITETURAIS APÓS REVISÃO

1. **Participante pendente não é equipe fictícia:** Nenhuma equipe falsa é inserida na base.
2. **MatchSlot é diferente de Match persistido:** O slot define o pareamento conceitual da chave.
3. **Stage possui identidade estável:** `stageId` único e auditável.
4. **Round possui identidade estável:** `roundId` único dentro do estágio.
5. **Progression utiliza referências declarativas:** Feeds e rotas apontam para `slotId`.
6. **Progression é um DAG validável:** Grafo direcionado acíclico testado contra ciclos.
7. **Competition Lifecycle é diferente de Stage Runtime:** Status macro e micro operam separadamente.
8. **`group_name` não deve carregar sozinho Stage/Round/Group:** Desacoplamento de conceitos.
9. **Pairing não decide vencedor:** Responsabilidade estrita de pareamento.
10. **Progression não recalcula resultado:** Consumo canônico de `CanonicalMatchResult`.
11. **BYE não é equipe:** É folga automática resolvida no chaveamento.
12. **Nenhum formato específico de campeonato será embutido:** Universalidade do motor.

# BaseOS — StageGraphEngine: Validação de DAG e Prevenção de Ciclos

**Data:** 05/09/2026  
**Módulo:** `src/services/stageGraphEngine.ts`  
**Objetivo:** Documentação do algoritmo de validação estrutural do Grafo de Estágios.

---

## 1. Topologia em Grafo Acíclico Dirigido (DAG)

As fases de uma competição esportiva formam naturalmente um DAG:
- Vértices: `StageDefinition`;
- Arestas direcionadas: Dependências explícitas (`dependsOnStageIds`), feeds de participantes inter-fases e rotas de progressão esportiva.

Para garantir a viabilidade esportiva, o sistema exige que o grafo seja estritamente acíclico.

---

## 2. Algoritmo de Detecção de Ciclos (3-Color DFS)

O `StageGraph.validate()` implementa o algoritmo canônico de coloração em 3 estados por Busca em Profundidade (DFS):

- `0` (UNVISITED): Vértice ainda não explorado;
- `1` (VISITING): Vértice atualmente na pilha de recursão atual;
- `2` (VISITED): Vértice e todos os seus descendentes já foram completamente explorados.

### Categorização dos Ciclos Detectados:

1. **Ciclo Direto (`DIRECT_CYCLE`)**:
   - Um estágio depende de si mesmo ($A \to A$).
   - Identificado quando o vértice atual reencontra a si mesmo na pilha com comprimento de ciclo igual a 1.

2. **Ciclo Indireto (`INDIRECT_CYCLE`)**:
   - Dois estágios com dependência circular mútua ($A \to B \to A$).
   - Comprimento do ciclo igual a 2.

3. **Ciclo Complexo (`COMPLEX_CYCLE`)**:
   - Cadeia circular de 3 ou mais fases ($A \to B \to C \to \dots \to A$).
   - Comprimento do ciclo maior que 2.

---

## 3. Validações Estruturais Adicionais

Além da aciclicidade, o validador inspeciona deterministicamente:

- **Unicidade de Identificadores**: Rejeita estágios com IDs duplicados (`DUPLICATE_STAGE_ID`) ou MatchSlots com IDs repetidos (`DUPLICATE_SLOT_ID`).
- **Existência de Alvos**:
  - Rejeita referências a estágios inexistentes (`STAGE_NOT_FOUND`);
  - Rejeita referências a rodadas inexistentes dentro de um estágio (`ROUND_NOT_FOUND`);
  - Rejeita rotas que apontam para slots inexistentes (`SLOT_NOT_FOUND`).
- **Conflito de Ocupação (`PROGRESSION_CONFLICT`)**:
  - Rejeita cenários onde duas rotas de origem distintas apontam para a mesma vaga (`targetSlotId` e `targetSide` idênticos). Exemplo: o vencedor do jogo 1 e o vencedor do jogo 2 direcionados simultaneamente para o lado A da semifinal 1.
- **Ordenação Topológica**:
  - Se o grafo for acíclico e válido, calcula a sequência linear de execução esportiva garantida (ex: `['groups', 'play-in', 'knockout']`).

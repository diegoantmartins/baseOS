# BaseOS — Auditoria de Chaves, Progressão e Grafo de Estágios (Fase 4.PRE)

**Arquivo Auditado:** `src/services/stageGraphEngine.ts`, `src/services/genericPairingEngine.ts`, `src/services/competitionBracketService.ts`, `src/services/competitionBracketViewModel.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Validador do Grafo de Estágios (`StageGraph`)

O motor de grafo avalia a topologia completa de estágios e conexões:
- **Ausência de Ciclos (DAG):** Comprova matematicamente que nenhum caminho direcionado retorne a um estágio precedente ($A \to B \to A$).
- **Detecção de Slots Órfãos:** Rejeita slots cujos predecessores não existam ou cujas rotas `onWinner` / `onLoser` apontem para identificadores inválidos.
- **Topological Sorting:** Ordena as fases em sequência lógica de execução (ex: `['fase-grupos', 'play-in', 'fase-final']`).

---

## 2. Motor de Emparelhamento Genérico (`GenericPairingEngine`)

Implementa estratégias puras de chaveamento eliminatório:
- `high-low`: O melhor colocado enfrenta o pior colocado ($1^\circ \times 8^\circ$, $2^\circ \times 7^\circ$).
- `same-position-cross`: Cruzamento de posições idênticas entre grupos ($1^\circ A \times 2^\circ B$, $1^\circ B \times 2^\circ A$).
- `seeded-bracket`: Chaveamento de potências de 2 com sementes isolando os favoritos em lados opostos da chave.
- `double-elimination`: Topologia completa de chaves de vencedores (Winners), perdedores (Losers) e Grande Final (Grand Final).

---

## 3. Integridade Esportiva da Eliminatória Dupla (`double-elimination`)

A auditoria matemática comprovou:
1. **Contagem de Partidas:** Uma chave com $N$ participantes gera exatamente $2N - 2$ partidas com Grand Final única:
   - 4 equipes $\to$ 6 partidas
   - 8 equipes $\to$ 14 partidas
   - 16 equipes $\to$ 30 partidas
2. **Prevenção de Rematch Imediato:** Em Losers R2, os perdedores de Winners sofrem inversão de chave (cross-pairing) para evitar re-encontro imediato com adversários já enfrentados na primeira rodada.
3. **Eliminação Natural:** Slots de Losers não possuem rota `onLoser` (`onLoser: undefined`), garantindo que a segunda derrota encerre definitivamente a participação esportiva da equipe sem labels artificiais no banco.
4. **Resolução de BYEs:** Equipes com folga avançam automaticamente pelo caminho `onWinner` sem geração de partidas fictícias ou cômputo de derrotas.

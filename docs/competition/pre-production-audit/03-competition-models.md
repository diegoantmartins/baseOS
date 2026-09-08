# BaseOS — Auditoria dos Modelos e Sistemas de Disputa (Fase 4.PRE)

**Arquivo Auditado:** `src/services/competitionTemplateService.ts`, `src/services/stageGraphEngine.ts`, `src/services/genericPairingEngine.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Catálogo Real de Templates Homologados

A chamada em tempo de execução a `CompetitionTemplateService.listTemplates()` retorna exatamente 5 modelos estruturais canônicos:

| ID do Template | Nome Oficial | Formato Macro | Categoria | Estágios Canônicos Gerados |
| :--- | :--- | :--- | :--- | :--- |
| `round-robin-standard` | Todos Contra Todos (Round Robin) | `round-robin` | `standard` | `fase-unica` |
| `groups-knockout-standard` | Fase de Grupos + Mata-Mata | `groups-knockout` | `standard` | `fase-grupos`, `mata-mata` |
| `groups-play-in-knockout-standard` | Grupos + Play-In + Mata-Mata (Voltz) | `groups-play-in-knockout` | `custom` | `fase-grupos`, `play-in`, `fase-final` |
| `knockout-pure-standard` | Eliminatória Direta (Mata-Mata Puro) | `knockout` | `standard` | `mata-mata` |
| `double-elimination-standard` | Eliminatória Dupla (Double Elimination) | `double-elimination` | `standard` | `stage-winners`, `stage-losers`, `stage-grand-final` |

---

## 2. Análise Estrutural por Modelo

### 1. Todos Contra Todos (`round-robin-standard`)
- **Estágio:** Estágio único (`fase-unica`).
- **Pareamento:** Turno único clássico via tabela de Berger / método do círculo.
- **Validação de Grafo:** Grafo de 1 nó trivialmente acíclico.

### 2. Fase de Grupos + Mata-Mata (`groups-knockout-standard`)
- **Estágios:** 2 estágios (`fase-grupos` -> `mata-mata`).
- **Progressão:** Os melhores colocados de cada grupo avançam diretamente para os slots da chave eliminatória (quartas ou semifinais).
- **Validação de Grafo:** DAG de 2 nós com ordem topológica `['fase-grupos', 'mata-mata']`.

### 3. Grupos + Play-In + Mata-Mata (`groups-play-in-knockout-standard` — Arquitetura VOLTZ)
- **Estágios:** 3 estágios (`fase-grupos` -> `play-in` -> `fase-final`).
- **Progressão Declarativa:**
  - Vagas Diretas: Posições 1 a 4 do ranking geral unificado avançam direto para as Quartas de Final (`fase-final`).
  - Vagas de Repescagem (Play-In): Posições 5 a 12 disputam a rodada preliminar de Play-In (4 partidas).
  - Vencedores do Play-In: Preenchem as 4 vagas remanescentes nas Quartas de Final da `fase-final`.
- **Validação de Grafo:** DAG de 3 nós sem ciclos, validado por `StageGraph.validate()`.

### 4. Eliminatória Direta (`knockout-pure-standard`)
- **Estágio:** Estágio único de mata-mata (`mata-mata`).
- **Pareamento:** Sementes clássicas de potência de 2 (`getSeededPairings`), com rota `onWinner` avançando e `onLoser: undefined` (eliminação simples direta).

### 5. Eliminatória Dupla (`double-elimination-standard`)
- **Estágios:** 3 estágios (`stage-winners`, `stage-losers`, `stage-grand-final`).
- **Capacidades Homologadas:** Suporte a 4, 8 e 16 equipes com número exato de $2N - 2$ partidas:
  - $N=4 \implies 3\text{ WB} + 2\text{ LB} + 1\text{ GF} = 6\text{ partidas}$.
  - $N=8 \implies 7\text{ WB} + 6\text{ LB} + 1\text{ GF} = 14\text{ partidas}$.
  - $N=16 \implies 15\text{ WB} + 14\text{ LB} + 1\text{ GF} = 30\text{ partidas}$.
- **Rotas de Perdedores:** Perdedores de Winners R1 caem para Losers R1; perdedores de Winners R2 sofrem cross-pairing / rematch avoidance em Losers R2.
- **Grand Final:** Confronto único entre o campeão invicto de Winners e o campeão de Losers.
- **Validação de Grafo:** Validação estrita de DAG comprovando ordem topológica `['stage-winners', 'stage-losers', 'stage-grand-final']`.

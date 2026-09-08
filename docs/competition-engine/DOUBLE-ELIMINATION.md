# Arquitetura de Domínio: Eliminatória Dupla (Double Elimination)

**BaseOS — Sistema de Gestão de Competições**  
**Fase:** 4.12-A — Domínio Canônico de Dupla Eliminação  
**Status:** Implementado, Validado e Homologado no Domínio  
**Data:** Setembro/2026  

---

## 1. Resumo Executivo

A Fase 4.12-A introduz o suporte canônico ao formato de **Eliminatória Dupla** (`double-elimination`) no motor de competições do BaseOS. A implementação expande a arquitetura existente (`CompetitionConfig`, `StageGraph`, `GenericPairingEngine`, `GenericProgressionEngine`, `MatchSlot`) **sem criar subsistemas paralelos, sem alterar o schema do PostgreSQL e sem introduzir novas tabelas**.

O sistema implementa o padrão oficial de chave de repescagem com **Grand Final em partida única (sem bracket reset)**, garantindo previsibilidade de calendário para eventos esportivos de vôlei de quadra e praia.

---

## 2. Identificadores Canônicos

| Propriedade | Identificador | Camada |
| :--- | :--- | :--- |
| **Tipo de Formato** | `double-elimination` | `CompetitionFormatType` (`src/types/competitionConfig.ts`) |
| **Preset de Template** | `double-elimination-standard` | `CompetitionTemplateService` (`src/services/competitionTemplateService.ts`) |
| **Estágio 1 (Winners)** | `stage-winners` | `StageDefinition` |
| **Estágio 2 (Losers)** | `stage-losers` | `StageDefinition` |
| **Estágio 3 (Final)** | `stage-grand-final` | `StageDefinition` |

---

## 3. Topologia e Fórmulas Matemáticas

Para uma chave de tamanho canônico $N$ (onde $N \in \{4, 8, 16\}$ potência de 2):

$$S_{\text{winners}} = N - 1$$
$$S_{\text{losers}} = N - 2$$
$$S_{\text{grand\_final}} = 1$$
$$S_{\text{total}} = (N - 1) + (N - 2) + 1 = 2N - 2$$

### Matriz de Dimensões por Chave

| Equipes ($N$) | Winners Slots ($N-1$) | Losers Slots ($N-2$) | Grand Final Slots | Total de Partidas / Slots ($2N-2$) |
| :---: | :---: | :---: | :---: | :---: |
| **4** | 3 | 2 | 1 | **6** |
| **8** | 7 | 6 | 1 | **14** |
| **16** | 15 | 14 | 1 | **30** |

---

## 4. Estrutura de Estágios e Rodadas

O formato é estruturado em 3 estágios conectados via `StageGraph`:

```
┌─────────────────────────────────────────────────────────────┐
│                       WINNERS BRACKET                       │
│  [WB R1: Quartas] ──> [WB R2: Semis] ──> [WB R3: Final WB]  │
└───────┬──────────────────────┬──────────────────────┬───────┘
        │                      │                      │
        │ onLoser              │ onLoser              │ onLoser
        ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       LOSERS BRACKET                        │
│  [LB R1] ───────────> [LB R2] ──> [LB R3] ──> [LB R4: Final]│
└─────────────────────────────────────────────────────┬───────┘
                                                      │ onWinner
        ┌─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                         GRAND FINAL                         │
│             [Campeão WB  vs  Campeão LB]                    │
└─────────────────────────────────────────────────────────────┘
```

### Grafo Acíclico Dirigido (DAG)
O `StageGraph.validate()` confirma a ausência de ciclos e a ordem topológica rigorosa:
$$\text{Topological Order} = [\text{"stage-winners"}, \text{"stage-losers"}, \text{"stage-grand-final"}]$$

---

## 5. Política de Rematch e Cruzamento (Cross-Pairing)

Para evitar que equipes que se enfrentaram nas primeiras rodadas do Winners Bracket se reencontrem imediatamente ao cair na repescagem, o `GenericPairingEngine.pairDoubleElimination` aplica uma regra de cruzamento em Losers R2:

- **Losers R1**: Perdedores da R1 de Winners se enfrentam.
- **Losers R2**: Os perdedores das Semifinais de Winners caem na repescagem cruzados com a metade oposta da chave:
  - O perdedor de `WB-R2-M1` (chave superior) é encaminhado para `LB-R2-M2`.
  - O perdedor de `WB-R2-M2` (chave inferior) é encaminhado para `LB-R2-M1`.

Essa geometria garante equidade esportiva e diversidade de confrontos na chave de repescagem.

---

## 6. Semântica de Eliminação Esportiva

A eliminação de uma equipe no BaseOS é estritamente regida pela presença ou ausência de rotas de progressão no slot:

1. **Primeira Derrota (no Winners Bracket)**:
   - O slot de Winners possui `progressionRoute.onLoser` definido.
   - A equipe perdedora avança automaticamente para o slot e lado designados no Losers Bracket.
2. **Segunda Derrota (no Losers Bracket)**:
   - Os slots de Losers **não possuem rota de perdedor** (`progressionRoute.onLoser: undefined`).
   - O `GenericProgressionEngine.evaluate` não direciona o perdedor para nenhum slot destino.
   - O participante tem sua trajetória esportiva encerrada.
3. **Ausência de Rótulos Hardcoded**:
   - Não são gravados rótulos estáticos de posição como "3º Lugar" ou "4º Lugar" nos slots. A eliminação é um estado esportivo natural (`eliminated` por ausência de progressão), deixando classificações finais para a camada de cálculo de standings/ranking.

---

## 7. Prova Matemática de Conservação de Vidas

Em qualquer chave de 8 equipes disputada até o fim:

- **Total de partidas**: 14
- **Total de derrotas geradas**: 14 (exatamente 1 derrota por partida completada)
- **Cenário A (Campeão Invicto de Winners)**:
  - Campeão: 0 derrotas
  - Vice-campeão (perdeu na WB e na GF): 2 derrotas
  - Demais 6 participantes: 2 derrotas
  - Total: $0 + 7 \times 2 = 14$ derrotas.
- **Cenário B (Campeão vindo dos Losers)**:
  - Campeão (perdeu na WB, venceu LB e GF): 1 derrota
  - Vice-campeão (venceu WB invicto, perdeu na GF única): 1 derrota
  - Demais 6 participantes: 2 derrotas
  - Total: $2 \times 1 + 6 \times 2 = 14$ derrotas.

Em todos os casos:
- Nenhuma equipe é eliminada com apenas 1 derrota.
- Nenhuma equipe permanece ativa após sofrer 2 derrotas.
- Cada participante possui no máximo 2 caminhos de derrota.

---

## 8. Tratamento de BYEs

Quando o número de equipes confirmadas for menor que o tamanho da chave ($N$):
- As vagas não preenchidas são preenchidas com slots do tipo `BYE` (`isBye: true`).
- O `GenericProgressionEngine` detecta automaticamente confrontos contra BYE e avança a equipe real para a próxima rodada do Winners Bracket com **zero derrotas registradas**.
- Nenhum perdedor artificial é direcionado para a Losers Bracket decorrente de um BYE.

---

## 9. Compatibilidade de Sets

O template `double-elimination-standard` respeita integralmente o parâmetro `setsToWin`:
- `setsToWin: 2` (Melhor de 3 sets — padrão de vôlei de praia e torneios rápidos).
- `setsToWin: 3` (Melhor de 5 sets — padrão CBV / FIVB de vôlei de quadra).

---

## 10. Não-Regressão de Formatos Existentes

A introdução de `double-elimination` manteve 100% de compatibilidade e aprovação em todos os testes unitários e de integração dos formatos pré-existentes:
- `round-robin-standard` (Todos contra todos)
- `knockout-pure-standard` (Eliminatória simples pura)
- `groups-knockout-standard` (Grupos + Mata-Mata)
- `groups-play-in-knockout-standard` (Jornada Voltz com 4 grupos de 3, Play-In e Fase Final)
- Jornada Voltz com BYE (vagas parciais em Play-In).

---

## 11. Próximos Passos (Fase 4.12-B)

Na Fase 4.12-B serão implementados:
1. Adição da opção "Eliminatória Dupla" no seletor de sistemas de disputa em `CompetitionFormDialog.tsx`.
2. Materialização física de partidas (`matches`) a partir dos `MatchSlots` gerados.
3. Renderização visual do chaveamento de repescagem no `CompetitionBracketViewModel`.
4. Homologação completa ponta a ponta no ambiente local (`http://localhost:5173`).

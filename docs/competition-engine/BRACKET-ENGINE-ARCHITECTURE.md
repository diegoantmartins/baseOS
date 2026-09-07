# Arquitetura do Motor de Chaveamento — Bracket Engine, Match Slots & Byes (Fase 4.4 — Revisão Definitiva)

**Data:** 05/09/2026  
**Fase:** 4.4 — Ajustes Obrigatórios Pós-Auditoria  
**Status:** ARQUITETURA REVISADA E APROVADA  

---

## 1. A Distinção Essencial: `MatchSlot` vs `Match`

Um dos maiores avanços conceituais da Fase 4.4 é a separação inequívoca entre **Lugar na Chave (`MatchSlot`)** e **Partida Operacional Persistida (`MatchRecord`)**:

```text
CONCEITO DE DOMÍNIO (MatchSlot)               ENTIDADE OPERACIONAL (MatchRecord)
--------------------------------              -----------------------------------
- Lugar e intenção esportiva                  - Registro no banco de dados
- Exemplo: QF-01 (Lado 1 vs Lado 2)           - Agendamento: Ginásio Municipal, 14:00
- Participante A: 1º Grupo A                  - Equipe A: Team ID 47 ("Vôlei Osasco")
- Participante B: Vencedor Play-In 1          - Equipe B: Team ID 52 ("Sesc RJ")
- Pode existir antes dos times serem          - Exige participantes resolvidos para
  conhecidos                                    ser disputada e gerar súmula
```

### O Que o `MatchSlot` Representa:
```typescript
export interface MatchSlot {
  slotId: string;                     // Identificador estável (ex: "slot-stage-qf-1")
  stageId: string;                    // Estágio pai
  roundId: string;                    // Rodada pai
  slotIndex: number;                  // Posição ordinal na rodada
  label: string;                      // Rótulo legível (ex: "Quartas de Final 1")
  participantA: ParticipantSlotState; // Referência ou time resolvido do lado A
  participantB: ParticipantSlotState; // Referência ou time resolvido do lado B
  progressionRoute?: ProgressionRoute;// Para onde vão vencedor e perdedor
  matchRecordId?: string | null;      // Vinculação à partida física (quando gerada)
}
```

---

## 2. A Hierarquia Universal: `Stage -> Round -> MatchSlot`

Em vez de lógicas duras para `Quarterfinal`, `Semifinal` e `Final`, o motor opera sobre uma hierarquia genérica de 3 níveis:

```text
Stage (id: "stage-knockout", type: "knockout")
  │
  ├── Round 1 (id: "round-qf", order: 1, label: "Quartas de Final")
  │     ├── MatchSlot (id: "slot-qf-1")
  │     ├── MatchSlot (id: "slot-qf-2")
  │     ├── MatchSlot (id: "slot-qf-3")
  │     └── MatchSlot (id: "slot-qf-4")
  │
  ├── Round 2 (id: "round-sf", order: 2, label: "Semifinais")
  │     ├── MatchSlot (id: "slot-sf-1")
  │     └── MatchSlot (id: "slot-sf-2")
  │
  └── Round 3 (id: "round-fn", order: 3, label: "Finais")
        ├── MatchSlot (id: "slot-fn-1", label: "Disputa de 3º Lugar")
        └── MatchSlot (id: "slot-fn-2", label: "Grande Final")
```

- Nomes como *"Quartas de Final"* ou *"Grande Final"* são puramente **metadados visuais de rotulagem (`round.label`)** para súmulas em PDF e telas do portal;
- O algoritmo matemático do `BracketEngine` processa exclusivamente `stageId`, `round.order` e `slot.slotIndex`.

---

## 3. Desacoplamento Conceitual de `group_name`

A auditoria identificou que a coluna `matches.group_name` estava sobrecarregada, armazenando tanto o nome do grupo em fases classificatórias (`"Grupo A"`) quanto o rótulo da partida em playoffs (`"Quartas 1"`).

O novo design estabelece a separação de responsabilidades:

| Contexto Esportivo | `stage` | `round` | `group` | `slotLabel` |
| :--- | :--- | :--- | :--- | :--- |
| **Fase Classificatória** | `'group-stage'` | `'round-robin'` | `'Grupo A'` | `"Rodada 1 - Jogo 1"` |
| **Play-In / Repescagem** | `'play-in'` | `'round-1'` | `null` | `"Play-In 1 (5º x 12º)"` |
| **Quartas de Final** | `'knockout'` | `'quarterfinals'` | `null` | `"Quartas 1"` |
| **Semifinais** | `'knockout'` | `'semifinals'` | `null` | `"Semifinal 1"` |
| **Disputa de 3º Lugar** | `'knockout'` | `'finals'` | `null` | `"Disputa de 3º Lugar"` |

*Nota:* O banco de dados não será alterado na Fase 4.4. O `StageEngine` faz essa separação em memória na camada de domínio.

---

## 4. Formalização Canônica do BYE (Folga Regulamentar)

### Regras Absolutas:
1. **BYE NÃO É UMA EQUIPE:** Não existe registro com nome "BYE" na tabela `teams`;
2. **NÃO CRIAR PARTIDAS FANTASMAS:** O sistema **nunca** gera no banco de dados um `MatchRecord` do tipo `Equipe A × BYE` com placar fictício (ex: 25-0 / 25-0);
3. **AVANÇO AUTOMÁTICO IMEDIATO:**  
   Quando um confronto na chave eliminatória possui:
   $$\text{Participante A} = \text{Equipe Real}, \quad \text{Participante B} = \text{BYE}$$
   O `BracketEngine` resolve o confronto imediatamente:
   - A Equipe A é declarada qualificada por avanço automático;
   - O `ProgressionEngine` encaminha a Equipe A para o slot de destino na rodada seguinte;
   - Nenhuma partida operacional é agendada para aquela rodada.

---

## 5. DECISÕES ARQUITETURAIS APÓS REVISÃO

1. **Participante pendente não é equipe fictícia:** Proibido cadastrar times falsos no banco.
2. **MatchSlot é diferente de Match persistido:** Slot é conceito do domínio; Match é entidade de agendamento/súmula.
3. **Stage possui identidade estável:** `stageId` único em todo o ciclo de vida.
4. **Round possui identidade estável:** `roundId` único dentro do estágio.
5. **Progression utiliza referências declarativas:** Feeds e rotas apontam para `targetSlotId`.
6. **Progression é um DAG validável:** Grafo direcionado acíclico testado contra ciclos.
7. **Competition Lifecycle é diferente de Stage Runtime:** Status macro e micro operam separadamente.
8. **`group_name` não deve carregar sozinho Stage/Round/Group:** Desacoplamento de conceitos.
9. **Pairing não decide vencedor:** Emparelhamento apenas monta confrontos.
10. **Progression não recalcula resultado:** Consumo canônico de `CanonicalMatchResult`.
11. **BYE não é equipe:** É folga automática resolvida no chaveamento.
12. **Nenhum formato específico de campeonato será embutido:** Universalidade do motor.

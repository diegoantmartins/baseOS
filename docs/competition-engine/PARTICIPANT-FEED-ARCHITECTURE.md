# Arquitetura do Motor de Alimentação de Participantes — Participant Feed Engine (Fase 4.4 — Revisão Definitiva)

**Data:** 05/09/2026  
**Fase:** 4.4 — Ajustes Obrigatórios Pós-Auditoria  
**Status:** ARQUITETURA REVISADA E APROVADA  

---

## 1. O Que É um Participant Feed?

Um **Participant Feed (Alimentador de Participantes)** é uma especificação declarativa que define a origem e a regra de seleção dos competidores que ingressam em um estágio, rodada ou slot de partida.

Ele substitui o antigo código imperativo acoplado (ex: `find(g => g.groupName.includes('A'))`), permitindo que qualquer estágio declare formalmente de onde obtém suas equipes, sem que o código precise saber nomes de grupos, nomes de campeonatos ou condições duras como `if (rank === 5)`.

---

## 2. Separação Absoluta: `ParticipantReference` vs `ResolvedTeam`

### 2.1. O Antipadrão Eliminado
A auditoria identificou que o sistema anterior gerava strings como `TBD-A-1` ou `TBD-B-1` para preencher `matches.team_a_id` quando os times de fases finais ainda não eram conhecidos. No PostgreSQL/Supabase, isso causa **violação de chave estrangeira** (`foreign_key_violation`).

> **DECISÃO OBRIGATÓRIA:**  
> **NUNCA criar equipes fictícias (`TBD-A-1`, `Winner-QF1`, `BYE`, etc.) na tabela `teams`.**  
> A arquitetura separa conceitualmente a **REFERÊNCIA DE PARTICIPANTE** (`ParticipantReference`) da **EQUIPE RESOLVIDA** (`ResolvedTeam`).

### 2.2. Modelo Conceitual de Resolução

```text
MatchSlot
    │
    └── ParticipantSlot (A ou B)
            │
            ├── reference: ParticipantReference (declarativo)
            │      ├── resolved-team (time já conhecido)
            │      ├── winner-of-match (vencedor do jogo X)
            │      ├── loser-of-match (perdedor do jogo X)
            │      ├── group-position (colocado no grupo Y)
            │      ├── overall-ranking (posição no ranking geral)
            │      ├── stage-position (posição em estágio anterior)
            │      ├── seed (cabeça de chave)
            │      └── bye (folga regulamentar)
            │
            ├── resolvedTeam: TeamRecord | null
            │      ├── Se pendente: resolvedTeamId = null
            │      └── Se concluído: resolvedTeamId = 'team-47'
            │
            └── displayPlaceholder: string (Ex: "Vencedor Play-in 1", "1º Colocado Grupo A")
```

---

## 3. Catálogo Formal de Referências de Participantes

Para cada tipo suportado por design, a tabela abaixo estabelece as regras formais:

| Tipo de Referência | Origem dos Dados | Dados Necessários no Contrato | Momento de Resolução | Comportamento se Não Resolvido | Possibilidade de Invalidação Posterior |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`resolved-team`** | Inscrição confirmada direta | `teamId: string` | Imediato (no agendamento inicial) | Não ocorre (já resolvido) | Sim (apenas por desclassificação ou W.O. administrativo) |
| **`group-position`** | Tabela oficial do grupo no estágio indicado | `stageId: string`, `groupName: string` ou `groupIndex: number`, `position: number` | Conclusão e homologação de 100% das partidas daquele grupo | Retorna `resolvedTeamId: null`, exibe placeholder (ex: *"1º Grupo B"*) | Sim (se resultado de partida do grupo for retificado ou recalculado) |
| **`overall-ranking`** | Tabela consolidada intergrupos (`OverallStandingsEngine`) | `stageId: string`, `position?: number`, `rankRange?: [number, number]` | Conclusão e homologação de 100% de todos os grupos do estágio | Retorna `resolvedTeamId: null`, exibe placeholder (ex: *"5º Colocado Geral"*) | Sim (se resultado de qualquer grupo afetar pontuação ou desempate) |
| **`stage-position`** | Classificação final de um estágio antecedente | `stageId: string`, `position: number` | Conclusão formal do estágio antecedente (`stage.status === 'completed'`) | Retorna `resolvedTeamId: null`, exibe placeholder (ex: *"3º Lugar Fase 1"*) | Sim (se o estágio antecedente for reaberto) |
| **`match-winner`** | Resultado oficial de uma partida antecedente | `sourceStageId: string`, `matchSlotId: string` | Homologação da partida (`CanonicalMatchResult.isHomologated === true`) | Retorna `resolvedTeamId: null`, exibe placeholder (ex: *"Vencedor Jogo 4"*) | Sim (se a súmula da partida antecedente for desomologada para correção) |
| **`match-loser`** | Resultado oficial de uma partida antecedente (ex: 3º lugar) | `sourceStageId: string`, `matchSlotId: string` | Homologação da partida (`CanonicalMatchResult.isHomologated === true`) | Retorna `resolvedTeamId: null`, exibe placeholder (ex: *"Perdedor Semifinal 1"*) | Sim (se a súmula da partida antecedente for desomologada para correção) |
| **`seed`** | Chaveamento pré-definido / Sorteio | `seedNumber: number` | Imediato após a oficialização do sorteio | Retorna `resolvedTeamId: null` se sorteio pendente | Sim (se houver re-sorteio oficial antes do início dos jogos) |
| **`bye`** | Regulamento / Chave assimétrica | N/A | Imediato na instanciação da chave | **Não se resolve em equipe**. O adversário recebe avanço automático | Não (regra estrutural da chave) |

---

## 4. Contratos em TypeScript (Camada de Domínio Puro)

```typescript
/** Identificador discriminado de referência de participante */
export type ParticipantReference =
  | {
      type: 'resolved-team';
      teamId: string;
    }
  | {
      type: 'group-position';
      stageId: string;
      groupIndex?: number;
      groupName?: string;
      position: number;
    }
  | {
      type: 'overall-ranking';
      stageId: string;
      position?: number;
      rankRange?: [number, number];
      filter?: 'all' | 'group-winners-only' | 'group-runners-up-only' | 'non-winners';
    }
  | {
      type: 'stage-position';
      stageId: string;
      position: number;
    }
  | {
      type: 'match-winner';
      sourceStageId: string;
      targetSlotId: string;
    }
  | {
      type: 'match-loser';
      sourceStageId: string;
      targetSlotId: string;
    }
  | {
      type: 'seed';
      seedNumber: number;
    }
  | {
      type: 'bye';
    };

/** Estado em tempo de execução de um participante dentro de um MatchSlot */
export interface ParticipantSlotState {
  side: 'home' | 'away' | 'teamA' | 'teamB';
  reference: ParticipantReference;
  resolvedTeamId: string | null;
  resolvedTeamName: string | null;
  displayPlaceholder: string;
  isBye: boolean;
}
```

---

## 5. Resolução Funcional Pura e Determinística

A resolução é executada pelo `ParticipantFeedEngine.resolveParticipant(reference, context)`:
1. **Entradas:** A referência declarativa + o contexto esportivo (resultados canônicos homologados, tabelas e equipes registradas);
2. **Saída:** Objeto imutável `ParticipantSlotState`;
3. **Ausência de Efeitos Colaterais:** A função não faz chamadas de rede nem muta entidades externas.

---

## 6. DECISÕES ARQUITETURAIS APÓS REVISÃO

1. **Participante pendente não é equipe fictícia:** Fica proibida a inserção de `TBD-A-1`, `Winner-QF1` ou equivalentes na tabela `teams`.
2. **MatchSlot é diferente de Match persistido:** O slot representa a vaga na chave e a intenção esportiva; a partida operacional é a entidade que recebe equipes resolvidas.
3. **Stage possui identidade estável:** Todo estágio possui `stageId` estável e imutável.
4. **Round possui identidade estável:** Toda rodada possui `roundId` estável.
5. **Progression utiliza referências declarativas:** Feeds e progressões apontam para identidades de slots (`targetSlotId`), nunca para índices de array (`array[0]`).
6. **Progression é um DAG validável:** Não são permitidos ciclos de dependência entre estágios ou partidas.
7. **Competition Lifecycle é diferente de Stage Runtime:** O status global da competição (`in-progress`) não se confunde com o estado da fase (`ready`, `completed`).
8. **`group_name` não deve carregar sozinho Stage/Round/Group:** Separação conceitual entre fase, rodada e chave de grupo.
9. **Pairing não decide vencedor:** O emparelhamento apenas combina participantes em partidas.
10. **Progression não recalcula resultado:** O avanço consome exclusivamente o `CanonicalMatchResult`.
11. **BYE não é equipe:** É um estado estrutural da chave que aciona avanço automático imediato.
12. **Nenhum formato específico de campeonato será embutido:** A arquitetura interpreta declarações genéricas.

# BASEOS — PROPOSTA ARQUITETURAL: MOTOR DE FORMATOS E COMPETIÇÕES (FUTURO)

**Documento Técnico:** `docs/competition-engine/FUTURE-FORMAT-ENGINE-ARCHITECTURE.md`  
**Fase:** 4.1 (Auditoria Somente Leitura)  
**Status:** **PROPOSTA ARQUITETURAL DERIVADA DA AUDITORIA**

---

## 1. PRINCÍPIO FUNDAMENTAL DA EVOLUÇÃO

A auditoria da Fase 4.1 comprovou que o BaseOS possui um núcleo canônico de regras de partida, sets e pontuação muito sólido, mas sofre com **acoplamento estrutural na progressão e na representação de fases**.

O objetivo da arquitetura futura é permitir que o organizador configure qualquer competição — desde uma Copa Universitária simples até o Campeonato Voltz ou a Superliga — **sem escrever uma única linha de código condicional específica para um campeonato**.

$$\text{Zero Exceções no Código:} \quad \neg \exists (\text{if competition.name === "Voltz"})$$

---

## 2. DOMÍNIO MODULAR PROPOSTO

A arquitetura recomendada separa formalmente as responsabilidades esportivas em 8 blocos coesos e desacoplados:

```text
Competition (Agregado Raiz)
   │
   ├── CompetitionConfig (SSOT: Parâmetros Globais e Limites)
   │
   ├── CompetitionFormat (Definição da Jornada Esportiva Macro)
   │
   ├── Stages (Fases Sequenciais ou Paralelas)
   │    │
   │    ├── Stage 1: Fase Preliminar (Grupos Round-Robin)
   │    │     ├── StageConfig & StageRules
   │    │     ├── PairingRule: Round-Robin Berger
   │    │     └── Standings: Grupos A, B, C, D
   │    │
   │    ├── Stage 2: Repescagem / Play-in (Mata-mata Preliminar)
   │    │     ├── StageConfig & StageRules
   │    │     ├── FeedSource: Ranking 5–12 da Fase 1
   │    │     └── PairingRule: 5×12, 6×11, 7×10, 8×9
   │    │
   │    └── Stage 3: Fase Final (Playoffs / Quartas, Semis, Final)
   │          ├── StageConfig & StageRules
   │          ├── FeedSource A: Seeds 1–4 da Fase 1
   │          ├── FeedSource B: 4 Vencedores da Fase 2
   │          └── PairingRule: Cruzamento Oficial de Quartas
   │
   ├── MatchRules (Regras de Sets, Pontos e Vantagem da Partida)
   ├── ScoringRules (Pontos na Tabela por Vitória/Derrota/W.O.)
   ├── StandingsRules (Critérios e Ordem de Desempate da Fase)
   ├── PairingRules (Emparelhamentos e Chaveamentos Matemáticos)
   └── ProgressionRules (Regras de Transição e Promoção Entre Fases)
```

---

## 3. ESPECIFICAÇÃO DAS NOVAS ABSTRAÇÕES

### 3.1. `Stage` (Fase da Competição)
A entidade `Stage` substitui a dependência de strings soltas (`matches.phase`). Cada fase possui:
- `id`: Identificador único;
- `competitionId`: Vínculo à competição;
- `sequence`: Ordem de execução (1, 2, 3...);
- `name`: Rótulo legível (ex: "Fase de Grupos", "Repescagem", "Playoffs");
- `type`: `'round-robin' | 'single-elimination' | 'hybrid' | 'swiss'`;
- `status`: `'pending' | 'in-progress' | 'completed' | 'cancelled'`;
- `rulesOverride`: Sobrescritas de sets ou pontuação aplicáveis exclusivamente a esta fase;
- `tiebreakCriteria`: Critérios de desempate ordenáveis específicos da fase.

### 3.2. `PairingRule` (Motor de Emparelhamentos)
Responsável por gerar os confrontos matemáticos de forma puramente determinística:
- **Round-Robin Berger:** Gera todas as duplas em turno único ou turno/returno (ida e volta) com folgas calculadas para número ímpar.
- **Bracket by Seeds:** Gera confrontos a partir de ranking/sementes:
  - Padrão olímpico: $1 \times N, 2 \times (N-1)$, etc.
  - Padrão Voltz Repescagem: $5 \times 12, 6 \times 11, 7 \times 10, 8 \times 9$.
- **Custom Mapping:** Mapeamento explícito de cruzamento configurado pelo organizador.

### 3.3. `ProgressionRule` (Motor de Progressão e Transição)
Responsável por conectar o término de uma fase ao início da próxima:
- **`feedType`:**
  - `'group-position'`: Promove equipes por colocação no grupo (ex: 1º e 2º de cada grupo).
  - `'position-ranked'`: Coleta equipes de posições específicas de todos os grupos e gera um ranking geral unificado (ex: campeões de grupo geram ranking 1–4; 2º e 3º colocados geram ranking 5–12).
  - `'match-winner'`: Promove o vencedor canônico de uma partida eliminatória para alimentar uma vaga em confronto futuro.
  - `'match-loser'`: Promove o perdedor (ex: disputa de 3º lugar).
  - `'bye'`: Avança automaticamente a equipe que recebeu folga na chave.

---

## 4. COMO O FORMATO VOLTZ É REPRESENTADO NESSA ARQUITETURA

Sem criar nenhum código condicional, a competição Voltz é instanciada unicamente por configuração:

```json
{
  "competition": {
    "name": "Campeonato Voltz 2026",
    "modality": "indoor"
  },
  "config": {
    "format": {
      "defaultSetsToWin": 2,
      "setRules": { "regularSetPoints": 25, "tiebreakPoints": 15, "minAdvantage": 2 }
    },
    "scoring": {
      "systemType": "fivb-standard",
      "pointsWinClear": 3,
      "pointsWinNarrow": 2,
      "pointsLossNarrow": 1,
      "pointsLossClear": 0,
      "pointsWoWin": 3,
      "pointsWoLoss": 0
    },
    "registration": { "minAthletes": 6, "maxAthletes": 14 }
  },
  "stages": [
    {
      "id": "stage-1-grupos",
      "sequence": 1,
      "name": "Fase de Grupos",
      "type": "round-robin",
      "groupsCount": 4,
      "teamsPerGroup": 3,
      "pairingRule": "round-robin-single"
    },
    {
      "id": "stage-2-repescagem",
      "sequence": 2,
      "name": "Repescagem",
      "type": "single-elimination",
      "feed": {
        "sourceStageId": "stage-1-grupos",
        "filterPositions": [2, 3],
        "rankingMethod": "overall-standings",
        "seedRange": [5, 12]
      },
      "pairingRule": "inverted-bracket",
      "pairings": [
        { "seedA": 5, "seedB": 12 },
        { "seedA": 6, "seedB": 11 },
        { "seedA": 7, "seedB": 10 },
        { "seedA": 8, "seedB": 9 }
      ]
    },
    {
      "id": "stage-3-playoffs",
      "sequence": 3,
      "name": "Playoffs Finais",
      "type": "single-elimination",
      "feed": {
        "seeds1To4": {
          "sourceStageId": "stage-1-grupos",
          "filterPositions": [1],
          "rankingMethod": "overall-standings",
          "seedRange": [1, 4]
        },
        "seeds5To8": {
          "sourceStageId": "stage-2-repescagem",
          "matchWinners": true
        }
      },
      "pairingRule": "configured-crossings"
    }
  ]
}
```

---

## 5. COMO OUTROS FORMATOS SERÃO REPRESENTADOS

### 5.1. Pontos Corridos Puro (Turno Único ou Turno/Returno)
- `stages`: 1 única fase com `type: 'round-robin'`.
- `pairingRule`: `'round-robin-single'` ou `'round-robin-home-away'`.
- `progression`: Nenhuma próxima fase; o término da fase 1 homologa o 1º colocado diretamente como campeão oficial.

### 5.2. Mata-Mata Puro com Byes (ex: 10 Equipes em Chave de 16)
- `stages`: 1 única fase com `type: 'single-elimination'`.
- `bracketSize`: 16 vagas.
- `seeds`: 1 a 10 atribuídos às equipes; vagas 11 a 16 marcadas como `'BYE'`.
- `progression`: As 6 equipes que enfrentam `'BYE'` avançam diretamente para as Quartas de Final.

### 5.3. Sistema Suíço ou Dupla Eliminação
- O modelo em `stages` desacopladas permite adicionar um avaliador de rodadas dinâmicas (Suíço) ou chave de repescagem de perdedores (Losers Bracket) sem reescrever o motor de partidas ou a persistência de resultados canônicos.

---

## 6. O QUE NÃO DEVE SER ALTERADO (PRESERVAÇÃO DO CORE)

Para garantir integridade e estabilidade, os seguintes componentes aprovados em produção **não devem ser refeitos**, mas sim consumidos pelas novas abstrações:

1. **`CompetitionRulesService.getCanonicalMatchResult`:** A forma canônica de resultado de partida está testada, validada e perfeita.
2. **`CompetitionRulesService.validateSingleSet` e `validateMatchScore`:** Motor matemático de sets e vantagem aberta homologado.
3. **`standingsService.accumulateStats`:** Agregação canônica de pontos, sets, quocientes e vitórias.
4. **`CompetitionLifecycleService.freezeRulesSnapshot`:** Mecanismo idempotente de congelamento imutável de regras.
5. **Geração de Súmulas Oficiais em PDF (`matchSheetPdf.ts`):** O layout impresso em A4 P&B homologado pela arbitragem.
6. **Mapeamento de Dados e Adapter (`dataAccess.ts`):** A separação entre LocalStorage e Supabase permanece como portal exclusivo de I/O.

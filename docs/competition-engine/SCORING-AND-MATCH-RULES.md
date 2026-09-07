# BASEOS — REGRAS DE PONTUAÇÃO, PARTIDAS, W.O. E IDA E VOLTA

**Data:** 05/09/2026  
**Documento:** Especificação Técnica Conceitual de Pontuação, Regras de Partida, W.O. e Confrontos de Ida e Volta  
**Status:** Arquitetura Definida (Fase 4.2)  
**Escopo:** Sistemas de pontuação configuráveis (FIVB vs. Alternativos), herança de regras de partida por fase, modelagem flexível de W.O. e suporte estrutural a confrontos eliminatórios de ida e volta.

---

## 1. VISÃO GERAL E DIAGNÓSTICO DO PROBLEMA ATUAL

A auditoria da Fase 4.1 confirmou:
1. **Núcleo de Voleibol Homologado:** O BaseOS possui uma excelente base em `competitionRulesService.ts`:
   - `validateSingleSet` valida a pontuação de cada parcial (mínimo de pontos, vantagem mínima de 2 pontos aberta sem teto);
   - `getCanonicalMatchResult` apura o vencedor com base em `setsToWin` (2 sets para melhor de 3, 3 sets para melhor de 5);
   - `isWalkover` e `applyWalkoverScore` geram os placares canônicos de W.O. (25×0, 25×0).
2. **Falta de Flexibilidade de Negócio:**
   - A pontuação por resultado está engessada no cálculo FIVB padrão (3 pontos para vitórias por 3×0/3×1/2×0; 2 pontos para 3×2/2×1; 1 ponto para derrota em tie-break; 0 para derrota limpa). Campeonatos que utilizam sistemas amadores (ex: 2 pontos por vitória, 1 por derrota, 0 por W.O.) não são configuráveis.
   - O W.O. aplica estritamente 0 pontos ao perdedor e inclui parciais de 25×0 no saldo de pontos, o que em muitos torneios amadores distorce o desempate de terceiras equipes.
   - Não existe conceito de confronto em duas pernas (ida e volta) com critério de desempate agregado ou Golden Set.

---

## 2. SISTEMA DE PONTUAÇÃO CONFIGURÁVEL (SCORING ENGINE)

O BaseOS passa a desacoplar a pontuação da lógica fixa de voleibol profissional. A atribuição de pontos é definida por um **Perfil de Pontuação** (`ScoringRulesConfig`):

```typescript
export interface ScoringRulesConfig {
  /** Perfil pré-definido ou personalizado */
  profile: 'fivb-standard' | 'simple-amateur' | 'custom';

  /** Matriz ou função de atribuição de pontos */
  pointsMatrix?: {
    // Para melhor de 3
    win2x0: number; // FIVB: 3 | Amador: 2
    win2x1: number; // FIVB: 2 | Amador: 2
    loss1x2: number; // FIVB: 1 | Amador: 1
    loss0x2: number; // FIVB: 0 | Amador: 1

    // Para melhor de 5
    win3x0: number; // FIVB: 3 | Amador: 2
    win3x1: number; // FIVB: 3 | Amador: 2
    win3x2: number; // FIVB: 2 | Amador: 2
    loss2x3: number; // FIVB: 1 | Amador: 1
    loss1x3: number; // FIVB: 0 | Amador: 1
    loss0x3: number; // FIVB: 0 | Amador: 1

    // Para W.O.
    walkoverWin: number;  // Ex: 3 ou 2
    walkoverLoss: number; // Ex: 0 ou -1 (penalidade disciplinar)
  };
}
```

### Perfis Típicos
- **`fivb-standard`:** 3 pts (vitória 3×0, 3×1, 2×0), 2 pts (vitória 3×2, 2×1), 1 pt (derrota 2×3, 1×2), 0 pts (derrota 0×3, 1×3, 0×2, W.O.).
- **`simple-amateur`:** 2 pts por vitória (qualquer placar), 1 pt por derrota jogada, 0 pts por W.O. (Muito utilizado em campeonatos escolares e municipais).
- **`custom`:** Permite que a comissão organizadora defina valores específicos na UI sem alterações de código.

---

## 3. HIERARQUIA E HERANÇA DE REGRAS DE PARTIDA

As regras de disputa de uma partida seguem uma cascata de herança estrita de três níveis:

```text
┌─────────────────────────────────────────────────────────┐
│              1. Nível Competição (Default)              │
│       CompetitionConfig.matchRules (ex: Melhor de 3)    │
└────────────────────────────┬────────────────────────────┘
                             │ Herança / Sobrescrita
┌────────────────────────────▼────────────────────────────┐
│                2. Nível Fase (Stage Override)           │
│     StageDefinition.matchRulesOverride (ex: Melhor de 5)│
└────────────────────────────┬────────────────────────────┘
                             │ Aplicação Concreta
┌────────────────────────────▼────────────────────────────┐
│               3. Nível Partida (Match Instance)         │
│          MatchRecord (Execução com regras consolidadas) │
└─────────────────────────────────────────────────────────┘
```

### 3.1 Contrato Canônico de Regras de Partida (`MatchRulesConfig`)

```typescript
export interface MatchRulesConfig {
  /** Quantidade de sets necessários para vencer a partida (2 = melhor de 3; 3 = melhor de 5) */
  setsToWin: 2 | 3;

  /** Pontuação alvo dos sets normais (padrão: 25; praia/reduzido: 21) */
  pointsPerSet: number;

  /** Pontuação alvo do set decisivo / tie-break (padrão: 15) */
  pointsPerTieBreakSet: number;

  /** Exigência de vantagem mínima de 2 pontos aberta (true = sem teto de pontuação) */
  hasAdvantage: boolean;

  /** Teto opcional de pontuação (se definido, o set encerra ao atingir o teto, ex: 30) */
  pointsCap?: number;

  /** Regras específicas de W.O. */
  walkoverRules: WalkoverRulesConfig;
}
```

---

## 4. MOTOR DE W.O. (WALKOVER CONFIGURÁVEL)

O W.O. no BaseOS deixa de ser um comportamento rígido e passa a fornecer opções de configuração que refletem a realidade dos campeonatos amadores:

```typescript
export interface WalkoverRulesConfig {
  /** Placar atribuído em sets ao vencedor (ex: 2×0 ou 3×0) */
  setsAwardedToWinner: number;

  /** Parciais atribuídas por set (padrão: 25×0 ou 21×0) */
  setScoreString: string; // "25-0"

  /** Pontos na tabela atribuídos ao vencedor */
  pointsAwardedToWinner: number;

  /** Pontos na tabela atribuídos ao perdedor (0 ou -1 se houver penalidade) */
  pointsAwardedToLoser: number;

  /**
   * Impacto no cálculo de médias de desempate:
   * - 'include-scores': Computa 25×0 / 50×0 nas estatísticas de sets e pontos.
   * - 'exclude-from-averages': Registra a vitória, mas NÃO distorce o Point Ratio 
   *    das outras equipes do grupo com pontos artificiais de 25×0.
   */
  statisticsImpact: 'include-scores' | 'exclude-from-averages';

  /**
   * Desclassificação por W.O. consecutivo ou abandono:
   * Se habilitado, um segundo W.O. desclassifica a equipe e pode acionar anulação 
   * retroativa das partidas disputadas para manter a equidade do grupo.
   */
  allowDoubleWalkoverAnnulment?: boolean;
}
```

---

## 5. CONFRONTOS DE IDA E VOLTA (TWO-LEGGED TIES)

Para fases eliminatórias que adotam confrontos em duas partidas (mando e desmando de quadra):

```text
┌─────────────────────────────────────────────────────────────┐
│                       TieSeriesRecord                       │
│ - id: "SERIES-QF-1"                                         │
│ - stageId: "stage-playoffs"                                 │
│ - teamAId: "equipe-alpha"                                   │
│ - teamBId: "equipe-beta"                                    │
│ - seriesType: 'two-legged'                                  │
│ - tieBreaker: 'golden-set' | 'point-aggregate'              │
│                                                             │
│   Partida 1 (Ida):    Equipe Alpha 3 × 1 Equipe Beta        │
│   Partida 2 (Volta):  Equipe Beta  3 × 0 Equipe Alpha        │
│                                                             │
│   Desempate: Golden Set (15 pts) disputado após o Jogo 2    │
│   Vencedor da Série: Equipe Beta                            │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 Regras de Resolução de Ida e Volta
1. **Vitórias na Série:** Se uma equipe vencer ambos os jogos (2–0), ela é a vencedora imediata da série.
2. **Empate em Vitórias (1–1):** O regulamento configurado define o critério:
   - **Opção A — Pontos da Partida:** Se o Jogo 1 foi 3×0 (3 pts) e o Jogo 2 foi 3×2 (Beta ganhou 2 pts, Alpha ganhou 1 pt), Alpha somou 4 pts e Beta 2 pts $\to$ Alpha avança.
   - **Opção B — Golden Set (Oficial CEV / CBV):** Independentemente das parciais ou placares, em caso de 1–1 em vitórias ou empate em pontos de partida, é disputado imediatamente um **Golden Set** de 15 pontos (com vantagem de 2). O vencedor do Golden Set avança.
   - **Opção C — Saldo de Sets / Saldo de Pontos:** Saldo acumulado entre as duas partidas.

O motor modela a série através de um agregado `TieSeriesRecord`, permitindo que o `ProgressionEngine` avance o vencedor apenas quando o confronto de volta (e o eventual Golden Set) for validado.

# BASEOS — FASE 4.2: ARQUITETURA DO MOTOR DE FORMATOS, FASES, PONTUAÇÃO, DESEMPATE E PROGRESSÃO

**Data:** 05/09/2026  
**Status da Fase:** **ARQUITETURA DEFINIDA — SEM BLOQUEADORES**  
**Modo:** Arquitetura e Design Técnico Controlado (Sem alteração de código de produção)  
**Autor:** Antigravity AI / Equipe de Arquitetura BaseOS

---

## 1. VISÃO GERAL E MOTIVAÇÃO

A Fase 4.1 auditou exaustivamente o sistema esportivo do BaseOS e comprovou:
- O sistema é excelente no seu núcleo canônico: apuração de resultados (`CanonicalMatchResult`), validação de parciais e sets com vantagem aberta, estatísticas oficiais de voleibol e congelamento imutável de regras (`rulesSnapshot`).
- O sistema é **arquiteturalmente bloqueado** para suportar múltiplos formatos esportivos amadores porque a fase de grupos e o mata-mata foram codificados de forma acoplada e estática:
  - Fases são apenas strings em `matches.phase`.
  - O chaveamento eliminatório só suporta 1, 2 ou 4 grupos em `playoffsService.ts`.
  - Não há conceito de fase intermediária (repescagem / play-in).
  - Não há agregador de ranking intergrupos.
  - O confronto direto só funciona entre 2 equipes (falha em empates triplos).
  - O formato macro da competição está fora do `CompetitionConfig`.

A **Fase 4.2** projeta o **Competition Format Engine**, uma arquitetura modular, extensível e puramente orientada a configuração que transforma o BaseOS em um motor esportivo genérico de nível profissional, capaz de realizar torneios simples (pontos corridos puro), torneios tradicionais (grupos + playoffs olímpicos) e formatos compostos amadores (como o **Campeonato Voltz**) com **ZERO linhas de código específicas para qualquer campeonato**.

---

## 2. OS 6 PILARES ARQUITETURAIS

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. CompetitionConfig (SSOT)                        │
│          (Parâmetros Globais, Limites de Elenco, Versão e Snapshots)        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      2. CompetitionFormat & Stage Graph                     │
│               (Grafo Direcionado Acíclico de Fases Sequenciais)             │
└──────────────────┬───────────────────────────────────────┬──────────────────┘
                   │                                       │
┌──────────────────▼───────────────┐     ┌─────────────────▼──────────────────┐
│      3. Pairing Engine           │     │     4. Standings & Tiebreak        │
│ (Berger, Seeds, Custom Crossings)│     │(Mini-tabela, Multi-H2H, Intergroup)│
└──────────────────┬───────────────┘     └─────────────────┬──────────────────┘
                   │                                       │
┌──────────────────▼───────────────────────────────────────▼──────────────────┐
│                           5. Progression Engine                             │
│       (Conexão Dinâmica: Posição de Grupo, Ranking Geral ou Vencedor)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    6. Match Rules & Scoring Engine                          │
│          (SetsToWin, Vantagem Aberta, FIVB/Custom Points, Regras W.O.)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pilar 1 — `CompetitionConfig` continua sendo a Única Fonte da Verdade (SSOT)
Nenhuma regra esportiva deve existir fora do contrato canônico serializado em `competitions.config` e congelado em `competitions.rules_snapshot`. O formato geral da competição e a definição de suas fases passam a residir formalmente dentro do `CompetitionConfig`.

### Pilar 2 — Formato $\neq$ Fase $\neq$ Partida $\neq$ Classificação
- **Formato (`CompetitionFormat`):** O desenho macro da jornada do torneio (ex: Grupos $\to$ Repescagem $\to$ Quartas $\to$ Semis $\to$ Final).
- **Fase (`Stage`):** Uma etapa concreta e autocontida com ciclo de vida próprio, participantes delimitados e regras específicas.
- **Partida (`Match`):** Unidade de disputa atlética governada por regras de sets e pontuação.
- **Classificação (`Standings`):** Projeção matemática determinística do desempenho das equipes em uma fase ou entre grupos.

### Pilar 3 — Zero Código Específico por Campeonato
A proibição absoluta de:
$$\neg \exists (\text{if competition.name === 'Voltz'}) \quad \wedge \quad \neg \exists (\text{if format === 'voltz'}) \quad \wedge \quad \neg \exists (\text{VoltzService})$$
O regulamento Voltz é apenas um caso de teste para garantir que o motor seja expressivo o suficiente para representá-lo puramente por dados.

### Pilar 4 — Preservação Estrita do Núcleo Homologado
Não reescrever o que já funciona e está homologado:
- `CompetitionRulesService.getCanonicalMatchResult` permanece intacto.
- `CompetitionRulesService.validateSingleSet` e `validateMatchScore` permanecem intactos.
- `standingsService.accumulateStats` permanece como base do cálculo estatístico.
- `rulesSnapshot` permanece como mecanismo de congelamento imutável.
- Súmula oficial A4 P&B (`matchSheetPdf.ts`) permanece idêntica.

### Pilar 5 — Compatibilidade Dual (LocalStorage e Supabase)
A arquitetura deve funcionar com total equivalência de tipos no `dataAccess.ts`, respeitando tanto o armazenamento cliente em LocalStorage quanto o banco relacional PostgreSQL/Supabase com RLS.

### Pilar 6 — Transição Suave e Sem Regressão Legacy
Competições criadas nas versões anteriores do BaseOS (formato legado com strings como `'round-robin'`, `'5-sets'`, `'classificatória'`) devem ser normalizadas transparentemente em memória pelo motor sem quebrar bancos existentes.

---

## 3. MAPA DE RESPONSABILIDADES DOS SERVIÇOS (ATUAIS VS. FUTUROS)

Para evitar a criação de um sistema paralelo ou duplicação de regras, o caminho evolutivo dos serviços foi rigorosamente delimitado:

| Serviço / Módulo | Responsabilidade Atual | Decisão Arquitetural | Papel no Futuro Motor |
|---|---|:---:|---|
| `competitionRulesService.ts` | Sets, W.O., pontos, canonical result, roster limits | **PERMANECE E EXPANDE** | Permanece como motor de regras de partida e validação matemática; passa a suportar regras customizadas de pontuação e W.O. |
| `standingsService.ts` | Classificação por grupo, set/pontos average, desempates | **PERMANECE E EXPANDE** | Permanece como motor estatístico de voleibol; recebe o algoritmo multi-equipe para confronto direto e o ranking intergrupos. |
| `competitionBracketService.ts` | Fachada de chaveamentos e validação de travas de fase | **REFATORAÇÃO INTERNA** | Deixa de chamar código hardcoded de 2/4 grupos e passa a delegar para o `BracketEngine` / `PairingEngine`. |
| `playoffsService.ts` | Quartas, semis e final fixas com propagação de slots | **MIGRAÇÃO GRADUAL** | A lógica estática de 4 grupos migra para um gerador genérico de chaveamento olímpico; avanço manual é substituído pelo `ProgressionEngine`. Mantido para compatibilidade legacy. |
| `drawService.ts` | PRNG mulberry32, distribuição de grupos e Berger | **PERMANECE E FOCA** | Foca estritamente no sorteio (PRNG, seeds, cabeças de chave); a geração de jogos passa a usar o `PairingEngine` de Berger. |
| `competitionLifecycleService.ts` | Ciclo de vida linear (`in-progress` $\to$ `playoffs`) | **GENERALIZAÇÃO** | Deixa de assumir que o próximo status após grupos é incondicionalmente `playoffs`. Passa a gerenciar transições de `Stages`. |
| `dataAccess.ts` | Adapter I/O LocalStorage / Supabase | **PERMANECE E ADAPTA** | Adiciona operações para gerenciar fases (`stages`) de forma unificada. |

---

## 4. O NOVO CONTRATO DO COMPETITIONCONFIG

O contrato canônico em `src/types/competitionConfig.ts` evolui da versão 1 para a versão 2, incorporando a definição do formato de disputa macro:

```ts
export interface CompetitionConfigV2 {
  version: 2;
  format: CompetitionFormatConfig;
  scoring: ScoringSystemConfig;
  standings: StandingsConfig;
  registration: RegistrationRulesConfig;
}

export interface CompetitionFormatConfig {
  /** Identificador do modelo de disputa (preset ou customizado) */
  formatType: 'group-stage-knockout' | 'round-robin' | 'single-elimination' | 'groups-repechage-playoffs' | 'custom';
  
  /** Lista ordenada de fases sequenciais que compõem o torneio */
  stages: StageDefinition[];
  
  /** Configuração padrão de sets da competição */
  defaultSetsToWin: SetsToWin;
  
  /** Parâmetros padrão de sets */
  setRules: {
    regularSetPoints: number;
    tiebreakPoints: number;
    minAdvantage: number;
  };
}
```

---

## 5. DIAGRAMA DE FLUXO DO MOTOR DE FORMATOS

```text
┌────────────────────────────────────────────────────────┐
│             Início da Competição (Planning)            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│           Resolução do Grafo de Fases (Stages)         │
│          Stage 1 (Grupos) -> Status: PENDING           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│       Execução do Sorteio (Draw Engine + Pairing)       │
│     Gera partidas da Fase 1 usando Tabela Berger       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Disputa da Fase 1                     │
│    Resultados homologados -> CanonicalMatchResult      │
│    Standings calculados por grupo (standingsService)   │
└──────────────────────────┬─────────────────────────────┘
                           │ (Todos os jogos de grupos homologados)
                           ▼
┌────────────────────────────────────────────────────────┐
│       Conclusão da Fase 1 & Disparo de Progressão      │
│  1. Extração do Ranking 1-4 (Campeões de Grupo)        │
│  2. Extração do Ranking 5-12 (2º e 3º colocados)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Ativação da Fase 2 (Repescagem)           │
│   Pairing Engine emparelha 5x12, 6x11, 7x10, 8x9      │
│   Partidas criadas vinculadas a Stage 2                │
└──────────────────────────┬─────────────────────────────┘
                           │ (Repescagem concluída)
                           ▼
┌────────────────────────────────────────────────────────┐
│       Ativação da Fase 3 (Playoffs Finais / Quartas)   │
│   Alimentada por Seeds 1-4 (Fase 1) + 4 Vencedores     │
│   Avanço automático até Grande Final e Pódio           │
└────────────────────────────────────────────────────────┘
```

---

## 6. ESTRUTURA DOS DOCUMENTOS DE ARQUITETURA

A especificação detalhada da Fase 4.2 está dividida nos seguintes documentos especializados:

1. [STAGE-MODEL.md](file:///home/diego-martins/docker/volei/docs/competition-engine/STAGE-MODEL.md) — Contratos e ciclo de vida de fases, transições e eliminação de strings literais.
2. [PAIRING-AND-PROGRESSION.md](file:///home/diego-martins/docker/volei/docs/competition-engine/PAIRING-AND-PROGRESSION.md) — Motores matemáticos de emparelhamento, sementes e regras de progressão.
3. [STANDINGS-AND-TIEBREAK-ARCHITECTURE.md](file:///home/diego-martins/docker/volei/docs/competition-engine/STANDINGS-AND-TIEBREAK-ARCHITECTURE.md) — Ranking intergrupos e algoritmo formal para desempate multi-equipe.
4. [SCORING-AND-MATCH-RULES.md](file:///home/diego-martins/docker/volei/docs/competition-engine/SCORING-AND-MATCH-RULES.md) — Pontuação configurável, regras de sets por fase, W.O. e ida e volta.
5. [FORMAT-COMPATIBILITY-MATRIX.md](file:///home/diego-martins/docker/volei/docs/competition-engine/FORMAT-COMPATIBILITY-MATRIX.md) — Matriz exaustiva de formatos compatíveis, presentes e futuros.
6. [VOLTZ-ARCHITECTURAL-PROOF.md](file:///home/diego-martins/docker/volei/docs/competition-engine/VOLTZ-ARCHITECTURAL-PROOF.md) — Prova de expressividade do regulamento Voltz via configuração pura.
7. [PHASE-4.2-WALKTHROUGH.md](file:///home/diego-martins/docker/volei/docs/competition-engine/PHASE-4.2-WALKTHROUGH.md) — Respostas às 25 perguntas do escopo e homologação final.

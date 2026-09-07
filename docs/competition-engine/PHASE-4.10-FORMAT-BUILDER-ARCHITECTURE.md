# BaseOS — Arquitetura de Format Builder, Templates e Autoria de Configuração (Fase 4.10)

**Fase:** 4.10 — Format Builder, Templates, Configuration Authoring & Competition Setup  
**Data:** 2026-09-06  
**Status:** HOMOLOGADO  

---

## 1. Visão Geral e Princípio Arquitetural Absoluto

A Fase 4.10 estabelece a camada soberana de autoria e configuração de competições esportivas sobre o ecossistema já consolidado nas Fases 4.1 a 4.9.

O princípio fundacional do BaseOS permanece inquebrável:

> **"O organizador configura. O `CompetitionConfig` declara. Os engines calculam. O Runtime executa. A persistência registra. A UI apresenta."**

Nunca inverter ou misturar essas responsabilidades.

---

## 2. Segregação Absoluta: Camada de Autoria (Authoring) vs. Camada de Execução (Execution)

A arquitetura do BaseOS divide o ciclo de vida esportivo em dois hemisférios estritamente desacoplados:

```text
                  ┌──────────────────────────────────────────────┐
                  │                 ORGANIZADOR                  │
                  └──────────────────────┬───────────────────────┘
                                         │
═════════════════════════════════════════╪═════════════════════════════════════════
 CAMADA DE AUTORIA (AUTHORING)           │
═════════════════════════════════════════╪═════════════════════════════════════════
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │      FORMAT BUILDER & UI DE AUTORIA          │
                  │                                              │
                  │  Templates (Presets desacoplados)            │
                  │  StageBuilder (Fases & Rodadas declarativas) │
                  │  ParticipantFeedEditor (8 referências)       │
                  │  Pairing & Progression Declarative Config    │
                  │  RulesConfigEditor (Sets, Scoring, Standings)│
                  │  CompetitionPreview (Simulação 100% em RAM)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │         useCompetitionFormatBuilder          │
                  │           (Hook de Estado de Draft)          │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │          CompetitionFormatBuilder            │
                  │       (Serviço Puro de Transformação)        │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │              CompetitionConfig               │
                  │         (ÚNICA SINGLE SOURCE OF TRUTH)       │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │          CompetitionConfigValidator          │
                  │      (Validação de Grafo, Feeds e Regras)    │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │             dataAccess (Adapter)             │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │       PERSISTÊNCIA FÍSICA (POSTGRESQL)       │
                  │    competitions.config / rules_snapshot      │
                  └──────────────────────┬───────────────────────┘
                                         │
═════════════════════════════════════════╪═════════════════════════════════════════
 CAMADA DE EXECUÇÃO (EXECUTION)          │
═════════════════════════════════════════╪═════════════════════════════════════════
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │             StageGraph Engine                │
                  │     (Construção de DAG e Slots Canônicos)    │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │                 PURE ENGINES                 │
                  │                                              │
                  │  GenericPairingEngine                        │
                  │  GenericProgressionEngine                    │
                  │  OverallStandingsEngine                      │
                  │  ScoringEngine                               │
                  │  TieBreakEngine                              │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │          CompetitionRuntimeService           │
                  │ (Materialização de Partidas e Avanço Atômico)│
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │     CompetitionBracketViewModelBuilder       │
                  │         (Projeção Pura de Apresentação)      │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ↓
                  ┌──────────────────────────────────────────────┐
                  │           GenericTournamentBracket           │
                  │        (Componente Visual do Bracket)        │
                  └──────────────────────────────────────────────┘
```

---

## 3. Contratos Soberanos e Invariantes da Fase 4.10

### 3.1 `CompetitionConfig` como Única SSOT
Não existem modelos persistentes concorrentes (`TournamentRules`, `BracketConfig`, `GroupConfig`). O rascunho de tela é convertido determinísticamente em `CompetitionConfig`. Toda operação converge para este objeto tipado.

### 3.2 Ausência de Motores Específicos e Hardcodes
- **Zero hardcode de formato:** Não existe `if (format === 'voltz')`, `if (stages.length === 3)`, `if (groupsCount === 2)`.
- **Generalização pura:** O formato Voltz (12 equipes, 4 grupos de 3, ranking geral, Play-In para 5º–12º, Quartas para 1º–4º + vencedores do Play-In, Semis e Final) é expresso puramente através de `StageDefinition[]`, `ParticipantFeedDefinition[]`, `PairingConfig` e `ProgressionRoute`.

### 3.3 Suporte Integral às 8 Modalidades de `ParticipantReference`
O Builder e o Editor de Feeds suportam todas as 8 modalidades homologadas na Fase 4.4:
1. `resolved-team`: Equipe física já definida (ID e Nome);
2. `group-position`: Classificação em grupo específico (ex: 1º Grupo A);
3. `overall-ranking`: Classificação no ranking agregado (ex: 5º Geral);
4. `stage-position`: Posição final em um estágio anterior (ex: 3º Fase 1);
5. `match-winner`: Vencedor de partida/slot de origem (ex: Vencedor QF1);
6. `match-loser`: Perdedor de partida/slot de origem (ex: Perdedor SF1);
7. `seed`: Chaveamento por chave de cabeça de série (ex: Seed 1);
8. `bye`: Folga estrutural garantida.

### 3.4 BYE Estrutural Sem Equipes Artificiais
- Nenhuma string mágica como `TBD-A-1`, `fake-team`, `placeholder` é criada.
- Quando um participante não tem oponente, seu slot é declarado com `ParticipantReference = { type: 'bye' }`.
- O runtime e o domínio cuidam do avanço automático; a interface apenas renderiza visualmente a etiqueta `BYE`.

### 3.5 Prévia 100% Local (Zero Persistência em Preview)
- O componente `CompetitionPreview` projeta os `MatchSlot` gerados em memória chamando `CompetitionFormatBuilder.generatePreviewSlots(config)`.
- Ele invoca `CompetitionBracketViewModelBuilder.build(...)` com dados locais voláteis.
- **Nenhum registro é inserido no banco de dados**, nenhuma RPC é chamada e nenhum `matchId` é gerado.

### 3.6 Congelamento de Regras (`rules_snapshot` e Freeze)
- Regras de formato, sets, pontuação e fases só podem ser editadas quando `CompetitionLifecycleService.canEditRules(comp)` autorizar (`status === 'planning'` ou `'draft'`, e `rules_snapshot === null`).
- Uma vez congelada a competição, o `rules_snapshot` torna-se imutável no PostgreSQL e no `dataAccess`, impedindo adulterações pós-início de jogos.

---

## 4. Integração Segura com as Fases Anteriores

1. **Integração com Fase 4.8 (Runtime):** O `CompetitionConfig` produzido pelo Builder alimenta diretamente `new StageGraph(config.format.stages, slots)` e o `CompetitionRuntimeService` sem qualquer camada adaptadora intermediária.
2. **Integração com Fase 4.9 (Bracket):** O `CompetitionBracketViewModelBuilder` aceita os estágios e slots configurados e projeta visualmente em `GenericTournamentBracket` para Best of 3, Best of 5, Play-In ou Knockout.
3. **Persistência Transacional (Fases 4.5 a 4.7):** O salvamento utiliza estritamente o adapter `dataAccess.updateCompetition(id, { config })`, com validação prévia pelo `CompetitionConfigValidator`.

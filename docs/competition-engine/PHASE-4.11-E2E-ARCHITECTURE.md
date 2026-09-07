# BASEOS — FASE 4.11 — ARQUITETURA E2E E FLUXO SISTÊMICO

**Projeto:** BaseOS / VolleyPro  
**Fase:** 4.11 — E2E, Homologação Sistêmica, Integração Completa e Production Readiness  
**Data:** 2026-09-06  

---

## 1. O FLUXO SOBERANO DE DADOS DO BASEOS

O BaseOS opera segundo um pipeline estritamente unidirecional e determinístico, onde nenhuma camada periférica tem permissão para decidir regras esportivas ou forçar mutações de estado:

```text
┌─────────────────────────────────────────────────────────────┐
│                       USER INTERFACE                        │
│   CompetitionsPage │ Builder │ DrawArena │ MatchSheet │ Bracket   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispara Ações / Lê Estado
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      HOOKS & CONTROLLERS                    │
│   useCompetitionRuntime │ useCapabilities │ DrawController  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Normaliza & Valida Contratos
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   SINGLE SOURCE OF TRUTH                    │
│                     CompetitionConfig                       │
│    (rules, sets, scoring, standings, stages, pairings, routes)│
└──────────────────────────────┬──────────────────────────────┘
                               │ Validação Estrita de Grafos
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                      │
│     dataAccess (Adapter Pattern LocalStorage / Supabase)    │
│            toSnake / toCamel │ Sanitização Anti-Fake        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Transações ACID / RPCs
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      POSTGRESQL REAL                        │
│   competitions │ stages │ rounds │ match_slots │ matches    │
│   RLS Hardening │ rules_snapshot Trigger │ Anti-Fake Check  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Notificação / Polling / Query
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPETITION RUNTIME ENGINE                 │
│         CompetitionRuntimeService │ ParticipantResolution    │
│            Materialização Atômica de MatchSlots             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Eventos de Partida Concluída
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   CANONICAL MATCH RESULT                    │
│            CompetitionRulesService.getCanonicalMatchResult  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Alimenta Cálculos Oficiais
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      SCORING ENGINE                         │
│           Atribuição de Pontos Canônicos (FIVB / Custom)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Consolidação da Fase
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 STANDINGS & TIE-BREAK ENGINE                │
│    Mini-Tabela │ Set Average │ Point Average │ Head-to-Head  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Consolidação Intergrupos
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  OVERALL STANDINGS ENGINE                   │
│        Ordenação Geral (Group Position First / Pure Stats)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Resolução de Vagas
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  GENERIC PROGRESSION ENGINE                 │
│         Atualização dos Slots Dependentes (Avanço)          │
│            (Winner, Loser, Group Pos, Overall Rank, BYE)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Notifica Materialização
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  BRACKET VIEWMODEL BUILDER                  │
│       Projeção Pura de Árvore SVG/DOM (Sem Regra na UI)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Exposição Desacoplada
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  PUBLIC READ LAYER & VIEWS                  │
│       /c/:slug (public_competitions, public_teams, reports) │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. RESPONSABILIDADE DETALHADA POR CAMADA

### 2.1 Interface com Usuário (UI)
- Responsável unicamente pela captura de intenção do usuário e renderização de dados derivados.
- **Proibições:** Nunca calcula classificação, nunca computa saldo de sets, nunca avança participantes por conta própria, nunca inventa equipes provisórias ou IDs como `TBD-1`.

### 2.2 CompetitionConfig (SSOT)
- O documento JSON imutável que rege 100% da competição:
  - Formato de sets (`defaultSetsToWin`, `maxSets`, `tiebreakPoints`).
  - Tabela de pontuação (`scoringSystem`).
  - Critérios de desempate ordenados (`tieBreakCriteria`).
  - Grafo estrutural de fases (`stages`, `rounds`, `matchSlots`).
  - Rotas de progressão esportiva (`progressionRoute`).

### 2.3 Data Access Layer (`dataAccess`)
- Porta de entrada única e isolada para persistência.
- Implementa o padrão Adapter garantindo paridade total entre o modo demo (LocalStorage) e a persistência em nuvem (Supabase / PostgreSQL).
- Executa a conversão bidirecional de nomenclatura (`camelCase` na aplicação $\leftrightarrow$ `snake_case` no PostgreSQL) e barra qualquer injeção de IDs artificiais.

### 2.4 PostgreSQL Real & RPCs Transacionais
- **`save_stage_draw_and_slots`:** Cria o estágio, as rodadas e todos os slots correspondentes em uma única transação atômica ACID.
- **`rpc_materialize_slot_match`:** Materializa uma partida real (`matches`) apenas se ambos os participantes estiverem resolvidos, com proteção determinística contra materializações concorrentes (idempotência).
- **`rpc_propagate_slot_outcome`:** Executa o avanço de vencedores e perdedores aplicando locks ordenados (`ORDER BY id ASC FOR UPDATE`) para erradicar qualquer possibilidade de deadlock.
- **`trg_protect_competition_rules_snapshot`:** Trigger de banco que bloqueia fisicamente qualquer alteração no regulamento após o início da competição.

### 2.5 Competition Runtime Service
- Motor assíncrono que orquestra o ciclo de vida:
  - Avalia se um slot possui seus dois participantes resolvidos.
  - Comanda a materialização de partidas elegíveis.
  - Reconcilia slots incompletos ou órfãos sem corrupção de estado.

### 2.6 Canonical Match Result
- Estrutura de dados canônica neutra que resume o resultado esportivo de um jogo:
  - Placar em sets (ex: 2-1 ou 3-2).
  - Vencedor e perdedor legítimos.
  - Pontos marcados e sofridos em cada set.
  - Elimina divergências entre súmula eletrônica e tabelas de classificação.

### 2.7 Standings, Tie-Break e Overall Engines
- Motores puros, sem efeitos colaterais:
  - **`StandingsEngine`:** Totaliza vitórias, derrotas, sets e pontos conforme o sistema de pontuação oficial.
  - **`TieBreakEngine`:** Aplica ordenação em cascata e mini-tabelas em caso de empates múltiplos.
  - **`OverallStandingsEngine`:** Consolida rankings gerais cruzando múltiplos grupos para cruzamentos de fases eliminatórias (ex: Play-Ins, Quartas-de-Final).

### 2.8 Bracket ViewModel Builder
- Transforma os dados brutos de estágios, rodadas, slots e partidas em um modelo de visualização (`BracketViewModel`) enriquecido com status estruturais (`unresolved`, `resolved`, `materialized`, `completed`, `bye`, `inconsistent`).
- Detecta e expõe inconsistências Slot $\leftrightarrow$ Match sem permitir abertura indevida de partidas incoerentes.

### 2.9 Public Read Layer
- Exposição de dados para o público externo através da rota `/c/:slug`.
- Utiliza views seguras do banco (`public_competitions`, `public_competition_teams`) e filtros que omitem chaves confidenciais, tokens de acesso ou dados pessoais restritos.

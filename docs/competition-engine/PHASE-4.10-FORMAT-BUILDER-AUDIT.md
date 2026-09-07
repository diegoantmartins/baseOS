# BaseOS — Auditoria Completa: Format Builder, Templates e Configuração de Competições

**Fase:** 4.10 — Format Builder, Templates, Configuration Authoring & Competition Setup  
**Data:** 2026-09-05  
**Autor:** Antigravity / Gemini  
**Status:** AUDITORIA CONCLUÍDA  

---

## 1. Contexto e Escopo

A arquitetura do motor de competições do BaseOS passou pelas seguintes fases de homologação:
- **4.1 a 4.4.1:** Definição canônica de `CompetitionConfig` como SSOT, motores puros (`ScoringEngine`, `TieBreakEngine`, `OverallStandingsEngine`, `GenericPairingEngine`, `GenericProgressionEngine`, `StageGraphEngine`);
- **4.5 a 4.7:** Persistência transacional (`save_stage_draw_and_slots`, RPCs PostgreSQL com RLS, idempotência e locking de concorrência);
- **4.8:** `CompetitionRuntimeService`, materialização controlada de `Match` e avanço esportivo sem equipes artificiais (`TBD-A-1`, `fake-team`);
- **4.9:** `CompetitionBracketViewModelBuilder` puro e `GenericTournamentBracket` agnóstico e semântico.

O objetivo da **Fase 4.10** é construir a camada de **autoria e configuração visual (Format Builder)** que permita a um organizador criar, customizar, validar, visualizar em prévia e publicar qualquer formato esportivo sem exigir modificações no código ou engines já homologados.

---

## 2. Diagnóstico da Arquitetura Atual

### 2.1 Estrutura de `CompetitionConfig` (SSOT)
O contrato reside em `src/types/competitionConfig.ts` e possui:
- `version: number`;
- `format`:
  - `defaultSetsToWin: 1 | 2 | 3` (1 = set único, 2 = melhor de 3, 3 = melhor de 5);
  - `phaseOverrides?: PhaseFormatOverrides` (`groupStage`, `roundOf16`, `playoffs`, `quarterfinals`, `semifinals`, `thirdPlace`, `final`);
  - `setRules: { regularSetPoints, tiebreakPoints, minAdvantage }`;
  - `formatType?: CompetitionFormatType` (`'round-robin' | 'groups-knockout' | 'groups-play-in-knockout' | 'knockout' | 'custom'`);
  - `stages?: StageDefinition[]`;
- `scoring: ScoringSystemConfig`:
  - `systemType: 'fivb-standard' | 'simple' | 'win-loss' | 'custom'`;
  - `pointsWinClear`, `pointsWinNarrow`, `pointsLossNarrow`, `pointsLossClear`, `pointsWoWin`, `pointsWoLoss`;
- `standings: StandingsConfig`:
  - `tiebreakCriteriaOrder: TiebreakCriterionId[]`;
  - `advancingPerGroup: number`;
  - `bestThirds?: { enabled: boolean; count: number }`;
  - `aggregationStrategy?: OverallRankingStrategy` (`'by-group-position-first' | 'pure-overall-stats' | 'custom'`);
- `registration: RegistrationRulesConfig`:
  - `minAthletes`, `maxAthletes`, `maxCaptains`, `maxLiberos`, `requireJerseyNumberOnRegistration`.

### 2.2 Entidades e Persistência
- `CompetitionRecord` em `src/types/entities.ts` possui `config?: CompetitionConfig` e `rulesSnapshot?: CompetitionConfig`.
- Na tabela `competitions` do PostgreSQL e no `localStorage`, a coluna `config` armazena o JSONB de `CompetitionConfig`.
- `CompetitionRulesService.getConfig(comp)` dá preferência estrita a `rulesSnapshot`, em seguida a `config`, e por último faz fallback para `normalizeLegacyToConfig`.
- `dataAccess.updateCompetition(id, updates)` já preserva `rulesSnapshot` de alterações acidentais.

---

## 3. Análise de Hardcodes e Limitações Existentes

### 3.1 Hardcodes Identificados
1. **Criação Legada (`CompetitionFormDialog.tsx`):**
   - O diálogo antigo de criação assume `format = 'group-stage-knockout'`, `groupsCount = 2`, `advancingPerGroup = 2`, sem permitir fases personalizadas, play-in ou outros formatos.
   - Gera um `config` normalizado a partir dos campos planos, sem instanciar `stages` nem `rounds`.
2. **Edição Legada (`CompetitionSettingsEditDialog.tsx`):**
   - Permite apenas alterar strings de set format por fase ('3-sets', '5-sets') e regerar `phaseSetRules`.
3. **Serviço Legado (`competitionBracketService.ts`):**
   - Possui lógica legada `generateTwoGroupPlayoffs` e `generateFourGroupPlayoffs` baseadas no tamanho do array de grupos. Esse serviço é legado e já foi desacoplado nas Fases 4.8 e 4.9.
4. **Ausência de Hardcode de Torneio Especial:**
   - A auditoria semântica confirmou que **não há** `if (format === 'voltz')` ou `if (competition.name === 'Voltz')` em arquivos de produção do BaseOS. O formato Voltz é demonstrado puramente via configuração declarativa de `StageDefinition` e `MatchSlot`.

---

## 4. Gaps e Necessidades para a Fase 4.10

1. **`CompetitionTemplateService`:**
   - Não existe atualmente um catálogo centralizado de templates de formato.
   - Necessário criar um serviço puro que ofereça presets genéricos (`Round Robin`, `Groups -> Knockout`, `Groups -> Play-In -> Knockout`, `Knockout`) que gerem um `CompetitionConfig` estruturado com suas respectivas fases (`StageDefinition[]`).
2. **`CompetitionFormatBuilder` (Service & State):**
   - Necessário criar uma classe pura que gerencie a manipulação de rascunhos (drafts), adição/remoção/reordenação de estágios, configuração de rodadas, feeds e rotas de progressão.
3. **`CompetitionConfigValidator`:**
   - O `StageGraph.validate` existente já valida o DAG de estágios e slots, mas é necessário um validador abrangente que verifique também regras de pontuação, sets, critérios de desempate e limites de elenco, segregando em:
     - `Valid` (válido para prosseguir);
     - `Warnings` (alertas não bloqueantes, ex: geração potencial de BYEs);
     - `Blocking Errors` (erros que impedem salvamento/publicação, ex: referências quebradas, ciclos no DAG).
4. **Interface do Builder (UI Modular):**
   - Necessário criar uma experiência integrada de autoria no padrão do BaseOS (Dark SaaS), acessível através de tabs/steps intuitivos:
     - Informações Gerais e Seleção de Template;
     - Fases & Rodadas (Stage Graph Builder);
     - Feeds & Pareamentos;
     - Progressões;
     - Regras de Pontuação, Sets e Desempate;
     - Inscrições;
     - Painel de Validação e Pré-Visualização (Preview local sem persistência).
5. **Pré-visualização Local (Zero Persistência):**
   - O preview deve instanciar `StageGraph` em memória e projetar os slots através de `CompetitionBracketViewModelBuilder` puro para renderizar no `GenericTournamentBracket`, **sem invocar nenhuma RPC nem criar partidas no banco**.

---

## 5. Arquivos a Criar e a Modificar

### 5.1 Novos Arquivos de Domínio e UI
- `src/services/competitionFormatBuilder.ts` (Serviço de construção e normalização de drafts de formato)
- `src/services/competitionConfigValidator.ts` (Validador unificado de regras e estrutura)
- `src/services/competitionTemplateService.ts` (Presets canônicos de templates)
- `src/hooks/useCompetitionFormatBuilder.ts` (Hook reativo de gerenciamento de estado de autoria)
- `src/components/competition/format-builder/`
  - `CompetitionFormatBuilder.tsx` (Container mestre da autoria)
  - `FormatTemplateSelector.tsx` (Seletor visual de presets)
  - `StageBuilder.tsx` (Gestor de estágios e rodadas)
  - `StageEditorDialog.tsx` (Edição detalhada de fase: tipo, feeds, rounds, pairing, progressão)
  - `RulesConfigEditor.tsx` (Editor de sets, scoring, tie-break e registro)
  - `CompetitionValidationPanel.tsx` (Exibição de erros e alertas de validação)
  - `CompetitionPreview.tsx` (Simulação e visualização local via `GenericTournamentBracket`)
  - `index.ts` (Exportação modular)
- `src/test/competitionFormatBuilder.test.ts` (Suíte completa de testes unitários A até O)

### 5.2 Arquivos a Modificar
- `src/components/competition/dialogs/CompetitionFormDialog.tsx` (Integrar seleção de template ou formato avançado)
- `src/components/competition/tabs/CompetitionConfigTab.tsx` (Adicionar botão "Abrir Format Builder" quando permitido)
- `src/pages/CompetitionsPage.tsx` (Conectar abertura do Format Builder em modal/drawer dedicado)

### 5.3 Arquivos que NÃO Devem Ser Modificados
- `src/services/stageGraphEngine.ts` (Contrato homologado da Fase 4.4)
- `src/services/genericPairingEngine.ts` (Contrato homologado da Fase 4.3)
- `src/services/genericProgressionEngine.ts` (Contrato homologado da Fase 4.3)
- `src/services/scoringEngine.ts` (Contrato homologado da Fase 4.3)
- `src/services/tieBreakEngine.ts` (Contrato homologado da Fase 4.3)
- `src/services/overallStandingsEngine.ts` (Contrato homologado da Fase 4.3)
- `src/services/competitionRuntimeService.ts` (Contrato homologado da Fase 4.8)
- `src/services/competitionBracketViewModel.ts` (Contrato homologado da Fase 4.9)
- `src/components/competition/bracket/GenericTournamentBracket.tsx` (Contrato homologado da Fase 4.9)
- Todas as migrations SQL existentes (20260905000001 a 20260905000008)

---

## 6. Riscos e Mitigações

1. **Risco de Duplicação de Regras:**
   *Mitigação:* O Format Builder produz **exclusivamente** instâncias de `CompetitionConfig`. Toda validação de grafos de fase delega para `StageGraph.validate()`.
2. **Risco de Modificação Pós-Congelamento:**
   *Mitigação:* `CompetitionLifecycleService.canEditRules()` é verificado tanto na renderização da UI quanto antes de salvar no `dataAccess`.
3. **Risco de Fake Teams:**
   *Mitigação:* O editor de feeds restringe opções estritamente às 8 variantes de `ParticipantReference` (`seed`, `group-position`, `overall-ranking`, `stage-position`, `match-winner`, `match-loser`, `resolved-team`, `bye`). Nenhuma string mágica como `TBD-A-1` é permitida.
4. **Risco de Poluição no Banco via Preview:**
   *Mitigação:* O preview executa apenas simulação em memória chamando `CompetitionBracketViewModelBuilder.build(...)` com coleções locais temporárias, sem persistir nenhuma linha em `matches` ou `competition_match_slots`.

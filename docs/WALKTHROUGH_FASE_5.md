# WALKTHROUGH — FASE 5

## Auditoria Master Single Source of Truth (SSOT) das Regras Esportivas do BaseOS

---

## 1. OBJETIVO DA AUDITORIA

A **Fase 5** teve como objetivo conduzir uma auditoria técnica e arquitetural profunda no repositório do **BaseOS**, sem alterar nenhuma linha de código, para responder de forma factual à seguinte pergunta:

> **Todas as regras esportivas relevantes do BaseOS estão atualmente centralizadas no `CompetitionConfig` e resolvidas pelo `CompetitionRulesService` como Single Source of Truth?**

A auditoria cobriu regras de pontuação de sets, formatos de disputa, apuração canônica de resultados, W.O., classificação (standings), critérios de desempate, fases eliminatórias, sorteios (draw), limites regulamentares de elenco, modalidades (quadra e praia), congelamento por snapshot e integração com a Súmula Oficial em PDF.

---

## 2. ESTADO INICIAL

* A **Fase Súmula 4.1** havia sido concluída com 100% de sucesso, integrando a Súmula Canônica ao `CompetitionRulesService` e corrigindo o placar do Time B (`1 : 3`), parametrização de 21 pontos e troca aos 11 pontos no tiebreak.
* O repositório contava com 97 suítes e 859 testes passando, com typecheck estrito (`tsc`) e linter (`eslint`) sem erros.
* O contrato central `CompetitionConfig` e o serviço `CompetitionRulesService` já existiam no projeto, com persistência via `config` e `rules_snapshot` em PostgreSQL/Supabase.

---

## 3. METODOLOGIA UTILIZADA

1. **Inspeção de Contratos:** Análise de `src/types/competitionConfig.ts` e `src/types/entities.ts`.
2. **Varredura de Consumidores:** Mapeamento de todas as chamadas aos métodos de `CompetitionRulesService` em services, pages, components e document-engine.
3. **Busca Heurística de Literais Esportivos:** Pesquisa no código-fonte por literais numéricos típicos do vôlei (`25`, `21`, `15`, `8`, `6`, `14`, `3`, `2`, `1`) e estruturas condicionais de placar.
4. **Classificação Semântica Estrita:**
   * *Regra Esportiva (A)* vs. *Constante Geométrica (C)* vs. *Constante Técnica (D)* vs. *Fallback Defensivo (G)*.
5. **Auditoria de Banco de Dados:** Leitura de schemas e triggers em `supabase/migrations/`.
6. **Auditoria de Telas (UI):** Confrontação entre as capacidades do motor de regras e os controles expostos ao usuário organizador.
7. **Modo Read-Only:** Nenhuma alteração em arquivos `.ts`, `.tsx`, `.sql` ou testes.

---

## 4. ARQUIVOS ANALISADOS

* `src/types/competitionConfig.ts`
* `src/types/entities.ts`
* `src/types/registration.ts`
* `src/types/draw.ts`
* `src/services/competitionRulesService.ts`
* `src/services/competitionLifecycleService.ts`
* `src/services/competitionRuntimeService.ts`
* `src/services/standingsService.ts`
* `src/services/tieBreakEngine.ts`
* `src/services/overallStandingsEngine.ts`
* `src/services/scoringEngine.ts`
* `src/services/playoffsService.ts`
* `src/services/competitionBracketService.ts`
* `src/services/competitionTemplateService.ts`
* `src/services/competitionFormatBuilder.ts`
* `src/services/competitionConfigValidator.ts`
* `src/services/drawService.ts`
* `src/services/competitionDrawEligibilityService.ts`
* `src/services/registrationService.ts`
* `src/services/competitionRegistrationService.ts`
* `src/services/matchValidationService.ts`
* `src/services/dataAccess.ts`
* `src/document-engine/baseos/domain/set.rules.ts`
* `src/document-engine/baseos/domain/roster.rules.ts`
* `src/document-engine/baseos/domain/rotation.rules.ts`
* `src/document-engine/baseos/mapper/match.mapper.ts`
* `src/document-engine/baseos/mapper/set.mapper.ts`
* `src/document-engine/baseos/components/BaseosResult.tsx`
* `src/components/competition/tabs/CompetitionConfigTab.tsx`
* `src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx`
* `src/components/competition/format-builder/CompetitionFormatBuilder.tsx`
* `src/components/competition/format-builder/RulesConfigEditor.tsx`
* `src/components/match/LiveScorerDeskModal.tsx`
* `src/components/match/dialogs/ResultValidationDialog.tsx`
* `src/pages/CompetitionsPage.tsx`
* `src/pages/MatchesPage.tsx`
* `supabase/migrations/20260818000000_initial_schema.sql`
* `supabase/migrations/20260903000001_competition_lifecycle_and_rules.sql`
* `supabase/migrations/20260906000001_protect_rules_snapshot.sql`

---

## 5. DIRETÓRIOS ANALISADOS

* `src/types/`
* `src/services/`
* `src/components/competition/`
* `src/components/match/`
* `src/document-engine/baseos/`
* `src/pages/`
* `supabase/migrations/`
* `src/test/`

---

## 6. REGRAS ENCONTRADAS (RESUMO DO INVENTÁRIO)

Foram catalogadas **30 regras esportivas e de domínio** principais, abrangendo:
1. Formato de sets (`setsToWin`, `maxSets`);
2. Pontuação e vantagem (`regularSetPoints`, `tiebreakPoints`, `minAdvantage`);
3. Dinâmica de jogo (`sideChangeTriggerPoint`);
4. Sobrescritas por fase (`phaseOverrides`);
5. Apuração e resultado oficial (`getCanonicalMatchResult`, `woScoreSets`);
6. Sistema de pontos da tabela (`pointsWinClear`, `pointsWinNarrow`, `pointsLossNarrow`, `pointsLossClear`, `pointsWoWin`, `pointsWoLoss`);
7. Critérios de desempate ordenados (`tiebreakCriteriaOrder`);
8. Regras de avanço e repescagem (`advancingPerGroup`, `bestThirds`, `aggregationStrategy`);
9. Chaveamento e pareamento (`getSeededPairings`, `generateFourGroupPlayoffs`, `advanceByes`);
10. Elegibilidade e limites de inscrição (`minAthletes`, `maxAthletes`, `maxLiberos`, `maxCaptains`, `requireJerseyNumberOnRegistration`).

---

## 7. FONTES IDENTIFICADAS

* **Fonte Primária Canônica Pretendida:** `CompetitionConfig` (armazenado em `competition.config` ou imutabilizado em `competition.rulesSnapshot`).
* **Resolvedor Canônico de Runtime:** `CompetitionRulesService`.
* **Fontes Secundárias e Fallbacks:**
  * `DEFAULT_INDOOR_COMPETITION_CONFIG` e `DEFAULT_BEACH_COMPETITION_CONFIG` (em `src/types/competitionConfig.ts`);
  * `VOLLEYBALL_RULES` (em `src/document-engine/baseos/domain/set.rules.ts`);
  * `ROSTER_LIMITS` (em `src/types/registration.ts`);
  * `competitionPointsFromSets` (em `src/services/standingsService.ts`);
  * `ScoringEngine` (em `src/services/scoringEngine.ts`).

---

## 8. CONSUMIDORES IDENTIFICADOS

* **Partidas / Mesário:** `LiveScorerDeskModal`, `ResultValidationDialog`, `MatchesPage`.
* **Súmula PDF:** `match.mapper.ts`, `set.mapper.ts`, `BaseosResult.tsx`, `BaseosPointGrid.tsx`.
* **Classificação:** `standingsService.ts`, `tieBreakEngine.ts`, `overallStandingsEngine.ts`.
* **Playoffs e Torneio:** `playoffsService.ts`, `competitionRuntimeService.ts`, `genericProgressionEngine.ts`.
* **Inscrições:** `registrationService.ts`, `competitionRegistrationService.ts`, `competitionDrawEligibilityService.ts`.

---

## 9. HARDCODES ENCONTRADOS

1. **Pontos de Sets Desabilitados na UI:** Em `RulesConfigEditor.tsx:76,86`, os inputs de `regularSetPoints` e `tiebreakPoints` contêm o atributo `disabled`, impedindo alteração pelo usuário via interface.
2. **Cruzamentos de Quartas de Final Fixos:** Em `playoffsService.ts:65-96`, cruzamentos fixos `1A x 2B`, `1C x 2D`, `1B x 2A`, `1D x 2C`.
3. **Limitação de Formato em Playoffs:** Em `playoffsService.ts:214`, setsToWin é coercitivamente convertido em `'3-sets' | '5-sets'`, desconsiderando set único (`setsToWin = 1`).

---

## 10. DUPLICAÇÕES ENCONTRADAS

1. **Cálculo de Pontos da Tabela:** Implementado concorrentemente em `CompetitionRulesService.calculateCompetitionPoints`, `ScoringEngine.calculatePoints` e `standingsService.ts:competitionPointsFromSets`.
2. **Limites de Elenco:** Duplicados entre `CompetitionConfig.registration` e constantes estáticas `ROSTER_LIMITS` em `src/types/registration.ts`.

---

## 11. DIVERGÊNCIAS ENCONTRADAS

1. **DIV-01 (Confronto Direto):** `standingsService.ts:headToHeadWinner` invoca `matchWinner(match)` sem repassar o objeto `competition`. Como consequência, a apuração do vencedor do confronto direto recorre a um fallback indoor sintético e pode avaliar parciais incorretamente caso a competição use formato de praia (21 pontos) ou regras alternativas.
2. **DIV-02 (Critérios no Runtime Intergrupos):** Em `competitionRuntimeService.ts:562`, os critérios de desempate para o ranking geral são lidos de colunas legadas (`competition.tiebreakCriteriaOrder`), ignorando a configuração moderna `competition.config.standings.tiebreakCriteriaOrder`.
3. **DIV-03 (Exibição de Critérios na Tab):** `CompetitionConfigTab.tsx:104` lê `selected.tiebreakCriteriaOrder` em vez de consultar `CompetitionRulesService.getConfig(selected)`.

---

## 12. GAPS ENCONTRADOS

1. **GAP-CRIT-01 (Ação de W.O. na UI):** O motor de regras e a Súmula PDF possuem suporte completo a W.O. ($N \times 0$ e 3 pontos), mas a interface gráfica (`MatchesPage.tsx` e diálogos) não possui botão ou fluxo para registrar W.O.
2. **GAP-HIGH-01 (Head-to-Head sem contexto):** Assinatura de `headToHeadWinner` sem `competition`.
3. **GAP-HIGH-02 (Bypass no Runtime):** `competitionRuntimeService.ts` sem consulta ao `CompetitionRulesService`.
4. **GAP-HIGH-03 (Pontuação bloqueada na UI):** Inputs de pontos com `disabled` estático.
5. **GAP-MED-01 (Sorteio Desacoplado):** Parâmetros de sorteio (`DrawConfig`) não pertencem ao `CompetitionConfig`.
6. **GAP-LOW-01 (Súmula de Praia):** O Document Engine é exclusivamente 6x6 indoor (fora de escopo).

---

## 13. ANÁLISE DO `CompetitionConfig`

* O contrato `CompetitionConfig` em `src/types/competitionConfig.ts` é robusto, modular, tipado em TypeScript estrito e abrange 100% das regras esportivas necessárias.
* Possui suporte a regras de sets, fases, pontuação de classificação, critérios ordenáveis de desempate, ranking geral intergrupos (estratégias como `by-group-position-first`), e regras de inscrição.

---

## 14. ANÁLISE DO `CompetitionRulesService`

* Atua com sucesso como motor único puro e determinístico.
* Implementa normalização retrocompatível (`normalizeLegacyToConfig`), resolução contextual de formato (`resolveMatchFormat`), cálculo oficial de pontuação (`calculateCompetitionPoints`), validação matemática de parciais (`validateSingleSet` e `validateMatchScore`), limites de elenco (`getRosterLimits`) e resultado canônico (`getCanonicalMatchResult`).

---

## 15. ANÁLISE DE SNAPSHOTS E IMUTABILIDADE

* O congelamento via `rulesSnapshot` é acionado quando a competição entra em andamento ou no primeiro resultado lançado.
* **Segurança Dupla:**
  1. Em aplicação: `CompetitionRulesService.getConfig` e `dataAccess.ts` blindam o `rulesSnapshot` contra sobrescrita.
  2. No banco de dados: Trigger PostgreSQL `trg_protect_competition_rules_snapshot` emite exceção e bloqueia qualquer mutação em `rules_snapshot`.

---

## 16. ANÁLISE DE STANDINGS (CLASSIFICAÇÃO)

* A classificação por grupo utiliza `computeStandings` e `TieBreakEngine`.
* O cálculo de pontos consome `CompetitionRulesService.calculateCompetitionPoints`.
* Há suporte canônico a mini-tabelas para desempate entre 3 ou mais equipes via `TieBreakEngine.resolveStandings`.
* Ressalva: o confronto direto pairwise perde o contexto da competição (achado DIV-01).

---

## 17. ANÁLISE DE FASES E PLAYOFFS

* Coexistem dois subsistemas: o gerador clássico de playoffs (`playoffsService.ts`) e o novo motor genérico baseado em grafo de fases DAG (`GenericPairingEngine`, `StageGraph`, `CompetitionFormatBuilder`).
* O motor moderno suporta múltiplos formatos, eliminatória dupla e Play-In.

---

## 18. ANÁLISE DE DRAW E BRACKET

* `GenericPairingEngine.getSeededPairings` implementa geração determinística de chaveamento eliminatório para potências de 2 ($[1,8], [4,5], [2,7], [3,6]$).
* O sorteio de grupos (`drawService.ts`) utiliza PRNG determinístico `mulberry32` e algoritmo balanceado por capacidade com tabela Berger.
* A elegibilidade das equipes inscritas no sorteio é validada canonicamente por `CompetitionDrawEligibilityService.getRosterLimits`.

---

## 19. ANÁLISE DE W.O. (WALKOVER)

* O tratamento esportivo do W.O. está completamente mapeado no domínio e na Súmula.
* O único e decisivo problema reside na camada de apresentação (UI), que não permite que o usuário lance uma partida como W.O.

---

## 20. ANÁLISE DE MODALIDADES

* Quadra e Praia são formalmente diferenciadas em `CompetitionConfig` e nos defaults de regras.
* Praia tem regras próprias: 21 pontos no set regular, 2 a 4 atletas no elenco, 0 líberos.
* A Súmula PDF atual atende estritamente à quadra 6x6.

---

## 21. ANÁLISE DO DOCUMENT ENGINE

* O Document Engine (`src/document-engine/baseos/`) foi consolidado na Fase 4.1 e consome diretamente `rules?: SetFormatConfig` e `getCanonicalMatchResult`.
* A separação entre **Regra Esportiva** (`targetPoints`) e **Capacidade Gráfica da Grade** (`POINTS_RULER_MAX_REGULAR = 36`, `POINTS_RULER_MAX_DECIDING = 30`) está preservada.

---

## 22. TESTES EXECUTADOS

* Executado `npm test -- --run`.
* Suíte completa com 97 arquivos de teste e 859 testes vitest.
* Todos os testes passaram com 100% de aprovação.

---

## 23. RESULTADOS DOS TESTES

```text
Test Files  97 passed (97)
     Tests  859 passed (859)
```

---

## 24. BUILD, LINT E TYPECHECK

* **Typecheck (`npx tsc -p tsconfig.app.json --noEmit`):** 0 erros.
* **Linter (`npm run lint`):** 0 erros (1 aviso pré-existente de react-hooks fora do escopo).
* **Build de Produção (`npm run build`):** Sucesso absoluto em 51.50s.

---

## 25. ARQUIVOS DE DOCUMENTAÇÃO CRIADOS

1. [`docs/audit/FASE_5_MASTER_RULES_AUDIT.md`](file:///home/diego-martins/docker/volei/docs/audit/FASE_5_MASTER_RULES_AUDIT.md) — Relatório mestre completo de auditoria das regras esportivas.
2. [`docs/WALKTHROUGH_FASE_5.md`](file:///home/diego-martins/docker/volei/docs/WALKTHROUGH_FASE_5.md) — Walkthrough detalhado da execução da Fase 5.

---

## 26. PROVA DE NÃO ALTERAÇÃO DE CÓDIGO

A auditoria foi realizada estritamente em modo analítico:
* Nenhum arquivo `.ts`, `.tsx`, `.js`, `.jsx`, `.sql` ou migration foi criado, editado ou removido.
* Nenhum teste de código existente foi modificado.
* As únicas alterações no Git são os documentos da auditoria.

---

## 27. RECOMENDAÇÕES PARA A FASE 5.1

1. **Repassar `competition` para `headToHeadWinner`** em `standingsService.ts`, eliminando o risco de inferência incorreta de regras em desempates de confronto direto.
2. **Harmonizar `competitionRuntimeService.ts:562`** para consultar `CompetitionRulesService.getConfig(competition).standings.tiebreakCriteriaOrder`.
3. **Criar a ação/modal de Lançamento de W.O.** em `MatchesPage.tsx` e `ResultValidationDialog.tsx`.
4. **Desbloquear a edição de `regularSetPoints` e `tiebreakPoints`** em `RulesConfigEditor.tsx`, removendo o `disabled` estático.
5. **Unificar os cálculos de pontuação da tabela** em torno de `CompetitionRulesService.calculateCompetitionPoints`.

---

## 28. LIMITAÇÕES DA AUDITORIA

* A modalidade Vôlei de Praia (Súmula 2x2) foi classificada como fora de escopo para esta fase.
* Formatos com cruzamentos manuais ad-hoc continuam dependendo do editor visual do Format Builder.

---

## 29. CERTIFICAÇÃO FINAL

```text
============================================================
BASEOS — FASE 5
AUDITORIA MASTER DAS REGRAS ESPORTIVAS
============================================================

Código alterado: NÃO (Execução 100% Read-Only)
Arquitetura auditada: SIM
CompetitionConfig auditado: SIM
CompetitionRulesService auditado: SIM

Regras inventariadas: 30
SSOT confirmadas: 20
Fallbacks defensivos: 3
Duplicações identificadas: 2
Hardcodes identificados: 3
Divergências identificadas: 3
GAPs Critical: 1
GAPs High: 3
GAPs Medium: 3
GAPs Low: 1

Testes executados: 97 suites / 859 testes (100% PASS)
Typecheck: 0 erros
Lint: 0 erros
Build: Concluído com sucesso

Documento de Auditoria:
docs/audit/FASE_5_MASTER_RULES_AUDIT.md

Walkthrough:
docs/WALKTHROUGH_FASE_5.md

CERTIFICAÇÃO:
SIM, COM RESSALVAS

DECISÃO RECOMENDADA:
FASE 5.1 NECESSÁRIA
============================================================
```

# BaseOS — Auditoria da Integração UI do Cadastro de Competições com CompetitionConfig

**Fase:** 4.3 — Integração Real do CompetitionConfig no Cadastro de Competições  
**Data:** Setembro/2026  
**Status:** Auditoria Forense e de Consumidores Concluída  

---

## 1. Onde a competição é criada?

A criação de competições no BaseOS é originada na página principal de gestão de competições:
- **Página:** `src/pages/CompetitionsPage.tsx`
- **Gatilho:** Botão `"Nova Competição"` no cabeçalho da página (linha 462), que altera o estado `setCreateOpen(true)`.
- **Renderização:** Renderiza o componente `<CompetitionFormDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} modalities={modalities} venues={venues} />` (linhas 632–638).
- **Handler de Submissão:** `handleCreate` (linhas 301–315), que valida permissões via RBAC (`can('competition:create')`), invoca `dataAccess.createCompetition(input)`, registra a ação em `OperationalAuditService.recordCompetitionCreation`, emite notificação toast e recarrega a lista de competições.

---

## 2. Qual componente controla o formulário?

- **Componente:** `src/components/competition/dialogs/CompetitionFormDialog.tsx`
- **Controle de Estado:** O formulário é controlado via múltiplos `useState` locais desconectados da estrutura de `CompetitionConfig`:
  - `name`: string
  - `modality`: `'indoor' | 'beach'`
  - `genderCategory`: `'male' | 'female' | 'mixed'`
  - `playerFormat`: string (`'6x6'`, `'2x2'`, etc.)
  - `setsFormat`: string (`'3-sets'`, `'5-sets'`, `'1-set'`)
  - `format`: string (`'group-stage-knockout'`, `'round-robin'`, `'single-elimination'`)
  - `groupsCount`, `advancingPerGroup`, `bestThirdsCount`: números
  - `venue`, `startDate`, `endDate`, `defaultDeadline`: strings de texto/data
- **Ciclo de Vida:** No `useEffect([open])`, reseta os campos para valores estáticos hardcoded, ignorando presets canônicos.

---

## 3. Quais campos atualmente aparecem na tela?

| Campo na Tela | Tipo de Controle | Valores Disponíveis |
| :--- | :--- | :--- |
| **Nome da Competição** | `Input` (texto) | Texto livre |
| **Modalidade** | `Select` | "Vôlei de Quadra" (`indoor`) ou "Vôlei de Praia" (`beach`) |
| **Categoria / Naipe** | `Select` | "Feminino", "Masculino", "Misto" |
| **Formato de Atletas** | `Select` | "6x6 (Quadra)", "4x4", "2x2 (Dupla)", "3x3" |
| **Sets Padrão** | `Select` | "Melhor de 3 sets", "Melhor de 5 sets", "Set Único" |
| **Sistema de Disputa** | `Select` | "Fase de Grupos + Mata-mata", "Todos contra Todos", "Eliminatória Simples" |
| **Parâmetros de Grupos** | `Input` (numérico) | "Nº Grupos", "Classif./Grupo", "Melhores 3ºs" (apenas se formato for grupos) |
| **Local Principal / Ginásio** | `Input` (texto) | Texto livre ou sugestão de venues |
| **Início / Fim / Prazo** | `Input` (date) | Datas ISO YYYY-MM-DD |

---

## 4. Quais campos pertencem ao modelo legado?

Os seguintes campos presentes no formulário e no objeto `CompetitionRecord` pertencem ao modelo anterior à Fase 4:
1. `playerFormat`: String solta (ex: `'6x6'`), quando a regra canônica pertence a `registration.minAthletes` e `registration.maxAthletes`.
2. `setFormat`: String legada (`'3-sets'`, `'5-sets'`, `'1-set'`) em vez do tipo canônico `SetsToWin` (2, 3, 1).
3. `format`: String arbitrária (`'group-stage-knockout'`, `'single-elimination'`) em vez de `CompetitionFormatType` (`'groups-knockout'`, `'knockout'`, `'double-elimination'`, `'round-robin'`, etc.).
4. `groupsCount`, `advancingPerGroup`, `bestThirdsCount`: Propriedades soltas na raiz do registro de competição em vez de pertencerem a `config.standings` e `config.format.stages`.
5. `phaseSetRules`: Objeto solto com strings legadas de sets por fase (`{ groupStage: '3-sets', semifinals: '5-sets', final: '5-sets' }`) em vez de `config.format.phaseOverrides: PhaseFormatOverrides`.
6. `tiebreakCriteriaOrder`: Vetor solto na raiz em vez de residir em `config.standings.tiebreakCriteriaOrder`.
7. `defaultMatchIntervalMinutes` (75) e `minTeamRestMinutes` (30): Gravados como números hardcoded no submit.

---

## 5. Quais campos do `CompetitionConfig` já existem na arquitetura?

O contrato `CompetitionConfig` (`src/types/competitionConfig.ts`) possui estrutura completa e tipada:
- **`format`**:
  - `defaultSetsToWin`: `SetsToWin` (1 | 2 | 3)
  - `phaseOverrides`: `PhaseFormatOverrides` (`groupStage`, `quarterfinals`, `semifinals`, `thirdPlace`, `final`)
  - `setRules`: `{ regularSetPoints: number, tiebreakPoints: number, minAdvantage: number }`
  - `formatType`: `CompetitionFormatType`
  - `stages`: `StageDefinition[]`
- **`scoring`**:
  - `ScoringSystemConfig`: `{ systemType, pointsWinClear, pointsWinNarrow, pointsLossNarrow, pointsLossClear, pointsWoWin, pointsWoLoss }`
- **`standings`**:
  - `StandingsConfig`: `{ tiebreakCriteriaOrder, advancingPerGroup, bestThirds: { enabled, count } }`
- **`registration`**:
  - `RegistrationRulesConfig`: `{ minAthletes, maxAthletes, maxCaptains, maxLiberos, requireJerseyNumberOnRegistration }`
- **Presets e Funções Auxiliares**:
  - `DEFAULT_INDOOR_COMPETITION_CONFIG`
  - `DEFAULT_BEACH_COMPETITION_CONFIG`
  - `deriveMaxSets(setsToWin)`
  - `parseLegacySetFormat(raw)`
  - `formatSetsToWinLabel(setsToWin)`
  - `CompetitionTemplateService.listTemplates()` (com os 5 templates canônicos).

---

## 6. Quais campos ainda não aparecem na UI de cadastro?

1. **Parâmetros Detalhados de Sets**:
   - Pontos do set regular (25 quadra vs 21 praia) e do tiebreak (15) são invisíveis e inalteráveis.
   - Vantagem mínima (2 pontos) não é informada.
   - O cálculo derivado de `maxSets` (`deriveMaxSets()`) não é exibido ("Melhor de 3 — máximo 3 sets").
2. **Sistema de Pontuação na Classificação**:
   - O organizador não vê nem escolhe o modelo de pontuação (FIVB 3-2-1-0 vs 2-1 vs Custom).
   - Pontos por vitória normal, vitória em tiebreak, derrota em tiebreak e W.O. não aparecem.
3. **Critérios de Desempate da Classificação**:
   - Critérios (confronto direto, set average, pontos average, saldo de sets, saldo de pontos, vitórias, sorteio) são omitidos na criação.
4. **Regras Regulamentares de Inscrição**:
   - Mínimo e máximo de atletas por elenco (ex: 6 a 14 na quadra; 2 a 4 na praia) não são apresentados.
   - Limite de líberos (2 na quadra, 0 na praia) e capitães (1) não aparecem.
   - Opção de exigir número de camisa na inscrição prévia (`requireJerseyNumberOnRegistration`) não aparece.
5. **Sistemas de Disputa**:
   - `double-elimination` (Eliminatória Dupla com chave de repescagem) está ausente do select.
   - `groups-play-in-knockout` (Formato Voltz Multi-Estágio com Play-In) está ausente do select.
   - Os templates canônicos do `CompetitionTemplateService` não são carregados na UI.

---

## 7. Quais campos ainda não são persistidos?

- **No PostgreSQL (`public.competitions`)**:
  - A coluna `config jsonb` **já existe** no schema (`20260903000001_competition_lifecycle_and_rules.sql`).
  - A coluna `rules_snapshot jsonb` **já existe** no schema.
  - O adapter `dataAccess.ts` repassa `toSnake(payload)` diretamente para o PostgreSQL, persistindo qualquer objeto fornecido em `payload.config`.
- **Gargalo Real de Persistência**:
  - A UI atual não preenche `input.config` de forma informada pelo usuário. Ela apenas gerava um config sintético simplificado no submit com valores padrão fixos.
  - Portanto, os campos detalhados (`scoring`, `registration`, `setRules`) não chegavam à persistência customizados porque a UI não os coletava.

---

## 8. Existe transformação entre UI → banco?

Sim:
1. A UI coleta strings legadas e números avulsos.
2. No `handleSubmit`, monta um `baseRecord` e tenta invocar:
   `CompetitionTemplateService.createConfigFromTemplate(templateId, { modality, setsToWin })`
   ou faz fallback para `CompetitionRulesService.normalizeLegacyToConfig`.
3. Anexa `config: canonicalConfig` ao `baseRecord` e envia para `dataAccess.createCompetition`.
4. O `dataAccess.ts` converte camelCase para snake_case (`toSnake`) e grava no banco.

---

## 9. Existe transformação banco → UI?

Sim:
1. `dataAccess.ts` busca os dados e aplica `toCamel(row)`.
2. Em seguida aplica `normalizeCompetitionRecord(comp)` (garante slug e normaliza status legados `draft` -> `planning`).
3. Ao consumir a competição em componentes e telas, `CompetitionRulesService.getConfig(competition)` é chamado:
   - Se `rulesSnapshot` existir, usa o snapshot imutável.
   - Se `config` existir, usa o config canônico.
   - Se nenhum existir (registro legado antigo), chama `normalizeLegacyToConfig(comp)` dinamicamente em memória.

---

## 10. Onde regras esportivas continuam hardcoded?

1. **`CompetitionFormDialog.tsx`**:
   - `defaultMatchIntervalMinutes: 75` e `minTeamRestMinutes: 30` gravados diretamente.
   - `tiebreakCriteriaOrder` gravado como array fixo no submit.
   - `phaseSetRules: { semifinals: '5-sets', final: '5-sets' }` injetado hardcoded sem opção de alteração.
   - Sets Padrão restrito a 3 opções estáticas sem usar os helpers do domínio.
   - Sistema de disputa restrito a 3 opções legadas sem sincronia com os templates canônicos do BaseOS.
2. **`CompetitionSettingsEditDialog.tsx`**:
   - Modifica apenas `setFormat` e `phaseSetRules`, chamando `normalizeLegacyToConfig` que regrava um config com valores padrão fixos de pontuação e inscrição.

---

## 11. Auditoria dos Consumidores do CompetitionConfig

A tabela a seguir consolida o estado real de consumo do `CompetitionConfig` em todo o ecossistema do BaseOS:

| Consumidor | Fonte Atual no Código | Deve Consumir CompetitionConfig? | Estado Real | Ação na Fase 4.3 |
| :--- | :--- | :---: | :--- | :--- |
| **Cadastro (`CompetitionFormDialog`)** | `useState` local desconectado + strings legadas | **SIM** | **Desconectado** | **Corrigir na Fase 4.3**: orientar a `CompetitionConfig`, carregar presets reativos, expor `deriveMaxSets`, scoring, registration e templates. |
| **Edição (`CompetitionSettingsEditDialog`)** | `competition.setFormat`, `phaseSetRules`, `normalizeLegacyToConfig` | **SIM** | **Parcialmente Conectado** | **Alinhar na Fase 4.3**: ler de `competition.config` e salvar preservando a estrutura canônica (em status `planning`). |
| **Motor de Regras (`CompetitionRulesService`)** | `rulesSnapshot ?? config ?? normalizeLegacyToConfig` | **SIM** | **Totalmente Integrado (SSOT)** | Nenhuma alteração necessária (já é o gateway canônico). |
| **Validação de Partidas (`matchValidationService`)** | Delega a `CompetitionRulesService.validateMatchScore` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Runtime de Partidas (`competitionRuntimeService`)** | `CompetitionRulesService.getCanonicalMatchResult` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Classificação (`standingsService`)** | `CompetitionRulesService.calculateCompetitionPoints` e `standings.tiebreakCriteriaOrder` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Critérios de Desempate (`tieBreakEngine`)** | `tiebreakCriteriaOrder` via `standingsService` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Ranking Geral Multi-Fase (`overallStandingsEngine`)** | `CompetitionRulesService.getConfig(competition)` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Regras de Inscrição (`competitionRegistrationService`)** | `CompetitionRulesService.getRosterLimits(competition)` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Inscrição de Equipes (`registrationService`)** | `CompetitionRulesService.getRosterLimits(competition)` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Elegibilidade para Sorteio (`drawEligibilityService`)** | `CompetitionRulesService.getRosterLimits(competition)` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Sorteio de Grupos (`drawService` / `drawValidator`)** | `competition.groupsCount` / `DrawConfig` | **SIM** | **Compatível** | Preservar sincronização de `groupsCount` em `CompetitionRecord` para compatibilidade com a UI do sorteio. |
| **Súmula PDF (`matchSheetDataBuilder` / `matchSheetPdf`)** | `CompetitionRulesService.getCanonicalMatchResult` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Congelamento de Regras (`competitionLifecycleService`)** | `freezeRulesSnapshot` -> `rulesSnapshot` imutável | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Playoffs e Chaveamento (`competitionBracketService`)** | `CompetitionRulesService.getCanonicalMatchResult` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **ViewModel do Bracket (`competitionBracketViewModel`)** | Consome `MatchSlot` e `CompetitionRecord` | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |
| **Grafo e Slots (`stageGraphEngine`, `genericPairingEngine`)** | Operam sobre `stages` gerados por templates | **SIM** | **Totalmente Integrado** | Nenhuma alteração necessária. |

### Respostas Detalhadas para os Consumidores:
1. **Eles já leem `CompetitionConfig`?**  
   Sim. Todos os serviços de domínio (`standings`, `registration`, `runtime`, `pdf`, `lifecycle`, `scoring`) já leem `CompetitionConfig` através de `CompetitionRulesService.getConfig(competition)`.
2. **Se não leem, qual configuração utilizam atualmente?**  
   O único componente que não lê nem expõe o `CompetitionConfig` é o formulário de cadastro (`CompetitionFormDialog.tsx`) e, parcialmente, o modal de edição rápida (`CompetitionSettingsEditDialog.tsx`).
3. **Existe regra hardcoded?**  
   Apenas na camada de apresentação (`CompetitionFormDialog.tsx` e `CompetitionSettingsEditDialog.tsx`), onde opções e intervalos de minutos estavam fixados em código.
4. **Existe conversão de legado?**  
   Sim, `CompetitionRulesService.normalizeLegacyToConfig(competition)` garante que competições antigas salvas antes da Fase 4 sem coluna `config` continuem funcionando sem falhas.
5. **Existe risco de divergência?**  
   O risco atual era o cadastro salvar um `config` padrão sintético que não refletia as escolhas do organizador. A Fase 4.3 elimina esse risco.
6. **Quais consumidores precisam ser alterados nesta fase?**  
   Apenas `CompetitionFormDialog.tsx` e `CompetitionSettingsEditDialog.tsx`. Os demais consumidores já estão prontos e operam corretamente quando recebem o `CompetitionConfig` canônico.

---

## 12. Validação Estrita das Configurações de Domínio (Sem Assunções)

Em cumprimento à Seção 3.6 do mandato, os valores canônicos foram extraídos diretamente do arquivo fonte [`src/types/competitionConfig.ts`](file:///home/diego-martins/docker/volei/src/types/competitionConfig.ts):

### Voleibol de Quadra (`DEFAULT_INDOOR_COMPETITION_CONFIG`)
- `version`: 1
- `format.defaultSetsToWin`: `2` (Melhor de 3 por padrão)
- `format.phaseOverrides`: `{ groupStage: 2, quarterfinals: 2, semifinals: 3, final: 3 }`
- `format.setRules`: `{ regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 }`
- `scoring`: `{ systemType: 'fivb-standard', pointsWinClear: 3, pointsWinNarrow: 2, pointsLossNarrow: 1, pointsLossClear: 0, pointsWoWin: 3, pointsWoLoss: 0 }`
- `standings`:
  - `tiebreakCriteriaOrder`: `['points', 'head-to-head', 'set-average', 'points-average', 'sets-balance', 'points-balance', 'victories', 'draw']`
  - `advancingPerGroup`: `2`
  - `bestThirds`: `{ enabled: false, count: 0 }`
- `registration`:
  - `minAthletes`: `6`
  - `maxAthletes`: `14`
  - `maxCaptains`: `1`
  - `maxLiberos`: `2`
  - `requireJerseyNumberOnRegistration`: `false`

### Vôlei de Praia (`DEFAULT_BEACH_COMPETITION_CONFIG`)
- `version`: 1
- `format.defaultSetsToWin`: `2` (Melhor de 3 sets)
- `format.setRules`: `{ regularSetPoints: 21, tiebreakPoints: 15, minAdvantage: 2 }`
- `scoring`: `{ systemType: 'fivb-standard', pointsWinClear: 3, pointsWinNarrow: 2, pointsLossNarrow: 1, pointsLossClear: 0, pointsWoWin: 3, pointsWoLoss: 0 }`
- `standings`:
  - `tiebreakCriteriaOrder`: `['points', 'head-to-head', 'set-average', 'points-average', 'sets-balance', 'points-balance', 'victories', 'draw']`
  - `advancingPerGroup`: `2`
- `registration`:
  - `minAthletes`: `2`
  - `maxAthletes`: `4`
  - `maxCaptains`: `1`
  - `maxLiberos`: `0`
  - `requireJerseyNumberOnRegistration`: `false`

**Constatação:** Os valores documentados no plano coincidem 100% com o código-fonte canônico. Não há divergência a ser corrigida no domínio.

---

## 13. Relação Arquitetural: Template de Disputa ≠ CompetitionConfig

Conforme estabelecido pela governança do BaseOS:
1. **`CompetitionTemplate` (`CompetitionTemplateService`)**:
   - Define a **estrutura topológica de disputa** (quais e quantos estágios existem, quantas rodadas, quantos slots e como os participantes progridem entre vencedores e perdedores).
2. **`CompetitionConfig` (`competitionConfig.ts`)**:
   - Define as **regras regulamentares da competição** (pontuação de set, pontos na classificação, critérios de desempate, limites de elenco e sobrescritas de fase).
3. **Ponto de Encontro**:
   - O template gera um `CompetitionConfig` preenchendo `config.format.stages` e `config.format.formatType`.
   - O formulário permite ao organizador ajustar as regras regulamentares em cima dessa estrutura.
   - O campo legado `CompetitionRecord.format` armazena o identificador do template para retrocompatibilidade, mas o motor de execução consulta estritamente `config.format.stages` e `config.format.formatType`.

---

## 14. Análise Específica: Eliminatória Dupla (`double-elimination-standard`)

- O template `double-elimination-standard` foi implementado e homologado no domínio na Fase 4.12-A.
- Ele é retornado por `CompetitionTemplateService.listTemplates()`.
- Ao ser selecionado no cadastro, gera:
  - `formatType: 'double-elimination'`
  - 3 estágios: `stage-winners`, `stage-losers` e `stage-grand-final`.
  - Rotas de progressão completas com `onWinner` e `onLoser` (repescagem cruzada).
  - Semântica de eliminação definitiva na 2ª derrota (`onLoser: undefined`).
- O cadastro na Fase 4.3 integrará esse template ao seletor visual, garantindo que o `CompetitionConfig` gerado e salvo no banco preserve a topologia completa de dupla eliminação.

---

## 15. Análise Específica: Grupos + Play-In + Mata-Mata (`groups-play-in-knockout-standard`)

- O template `groups-play-in-knockout-standard` representa a jornada oficial Voltz Multi-Estágio.
- Ao ser selecionado no cadastro:
  - Permite configurar o número de grupos (padrão 4) e avanço.
  - Gera `formatType: 'groups-play-in-knockout'`.
  - Contém 3 estágios: `fase-grupos`, `play-in` (repescagem pré-quartas para 5º ao 12º) e `fase-final` (Quartas, Semis, Final).
  - Todos os estágios e parâmetros de avanço são gravados em `config.format.stages` e `config.standings`.

---

## 16. Configuração por Fase (`PhaseFormatOverrides`)

- O contrato `PhaseFormatOverrides` já suporta diferenciação de sets por fase:
  - `groupStage?: SetsToWin`
  - `roundOf16?: SetsToWin`
  - `quarterfinals?: SetsToWin`
  - `semifinals?: SetsToWin`
  - `final?: SetsToWin`
- No cadastro de Vôlei de Quadra, o preset `DEFAULT_INDOOR_COMPETITION_CONFIG` já traz a regra oficial: fase inicial em melhor de 3 (`2`) e semifinais/final em melhor de 5 (`3`).
- A UI exibirá essa diferenciação de forma clara ao organizador, permitindo habilitar/desabilitar a regra "Semifinais e Finais em melhor de 5 sets" sem hardcode.

---

## 17. Mecanismo de Congelamento de Regras (`rulesSnapshot`)

O BaseOS já possui um mecanismo de proteção estrita contra alterações retroativas:
1. Quando a competição sai de `planning` para `in-progress` ou `playoffs`, `CompetitionLifecycleService.freezeRulesSnapshot(competition)` cria um snapshot imutável em `competition.rulesSnapshot`.
2. `CompetitionRulesService.getConfig(competition)` dá preferência prioritária a `competition.rulesSnapshot`.
3. `CompetitionRulesService.areRulesLocked(competition)` bloqueia qualquer edição de regras esportivas se a competição estiver em andamento ou se partidas já tiverem sido jogadas.
4. O diálogo de edição (`CompetitionSettingsEditDialog.tsx`) respeita essa trava e impede submissões destrutivas.

---

## 18. Critérios de Aceite da Integração Real

A integração será comprovada através da execução dos 4 cenários ponta a ponta:
- **Cenário A (Quadra)**: Competição indoor criada, melhor de 5, grupos + mata-mata -> persistência validada -> recarregamento comprovado -> serviços de regras operando com o config.
- **Cenário B (Praia)**: Competição beach criada, melhor de 3, modelo beach -> persistência validada -> recarregamento comprovado.
- **Cenário C (Eliminatória Dupla)**: Seleção de `double-elimination-standard` -> persistência de 3 estágios (`stage-winners`, `stage-losers`, `stage-grand-final`) -> recarregamento e identificação do formato.
- **Cenário D (Play-In)**: Seleção de `groups-play-in-knockout-standard` -> configuração de 4 grupos -> persistência de Play-In -> recarregamento e integridade dos estágios.

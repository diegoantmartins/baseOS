# BASEOS — FASE 4.1
# AUDITORIA DO DOMÍNIO DE COMPETIÇÃO E PLANEJAMENTO DA NOVA ARQUITETURA

> **Data:** 03 de Setembro de 2026  
> **Status:** Concluído (Diagnóstico Somente-Leitura e Planejamento Arquitetural)  
> **Sistema:** BaseOS — Gestão de Competições Esportivas (React 18 + Vite 5 + TypeScript + Supabase/LocalStorage)

---

## 1. Resumo Executivo

O **BaseOS** é um sistema SaaS de gestão de competições esportivas voltado para voleibol de quadra e praia. A auditoria técnica profunda realizada nesta fase analisou de ponta a ponta o ciclo de vida da competição, formatos de disputa, regras de sets, motor de pontuação, classificação, geração de partidas, chaveamento eliminatório, sorteio (Draw), motor de documentos/PDFs e o portal da equipe.

### Principais Diagnósticos:
1. **Inexistência de Fonte Única da Verdade para Regras Esportivas**: As regras do torneio estão pulverizadas e desconectadas. A pontuação é fixa na fórmula matemática do `standingsService` (3-2-1-0); os limites de elenco estão hardcoded em `registrationService` e em uma RPC SQL do PostgreSQL; os formatos de sets estão dispersos em strings abertas (`'3-sets'`, `'5-sets'`, `'best-of-5'`); e o formato das finais sofre de inconsistência lógica.
2. **Abstração Desconectada**: O tipo `CompetitionRules` presente em `src/types/volleyball.ts` é código morto, não sendo consumido pelos serviços ativos nem persistido no banco de dados. A aplicação opera sobre `src/types/entities.ts` e `src/types/registration.ts`.
3. **Divergência Severa entre TypeScript e Supabase**: O adaptador LocalStorage persiste objetos JSON completos, mas as migrations SQL do Supabase estão defasadas em relação ao modelo TypeScript em mais de 14 colunas essenciais (`phase_set_rules`, `tiebreak_criteria_order`, `courts_count`, `groups_count`, etc.).
4. **Vulnerabilidade de Integridade em Competições Ativas**: A interface administrativa permite alterar formatos de sets (`setFormat`, `phaseSetRules`) a qualquer momento, mesmo após dezenas de jogos já homologados e concluídos, corrompendo a integridade histórica.

---

## 2. Arquitetura Atual

A estrutura real do projeto `src/` está organizada da seguinte forma:

```text
src/
├── components/          # Componentes visuais por domínio
│   ├── auth/            # Autenticação e controle de acesso
│   ├── common/          # Componentes compartilhados e diálogos de confirmação
│   ├── competition/     # Abas, cards, diálogos e cabeçalho da competição
│   ├── draw/            # Módulo de Sorteio (3D Three.js, HUD, controles de timing)
│   ├── layout/          # Estrutura de navegação (Sidebar, MainLayout)
│   ├── match/           # Mesa ao vivo, súmula, check-in e filtros
│   ├── registration/    # Inscrição online e formulário de atletas
│   └── ui/              # Design System BaseOS (Radix UI + Tailwind)
├── config/              # Feature flags e constantes globais (ex: drawArenaFeatures.ts)
├── data/                # Mock inicial (seed.ts) e artigos de ajuda
├── document-engine/     # Novo motor PDF de alta precisão (schemas, generators, templates)
├── hooks/               # Hooks de RBAC (useCapability) e operações
├── lib/                 # Utilitários de segurança, auditoria e geradores PDF legados
├── pages/               # 23 páginas do ecossistema
├── services/            # 18 serviços contendo a lógica de negócio e data access
├── test/                # 58 arquivos de testes Vitest (jsdom)
└── types/               # 9 arquivos de tipagem TypeScript
```

---

## 3. Modelo Atual de Competição

A entidade em tempo de execução é `CompetitionRecord` (`src/types/entities.ts`):

* **Tabela Supabase correspondente**: `public.competitions` (`supabase/migrations/20260818000000_initial_schema.sql`).
* **Campos principais**: `id`, `name`, `modality`, `format`, `playerFormat`, `setFormat`, `genderCategory`, `status`, `groupsCount`, `teamsPerGroup`, `advancingPerGroup`, `bestThirdsCount`, `tiebreakCriteriaOrder`, `phaseSetRules`, `defaultMatchIntervalMinutes`, `minTeamRestMinutes`.
* **Persistência**: Operada via `dataAccess.ts`. Em LocalStorage salva o JSON bruto; em Supabase converte via `toSnake()`, perdendo campos não mapeados no SQL.
* **Relacionamentos**:
  - 1 Competição → N Inscrições (`competition_teams`).
  - 1 Competição → N Partidas (`matches`).
  - 1 Competição → 1 Sorteio (`draws`).

### Respostas às Questões Fundamentais:
* **4.1 Onde está a fonte atual das regras?** Pulverizada entre `entities.ts` (definição de campos), `matchValidationService.ts` (sets e pontuações), `standingsService.ts` (pontuação da tabela), `registrationService.ts` (elenco) e `playoffsService.ts` (cruzamentos).
* **4.2 Existe objeto equivalente a `CompetitionConfig`?** Não. Apenas campos avulsos na raiz de `CompetitionRecord`.
* **4.3 Existe `CompetitionRules`?** Sim, em `src/types/volleyball.ts`, mas é código morto sem uso prático.
* **4.4 Onde se determina melhor de 3 ou 5?** Em múltiplos pontos: `comp.setFormat`, `comp.phaseSetRules`, `match.customSetFormat` e em ternários ad-hoc nos diálogos.
* **4.5 Onde se determinam sets para vencer?** Hardcoded em `matchValidationService.ts`: `config.setFormat === '5-sets' ? 3 : 2`.
* **4.6 Onde estão as regras de pontuação?** Na função `competitionPointsFromSets` em `standingsService.ts`.
* **4.7 Onde estão os critérios de desempate?** Em `standingsService.ts:evaluateSingleCriterion()`.
* **4.8 Onde estão as fases?** Em `playoffsService.ts` e `drawService.ts`.
* **4.9 Regras duplicadas?** Detecção de vencedor de set replicada em 5 arquivos; limites de elenco repetidos no frontend e em trigger SQL.

---

## 4. Configuração Atual

No cadastro (`CompetitionFormDialog.tsx`):
- O usuário preenche nome, modalidade, naipe, formato de atletas e formato padrão de sets.
- O diálogo injeta silenciosamente valores fixos:
  - Critérios de desempate fixos com `'victories'` antes de average.
  - Formato de semifinais e finais forçado para `'5-sets'`.
- Na edição posterior (`CompetitionSettingsEditDialog.tsx`):
  - Permite alterar formatos de sets sem verificar se a competição já teve jogos iniciados.

---

## 5. Regras de Partida

* O sistema **não utiliza** `setsToWin`.
* O sistema opera com strings: `'3-sets'`, `'5-sets'`, e em alguns testes `'best-of-5'`, `'best-of-3'`.
* **Ocorrências de lógica `if` identificadas**:
  - `matchValidationService.ts`: `const requiredWins = config.setFormat === '5-sets' ? 3 : 2;`
  - `matchValidationService.ts`: `const maxPossibleSets = config.setFormat === '5-sets' ? 5 : 3;`
  - `matchValidationService.ts`: `const isTiebreak = (config.setFormat === '5-sets' && i === 4) || (config.setFormat === '3-sets' && i === 2);`
  - `competitionReadinessService.ts`: `setFormat === '5-sets' ? 'Melhor de 5' : 'Melhor de 3'`
  - `documentEditorService.ts`: `ctx.competitionSetFormat === '5-sets' || match.sets.length > 3 ? '5-sets' : '3-sets'`
  - `matchSheetPdf.ts`: `const maxSets = data.format === '5-sets' ? 5 : data.format === '3-sets' ? 3 : data.format === '2-sets' ? 3 : 1;`

### Impacto da Mudança para `setsToWin`:
- `setsToWin = 2` → Melhor de 3 (`maxSets = 3`).
- `setsToWin = 3` → Melhor de 5 (`maxSets = 5`).
- `setsToWin = 1` → Set Único (`maxSets = 1`).
- **Fórmula Geral**: `maxSets = (setsToWin * 2) - 1`.
- **Avaliação de Impacto**: Altamente positivo. Elimina strings mágicas, unifica a detecção do tiebreak (`tiebreakSetIndex = maxSets - 1`) e permite suportar festivais de 1 set sem código condicional extra.

---

## 6. Classificação

* **Local de Cálculo**: `src/services/standingsService.ts` (`computeStandings`).
* **Cálculo de Pontos da Tabela**: Executado por `competitionPointsFromSets()`:
  - Vitória por margem de 1 set (3x2 ou 2x1) = 2 pontos.
  - Vitória por margem ≥ 2 sets (3x0, 3x1, 2x0) = 3 pontos.
  - Derrota por margem de 1 set (2x3 ou 1x2) = 1 ponto.
  - Derrota por margem ≥ 2 sets (0x3, 1x3, 0x2) = 0 pontos.
* **Problema**: A regra de pontuação é **hardcoded**. Se o organizador definir que vitórias valem 2 pontos e derrotas 1 ponto (modelo escolar clássico), o sistema não atende.
* **Colunas da Tabela**: Exibidas em `StandingsTable.tsx`:
  - `Pos`, `Equipe`, `J`, `V`, `D`, `Sets (P-C)` com ratio, `Saldo Sets`, `Pontos (P-C)` com ratio, `Saldo Pts`, `PTS`.
  - Não há colunas dedicadas de placar detalhado (3x0, 3x1, etc.); os sets são agregados diretamente.

---

## 7. Critérios de Desempate

A ordenação oficial do motor segue `DEFAULT_TIEBREAK_CRITERIA` (`standingsService.ts`):
1. Pontos na Tabela (`points`)
2. Confronto Direto (`head-to-head`) — restrito a 2 equipes
3. Set Average / Razão de Sets (`set-average`)
4. Pontos Average / Razão de Pontos (`points-average`)
5. Saldo de Sets (`sets-balance`)
6. Saldo de Pontos (`points-balance`)
7. Número de Vitórias (`victories`)
8. Sorteio Determinístico (`draw`)

* **Problema Identificado**: No cadastro de competições, a ordem salva por padrão coloca `'victories'` em 2º lugar, contrariando o regulamento oficial FIVB/CBV adotado no próprio serviço.

---

## 8. Equipes e Inscrições

* **Estrutura Relacional**:
  - `TeamRecord`: Agremiação (dados perenes do clube).
  - `CompetitionTeam`: Inscrição da equipe no torneio (com token público e deadline).
  - `CompetitionAthlete`: Atletas inscritos no elenco daquela competição.
* **Avaliação**: O modelo relacional suporta com sucesso o reaproveitamento de equipes em múltiplos torneios.
* **Gargalos Detectados**:
  - O grupo da equipe não é persistido em `competition_teams`. O sistema deduz o grupo inspecionando partidas criadas ou joga tudo no Grupo A.
  - Não há vínculo com cadastro geral de pessoas físicas (`persons`), exigindo redigitação dos atletas a cada nova competição.

---

## 9. Portal da Equipe

Acessado via `/equipe/inscricao/:token` (`TeamRosterRegistrationPage.tsx`).

### Classificação Funcional:
* **ESSENCIAL**:
  - Gestão de Atletas do Elenco (inclusão/edição/remoção).
  - Indicação de Capitão e Líberos.
  - Envio e Bloqueio Oficial do Elenco.
  - Exportação da Ficha de Posição / Ordem de Saque para o jogo.
  - Visualização dos Próximos Jogos da Equipe (horário e quadra).
* **ÚTIL**:
  - Tabela de Classificação do Grupo.
  - Relação Nominal em PDF.
  - Notificações de alteração de jogos.
* **ADMINISTRATIVA / DESNECESSÁRIA**:
  - Emissão de Boletins Gerais da Competição (deve ficar no painel do organizador).
  - Gerenciamento de súmulas oficiais fechadas.

---

## 10. PDFs e Documentos

* **Novo Document Engine** (`src/document-engine/`):
  - `sumula3.generator.ts`: Súmula vetorial de 3 sets.
  - `sumula5.generator.ts`: Súmula vetorial de 5 sets.
  - `ordemSaque.generator.ts`: Ficha de posição I..VI.
* **Geradores Legados** (`src/lib/pdf/`):
  - `matchSheetPdf.ts`: Súmula P&B A4.
  - `reportsPdf.ts`: Classificação e boletins.
* **Dependência das Regras**:
  - A escolha do template do documento depende de `match.format === '3-sets' ? sumula3 : sumula5`. Sem regras claras, geram-se documentos inconsistentes com o número real de sets.

---

## 11. Draw / Sorteio

* Motor: `drawService.ts` com PRNG determinístico `mulberry32` e chaveamento Berger.
* O sorteio recebe `DrawConfig` com `groupsCount`, mas não valida se esse valor é compatível com a configuração cadastrada na competição.
* As propostas de partidas geradas pelo sorteio não injetam regras específicas de sets nas partidas.

---

## 12. Supabase

Mapeamento do schema atual vs TypeScript:

| Tabela | Finalidade | Campos Principais | Lacunas no Banco (Supabase) |
|---|---|---|---|
| `competitions` | Torneios | `id`, `name`, `modality`, `format`, `status` | **Faltam 14 colunas**: `phase_set_rules`, `tiebreak_criteria_order`, `courts_count`, `groups_count`, `teams_per_group`, `advancing_per_group`, `best_thirds_count`, etc. |
| `teams` | Clubes | `id`, `name`, `short_name`, `modality`, `logo_url` | Faltam dados cadastrais do gestor (`manager_name`, `manager_email`, `status`). |
| `competition_teams` | Inscrições | `id`, `competition_id`, `team_id`, `access_token` | **Falta coluna `group_name`**. |
| `competition_athletes` | Elencos | `id`, `competition_team_id`, `name`, `jersey_number` | RPC `register_athlete` tem limite fixo de 14 atletas hardcoded. |
| `matches` | Partidas | `id`, `competition_id`, `sets` (JSONB), `status` | Faltam `custom_set_format`, `is_wo`, `homologated_at`, `lineups`. |
| `draws` | Sorteio | `id`, `competition_id`, `config`, `groups`, `matches` | JSONB puro, sem chaves estrangeiras. |

---

## 13. Testes Existentes

* Total de 58 arquivos de testes no Vitest.
* **Protegidos**: Validação de sets de 25/15 pts (`matchValidationService.test.ts`), pontuação 3-2-1-0 e critérios de desempate (`standingsService.test.ts`), ciclo de vida (`competitionLifecycleService.test.ts`), sorteio e PRNG (`drawService.test.ts`).
* **Lacunas**: Não há testes para campeonatos com `setsToWin = 1`, nem para tabelas com regras de pontuação customizadas ou bloqueio de edição de regras pós-início.

---

## 14. Tabela de Problemas Encontrados

| Severidade | Problema | Local | Impacto | Recomendação |
|---|---|---|---|---|
| **CRÍTICO** | **Pontuação de tabela hardcoded** | `standingsService.ts:73` | Impossibilita torneios escolares ou amadores com regras de pontos diferentes de 3-2-1-0. | Tornar a pontuação dependente de `CompetitionRules.scoring`. |
| **CRÍTICO** | **Divergência grave entre TypeScript e Supabase** | `initial_schema.sql` vs `entities.ts` | 14 colunas essenciais inexistem no PostgreSQL, causando perda silenciosa de dados no Supabase. | Criar migration de atualização das colunas de `competitions`. |
| **CRÍTICO** | **Ausência de congelamento de regras esportivas** | `CompetitionsPage.tsx:312` | Organizadores podem alterar formatos de sets com torneios em andamento. | Implementar trava de imutabilidade e snapshot de regras. |
| **CRÍTICO** | **Grupo da equipe não é persistido na inscrição** | `competition_teams` | Classificação deduz grupo via partidas. Se não há partidas, falha para 'Grupo A'. | Adicionar coluna `group_name` em `competition_teams`. |
| **ALTO** | **Strings arbitrárias para formato de sets** | Vários arquivos (`'3-sets'`, `'best-of-5'`) | Fragilidade semântica e erros de digitação em runtime. | Migrar para `setsToWin: 1 \| 2 \| 3`. |
| **ALTO** | **Bug lógico na final dos Playoffs** | `playoffsService.ts:214` | Se houver regra de semis, a regra da final é ignorada. | Centralizar resolução de formato no `CompetitionRulesService`. |
| **ALTO** | **Lançador de placar ignora customSetFormat da partida** | `ResultValidationDialog.tsx:19` | Partidas de mata-mata com formato próprio perdem a validação correta. | Consumir formato resolvido da partida. |
| **ALTO** | **Limites de elenco fixos em 14 atletas** | `registration.ts` e trigger SQL | Impede competições com regulamentos de 18 atletas ou praia com 4. | Tornar limites de elenco configuráveis na competição. |
| **MÉDIO** | **Critérios de desempate divergentes no cadastro** | `CompetitionFormDialog.tsx:79` | Salva ordem diferente do padrão oficial do serviço. | Unificar constante padrão de desempate. |
| **MÉDIO** | **Código morto em `volleyball.ts`** | `src/types/volleyball.ts:114` | Tipo `CompetitionRules` não utilizado gera confusão. | Limpar ou reaproveitar na nova arquitetura. |

---

## 15. Arquitetura Proposta

```text
                     COMPETIÇÃO
                         │
                         ▼
                 COMPETITION CONFIG
                         │
                         ▼
             COMPETITION RULES SERVICE
      (Motor puro, determinístico e testável)
     ┌───────────────┬─────────────────┬───────────────┐
     ▼               ▼                 ▼               ▼
  MATCHES        STANDINGS          REPORTS           DRAW
 (Validação,     (Pontuação,      (Súmula PDF,     (Critérios,
   Mesa ao       Desempate,       Classificação,   Capacidade,
    Vivo)        Classificação)     Boletins)       Chaveamento)
```

---

## 16. Modelo Proposto de `CompetitionConfig`

```ts
export type SetsToWin = 1 | 2 | 3;

export interface SetFormatConfig {
  setsToWin: SetsToWin;
  maxSets: number;                     // (setsToWin * 2) - 1
  regularSetPoints: number;            // 25 (quadra) ou 21 (praia)
  tiebreakPoints: number;              // 15
  minAdvantage: number;                // 2
}

export interface PhaseFormatOverrides {
  groupStage?: SetsToWin;
  roundOf16?: SetsToWin;
  quarterfinals?: SetsToWin;
  semifinals?: SetsToWin;
  thirdPlace?: SetsToWin;
  final?: SetsToWin;
}

export interface ScoringSystemConfig {
  systemType: 'fivb-standard' | 'simple' | 'win-loss';
  pointsWinClear: number;             // ex: 3 pts (3x0, 3x1)
  pointsWinNarrow: number;            // ex: 2 pts (3x2)
  pointsLossNarrow: number;           // ex: 1 pt (2x3)
  pointsLossClear: number;            // ex: 0 pts (0x3, 1x3)
  pointsWoWin: number;                // ex: 3 pts
  pointsWoLoss: number;               // ex: 0 pts
}

export interface StandingsConfig {
  tiebreakCriteriaOrder: TiebreakCriterionId[];
  advancingPerGroup: number;
  bestThirds?: {
    enabled: boolean;
    count: number;
  };
}

export interface RegistrationRulesConfig {
  minAthletes: number;
  maxAthletes: number;
  maxCaptains: number;
  maxLiberos: number;
  requireJerseyNumberOnRegistration: boolean;
}

export interface CompetitionConfig {
  version: number;
  format: {
    defaultSetsToWin: SetsToWin;
    phaseOverrides?: PhaseFormatOverrides;
    setRules: {
      regularSetPoints: number;
      tiebreakPoints: number;
      minAdvantage: number;
    };
  };
  scoring: ScoringSystemConfig;
  standings: StandingsConfig;
  registration: RegistrationRulesConfig;
}
```

---

## 17. `CompetitionRulesService`

O serviço conterá as seguintes funções puras:
- `getConfig(competition)`: Resolve a configuração da competição (com fallback normalizador para dados legados).
- `resolveMatchFormat(competition, phase)`: Retorna `SetFormatConfig` para a partida com base na fase.
- `calculateCompetitionPoints(competition, setsWon, setsLost, isWo)`: Calcula pontos da tabela conforme a regra da competição.
- `validateMatchScore(competition, sets, phase, isWo)`: Validação matemática estrita do placar.
- `getRosterLimits(competition)`: Retorna limites de elenco parametrizados.
- `areRulesLocked(competition, matchesCount)`: Indica se as regras da competição estão congeladas para alteração.

---

## 18. Estados da Competição e Matriz de Permissões

| Estado | Formato de Sets | Pontuação / Desempate | Estrutura de Fases | Inscrições |
|---|---|---|---|---|
| **DRAFT / PLANNING** | Permitido | Permitido | Permitido | Bloqueado |
| **REGISTRATION_OPEN** | Permitido | Permitido | Permitido | Permitido |
| **REGISTRATION_CLOSED** | Permitido | Permitido | Permitido | Bloqueado |
| **DRAW_PENDING / GROUPS_DEFINED** | Permitido | Permitido | **Bloqueado** | Bloqueado |
| **IN_PROGRESS (Jogos iniciados)** | **BLOQUEADO** | **BLOQUEADO** | **BLOQUEADO** | Bloqueado |
| **PLAYOFFS** | **BLOQUEADO** | **BLOQUEADO** | **BLOQUEADO** | Bloqueado |
| **COMPLETED** | **BLOQUEADO** | **BLOQUEADO** | **BLOQUEADO** | Bloqueado |
| **ARCHIVED** | **BLOQUEADO** | **BLOQUEADO** | **BLOQUEADO** | Bloqueado |

---

## 19. Estratégia de Congelamento de Regras

- **Snapshot Imutável**: Quando a primeira partida de uma competição for iniciada ou homologada, a configuração atual é serializada em `rules_snapshot` (coluna JSONB na competição).
- **Consumo Prioritário**: O `CompetitionRulesService` lê prioritariamente o `rules_snapshot`. Isso protege a integridade histórica de edições acidentais no cadastro.

---

## 20. Plano de Migração

1. **Passo 1**: Tipos e Contratos (`src/types/competitionConfig.ts`).
2. **Passo 2**: Implementação e Testes do `CompetitionRulesService`.
3. **Passo 3**: Adaptação do `matchValidationService` para consumir o novo serviço.
4. **Passo 4**: Adaptação do `standingsService` para consumir o cálculo parametrizado de pontos.
5. **Passo 5**: Adaptação do `registrationService` para ler limites da competição.
6. **Passo 6**: Adaptação do `document-engine` e PDFs para o formato unificado.
7. **Passo 7**: Adaptação do `drawService` e `playoffsService`.
8. **Passo 8**: Atualização dos diálogos de cadastro e edição (`CompetitionFormDialog`, `CompetitionSettingsEditDialog`).
9. **Passo 9**: Criação de migration SQL no Supabase para alinhamento relacional.

---

## 21. Arquivos que Provavelmente Serão Criados

* `src/types/competitionConfig.ts`
* `src/services/competitionRulesService.ts`
* `src/test/competitionRulesService.test.ts`
* `supabase/migrations/20260905000000_competition_rules_and_fields.sql`

---

## 22. Arquivos que Provavelmente Serão Modificados

* `src/types/entities.ts`
* `src/services/matchValidationService.ts`
* `src/services/standingsService.ts`
* `src/services/registrationService.ts`
* `src/services/playoffsService.ts`
* `src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx`
* `src/components/match/dialogs/ResultValidationDialog.tsx`
* `src/document-engine/generators/index.ts`

---

## 23. Arquivos que Devem Ser Preservados

* `src/services/dataAccess.ts` (manter as assinaturas do adapter).
* `src/services/drawService.ts` (algoritmo PRNG `mulberry32` determinístico e Berger).
* `src/document-engine/generators/sumula3.generator.ts` e `sumula5.generator.ts` (calibração de coordenadas vetoriais).
* `src/components/draw/cinematic/DrawArenaCanvas.tsx` (apresentação 3D).

---

## 24. Riscos

1. **Risco de Quebra dos 58 Testes Existentes**: Alterações em assinaturas de funções de classificação ou validação podem gerar quebras em cascata.
   - *Mitigação*: Manter wrappers compatíveis com legado nas funções antigas de `standingsService` e `matchValidationService`.
2. **Compatibilidade com LocalStorage Existente**: Dados pré-existentes de torneios não possuem o objeto `config`.
   - *Mitigação*: O `CompetitionRulesService` conterá um normalizador transparente em memória para torneios criados em versões anteriores.

---

## 25. Critérios de Aceite da Futura Implementação

1. **Fonte Única de Regras**: Cálculo de pontuação, formatos de sets e limites de elenco geridos exclusivamente pelo `CompetitionRulesService`.
2. **Suporte Nativo a `setsToWin`**: Formatos baseados em `setsToWin: 1, 2, 3` com derivação de `maxSets`.
3. **Bloqueio de Regras**: Proibição de alteração de regras esportivas em competições com partidas em andamento ou finalizadas.
4. **100% de Sucesso nos Testes**: Todas as 58 suítes de testes do Vitest passando sem regressões.
5. **Preservação de Dados**: Compatibilidade total com dados em LocalStorage e no seed de demonstração.

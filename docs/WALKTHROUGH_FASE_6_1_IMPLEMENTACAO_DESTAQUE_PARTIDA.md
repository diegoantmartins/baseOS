# BASEOS — FASE 6.1: WALKTHROUGH DE IMPLEMENTAÇÃO DO DOMÍNIO DE DESTAQUE DA PARTIDA (MVP)

**Sistema:** BaseOS — Gestão de Competições de Voleibol (Quadra e Praia)  
**Fase:** 6.1 — Implementação Oficial do Domínio de Destaque da Partida (MVP)  
**Status:** CONCLUÍDO E HOMOLOGADO EM DESENVOLVIMENTO  
**Data:** 10 de Setembro de 2026  
**Ambiente:** Linux (x86_64), Node.js, Vite, React 18, TypeScript, Supabase, Vitest  

---

## 1. AUDITADO (Inspeção Pré-Implementação)

Antes de alterar qualquer arquivo, foi realizada a auditoria detalhada do repositório real:
1. **SSOT de Regras Esportivas:** `CompetitionRulesService` é a única autoridade das regras de competição (`getCanonicalMatchResult`, `resolveMatchFormat`). O cálculo de classificação oficial e desempates canônicos é preservado intacto.
2. **Separação com a Fase 5:** Os arquivos probabilísticos (`ClassificationProbabilityService`, `classificationProbability.ts`, `src/test/classificationProbability.test.ts`) foram rigorosamente mantidos **CONGELADOS**. O cálculo do MVP não interfere nas simulações Monte Carlo.
3. **SSOT de Equipe do Atleta:** Foi verificado que `CompetitionAthlete` já possui `competitionTeamId` vinculado à equipe da competição (`competitionTeams`), que por sua vez referencia `teamId`. Portanto, a criação de `highlightTeamId` no banco, no domínio ou no DTO foi categoricamente **REJEITADA**, prevenindo anomalias de split-brain.
4. **YAGNI para Observações:** O campo `highlightNotes` foi descartado conforme decisão arquitetural da Fase 6.0, visto que a súmula já possui `observations` (`BaseosRemarks`).
5. **Geometria de Súmula A4 Paisagem:** Inspecionou-se a geometria aprovada de `BaseosThreeSetScoresheet.tsx` e `BaseosFiveSetScoresheet.tsx`. O MVP foi integrado exclusivamente como nota oficial no campo de observações (`BaseosRemarks` via `match.mapper.ts`), sem alterar qualquer coordenada ou dimensão dos modelos visuais.
6. **Prevenção contra PGRST204:** O adaptador `src/services/dataAccess.ts` envia payloads para o Supabase via PostgREST. A passagem de propriedades virtuais ou com valor `undefined` causa erro `PGRST204 (column does not exist)`. O adaptador foi projetado para sanitizar os payloads e suportar a limpeza segura de campos anuláveis (`null`).

---

## 2. IMPLEMENTADO (Arquitetura e Código)

A implementação foi conduzida nas camadas de banco de dados, domínio, persistência, serviços, relatórios, súmula digital e interfaces administrativas e públicas:

### 2.1 Schema & Migração Supabase
- **Arquivo:** `supabase/migrations/20260910000002_match_highlight_athlete.sql`
  - Adiciona `highlight_athlete_id text REFERENCES public.competition_athletes(id) ON DELETE SET NULL` na tabela `public.matches`.
  - Cria índice condicional `idx_matches_highlight_athlete_id` para consultas de performance.
  - Scripts 100% idempotentes com `IF NOT EXISTS`.

### 2.2 Tipos do Domínio
- **Arquivo:** `src/types/entities.ts`
  - Adicionado `highlightAthleteId?: string;` à interface canônica `MatchRecord`.
  - Zero menção a `highlightTeamId` ou `highlightNotes`.

### 2.3 Camada de Acesso a Dados e Sanitização PGRST204
- **Arquivo:** `src/services/dataAccess.ts`
  - No `localBackend`: `updateMatch` preserva e atualiza `highlightAthleteId`, permitindo limpeza explícita com `null`.
  - No `supabaseBackend`: Sanitização estrita de `rawPayload` em `createMatch` e `updateMatch`, expurgando chaves `undefined` e mapeando `highlight_athlete_id: null` quando expressamente limpado pelo operador, eliminando riscos de erro `PGRST204`.

### 2.4 Serviço de Validação e Derivação Canônica
- **Arquivo:** `src/services/matchValidationService.ts`
  - Implementada a função `validateMatchHighlight(match, highlightAthleteId, teamAAthletes, teamBAthletes)`:
    - Retorna `valid: true` se o destaque for omitido/vazio (estritamente opcional).
    - Bloqueia seleção em partidas decididas por W.O. (`isWo: true` ou `status: 'wo'`).
    - Exige que o atleta pertença ao elenco de A ou B daquela partida/competição.
    - Se a partida tiver `checkedInAthleteIds`, valida que o atleta esteve presente na súmula/check-in presencial.
  - Implementada a função `deriveHighlightAthleteInfo(highlightAthleteId, teamAAthletes, teamBAthletes, match)`:
    - Deriva em tempo de execução o atleta, lado (`A` ou `B`), `teamName` e `teamShortName` sem necessidade de coluna redundante `highlightTeamId`.

### 2.5 Modal Administrativo de Validação de Resultados
- **Arquivo:** `src/components/match/dialogs/ResultValidationDialog.tsx`
  - Carrega dinamicamente os elencos oficiais de ambas as equipes via `getMatchRosters(match.id)`.
  - Disponibiliza campo `<Select>` estilizado no Design System Enterprise Dark com grupos separados para "Equipe A" e "Equipe B".
  - Opção neutra "Nenhum (sem destaque)".
  - Desabilita a seleção e limpa o estado automaticamente se o checkbox de W.O. estiver marcado.
  - Executa a validação de domínio em tempo real e exibe alerta caso haja irregularidade.
  - Callback `onSaved` expandido para `(sets, winnerId, highlightAthleteId?: string)`.

### 2.6 Gestão de Partidas e Fluxo de Homologação
- **Arquivo:** `src/pages/MatchesPage.tsx`
  - Linhas 1030-1045: `handleSaveScore` persiste `highlightAthleteId` via `dataAccess.updateMatch`.
  - `handleHomologate`: oficializa a partida e consolida o destaque com metadados de auditoria (`homologatedAt`, `homologatedBy`).
  - `handleReopenMatch`: reabre a partida para `status: 'completed'`, mantendo o estado da partida e permitindo edição ou remoção do destaque no diálogo antes de nova homologação.

### 2.7 Contrato de Relatórios e Boletim Oficial
- **Arquivos:** `src/lib/pdf/types.ts` e `src/lib/pdf/reportsPdf.ts`
  - Interface `MatchBoletimRow` enriquecida com `highlightAthleteName?: string;` e `highlightTeamShort?: string;`.
- **Arquivo:** `src/pages/ReportsPage.tsx`
  - Projeta `highlightAthleteName` e `highlightTeamShort` apenas para partidas homologadas.
- **Arquivo:** `src/components/report/MatchesBoletimView.tsx`
  - Exibe na célula de situação o badge discreto `⭐ [highlightAthleteName] ([highlightTeamShort])`.

### 2.8 Document Engine & Súmula BaseOS
- **Arquivo:** `src/document-engine/baseos/mapper/match.mapper.ts`
  - Mapeia o destaque da partida adicionando ao campo `observations` (`BaseosRemarks`) o texto padronizado:  
    `"Destaque da Partida (MVP): #[jersey] [Nome] ([SiglaEquipe])"`.
  - Preserva 100% da geometria A4 das súmulas oficiais de 3 e 5 sets.

### 2.9 Central Oficial de Súmulas e Card Social
- **Arquivo:** `src/pages/MatchSheetPage.tsx`
  - Deriva `highlightAthlete` e `highlightTeamName` a partir dos elencos carregados.
  - No banner de partida homologada, renderiza o badge de destaque com ícone `Trophy`.
  - Passa `mvpName`, `mvpNumber` e `mvpTeam` para o componente `MatchSocialCard`.

### 2.10 Portais Públicos e Proteção LGPD
- **Arquivo:** `src/services/publicCompetitionService.ts`
  - No DTO `PublicMatchDTO`, adicionado `highlightAthlete?: { name: string; jerseyNumber?: number; teamName: string; } | null;`.
  - **Regra de Sigilo:** O destaque só é projetado no bundle se `canonical.isHomologated === true`. Partidas em andamento ou finalizadas sem homologação omitem o campo.
  - **Regra LGPD:** Apenas `name`, `jerseyNumber` e `teamName` são expostos; nenhum dado sensível (documento, data de nascimento, telefone) é transmitido.
- **Arquivo:** `src/pages/PublicCompetitionPage.tsx`
  - Renderiza badge dourado do destaque nos cards detalhados das partidas homologadas.
- **Arquivo:** `src/pages/TeamRosterRegistrationPage.tsx`
  - Na aba "Jogos", exibe o destaque com badge estilizado, realçando em dourado quando o atleta pertence à equipe autenticada.

---

## 3. VALIDADO (Testes Automatizados e Homologação)

### 3.1 Suíte de Testes do Domínio de Destaque
- **Arquivo criado:** `src/test/matchHighlightDomain.test.ts` (19 testes dedicados):
  - **Requisito A:** Atleta da Equipe A elegível e validado com sucesso.
  - **Requisito B:** Atleta da Equipe B elegível e validado com sucesso.
  - **Requisito C:** Atleta de equipe externa (não pertence a A nem B) categoricamente rejeitado.
  - **Requisito D:** Atleta de outra competição rejeitado.
  - **Requisito E:** Check-in presencial respeitado (atleta sem check-in quando há registro presencial é rejeitado).
  - **Requisito F:** Partida com W.O. rejeita qualquer destaque da partida.
  - **Requisito G:** Destaque estritamente opcional (partida validada e homologada sem MVP).
  - **Requisito H:** Atleta da equipe vencedora pode ser eleito destaque.
  - **Requisito I:** Atleta da equipe perdedora PODE ser eleito destaque (regra explícita BaseOS).
  - **Requisito J:** SSOT de equipe verificado (derivação dinâmica, zero coluna `highlightTeamId`).
  - **Requisito K:** Persistência e recuperação no `dataAccess` (`updateMatch`, `getMatch`, `listMatches`).
  - **Requisito L:** Reabertura de partida (`status: 'completed'`) preserva o estado prévio e permite alteração ou remoção.
  - **Requisito M:** Homologação oficializa o destaque junto aos metadados de auditoria.
  - **Requisito N:** Portal público e LGPD (oculto antes da homologação, exposto de forma segura após homologação).
  - **Requisito O:** Suporte a voleibol indoor (6x6) com anotação em observações da súmula.
  - **Requisito P:** Suporte a voleibol de praia (beach 2x2) sem dependência de rotação ou líberos.
  - **Requisito Q:** Isolamento multitenant entre competições distintas.
  - **Requisito R:** Proteção de schema e adapter contra `PGRST204` (sanitização de chaves `undefined`).

### 3.2 Resultados dos Comandos Oficiais de Verificação
1. **Typecheck TypeScript:**
   ```bash
   npx tsc -p tsconfig.app.json --noEmit
   # Resultado: Código de saída 0 (Zero erros)
   ```
2. **ESLint:**
   ```bash
   npm run lint
   # Resultado: Código de saída 0 (Zero erros, 1 warning pré-existente no DrawArenaCanvas)
   ```
3. **Vitest (Suíte Completa):**
   ```bash
   npm test
   # Resultado: 106 arquivos de teste aprovados (106 passed)
   #            975 testes aprovados (975 passed, 0 failed)
   ```
4. **Build de Produção:**
   ```bash
   npm run build
   # Resultado: Código de saída 0 (Build gerado com sucesso em 56.06s)
   ```

---

## 4. PENDENTE
- **Nenhum.** Todos os 27 requisitos da Fase 6.1 foram implementados, testados e validados.

---

## 5. CHECKLIST OFICIAL DE CONFIRMAÇÃO (27 ITENS)

| Item | Descrição | Status |
| :--- | :--- | :---: |
| 01 | `highlightAthleteId` implementado no domínio (`MatchRecord`) e no schema SQL | [x] Confirmado |
| 02 | `highlightTeamId` **NÃO EXISTE** em nenhuma camada do sistema | [x] Confirmado |
| 03 | `highlightNotes` **NÃO EXISTE** em MVP V1 (YAGNI respeitado) | [x] Confirmado |
| 04 | Migration `20260910000002_match_highlight_athlete.sql` criada com DDL idempotente | [x] Confirmado |
| 05 | `dataAccess.ts` sanitiza chaves `undefined` prevenindo erro PGRST204 | [x] Confirmado |
| 06 | `matchValidationService.ts` exporta `validateMatchHighlight` validando elenco de A ou B | [x] Confirmado |
| 07 | `validateMatchHighlight` valida check-in presencial quando existente na partida | [x] Confirmado |
| 08 | `validateMatchHighlight` bloqueia atribuição de destaque em partidas por W.O. | [x] Confirmado |
| 09 | `validateMatchHighlight` aceita `undefined`/vazio (campo estritamente opcional) | [x] Confirmado |
| 10 | `deriveHighlightAthleteInfo` deriva `teamName`, `teamShortName` e `side` sem coluna redundante | [x] Confirmado |
| 11 | `ResultValidationDialog` renderiza `<Select>` com optgroups para Equipe A e Equipe B | [x] Confirmado |
| 12 | `ResultValidationDialog` desabilita e limpa o destaque se W.O. for acionado | [x] Confirmado |
| 13 | `ResultValidationDialog` carrega elencos oficiais via `getMatchRosters(match.id)` | [x] Confirmado |
| 14 | `ResultValidationDialog.onSaved` passa `highlightAthleteId` para o chamador | [x] Confirmado |
| 15 | `MatchesPage.tsx` salva `highlightAthleteId` na validação de placar | [x] Confirmado |
| 16 | `handleReopenMatch` preserva estado e permite alteração/remoção antes de re-homologar | [x] Confirmado |
| 17 | `MatchBoletimRow` possui `highlightAthleteName` e `highlightTeamShort` em `reportsPdf.ts` e `types.ts` | [x] Confirmado |
| 18 | `ReportsPage.tsx` alimenta campos do boletim apenas para partidas homologadas | [x] Confirmado |
| 19 | `MatchesBoletimView.tsx` renderiza badge discreto do MVP no relatório HTML | [x] Confirmado |
| 20 | `match.mapper.ts` mapeia o destaque para `observations` sem alterar geometria da súmula | [x] Confirmado |
| 21 | Modelos visuais A4 landscape (`BaseosThreeSetScoresheet`, `BaseosFiveSetScoresheet`) intactos | [x] Confirmado |
| 22 | `publicCompetitionService.ts` projeta `highlightAthlete` **apenas** com `isHomologated: true` | [x] Confirmado |
| 23 | DTO público expõe apenas `name`, `jerseyNumber` e `teamName` (LGPD compliance) | [x] Confirmado |
| 24 | `PublicCompetitionPage.tsx` renderiza badge do destaque nos confrontos homologados | [x] Confirmado |
| 25 | `TeamRosterRegistrationPage.tsx` exibe badge do MVP na aba de jogos | [x] Confirmado |
| 26 | `MatchSheetPage.tsx` conecta `mvpName`, `mvpNumber` e `mvpTeam` no `MatchSocialCard` | [x] Confirmado |
| 27 | Suíte de testes `src/test/matchHighlightDomain.test.ts` cobre todos os requisitos A-R | [x] Confirmado |

---
*Homologação de Engenharia de Software concluída com sucesso.*

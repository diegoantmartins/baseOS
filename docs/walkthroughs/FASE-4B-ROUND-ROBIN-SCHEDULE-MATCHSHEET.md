# EXECUTION WALKTHROUGH — FASE 4B

**Projeto:** BaseOS (`diegoantmartins/volleyscore-hub`)  
**Workspace:** `/home/diego-martins/docker/volei`  
**Data:** 22 de Setembro de 2026  
**Status:** CONCLUÍDO (STOP GATE ATIVADO)  
**Commits Realizados:**
- `3ca6086` — `feat(competition): complete round-robin and unify schedule`
- `77bc4d6` — `fix(match-sheet): enforce side-out rotation and set validation`

---

## 1. Objetivo

Executar e consolidar a Fase 4B do BaseOS aprovada no Design Review, abrangendo três domínios críticos:
1. **Domínio 1 — Round-Robin / Pódio / Completion:** Permitir que competições de fase única (pontos corridos / todos contra todos) transitem formalmente de `in-progress` para `completed` quando todas as partidas estiverem concluídas/homologadas, apurando o pódio (1º ao 4º lugar) via `standingsService` e `TieBreakEngine` (mini-tabela oficial), sem depender artificialmente de partidas com `phase === 'final'` e sem permitir avanço indevido se houver jogos pendentes ou playoffs configurados.
2. **Domínio 2 — Schedule Engine Unificado:** Criar motor puro de ordenação canônica de agenda de jogos (`sortScheduleMatches`) e integrá-lo em todos os consumidores da aplicação (`MatchesPage`, `PublicCompetitionPage` via `publicCompetitionService`, `ReportsPage`, `TeamPortalPage`), eliminando ordenações ad-hoc divergentes e preservando a identidade estável das partidas.
3. **Domínio 3 — MatchSheet Interface / Side-out / Validação de Sets:** Adequar a máquina de estado do placar às regras oficiais da FIVB/CBV (apenas a equipe receptora que vence o rally roda no side-out; equipe sacadora mantém saque sem rodar; rotação reseta entre sets) e delegar a validação de parciais diretamente ao motor canônico `CompetitionRulesService.validateSingleSet`.

---

## 2. Estado Inicial

- **Commit Base:** `10ab28b95ffcc6411df922fcc9a2de7e138c3bd9` (`chore(schema): restore homologation and security migration parity`).
- **Working Tree:** Preservação estrita das alterações uncommitted das Fases anteriores (Portal da Equipe e Identidade Fase 11).
- **Gargalo Identificado:** Torneios de formato round-robin ficavam bloqueados na Etapa 12/13 do `competitionReadinessService`, `computePodium` retornava vazio por falta de partida `final`, e `MatchSheetInterface` continha regra de rotação invertida e validação de set desacoplada da SSOT.

---

## 3. Arquivos Analisados

- `src/services/playoffsService.ts`
- `src/services/competitionLifecycleService.ts`
- `src/services/competitionReadinessService.ts`
- `src/services/standingsService.ts`
- `src/services/tieBreakEngine.ts`
- `src/services/competitionRulesService.ts`
- `src/services/competitionTemplateService.ts`
- `src/types/competitionConfig.ts`
- `src/types/entities.ts`
- `src/pages/CompetitionsPage.tsx`
- `src/pages/MatchesPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/services/publicCompetitionService.ts`
- `src/components/match-sheet/MatchSheetInterface.tsx`

---

## 4. Diagnóstico

1. **Round-Robin Completion Block:** `computePodium` em `playoffsService.ts` buscava estritamente `m.phase === 'final'`. Em ligas round-robin sem fase eliminatória, o campeão nunca era encontrado, bloqueando a Etapa 13 e a transição para `completed`. Adicionalmente, a Etapa 12 de prontidão gerava tarefa bloqueadora exigindo mata-mata mesmo para torneios de fase única.
2. **Dispersão de Critérios de Agenda:** Cada página (`MatchesPage`, `ReportsPage`, `publicCompetitionService`, `TeamPortalPage`) ordenava jogos de modo diferente (`scheduledTime` local vs string, sem critério de quadra natural nem desempate estável por `matchNumber`).
3. **Inversão da Regra de Saque (MatchSheet):** O `MatchSheetInterface.tsx` rodava a equipe sacadora quando ela pontuava (`servingTeam === team`), violando o princípio elementar do voleibol onde a rotação ocorre exclusivamente no **side-out** (conquista do saque pela equipe receptora).
4. **Desacoplamento de Regras no MatchSheet:** O fechamento de set no MatchSheet não consultava `CompetitionRulesService.validateSingleSet`, permitindo placares irregulares ou com vantagem matemática incorreta.

---

## 5. Arquitetura Adotada

- **Single Source of Truth (SSOT):** `CompetitionRulesService` é o árbitro canônico para resolver formatos (`resolveMatchFormat`), validar sets (`validateSingleSet`) e verificar se a competição é de fase única (`isSingleStageRoundRobin`).
- **Motor Canônico de Classificação:** `computePodium` consome diretamente `standingsService.computeStandings` configurado com `{ useMiniTable: true }`, garantindo que critérios oficiais de desempate e mini-tabela do `TieBreakEngine` governem a apuração do pódio.
- **Função Pura e Imutável de Agenda:** `sortScheduleMatches` opera sem efeitos colaterais, aplicando ordenação canônica multinível: `round ASC` → `scheduledTime ASC` → `court ASC (alfanumérico natural)` → `matchNumber ASC`.
- **Integridade Transicional de Ciclo de Vida:** `CompetitionLifecycleService.validateTransition` e `getNextRecommendedStatus` passam a reconhecer torneios de fase única para avançar de `in-progress` diretamente para `completed`, enquanto rejeitam enfaticamente que torneios com mata-mata pulem a fase eliminatória.

---

## 6. Arquivos Criados

1. `src/services/scheduleService.ts` — Motor puro de ordenação canônica de agenda esportiva.
2. `src/test/scheduleSortingEngine.test.ts` — 9 testes unitários cobrindo todos os cenários e edge cases de ordenação de partidas.
3. `src/test/roundRobinPodiumAndLifecycle.test.ts` — 7 suítes com 12 casos de teste cobrindo ciclo de vida de 5 equipes / 10 partidas, pódio, tie-break, idempotência e bloqueio de mata-mata.
4. `src/test/matchSheetRulesValidation.test.ts` — 11 testes unitários validando sets pela SSOT e regras de side-out / rotação.

---

## 7. Arquivos Modificados

1. `src/services/competitionRulesService.ts` — Adição do método canônico `isSingleStageRoundRobin`.
2. `src/services/playoffsService.ts` — Evolução de `computePodium` para suportar round-robin via `standingsService`.
3. `src/services/competitionLifecycleService.ts` — Atualização de `getNextRecommendedStatus` e `validateTransition`.
4. `src/services/competitionReadinessService.ts` — Desbloqueio da Etapa 12 para round-robin e passagem de `competition` no `computePodium` da Etapa 13.
5. `src/pages/CompetitionsPage.tsx` — Passagem de `selected` ao `computePodium` e persistência do pódio na conclusão.
6. `src/pages/MatchesPage.tsx` — Integração de `sortScheduleMatches` no `matchViews`.
7. `src/services/publicCompetitionService.ts` — Integração de `sortScheduleMatches` em `getPublicBundle` e `getPublicMatches`.
8. `src/pages/ReportsPage.tsx` — Integração de `sortScheduleMatches` no boletim geral, escala de arbitragem e agenda diária.
9. `src/pages/portal/TeamPortalPage.tsx` — Integração de `sortScheduleMatches` na exportação de boletim e detecção do próximo jogo.
10. `src/components/match-sheet/MatchSheetInterface.tsx` — Correção de side-out, rotação e delegação de fechamento de set à SSOT.

---

## 8. Funções Criadas

- `sortScheduleMatches(matches: MatchRecord[]): MatchRecord[]` (`src/services/scheduleService.ts`)
- `CompetitionRulesService.isSingleStageRoundRobin(competition?: CompetitionRecord | null, matches?: MatchRecord[]): boolean` (`src/services/competitionRulesService.ts`)
- `isSingleStageRoundRobin(...)` helper exportado.

---

## 9. Funções Alteradas

- `computePodium(matches: MatchRecord[], competition?: CompetitionRecord)` (`src/services/playoffsService.ts`)
- `CompetitionLifecycleService.getNextRecommendedStatus(current, competition?, matches?)` (`src/services/competitionLifecycleService.ts`)
- `CompetitionLifecycleService.validateTransition(competition, targetStatus, context)` (`src/services/competitionLifecycleService.ts`)
- `evaluateCompetitionReadiness(data)` (`src/services/competitionReadinessService.ts`)
- `MatchSheetInterface.addPoint(team: 'A' | 'B')` (`src/components/match-sheet/MatchSheetInterface.tsx`)
- `MatchSheetInterface.endSet()` (`src/components/match-sheet/MatchSheetInterface.tsx`)

---

## 10. Funções Removidas

- Nenhuma função pública foi removida; retrocompatibilidade 100% preservada.

---

## 11. Lógica de Detecção Round-Robin

A detecção de torneio de fase única NÃO depende isoladamente de `competition.format === 'round-robin'`. A verificação em `CompetitionRulesService.isSingleStageRoundRobin` avalia:
1. **Presença real de partidas eliminatórias:** Se existirem partidas com fase `oitavas`, `quartas`, `semi`, `semifinal`, `final`, `terceiro_lugar`, `playoff`, `repescagem`, `play-in` ou `knockout`, o torneio é tratado como possuindo mata-mata.
2. **Estágios declarados no `rulesSnapshot` / `config`:** Se houver qualquer `stage` com `type === 'knockout'`, `play-in` ou `third-place`, preserva o fluxo de playoffs.
3. **Formatos macro:** Formatos como `groups-knockout`, `knockout`, `groups-play-in-knockout` e `double-elimination` são impedidos de ser rebaixados acidentalmente a round-robin.
4. **Verificação afirmativa:** Se o formato for expressamente `round-robin`, possuir estágio único de grupo ou todas as partidas forem de fase regular e sem eliminatórias configuradas, é classificado com segurança como fase única.

---

## 12. Lógica de Completion

- Se todas as partidas obrigatórias estiverem finalizadas (`completed` ou `homologated`): permite transição para `completed`.
- Se houver partida pendente: bloqueia `completed` com erro explícito informando a quantidade de jogos em aberto.
- Se houver playoffs configurados: `validateTransition` bloqueia a tentativa de pular diretamente para `completed` a partir de `in-progress`.
- Idempotência: execuções repetidas da validação produzem o mesmo checklist e os mesmos resultados sem auditorias ou mutações espúrias.

---

## 13. Lógica de Pódio

Em `computePodium(matches, competition)`:
- Para competições de fase única:
  1. Verifica se todas as partidas foram concluídas. Se houver jogos em aberto, retorna pódio vazio (evita atribuição prematura).
  2. Extrai as equipes participantes em `syntheticTeams` (preservando o contrato de interface da função).
  3. Aciona `computeStandings(standingInputs, matches, { competition, useMiniTable: true })`.
  4. Extrai o 1º (Campeão), 2º (Vice), 3º (Terceiro) e 4º (Quarto) lugares oficiais.
- Para competições com playoffs:
  - Mantém a identificação canônica das partidas com `phase === 'final'` e `phase === 'terceiro_lugar'`.

---

## 14. Integração com TieBreakEngine

O pódio de fase única consome a ordenação oficial com `useMiniTable: true`. Dessa forma, empates duplos ou múltiplos acionam os critérios oficiais configurados no torneio:
- Pontos na tabela;
- Confronto direto / Mini-tabela;
- Número de vitórias;
- Saldo de sets / Sets ratio (Average);
- Saldo de pontos / Points ratio (Average);
- Sorteio determinístico (`draw`).

---

## 15. Lógica do Schedule Engine

Em `src/services/scheduleService.ts`:
`sortScheduleMatches(matches)` é uma função pura que cria uma cópia rasa do array e ordena pelos seguintes critérios canônicos:
1. `round ASC` (rodadas menores primeiro; partidas sem round vão ao final com `Number.MAX_SAFE_INTEGER`);
2. `scheduledTime ASC` (datas/horários ISO 8601 cronológicos; horários ausentes ou vazios são posicionados no final);
3. `court ASC` com ordenação alfanumérica natural (`localeCompare(..., undefined, { numeric: true, sensitivity: 'base' })`), garantindo que "Quadra 2" venha antes de "Quadra 10";
4. `matchNumber ASC` (desempate final determinístico).
O `matchNumber` original de cada partida jamais é reescrito.

---

## 16. Consumidores Migrados

1. `MatchesPage.tsx` — ordenação unificada na visão de tabela de jogos.
2. `publicCompetitionService.ts` — ordenação unificada nas consultas públicas de partidas e no bundle do campeonato.
3. `ReportsPage.tsx` — ordenação unificada no Boletim Geral, na Escala Oficial de Arbitragem e na Programação Diária / Ordem dos Jogos.
4. `TeamPortalPage.tsx` — ordenação unificada na geração do boletim em PDF e no cálculo do próximo confronto da equipe.

---

## 17. Lógica de Side-Out

Em `MatchSheetInterface.tsx`:
- Quando uma equipe marca um ponto:
  - Se `servingTeam !== scoringTeam`: ocorre **side-out**. A equipe receptora conquista o direito de sacar (`setServingTeam(scoringTeam)`) e executa a rotação de quadra.
  - Se `servingTeam === scoringTeam`: a equipe sacadora venceu o rally, marca o ponto e continua sacando **sem efetuar rotação**.

---

## 18. Lógica de Rotação

- Apenas a equipe que conquista o saque no side-out rotaciona (`setRotationA` ou `setRotationB` incrementado módulo 6).
- Ao término de um set (`endSet`):
  - `setRotationA(0)` e `setRotationB(0)` resetam as formações para as posições iniciais do novo set.
  - O saque inicial do próximo set é alternado (`setServingTeam(currentSet % 2 === 1 ? 'B' : 'A')`).

---

## 19. Validação de Sets

Em `MatchSheetInterface.endSet()`:
- Delega a validação diretamente a `CompetitionRulesService.validateSingleSet(currentSet, scoreA, scoreB, formatConfig, isTiebreak)`.
- Rejeita tentativas de encerrar o set com placares que violem:
  - Pontuação mínima do set (25 regular, 15 tiebreak, 21 praia);
  - Vantagem mínima obrigatória de 2 pontos;
  - Placares irregulares acima de 25 pontos com vantagem superior a 2 (ex: 27-24 é rejeitado).
- Apenas permite a conclusão do set quando o método canônico valida o placar e retorna o vencedor inequívoco.

---

## 20. Compatibilidade com Formatos Existentes

- Torneios mata-mata existentes mantêm seus fluxos intactos.
- Torneios de praia com sets de 21 pontos são suportados pelo `formatConfig`.
- Fallbacks legados (`DEFAULT_INDOOR_CONFIG`, `parseLegacySetFormat`) foram rigorosamente preservados.

---

## 21. Testes Focados

- `src/test/scheduleSortingEngine.test.ts`: **9/9 aprovados**
- `src/test/roundRobinPodiumAndLifecycle.test.ts`: **7/7 suítes (12/12 cenários) aprovados**
- `src/test/matchSheetRulesValidation.test.ts`: **11/11 aprovados**

---

## 22. Testes Completos

- Executado: `npm test`
- Resultado: **128 de 128 arquivos de teste aprovados (1.331 testes passando)**
- Tempo de execução: ~6 minutos.

---

## 23. TypeScript

- Executado: `npx tsc -p tsconfig.app.json --noEmit`
- Resultado: **0 erros**.

---

## 24. Lint

- Executado: `npm run lint`
- Resultado: **0 erros, 1 warning** (warning pré-existente no hook `DrawArenaCanvas.tsx`).

---

## 25. Build

- Executado: `npm run build`
- Resultado: **Aprovado com sucesso em 59s**, gerando bundle de produção no diretório `dist/`.

---

## 26. Commits Realizados

1. **`3ca6086`**: `feat(competition): complete round-robin and unify schedule`
   - `src/services/scheduleService.ts`
   - `src/pages/MatchesPage.tsx`
   - `src/services/publicCompetitionService.ts`
   - `src/pages/ReportsPage.tsx`
   - `src/services/competitionRulesService.ts`
   - `src/services/playoffsService.ts`
   - `src/services/competitionLifecycleService.ts`
   - `src/services/competitionReadinessService.ts`
   - `src/pages/CompetitionsPage.tsx`
   - `src/test/scheduleSortingEngine.test.ts`
   - `src/test/roundRobinPodiumAndLifecycle.test.ts`
2. **`77bc4d6`**: `fix(match-sheet): enforce side-out rotation and set validation`
   - `src/components/match-sheet/MatchSheetInterface.tsx`
   - `src/test/matchSheetRulesValidation.test.ts`

---

## 27. Arquivos Deliberadamente Não Incluídos

Conforme regra estrita do pre-flight e do isolamento:
- Alterações locais e arquivos untracked do **Portal da Equipe** (`src/components/portal/`, `src/pages/portal/`, `src/test/portalRoutingAndSecurity.test.ts`).
- Alterações locais e arquivos untracked de **Identidade / Fase 11** (`src/App.tsx`, `RequireAuth.tsx`, `seed.ts`, `supabaseClient.ts`, `dataAccess.ts`, `identityService.ts`, `identityBackfillService.ts`, `entities.ts`, `identity.ts`, `registration.ts`, migrations e testes de identidade).
- Documentação não relacionada (`docs/walkthroughs/`).

---

## 28. Riscos Restantes

- **Baixo:** A regra de pódio de fase única agora exige a conclusão de 100% dos jogos para emitir o pódio definitivo; torneios em andamento exibem pódio somente após a homologação completa, o que está alinhado às regras esportivas oficiais.

---

## 29. Pendências

- Nenhuma pendência aberta na Fase 4B.

---

## 30. Próximo Passo

- **STOP GATE ATIVADO.**
- O repositório local está estável, com build, lint, typecheck e 1.331 testes aprovados.
- Nenhum push remoto foi realizado.
- Nenhuma alteração foi efetuada no ambiente de produção VOLTZ.
- Aguardar orientações do gestor do projeto para o planejamento e autorização da **Fase 4C**.

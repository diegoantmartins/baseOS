# BASEOS — GAP ANALYSIS (MASTER PLAN V1.0)
## Auditoria Forense de Consolidação Arquitetural e Prontidão SaaS

### Identificação da Auditoria
- **Data da Auditoria:** 02 de Outubro de 2026
- **Branch:** `main`
- **Commit Base:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`
- **Ambiente:** DEV / Laboratório Local (PostgreSQL 15 / Supabase / React 18 / Node.js)
- **Modo:** Read-Only Estrito (Auditoria Forense e Gap Analysis)

---

## Frente 1 — Motor Configurável & Regras de Disputa
Auditoria dos serviços `CompetitionRulesService`, normalizadores de regras e resolução de formatos de sets e pontuação.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Resolução de Sets via DAG (SetsToWin)** | `src/services/competitionRulesService.ts` | 🟢 | **CONSOLIDADA:** Prioriza `matchedStage.matchRulesOverride?.setsToWin` do DAG antes de fallbacks globais. | Nenhuma ação bloqueante. |
| **Eliminação de Match Strings no Formato** | `src/services/competitionRulesService.ts` | 🟡 | **GAP:** `resolveMatchFormat` (linhas 200–217) possui fallback com condicionais baseadas em strings literais em português/inglês (`p === 'final'`, `p === 'quartas' || p === 'quarterfinals'`, `p === 'oitavas' || p === 'roundof16'`). Se a fase possuir nome arbitrário (ex: "Play-in Ouro", "Chave B"), o fallback falha e herda o default global. | Refatorar `resolveMatchFormat` (linhas 200–217) para ler estritamente o `stage.matchRulesOverride` e o `stage.stageType` do DAG, removendo todas as comparações de strings com arrays literais. |
| **Ausência de Hardcodes "VOLTZ"** | `src/services/competitionRulesService.ts` e `genericPairingEngine.ts` | 🟢 | **CONSOLIDADA:** Nenhuma regra em produção possui checagem condicional com o nome "VOLTZ". A palavra existe apenas em cenários de teste E2E e fixtures. | Nenhuma ação necessária. |
| **Geração de Cruzamentos de Playoffs** | `src/services/competitionBracketService.ts` | 🔴 | **GAP:** `generatePlayoffSlots` (linhas 157–173) possui branches rígidos baseados em quantidade de grupos (`groupsCount >= 4` -> `generateFourGroupPlayoffs`, `groupsCount === 2` -> `generateTwoGroupPlayoffs`), sem ler a configuração de emparelhamento (`PairingDefinition`) do DAG. | Refatorar `generatePlayoffSlots` (linhas 150–174) para delegar a resolução dos confrontos à `GenericPairingEngine.resolvePairings()` com base no `StageDefinition` da competição. |
| **Cálculo de Pontos e Desempate (CBV/FIVB)** | `src/services/competitionRulesService.ts` e `standingsService.ts` | 🟢 | **CONSOLIDADA:** `calculateCompetitionPoints` e `computeStandings` operam 100% orientados pela configuração (`ScoringSystemConfig` e `TiebreakCriterionId[]`). | Nenhuma ação necessária. |

---

## Frente 2 — Ciclo de Vida e Turno Único
Auditoria dos serviços `CompetitionLifecycleService`, apuração de pódio e encerramento sem mata-mata artificial.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Transição para Turno Único (sem Final)** | `src/services/competitionLifecycleService.ts` | 🟢 | **CONSOLIDADA:** `validateTransition` (linhas 304–335) permite transição direta para `completed` quando `isSingleStageRoundRobin` é verdadeiro e 100% dos jogos estão finalizados/homologados. | Nenhuma ação necessária. |
| **Congelamento do Pódio Oficial em Pontos Corridos** | `src/services/playoffsService.ts` | 🟢 | **CONSOLIDADA:** `computePodium` (linhas 485–524) calcula o pódio oficial a partir de `computeStandings` quando não há partida de "final" e todas as partidas estão encerradas. | Nenhuma ação necessária. |
| **Recomendação de Próximo Status** | `src/services/competitionLifecycleService.ts` | 🟡 | **GAP:** `getNextRecommendedStatus` (linha 391): quando a competição está `in-progress` e `isSingleStage === true`, retorna `'completed'` incondicionalmente, mesmo se houver partidas abertas. | Alterar linha 391 em `getNextRecommendedStatus` para verificar se `matches.every(isFinished)` antes de sugerir `'completed'`. Se houver pendências, deve retornar `null` ou manter `'in-progress'`. |
| **Detecção de Fases de Pódio por Substring** | `src/services/playoffsService.ts` | 🟡 | **GAP:** `computePodium` (linhas 453–456 e 463–464) usa exclusão por substrings para identificar finais (`!m.phase.includes('semi') && !m.phase.includes('quart') && !m.phase.includes('oitav')`). | Substituir checagem textual das linhas 450–466 por validação baseada no metadado do slot/estágio (`stage.stageType === 'knockout' && slot.isFinalMatch`). |
| **Sincronização Granular por Nós do DAG** | `src/services/competitionLifecycleService.ts` | 🟢 | **CONSOLIDADA:** `syncLifecycleAfterMatchProgression` (linhas 590–630) atualiza o status de cada `competition_stages` (`pending` -> `in-progress` -> `completed`) isoladamente. | Nenhuma ação necessária. |

---

## Frente 3 — Agenda e Reagendamento
Auditoria de ordenação cronológica, reagendamento de partidas e reflexo transacional na classificação.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Ordenação no Supabase DataAccess** | `src/services/dataAccess.ts` | 🔴 | **GAP CRÍTICO:** Em `listMatches` (linhas 2710–2713), a query Supabase executa `supabase.from('matches').select('*')` SEM cláusula `.order('scheduled_time', { ascending: true })`. O retorno fica vulnerável à ordem física de inserção no PostgreSQL. | Adicionar `.order('scheduled_time', { ascending: true, nullsFirst: false })` na linha 2710 de `dataAccess.ts`. |
| **Ordenação de Jogos no Portal da Equipe** | `src/pages/portal/TeamPortalPage.tsx` | 🔴 | **GAP CRÍTICO:** Na linha 762, o grid de partidas renderiza `{matches.map((m) => ...)}` diretamente sobre o estado bruto `matches`. A ordenação por `sortScheduleMatches` é aplicada exclusivamente na exportação em PDF (linha 241), fazendo com que partidas reagendadas fiquem fora de ordem na interface web. | Substituir `matches.map` por `sortedMatches.map` na linha 762 de `TeamPortalPage.tsx`, instanciando `const sortedMatches = useMemo(() => sortScheduleMatches(matches), [matches]);`. |
| **Critério de Reagendamento (Rodada vs Horário)** | `src/services/scheduleService.ts` | 🟡 | **GAP:** `sortScheduleMatches` (linhas 26–28) ordena primariamente por `roundA - roundB`. Se uma partida da Rodada 2 for antecipada para uma data anterior à Rodada 1, a função mantém os jogos da Rodada 1 no topo, violando a cronologia de portais e torcedores. | Ajustar `sortScheduleMatches` (linhas 21–65) para permitir ordenação estritamente cronológica (`scheduledTime ASC`) quando o objetivo for a visualização de agenda pública/portais. |
| **Reflexo de Homologação em Standings** | `src/services/standingsService.ts` | 🟢 | **CONSOLIDADA:** A classificação é calculada dinamicamente via `computeStandings` a partir do estado atualizado das partidas. Toda homologação reflete imediatamente na visualização. | Nenhuma ação necessária (não há tabela física estática com drift). |

---

## Frente 4 — Súmulas Profissionais
Auditoria do motor de renderização vetorial (`src/document-engine/baseos`).

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Súmula 3 Sets — Proporção A4 Landscape** | `src/document-engine/baseos/geometry/layouts.ts` | 🟢 | **CONSOLIDADA:** Layout `THREE_SET_A4_LAYOUT` (linhas 45–68) segue rigorosamente A4 Landscape (841.89 x 595.28 pt) com margem de 10 pt. | Nenhuma ação necessária. |
| **Súmula 3 Sets — Espaço do 3º Set** | `src/document-engine/baseos/geometry/layouts.ts` | 🟢 | **CONSOLIDADA:** O 3º Set possui largura expandida de 645 pt (linha 58), ocupando a largura de ambas as colunas dos sets regulares (494 pt), com card de observações ao lado (172.89 pt). | Nenhuma ação necessária. |
| **Súmula 3 Sets — Capacidade de Elenco** | `src/document-engine/baseos/components/BaseosThreeSetRosters.tsx` | 🟢 | **CONSOLIDADA:** Linhas 267–298 geram 14 linhas de atletas, linhas 306–333 geram 2 linhas de líberos e linhas 341–364 geram 4 membros de comissão técnica (T, AT, PF, M). | Nenhuma ação necessária. |
| **Súmula 5 Sets — Geometria Dedicada (Não-Comprimida)** | `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx` | 🟢 | **CONSOLIDADA:** `FIVE_SET_A4_LAYOUT` (linhas 70–92) possui geometria específica com 5 blocos dedicados (`BaseosFiveSetColumnBlock`) e componentes exclusivos (`BaseosFiveSetRosters`, `BaseosFiveSetSanctions`, `BaseosFiveSetResult`). | Nenhuma ação necessária. |

---

## Frente 5 — UX de Criação de Competição
Auditoria da autoria visual de torneios e transição de cards mágicos para linha do tempo.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Construtor Progressivo de Fases (Timeline)** | `src/components/competition/format-builder/CompetitionStageBuilder.tsx` | 🟢 | **CONSOLIDADA:** Componente construído com sucesso em `bg-slate-50`, cards brancos, numeração ordinal ("01 GRUPOS", "02 ELIMINATÓRIA"), botão pílula "+ Adicionar Fase" e botão "Debug Payload". | Nenhuma ação no componente. |
| **Modal de Configuração de Nó (StageDialog)** | `src/components/competition/format-builder/StageDialog.tsx` | 🟢 | **CONSOLIDADA:** Dividido em 3 seções (Identificação, Entrada, Saída/Mecânica), tipografia Navy `#0f172a`, e botão "Salvar Fase" em Laranja `#f59e0b` pílula. | Nenhuma ação no componente. |
| **Desacoplamento do Onboarding Antigo** | `src/components/competition/dialogs/CompetitionFormDialog.tsx` | 🔴 | **GAP ARQUITETURAL:** O diálogo principal de criação de torneios (`CompetitionFormDialog.tsx`, linhas 404–432) continua usando a seleção de "cards mágicos" / dropdown de templates fixos (`CompetitionTemplateService.listTemplates()`). O novo `CompetitionStageBuilder` ainda não foi integrado como etapa substituta no assistente de criação. | Substituir a aba "disputa" de `CompetitionFormDialog.tsx` pelo `CompetitionStageBuilder`, gerando o payload `StageDefinition[]` diretamente na criação. |
| **Validação da Árvore de Fases no Frontend** | `src/components/competition/format-builder/CompetitionFormatBuilder.tsx` | 🟢 | **CONSOLIDADA:** `CompetitionValidationPanel` valida aciclicidade, dependências e completude do grafo antes do salvamento. | Nenhuma ação necessária. |

---

## Frente 6 — Sorteio e Chaveamento (Draw Arena)
Auditoria do motor de sorteio determinístico, distribuição de grupos e algoritmo de Berger.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Algoritmo de Berger Puro** | `src/services/drawService.ts` | 🟢 | **CONSOLIDADA:** `generateGroupRoundRobin` (linhas 110–141) implementa o método do círculo de Berger de forma pura e determinística com dummy `__BYE__` para equipes ímpares. | Nenhuma ação necessária. |
| **Leitura de Grupos do CompetitionConfig** | `src/pages/DrawPage.tsx` | 🔴 | **GAP CRÍTICO:** Em `DrawPage.tsx` linha 90, `groupsCount` é fixado em `useState(2)` e NUNCA é sincronizado quando a competição é selecionada (linhas 215–221). Se o campeonato foi cadastrado com 4 grupos ou 1 grupo (Turno Único), a tela ignora a configuração da competição. | No `useEffect` de carregamento de competição em `DrawPage.tsx` (após linha 140), adicionar leitura: `const cfgGroups = selected?.config?.format?.stages?.[0]?.groupConfig?.groupsCount; if (cfgGroups) setGroupsCount(cfgGroups);`. |
| **String Hardcoded de Fase no Sorteio** | `src/services/drawService.ts` | 🟡 | **GAP:** `generateDrawMatches` (linha 144) possui default param `phase = 'classificatória'`. Partidas geradas gravam essa string literal em vez de associar o ID ou nome da fase configurada no DAG do torneio. | Modificar a chamada em `runDraw` (linha 178) para repassar o `stage.name` ou `stage.id` configurado na competição. |

---

## Frente 7 — Portais e Isolamento de Perfis
Auditoria de roteamento de acessos, guardas de autorização e projeção de dados públicos.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Bloqueio de Manager de Equipe no Dashboard Admin** | `src/App.tsx` e `src/components/auth/RequireAuth.tsx` | 🟢 | **CONSOLIDADA:** `RootRedirector` (linhas 68–70) intercepta `/` e redireciona `role === 'team'` para `/equipe`. `RequireAuth` (linhas 29–37) bloqueia acesso a rotas administrativas e redireciona para `/equipe`. | Nenhuma ação necessária. |
| **Projeção Sanitizada no Portal Público** | `src/services/publicCompetitionService.ts` | 🟢 | **CONSOLIDADA:** `getPublicCompetitionBundle` projeta apenas campos públicos, removendo CPFs, contatos e tokens das equipes. | Nenhuma ação necessária. |
| **Guarda do Portal da Equipe (Multi-Equipe)** | `src/components/portal/TeamPortalGuard.tsx` | 🟢 | **CONSOLIDADA:** Resolve memberships ativas via `TeamContextService.getUserAvailableTeams()` e barra acessos sem vínculo legítimo. | Nenhuma ação necessária. |
| **Autenticação por Token na Rota Legada** | `src/pages/TeamRosterRegistrationPage.tsx` | 🟡 | **ALERTA:** A rota `/equipe/:token` ainda permite visualização de dados do elenco via token compartilhado na URL. Para compliance pleno de segurança SaaS, o acesso deve requerer login do gestor autenticado via `/portal/equipe`. | Deprecar a autenticação por token na URL e redirecionar para login de dirigente vinculado à organização. |

---

## Frente 8 — Multi-Tenant e Isolamento RLS (Banco de Dados)
Auditoria de Row Level Security, RPCs transacionais e modelagem relacional de organizações.

| Recurso / Regra | Arquivo Inspecionado | Status | Gap Identificado (O que falta / está incorreto) | Ação Cirúrgica Necessária (Linha/Função) |
| :--- | :--- | :---: | :--- | :--- |
| **Vazamento Cross-Tenant de Perfis para Organizadores** | `supabase/migrations/20261001000002_harden_core_rls_policies.sql` | 🔴 | **VULNERABILIDADE RLS:** A função `can_read_profile` (linhas 122–124) concede leitura irrestrita para qualquer usuário com `role IN ('admin', 'organizer')`. Um organizador da Organização A pode ler e-mails, nomes e dados cadastrais de usuários de todas as demais organizações. | Refatorar `can_read_profile` linhas 121–124: se o chamador for `'organizer'`, exigir que ele compartilhe a mesma organização do perfil alvo via `user_memberships`. Apenas `'admin'` global deve ter leitura irrestrita. |
| **Políticas Abertas de Leitura (Competitions & Teams)** | `supabase/migrations/20260818000000_initial_schema.sql` | 🟡 | **GAP:** `competitions_public_read` e `teams_public_read` possuem `USING (true)`. Torneios em rascunho (`draft`) ou privados de uma organização ficam expostos na API REST caso o client faça select geral. | Restringir `competitions_public_read` para `WHERE status != 'draft' OR organization_id IN (user_orgs)`. |
| **Acoplamento Mono-Equipe em Profiles** | `src/types/auth.ts` e `supabase/migrations/` | 🟡 | **GAP DE MODELAGEM:** A coluna `profiles.competition_team_id` é do tipo escalar `text`. Um dirigente que participe de 2 competições simultâneas sofre conflito. A fonte canônica da verdade deve ser exclusivamente `user_memberships`. | Deprecar a coluna `competition_team_id` da tabela `profiles`, consumindo apenas a tabela `user_memberships`. |
| **Proteção de Campos de Partida por Árbitros** | `supabase/migrations/20260928230000_harden_admin_write_policies.sql` | 🟢 | **CONSOLIDADA:** Trigger `trg_protect_match_admin_fields` bloqueia árbitros de alterarem campos administrativos (datas, locais, equipes). | Nenhuma ação necessária. |

---

## Conclusão de Prontidão (Release Readiness)

### Resumo Executivo
O BaseOS atingiu **maturidade de nível de produção no Motor de Regras, Súmulas e Ciclo de Vida do Torneio Único**. O sistema resolve pódios e classificações sem travamentos e gera súmulas oficiais vetoriais em A4 Landscape com precisão geométrica milimétrica.

No entanto, o sistema **NÃO pode ser homologado como Release Candidate (RC) imediato** até que os **4 GAPS BLOQUEANTES (🔴)** abaixo sejam sanados cirurgicamente:

### Gaps Bloqueantes Imediatos (P0):
1. **Frente 3 (Agenda):** `dataAccess.ts` linha 2710 não possui `ORDER BY scheduled_time` e `TeamPortalPage.tsx` linha 762 não aplica `sortScheduleMatches()`, gerando desordem cronológica para os portais ao reagendar partidas.
2. **Frente 6 (Sorteio):** `DrawPage.tsx` linha 90 ignora o `groupsCount` cadastrado no `CompetitionConfig`, forçando o organizador a reconfigurar manualmente o sorteio.
3. **Frente 1 (Playoffs):** `CompetitionBracketService.ts` linha 157 usa branches manuais por contagem de grupos em vez de delegar ao motor genérico de emparelhamento `GenericPairingEngine`.
4. **Frente 8 (Segurança RLS):** `can_read_profile` em PostgreSQL concede leitura global de perfis para qualquer usuário com papel `'organizer'`, quebrando o isolamento estrito entre organizações distintas.

### Classificação Geral por Frente:
- **Frente 1 (Motor Configurável):** 🟡 *Quase Pronto (90%)*
- **Frente 2 (Ciclo de Vida & Turno Único):** 🟢 **PRONTO PARA RC (98%)**
- **Frente 3 (Agenda & Reagendamento):** 🔴 **BLOQUEANTE (70%)**
- **Frente 4 (Súmulas Profissionais):** 🟢 **PRONTO PARA RC (100%)**
- **Frente 5 (UX de Criação):** 🟡 *Quase Pronto (85%)*
- **Frente 6 (Sorteio e Chaveamento):** 🟡 *Quase Pronto (80%)*
- **Frente 7 (Portais e Redirecionamentos):** 🟢 **PRONTO PARA RC (95%)**
- **Frente 8 (Multi-Tenant & RLS):** 🟡 *Quase Pronto (85%)*

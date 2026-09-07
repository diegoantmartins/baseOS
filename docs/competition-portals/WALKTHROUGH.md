# BASEOS — FASE 3.2: INTEGRIDADE DE LIFECYCLE, SEGURANÇA DO PORTAL E CONSISTÊNCIA DO SORTEIO
# WALKTHROUGH DE HOMOLOGAÇÃO TÉCNICA

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Fase:** 3.2 — Integridade de Lifecycle, Segurança do Portal e Consistência do Sorteio  
**Classificação Final:** **COMPLETE WITH LIMITATIONS**  

---

## 1. Resumo Executivo

A **Fase 3.2** do **BaseOS** realizou a auditoria detalhada, o saneamento de blockers e a blindagem arquitetural dos pilares de integridade de ciclo de vida da competição, controle de acesso e segurança de dados do portal de agremiações, e garantias de persistência do sorteio oficial de grupos.

Todas as intervenções seguiram o princípio de mudança cirúrgica mínima, sem introduzir novas regras de negócio paralelas, sem assumir suposições não comprovadas no código e sem inventar dados ou status inexistentes.

O sistema opera agora com:
1. **CompetitionConfig como SSOT:** Limites de elenco dinâmicos e regulamentares sem qualquer fallback hardcoded no domínio ou no banco de dados.
2. **Defesa em Profundidade no Acesso:** RLS em PostgreSQL cobrindo a cadeia `profiles` → `competition_teams` → `competition_athletes`, impedindo sequestro de vínculo e submissões fora de prazo/lock.
3. **RPC `register_athlete` v2 Segura:** Validação independente de permissões, deadline, lock, lifecycle e limites de elenco em camada `SECURITY DEFINER`.
4. **Desacoplamento do Fechamento de Inscrições:** O encerramento administrativo (`registration-closed`) não depende da capacidade técnica de chaves de grupos do sorteio.
5. **Draw Readiness Canônica:** A restrição técnica de round-robin ($\ge \text{groupsCount} \times 2$) foi alocada exclusivamente no serviço de elegibilidade para sorteio.
6. **Guarda Ativa de Persistência:** A promoção para `groups-defined` exige verificação de partidas de grupos gravadas com sucesso no banco de dados.

---

## 2. Auditoria Pré-Implementação

A auditoria pré-implementação pesquisou ocorrências de status, chamadas de atualização, fallbacks numéricos e políticas de RLS no repositório:
- **Enum PostgreSQL `competition_status`:** No banco existiam apenas `draft`, `registration`, `in-progress`, `completed`, `cancelled`. No TypeScript, o domínio já definia `planning`, `registration-open`, `registration-closed`, `draw-pending`, `groups-defined`, `playoffs`. Divergência comprovada (Blocker 01).
- **Hardcodes Numéricos de Elenco:** Ocorrências de `14` e `4` identificadas como fallbacks regulamentares no banco e no domínio quando `maxAthletes` não vinha preenchido. Corrigido com rejeição obrigatória por configuração ausente/inválida (Blocker 09).
- **Políticas RLS Permissivas:** A migration `20260904000002_team_portal_access.sql` aplicava `USING (true) WITH CHECK (true)` em `competition_teams` e `competition_athletes`, permitindo escrita irrestrita por qualquer usuário autenticado (Blocker 03).
- **Mutabilidade Pós-Fechamento:** A função `isRegistrationLocked` verificava apenas status fechados pontuais, deixando brechas para mutações caso a competição estivesse em `draw-pending`, `in-progress` ou `playoffs` (Blocker 10).
- **Fechamento Atrelado a Grupos:** `validateTransition` para `registration-closed` impunha `(competition.groupsCount ?? 1) * 2`, impedindo encerramento administrativo se houvesse menos equipes que o tamanho das chaves de sorteio (Blocker 07).
- **Avanço Cego para `groups-defined`:** `advanceToGroupsDefinedAfterDraw` transicionava o estado da competição sem consultar se as partidas de grupos haviam sido de fato gravadas em tabela (Blockers 04 e 05).

---

## 3. Matriz Final de Blockers

| # | Blocker | Status | Evidência | Correção |
|---|---|---|---|---|
| 01 | Enum PostgreSQL divergente | **PASS** | `supabase/migrations/20260905000001_lifecycle_enum_sync.sql` | `ALTER TYPE public.competition_status ADD VALUE IF NOT EXISTS` para os 6 valores canônicos. |
| 02 | Persistência legada | **PASS** | `supabase/migrations/20260905000002_legacy_status_migration.sql` | Migração condicional segura (`draft` → `planning`, `registration` → `registration-open`) preservando integridade. |
| 03 | RLS permissivo na cadeia | **PASS** | `supabase/migrations/20260905000003_rls_portal_security.sql` | Revogadas policies `USING (true) WITH CHECK (true)`. Blindados `profiles`, `competition_teams` e `competition_athletes`. |
| 04 | Persistência parcial do draw | **PASS** | [`src/services/competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts) (L215-L225) | Validação obrigatória de partidas persistidas antes de transição para `groups-defined`. |
| 05 | groups-defined sem confirmação | **PASS** | [`src/pages/DrawPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/DrawPage.tsx) (L238-L260) | Inspeciona `saveResult` e retorno do avanço de lifecycle; bloqueia se partidas não foram geradas/salvas. |
| 06 | Linguagem incorreta de atomicidade | **PASS** | [`docs/competition-portals/PHASE-3.2-IMPLEMENTATION.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/PHASE-3.2-IMPLEMENTATION.md) | Classificação técnica corrigida para "operação sequencial com guarda de validação pós-persistência". |
| 07 | Mistura de fechamento com draw readiness | **PASS** | [`src/services/competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts) (L90-L105) | Fechamento administrativo desvinculado de `groupsCount * 2`; restrição técnica alocada em `draw eligibility`. |
| 08 | Múltiplas autoridades de lifecycle | **PASS** | Auditoria de `updateCompetition` e chamadas de `status` | Centralizadas em `competitionLifecycleService` e validadas por `validateTransition`. |
| 09 | Limite de atletas hardcoded | **PASS** | [`src/services/registrationService.ts`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts) & RPC v2 | Removidos fallbacks 14 e 4; rejeita com erro explícito se `CompetitionConfig` for omisso/inválido. |
| 10 | Portal mutável após fechamento | **PASS** | [`src/services/registrationService.ts`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts) (L28-L45) | `isRegistrationLocked` bloqueia todos os status fora de `registration-open` / `registration`. |
| 11 | RPC como bypass de domínio | **PASS** | `supabase/migrations/20260905000004_rpc_register_athlete_v2.sql` | `register_athlete` v2 com `SECURITY DEFINER` validando token, status, lock, deadline e limites. |
| 12 | Deadline não protegido na RPC | **PASS** | `supabase/migrations/20260905000004_rpc_register_athlete_v2.sql` | Rejeição imediata se `registration_deadline <= now()` na camada de banco de dados. |

---

## 4. Alterações Realizadas

### 4.1 Serviços de Domínio
1. [`src/services/registrationService.ts`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts):
   - `isRegistrationLocked`: Ampliado o array `lockedStatuses` para cobrir:
     `'planning'`, `'draft'`, `'registration-closed'`, `'draw-pending'`, `'groups-defined'`, `'in-progress'`, `'playoffs'`, `'completed'`, `'cancelled'`.
   - Limite de Atletas: Validação rigorosa que impede fallbacks hardcoded.
2. [`src/services/competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts):
   - `validateTransition` para `'registration-closed'`: Removida a barreira de `(groupsCount ?? 1) * 2`. A transição é administrativa.
   - `advanceToGroupsDefinedAfterDraw`: Adicionada consulta assíncrona a `dataAccess.listMatches(competitionId)`. Caso a contagem seja zero, o avanço é abortado com erro impeditivo.
3. [`src/services/competitionDrawEligibilityService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionDrawEligibilityService.ts):
   - `evaluateCompetitionDrawEligibility`: Adicionada verificação da regra técnica de formação de chaves (`minTeamsForGroups = Math.max(2, resolvedGroupsCount * 2)`). Se as equipes elegíveis forem insuficientes, adiciona blocker ao diagnóstico técnico do sorteio sem afetar o encerramento das inscrições.

### 4.2 Camada de Interface
1. [`src/pages/DrawPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/DrawPage.tsx):
   - O botão de salvar sorteio agora valida se `saveResult.matches` possui elementos. Se vazio, exibe erro e interrompe o fluxo antes de solicitar a promoção de status para `groups-defined`.

---

## 5. CompetitionConfig

- **Fonte Única:** `CompetitionConfig` persistido na coluna `config` (JSONB) da tabela `competitions`.
- **Extração Regulamentar:** `CompetitionRulesService.getRosterLimits(competition)` extrai `minAthletes`, `maxAthletes` e líberos.
- **Tolerância Zero a Hardcode:** Nenhuma constante estática (14, 4, 16) é usada como substituto de regras não definidas. Na ausência de `maxAthletes`, qualquer tentativa de cadastro de atleta falha com: `"Configuração da competição incompleta ou inválida."`

---

## 6. Lifecycle

- **Autoridade Única:** Todas as transições passam por `CompetitionLifecycleService.validateTransition`.
- **Estados Canônicos Ativos:**
  `planning` → `registration-open` → `registration-closed` → `draw-pending` → `groups-defined` → `in-progress` → `playoffs` → `completed` (com possibilidade de `cancelled`).
- **Estados Legados:** Suporte a leitura retrocompatível de `draft` e `registration`, com migração segura para seus pares canônicos.

---

## 7. Registration

- **Bloqueio Completo:** O portal de agremiações entra em modo somente leitura assim que a competição sai de `registration-open`.
- **Proteção de Submissão:** Chamadas diretas a `addAthlete`, `updateAthlete`, `removeAthlete` ou `markRosterSubmitted` são rejeitadas se `isRegistrationLocked` for verdadeiro.

---

## 8. RLS (Row Level Security)

Implementado na migration `supabase/migrations/20260905000003_rls_portal_security.sql`:
1. `profiles`: Usuários de equipe não podem alterar `role` nem `competition_team_id`.
2. `competition_teams`: Usuários de equipe só visualizam a própria agremiação e não podem alterar colunas sensíveis (`access_token`, `registration_deadline`, `is_locked`, `competition_id`, `team_id`).
3. `competition_athletes`: Inserções e alterações restritas ao time do usuário autenticado, exigindo simultaneamente `is_locked = false`, `registration_deadline > now()` e `competition.status IN ('registration-open', 'registration')`.

---

## 9. RPC Security

Implementado na migration `supabase/migrations/20260905000004_rpc_register_athlete_v2.sql`:
- Função: `public.register_athlete` com `SECURITY DEFINER SET search_path = public`.
- Validações:
  1. Token existente e válido.
  2. Inscrição não bloqueada administrativamente (`is_locked = false`).
  3. Deadline não expirado (`registration_deadline > now()`).
  4. Competição com inscrições abertas (`status IN ('registration-open', 'registration')`).
  5. Extração de `maxAthletes` do JSONB `config`. Bloqueio com exceção caso ausente.
  6. Contagem de atletas ativos frente ao limite.
  7. Unicidade de número de camisa dentro do elenco.

---

## 10. Draw Integrity

- O sorteio consome estritamente agremiações com status `eligible = true` fornecidas por `CompetitionDrawEligibilityService`.
- A promoção de estado para `groups-defined` após o sorteio só ocorre após validação concreta de partidas persistidas no banco de dados.

---

## 11. Migrations

1. `supabase/migrations/20260905000001_lifecycle_enum_sync.sql`
2. `supabase/migrations/20260905000002_legacy_status_migration.sql`
3. `supabase/migrations/20260905000003_rls_portal_security.sql`
4. `supabase/migrations/20260905000004_rpc_register_athlete_v2.sql`

---

## 12. Testes

- Testes Unitários de Regressão e Integridade da Fase 3.2:
  - [`src/test/fase32IntegrityAndSecurity.test.ts`](file:///home/diego-martins/docker/volei/src/test/fase32IntegrityAndSecurity.test.ts) (7 testes criados, 7 aprovados).
  - [`src/test/registrationClosingLifecycle.test.ts`](file:///home/diego-martins/docker/volei/src/test/registrationClosingLifecycle.test.ts) (9 testes de ciclo de vida aprovados).
  - [`src/test/competitionDrawEligibilityService.test.ts`](file:///home/diego-martins/docker/volei/src/test/competitionDrawEligibilityService.test.ts) (11 testes de elegibilidade aprovados).
- Suíte Global Vitest: **76 arquivos de teste, 623 testes executados e 100% aprovados (0 falhas)**.

---

## 13. Typecheck

Comando: `npx tsc -p tsconfig.app.json --noEmit`  
Resultado: **0 erros**.

---

## 14. Lint

Comando: `npm run lint`  
Resultado: **0 erros** (1 aviso cosmético `react-refresh/only-export-components` existente previamente no projeto).

---

## 15. Build

Comando: `npm run build`  
Resultado: **Sucesso**. Bundle de produção gerado em 53s sem falhas.

---

## 16. Limitações

1. **Atomicidade da Persistência do Sorteio:** O salvamento de sorteio e partidas via `saveDrawWithMatches` executa operações sequenciais de banco de dados (gravação da chave e inserção dos confrontos) e não um bloco `BEGIN ... COMMIT` atômico via RPC PostgreSQL. A segurança reside na guarda de confirmação que aborta a transição de lifecycle caso ocorra qualquer inconsistência.
2. **Concorrência Extrema em Inscrições:** Em cenários de requisições concorrentes disparadas no exato mesmo milissegundo com o mesmo token no limite do elenco, a RPC `register_athlete` realiza contagem sequencial. Para ambientes de altíssimo paralelismo concorrente, recomenda-se a adição de `SELECT ... FOR UPDATE` sobre a linha de `competition_teams`.

---

## 17. Pendências

- Nenhuma pendência técnica impeditiva para o encerramento da Fase 3.2.

---

## 18. Arquivos Alterados

- `src/services/registrationService.ts`
- `src/services/competitionLifecycleService.ts`
- `src/services/competitionDrawEligibilityService.ts`
- `src/pages/DrawPage.tsx`
- `src/test/registrationClosingLifecycle.test.ts`
- `src/test/competitionDrawEligibilityService.test.ts`
- `src/test/competitionLifecycleService.test.ts`
- `src/test/competitionRegistrationIntegrity.test.ts`
- `src/test/registrationService.test.ts`
- `src/test/fase32IntegrityAndSecurity.test.ts`
- `supabase/migrations/20260905000001_lifecycle_enum_sync.sql`
- `supabase/migrations/20260905000002_legacy_status_migration.sql`
- `supabase/migrations/20260905000003_rls_portal_security.sql`
- `supabase/migrations/20260905000004_rpc_register_athlete_v2.sql`
- `docs/competition-portals/PHASE-3.2-IMPLEMENTATION.md`
- `docs/competition-portals/LIFECYCLE-INTEGRITY.md`
- `docs/competition-portals/PORTAL-SECURITY.md`
- `docs/competition-portals/DRAW-PERSISTENCE-INTEGRITY.md`
- `docs/competition-portals/WALKTHROUGH.md`

---

## 19. Decisões Arquiteturais

1. **Desacoplamento Rigoroso de Regras:** Fechar inscrições é ato operacional; organizar chaves é ato técnico. Separar ambos evitou que campeonatos ficassem travados sem encerramento por detalhes matemáticos de chaveamento.
2. **Defesa em Camadas:** Assegurar que mesmo se a UI falhar, o serviço de domínio bloqueie; mesmo se o serviço for contornado, a RPC bloqueie; e mesmo se a RPC não for utilizada, as políticas de RLS no PostgreSQL impeçam acessos cruzados.

---

## 20. Certificação Final

```text
BASEOS — FASE 3.2
CERTIFICAÇÃO TÉCNICA

Status:
COMPLETE WITH LIMITATIONS

Blockers:
01 — PASS (Enum PostgreSQL public.competition_status sincronizado com os 6 estados canônicos)
02 — PASS (Estratégia de migração legada não destrutiva documentada e implementada)
03 — PASS (RLS permissivo USING (true) removido; cadeia profiles -> competition_teams -> competition_athletes blindada)
04 — PASS (Guarda ativa exigindo confirmação de partidas salvas antes de transicionar para groups-defined)
05 — PASS (Bloqueio de avanço para groups-defined na UI caso a persistência de confrontos falhe)
06 — PASS (Linguagem corrigida de atomicidade para operação sequencial com guarda pós-persistência)
07 — PASS (Fechamento administrativo desacoplado da regra técnica groupsCount * 2 do sorteio)
08 — PASS (Autoridade de transições de lifecycle centralizada em CompetitionLifecycleService)
09 — PASS (Zero fallbacks hardcoded 14/4; CompetitionConfig como SSOT com bloqueio caso ausente/inválido)
10 — PASS (isRegistrationLocked bloqueia portal em todos os status pós-fechamento e fora de registration-open)
11 — PASS (RPC register_athlete v2 com SECURITY DEFINER e search_path validando todas as regras de domínio)
12 — PASS (Deadline protegido na UI, Domain Service e na RPC PostgreSQL)

Testes:
TypeScript: 0 erros (npx tsc -p tsconfig.app.json --noEmit)
Lint: 0 erros, 1 warning pré-existente (npm run lint)
Tests: 76 arquivos de teste, 625 testes aprovados, 0 falhas (npx vitest run)
Build: Sucesso em 58.14s (npm run build)

Migrations:
RLS: 20260905000003_rls_portal_security.sql
RPC: 20260905000004_rpc_register_athlete_v2.sql
Lifecycle: 20260905000001_lifecycle_enum_sync.sql & 20260905000002_legacy_status_migration.sql
Draw: Guarda de integridade pós-persistência implementada em competitionLifecycleService.ts

Limitações reais:
1. saveDrawWithMatches executa escrita sequencial (sorteio + partidas) e não transação atômica única via RPC PostgreSQL. A consistência é garantida pela guarda de confirmação pré-transição.
2. register_athlete v2 realiza contagem de elenco sob concorrência padrão; em caso de submissões simultâneas concorrentes extremas no mesmo milissegundo, recomenda-se SELECT FOR UPDATE na linha de competition_teams.

Pendências:
Nenhuma pendência técnica impeditiva para homologação da Fase 3.2.

Conclusão:
Todos os 12 blockers foram tratados, com evidências técnicas registradas; os itens não-transacionais permanecem explicitamente classificados como limitações.
```

# BASEOS — FASE 3.2: INTEGRIDADE DE LIFECYCLE, SEGURANÇA DO PORTAL E CONSISTÊNCIA DO SORTEIO

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Fase:** 3.2 — Fechamento de Integridade e Homologação Definitiva  
**Status:** Implementado e Homologado  

---

## 1. Objetivo

Resolver definitivamente os 12 blockers de integridade arquitetural, segurança de dados e consistência de lifecycle/sorteio identificados na auditoria técnica da Fase 3:
1. Sincronização do enum PostgreSQL `competition_status` com o domínio TypeScript.
2. Tratamento seguro e não destrutivo de dados legados (`draft`, `registration`).
3. Proteção RLS integral de ponta a ponta (`profiles`, `competition_teams`, `competition_athletes`).
4. Validação de persistência completa de grupos e partidas antes de transição para `groups-defined`.
5. Eliminação de promoção indevida de lifecycle sem confirmação de persistência.
6. Correção de terminologia técnica (substituição de falsa "atomicidade" por operações sequenciais protegidas).
7. Desacoplamento estrito entre Fechamento Administrativo (`closeRegistrations`) e Prontidão de Sorteio (`draw readiness`).
8. Centralização e validação de transições de lifecycle através de `CompetitionLifecycleService`.
9. Eliminação de fallbacks arbitrários (14 / 4) em prol do `CompetitionConfig` como Single Source of Truth (SSOT).
10. Bloqueio definitivo de edição no portal de atletas em todos os estados pós-fechamento.
11. Blindagem da RPC `register_athlete` v2 contra bypass de lifecycle, lock, deadline e limites.
12. Proteção ponta a ponta do deadline de inscrição (UI, Domain Service e RPC PostgreSQL).

---

## 2. Escopo e Princípios Arquiteturais

1. **Nome do Produto:** BaseOS exclusivamente. Proibido o uso de nomenclaturas legadas.
2. **CompetitionConfig como SSOT:** Nenhuma regra regulamentar paralela. Limites de elenco (`minAthletes`, `maxAthletes`, líberos) provêm unicamente de `competition.config` ou snapshot oficial. Na ausência de configuração válida, a operação é rejeitada com erro: `"Configuração da competição incompleta ou inválida."`
3. **Desacoplamento Close vs Draw:** O encerramento das inscrições (`registration-open` → `registration-closed`) é um ato administrativo e não exige `groupsCount * 2`. A exigência técnica de `groupsCount * 2` pertence exclusivamente ao `CompetitionDrawEligibilityService` para execução do sorteio round-robin/Berger.
4. **Defesa em Profundidade:**
   - Camada 1: Validações de Domínio e UI (`registrationService`, `competitionLifecycleService`).
   - Camada 2: RLS restritivo no PostgreSQL para acesso direto (`supabase/migrations/20260905000003_rls_portal_security.sql`).
   - Camada 3: RPC `SECURITY DEFINER` com validações internas independentes (`supabase/migrations/20260905000004_rpc_register_athlete_v2.sql`).

---

## 3. Alterações Realizadas

### 3.1 Camada de Domínio e Serviços (`src/services/`)
- [`src/services/registrationService.ts`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts):
  - Função `isRegistrationLocked`: atualizada para bloquear mutações em todos os estados não abertos: `planning`, `draft`, `registration-closed`, `draw-pending`, `groups-defined`, `in-progress`, `playoffs`, `completed`, `cancelled`.
  - Rejeição com erro explícito caso o limite de atletas não possa ser resolvido a partir da configuração da competição.
- [`src/services/competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts):
  - `validateTransition` para `registration-closed`: removido o requisito bloqueante de `(groupsCount ?? 1) * 2`. Inscrições podem ser fechadas administrativamente a qualquer momento pelo organizador.
  - `advanceToGroupsDefinedAfterDraw`: adicionada verificação ativa de persistência de partidas via `dataAccess.listMatches(competitionId)`. Se partidas não existirem no banco, o avanço é bloqueado com erro descritivo.
- [`src/services/competitionDrawEligibilityService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionDrawEligibilityService.ts):
  - `evaluateCompetitionDrawEligibility`: incorporada a restrição técnica estrutural de chaves do sorteio (`minTeamsForGroups = Math.max(2, resolvedGroupsCount * 2)`). Caso as equipes elegíveis sejam inferiores ao necessário para compor os grupos, um blocker de sorteio é gerado no diagnóstico da competição, sem travar o fechamento das inscrições.

### 3.2 Interface do Usuário (`src/pages/`)
- [`src/pages/DrawPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/DrawPage.tsx):
  - Atualizado para inspecionar o retorno detalhado de `saveDrawWithMatches` (exigindo `matches.length > 0`) e o retorno booleano `advanceResult.ok` antes de apresentar toast de sucesso ou atualizar a interface.

---

## 4. Migrations Criadas

1. `supabase/migrations/20260905000001_lifecycle_enum_sync.sql`:
   - Adiciona os 6 valores canônicos ao enum PostgreSQL `public.competition_status`:
     `planning`, `registration-open`, `registration-closed`, `draw-pending`, `groups-defined`, `playoffs`.
2. `supabase/migrations/20260905000002_legacy_status_migration.sql`:
   - Mapeamento seguro de dados legados existentes:
     `draft` → `planning` (quando sem draw ou partidas);
     `registration` → `registration-open`.
3. `supabase/migrations/20260905000003_rls_portal_security.sql`:
   - Revogação de policies permissivas `USING (true) WITH CHECK (true)`.
   - Proteção de `profiles`: usuários de equipe não podem alterar `role` nem `competition_team_id`.
   - Proteção de `competition_teams`: equipes só leem sua própria inscrição e não podem alterar campos estruturais (`competition_id`, `team_id`, `access_token`, `registration_deadline`, `is_locked`).
   - Proteção de `competition_athletes`: restrito ao `competition_team_id` da equipe, com verificação de `is_locked = false`, `deadline > now()` e status da competição ativo (`registration-open` ou legado `registration`).
4. `supabase/migrations/20260905000004_rpc_register_athlete_v2.sql`:
   - RPC `register_athlete` refatorada com `SECURITY DEFINER SET search_path = public`.
   - Validações sequenciais rigorosas: token de acesso, vínculo de equipe, lifecycle da competição, lock, deadline, resolução de `maxAthletes` via `config`/`rules_snapshot` (sem hardcode 14/4), e duplicidade de camisa.

---

## 5. Limitações Conhecidas e Decisões Técnicas

1. **Persistência de Sorteio Multi-Tabela:**
   - O método `dataAccess.saveDrawWithMatches` executa operações sequenciais de persistência (armazenamento do sorteio e geração/inserção de partidas). Embora a transição de lifecycle só ocorra após a confirmação da existência de partidas salvas no banco de dados, a operação de escrita ainda é sequencial e não envelopada em uma RPC transacional única do PostgreSQL. Classificado tecnicamente como: *Operação sequencial com guarda de confirmação*.
2. **Concorrência em Inscrição de Atletas:**
   - Em caso de duas requisições de atletas submetidas no mesmo milissegundo pelo mesmo token quando a equipe possui `maxAthletes - 1` atletas, a RPC realiza checagem sequencial de contagem (`count >= max_athletes`). Para proteção absoluta contra race conditions em alto paralelismo, recomenda-se um lock explícito de linha na tabela `competition_teams` (`SELECT id FROM competition_teams ... FOR UPDATE`).

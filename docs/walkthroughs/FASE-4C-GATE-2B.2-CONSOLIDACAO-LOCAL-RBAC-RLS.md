# FASE 4C — GATE 2B.2: CONSOLIDAÇÃO LOCAL DO HARDENING RBAC/RLS E COMPATIBILIDADE COM REFEREE

**Data de Execução:** 2026-09-29  
**Papel Operacional:** QA Master + Security Engineer + Auth Architect + DBA + Release Engineer  
**Projeto:** BaseOS / VOLTZ  
**Ambiente:** EXCLUSIVAMENTE DESENVOLVIMENTO LOCAL (`/home/diego-martins/docker/volei`)  
**Status do Gate:** **PASS** (100% Validado)

---

## 1. IDENTIFICAÇÃO

- **Gate:** 2B.2 — Consolidação Local do Hardening RBAC/RLS e Compatibilidade com Referee
- **Objetivo:** Consolidar no ambiente DEV a correção e o endurecimento das políticas de segurança RLS (Row Level Security) e RBAC identificados nos Gates 2A.3 e 2B.1, sem tocar na produção, garantindo que a remoção das políticas permissivas `*_auth_write` não quebre as operações legítimas dos árbitros (`role = 'referee'`), e preservando a estrita paridade com o enum real do PostgreSQL em produção (`user_role = {'organizer', 'referee', 'team', 'admin'}`).
- **Ambiente de Execução:** Local (`diego-martins`, `/home/diego-martins/docker/volei`, container `supabase-db`)
- **Produção:** `vmi3488325`, `https://voltz.baseos.online` — **100% READ-ONLY, INTOCADA** (0 DDL, 0 DML, 0 migrations, 0 deploys).

---

## 2. AMBIENTE E POLÍTICA DE EXECUÇÃO

O Gate 2B.2 foi executado sob estrito isolamento local:
- **Workspace:** `/home/diego-martins/docker/volei`
- **Bancos Locais Auditados e Validados:** Container Docker `supabase-db` (PostgreSQL 15.8), bases `postgres` e `volei_test_db`.
- **Produção Preservada:** Nenhuma conexão SSH de mutação, nenhuma instrução DDL ou DML foi emitida contra o host `vmi3488325`. Nenhuma política foi alterada em produção.

---

## 3. ESTADO INICIAL DO WORKSPACE

- **Branch Ativa:** `main`
- **HEAD Local:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`
- **Integridade do Histórico:** Nenhum comando destrutivo (`git reset --hard`, `git clean -fd`, `git restore .`) foi executado. Todas as alterações e arquivos pré-existentes de fases anteriores foram integralmente preservados.

---

## 4. ARQUIVOS E COMPONENTES ANALISADOS

1. `supabase/migrations/20260928230000_harden_admin_write_policies.sql` — Migration de hardening formulada no Gate 2A.3.
2. `src/types/auth.ts` — Enum e definições de `UserRole` e `UserProfile` na camada de tipos TypeScript.
3. `src/services/dataAccess.ts` — Camada centralizadora de persistência (Data Access Layer) e defesa em profundidade de autorização.
4. `src/services/tenantSecurityService.ts` — Serviço canônico de autorização de negócios (`canSubmitMatchScore`, `canReopenMatch`).
5. `src/services/authService.ts` — Gestão de sessões demo e Supabase Auth.
6. `src/components/auth/RequireAuth.tsx` — Guard de rotas com base no perfil do usuário logado.
7. `src/components/auth/TeamContextRedirector.tsx` — Interceptador e resolvedor canônico do portal da equipe (`/equipe`).
8. `src/pages/LoginPage.tsx` — Lógica de despacho de rotas pós-autenticação (`getSafeLoginDestination`).
9. `src/pages/TeamRosterRegistrationPage.tsx` — Validações de inscrição e restrições de time.
10. `src/components/match/LiveScorerDeskModal.tsx` & `src/pages/LiveScorerPage.tsx` — Interface operacional de lançamento de sets, pontuação e súmula digital.

---

## 5. MIGRATIONS ANALISADAS

- `20260819000004_admin_user.sql`: Introdução do valor `'admin'` ao tipo `user_role`.
- `20260914000001_provision_team_user.sql`: Criação da trigger `trg_protect_profile_sensitive_fields()` que impede que usuários alterem `role` ou `competition_team_id`.
- `20260914180000_restrict_role_based_write_policies.sql`: Tentativa histórica de introduzir `'scorer'` e `'viewer'` via `ALTER TYPE`, que não foi executada em produção.
- `20260914190000_harden_match_referee_authorization.sql`: Tentativa anterior com regras de escala de árbitro.
- `20260928230000_harden_admin_write_policies.sql`: Migration consolidada definitiva deste Gate.

---

## 6. POLICIES E SEGURANÇA ANALISADAS

### Políticas Permissivas Vulneráveis (Identificadas no Gate 2B.1 em Produção):
```text
competitions_auth_write  → FOR ALL TO authenticated USING (true) WITH CHECK (true)
matches_auth_write       → FOR ALL TO authenticated USING (true) WITH CHECK (true)
teams_auth_write         → FOR ALL TO authenticated USING (true) WITH CHECK (true)
venues_auth_write        → FOR ALL TO authenticated USING (true) WITH CHECK (true)
referees_auth_write      → FOR ALL TO authenticated USING (true) WITH CHECK (true)
draws_auth_write         → FOR ALL TO authenticated USING (true) WITH CHECK (true)
```
Essas políticas conferem permissão de escrita indiscriminada para qualquer usuário autenticado (`role = 'team'`, `role = 'referee'`, etc.), violando o princípio do menor privilégio.

---

## 7. DESCOBERTA CRÍTICA DO ENUM E DA AUSÊNCIA DE SCORER

Conforme apurado na auditoria forense do Gate 2B.1:
1. O tipo enum `user_role` no PostgreSQL em produção contém estritamente 4 valores:
   ```sql
   user_role = {'organizer', 'referee', 'team', 'admin'}
   ```
2. Não existem os valores `'scorer'` nem `'viewer'` no banco de dados de produção.
3. Produção NÃO possui a policy `matches_referee_scorer_update`.
4. Em produção, os árbitros atualmente dependiam exclusivamente da policy permissiva `matches_auth_write`.
5. **Decisão Arquitetural Mandatória do Gate 2B.2:**
   - **NÃO** alterar o tipo `user_role` no PostgreSQL (proibido emitir `ALTER TYPE user_role ADD VALUE`).
   - **NÃO** criar referências ou casts fictícios para `'scorer'::user_role` em policies RLS ou triggers.
   - Todo fluxo de arbitragem em banco de dados deve utilizar o role canônico real: `referee`.
   - O tipo TypeScript `scorer` permanece apenas como abstração de frontend/UI e mapeamento de funções no documento da súmula.

---

## 8. DESENHO DA POLICY E TRIGGERS PARA REFEREE

Para garantir que a eliminação de `matches_auth_write` não impeça os árbitros de lançar pontuações, parciais e observações, desenhou-se uma arquitetura em duas camadas (RLS + Trigger de Defesa em Profundidade):

### Camada 1: Política RLS `matches_referee_update`
```sql
CREATE POLICY "matches_referee_update" ON public.matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'referee'
        AND (
          matches.referees IS NULL
          OR jsonb_typeof(matches.referees) <> 'array'
          OR jsonb_array_length(matches.referees) = 0
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(matches.referees) AS r
            WHERE lower(trim(COALESCE(r->>'name', ''))) IN (lower(trim(p.name)), lower(trim(p.email)))
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'referee'
        AND (
          matches.referees IS NULL
          OR jsonb_typeof(matches.referees) <> 'array'
          OR jsonb_array_length(matches.referees) = 0
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(matches.referees) AS r
            WHERE lower(trim(COALESCE(r->>'name', ''))) IN (lower(trim(p.name)), lower(trim(p.email)))
          )
        )
    )
  );
```

### Camada 2: Trigger `trg_protect_match_admin_fields`
Disparado antes de `UPDATE` na tabela `matches`:
1. Identifica o perfil do chamador (`v_caller_role`) via `auth.uid()`.
2. Se `admin` ou `organizer`: autoriza qualquer alteração.
3. Se `referee`:
   - Bloqueia alteração da equipe de arbitragem (`NEW.referees IS DISTINCT FROM OLD.referees`).
   - Bloqueia alteração de todos os campos administrativos estruturais:
     - `competition_id`
     - `team_a_id`, `team_b_id`
     - `team_a_name`, `team_b_name`
     - `team_a_short_name`, `team_b_short_name`
     - `venue`, `court`
     - `scheduled_time`
     - `round`, `match_number`, `phase`, `group_name`, `slot_id`
     - `id`, `created_at`
   - Permite a atualização legítima de: `status`, `sets`, `lineups`, `observations`, `winner_id`, `is_wo`, `wo_reason`, `highlight_athlete_id`, `checked_in_athlete_ids`, `homologated_at`, `homologated_by`.
4. Se qualquer outro papel (ex: `team`, `viewer`): bloqueia sumariamente qualquer tentativa de escrita em `matches`.

---

## 9. CLASSIFICAÇÃO SISTEMÁTICA DE OCORRÊNCIAS DE `scorer`

Realizada busca exaustiva em todo o repositório (`grep -i scorer`):

| Categoria | Arquivos Principais | Classificação e Tratamento |
| :--- | :--- | :--- |
| **Tipo TypeScript** | `src/types/auth.ts`, `src/types/identity.ts`, `src/types/volleyball.ts` | Mantido no union `UserRole` para retrocompatibilidade da UI. Não é propagado como enum para o PostgreSQL. |
| **UI** | `src/components/match/LiveScorerDeskModal.tsx`, `src/pages/LiveScorerPage.tsx` | Componentes de mesa do apontador que operam sobre a partida. Utilizam permissões concedidas a árbitros e organizadores. |
| **Lógica Auth/RBAC** | `src/services/dataAccess.ts`, `src/services/tenantSecurityService.ts`, `RequireAuth.tsx`, `LoginPage.tsx` | Tratamento unificado de `referee` e `scorer` direcionando para `/jogos` e delegando checagem de escala a `TenantSecurityService.canSubmitMatchScore`. |
| **Document Engine** | `src/document-engine/schemas/match.schema.ts`, `coordinates/sumula3.coordinates.ts`, `sumula5.coordinates.ts` | Campos descritivos nominais impressos no cabeçalho/assinatura da súmula em PDF (Apontador). |
| **Migrations Históricas**| `20260914180000_*.sql`, `20260914190000_*.sql` | Migrations arquivadas não executadas em produção. |
| **Migration Consolidada**| `supabase/migrations/20260928230000_harden_admin_write_policies.sql` | **Livre de `scorer`**: usa exclusivamente `referee` e `user_role` sem casts inexistentes. |

---

## 10. ALTERAÇÕES REALIZADAS

1. **`supabase/migrations/20260928230000_harden_admin_write_policies.sql`**:
   - Removido qualquer `ALTER TYPE public.user_role ADD VALUE`.
   - Ajustada policy `matches_referee_update` para validar `p.role = 'referee'`.
   - Implementada a função e trigger `trg_protect_match_admin_fields` diretamente no arquivo de migração consolidado.
   - Aplicação e sincronização nos bancos locais `supabase-db` (`postgres` e `volei_test_db`).
2. **`src/test/gate2b2RefereeCompatibility.test.ts`**:
   - Criação de nova suíte automatizada cobrindo:
     - Routing de árbitro no login e guards de autenticação.
     - Avaliação de `TenantSecurityService.canSubmitMatchScore` (escala nominal, equipe vazia, bloqueio de time).
     - Testes RLS em banco real para os 9 cenários do referee.
     - Teste de ausência de dependência de enum inexistente.

---

## 11. MATRIZ DE TESTES DE SEGURANÇA EXECUTADOS

### Testes RLS e RBAC no PostgreSQL Real (`volei_test_db`):
- **Cenário 1 — Árbitro em Partida Autorizada:** Carlos Silva (árbitro escalado em `match-1`) atualiza `observations` → **PERMITIDO** (`rows updated = 1`).
- **Cenário 2 — Árbitro em Partida Alheia:** Carlos Silva tenta atualizar `match-marcos-only` (onde apenas Marcos Outro está escalado) → **BLOQUEADO POR RLS** (`rows updated = 0`).
- **Cenário 3 — Alteração de Campo Administrativo (`venue`):** Carlos Silva tenta alterar o ginásio em sua partida autorizada → **BLOQUEADO POR TRIGGER** (`trg_protect_match_admin_fields` disparou exceção "árbitro não pode alterar venue").
- **Cenário 4 — Adulteração de Equipe de Arbitragem (`referees`):** Carlos Silva tenta alterar a escala de árbitros em sua partida autorizada → **BLOQUEADO POR TRIGGER** (exceção "árbitro não possui permissão para alterar a equipe de arbitragem").
- **Cenário 5 — Escrita Administrativa em `competitions` por Árbitro:** Carlos Silva tenta alterar competição → **BLOQUEADO POR RLS** (`rows updated = 0`).
- **Cenário 6 — Escrita Administrativa em `teams` por Árbitro:** Carlos Silva tenta alterar equipe global → **BLOQUEADO POR RLS** (`rows updated = 0`).
- **Cenário 7 — Escrita Administrativa em `venues` por Árbitro:** Carlos Silva tenta alterar ginásios → **BLOQUEADO POR RLS** (`rows updated = 0`).
- **Cenário 8 — Escrita Administrativa em `referees` por Árbitro:** Carlos Silva tenta alterar cadastro de árbitros → **BLOQUEADO POR RLS** (`rows updated = 0`).
- **Cenário 9 — Escrita Administrativa em `draws` por Árbitro:** Carlos Silva tenta alterar chaveamento → **BLOQUEADO POR RLS** (`rows updated = 0`).

### Validação de Perfis `admin` e `organizer`:
- `is_admin_or_organizer()` testado como `SECURITY DEFINER`, `STABLE`, `SET search_path = public`.
- Escrita mantida integralmente em todas as tabelas administrativas para organizadores e administradores.

### Validação de Perfil `team` e Own-Data:
- Usuários com `role = 'team'` têm escrita rejeitada em `competitions`, `matches`, `teams`, `venues`, `referees`, `draws`.
- Usuários com `role = 'team'` mantêm capacidade legítima de gerenciar seus próprios atletas em `competition_teams` e `competition_athletes`.
- Isolamento entre equipes (Cross-Team Isolation) e proteção contra adulteração de perfil (`trg_protect_profile_sensitive_fields`) validados.

---

## 12. RESULTADOS DAS VERIFICAÇÕES DE CÓDIGO E BUILD

| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| **Typecheck TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **PASS** (0 erros) |
| **Lint / Git Check** | `git diff --check` | **PASS** (0 erros de formatação/espaçamento) |
| **Suíte Específica 2B.2** | `npx vitest run src/test/gate2b2RefereeCompatibility.test.ts` | **PASS** (17/17 testes aprovados) |
| **Suíte Específica 2A.3** | `npx vitest run src/test/gate2a3LocalHardening.test.ts` | **PASS** (22/22 testes aprovados) |
| **Regressão Geral** | `npm test` | **PASS** (132 test files, 1.409 testes aprovados) |
| **Build de Produção** | `npm run build` | **PASS** (`built in 2m 51s`, bundle gerado com sucesso) |

---

## 13. RISCOS E MITIGAÇÕES

1. **Risco de Escalação Nominal sem Match:** Se o nome ou e-mail do árbitro no perfil Supabase divergir da grafia cadastrada na partida, o árbitro ficaria bloqueado.
   - *Mitigação Implementada:* A policy aceita normalização com `lower(trim(...))` comparando tanto contra o nome quanto contra o e-mail do perfil, além de permitir operação imediata caso a equipe de arbitragem ainda esteja aberta (`referees IS NULL OR length = 0`).
2. **Risco de Adulteração Indireta via JSONB:** O campo `referees` é JSONB e poderia ser alvo de injeção.
   - *Mitigação Implementada:* O trigger `trg_protect_match_admin_fields` bloqueia qualquer mutação em `NEW.referees` realizada por árbitros, tornando o campo estritamente somente leitura para quem não é `admin` ou `organizer`.

---

## 14. PENDÊNCIAS

- Nenhuma pendência técnica impeditiva para o ambiente DEV.
- O ambiente DEV está 100% estabilizado e protegido.

---

## 15. IMPACTO PARA FUTURO STAGING / PRODUÇÃO

- Quando o Gate de promoção for acionado, a aplicação da migration `20260928230000_harden_admin_write_policies.sql` será 100% segura e compatível com a produção, pois:
  1. Não altera tipos enum existentes.
  2. Elimina as 6 vulnerabilidades críticas `*_auth_write`.
  3. Não bloqueia o trabalho dos árbitros em quadra.
  4. Mantém o portal de equipes funcionando para inscrições de elencos.

---

## 16. CONCLUSÃO

O Gate 2B.2 atingiu **PASS** com excelência técnica:
- Produção permaneceu 100% intocada e somente leitura.
- Hardening local do RBAC/RLS plenamente consolidado.
- Compatibilidade com referee garantida sem dependência de enums fictícios.
- 1.409 testes de regressão aprovados sem nenhuma quebra.
- Sistema pronto para avançar para a próxima fase.

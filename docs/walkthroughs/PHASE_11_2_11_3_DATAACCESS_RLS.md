# WALKTHROUGH — FASE 11.2 + 11.3: SEED, BACKFILL LOCAL, DATA ACCESS E RLS DA FUNDAÇÃO DE IDENTIDADE

**BaseOS — Sistema de Gestão de Competições de Voleibol**  
**Data:** 15 de Setembro de 2026  
**Branch:** `main`  
**Commit base:** `08c0ce967903b2465ea89c2e9ce5b24dca1097b5`  
**Ambiente:** Desenvolvimento (`docker/volei`) — *Nenhum acesso ou alteração à infraestrutura VOLTZ / Produção*

---

## 1. O QUE FOI ANALISADO

Antes de qualquer implementação, foi realizada uma auditoria completa nos seguintes artefatos:

1. **Relatórios e Diretrizes:**
   - `PHASE_11_AUDIT.md` e `docs/walkthroughs/PHASE_11_POST_MERGE_AUDIT.md`: identificação dos gaps P1 (RLS sem policies para tabelas criadas na 11.1, DataAccess sem métodos para `organizations` e `athletes`) e P2 (LocalStorage sem seed e ausência de teste de cenários de backfill).
   - `AGENTS.md`: regras de ouro do repositório (padrão adapter para `dataAccess.ts`, centralização de regras de negócio em `src/services`, typecheck, lint e testes obrigatórios sem regressão).
2. **Modelagem de Tipos e Serviços de Identidade:**
   - `src/types/identity.ts`: tipos fundamentais (`AthleteIdentity`, `UserMembership`, `ActiveContext`, `OrganizationRecord`, `OrganizationStatus`).
   - `src/services/identityService.ts`: normalização canônica de CPF (`normalizeCpf`) com validação de 11 dígitos numéricos e busca determinística (`findAthleteByCpf`).
   - `src/services/identityBackfillService.ts`: algoritmo determinístico de backfill sem unificação espúria por nome (`planAthleteBackfill`, `planLegacyTeamMembership`).
   - `src/types/registration.ts`: `CompetitionAthlete` com campo aditivo `athleteId?: string`.
   - `src/types/entities.ts`: `TeamRecord` com `organizationId?: string` e `genderCategory?: GenderCategory`, `CompetitionRecord` com `organizationId?: string`.
3. **Acesso a Dados e Adaptadores:**
   - `src/services/dataAccess.ts`: ciclo de vida de persistência, chaves de armazenamento, manipulação de coleções via `readCollection`/`writeCollection`, tratamento de inicialização em `ensureSeeded()`, e mapeamento bidirecional snake_case/camelCase via `toSnake` e `mapRows`/`mapRow`.
   - `src/lib/supabaseClient.ts`: catálogo central de tabelas `SUPABASE_TABLES`.
4. **Histórico de Migrations e RLS:**
   - `supabase/migrations/20260915000001_phase_11_identity_foundation.sql`: migration da Fase 11.1 que ativou RLS sem policies nas tabelas `organizations`, `athletes`, `user_memberships`.
   - `supabase/migrations/20260914180000_restrict_role_based_write_policies.sql` e `20260905000003_rls_portal_security.sql`: convenções existentes de funções de segurança (`public.is_admin_or_organizer()`) e autorização contextual.

---

## 2. O QUE FOI ALTERADO

Lista completa de arquivos criados e modificados:

| Arquivo | Status | Motivo / Descrição |
| :--- | :--- | :--- |
| `src/types/identity.ts` | Modificado | Adicionados `OrganizationStatus` e `OrganizationRecord`. |
| `src/types/registration.ts` | Modificado | Adicionado campo aditivo `athleteId?: string` em `CompetitionAthlete`. |
| `src/types/entities.ts` | Modificado | Adicionados campos aditivos `organizationId` e `genderCategory` em `TeamRecord`/`CompetitionRecord`, re-exportando tipos de identidade. |
| `src/lib/supabaseClient.ts` | Modificado | Adicionada chave `organizations: 'organizations'` em `SUPABASE_TABLES`. |
| `src/data/seed.ts` | Modificado | Adicionados `seedOrganizations`, `seedAthletes`, `seedUserMemberships`, equipe feminina `team-f-vortex`, 2ª competição `comp-copa-pro-2026`, participações vinculadas a `athleteId` e cobertura dos Cenários A a F sem corromper `ct-m-2`. |
| `src/services/dataAccess.ts` | Modificado | `CollectionName` estendido para `'organizations'` e `'athletes'`. `ensureSeeded()` atualizado para inicialização e backfill sob demanda no LocalStorage. Implementados métodos completos de `organizations` e `athletes` em `localStorageAdapter` e `supabaseAdapter` com tratamento de concorrência PostgreSQL `23505`. `clearEntireDatabase()` estendido. |
| `src/services/identityBackfillService.ts` | Modificado | Implementado `planFullIdentityBackfill` determinístico para auditoria e planejamento de migração local sem mutações. |
| `supabase/migrations/20260915120000_phase_11_initial_rls_policies.sql` | **Criado** | Nova migration aditiva com policies RLS restritivas para `user_memberships`, `organizations` e `athletes`. |
| `src/test/identityPhase11SeedAndDataAccess.test.ts` | **Criado** | Suíte completa com 24 testes unitários e de integração cobrindo Seed (A-F), Backfill, DataAccess e estrutura RLS. |
| `docs/walkthroughs/PHASE_11_2_11_3_DATAACCESS_RLS.md` | **Criado** | Este relatório técnico obrigatório. |

---

## 3. BANCO DE DADOS & MIGRATIONS

### 3.1. Nova Migration
- **Arquivo:** `supabase/migrations/20260915120000_phase_11_initial_rls_policies.sql`
- **Timestamp:** `20260915120000` (cronologicamente superior a `20260915000001`).
- **Natureza:** Aditiva, idempotente (`DROP POLICY IF EXISTS`), não-destrutiva.

### 3.2. Tabelas Afetadas e Policies Criadas

#### `public.user_memberships`
- **SELECT (`user_memberships_read_own_or_admin`):**
  ```sql
  user_id = auth.uid() OR public.is_admin_or_organizer()
  ```
  Permite que o usuário consulte exclusivamente suas próprias memberships, ou que administradores/organizadores auditem o sistema.
- **FOR ALL (`user_memberships_admin_organizer_all`):**
  ```sql
  public.is_admin_or_organizer()
  ```
  INSERT, UPDATE e DELETE reservados exclusivamente para `admin` e `organizer`. Impede elevação de privilégio por dirigentes de equipe ou atacantes.

#### `public.organizations`
- **SELECT (`organizations_read_scoped_or_admin`):**
  ```sql
  public.is_admin_or_organizer()
  OR EXISTS (
    SELECT 1 FROM public.user_memberships um
    WHERE um.organization_id = organizations.id
      AND um.user_id = auth.uid()
      AND um.status IN ('active', 'pending')
  )
  OR EXISTS (
    SELECT 1 FROM public.competitions c
    JOIN public.competition_teams ct ON ct.competition_id = c.id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.organization_id = organizations.id
      AND ct.id = p.competition_team_id
  )
  ```
  Garante que uma organização só seja visível para quem possui vínculo ativo/pendente comprovado via membership ou perfil legado de equipe na competição da organização.
- **FOR ALL (`organizations_admin_organizer_all`):**
  ```sql
  public.is_admin_or_organizer()
  ```
  Gestão institucional restrita a administradores e organizadores.

#### `public.athletes`
- **SELECT (`athletes_read_scoped_or_admin`):**
  ```sql
  public.is_admin_or_organizer()
  OR EXISTS (
    SELECT 1 FROM public.competition_athletes ca
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ca.athlete_id = athletes.id
      AND ca.competition_team_id = p.competition_team_id
  )
  OR EXISTS (
    SELECT 1 FROM public.competition_athletes ca
    JOIN public.user_memberships um ON um.user_id = auth.uid() AND um.status IN ('active', 'pending')
    WHERE ca.athlete_id = athletes.id
      AND (
        (um.competition_team_id IS NOT NULL AND ca.competition_team_id = um.competition_team_id)
        OR (um.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.competition_teams ct
          WHERE ct.id = ca.competition_team_id AND ct.team_id = um.team_id
        ))
      )
  )
  ```
  Impede que dirigentes de uma equipe consultem o cadastro global de atletas de outras equipes. O acesso a um atleta só é permitido se este fizer parte do elenco sob gestão do usuário.
- **FOR ALL (`athletes_admin_organizer_all`):**
  ```sql
  public.is_admin_or_organizer()
  ```
  Restrito a administradores e organizadores nesta fase.

### 3.3. Policies Deliberadamente NÃO Criadas e Justificativa
- **NENHUMA policy com `USING (true)` para tabelas de identidade:**
  A tabela `athletes` armazena dados protegidos por privacidade (CPF e data de nascimento). Conceder leitura global autenticada permitiria scraping irrestrito de CPFs entre equipes concorrentes.
- **NÃO foi criada policy de INSERT direto em `athletes` para dirigentes de equipe:**
  A criação e matching de atletas por dirigentes será realizada na Fase 11.4 via RPC transacional controlada (com normalização canônica e verificação de concorrência), impedindo poluição do catálogo global por inserções diretas arbitrárias.

---

## 4. DATA ACCESS

### 4.1. Métodos Adicionados ao `dataAccess`
Foram adicionadas as seguintes operações com paridade rigorosa entre `localStorageAdapter` e `supabaseAdapter`:

#### Organizations
- `listOrganizations(): Promise<OrganizationRecord[]>`
- `getOrganizationById(id: string): Promise<OrganizationRecord | null>`
- `createOrganization(input: Omit<OrganizationRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<OrganizationRecord>`

#### Athletes
- `listAthletes(): Promise<AthleteIdentity[]>`
- `getAthleteById(id: string): Promise<AthleteIdentity | null>`
- `getAthleteByCpf(cpf: string): Promise<AthleteIdentity | null>`
- `createAthlete(input: Omit<AthleteIdentity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<AthleteIdentity>`

### 4.2. Diferenças e Concorrência entre LocalStorage e Supabase
- **LocalStorage:** Valida previamente no array em memória se já existe atleta com o `normalizedCpf` informado. Se existir, lança `Error('Violação de unicidade: CPF já cadastrado (uq_athletes_normalized_cpf).')`.
- **Supabase:** O PostgreSQL protege a unicidade via `uq_athletes_normalized_cpf`. O método `createAthlete` intercepta erros de banco: se `error.code === '23505'` (código SQL de violação de restrição única), traduz para uma exceção explícita `Error('Violação de unicidade: CPF já cadastrado [23505] ...')`, sem engolir o erro nem retornar nulo mascarando falha de integridade.
- **Inicialização transparente:** No LocalStorage, caso a chave `SEED_VERSION` já estivesse presente no navegador do desenvolvedor, `ensureSeeded()` verifica a existência das novas coleções (`organizations`, `athletes`, `user_memberships`) e as injeta sob demanda, evitando estado inconsistente em sessões ativas.

---

## 5. SEED (FASE 11.2)

O seed em `src/data/seed.ts` foi enriquecido para contemplar todos os cenários exigidos:

### Cobertura dos Cenários:
- **Cenário A (1 membership, 1 equipe, 1 competição):**
  Usuário `demo-team` possui membership ativa em `team-m-2` (`ct-m-2`) na competição `comp-masculino-2026`.
- **Cenário B (2 memberships ativas em 2 equipes diferentes):**
  Usuário `user-manager-multi` possui memberships ativas independentes em `team-m-3` (`ct-m-3`) e `team-m-4` (`ct-m-4`).
- **Cenário C (Mesmo usuário gerenciando Clube X Masculino e Feminino):**
  Usuário `demo-admin` possui memberships ativas de dirigente para `team-m-1` (`Vortex Vôlei Clube`, masculino) e `team-f-vortex` (`Vortex Vôlei Feminino`, feminino), ambas sob a organização `org-vortex`.
- **Cenário D (Mesma equipe em múltiplas competições):**
  `team-m-1` participa da `comp-masculino-2026` (`ct-m-1`) e da `comp-copa-pro-2026` (`ct-m-1-copa`) utilizando a mesmíssima entidade persistente de equipe.
- **Cenário E (Mesmo atleta em competições diferentes):**
  Atleta canônico `athlete-001` (Lucas Silveira, CPF normalizado `10000013700`) possui participação vinculada em `ct-m-1` (`ath-m1-01`) e em `ct-m-1-copa` (`ath-copa-01`).
- **Cenário F (Atletas sem CPF com mesmo nome mantêm identidades distintas):**
  Dois atletas chamados `"Pedro Sem CPF"` cadastrados com IDs distintos (`athlete-nocpf-1` e `athlete-nocpf-2`), sem CPF (`normalizedCpf: undefined`), com participações distintas (`ath-nocpf-part-1` em `ct-m-1-copa` e `ath-nocpf-part-2` em `ct-f-vortex`). Nunca são unificados apenas por terem o mesmo nome.

*Nota de não-regressão:* O elenco canônico de `ct-m-2` foi rigorosamente preservado com exatamente 12 atletas (camisas 1-12) para manter compatibilidade absoluta com os testes unitários pré-existentes de `registrationService.test.ts`.

---

## 6. BACKFILL LOCAL

### Validação do Algoritmo
- Analisado `src/services/identityBackfillService.ts`.
- Expandido com a função determinística `planFullIdentityBackfill(input)` que processa:
  1. Atletas legados (`competition_athletes`): utiliza `planAthleteBackfill` para mapear CPFs. Se existir CPF igual na identidade global, reutiliza; se não houver CPF, cria identidade nova isolada; se houver conflito, rejeita.
  2. Vínculos de dirigentes (`profiles`): identifica perfis com `competition_team_id`, resolve a hierarquia `competition_team -> team/competition -> organizationId` e gera a membership correspondente.
  3. Casos ambíguos: registra explicitamente perfis de dirigentes sem `competition_team_id`, referências inexistentes ou organizações indefinidas na lista `ambiguousProfiles`, permitindo auditoria prévia antes de qualquer gravação.

---

## 7. SEGURANÇA

1. **Proteção de CPF e Privacidade:**
   - Normalização centralizada e única via `identityService.normalizeCpf`.
   - Consulta e persistência sempre utilizam a chave técnica de 11 dígitos.
   - Nenhuma listagem pública expõe a tabela `athletes`.
2. **Isolamento Multi-Tenant e Contexto:**
   - Apenas `user_id = auth.uid()` pode consultar memberships na API do Supabase.
   - Memberships com status `blocked` ou `ended` não concedem acesso aos escopos protegidos.
3. **Comportamento do `service_role`:**
   - O Supabase concede a permissão `BYPASSRLS` à role `service_role`.
   - Nenhuma policy utilizou `FORCE ROW LEVEL SECURITY`. Portanto, rotinas de background, triggers e migrações executadas com chave de serviço mantêm operação garantida.
4. **Riscos Restantes (Mitigados para as Fases 11.4 e 11.5):**
   - O portal da equipe ainda opera na ponte legada `profiles.competition_team_id`. Essa ponte continuará ativa até que a interface de alternância de contexto (`ContextSelector`) e o `TeamPortalGuard` estejam homologados na Fase 11.5.

---

## 8. DECISÕES TÉCNICAS

1. **Reutilização da função de segurança existente:**
   A migration aproveitou a função `public.is_admin_or_organizer()` já existente e consolidada na base de dados desde a Fase 9.9, evitando duplicação de funções SECURITY DEFINER.
2. **Tratamento do Erro 23505 no Adapter:**
   Em vez de silenciar falhas com `null` ou mascarar o erro, o `supabaseAdapter` trata explicitamente a colisão de índice único de CPF informando a violação de unicidade ao chamador.
3. **Preservação de `ct-m-2`:**
   A equipe `ct-m-2` é alvo de asserções estritas de contagem de elenco (12 atletas) em `registrationService.test.ts`. O atleta de teste sem CPF do Cenário F foi alocado em `ct-f-vortex` em vez de `ct-m-2`, mantendo 100% de estabilidade na suíte de testes legada.

---

## 9. RESULTADOS DOS TESTES E VERIFICAÇÕES

Todos os testes e checagens obrigatórias foram executados no ambiente real:

### 1. Vitest (Suíte Completa)
```bash
npm test -- --run
```
- **Arquivos de Teste:** 124 passed (124)
- **Total de Testes:** 1287 passed (1287)
- **Falhas:** 0 falhas (100% de sucesso)

### 2. Suíte Específica da Fase 11.2/11.3
```bash
npx vitest run src/test/identityPhase11SeedAndDataAccess.test.ts
```
- **24 testes:** 24 passed (Seed A-F, Backfill, DataAccess, RLS structure)

### 3. Typecheck
```bash
npx tsc -p tsconfig.app.json --noEmit
```
- **Resultado:** 0 erros de tipo (saída limpa com código de saída 0).

### 4. ESLint
```bash
npm run lint
```
- **Resultado:** 0 erros (1 aviso pré-existente de dependência em hook no `DrawArenaCanvas.tsx`).

### 5. Build de Produção
```bash
npm run build
```
- **Resultado:** Build concluído com sucesso via Vite em 31.44s sem falhas de empacotamento.

---

## 10. PROBLEMAS ENCONTRADOS E RESOLVIDOS

1. **Ajuste de asserção de teste de seed:**
   O teste inicial esperava `'Vortex Vôlei Clube'` para a entidade institucional `org-vortex`, cujo nome no seed é `'Associação Vortex Esportes'`. A asserção foi alinhada com o modelo formal do clube.
2. **Conflito de contagem de elenco em `ct-m-2`:**
   O cenário F inicialmente utilizava `ct-m-2` para uma participação sem CPF, elevando o elenco inicial de 12 para 13 atletas e quebrando o teste de limite de 14 atletas em `registrationService.test.ts`. A participação foi realocada para `ct-f-vortex`, preservando a integridade dos testes de regras de inscrição.
3. **Validação de regex de teste em comentário SQL:**
   A regex que verificava a ausência de `USING (true)` disparou contra o próprio comentário explicativo do cabeçalho da migration. O comentário foi reformulado e o teste foi aprimorado para desconsiderar linhas de comentário SQL.

---

## 11. PENDÊNCIAS CLASSIFICADAS

- **P0 (Bloqueante):** Nenhuma.
- **P1 (Alta Prioridade):** Nenhuma para o escopo das Fases 11.2 e 11.3.
- **P2 (Evolução Futura — Fase 11.4):**
  - Conectar a busca canônica de atletas por CPF ao fluxo de inscrição online de atletas (`registrationService` e RPC `register_athlete`).
- **P3 (Interface e Contexto — Fase 11.5):**
  - Implementação do `ContextSelector` (seletor de contexto ativo para usuários com múltiplas equipes/organizações).
  - Migração gradual de `profiles.competition_team_id` para `ActiveContext`.

---

## 12. PRÓXIMO PASSO RECOMENDADO

Conforme a condição de parada estrita estabelecida:

```text
Auditoria da Fase 11.2/11.3
         ↓
Fase 11.4 somente após aprovação humana/técnica
```

A execução está concluída e em total conformidade arquitetural.

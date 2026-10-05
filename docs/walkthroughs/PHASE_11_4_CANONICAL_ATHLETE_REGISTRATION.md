# BASEOS — WALKTHROUGH & RELATÓRIO TÉCNICO FASE 11.4

## CADASTRO CANÔNICO DE ATLETAS + MATCHING POR CPF + INSCRIÇÃO TRANSACIONAL

---

## 1. O que foi analisado

Antes de qualquer modificação, foi realizada a auditoria técnica de conformidade arquitetural e segurança:
- **`AGENTS.md`**: Regras canônicas de projeto, ciclo de vida e comandos de verificação (`tsc`, `lint`, `test`, `build`).
- **`PHASE_11_AUDIT.md`**, **`docs/walkthroughs/PHASE_11_POST_MERGE_AUDIT.md`**, **`docs/walkthroughs/PHASE_11_2_11_3_DATAACCESS_RLS.md`**: Contexto de merge, decisões da fundação de identidade, schema das tabelas `organizations`, `athletes`, `user_memberships` e policies de RLS.
- **`src/types/identity.ts`**, **`src/types/registration.ts`**, **`src/types/entities.ts`**: Verificação do campo `athleteId?: string` em `CompetitionAthlete`, tipagem de `AthleteIdentity`, e status de ciclo de vida (`CompetitionLifecycleStatus`).
- **`src/services/identityService.ts`**: Avaliação de `normalizeCpf()`, `findAthleteByCpf()` e regras canônicas de unicidade.
- **`src/services/identityBackfillService.ts`**: Plano de backfill determinístico de legados.
- **`src/services/competitionRegistrationService.ts`**: Análise de `validateAthleteRegistration`, identificando e corrigindo acoplamento indevido por nome para atletas sem CPF e validação global em vez de escopo da competição.
- **`src/services/registrationService.ts`**: Mapeamento do fluxo de `addAthlete` e `updateAthlete`, isolamento de dados de participação (número da camisa, posição, capitão, líbero) em relação à identidade canônica (`athletes`).
- **`src/services/dataAccess.ts`**: Auditoria dos métodos de persistência em ambos os adaptadores (`localStorageAdapter` e `supabaseAdapter`), garantindo paridade funcional estrita.
- **Migrations SQL existentes**: Inspeção de `20260915100000_phase_11_identity_organization_membership.sql` e `20260915120000_phase_11_initial_rls_policies.sql`.
- **Suíte de Testes**: 124 arquivos de teste existentes com 1.287 testes.

---

## 2. O que foi alterado

### Arquivos Criados:
1. `supabase/migrations/20260916000001_phase_11_canonical_athlete_registration.sql`
   - Função utilitária `public.normalize_cpf(text)`.
   - Função transacional atômica `public.get_or_create_athlete_id(...)` com cláusula `ON CONFLICT (normalized_cpf) DO UPDATE`.
   - Atualização da RPC `public.register_athlete` (inscrição pública por token) para vincular canonicamente o `athlete_id`.
   - Criação da RPC transacional autenticada `public.register_competition_athlete_auth` com verificação de `auth.uid()`, validação de memberships ativas, verificação de prazos e restrições esportivas.
2. `src/test/identityCanonicalAthleteRegistration.test.ts`
   - Suíte de 16 testes cobrindo rigorosamente todos os 12 cenários obrigatórios e análise estática de segurança SQL.
3. `docs/walkthroughs/PHASE_11_4_CANONICAL_ATHLETE_REGISTRATION.md`
   - Este relatório de homologação técnica.

### Arquivos Modificados:
1. `src/services/identityService.ts`
   - Exportação da função canônica `getOrCreateAthleteIdentity(input, dataAccessLayer)` para resolução determinística de identidade com tratamento de concorrência.
2. `src/services/dataAccess.ts`
   - Atualização de `localStorageAdapter.createCompetitionAthlete` e `supabaseAdapter.createCompetitionAthlete` para garantir que toda criação de participação resolva e vincule um `athleteId` canônico.
   - Implementação de `registerCompetitionAthleteAuth` em `localStorageAdapter` e em `supabaseAdapter` (via chamada à RPC transacional).
   - Atualização de `registerAthletePublic` em `localStorageAdapter` para atualizar status da equipe para `in_progress`.
3. `src/services/competitionRegistrationService.ts`
   - Utilização de `normalizeCpf` e `athleteId` para checagem de duplicidade de atleta na mesma competição, removendo comparação falsa por mesmo nome para atletas sem documento.
4. `src/services/registrationService.ts`
   - Ajuste em `addAthlete` e `updateAthlete` para filtrar atletas da mesma competição ao validar conflitos no torneio.
   - Integração com `registerCompetitionAthleteAuth`.
   - Isolamento estrito entre dados de participação (`jerseyNumber`, `position`, `isCaptain`, `isLibero`) e dados de identidade (`athletes`), garantindo que alterações contextuais em uma competição não alterem a participação em outra.
5. `src/test/dataAccessAdapter.test.ts`
   - Atualização do mock `TABLE_ALLOWED_COLUMNS['competition_athletes']` para incluir a coluna `athlete_id`.

---

## 3. Fluxo Implementado

```text
Dirigente Autenticado / Inscrição Pública
              │
              ▼
   registrationService.addAthlete
              │
              ├─ Valida se prazo de inscrição da equipe não expirou / não bloqueado
              ├─ Valida ciclo de vida da competição (status não bloqueado)
              ├─ Valida regras esportivas locais (camisa única no time, max 1 capitão, max 2 líberos, limite de elenco)
              │
              ▼
   dataAccess.registerCompetitionAthleteAuth / registerAthletePublic
              │
              ├─ Validação de Autorização:
              │    auth.uid() -> listUserMemberships(userId)
              │    Exige membership com status = 'active' vinculada à equipe/organização
              │    Rejeita memberships 'blocked', 'ended' ou inexistentes
              │
              ▼
   identityService.getOrCreateAthleteIdentity / RPC get_or_create_athlete_id
              │
              ├─ Normalização canônica do CPF: normalizeCpf(doc)
              │
              ├─ Se CPF fornecido:
              │    Consulta athletes por normalized_cpf
              │    - Encontrado: reutiliza athletes.id (NÃO duplica identidade global)
              │    - Não encontrado: insere novo registro em athletes (ON CONFLICT DO UPDATE)
              │
              └─ Se CPF ausente / vazio:
                   Gera nova identidade ISOLADA em athletes
                   (mesmo nome NÃO significa mesma pessoa — zero fusão automática)
              │
              ▼
   Inserção em competition_athletes
              │
              ├─ Grava id da participação (ath-*)
              ├─ Grava competition_team_id
              ├─ Grava athlete_id apontando para athletes.id
              ├─ Grava dados de participação (camisa, posição, capitão, líbero, status)
              └─ Atualiza status da equipe de 'invited' para 'in_progress'
```

---

## 4. Banco de Dados

### Migration: `20260916000001_phase_11_canonical_athlete_registration.sql`
- **Helper `public.normalize_cpf(text)`**: Converte para apenas dígitos e valida 11 caracteres.
- **Função `public.get_or_create_athlete_id(...)`**:
  - `SECURITY DEFINER` com `SET search_path = public, pg_temp;`.
  - Tratamento atômico de concorrência com `INSERT INTO athletes ... ON CONFLICT (normalized_cpf) DO UPDATE SET updated_at = now() RETURNING id;`.
  - Atletas sem CPF geram UUID isolado via `gen_random_uuid()` sem conflito de chave.
- **RPC `public.register_competition_athlete_auth(...)`**:
  - Valida identidade do chamador via `auth.uid()`.
  - Verifica se o chamador possui vínculo ativo (`status = 'active'`) em `user_memberships` para a equipe ou organização.
  - Verifica integridade de prazos (`is_locked`, `registration_deadline`) e ciclo de vida da competição.
  - Valida limites de elenco e duplicidade de número de camisa na equipe.
  - Invoca atomicamente `get_or_create_athlete_id` e insere a participação em `competition_athletes`.
- **RPC `public.register_athlete(...)`**:
  - Atualizada para invocar `get_or_create_athlete_id` e preencher `athlete_id` na participação registrada via link público de convite com token.

---

## 5. DataAccess: Paridade LocalStorage e Supabase

| Funcionalidade | LocalStorage Adapter | Supabase Adapter |
| :--- | :--- | :--- |
| **Resolução Canônica de Identidade** | `getOrCreateAthleteIdentity` (com fallback de retry contra race conditions) | `get_or_create_athlete_id` (PostgreSQL `ON CONFLICT`) |
| **Inscrição Autenticada Transacional** | `registerCompetitionAthleteAuth` (valida memberships ativas em memória) | `registerCompetitionAthleteAuth` (RPC com validação de `auth.uid()`) |
| **Inscrição Pública por Token** | `registerAthletePublic` (resolve identidade e vincula `athleteId`) | `registerAthletePublic` (RPC `register_athlete` atualizada) |
| **Criação Direta de Participação** | `createCompetitionAthlete` (popula `athleteId` se omitido) | `createCompetitionAthlete` (popula `athleteId` se omitido) |
| **Edição de Atleta** | Atualiza apenas a linha específica em `competition_athletes` | Atualiza apenas a linha específica em `competition_athletes` |

---

## 6. Regras de Matching

1. **CPF Novo**:
   - CPF inédito gera novo registro em `athletes` e preenche `competition_athletes.athlete_id`.
2. **CPF Existente**:
   - Se o CPF já existe na base global `athletes`, a identidade existente é reutilizada (`athletes.id`), criando apenas uma nova participação (`competition_athletes`). Nenhuma identidade duplicada é criada.
3. **CPF com Formatação Diferente**:
   - `222.333.444-55`, `22233344455` e `222 333 444 55` são todos normalizados para `22233344455` via `normalizeCpf()` antes de qualquer consulta ou gravação.
4. **Ausência de CPF (Sem Documento)**:
   - Duas inserções com o mesmo nome (ex: "Pedro Sem CPF") geram duas identidades totalmente distintas e isoladas em `athletes`. Não ocorre merge nem matching automático por nome.
5. **Concorrência**:
   - Duas requisições simultâneas com o mesmo CPF concorrem atomicamente no banco pela constraint `uq_athletes_normalized_cpf` via `ON CONFLICT`, garantindo unicidade estrita da identidade global.

---

## 7. Segurança e Isolamento Multi-Tenant

- **Controle de Acesso Baseado em Membership**: Dirigentes só podem inscrever atletas em equipes onde possuam registro ativo em `user_memberships`.
- **Rejeição de Status Inválidos**: Usuários com membership `blocked` ou `ended` são bloqueados com erro `Não autorizado a cadastrar atletas nesta equipe.`
- **Sem Bypass de Autorização**: O backend não confia em parâmetros arbitrários de usuário fornecidos pelo cliente; a validação utiliza `auth.uid()`.
- **Análise Estática SQL**: Verificação automatizada de ausência de cláusulas vulneráveis (`USING (true)` ou `WITH CHECK (true)`) na migration da Fase 11.4.

---

## 8. Testes Executados

### Suíte Específica da Fase 11.4:
```bash
npx vitest run src/test/identityCanonicalAthleteRegistration.test.ts
```
- **Total de Testes**: 16
- **Passados**: 16 (100%)
- **Falhas**: 0
- **Cenários Cobertos**:
  - TESTE 1: CPF inexistente cria AthleteIdentity, cria CompetitionAthlete e preenche athleteId.
  - TESTE 2: CPF existente reutiliza athletes.id e cria nova participação sem duplicar identidade.
  - TESTE 3: Formatos distintos de CPF resultam na mesma identidade.
  - TESTE 4: Atletas com mesmo nome e sem CPF geram identidades distintas e isoladas.
  - TESTE 5: Mesmo atleta participa de 2 competições e edição contextual preserva dados da outra.
  - TESTE 6: Mesma equipe participa de duas competições distintas sem duplicar registro de teams.
  - TESTE 7: Concorrência simultânea com o mesmo CPF resulta em uma única identidade canônica.
  - TESTE 8: Usuário sem vínculo de membership com a equipe é rejeitado.
  - TESTE 9: Membership com status blocked ou ended não autoriza o cadastro.
  - TESTE 10: `competition_athletes.athleteId` aponta de forma determinística para `athletes.id`.
  - TESTE 11: Preservação estrita dos 12 atletas existentes em `ct-m-2`.
  - TESTE 12 (Análise Estática SQL): Existência da migration, ausência de `USING(true)`, presença de RPC transacional com `auth.uid()`, concorrência atômica e `search_path` seguro.

### Suíte Completa do Projeto:
```bash
npm test -- --run
```
- **Arquivos de Teste**: 125 arquivos avaliados
- **Total de Testes**: 1.303 testes
- **Passados**: 1.303 testes (100%)
- **Falhas**: 0

---

## 9. Typecheck (TypeScript)
```bash
npx tsc -p tsconfig.app.json --noEmit
```
- **Erros**: 0
- **Status**: Limpo e aprovado.

---

## 10. ESLint
```bash
npm run lint
```
- **Erros**: 0
- **Avisos**: 1 (aviso pré-existente de dependência em hook de animação de canvas)
- **Status**: Aprovado conforme regra do projeto.

---

## 11. Build de Produção
```bash
npm run build
```
- **Status**: Sucesso em 41.47s.
- **Bundle**: Gerado sem falhas no diretório `dist/`.

---

## 12. Problemas Encontrados e Soluções

1. **Validação Global de Atletas Bloqueava Inscrição em Múltiplas Competições**:
   - *Causa*: `registrationService.addAthlete` passava a lista global de atletas de todas as competições para `CompetitionRegistrationService.validateAthleteRegistration`, impedindo que o mesmo atleta disputasse competições distintas.
   - *Solução*: O escopo de validação de duplicidade por torneio foi ajustado para carregar apenas as equipes e atletas pertencentes à competição corrente (`team.competitionId`).
2. **Matching Falso por Nome para Atletas Sem CPF**:
   - *Causa*: `validateAthleteRegistration` continha regra legada que bloqueava atletas com mesmo nome se algum documento estivesse preenchido.
   - *Solução*: Conforme a regra canônica de identidade, a checagem foi estritamente fundamentada em `normalizeCpf` e `athleteId`.
3. **Mock Schema do Supabase no Teste `dataAccessAdapter.test.ts`**:
   - *Causa*: `TABLE_ALLOWED_COLUMNS.competition_athletes` não continha a nova coluna `athlete_id`.
   - *Solução*: Coluna `athlete_id` adicionada ao conjunto de colunas permitidas no mock do teste.

---

## 13. Matriz de Pendências

- **P0**: Nenhuma.
- **P1**: Nenhuma.
- **P2**: Nenhuma.
- **P3**: Nenhuma pendência impeditiva para a Fase 11.4.

---

## 14. Escopo Não Realizado (Preservado para a Fase 11.5)

Conforme instrução expressa das seções 17 e 23:
- NÃO foi criado o componente `ContextSelector`.
- NÃO foi alterada a coluna legada `profiles.competition_team_id`.
- NÃO foi realizada a transição do portal para `ActiveContext`.
- NÃO foram feitas alterações estruturais no frontend dos portais.
- A infraestrutura da VOLTZ/produção permaneceu 100% intocada.

---

## 15. Estado Final

**Status**: `READY`

A Fase 11.4 foi concluída com excelência técnica, 100% dos 1.303 testes passando, paridade estrita entre adapters, concorrência atômica no PostgreSQL e isolamento multi-tenant garantido.

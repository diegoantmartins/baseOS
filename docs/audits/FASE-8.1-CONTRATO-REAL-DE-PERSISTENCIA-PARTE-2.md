# BASEOS — RELATÓRIO TÉCNICO DE AUDITORIA — FASE 8.1
# PARTE 2: AUTH, DATA ACCESS, GAPS ARQUITETURAIS E DIRETRIZES FASE 8.2
*(Seções 12 a 25 do Contrato Canônico de Persistência)*

> **Documento complementar:** Consulte a [Parte 1 (Seções 1 a 11)](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md) para Resumo Executivo, Estado Inicial, Schema PostgreSQL Real, Matriz Canônica Domínio → DB e Contratos das Entidades Principais (Competition, Team, CompetitionTeam, CompetitionAthlete, Match).

---

## 12. AUTENTICAÇÃO, PERFIS E O MODELO DO RESPONSÁVEL DA EQUIPE

### 12.1. Respostas às 8 Questões Essenciais de Identidade
1. **Quem é o usuário?** É a conta autenticada no `Supabase Auth` (`auth.users`), identificada por um `UUID`.
2. **Quem é o responsável da equipe?** É um usuário autenticado que possui a role `'team'` e está vinculado a uma equipe na competição.
3. **Onde sua identidade é persistida?** Exclusivamente na tabela de sistema `auth.users`.
4. **Onde suas credenciais são gerenciadas?** Pelo motor do Supabase Auth (criptografia nativa de senhas, sessões JWT, rate limit).
5. **Como ele é associado à equipe?** Através da tabela `public.profiles`:
   - `profiles.id` (UUID, PK, FK `auth.users.id`)
   - `profiles.role` (`'team'`)
   - `profiles.competition_team_id` (text, FK `public.competition_teams.id`)
6. **Como ele é associado à competição?** Indiretamente através de `competition_teams.competition_id`.
7. **Qual entidade deve possuir essa relação?** A relação de acesso pertence à combinação `auth.users` ↔ `profiles` ↔ `competition_teams`. A entidade `teams` representa a agremiação esportiva e não deve carregar dados de credenciais pessoais.
8. **Existe implementação parcial já existente?** Sim. A tabela `public.profiles` possui a coluna `competition_team_id` com chave estrangeira para `competition_teams.id`, e as políticas RLS (`profiles_self_update`, `competition_athletes_team_write`) já utilizam `profiles.competition_team_id` para autorizar a inscrição de atletas por representantes autenticados.

---

## 13. O CONCEITO DE MODALITY: ENUM VS TABELA

- **Fonte Única da Verdade:** PostgreSQL Enum nativo `public.modality AS ENUM ('indoor', 'beach')`.
- Todas as tabelas relacionais do sistema (`competitions`, `teams`, `public_competitions`) utilizam esse enum de forma estrita.
- A tabela `public.modalities` **não existe** no banco de dados.
- Os métodos `listModalities`, `createModality`, `updateModality` no `supabaseAdapter` são frutos de um protótipo inicial em LocalStorage e falham ao tentar acessar a tabela inexistente no Supabase.
- **Diretriz:** A modalidade no BaseOS é conceitualmente um tipo estático (`indoor` vs `beach`), com regras regulamentares associadas, e não uma entidade dinâmica editável por usuário.

---

## 14. O CONCEITO DE PERSON: RESQUÍCIO DE LEGADO

- A interface `PersonRecord` e a tabela referenciada `public.persons` **não existem no PostgreSQL**.
- A tentativa em `TeamsPage.tsx` (linhas 198-210) de chamar `dataAccess.createPerson` ao salvar uma equipe falha com erro de PostgREST (`PGRST205`).
- No modelo relacional do BaseOS:
  - Atletas são persistidos em `competition_athletes`.
  - Árbitros são persistidos em `referees`.
  - Usuários e gestores são persistidos em `auth.users` e `public.profiles`.
- **Diretriz:** A abstração `persons` é obsoleta e deve ser descontinuada na camada de persistência Supabase.

---

## 15. AUDITORIA DE MÉTODOS DO DATA ACCESS

Matriz de auditoria dos métodos de `supabaseAdapter` em `src/services/dataAccess.ts`:

| Método | Entidade | Tabela Alvo | Payload Gerado | Mapper Usado | Trata Error? | Contrato Real |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `listCompetitions` | Competition | `competitions` | Select `*` | `mapRows` + `normalize` | ❌ NÃO | **PARCIAL** (ignora erro) |
| `getCompetition` | Competition | `competitions` | Select by ID | `mapRow` + `normalize` | ❌ NÃO | **PARCIAL** (ignora erro) |
| `createCompetition` | Competition | `competitions` | `toSnake(payload)` | `mapRow` + `normalize` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204) |
| `updateCompetition` | Competition | `competitions` | `toSnake(safeUpdates)`| `mapRow` + `normalize` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204 se tiver config top-level) |
| `listTeams` | Team | `teams` | Select `*` | `mapRows` | ❌ NÃO | **PARCIAL** (ignora erro) |
| `createTeam` | Team | `teams` | `toSnake(input + id)` | `mapRow` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204) |
| `updateTeam` | Team | `teams` | `toSnake(updates)` | `mapRow` | ❌ NÃO | 🔴 **CRÍTICO** (PGRST204 se tiver state/manager) |
| `listCompetitionTeams`| CompTeam | `competition_teams` | Select by compId | `mapRows` | ❌ NÃO | **OK** |
| `createCompetitionTeam`| CompTeam | `competition_teams` | `toSnake` + token | `mapRow` | ❌ NÃO | **OK** (colunas batem) |
| `listCompetitionAthletes`| CompAthlete| `competition_athletes`| Select by ctId | `mapRows` | ❌ NÃO | **OK** |
| `createCompetitionAthlete`| CompAthlete| `competition_athletes`| `toSnake(input + id)` | `mapRow` | ❌ NÃO | **OK** (colunas batem) |
| `registerAthletePublic`| CompAthlete | RPC `register_athlete`| JSONB Args | `mapRow` | ✅ SIM | **OK** (Tratamento robusto) |
| `createMatch` | Match | `matches` | `toSnake` filtrado | `mapRow` | ❌ NÃO | **PARCIAL** (campos extras quebram) |
| `updateMatch` | Match | `matches` | `toSnake` sanitizado | `mapRow` | ❌ NÃO | **PARCIAL** (homologated quebra) |
| `listStages` | Stage | `competition_stages` | Select by compId | `mapRows` | ✅ SIM | **OK** (Lança erro com contexto) |
| `createStage` | Stage | `competition_stages` | `toSnake(payload)` | `mapRow` | ✅ SIM | **OK** |
| `saveStageDrawAndSlots`| Format | RPC `save_stage_draw_and_slots` | JSONB Args | Direct Cast | ✅ SIM | **OK** (Transacional) |
| `listModalities` | Modality | `modalities` (inexistente) | Select `*` | `mapRows` | ❌ NÃO | 🔴 **FALHA** (Tabela não existe) |
| `listPersons` | Person | `persons` (inexistente) | Select `*` | `mapRows` | ❌ NÃO | 🔴 **FALHA** (Tabela não existe) |

---

## 16. O PROBLEMA DA CONVERSÃO AUTOMÁTICA VIA `toSnake()`

O `supabaseAdapter` apoia-se nesta função para serializar payloads:
```ts
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)] = value;
  }
  return out;
}
```

### Riscos Sistêmicos do `toSnake()` Cego
1. **Injeção de Colunas Inexistentes:** Converte qualquer chave presente no objeto TypeScript em uma chave snake_case e envia ao PostgREST. Se o objeto de domínio possuir 1 campo que não seja coluna do banco, o PostgREST rejeita a query inteira com `PGRST204`.
2. **Mistura de Camadas de Dados:** O domínio do BaseOS agrega propriedades de conveniência na UI (ex: `groupsCount`, `tiebreakCriteriaOrder`, `managerPassword`, `isWo`). O `toSnake()` não sabe distinguir o que é coluna SQL de primeiro nível do que é dado de configuração JSONB, dado de Auth ou propriedade calculada.
3. **Impossibilidade de Evolução de Schema:** Qualquer adição de campo na interface TypeScript do frontend passa a causar falha imediata no backend caso o banco não receba uma migration síncrona.

### Padrão Arquitetural Recomendado para a Fase 8.2
Substituir a serialização cega por **Mappers Explícitos por Entidade**:
```text
Domain Object
      ↓
Explicit Persistence Mapper (whitelist de colunas + empacotamento em config JSONB)
      ↓
Validated Database Payload
      ↓
PostgREST / PostgreSQL
```

---

## 17. AUDITORIA DE TRATAMENTO DE ERROS

Foram auditadas **57 operações** no `supabaseAdapter`.
- **42 operações legadas** utilizam o padrão defeituoso:
  ```ts
  const { data } = await supabase.from(table).insert(...);
  return mapRow(data); // Se houver erro, data é null e o erro do PostgREST é perdido!
  ```
- **15 operações modernas** (stages, rounds, slots, RPCs de chaveamento) utilizam o padrão correto:
  ```ts
  const { data, error } = await supabase.from(table).insert(...);
  if (error) throw new Error(`Falha ao criar entidade: ${error.message}`);
  return mapRow(data);
  ```

**Classificação do Problema:** `CRÍTICO (P0)`.
O descarte do `{ error }` transforma falhas de rede, erros de validação de constraint (ex: duplicidade de chave ou campos obrigatórios ausentes) e erros de schema (400 Bad Request) em retornos nulos silenciosos, mascarando a real causa do problema para os componentes de interface.

---

## 18. MOCKS E TESTES ATUAIS

### Diagnóstico da Cegueira dos Mocks
O arquivo de teste do adapter (`src/test/dataAccessAdapter.test.ts`) possui um mock do Supabase que implementa o QueryBuilder da seguinte forma:
```ts
insert(payload: Record<string, unknown>) {
  if (!payload.id) {
    throw new Error(`PostgreSQL 23502: null value in column "id" of relation "${table}" violates not-null constraint`);
  }
  state.rows[table] = { ...payload };
  return chain;
}
```
**Por que os testes passavam enquanto a produção quebrava?**
- O mock verifica unicamente se `payload.id` existe.
- Ele **não valida as colunas** contra o schema real do banco de dados.
- Qualquer propriedade arbitrária (`managerPassword`, `groupsCount`, `fakeField`) é acolhida em memória sem erro.
- O teste nunca simulava o comportamento real do PostgREST, que consulta o schema cache e rejeita colunas não cadastradas com código de erro `PGRST204`.

### Matriz de Testes Relevantes

| Teste | Tipo | Mock Utilizado | Executa contra DB Real? | Detectaria PGRST204? |
| :--- | :--- | :--- | :---: | :---: |
| `dataAccessAdapter.test.ts` | Integração Adapter | Supabase Client Mockado | NÃO | ❌ NÃO (mock cego) |
| `teamsPage.test.tsx` | Componente | `dataAccess` mockado (`vi.fn()`) | NÃO | ❌ NÃO (mock direto) |
| `competitionsPage.test.tsx`| Componente | `dataAccess` mockado (`vi.fn()`) | NÃO | ❌ NÃO (mock direto) |
| `transactionalRpcPersistence.test.ts`| Regras / RPC | Supabase RPC Mockado | NÃO | ❌ NÃO |
| `stagePersistenceRepository.test.ts` | Persistência Runtime | Supabase Client Mockado | NÃO | ❌ NÃO |

---

## 19. GAPS ARQUITETURAIS IDENTIFICADOS

| ID | Classificação | Entidade | Descrição do Gap |
| :-- | :-----------: | :------- | :--------------- |
| **GAP-01** | **P0** | Competition | `createCompetition` envia campos de configuração regulamentar (`groupsCount`, `advancingPerGroup`, etc.) como colunas SQL de primeiro nível em vez de aninhá-los em `config` (JSONB). |
| **GAP-02** | **P0** | Team | `createTeam` envia propriedades de credenciais (`managerPassword`), contato e estado como colunas de `public.teams`, que não possui essas colunas. |
| **GAP-03** | **P0** | Auth / Team | Tentativa de armazenar senha de gestor em texto puro no domínio e em `teams` (Vulnerabilidade de Segurança Crítica). |
| **GAP-04** | **P0** | DataAccess | Supressão sistemática do objeto `{ error }` em métodos legados do `supabaseAdapter`, retornando `null` silencioso que quebra a UI. |
| **GAP-05** | **P1** | Person | O código invoca `dataAccess.createPerson`, mas a tabela `public.persons` não existe no banco de dados. |
| **GAP-06** | **P1** | Modality | O código invoca `dataAccess.listModalities` / `createModality`, mas `public.modalities` não existe como tabela (é um enum nativo no PostgreSQL). |
| **GAP-07** | **P1** | Team | Falta da coluna `state` na tabela `public.teams`. |
| **GAP-08** | **P1** | Match | Propriedades de homologação (`homologatedAt`, `homologatedBy`) e status de WO (`isWo`, `woReason`) não possuem colunas correspondentes em `public.matches`. |
| **GAP-09** | **P2** | Venue | Propriedades `responsible` e `notes` no domínio `VenueRecord` não possuem colunas em `public.venues`. |
| **GAP-10** | **P2** | Testes / Mocks | Suíte de testes do adapter não valida colunas contra o schema cache, permitindo que payloads inválidos passem nos testes. |

---

## 20. RISCOS CLASSIFICADOS (P0 / P1 / P2)

### P0 (Bloqueio Crítico / Risco Imediato de Perda ou Quebra)
1. **Indisponibilidade dos fluxos centrais:** Usuários reais não conseguem criar campeonatos nem cadastrar equipes na instância VOLTZ (ou qualquer ambiente Supabase).
2. **Exposição de Credenciais:** Persistência indevida de senhas em LocalStorage e tentativa de envio via payload não seguro.
3. **Falhas em Cadeia na UI:** Retornos `null` silenciosos geram crashes catastróficos em componentes React que presumem retorno do objeto criado.

### P1 (Quebra de Funcionalidade / Inconsistência Relevante)
1. **Tentativa de acesso a tabelas inexistentes:** `persons`, `modalities`, `document_edits`.
2. **Perda de dados de localização:** O estado (`state`) da equipe é descartado ou causa erro.
3. **Falha na Homologação de Partidas:** Tentativa de gravar `homologated_at` em coluna inexistente de `matches`.

### P2 (Dívida Técnica / Inconsistência Menor)
1. **Campos secundários de ginásios:** `responsible` e `notes` em `venues`.
2. **Mocks permissivos:** Necessidade de criar schema validator nos testes mockados.

---

## 21. CONTRATO CANÔNICO PROPOSTO PARA A FASE 8.2

Para que a implementação na Fase 8.2 seja cirúrgica e definitiva, o fluxo de dados deve respeitar o seguinte pipeline:

```text
[ FORM / DOMAIN MODEL ]
           ↓
[ EXPLICIT MAPPER ]
  - Separa colunas SQL de 1º nível
  - Empacota regras esportivas no JSONB 'config'
  - Remove credenciais de domínio
  - Redireciona dados de responsável para Auth / Profiles
           ↓
[ PERSISTENCE PAYLOAD ]
           ↓
[ POSTGREST / POSTGRESQL ]
           ↓
[ RESPONSE MAPPER ]
  - Desestrutura { data, error }
  - Se error: lança exceção com código e mensagem do Postgres
  - Se data: converte snake_case para camelCase e normaliza
           ↓
[ DOMAIN ENTITY (UI) ]
```

### Regras Canônicas por Entidade

#### A. Competição (`Competition`)
- **Colunas SQL Enviadas:** `id`, `name`, `slug`, `modality`, `format`, `player_format`, `set_format`, `gender_category`, `default_deadline`, `group_name`, `start_date`, `end_date`, `venue`, `status`, `config`, `rules_snapshot`, `organizer_id`, `logo_url`, `supporters`.
- **Campos Aninhados no `config` (JSONB):** `groupsCount`, `teamsPerGroup`, `advancingPerGroup`, `bestThirdsCount`, `useBestThirds`, `tiebreakCriteriaOrder`, `phaseSetRules`, `defaultMatchIntervalMinutes`, `minTeamRestMinutes`, `woRules`.

#### B. Equipe (`Team`)
- **Colunas SQL Enviadas:** `id`, `name`, `short_name`, `modality`, `coach_name`, `city`, `logo_url`.
- **Campos Removidos do Payload SQL da Tabela `teams`:** `managerName`, `managerEmail`, `managerPhone`, `managerPassword`, `registrationToken`, `state`.
- **Vínculo do Gestor:** Criado separadamente via Supabase Auth + `public.profiles` (vinculado a `competition_teams`).

#### C. Inscrição da Equipe (`CompetitionTeam`)
- **Colunas SQL Enviadas:** `id`, `competition_id`, `team_id`, `team_name`, `team_short_name`, `access_token`, `registration_deadline`, `is_locked`, `status`, `custom_notes`.

---

## 22. DECISÕES QUE PRECISAM SER TOMADAS NA FASE 8.2

1. **Gestão de Equipes vs. Inscrições:**
   - Decidir se o cadastro na `TeamsPage` cadastra apenas a equipe institucional (global) ou se já cria um vínculo imediato com a competição ativa.
   - Definir se a coluna `state` será adicionada a `public.teams` via migration oficial ou se ficará em campo estruturado.
2. **Fluxo de Responsável da Equipe:**
   - Estabelecer se o acesso da equipe será exclusivamente via **Link de Inscrição com Token Único** (`competition_teams.access_token`), eliminando senhas manuais para representantes, ou se haverá criação de conta formal no Supabase Auth para o gestor.
3. **Eliminação de Módulos Fantasmas:**
   - Formalizar a depreciação e remoção de `createPerson` e dos endpoints da tabela `modalities`.

---

## 23. RECOMENDAÇÕES DE ARQUITETURA

1. **Criar Mappers Especializados:** Criar arquivos `competitionMapper.ts` e `teamMapper.ts` em `src/services/mappers/` com funções puras `toPersistence(domain)` e `toDomain(dbRow)`.
2. **Padronizar Tratamento de Erros no Supabase Client:** Criar helper `assertSupabaseSuccess(data, error, context)` que lance erros semânticos contendo o código PostgREST (ex: PGRST204, 23505).
3. **Endurecer os Mocks de Teste:** No mock do `getSupabaseClient`, adicionar uma camada de validação baseada numa lista de colunas permitidas por tabela, disparando erro similar ao `PGRST204` caso colunas inválidas sejam enviadas.

---

## 24. O QUE NÃO DEVE SER ALTERADO AINDA

Em estrito cumprimento às regras da Fase 8.1:
- ❌ **NÃO** alterar schemas ou migrations no PostgreSQL.
- ❌ **NÃO** refatorar os formulários da UI (`CompetitionFormDialog`, `TeamsPage`).
- ❌ **NÃO** remover campos das interfaces TypeScript (`TeamRecord`, `CompetitionRecord`).
- ❌ **NÃO** aplicar correções funcionais de código nos adapters.
- ❌ **NÃO** fazer deploy para VOLTZ nem gerar tags de release.

---

## 25. CONCLUSÃO DA FASE 8.1

À pergunta fundamental desta fase:
> *"Se amanhã corrigirmos `createCompetition` e `createTeam`, sabemos exatamente qual payload deve chegar ao PostgreSQL e onde cada informação do domínio deve ser persistida?"*

A resposta técnica comprovada é:
# **SIM.**

O contrato canônico está inteiramente documentado, respaldado por evidência direta do banco de dados e pronto para orientar com segurança a **Fase 8.2 — Modelo Funcional da Competição, Lifecycle Interno e Fluxo de Inscrição/Confirmação de Equipes**.

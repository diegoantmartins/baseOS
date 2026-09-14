# WALKTHROUGH OFICIAL — FASE 8.1
# PARTE 1: ESCOPO, DIAGNÓSTICO, ARQUITETURA E INCONSISTÊNCIAS TÉCNICAS
*(Itens 1 a 9 do Walkthrough de Persistência, Domínio e Banco de Dados)*

> **Documento complementar:** Consulte a [Parte 2 (Itens 10 a 18)](file:///home/diego-martins/docker/volei/docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md) para Validações, Métricas de Build, Riscos, Recomendações para a Fase 8.2 e Status Final.
> **Relatório Técnico Completo:** Consulte também o relatório de auditoria em [Parte 1](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md) e [Parte 2](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md).

---

## 1. O QUE FOI ANALISADO

Nesta Fase 8.1 do BaseOS, foi conduzida uma auditoria e mapeamento exaustivo do contrato de persistência entre a aplicação (TypeScript / React 18 / Vite) e o banco de dados relacional (PostgreSQL 17.6 / PostgREST / Supabase).

O foco analítico concentrou-se na determinação empírica e documental de:
- Onde cada informação do modelo de domínio do BaseOS é de fato armazenada.
- Quais campos de primeiro nível das interfaces TypeScript possuem colunas SQL correspondentes.
- Quais campos pertencem a documentos JSONB (`config`, `rules_snapshot`, `supporters`, `sets`, `referees`, etc.).
- Como a autenticação e a identidade do gestor de equipe se relacionam com o banco (`auth.users`, `public.profiles`, `public.competition_teams`).
- A causa raiz dos erros P0 encontrados na Fase 8 que impediam o funcionamento dos botões **"Criar competição"** e **"Cadastrar equipe"**.
- A fragilidade dos testes automatizados existentes e de seus mocks, que permitiam a aprovação de testes enquanto a integração real com PostgREST falhava.

---

## 2. ESTADO INICIAL DO PROJETO

Antes de qualquer ação, o estado do repositório foi inspecionado:

```bash
$ git status --short
?? docs/walkthroughs/FASE-8-FUNCTIONAL-AUDIT-V2.3.0.md

$ git branch --show-current
main

$ git log -1 --oneline
4e55243 docs: walkthrough oficial de auditoria de release e deploy da Fase 7.9

$ git diff --stat
(vazio)
```

O working tree encontrava-se em estado limpo e preservado, contendo apenas o relatório de auditoria não rastreado da fase anterior. Nenhuma alteração pré-existente foi perdida ou modificada.

---

## 3. ARQUITETURA ENCONTRADA

1. **Camada de Abstração Dual:**
   - `src/services/dataAccess.ts` implementa o padrão *adapter*, expondo a mesma interface pública para `localStorageAdapter` (modo demo / fallback) e `supabaseAdapter` (modo conectado).
   - O chaveamento é determinado por `isSupabaseConfigured()` (`src/lib/supabaseClient.ts`), que verifica a presença de credenciais não-placeholders nas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

2. **Gerações Discrepantes no `supabaseAdapter`:**
   - **Camada Moderna (Fases 4.4 a 4.6):** Módulos de formato de disputa (`competition_stages`, `competition_rounds`, `competition_match_slots`, RPCs transacionais como `save_stage_draw_and_slots` e `register_athlete`). Esta camada trata rigorosamente `{ data, error }`, valida constraints de negócio e propaga erros de persistência com mensagens claras.
   - **Camada Legada (Fases 1 a 3):** Métodos CRUD das entidades principais (`competitions`, `teams`, `referees`, `venues`, `matches`, `draws`). Esta camada utiliza serialização cega via `toSnake()`, descarta completamente o objeto `{ error }` do Supabase e retorna `null` silencioso em caso de rejeição pelo banco.

3. **Gargalo Estrutural PostgREST:**
   ```text
   UI Component
       ↓
   Objeto de Domínio Rico (ex: CompetitionRecord ou TeamRecord)
       ↓
   dataAccess Adapter
       ↓
   toSnake() genérico (converte camelCase em snake_case cegamente)
       ↓
   PostgREST HTTP Request (POST/PATCH)
       ↓
   PostgreSQL 17.6 (Rejeição HTTP 400: PGRST204 - Coluna inexistente no schema cache)
       ↓
   dataAccess ignora { error } e retorna null
       ↓
   UI quebra com TypeError: Cannot read properties of null
   ```

---

## 4. SCHEMA POSTGRESQL ANALISADO

A inspeção foi realizada diretamente no container Docker ativo `supabase-db` (PostgreSQL 17.6.1) e validada contra as 24 migrações em `supabase/migrations/`.

### Relações Físicas Existentes
1. `public.competitions` (Tabela)
2. `public.teams` (Tabela)
3. `public.competition_teams` (Tabela)
4. `public.competition_athletes` (Tabela)
5. `public.matches` (Tabela)
6. `public.referees` (Tabela)
7. `public.venues` (Tabela)
8. `public.draws` (Tabela)
9. `public.competition_stages` (Tabela)
10. `public.competition_rounds` (Tabela)
11. `public.competition_match_slots` (Tabela)
12. `public.profiles` (Tabela vinculada a `auth.users`)
13. `public.app_settings` (Tabela)
14. `public.audit_logs` (Tabela)
15. `public.public_competitions` (View)

### Enums e Tipos Customizados Nativos
- `public.modality`: `'indoor'`, `'beach'`
- `public.competition_status`: `'draft'`, `'registration'`, `'in-progress'`, `'completed'`, `'cancelled'`, `'planning'`, `'registration-open'`, `'registration-closed'`, `'draw-pending'`, `'groups-defined'`, `'playoffs'`
- `public.match_status`: 15 estados desde `'scheduled'` até `'wo'` e `'homologated'`
- `public.registration_status`: `'invited'`, `'in_progress'`, `'submitted'`, `'approved'`, `'rejected'`
- `public.user_role`: `'organizer'`, `'referee'`, `'team'`, `'admin'`
- `public.gender_category`: `'male'`, `'female'`, `'mixed'`

### Tabelas Inexistentes no PostgreSQL
- `public.persons` — **Inexistente** (gera `PGRST205`).
- `public.modalities` — **Inexistente** (modalidade é exclusivamente um enum).
- `public.document_edits` — **Inexistente**.
- `public.template_layouts` — **Inexistente**.

---

## 5. ENTIDADES ANALISADAS

Foram minuciosamente analisadas as seguintes entidades e contratos de domínio:
- `CompetitionRecord` e `CompetitionConfig`
- `TeamRecord`
- `CompetitionTeam`
- `CompetitionAthlete`
- `MatchRecord`
- `RefereeRecord`
- `VenueRecord`
- `UserProfile` / `SystemUser` / `profiles`
- `PersonRecord`
- `ModalityRecord`
- `DrawRecord`
- `SettingsRecord`
- `MatchAuditEntry`

---

## 6. ARQUIVOS ENVOLVIDOS

- `docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md` (Documento de auditoria - Parte 1)
- `docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md` (Documento de auditoria - Parte 2)
- `docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md` (Este walkthrough oficial - Parte 1)
- `docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md` (Walkthrough oficial - Parte 2)
- `src/services/dataAccess.ts` (Implementação do adapter e toSnake)
- `src/lib/supabaseClient.ts` (Configuração do cliente Supabase e constantes de tabela)
- `src/services/authService.ts` (Autenticação, sessões e perfis)
- `src/services/registrationService.ts` (Regras de negócio de elenco e inscrição)
- `src/components/competition/dialogs/CompetitionFormDialog.tsx` (Formulário de criação de competição)
- `src/pages/CompetitionsPage.tsx` (Página de competições e handler createCompetition)
- `src/pages/TeamsPage.tsx` (Página de equipes e handler createTeam)
- `src/types/entities.ts` (Definições TypeScript de entidades)
- `src/types/registration.ts` (Definições TypeScript de inscrições e atletas)
- `src/types/competitionConfig.ts` (Definições TypeScript de regras esportivas)
- `src/types/auth.ts` (Definições TypeScript de perfis de usuário)
- `src/test/dataAccessAdapter.test.ts` (Testes unitários e mocks do adapter)
- `supabase/migrations/` (24 arquivos SQL de schema e versionamento)

---

## 7. INCONSISTÊNCIAS ENCONTRADAS

1. **Incompatibilidade em `createCompetition`:**
   - A UI injeta propriedades de primeiro nível como `groupsCount`, `advancingPerGroup`, `bestThirdsCount`, `defaultMatchIntervalMinutes`, `minTeamRestMinutes`, `tiebreakCriteriaOrder`, `phaseSetRules`.
   - Essas propriedades não existem como colunas em `public.competitions`; pertencem ao campo JSONB `config`.
   - O PostgREST rejeita a inserção (`PGRST204`). O erro é suprimido e a UI quebra com `Cannot read properties of null`.

2. **Incompatibilidade em `createTeam`:**
   - A UI injeta `managerName`, `managerPhone`, `managerEmail`, `managerPassword`, `registrationToken`, `state`.
   - A tabela `public.teams` contém apenas: `id`, `name`, `short_name`, `modality`, `coach_name`, `city`, `logo_url`, `created_at`, `updated_at`.
   - A requisição falha com `PGRST204`, retornando `null` e quebrando o cadastro.

3. **Vulnerabilidade de Segurança Crítica em Senha de Gestor:**
   - `TeamsPage.tsx` gera senhas aleatórias e tenta armazená-las em texto puro em `teams.managerPassword`.
   - Credenciais devem ser tratadas exclusivamente pelo Supabase Auth (`auth.users`).

4. **Tabelas Fantasmas:**
   - `dataAccess.createPerson` tenta gravar na tabela inexistente `public.persons`.
   - `dataAccess.listModalities` tenta consultar a tabela inexistente `public.modalities`.

5. **Silenciamento de Erros:**
   - 42 métodos no `supabaseAdapter` não desestruturam `{ error }`, transformando qualquer rejeição do banco em retorno `null` ou `[]`.

6. **Mocks Cegos a Schema Cache:**
   - O mock de teste em `dataAccessAdapter.test.ts` aceitava qualquer objeto arbitrário, criando falsa sensação de estabilidade.

---

## 8. DECISÕES TÉCNICAS

1. **Princípio da Não-Interferência (Fase 8.1):** Não modificar código de produção nem aplicar correções prematuras até que o contrato canônico estivesse formalizado e aprovado.
2. **Preservação de Campos de Domínio:** Não descartar propriedades de domínio da interface TypeScript apenas para acomodar o banco atual; classificar cada propriedade como coluna SQL, atributo JSONB, Auth ou Gap Arquitetural.
3. **Fixação do Padrão Explicit Mapper:** Estabelecer que a partir da Fase 8.2 a conversão cega via `toSnake()` deve ser substituída por mappers explícitos com whitelist de colunas e aninhamento correto de JSONB.

---

## 9. ALTERAÇÕES REALIZADAS

- Elaboração dos documentos canônicos oficiais de auditoria e walkthrough:
  - `docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md` (Seções 1 a 11)
  - `docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md` (Seções 12 a 25)
  - `docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-1.md` (Itens 1 a 9)
  - `docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md` (Itens 10 a 18)
- Preservação intacta de todo o código da aplicação e banco de dados.

---
*(Continua na [Parte 2](file:///home/diego-martins/docker/volei/docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA-PARTE-2.md) com Verificações, Resultados dos Testes, Riscos, Recomendações Fase 8.2 e Conclusão)*

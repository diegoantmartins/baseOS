# BASEOS — RELATÓRIO DE AUDITORIA — FASE 8.3
## PARTE 1 — AUDITORIA DE CÓDIGO, MAPPERS CANÔNICOS E PERSISTÊNCIA REAL

---

## 1. DADOS DE HOMOLOGAÇÃO TÉCNICA

* **Data da Execução:** 13 de Setembro de 2026
* **Ambiente de Teste:** Linux / Docker (PostgreSQL 17.6.1 / supabase-db / PostgREST)
* **Instância de Produção Preservada:** VOLTZ (nenhuma alteração aplicada em produção)
* **Escopo:** Resolução definitiva de P0-01 e P0-02, implementação de mappers canônicos, eliminação de chamadas legadas e validação de persistência real.

---

## 2. AUDITORIA DE RESOLUÇÃO DOS P0s

### 2.1 Auditoria do P0-01 (Criação de Competição)
* **Status Anterior:** HTTP 400 Bad Request via PostgREST (`PGRST204: column "groups_count" does not exist in relation "competitions"`).
* **Verificação do Código:**
  * Arquivo: `src/services/mappers/competitionMapper.ts`
  * O método `toPersistence` extrai e filtra rigorosamente apenas as colunas da lista física oficial (`COMPETITION_PHYSICAL_COLUMNS`).
  * Colunas `groups_count`, `teams_per_group`, `advancing_per_group`, `third_place_match` foram transferidas com sucesso para o objeto JSONB `config`.
  * Em `toDomain`, os campos são recompostos na entidade `CompetitionRecord`, garantindo compatibilidade total com os componentes de visualização.
  * O diálogo `CompetitionFormDialog.tsx` inicializa competições com status `registration-open`, permitindo que equipes sejam inscritas sob as regras de RLS da tabela `competition_teams`.
* **Parecer da Auditoria:** **CONFORME E MITIGADO.**

### 2.2 Auditoria do P0-02 (Cadastro de Equipe e Auth)
* **Status Anterior:** HTTP 400 Bad Request ao persistir `managerPassword`, `registrationToken`, `managerEmail` em `teams`, e tentativa de insert na tabela não existente `persons`.
* **Verificação do Código:**
  * Arquivo: `src/services/mappers/teamMapper.ts`
  * O método `toPersistence` mantém apenas as 9 colunas físicas oficiais da tabela `public.teams` (`id, name, short_name, modality, coach_name, city, logo_url, created_at, updated_at`).
  * O estado e os campos `managerPassword` foram totalmente removidos de `TeamsPage.tsx` e `TeamCreatedShareDialog.tsx`.
  * Chamada a `dataAccess.createPerson` foi expurgada dos fluxos de cadastro de equipe.
  * No adaptador `dataAccess.ts`, `createPerson` foi configurada para falhar explicitamente caso invocada, impedindo a criação de falsos stubs silenciosos.
* **Parecer da Auditoria:** **CONFORME E MITIGADO.**

---

## 3. AUDITORIA DE TRATAMENTO DE ERROS

* **Substituição de Retornos Silenciosos:**
  * No `supabaseAdapter` em `src/services/dataAccess.ts`, todas as mutações agora invocam `assertSupabaseSuccess` ou `assertSupabaseUpdateSuccess`.
  * Se o PostgREST responder com erro, o sistema lança exceção detalhada com o código (`code`), detalhes (`details`) e mensagem (`message`).
  * As telas `CompetitionsPage.tsx` e `TeamsPage.tsx` interceptam essas exceções e exibem toasts de erro claros para o operador.
* **Parecer da Auditoria:** **APROVADO.**

# BASEOS — FASE 8.3 — IMPLEMENTAÇÃO DOS MAPPERS CANÔNICOS, CORREÇÃO DOS P0 E FLUXO OPERACIONAL
## PARTE 1 — ARQUITETURA, MAPPERS CANÔNICOS E RESOLUÇÃO DOS P0s

---

## 1. IDENTIFICAÇÃO E ESCOPO

* **Sistema:** BaseOS — SaaS Profissional de Gestão de Competições de Voleibol
* **Instância de Referência:** VOLTZ
* **Fase:** 8.3 — Implementação dos Mappers Canônicos, Correção dos P0 e Fluxo Operacional
* **Ambiente:** SOMENTE DESENVOLVIMENTO LOCAL
* **Estado:** IMPLEMENTAÇÃO CONCLUÍDA
* **Status Final:** `STATUS: IMPLEMENTATION COMPLETE`

---

## 2. MISSÃO DA FASE 8.3

Transformar os contratos estabelecidos na **Fase 8.1** e o modelo funcional desenhado na **Fase 8.2** em código TypeScript/React em estrita conformidade com o PostgreSQL 17.6 / PostgREST.

O objetivo foi resolver a causa estrutural que originava os erros HTTP 400 (`PGRST204: column does not exist`) na criação de competições e cadastro de equipes, garantindo um ciclo de vida esportivo robusto e auditável.

---

## 3. RESOLUÇÃO DOS BLOQUEIOS P0

### 3.1 P0-01 — Falha na Criação de Competição (Erro 400 - Colunas Regulamentares Inexistentes)

* **Causa Raiz:** A UI e o adaptador Supabase utilizavam um mapeador genérico (`toSnake`) que convertia campos de alto nível do modelo de domínio (`groupsCount`, `teamsPerGroup`, `advancingPerGroup`, etc.) em colunas inexistentes na tabela `public.competitions`.
* **Correção Canônica Aplicada:**
  1. Criação do mapper puro `competitionMapper` (`src/services/mappers/competitionMapper.ts`).
  2. Filtragem rigorosa das **exatas 20 colunas físicas** da tabela `public.competitions`.
  3. Encapsulamento de todos os parâmetros regulamentares dentro da coluna JSONB `config`.
  4. Atribuição de status inicial canônico `registration-open` para viabilizar as políticas de RLS de `competition_teams`.
  5. Descompactação pura e determinística em `toDomain` para manter total compatibilidade com a UI existente.

### 3.2 P0-02 — Falha no Cadastro de Equipe (Erro 400 - Colunas de Gestor e Chamada a `persons`)

* **Causa Raiz:** O formulário de cadastro de agremiação enviava campos legados (`managerPassword`, `registrationToken`, `managerName`, `managerEmail`, `managerPhone`, `state`) para a tabela `public.teams` e invocava `createPerson` para uma tabela inexistente no banco.
* **Correção Canônica Aplicada:**
  1. Criação do mapper puro `teamMapper` (`src/services/mappers/teamMapper.ts`), restringindo o payload às **9 colunas físicas** de `public.teams`.
  2. Expurgo total de `managerPassword`: o BaseOS não armazena nem transmite senhas em texto plano.
  3. Descontinuação explícita de `dataAccess.createPerson`: a função agora lança erro operacional claro orientando o uso do Supabase Auth e da tabela `profiles` com `role = 'team'`, impedindo qualquer chamada legada silenciosa.
  4. Separação explícita de acessos:
     * O `access_token` em `competition_teams` é utilizado **exclusivamente** para o link de auto-inscrição de elenco (`/equipe/inscricao/:token`).
     * Contas autenticadas de dirigentes utilizam `auth.users` → `profiles` (`role = 'team'`).

---

## 4. CAMADA CANÔNICA DE MAPPERS (`src/services/mappers/`)

A camada de mappers foi implementada como um módulo central e estritamente desacoplado:

```text
UI / Domínio (React 18 + TS)
          ↓
  Canonical Mappers
 (Pure Transformation)
          ↓
  Physical DB Columns
 (PostgreSQL 17.6 Schema)
          ↓
 PostgREST / Supabase
```

| Mapper | Tabela Alvo | Colunas Físicas Mapeadas | Campos de Domínio Encapsulados |
| :--- | :--- | :--- | :--- |
| `competitionMapper` | `public.competitions` | 20 colunas físicas | `groupsCount`, `teamsPerGroup`, `advancingPerGroup`, `maxTeams`, `thirdPlaceMatch` encapsulados em `config` (JSONB) |
| `teamMapper` | `public.teams` | 9 colunas físicas | Expurgados: `managerPassword`, `registrationToken`, `managerEmail`, `managerPhone`, `state` |
| `competitionTeamMapper` | `public.competition_teams` | 12 colunas físicas | Preservação do `access_token` seguro e status esportivo |

---

## 5. TRATAMENTO INFORMATIVO DE ERROS E AUDITORIA

* **Supabase / PostgREST:** Substituição dos retornos silenciosos `null` pelas funções de assertividade `assertSupabaseSuccess` e `assertSupabaseUpdateSuccess` em `src/services/dataAccess.ts`.
* **Diagnóstico Rico:** Códigos de erro como `PGRST204` (coluna inexistente), `42501` (violação de RLS) e `23505` (conflito de unicidade) são propagados com mensagens detalhadas e orientações de recuperação na interface (`toast.error`).
* **Proteção de Legado:** `createPerson`, `updatePerson` e `deletePerson` rejeitam invocações com logs de aviso em desenvolvimento e erros explicativos em runtime.

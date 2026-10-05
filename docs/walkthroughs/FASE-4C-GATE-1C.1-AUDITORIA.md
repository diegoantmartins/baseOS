# BASEOS — FASE 4C — GATE 1C.1
## Relatório de Auditoria Técnica READ-ONLY do Gate 1C

**Projeto:** BaseOS (`diegoantmartins/volleyscore-hub`)  
**Workspace Local:** `/home/diego-martins/docker/volei`  
**Branch:** `main`  
**HEAD Esperado e Auditado:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`  
**Data da Auditoria:** 28 de Setembro de 2026  
**Ambiente Remoto:** VOLTZ (`https://voltz.baseos.online` / VPS Contabo `vmi3488325`)  
**Modo Operacional:** STRICT READ-ONLY em VOLTZ / Zero modificação em código DEV  
**Decisão da Auditoria:** `GATE 1C.1 = PASS WITH FINDINGS`

---

## 1. Identificação

| Item | Especificação |
| :--- | :--- |
| **Fase / Gate Auditado** | FASE 4C — GATE 1C (Reconciliação DEV + Preparação de Migrations Canônicas) |
| **Gate Atual** | FASE 4C — GATE 1C.1 (Auditoria de QA e Arquitetura da Reconciliação) |
| **Papel do Auditor** | Agente de QA / Arquitetura BaseOS |
| **Regra Absoluta** | NÃO ALTERAR VOLTZ (Zero DDL, DML, deploys, restarts, reload PostgREST ou `supabase db push`) |
| **Worktree DEV** | Preservação estrita do dirty state existente (16 arquivos modificados rastreados intactos) |
| **Objetivo Primário** | Validar se o relatório do Gate 1C é tecnicamente consistente com os arquivos reais do DEV e se a migration candidata `verify_team_credentials` está devidamente classificada como `CANDIDATE` |

---

## 2. Estado Git

A verificação do repositório local confirmou que o worktree foi estritamente preservado:

### 2.1 HEAD e Branch
- **Branch:** `main`
- **HEAD Commit:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b` (`fix(match-sheet): enforce side-out rotation and set validation`)
- **Total de Commits Realizados:** 0 (zero)

### 2.2 Worktree Rastreado (16 arquivos modificados intactos)
Nenhum arquivo modificado foi descartado, resetado ou alterado. Comandos proibidos (`git reset`, `git clean`, `git restore`, `git stash`, `git add .`, `git commit`, `git push`) **não** foram executados:
1. `src/App.tsx`
2. `src/components/auth/RequireAuth.tsx`
3. `src/components/layout/Sidebar.tsx`
4. `src/components/match-sheet/MatchSheetInterface.tsx`
5. `src/components/navigation/BottomNav.tsx`
6. `src/data/seed.ts`
7. `src/lib/supabaseClient.ts`
8. `src/pages/MatchSheetPage.tsx`
9. `src/services/competitionRegistrationService.ts`
10. `src/services/dataAccess.ts`
11. `src/services/identityBackfillService.ts`
12. `src/services/identityService.ts`
13. `src/services/registrationService.ts`
14. `src/types/entities.ts`
15. `src/types/identity.ts`
16. `src/types/registration.ts`

### 2.3 Arquivos Untracked do Gate 1C (Auditados)
- `supabase/migrations/20260923000001_formalize_verify_team_credentials.sql`
- `src/test/verifyTeamCredentialsRpc.test.ts`
- `docs/walkthroughs/FASE-4C-GATE-1C-RECONCILIACAO-DEV-MIGRATIONS.md`

---

## 3. Artefatos Auditados

| Artefato | Caminho Físico | Status Físico | Tamanho | Linhas | Finalidade Auditada |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Migration Candidata** | `supabase/migrations/20260923000001_formalize_verify_team_credentials.sql` | Presente | 4.639 B | 116 | Formalização da RPC `verify_team_credentials` |
| **Suíte de Testes** | `src/test/verifyTeamCredentialsRpc.test.ts` | Presente | 5.869 B | 155 | Validação unitária e de contrato da RPC |
| **Migration Homologação** | `supabase/migrations/20260921000001_match_homologation_and_details.sql` | Presente | 1.706 B | 28 | Colunas de homologação e detalhes operacionais |
| **Relatório Gate 1C** | `docs/walkthroughs/FASE-4C-GATE-1C-RECONCILIACAO-DEV-MIGRATIONS.md` | Presente | 24.080 B | 394 | Relatório de engenharia do Gate 1C |

---

## 4. Migration Auditada (`20260923000001_formalize_verify_team_credentials.sql`)

A auditoria linha a linha do arquivo SQL revelou exatamente a seguinte estrutura:

```sql
-- Resumo Técnico da Definição
CREATE OR REPLACE FUNCTION public.verify_team_credentials(
  p_token text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
```

### 4.1 Ficha Técnica Estrutural

* **Nome da Função:** `public.verify_team_credentials`
* **Assinatura:** `(p_token text, p_password text)`
* **Return Type:** `jsonb`
* **LANGUAGE:** `plpgsql`
* **SECURITY DEFINER:** Sim, explicitamente declarado.
* **search_path:** `SET search_path = public, extensions`
* **Grants e Revoke:**
  - `REVOKE ALL ON FUNCTION public.verify_team_credentials(text, text) FROM PUBLIC;`
  - `GRANT EXECUTE ON FUNCTION public.verify_team_credentials(text, text) TO anon, authenticated, service_role;`
* **Tabelas Consultadas:**
  - `public.competition_teams` (busca de `id` via `access_token = v_norm_token`)
  - `auth.users` (busca de `email`, `encrypted_password`)
  - `public.profiles` (junção com `auth.users` via `p.competition_team_id = v_ct_id AND p.role = 'team'`)
  - `auth.users.raw_user_meta_data` (fallback caso `profiles` não localize o vínculo)
* **Extensões Utilizadas:**
  - `extensions.crypt(v_norm_password, v_encrypted_password)` da extensão `pgcrypto`
* **Tratamento de Parâmetros de Entrada:**
  - `v_norm_token := btrim(COALESCE(p_token, ''));`
  - `v_norm_password := btrim(COALESCE(p_password, ''));`
* **Tratamento de Erros e Mensagens:**
  - Token vazio (`v_norm_token = ''`): `{"ok": false, "error": "Token de acesso não fornecido."}`
  - Senha vazia (`v_norm_password = ''`): `{"ok": false, "error": "Senha de acesso obrigatória."}`
  - Equipe não encontrada (`v_ct_id IS NULL`): `{"ok": false, "error": "Inscrição de equipe não encontrada para o link fornecido."}`
  - Usuário ausente ou hash nulo: `{"ok": false, "error": "Senha de acesso incorreta. Verifique a senha recebida."}`
  - Senha incorreta (`v_encrypted_password <> extensions.crypt(...)`): `{"ok": false, "error": "Senha de acesso incorreta. Verifique a senha recebida."}`
* **Retorno de Sucesso:**
  - `{"ok": true, "email": v_user_email}`
* **Dependências de Schema:**
  - Tabela `public.competition_teams` com coluna `access_token`
  - Tabela `public.profiles` com colunas `id`, `competition_team_id`, `role`
  - Schema `auth.users` com colunas `id`, `email`, `encrypted_password`, `raw_user_meta_data`
  - Extensão `pgcrypto` instalada no schema `extensions`

---

## 5. Auditoria de `verify_team_credentials`: Comprovado vs Inferido vs Não Comprovado

A auditoria estabelece a distinção obrigatória entre o que é evidência primária e o que é inferência ou decisão arquitetural local:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           O QUE SABEMOS DA VOLTZ                        │
│                           (Evidência Primária)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ • Assinatura OpenAPI: p_token text, p_password text                     │
│ • Retorno OpenAPI: json / jsonb via HTTP POST                           │
│ • Códigos e mensagens HTTP reais observadas por sondagem                │
│ • Consumo no bundle frontend index-C7AnobpH.js                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          O QUE RECONSTRUÍMOS NO DEV                     │
│                           (Decisão Arquitetural)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ • Implementação em PL/pgSQL na migration candidata                      │
│ • Decisão de segurança: SECURITY DEFINER                                │
│ • Decisão de segurança: SET search_path = public, extensions            │
│ • Validação com btrim() e fallback em raw_user_meta_data                │
│ • Comparação de senha via extensions.crypt() (pgcrypto)                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 O QUE AINDA PRECISA SER VERIFICADO EM VOLTZ             │
│                         (Acesso Direto ao Catálogo)                     │
├─────────────────────────────────────────────────────────────────────────┤
│ • Código SQL real interno via pg_get_functiondef()                      │
│ • Se a função remota foi criada como SECURITY DEFINER                   │
│ • Se a função remota tem search_path explícito                          │
│ • Grants reais no catálogo pg_proc / routine_privileges                 │
│ • Volatility real (VOLATILE vs STABLE)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Propriedade `SECURITY DEFINER`
- **Na migration candidata DEV:** A migration define explicitamente `SECURITY DEFINER`. Essa é uma escolha arquitetural justificada, pois a role anônima (`anon`) precisa validar a senha contra `auth.users` sem ter permissão direta de `SELECT` nessa tabela.
- **Na VOLTZ:** A propriedade equivalente da função atualmente instalada em VOLTZ **não foi recuperada do catálogo `pg_proc`**. Não se pode afirmar documentalmente que a função em produção seja `SECURITY DEFINER`, apenas que seu comportamento responde a chamadas anônimas.

### 5.2 Propriedade `search_path`
- **Na migration candidata DEV:** Contém `SET search_path = public, extensions`. Trata-se de uma **decisão de segurança e hardening da candidata DEV** para mitigar riscos de *search_path hijacking*.
- **Na VOLTZ:** Não há qualquer evidência de que a função de produção possua esse `search_path` definido.

### 5.3 Grants e Permissões
- **Na migration candidata DEV:** Foram definidos `REVOKE ALL FROM PUBLIC` e `GRANT EXECUTE TO anon, authenticated, service_role`.
- **Na VOLTZ:** A única evidência disponível é que PostgREST expõe a RPC e aceita chamadas com a API key de `anon`. Os grants internos reais no catálogo do PostgreSQL da VOLTZ **não foram comprovados diretamente**.

### 5.4 Classificação do Status da Migration
A migration está **corretamente classificada** como:
```text
CANDIDATE / NÃO VALIDADA CONTRA PRODUÇÃO
```
Esse status **não pode ser promovido para canônico de produção** até que a definição real no banco de dados da VOLTZ seja recuperada e comparada.

---

## 6. Auditoria de Idempotência: Reexecutabilidade DDL vs Idempotência Semântica

O relatório do Gate 1C afirmou que a migration candidata é `"100% idempotente via CREATE OR REPLACE FUNCTION e GRANT declarativo"`.

A auditoria de arquitetura rejeita essa formulação genérica e estabelece a classificação técnica rigorosa:

### 6.1 Reexecutabilidade DDL
- O comando `CREATE OR REPLACE FUNCTION` permite que a migration seja executada múltiplas vezes em uma base vazia ou já inicializada sem erro de sintaxe ou violação de chave primária.
- Os comandos `REVOKE` e `GRANT` são declarativos e idempotentes por natureza no PostgreSQL.

### 6.2 Idempotência Semântica
- `CREATE OR REPLACE FUNCTION` **não é semanticamente neutro**: ele **sobrescreve incondicionalmente** a implementação preexistente em banco de dados.
- Se a função atualmente instalada na VOLTZ contiver lógica adicional, queries diferentes, auditoria interna ou variáveis específicas não mapeadas pela engenharia reversa, essa implementação será destruída pela aplicação da candidata.
- Além disso, se a função existente tiver uma assinatura de parâmetros ou tipos diferente, o `CREATE OR REPLACE FUNCTION` falhará com erro `cannot change return type of existing function` ou criará uma sobrecarga acidental (*overload*), quebrando o PostgREST.

### 6.3 Classificação Obrigatória
```text
STATUS DE IDEMPOTÊNCIA:
REEXECUTÁVEL EM NÍVEL DDL / IDEMPOTÊNCIA SEMÂNTICA NÃO COMPROVADA CONTRA PRODUÇÃO
```

---

## 7. Auditoria dos Testes Automatizados (`src/test/verifyTeamCredentialsRpc.test.ts`)

A inspeção detalhada do arquivo de testes confirmou a existência dos 7 testes relatados no Gate 1C. No entanto, a natureza desses testes deve ser categorizada com exatidão técnica:

### 7.1 Classificação dos Testes

| Teste | Descrição no Arquivo | Tipo Real | Usa Banco Real? | O que Efetivamente Valida |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Rejeita chamada quando token não é fornecido ou vazio | Unitário | **NÃO** (Mock) | Regra lógica de validação de token vazio |
| **2** | Rejeita chamada quando senha não é fornecida ou vazia | Unitário | **NÃO** (Mock) | Regra lógica de validação de senha vazia |
| **3** | Rejeita token inexistente com mensagem amigável | Unitário | **NÃO** (Mock) | Mensagem de erro para token desconhecido |
| **4** | Rejeita senha incorreta com mensagem padrão | Unitário | **NÃO** (Mock) | Mensagem de erro para senha incorreta |
| **5** | Valida token e senha corretos e retorna e-mail | Unitário | **NÃO** (Mock) | Contrato de sucesso `{ ok: true, email }` |
| **6** | Garante que trim() é aplicado em token e senha | Unitário | **NÃO** (Mock) | Sanitização de strings com espaços |
| **7** | Integração com fluxo de login do cliente Supabase Auth | Integração de Frontend | **NÃO** (Mocks `vi.fn`) | Compatibilidade entre retorno da RPC e `signInWithPassword` |

### 7.2 Análise Crítica de QA sobre os Testes
1. **Ausência de Testes SQL Automatizados:** Os 7 testes utilizam `mockVerifyTeamCredentialsRpc`, uma função puramente TypeScript declarada em memória no próprio arquivo de teste. **Nenhum teste da suíte Vitest executa comandos SQL contra o PostgreSQL.**
2. **Validação PostgreSQL Mencionada no Gate 1C:** O relatório do Gate 1C mencionou que executou `CREATE FUNCTION`, `REVOKE`, `GRANT` e testes manuais com `ROLLBACK` no PostgreSQL local (`supabase-db`). Essa ação foi uma **execução interativa ad-hoc realizada pelo operador via terminal**, e **não** uma suíte automatizada reprodutível persistida no repositório.
3. **Conclusão:** O resultado `"7 passed"` comprova estritamente a conformidade do contrato TypeScript/JavaScript com a camada de aplicação; **não comprova a correção do código PL/pgSQL no banco de dados.**

---

## 8. Homologação e Schema Drift em `matches`

Auditoria comparativa entre a migration versionada DEV (`20260921000001_match_homologation_and_details.sql`) e o schema manual existente na VOLTZ:

### 8.1 Matriz de Comparação de Tipos

| Coluna | DEV (`20260921000001`) | VOLTZ (Produção) | Classificação | Avaliação Técnica de Risco |
| :--- | :--- | :--- | :---: | :--- |
| `homologated_at` | `timestamptz` | `timestamptz` | **PARIDADE** | Tipos nativos idênticos. |
| `homologated_by` | `uuid` | `text` | **SCHEMA DRIFT** | Divergência real de tipos nativos. |
| `checked_in_athlete_ids` | `text[]` | `jsonb` | **SCHEMA DRIFT** | Divergência estrutural (Array nativo SQL vs JSONB). |
| `custom_set_format` | `text` | `text` | **PARIDADE** | Tipos nativos idênticos. |
| `is_wo` | `boolean DEFAULT false` | `boolean DEFAULT false` | **PARIDADE** | Tipos nativos idênticos. |
| `wo_reason` | `text` | `text` | **PARIDADE** | Tipos nativos idênticos. |

### 8.2 Análise do Efeito de `ADD COLUMN IF NOT EXISTS`
- A cláusula `ADD COLUMN IF NOT EXISTS` utilizada na migration DEV impede a ocorrência de erro caso o script seja executado na VOLTZ, pois o PostgreSQL ignora colunas preexistentes.
- **Risco de Silent Schema Drift:** Como a instrução não altera colunas existentes, a VOLTZ continuará operando com `text` e `jsonb`, enquanto novos ambientes locais ou de staging provisionados do zero receberão `uuid` e `text[]`.
- Não se deve concluir que os tipos são equivalentes apenas porque o cliente HTTP/JavaScript serializa arrays e strings em ambos. Em consultas SQL diretas, funções como `jsonb_array_elements()` e operadores como `@>` funcionam em `jsonb`, mas falham em `text[]`.

### 8.3 Ratificação da Decisão de Não Executar `ALTER COLUMN TYPE`
- A decisão tomada no Gate 1C de **não executar `ALTER TABLE ... ALTER COLUMN TYPE`** em produção é **tecnicamente correta e ratificada**.
- A execução de `ALTER COLUMN TYPE` exigiria lock exclusivo de escrita na tabela central `matches`, com risco iminente de corrupção ou indisponibilidade durante o uso do sistema pelas equipes e mesários.

---

## 9. Rastreabilidade das Evidências

| Item Auditado | Fonte da Evidência | Nível de Acesso | Classificação da Evidência |
| :--- | :--- | :--- | :---: |
| **Assinatura da RPC** | OpenAPI Spec (`/rest/v1/`) | Leitura HTTP pública | **FATO COMPROVADO** |
| **Parâmetros e Mensagens de Erro** | Sondagem HTTP na VOLTZ | Leitura HTTP com payloads vazios/inválidos | **FATO COMPROVADO** |
| **Fluxo do Frontend de Produção** | Bundle compilado `index-C7AnobpH.js` | Leitura HTTP de arquivo estático | **FATO COMPROVADO** |
| **Tipos de Coluna em VOLTZ** | Sondagem REST / Análise Forense Gate 1B | Leitura HTTP | **FATO COMPROVADO** |
| **Código PL/pgSQL Interno da VOLTZ** | Catálogo `pg_proc` da VPS Contabo | Inacessível (sem porta 5432 / sem SSH) | **NÃO COMPROVADO** |
| **SECURITY DEFINER em Produção** | Catálogo `pg_proc.prosecdef` | Inacessível | **NÃO COMPROVADO (INFERIDO)** |
| **search_path em Produção** | Catálogo `pg_proc.proconfig` | Inacessível | **NÃO COMPROVADO (DECISÃO DEV)** |
| **Grants Reais no PostgreSQL de VOLTZ** | `information_schema.routine_privileges` | Inacessível | **NÃO COMPROVADO DIRETAMENTE** |
| **Validação da Migration em Banco Real** | PostgreSQL local (`supabase-db`) | Execução ad-hoc do operador com rollback | **RESULTADO REPORTADO NÃO PERSISTIDO EM TESTE** |

---

## 10. Balanço Crítico: Afirmações Comprovadas vs Afirmações Não Comprovadas

### 10.1 Afirmações Comprovadas
1. A RPC `verify_team_credentials` existe na VOLTZ e recebe `p_token text` e `p_password text`.
2. A RPC na VOLTZ retorna `200 OK` com payloads JSON estruturados (`ok: false, error: ...` ou `ok: true, email: ...`).
3. O bundle frontend da VOLTZ consome o e-mail retornado pela RPC para invocar `signInWithPassword`.
4. A migration `20260923000001_formalize_verify_team_credentials.sql` existe fisicamente no DEV e implementa fielmente o contrato observado.
5. As colunas de homologação em `matches` na VOLTZ utilizam `text` para `homologated_by` e `jsonb` para `checked_in_athlete_ids`.
6. A suite `src/test/verifyTeamCredentialsRpc.test.ts` passa com 7 testes no Vitest.
7. Zero mutações foram executadas em VOLTZ.

### 10.2 Afirmações Não Comprovadas (ou Excessivas) no Relatório do Gate 1C
1. **"100% idempotente":** Inexata. É reexecutável em nível DDL, mas destrutiva semanticamente se substituir uma função com corpo diferente em produção.
2. **"Função VOLTZ é SECURITY DEFINER":** Não comprovada no catálogo de produção. É apenas uma exigência inferida e implementada na candidata DEV.
3. **"search_path da VOLTZ":** Não comprovado. `SET search_path = public, extensions` é decisão da candidata DEV.
4. **"Grants da VOLTZ comprovados":** Inexato. Comprovou-se acessibilidade externa via PostgREST, não os grants internos em tabelas/catálogos do PostgreSQL.
5. **"Validação da migration no PostgreSQL local":** O relatório descreve testes manuais com rollback, mas não há fixture de integração SQL automatizada no repositório.
6. **"Risco em Produção = NULO":** Deve ser corrigido conceitualmente. O risco da **execução do Gate 1C** foi nulo (pois nada foi aplicado remotamente), mas o risco de uma **promoção futura** dessa migration sem validação contra o catálogo de produção é **NÃO VALIDADO / POTENCIALMENTE ELEVADO**.

---

## 11. Findings da Auditoria (Gate 1C.1)

### F-01: Reexecutabilidade DDL rotulada como "100% Idempotente"
- **Severidade:** Média (Classificação Arquitetural)
- **Descrição:** O relatório do Gate 1C classificou a migration como "100% idempotente". `CREATE OR REPLACE FUNCTION` sobrescreve código preexistente sem verificação de paridade.
- **Resolução:** Reclassificado como `REEXECUTÁVEL EM NÍVEL DDL / IDEMPOTÊNCIA SEMÂNTICA NÃO COMPROVADA`.

### F-02: Testes Automatizados Baseados em Mocks sem Integração SQL Persistida
- **Severidade:** Média (Confiabilidade de Testes)
- **Descrição:** Os 7 testes em `src/test/verifyTeamCredentialsRpc.test.ts` utilizam mocks TypeScript em memória. Não testam sintaxe SQL nem execução contra o PostgreSQL.
- **Resolução:** Documentar explicitamente que a suíte valida apenas o contrato do cliente frontend, mantendo a necessidade de teste de integração em banco antes de qualquer promoção.

### F-03: Atributos Internos de Produção Declarados com Base em Inferência
- **Severidade:** Média (Rigor Forense)
- **Descrição:** Menções a `SECURITY DEFINER`, `search_path` e grants internos foram atribuídas implicitamente à função em produção, quando na realidade são escolhas de design da migration candidata do DEV.
- **Resolução:** Registrar formalmente que as propriedades internas de produção permanecem não recuperadas devido ao bloqueio da porta 5432 e SSH na VPS Contabo.

### F-04: Risco de Promoção Futura Não Validado
- **Severidade:** Alta (Governança de Produção)
- **Descrição:** O risco foi qualificado como "NULO" no Gate 1C. Se essa migration for aplicada sem validação prévia do código real da VOLTZ, o risco é não controlado.
- **Resolução:** O risco da operação do Gate 1C permanece nulo (read-only), mas o risco de promoção futura permanece formalmente classificado como `NÃO VALIDADO`.

### F-05: Silent Schema Drift nas Colunas de Homologação
- **Severidade:** Média (Integridade de Dados)
- **Descrição:** A migration `20260921000001` usa `ADD COLUMN IF NOT EXISTS`, permitindo coexistência de tipos heterogêneos (`uuid` vs `text`, `text[]` vs `jsonb`) entre DEV e VOLTZ.
- **Resolução:** Manter a pendência de reconciliação de schema drift registrada para resolução posterior à estabilização operacional do torneio.

### F-06: Status da Migration Canônica Mantido Restrito
- **Severidade:** Informativa (Salvaguarda)
- **Descrição:** Garantir que a migration candidata não seja inadvertidamente considerada pronta para deploy em produção.
- **Resolução:** O status `CANDIDATE / NÃO VALIDADA CONTRA PRODUÇÃO` permanece estritamente em vigor.

---

## 12. Avaliação de Impacto

* **Ambiente de Produção (VOLTZ):** Impacto rigorosamente **ZERO**. O sistema em produção permanece intocado, em execução contínua e sem qualquer operação DDL, DML ou deploy.
* **Worktree do Ambiente DEV:** Impacto **ZERO**. Os 16 arquivos modificados rastreados permanecem intactos. Nenhum commit ou alteração foi introduzida no histórico do Git.
* **Governança de Arquitetura:** A auditoria impediu que suposições baseadas em comportamento de caixa-preta fossem promovidas a fatos canônicos de produção, estabelecendo pré-requisitos invioláveis para os gates subsequentes.

---

## 13. Condicionamento Estrito do Próximo Gate (Gate 2A)

O Gate 2A **NÃO PODERÁ** aplicar qualquer migration em produção sem que as seguintes pré-condições sejam formalmente atendidas:

```text
CONDIÇÕES OBRIGATÓRIAS PARA O GATE 2A:
1. Geração de backup lógico e de dados completo da produção VOLTZ (pg_dump -F c);
2. Validação e teste de restauração do backup em ambiente local/isolado;
3. Janela operacional de manutenção formalizada (ausência de partidas ativas);
4. Plano de rollback documentado e testado;
5. PRÉ-CONDIÇÃO INEGOCIÁVEL PARA verify_team_credentials:
   Obtenção do código SQL original via conexão direta ou console administrativo na VPS:
   SELECT pg_get_functiondef('public.verify_team_credentials'::regproc);
   A migration candidata só poderá ser promovida após diff exato contra o código real de VOLTZ.
```

---

## 14. Decisão Final da Auditoria

```text
╔═════════════════════════════════════════════════════════════════════════╗
║                      DECISÃO DO GATE 1C.1:                              ║
║                   GATE 1C.1 = PASS WITH FINDINGS                        ║
╚═════════════════════════════════════════════════════════════════════════╝
```

### Justificativa Formal da Decisão:
1. **Consistência Geral dos Artefatos:** A migration candidata e os testes foram construídos tecnicamente com rigor, refletindo fielmente o contrato observado via OpenAPI e frontend da VOLTZ.
2. **Classificação como CANDIDATE Corretamente Declarada:** O Gate 1C não cometeu o erro de declarar a migration como final ou oficial, mantendo o rótulo de candidata.
3. **Findings Mitigados:** As afirmações excessivas quanto a idempotência absoluta, testes com mocks vs banco real, e presunção de atributos internos do PostgreSQL de produção foram formalmente corrigidas e demarcadas nesta auditoria.
4. **VOLTZ e Worktree Preservados:** Ambas as garantias de não-mutação foram cumpridas com 100% de conformidade.

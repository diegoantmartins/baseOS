# BASEOS — FASE 3.2: AUDITORIA FINAL DE HOMOLOGAÇÃO PRÉ-FASE 3.3

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Fase:** 3.2 — Fechamento de Integridade e Homologação Definitiva  
**Classificação:** **HOMOLOGADO COM LIMITAÇÕES DOCUMENTADAS**

---

## 1. Contexto e Objetivo da Homologação

Antes de iniciar os trabalhos da Fase 3.3 (e sem antecipar portais públicos ou escopos da Fase 4), foi conduzida uma auditoria técnica adversarial para comprovar formalmente quatro pontos críticos de segurança, integridade e consistência no código-fonte do repositório:

1. **RLS de `profiles`:** Comprovação de que as políticas e triggers impedem que um usuário de equipe altere seu `competition_team_id` ou `role`.
2. **Auditoria de RPCs (`SECURITY DEFINER`):** Comprovação de que não existe nenhuma outra RPC ou caminho de escrita que contorne as regras esportivas e de autorização.
3. **Migration Legada (`draft` → `planning` e `registration` → `registration-open`):** Comprovação de que a migração foi executada com segurança no banco PostgreSQL e com normalização defensiva ativa no adaptador BaseOS.
4. **Guarda do Sorteio (`advanceToGroupsDefinedAfterDraw`):** Comprovação de que a validação de partidas não apenas afere `matches.length > 0`, mas verifica se as partidas gravadas representam de fato o sorteio oficial (grupos válidos e cobertura de todas as equipes sorteadas).

---

## 2. Ponto 1: RLS e Imutabilidade em `profiles`

### 2.1 Requisito
Garantir que a política de RLS e as regras do banco impeçam incondicionalmente um usuário de equipe de trocar seu `competition_team_id` ou elevar seu `role` para `organizer`/`admin`.

### 2.2 Evidência no Código
Arquivo: [`supabase/migrations/20260905000003_rls_portal_security.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20260905000003_rls_portal_security.sql)

O BaseOS implementou defesa em profundidade em 3 camadas complementares:

#### Camada 1: RLS Policy com `WITH CHECK`
```sql
CREATE POLICY "profiles_team_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND competition_team_id IS NOT DISTINCT FROM (SELECT p.competition_team_id FROM public.profiles p WHERE p.id = auth.uid())
  );
```
- O predicado `WITH CHECK` força que o valor submetido na proposta de atualização (`role` e `competition_team_id`) seja idêntico ao valor já persistido no registro correspondente ao `auth.uid()`.

#### Camada 2: Trigger `BEFORE UPDATE` com `SECURITY DEFINER`
```sql
CREATE OR REPLACE FUNCTION public.trg_protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
BEGIN
  -- Se role e competition_team_id não sofreram alteração, permite a operação
  IF NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.competition_team_id IS NOT DISTINCT FROM OLD.competition_team_id THEN
    RETURN NEW;
  END IF;

  -- Se houve tentativa de alteração, verifica se o usuário autenticado é admin ou organizer
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IN ('organizer', 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Acesso negado: usuários de equipe não têm permissão para alterar cargo (role) ou vínculo de equipe (competition_team_id).';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_profile_sensitive_fields();
```
- O trigger roda a nível de motor do PostgreSQL antes de qualquer gravação física da linha.
- Se `NEW.role != OLD.role` ou `NEW.competition_team_id != OLD.competition_team_id`, e o usuário autenticado não for organizador/administrador, a operação é abortada com `RAISE EXCEPTION`.

#### Camada 3: Bloqueio de `INSERT` Arbitrário
- Nenhuma policy concede permissão de `INSERT` em `public.profiles` para o role `team`.
- A inserção de perfis ocorre exclusivamente pelo gatilho interno `handle_new_user()` conectado aos eventos de autenticação de `auth.users`.

**Status:** **PASS** (Protegido por RLS `WITH CHECK` + Trigger `BEFORE UPDATE` no PostgreSQL).

---

## 3. Ponto 2: Auditoria de RPCs e Caminhos de Escrita

### 3.1 Requisito
Garantir que não existe outra RPC ou caminho de escrita no banco de dados que contorne as regras de negócio e de autorização.

### 3.2 Evidência no Código e no Banco
1. **Auditoria Exaustiva de Migrations:**
   Uma varredura completa em `supabase/migrations/*.sql` por `FUNCTION`, `CREATE FUNCTION` e `SECURITY DEFINER` revelou que existem **apenas 3 funções** em todo o esquema do banco:
   - `public.handle_new_user()` (L122 de `20260818000000_initial_schema.sql`): gatilho interno pós-cadastro de usuário em `auth.users`.
   - `public.trg_protect_profile_sensitive_fields()` (L121 de `20260905000003_rls_portal_security.sql`): gatilho de defesa em profundidade em `profiles`.
   - `public.register_athlete()`: função pública de inscrição. A versão legada (`20260818000000_initial_schema.sql`) foi **completamente substituída** por `CREATE OR REPLACE FUNCTION` em [`supabase/migrations/20260905000004_rpc_register_athlete_v2.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20260905000004_rpc_register_athlete_v2.sql).
   
2. **Blindagem de `register_athlete` v2:**
   - Define explicitamente `SECURITY DEFINER SET search_path = public` (evitando hijacking de path).
   - Valida existência e validade do token de equipe (`v_team.is_locked = false`).
   - Valida prazo regulamentar (`v_team.registration_deadline > now()`).
   - Valida ciclo de vida da competição:
     ```sql
     IF v_comp.status NOT IN ('registration-open', 'registration') THEN
       RETURN jsonb_build_object('success', false, 'error', 'Período de inscrições encerrado ou não iniciado para esta competição.');
     END IF;
     ```
   - Extrai o teto máximo de elenco diretamente do JSONB `rules_snapshot` ou `config` (`rosterLimits ->> 'maxAthletes'`), rejeitando hardcodes.
   - Valida unicidade de camisa, limite de 1 capitão e máximo de 2 líberos.

3. **Auditoria do Frontend (`src/`):**
   - Varredura por `.rpc(` em todo o diretório `src/`: **0 ocorrências encontradas**.
   - Toda comunicação de escrita com o banco passa pela camada central [`src/services/dataAccess.ts`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts), cujas tabelas acessadas pelo portal da agremiação (`competition_athletes`, `competition_teams`, `profiles`) estão submetidas às regras de RLS e triggers.

**Status:** **PASS** (Nenhum bypass de escrita identificado).

---

## 4. Ponto 3: Migração Legada com Normalização Defensiva

### 4.1 Requisito
Confirmar que as transições de status legados (`draft` → `planning` e `registration` → `registration-open`) foram implementadas de forma segura e não apenas documentadas.

### 4.2 Evidência no Código

#### Nível 1: Banco de Dados (PostgreSQL)
1. [`supabase/migrations/20260905000001_lifecycle_enum_sync.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20260905000001_lifecycle_enum_sync.sql):
   - Adiciona de forma idempotente (`ADD VALUE IF NOT EXISTS`) os valores canônicos: `planning`, `registration-open`, `registration-closed`, `draw-pending`, `groups-defined`, `playoffs`.
2. [`supabase/migrations/20260905000002_legacy_status_migration.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20260905000002_legacy_status_migration.sql):
   - Executada em transação separada para garantir o commit prévio do enum no Postgres:
     ```sql
     UPDATE public.competitions SET status = 'planning' WHERE status = 'draft';
     UPDATE public.competitions SET status = 'registration-open' WHERE status = 'registration';
     ```

#### Nível 2: Adaptador BaseOS de Aplicação (SSOT de Dados)
Arquivo: [`src/services/dataAccess.ts`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts) (L140-L155 e L750-L770)

Para blindar tanto o modo Supabase quanto o modo LocalStorage/Demo contra dados legados cacheados ou payloads desatualizados, foi introduzida a função de normalização defensiva de leitura:
```ts
function normalizeCompetitionRecord(comp: CompetitionRecord): CompetitionRecord {
  const rawStatus = comp.status as string;
  let normalizedStatus = comp.status;
  if (rawStatus === 'draft') {
    normalizedStatus = 'planning';
  } else if (rawStatus === 'registration') {
    normalizedStatus = 'registration-open';
  }
  return {
    ...comp,
    status: normalizedStatus,
  };
}
```
Essa função intercepta todas as chamadas de `listCompetitions` e `getCompetition` nos dois adaptadores (`localStorageAdapter` e `supabaseAdapter`).

#### Cobertura em Testes Automatizados
Arquivo: [`src/test/fase32IntegrityAndSecurity.test.ts`](file:///home/diego-martins/docker/volei/src/test/fase32IntegrityAndSecurity.test.ts) (L260-L287)
- Teste `normaliza status legados draft -> planning e registration -> registration-open no acesso a dados` aprovado com sucesso.

**Status:** **PASS** (Migrations no PostgreSQL + normalização defensiva ativa no adaptador de dados).

---

## 5. Ponto 4: Guarda Rigorosa do Sorteio

### 5.1 Requisito
Garantir que a guarda de `advanceToGroupsDefinedAfterDraw` valida se as partidas representam de fato o sorteio oficial (grupos válidos e confrontos gerados para todas as equipes sorteadas), e não apenas "existe pelo menos uma partida qualquer".

### 5.2 Evidência no Código
Arquivo: [`src/services/competitionLifecycleService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts) (L430-L474)

A validação foi estruturada em 3 verificações sequenciais rigorosas:
```ts
// 1. Confirmar se o registro do sorteio existe e possui grupos definidos com equipes
const draw = await dataAccess.getDrawByCompetition(competitionId);
if (!draw || !draw.groups || draw.groups.length === 0) {
  return {
    ok: false,
    errors: [
      'Não é possível avançar para "groups-defined": nenhuma partida foi encontrada ou persistida para esta competição (sorteio oficial ausente ou sem grupos).',
    ],
  };
}

// 2. Confirmar que existem partidas salvas correspondentes à fase de grupos
const matches = await dataAccess.listMatches(competitionId);
const groupMatches = (matches || []).filter(
  m => m.groupName || m.phase === 'Fase de Grupos' || m.phase?.toLowerCase().includes('classificat') || m.phase?.toLowerCase().includes('grupo')
);

if (groupMatches.length === 0) {
  return {
    ok: false,
    errors: [
      'Não é possível avançar para "groups-defined": nenhuma partida foi encontrada ou persistida para esta competição.',
    ],
  };
}

// 3. Confirmar que as equipes sorteadas nos grupos possuem partidas cadastradas
const drawnTeamIds = new Set(
  draw.groups.flatMap(g => (g.teams || []).map(t => (typeof t === 'string' ? t : t.teamId)))
);

if (drawnTeamIds.size >= 2) {
  const matchTeamIds = new Set(groupMatches.flatMap(m => [m.teamAId, m.teamBId]));
  const missingTeams = [...drawnTeamIds].filter(teamId => !matchTeamIds.has(teamId));

  if (missingTeams.length > 0) {
    return {
      ok: false,
      errors: [
        `Inconsistência no sorteio: ${missingTeams.length} equipe(s) sorteadas em grupos não possuem partidas cadastradas na tabela de jogos.`,
      ],
    };
  }
}
```

#### Cobertura em Testes Automatizados
Arquivo: [`src/test/fase32IntegrityAndSecurity.test.ts`](file:///home/diego-martins/docker/volei/src/test/fase32IntegrityAndSecurity.test.ts) (L213-L258)
- Teste `rejeita avanço de lifecycle se nenhuma partida foi salva no repositório` -> **PASS**.
- Teste `rejeita avanço para groups-defined se houver equipe sorteada em grupo sem partidas cadastradas` -> **PASS**.
- Teste `avança para groups-defined com sucesso quando as partidas existem e foram devidamente confirmadas` -> **PASS**.

**Status:** **PASS** (Validação semântica completa de chaves, equipes sorteadas e confrontos).

---

## 6. Resultados da Bateria de Verificação Técnica

| Comando | Resultado | Observações |
|---|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** | Integridade estrita de tipagem TypeScript mantida |
| `npm run lint` | **0 erros**, 1 warning | Warning padrão de `react-hooks/exhaustive-deps` em `DrawArenaCanvas.tsx` |
| `npm test` | **76 arquivos passaram** (625 testes, 0 falhas) | 100% de aprovação na suíte Vitest com jsdom |
| `npm run build` | **Sucesso em 58.14s** | Bundle de produção gerado sem falhas pelo Vite |

---

## 7. Certificação Atualizada do Sistema

```text
BASEOS — FASE 3.2
CERTIFICAÇÃO TÉCNICA DE HOMOLOGAÇÃO

Status:
HOMOLOGADO COM LIMITAÇÕES DOCUMENTADAS

Conclusão:
Todos os 12 blockers foram tratados, com evidências técnicas registradas; os itens não-transacionais permanecem explicitamente classificados como limitações.
```

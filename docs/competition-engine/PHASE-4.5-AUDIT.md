# PHASE-4.5-AUDIT: Auditoria Técnica do Banco de Dados, Persistência e DataAccess

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Status:** AUDITORIA SOMENTE LEITURA CONCLUÍDA — SEM ALTERAÇÃO DE CÓDIGO  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. OBJETIVO DA AUDITORIA

A Fase 4.4.1 concluiu a especificação e implementação em memória dos contratos puros do **Competition Format Engine** (`StageDefinition`, `RoundDefinition`, `MatchSlot`, `ParticipantReference`, `ProgressionRoute`, `StageGraphEngine`, `ParticipantResolutionEngine`, `GenericPairingEngine`, `GenericProgressionEngine`).

O objetivo desta auditoria é dissecar a camada física de dados do BaseOS (PostgreSQL / Supabase / `dataAccess.ts` / migrations) para responder com evidências irrefutáveis:

> **Como o novo modelo de estágios, rodadas, slots com participantes desconhecidos, BYEs e rotas de progressão pode ser persistido e consultado sem deformar o domínio esportivo para caber em restrições arcaicas do schema atual?**

Esta auditoria é **estritamente somente leitura**. Nenhuma tabela foi alterada, nenhuma migration foi criada, e nenhum serviço foi modificado.

---

## 2. BASELINE OBRIGATÓRIO DE QUALIDADE

Antes de qualquer conclusão ou análise técnica, os comandos de verificação oficiais do projeto foram executados no ambiente real:

### 2.1. Git Status & Working Tree
```bash
$ git status --short
# Working tree limpo no início da auditoria (branch tracking dev/master)
```

### 2.2. Histórico Recente de Commits
```bash
$ git log -5 --oneline
a9e42ac docs: registrar certificação e walkthrough da fase 4.4.1
2e0e5a8 test: adicionar suíte de testes de integração e cenários esportivos da fase 4.4.1
e2bf129 feat: implementar engines puros de stage, pairing, participant resolution e progression
5b1ec27 feat: definir contratos canônicos de stage, round, slot e progression
5083cfc docs: registrar certificação e walkthrough da fase 4.4
```

### 2.3. Verificação de Tipos (TypeScript)
*Comando canônico do projeto:* `npx tsc -p tsconfig.app.json --noEmit`
- **Resultado:** 0 erros de compilação TypeScript encontrados.
*(Nota: o script `npm run typecheck` não está presente no `package.json`, conforme auditado. O comando real acima foi executado).*

### 2.4. Suíte de Testes Automatizados (Vitest)
*Comando:* `npm test`
- **Arquivos de Teste:** 86 arquivos avaliados.
- **Testes Executados:** 710 testes.
- **Testes Aprovados:** 710 testes (100% pass).
- **Falhas:** 0 falhas.
- **Tempo de Execução:** ~199s.

### 2.5. Linting (ESLint)
*Comando:* `npm run lint`
- **Erros:** 0 erros.
- **Avisos:** 1 aviso pré-existente (`DrawArenaCanvas.tsx` hook dependency warning).

### 2.6. Build de Produção (Vite)
*Comando:* `npm run build`
- **Resultado:** Compilação concluída com sucesso em 60.15s (dist gerada sem erros).

---

## 3. ESCOPO E ARQUIVOS AUDITADOS

### 3.1. Migrations Auditadas (`supabase/migrations/`)
Foram auditadas individualmente todas as 17 migrations do repositório:
1. `20260818000000_initial_schema.sql` (schema base: perfis, competições, times, árbitros, equipes de competição, atletas, partidas, RLS inicial)
2. `20260818000001_seed.sql` (dados de demonstração iniciais)
3. `20260818000002_app_settings.sql` (lineups em JSONB para matches)
4. `20260818000003_settings_ext.sql` (extensões de configuração)
5. `20260819000000_venues_logos_phases.sql` (adição de colunas `phase` e `group_name` em `matches`)
6. `20260819000001_draws.sql` (criação da tabela `public.draws` em JSONB)
7. `20260819000002_seed_full.sql` (carga completa de demonstração)
8. `20260819000003_seed_v2.sql` (atualização de sementes)
9. `20260819000004_admin_user.sql` (usuário administrador)
10. `20260829000001_draws_status.sql` (adição de `status` em `draws`: `preview`, `official`, `locked`)
11. `20260903000001_competition_lifecycle_and_rules.sql` (colunas `config` JSONB e `rules_snapshot` JSONB em `competitions`)
12. `20260904000001_audit_logs.sql` (tabela de auditoria operacional `public.audit_logs`)
13. `20260905000001_lifecycle_enum_sync.sql` (sincronização do enum `competition_status` com TypeScript)
14. `20260905000002_legacy_status_migration.sql` (migração de status legados `'draft'` e `'registration'`)
15. `20260905000003_rls_portal_security.sql` (blindagem RLS de perfis, equipes e atletas)
16. `20260905000004_rpc_register_athlete_v2.sql` (RPC segura para inscrição sem login)
17. `20260905000005_competition_slug_and_views.sql` (slugs normalizados e views públicas)

### 3.2. Serviços e Camadas de Persistência Auditados
- `src/services/dataAccess.ts` (linhas 1 a 1390: métodos de persistência, adapters LocalStorage/Supabase, conversões snake/camel, queries de matches e draws)
- `src/services/playoffsService.ts` (linhas 1 a 414: geração de slots, IDs `TBD`, avanço de vencedores hardcoded)
- `src/services/competitionBracketService.ts` (linhas 1 a 210: geração de partidas e checagem de modificabilidade)
- `src/services/publicCompetitionService.ts` (linhas 1 a 424: sanitização e DTOs públicos)
- `src/services/drawService.ts` (geração em memória de grupos e partidas)
- `src/pages/MatchesPage.tsx` (linhas 380 a 440: persistência e sincronização de partidas de playoffs)
- `src/components/competition/TournamentBracket.tsx` (linhas 1 a 179: renderização visual do chaveamento)
- `src/lib/pdf/matchSheetPdf.ts` (linhas 19 a 55: consumo de campos de partida para súmula oficial)

---

## 4. AUDITORIA PROFUNDA DO SCHEMA ATUAL

### 4.1. Tabela `public.competitions`
*Localização:* `20260818000000_initial_schema.sql` (L19-35), ampliada em `20260903000001` (L4-7) e `20260905000005`.
- **Primary Key:** `id text primary key`.
- **Foreign Keys:** Nenhuma na tabela `competitions`.
- **Colunas estruturais legadas:** `modality`, `format text default 'round-robin'`, `player_format text default '6x6'`, `set_format text default '5-sets'`, `gender_category`, `group_name text`.
- **Colunas canônicas modernas:**
  - `config jsonb`: Armazena a `CompetitionConfig` (SSOT) contendo `format`, `scoring`, `standings`, `registration`.
  - `rules_snapshot jsonb`: Armazena o snapshot imutável congelado no início da competição.
  - `slug text unique`: Identificador amigável de URL para o portal público.
  - `status public.competition_status`: Enum contendo `'planning'`, `'registration-open'`, `'registration-closed'`, `'draw-pending'`, `'groups-defined'`, `'in-progress'`, `'playoffs'`, `'completed'`, `'cancelled'`.
- **Limitação Crítica:** Não existe conceito de fases (`stages`) ou histórico de rodadas no nível relacional. Toda a hierarquia de fases só existe se encapsulada dentro de `competitions.config.format.stages[]`.

### 4.2. Tabela `public.competition_teams`
*Localização:* `20260818000000_initial_schema.sql` (L66-83).
- **Primary Key:** `id text primary key`.
- **Foreign Keys:** `competition_id references public.competitions(id) on delete cascade`, `team_id references public.teams(id) on delete cascade`.
- **Colunas:** `status`, `access_token`, `registration_deadline`, `is_locked`.
- **Limitação Crítica:** Não possui coluna `group_id` ou `group_name`. O vínculo entre uma equipe inscrita e o seu grupo na fase classificatória **NÃO é persistido nesta tabela**.

### 4.3. Tabela `public.teams`
*Localização:* `20260818000000_initial_schema.sql` (L41-49).
- **Primary Key:** `id text primary key`.
- **Colunas:** `name text not null`, `short_name text not null`, `modality`, `coach_name`.
- **Invariante violada por gambiarras:** Espera apenas equipes esportivas reais. O sistema jamais deve permitir criar registros nesta tabela com nomes como `"TBD"`, `"Vencedor Jogo 1"`, `"BYE"`.

### 4.4. Tabela `public.competition_athletes`
*Localização:* `20260818000000_initial_schema.sql` (L87-105).
- **Primary Key:** `id text primary key`.
- **Foreign Keys:** `competition_team_id references public.competition_teams(id) on delete cascade`.
- **Regras:** Camisas 1 a 99 (opcional na inscrição, obrigatório em súmula), 1 capitão, até 2 líberos.

### 4.5. Tabela `public.matches`
*Localização:* `20260818000000_initial_schema.sql` (L143-165), com colunas adicionadas em `20260819000000` (L32-33).
```sql
create table public.matches (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  round integer not null default 1,
  match_number integer not null,
  team_a_id text not null references public.teams (id),
  team_b_id text not null references public.teams (id),
  team_a_name text not null,
  team_b_name text not null,
  team_a_short_name text not null,
  team_b_short_name text not null,
  venue text not null default '',
  court text,
  scheduled_time timestamptz not null,
  status public.match_status not null default 'scheduled',
  sets jsonb not null default '[]',
  referees jsonb not null default '[]',
  observations text,
  winner_id text,
  phase text,        -- Adicionado em 20260819000000
  group_name text,   -- Adicionado em 20260819000000
  lineups jsonb,     -- Adicionado em 20260818000002
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, match_number)
);
```

#### Anatomia das Restrições de `matches`:
1. `team_a_id text not null references public.teams (id)`: **BLOQUEADOR CRÍTICO**. Exige que a equipe A seja uma equipe real, já existente e persistida na tabela `teams`.
2. `team_b_id text not null references public.teams (id)`: **BLOQUEADOR CRÍTICO**. Exige que a equipe B seja uma equipe real, já existente e persistida na tabela `teams`.
3. `scheduled_time timestamptz not null`: Exige data e hora mesmo para confrontos eliminatórios hipotéticos que ainda não possuem data definida na tabela do torneio.
4. `phase text` e `group_name text`: Strings puras, não estruturadas, sem foreign key para fases ou grupos.
5. `sets jsonb not null default '[]'`: Armazena os sets jogados. O resultado canônico é derivado em memória via `CompetitionRulesService.getCanonicalMatchResult`.

### 4.6. Tabela `public.draws`
*Localização:* `20260819000001_draws.sql` (L7-15).
```sql
create table if not exists public.draws (
  id text primary key,
  competition_id text not null references public.competitions (id) on delete cascade,
  config jsonb not null default '{}',
  groups jsonb not null default '[]',
  matches jsonb not null default '[]',
  status text, -- 'preview' | 'official' | 'locked'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_draws_competition on public.draws (competition_id);
```
- **Natureza:** Document store monolítico JSONB.
- **Inconsistência Arquitetural Grave:** O sorteio duplica as partidas em `draws.matches` (JSONB), enquanto o sistema também as insere na tabela `public.matches`.
- **Restrição de Cardinalidade:** `unique index on (competition_id)` restringe o banco a **apenas um sorteio por competição**. Em torneios multi-fases (onde pode haver sorteio para grupos e posteriormente sorteio de chaves para o mata-mata, ou sorteio da repescagem), essa constraint impede múltiplos sorteios.

---

## 5. AUDITORIA ESPECIAL: O SCHEMA ATUAL SUPORTA PARTICIPANTES DESCONHECIDOS?

### 5.1. Teste Conceitual 1: Quartas de Final 1
- **Team A:** 1º Colocado Geral (Overall Ranking #1)
- **Team B:** Vencedor do Play-in 1 (Winner of Play-in 1)
- **Tentativa de Inserção no Schema Atual:**
  - Team A pode até já estar resolvido se os grupos tiverem terminado.
  - Team B ainda está indefinido porque o Play-in 1 ainda não foi disputado.
  - Se a aplicação tentar gerar a partida com `team_b_id = null`, o banco rejeita com:
    `ERROR: null value in column "team_b_id" of relation "matches" violates not-null constraint`.
  - Se a aplicação tentar passar `team_b_id = 'TBD-B-1'`, o banco rejeita com:
    `ERROR: insert or update on table "matches" violates foreign key constraint "matches_team_b_id_fkey" - Key (team_b_id)=(TBD-B-1) is not present in table "teams"`.

### 5.2. Teste Conceitual 2: Semifinal 1
- **Team A:** Vencedor de Quartas 1
- **Team B:** Vencedor de Quartas 2
- **Tentativa de Inserção no Schema Atual:**
  - Ambas as equipes são desconhecidas no momento da montagem da chave.
  - Nenhuma das duas possui ID de equipe correspondente na tabela `teams`.
  - O schema atual torna **impossível** pré-agendar a semifinal no banco de dados.

### 5.3. Teste Conceitual 3: Final
- **Team A:** Vencedor de Semifinal 1
- **Team B:** Vencedor de Semifinal 2
- **Tentativa de Inserção no Schema Atual:**
  - Impossível persistir a intenção da final antes da conclusão das semifinais.

### 5.4. Como o Código Legado Tentava "Enganar" essa Limitação?
No arquivo `src/services/playoffsService.ts` (linhas 221 a 226):
```typescript
teamAId: teamA?.id ?? `TBD-A-${slot.matchIndex}`,
teamBId: teamB?.id ?? `TBD-B-${slot.matchIndex}`,
teamAName: teamA?.name ?? slot.sourceTeamA.description,
teamBName: teamB?.name ?? slot.sourceTeamB.description,
```
**Conclusão da Evidência:** Esse código só funciona no LocalStorage porque o mock em memória não valida chaves estrangeiras. No Supabase/PostgreSQL real, essa operação falha catastroficamente ao tentar violar a FK `matches_team_a_id_fkey`. Por isso, no ambiente com banco real, o organizador é forçado a esperar todos os jogos acabarem antes de conseguir criar a partida seguinte, impossibilitando a exibição antecipada do chaveamento oficial!

---

## 6. AUDITORIA DE GROUPS (GRUPOS)

### 6.1. Existe uma entidade relacional de Grupo?
**NÃO**. Não existe tabela `public.groups`.

### 6.2. Como os grupos são representados no banco?
1. Em `public.draws.groups`: Array JSONB de objetos contendo `{ name: 'Grupo A', teams: [...] }`.
2. Em `public.matches.group_name`: Coluna de texto livre (ex: `'Grupo A'`, `'A'`, `'Grupo B'`).
3. Em `public.competition_teams`: Não existe indicação de grupo.

### 6.3. Sobrecarga e Anomalia em `MatchesPage.tsx`:
No arquivo `src/pages/MatchesPage.tsx` (linhas 388-390):
```typescript
const matchInGroup = compMatches.find((m) => m.teamAId === t.id || m.teamBId === t.id);
return { team: t, groupName: matchInGroup?.groupName || 'A' };
```
**Impacto:** Para descobrir a qual grupo um time pertence, o sistema busca a primeira partida em que o time jogou e lê o campo `groupName`. Se a partida foi cadastrada com `'Grupo A'` ou `'A'`, há divergências de string. E se a equipe ainda não tiver jogado nenhuma partida, o sistema aplica um fallback arbitrário para o `'Grupo A'`.

---

## 7. AUDITORIA DE TRANSAÇÕES E GERAÇÃO DE PARTIDAS

### 7.1. Análise de `dataAccess.saveDrawWithMatches`
*Localização:* `src/services/dataAccess.ts` (linhas 1046 a 1085).
```typescript
// 1. Chamada HTTP 1: DELETE das partidas classificatórias existentes
const { data: deletedData } = await supabase
  .from(SUPABASE_TABLES.matches)
  .delete()
  .in('phase', ['classificatória', 'classificatoria'])
  .eq('competition_id', result.competitionId);

// 2. Chamada HTTP 2: INSERT das novas partidas geradas
const { data: insertedMatches } = await supabase
  .from(SUPABASE_TABLES.matches)
  .insert(newMatches.map(m => toSnake(m)))
  .select();

// 3. Chamada HTTP 3: UPSERT do registro na tabela draws
const { data: drawData } = existingDraw
  ? await supabase.from(SUPABASE_TABLES.draws).update({ ...payload, updated_at: now }).eq('id', existingDraw.id)...
  : await supabase.from(SUPABASE_TABLES.draws).insert({ ...payload, created_at: now, updated_at: now })...
```

### 7.2. Riscos Críticos Identificados:
1. **Ausência Absoluta de Atomicidade:** São 3 requisições REST distintas enviadas pelo cliente ao PostgREST. Não há `BEGIN ... COMMIT` no cliente PostgREST.
2. **Perda Irreversível de Dados em Falha de Rede:** Se a Chamada 1 (DELETE) obtiver sucesso e a Chamada 2 (INSERT) falhar por qualquer motivo (timeout, payload inválido, erro de conexão), a competição perde todas as partidas da fase classificatória sem gravar as novas!
3. **Filtro Frágil por Strings:** `.in('phase', ['classificatória', 'classificatoria'])` depende de strings grafadas em português. Se alguma partida estiver com fase `'group-stage'` ou `'Fase de Grupos'`, ela não é deletada, resultando em partidas duplicadas e tabelas inconsistentes.

---

## 8. AUDITORIA DE RLS (ROW LEVEL SECURITY)

### 8.1. Políticas em `public.matches`
*Localização:* `20260818000000_initial_schema.sql` (L196 e L205).
```sql
create policy "matches_public_read" on public.matches for select using (true);
create policy "matches_auth_write" on public.matches for all
  to authenticated using (true) with check (true);
```
- **Leitura:** Pública (irrestrita, correto para o portal de transparência).
- **Escrita:** `to authenticated using (true) with check (true)`.
  - **Vulnerabilidade de Autorização:** Qualquer usuário autenticado (incluindo um gestor de equipe logado pelo portal da equipe) tem permissão de mutação direta sobre `matches` via API Supabase, podendo alterar placares de outras equipes ou deletar jogos se fizer um request direto à API.

### 8.2. Políticas em `public.competitions`
*Localização:* `20260818000000_initial_schema.sql` (L191 e L199).
- **Escrita:** `to authenticated using (true) with check (true)`.
  - **Vulnerabilidade de Autorização:** Mesma fragilidade. Falta validação de perfil `organizer` ou `admin`.

---

## 9. MATRIZ DE PROBLEMAS E BLOQUEADORES ARQUITETURAIS

| ID | Problema | Severidade | Evidência | Impacto no Novo Engine | Decisão Arquitetural |
|---|---|---|---|---|---|
| **PERSIST-001** | `matches.team_a_id` e `team_b_id` possuem constraint `NOT NULL` e `REFERENCES public.teams(id)`. | **CRITICAL** | `20260818000000_initial_schema.sql:148-149` | Impede fisicamente persistir partidas cujos participantes dependem de fases anteriores (Play-in, Quartas, Semis). | Separar conceitualmente `MatchSlot` de `Match`. Tornar colunas nullable em `matches` ou persistir intenção de confronto em tabela de slots. |
| **PERSIST-002** | `saveDrawWithMatches` executa DELETE $\to$ INSERT $\to$ UPSERT em 3 requisições REST sem transação atômica. | **CRITICAL** | `src/services/dataAccess.ts:1046-1082` | Se a conexão falhar após o DELETE, a competição perde as partidas e o sorteio corrompe. | Criar RPC PostgreSQL transacional (`save_stage_draw_and_slots`) com `BEGIN ... COMMIT` atômico. |
| **PERSIST-003** | `matches.phase` e `group_name` são colunas de texto livre sobrecarregadas com strings variantes. | **HIGH** | `20260819000000:32-33`, `MatchesPage.tsx:389` | Impossibilita identificar fases analiticamente; heurísticas de string quebram chaveamento (`'quartas'`, `'classificatoria'`). | Vincular partidas e slots a `stage_id` e `round_id` estáveis e canônicos. |
| **PERSIST-004** | Inexistência de entidade relacional de Grupo; grupos residem apenas em JSONB monolítico de `draws`. | **HIGH** | `20260819000001_draws.sql:11` | Não há FK para validar a qual grupo uma equipe ou partida pertence. | Modelar grupos dentro da configuração de estágio ou como entidades de runtime do estágio. |
| **PERSIST-005** | `draws` possui unique constraint `(competition_id)`, permitindo apenas um sorteio por torneio. | **HIGH** | `20260819000001_draws.sql:17` | Impede torneios com sorteios separados por fase (ex: grupos seguidos de sorteio de mata-mata). | Permitir sorteio por estágio (`competition_id, stage_id`) ou integrar ao ciclo de estágios. |
| **PERSIST-006** | Código de playoffs gera IDs fictícios como `'TBD-A-1'` violando a integridade referencial. | **CRITICAL** | `playoffsService.ts:221-222` | Quebra no PostgreSQL com erro de FK violation. | Proibir equipes falsas. Usar `ParticipantReference` estruturado e campos `resolved_team_id` nulos até resolução. |
| **PERSIST-007** | Avanço de mata-mata (`advancePlayoffMatches`) possui caminhos de quartas/semis/final fixos no código. | **HIGH** | `playoffsService.ts:275-340` | Impede Play-in, repescagem, formatos com BYEs e torneios de 8 ou 16 equipes. | Substituir por `GenericProgressionEngine` operando sobre `ProgressionRoutes` configuráveis. |
| **PERSIST-008** | RLS de `matches` e `competitions` concede mutação a qualquer usuário autenticado (`using true`). | **MEDIUM** | `20260818000000_initial_schema.sql:199,205` | Permite que usuários com role `team` executem mutações em partidas de terceiros. | Restringir mutação de `matches`, `stages` e `slots` para roles `organizer` e `admin`. |

---

## 10. CONCLUSÃO DA AUDITORIA

O banco de dados atual do BaseOS foi desenhado para um torneio linear simples (1 fase de grupos estática seguida de mata-mata pré-definido no código). Ele **não suporta**, em seu estado físico atual:
1. Partidas com equipes ainda desconhecidas (bloqueio por NOT NULL e Foreign Key).
2. Estágios múltiplos interligados por rotas de avanço.
3. Transações atômicas de geração de chaveamentos e sorteios.
4. Chaveamentos que não sejam o padrão olímpico rígido de 2 ou 4 grupos.

A **Fase 4.5** estabelece o diagnóstico claro desses bloqueadores. Os documentos seguintes definem a arquitetura de persistência capaz de resolver todos esses pontos com elegância, integridade e zero gambiarras.

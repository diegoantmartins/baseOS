# Fase 11 — Auditoria de identidade, organização, participação e contexto

**Data:** 15 de setembro de 2026  
**Escopo:** auditoria somente-leitura da fundação de identidade do BaseOS. Nenhuma migration existente, regra de negócio ou rota foi modificada por este bloco.

## CURRENT

### Inventário do schema e relações atuais

| Domínio | Estado atual | Relação/observação relevante |
| --- | --- | --- |
| Identidade de acesso | `auth.users` + `profiles` | `profiles.id` referencia o usuário Auth e contém `email`, `name`, um único `role` e um único `competition_team_id`. |
| Organização | Não existe tabela `organizations` | `app_settings` contém dados institucionais globais, mas não representa uma organização proprietária de equipes/competições. |
| Equipe | `teams` | Entidade persistente com `id`, nome, sigla, modalidade e dados operacionais. Não possui `organization_id`, categoria/gênero ou constraint de identidade organizacional. |
| Competição | `competitions` | Entidade persistente com regras/configuração, snapshot e lifecycle. Há `organizer_id` opcional introduzido posteriormente, mas não há `organization_id`. |
| Participação da equipe | `competition_teams` | Já é corretamente uma relação `competition_id` ↔ `team_id`; possui prazo, token, lock e status de inscrição. A constraint única `(competition_id, team_id)` já impede dupla inscrição da mesma equipe na mesma competição. |
| Identidade do atleta | Não existe `athletes` | `competition_athletes` armazena nome, documento e nascimento diretamente na participação. Portanto, a mesma pessoa é recriada para cada inscrição. |
| Participação do atleta | `competition_athletes` | Está ligada a `competition_team_id`; camisa, posição, capitão e líbero já estão no contexto correto da competição. |
| Acesso de dirigente | perfil único por vínculo | O profile de equipe tem apenas um `competition_team_id`; o provisionamento grava esse vínculo, substituindo o anterior para o mesmo usuário. |
| Contexto ativo | sessão local/Supabase | `AuthSession.user.competitionTeamId` é o único contexto de equipe. Não há lista de contextos válidos, seleção persistida ou validação por membership. |

### Migrações e compatibilidade já existentes

- A migration inicial cria `competitions`, `teams`, `competition_teams`, `competition_athletes`, `profiles` e `matches`, com deleção em cascata para inscrições/elencos.
- A evolução de lifecycle adicionou regras/snapshot; esta é a fonte que deve continuar a decidir se inscrições e alterações são permitidas.
- A migration de segurança do portal restringe escrita do dirigente comparando `auth.uid()` diretamente com `profiles.competition_team_id`.
- A migration de provisionamento cria/atualiza um único profile `team` com um único `competition_team_id`; é o principal ponto incompatível com múltiplos contextos.
- As views públicas já evitam expor `access_token` e `registration_deadline`, mas as políticas-base ainda dão leitura pública direta às tabelas de inscrição e atletas.

### Aplicação, serviços e fluxos atuais

1. **Adapter de dados.** `src/services/dataAccess.ts` é a porta de dados para os adapters LocalStorage/Supabase e já centraliza a criação/reuso de `TeamRecord` e `CompetitionTeam`. A Fase 11 deve ampliar esse contrato, não introduzir acessos a Supabase em componentes.
2. **Inscrição.** `registerTeamInCompetition` pode reutilizar uma equipe existente (`teamId`) e só cria outra participação quando ela não está naquela competição. Este é um ativo a preservar. No mesmo fluxo, contudo, cria/provisiona o responsável com um `competitionTeamId` único.
3. **Elenco.** `registrationService` impõe prazo, lock, tamanho, camisa opcional única, um capitão e até dois líberos. Esses dados são de participação e devem permanecer em `competition_athletes`.
4. **Atletas administrativos.** `AthletesPage` lista e edita linhas de `competition_athletes`; inclusive permite mover uma linha para outro `competition_team_id`. Hoje isto muda o passado, em vez de registrar uma nova participação.
5. **Portal/onboarding.** A única rota de equipe é pública por token: `/equipe/inscricao/:token`. Não existem `/portal`, `/portal/equipe` ou seletor pós-login. A URL histórica obrigatória deve permanecer funcional.
6. **Rotas e autorização no frontend.** As rotas administrativas usam `RequireAuth` por role; o frontend não deve tornar-se fonte de autorização. O servidor/RLS atual usa o vínculo singular do profile.
7. **Portal público.** `/c/:slug` consome serviços oficiais e as views públicas de competição/equipes; não há necessidade de criar outro pipeline de partidas ou classificação.
8. **Papéis.** O type frontend contém `admin`, `organizer`, `referee`, `scorer`, `team` e `viewer`; o enum inicial do banco foi expandido por migrations. Eles devem ser preservados como compatibilidade enquanto os novos papéis de membership forem introduzidos.

## TARGET

### Modelo alvo proposto

A implementação deve adicionar relações; não recriar identidades existentes.

```text
profiles/auth.users ──< user_memberships >── organizations
                              │                 │
                              │                 ├──< teams
                              │                 └──< competitions
                              │
                              ├── (opcional) competition_id
                              └── (opcional) team_id

teams ──< competition_teams >── competitions
athletes ──< competition_athletes >── competition_teams
```

### Proposta concreta de schema (design; não é migration ainda)

1. **`organizations`** — nova entidade persistente: `id`, `name`, identificadores opcionais, timestamps e status. Deve existir uma estratégia explícita para a organização legada global antes de tornar `organization_id` obrigatório.
2. **`teams`** — acrescentar `organization_id` (FK), `gender_category` e, se o produto precisar de várias equipes na mesma categoria, um `identity_key`/`sequence`. A constraint deve ser decidida antes da migration:
   - se somente uma equipe por organização/categoria for permitida: `UNIQUE (organization_id, gender_category)`;
   - se várias forem permitidas: `UNIQUE (organization_id, gender_category, identity_key)`.
   Nome e sigla nunca serão a chave de identidade.
3. **`competitions`** — acrescentar `organization_id` (FK). `organizer_id` atual é uma atribuição de usuário, não substituto da organização.
4. **`competition_teams`** — preservar ID e finalidade de participação. Manter `UNIQUE (competition_id, team_id)`, token e estado de inscrição. Os campos desnormalizados `team_name`/`team_short_name` precisam de decisão documentada: snapshot histórico intencional ou dados derivados; não devem ser alterados automaticamente ao renomear a equipe sem definir a política histórica.
5. **`athletes`** — nova identidade global: `id`, `normalized_cpf` (único quando não nulo), documento original protegido, nome legal, nascimento, timestamps e possivelmente status. A uniqueness deve usar documento normalizado/sem pontuação e ser parcial para não bloquear atletas sem CPF.
6. **`competition_athletes`** — acrescentar `athlete_id` FK e preservar a linha/ID existente como participação. Gradualmente tornar `athlete_id` obrigatório; manter aqui camisa, posição, capitão, líbero, aprovação/registro e demais dados do torneio. A transferência dentro da mesma competição não será implementada nesta fase.
7. **`user_memberships`** — nova relação imutável/histórica para acesso: `id`, `user_id` (FK `profiles`/`auth.users`), `organization_id`, `competition_id NULL`, `team_id NULL`, `role`, `status`, timestamps e, para o portal, `competition_team_id NULL` enquanto necessário para autorização exata do elenco. A regra de consistência deve garantir que FKs de equipe/competição pertençam à organização e que `competition_team_id` corresponda ao par equipe/competição informado.

### Semântica de membership

- **Status:** `pending`, `active`, `blocked`, `ended`; `ended` preserva auditoria e histórico sem conceder operação.
- **Papel:** separar o papel global legado do perfil do papel contextual. Mapear inicialmente `team` → `TEAM_MANAGER`; reter `admin`, `organizer`, `referee`, `scorer` e `viewer` sem criar um portal de árbitro.
- **Contexto ativo:** objeto de sessão de conveniência, por exemplo `{ membershipId, organizationId, competitionId?, teamId?, competitionTeamId? }`. Ele é selecionado apenas dentre memberships ativos que o backend retorna; não é uma prova de autorização.
- **Autorização:** RLS/RPC deve resolver `auth.uid()` → `user_memberships` ativo → contexto/entidade solicitada. Parâmetros, URL e contexto local nunca podem ampliar esse conjunto.

## GAPS

| Prioridade | Lacuna | Impacto | Área afetada |
| --- | --- | --- | --- |
| Crítica | `profiles.competition_team_id` permite somente um contexto de dirigente. | Um usuário com duas equipes/anos perde ou substitui vínculo anterior. | Auth, provisionamento, RLS, sessão. |
| Crítica | Não há `athletes`; CPF/documento está em `competition_athletes`. | Não há reutilização nem histórico por identidade; atualização/movimentação pode alterar o passado. | Cadastro, inscrição, relatórios, súmulas. |
| Alta | Não há `organizations` nem FKs organizacionais. | Não é possível aplicar identidade de equipe por organização/categoria ou administrar contexto organizacional. | Schema, competições, equipes, RLS. |
| Alta | RLS de equipe depende do perfil singular; políticas-base expõem tabelas operacionais diretamente. | Não satisfaz a regra de acesso por membership e exige revisão cuidadosa de leitura pública. | `competition_teams`, atletas, partidas, profiles. |
| Alta | O fluxo de provisionamento atual atualiza o mesmo profile para um único `competition_team_id`. | Convites e novos torneios podem substituir acesso histórico. | RPC `provision_team_user`, inscrição. |
| Média | `TeamRecord` mistura identidade de equipe com dados de dirigente (`manager*`, senha, token e status). | Dificulta trocar responsável sem alterar a entidade persistente. | Types, cadastro, UI de equipes. |
| Média | `/portal` e o seletor de contexto não existem; a única rota da equipe é onboarding por token. | Não há fluxo para um ou múltiplos acessos persistentes. | App, auth, portal. |
| Média | `AthletesPage` altera `competitionTeamId` de uma participação existente. | Contraria preservação de histórico; não deve ser mantido como transferência na mesma competição. | UI, adapter, RLS. |
| Média | `competition_teams` replica nome/sigla. | Renomear uma equipe pode produzir diferenças entre identidade atual e snapshot de competição. | Registro, relatórios, público. |
| Baixa | `persons` é legado sem tabela relacional oficial. | Pode confundir a modelagem de pessoa/atleta se reutilizado. | PeoplePage, documentos legados. |

## RISKS

1. **Perda silenciosa de acesso:** migrar profiles sem criar memberships equivalentes antes de trocar RLS bloqueará ou ampliará acesso indevidamente.
2. **Quebra dos convites:** `/equipe/inscricao/:token` e a RPC pública de cadastro dependem de `competition_teams.access_token`; o token deve continuar pertencendo à participação, não à equipe global.
3. **Dados pessoais e CPF:** CPF é dado pessoal sensível. Normalização, acesso seletivo, logs e views públicas precisam impedir divulgação. A chave única parcial deve tratar CPF ausente e colidir apenas com valores válidos.
4. **Histórico de nomes:** atualizar `teams.name` pode alterar o que relatórios/súmulas mostram se os campos de snapshot forem removidos sem política de congelamento.
5. **Deleção em cascata:** FKs atuais em `competition_teams` e `competition_athletes` usam cascade. A fase não deve excluir entidades de produção nem tornar possível apagar identidade/histórico por cascade acidental.
6. **Dual-read/dual-write:** durante compatibilidade, `competitionTeamId` e memberships podem divergir. A leitura deve preferir membership quando disponível, com fallback explícito e métrica/auditoria de uso legado.
7. **Modo demo:** LocalStorage deve implementar o mesmo contrato de membership/athlete identity; caso contrário testes e demonstração ocultarão problemas que surgem no Supabase.
8. **RLS regressivo:** substituir políticas de uma vez é um big bang perigoso. Cada nova policy precisa de testes positivos e negativos com usuários distintos, contexto adulterado, competição encerrada e token público.
9. **Papéis históricos:** remover/refatorar o enum de roles pode quebrar perfis e migrations; a extensão/mapeamento é mais segura que remoção.

## MIGRATION PLAN

### Pré-condições e invariantes

- Criar exclusivamente novas migrations datadas; **nunca editar** migrations já aplicadas.
- Não executar reset, deleção ou alteração direta na produção VOLTZ.
- Fazer backup/export verificável e contagens antes/depois para `profiles`, `teams`, `competitions`, `competition_teams`, `competition_athletes`, `matches` e logs relevantes.
- Toda transição deve preservar IDs de `teams`, `competition_teams` e `competition_athletes`; as novas tabelas ganham IDs próprios e FKs de mapeamento.
- Manter `competitionTeamId` temporariamente apenas como bridge de leitura/compatibilidade, marcado deprecado e sem novas dependências arquiteturais.

### 11.1 — Schema aditivo (Checkpoint humano A)

**Implementação criada neste checkpoint:** `supabase/migrations/20260915000001_phase_11_identity_foundation.sql`. Ela é estritamente aditiva: cria as tabelas-base, FKs nullable, índices e RLS sem policies; não faz backfill, não remove o bridge legado e não modifica fluxos em runtime.

1. Criar enums/tabelas novos (`organizations`, `user_memberships`, `athletes`) e índices sem remover colunas antigas.
2. Adicionar FKs nullable aditivas a `teams.organization_id`, `competitions.organization_id` e `competition_athletes.athlete_id`.
3. Criar constraints de consistência e índice de CPF normalizado após limpeza/validação de dados, não antes.
4. Documentar em migration comments a política para nome/sigla snapshot em `competition_teams`.
5. Verificar schema, FKs, índices e rollback lógico antes de qualquer serviço/UI.

### 11.2 — Backfill determinístico e validação

1. Criar a organização legada para cada escopo identificado e associar equipes/competições com um relatório de IDs afetados.
2. Para cada `competition_athletes` existente, criar/encontrar `athletes` por CPF normalizado quando válido; onde não houver CPF, gerar identidade distinta e marcar para reconciliação, sem mesclar por nome.
3. Preencher `competition_athletes.athlete_id` e emitir relatório de duplicidades/conflitos de CPF para decisão humana.
4. Para cada profile, criar membership legado ativo que reproduza exatamente `competition_team_id` atual; manter memberships administrativas separadas conforme papel atual.
5. Validar as provas de mapeamento: profile → mesma identidade; team → mesmo ID; competition_team → mesma participação; competition_athlete → mesma participação com nova FK de identidade.

### 11.3 — Serviços, adapters e testes (Checkpoint humano B/C/D)

1. Estender `dataAccess` com operações de organização, atleta global, busca de atleta por CPF normalizado e memberships/contextos; implementar paridade LocalStorage/Supabase.
2. Introduzir `IdentityService`, `MembershipService` e `ContextService` como serviços de domínio, mantendo regras de inscrição em `registrationService`.
3. Alterar cadastro de atleta para pesquisar/reusar identidade por CPF e criar uma **nova** `competition_athlete`; proibir o fluxo de “mover” participação histórica.
4. Alterar provisionamento/convites: localizar identidade por email e criar `pending`/`active` membership, sem sobrescrever vínculo prévio.
5. Criar testes unitários para os nove cenários obrigatórios do plano, além de falhas de CPF, membership bloqueada/encerrada e compatibilidade de token.

### 11.4 — Contexto e portal (Checkpoint humano E)

1. Carregar memberships após login e calcular apenas contextos `active` autorizados.
2. Um contexto válido deve seguir automaticamente ao portal adequado; vários devem renderizar seletor; nenhum deve informar estado/contato seguro, nunca aceitar ID arbitrário.
3. Adicionar `/portal` e `/portal/equipe` sem remover `/equipe/inscricao/:token` (e manter alias se `/equipe/:token` for adotado/descoberto).
4. Adaptar guards de UI como ergonomia, mas conservar autorização definitiva no banco/RPC.

### 11.5 — RLS, RPCs e hardening (Checkpoint humano F)

1. Criar políticas aditivas baseadas em memberships e funções auxiliares `SECURITY DEFINER` com `search_path` seguro quando apropriado.
2. Primeiro cobrir `user_memberships`, depois participação/equipes/elencos/matches; separar leitura operacional privada da leitura pública por views mínimas.
3. Migrar RPCs de inscrição/provisionamento para validar ownership e lifecycle pelo novo modelo.
4. Executar matriz de autorização para admin, organizer, team manager, blocked, ended, pending, usuário sem vínculo e anon; testar adulteração de URL, query, payload e active context.
5. Só remover políticas/bridge antiga após telemetria e validação de que todos os usuários ativos têm memberships correspondentes.

### 11.6 — Regressão e encerramento

- Rodar typecheck, ESLint, Vitest e build após cada checkpoint.
- Validar partidas, standings, sorteio, relatórios, súmulas, QR/favoritos e portal público com a mesma fonte oficial de `matches`/`standings`.
- Confirmar que competição `completed` preserva dados; finalizar memberships operacionais somente por regra explícita, sem apagar registros.
- Não remover `profiles.competition_team_id`, campos legados ou policies antigas até migração, testes de acesso e revisão humana concluídos.

## Matriz mínima de aceitação para a próxima fase

| Cenário | Evidência exigida |
| --- | --- |
| Um dirigente/um contexto | Login entra no portal correto sem seletor. |
| Um dirigente/dois contextos | Login mostra ambos e troca apenas entre memberships ativas. |
| Mesmo time em dois anos | Um `teams.id`, dois `competition_teams.id`, histórico intacto. |
| Responsável trocado | Mesmo `team.id`; memberships distintas por competição/período. |
| Masculino/feminino/misto | Equipes distintas conforme constraint organizacional aprovada. |
| CPF existente | Mesmo `athletes.id`, nova participação no elenco solicitado. |
| Atleta em equipes/anos diferentes | Participações anteriores não são mutadas. |
| Encerramento | Dados permanecem; acesso operacional obedece status da membership/lifecycle. |
| Segurança | Usuário de Team A não lê/escreve Team B ao adulterar URL, payload, query ou contexto. |
| Público e convite | `/c/:slug` e `/equipe/inscricao/:token` continuam funcionais sem duplicar regras/resultados. |

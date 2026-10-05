# BASEOS — AUDITORIA FORENSE DE FRONTEND
## Construtor de Fases, Draw Arena e Isolamento Multi-Tenant

- **Projeto:** BaseOS Workspace (VolleyPro)
- **Data da Auditoria:** 2026-10-04
- **Papel:** Principal Frontend Architect + Especialista em React/Next.js + Security QA
- **Ambiente:** DEV / Laboratório Local (Modo Estrito: Somente Leitura)
- **Status da Validação:** AUDITORIA TÉCNICA CONCLUÍDA — DÉBITOS E VULNERABILIDADES IDENTIFICADOS COM PRECISÃO DE CÓDIGO

---

## SUMÁRIO EXECUTIVO

Esta auditoria forense analisou a fundo o ecossistema frontend da aplicação (`React 18 + TypeScript + Vite + React Router v6 + TanStack Query`), com ênfase em três pilares operacionais essenciais para a escala SaaS Multi-tenant:

1. **UX de Criação e Motor de Fases (Construtor):** O estado da arte entre a interface de criação/edição e o motor genérico (`CompetitionConfig` / DAG de Estágios).
2. **Draw Arena (Motor de Sorteio):** A robustez do algoritmo de sorteio (Tabela de Berger), a apresentação visual 3D/broadcast e o comportamento diante de estruturas esportivas não-convencionais (ex: 7 grupos de 3 equipes).
3. **Roteamento e Gatekeeper (Isolamento Multi-Tenant):** A eficácia dos Guards de rota, a consistência dos redirecionadores e a existência de vazamentos de escopo (IDOR / BOLA) entre diferentes organizações/clientes.

A auditoria identificou débitos arquiteturais graves, bifurcação de tipos no construtor de fases, hardcodes impeditivos na Draw Arena e **brechas críticas de isolamento multi-tenant** em que qualquer usuário com perfil de organizador pode acessar, alterar regras e manipular torneios e organizações alheias.

---

## 1. ESCOPO 1: UX DE CRIAÇÃO E MOTOR DE FASES (CONSTRUTOR)

### 1.1 Diagnóstico do Fluxo de Criação: Seletores Engessados vs. Linha do Tempo Vertical

A interface do BaseOS apresenta uma **bifurcação arquitetural** entre dois subsistemas de construção de fases:

1. **Construtor Primário de Criação (`CompetitionFormDialog.tsx`):**
   - **Localização:** `src/components/competition/dialogs/CompetitionFormDialog.tsx:479-485`
   - O diálogo de nova competição utiliza o componente `<CompetitionStageBuilder>` dentro da aba "Disputa".
   - **Interface Visual:** O componente implementa visualmente uma linha do tempo vertical com cards empilhados (`CompetitionStageBuilder.tsx:224-390`).
   - **Débito:** Embora visualmente pareça flexível, o formulário inicializa com listas rígidas hardcoded:
     - `CompetitionFormDialog.tsx:25-45`: `DEFAULT_INDOOR_STAGES` (Fase de Grupos [8 equipes, 2 grupos, avançam 4] -> Eliminatória Ouro [4 equipes]).
     - `CompetitionFormDialog.tsx:47-67`: `DEFAULT_BEACH_STAGES` (Fase Preliminar [4 equipes, 1 grupo, avançam 2] -> Final [2 equipes]).
   - **Ausência de Templates:** O fluxo de criação primário **NÃO** expõe os modelos pré-aprovados do `CompetitionTemplateService` (`round-robin-standard`, `groups-play-in-knockout-standard`, `double-elimination-standard`). O usuário começa preso a um modelo estático de 2 fases.

2. **Construtor Secundário de Edição Avançada (`CompetitionFormatBuilder.tsx`):**
   - **Localização:** `src/components/competition/format-builder/CompetitionFormatBuilder.tsx:221-255`
   - Utiliza `<FormatTemplateSelector>` (cards com presets) e `<StageBuilder>`.
   - **Problema de UX:** Este construtor avançado só pode ser aberto como um modal secundário a partir da aba "Configurações" (`CompetitionConfigTab.tsx:43-47`) **apenas após** a competição ter sido criada e salva no banco. Não há como criar um campeonato do zero usando a estrutura de templates avançada.

---

### 1.2 Matriz de Débito: Tipagem Duplicada e Payloads Híbridos

Existe uma grave quebra de abstração entre os contratos de tipo da aplicação:

| Arquivo | Linhas | Problema Detectado | Impacto no Motor Genérico |
| :--- | :--- | :--- | :--- |
| `src/components/competition/format-builder/StageDialog.tsx` | **22–31** | Declaração de tipo paralelo `StageDefinition`: `{ id, order, name, type: 'round-robin' \| 'knockout' \| 'custom', participantsCount, participantsOrigin, groupsCount, advancingCount }`. | **Não é compatível** com o `StageDefinition` canônico de `@/types/competitionConfig.ts`. Não suporta `groupConfig`, `eliminationConfig`, `pairingConfig`, `participantFeeds`, `rounds`, nem `dependsOnStageIds`. |
| `src/components/competition/format-builder/CompetitionStageBuilder.tsx` | **18, 30–55** | Importa a tipagem simplificada de `StageDialog.tsx` em vez do domínio canônico. | Componente opera sobre um subconjunto restrito de dados esportivos. |
| `src/components/competition/dialogs/CompetitionFormDialog.tsx` | **183–192** | Derivação rasa do formato macro (`derivedFormat`): se houver qualquer round-robin e knockout, assume `'groups-knockout'`. | Formatos multi-estágio (como Grupos -> Play-In -> Knockout ou Repescagem Dupla) são simplificados para strings legadas. |
| `src/components/competition/dialogs/CompetitionFormDialog.tsx` | **194–198** | Extração exclusiva da primeira fase de grupos: `stages.find(s => s.type === 'round-robin')`. | Se o torneio possuir duas fases de grupos sucessivas ou grupos secundários (ex: Série Ouro e Série Prata), apenas a primeira é considerada para preencher `resolvedGroupsCount` e `resolvedAdvancingPerGroup`. |
| `src/components/competition/dialogs/CompetitionFormDialog.tsx` | **208–232** | Converte manualmente `StageDefinition` local em `CanonicalStageDefinition`. Hardcoda `rounds: 'single'`, `seriesType: 'single-match'` e `hasThirdPlaceMatch: false`. | Impossibilita criar turnos e returnos (`rounds: 'double'`), séries melhor de 3 jogos ou disputas de 3º lugar via interface inicial. |
| `src/components/competition/dialogs/CompetitionFormDialog.tsx` | **280–284** | Hardcode forçado de supressão de melhores terceiros: `bestThirds: { enabled: false, count: 0 }`. | Torneios com 3 grupos de 4 equipes onde os 2 melhores terceiros avançam às quartas de final têm a regra **bloqueada** na criação. |
| `src/components/competition/dialogs/CompetitionFormDialog.tsx` | **300–329** | Envio de payload híbrido para `onSubmit(baseRecord)`. Envia tanto `config: canonicalConfig` quanto colunas legadas planas: `format`, `setFormat`, `playerFormat`, `groupsCount`, `advancingPerGroup`, `bestThirdsCount`, `phaseSetRules`. | O backend e o `dataAccess` continuam recebendo dados desnormalizados que podem divergir do JSON `config`. |
| `src/components/competition/tabs/CompetitionConfigTab.tsx` | **34** | Declara `const stages = selected.config?.format?.stages || [];`. | A variável `stages` **nunca é renderizada** na interface da aba. O DAG de fases é completamente ignorado na visualização do torneio. |
| `src/components/competition/tabs/CompetitionConfigTab.tsx` | **80–98** | Renderiza um grid rígido de 4 fases estáticas: "Grupos" (`fase_grupos`), "Quartas" (`quartas`), "Semifinais" (`semifinal`) e "Final" (`final`). | Torneios com repescagem, oitavas, play-in ou 2 fases de grupos exibem dados distorcidos ou vazios. |
| `src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx` | **26–60, 110–134** | Edição de regras assume exclusivamente as 4 fases fixas: `groupStage`, `playoffs`, `semifinals`, `final`. | A edição não permite alterar o grafo de estágios nem fases personalizadas; apenas sobrescreve as 4 fases legadas. |
| `src/components/competition/format-builder/RulesConfigEditor.tsx` | **96–120** | Componente de regras esportivas hardcoda os seletores de sobrescrita para `quarterfinals`, `semifinals`, `final` e `thirdPlace`. | Não permite associar formatos de sets a nós dinâmicos do grafo (`stageId`). |

---

## 2. ESCOPO 2: DRAW ARENA (MOTOR DE SORTEIO)

### 2.1 Análise do Algoritmo de Sorteio (Tabela de Berger)

O algoritmo matemático do sorteio reside em `src/services/drawService.ts`:
- **Geração de Confrontos (`generateGroupRoundRobin`, linhas 120–141):** Implementa o método canônico do círculo (Tabela de Berger). Quando o número de equipes $n$ é ímpar, insere a sentinela `'__BYE__'`, gerando $m = n + 1$ slots e $m - 1$ rodadas. As partidas contra `'__BYE__'` são filtradas. O algoritmo em si é matematicamente robusto para grupos ímpares e pares.
- **Distribuição em Grupos (`distributeTeamsIntoGroups`, linhas 63–113):** Utiliza um PRNG determinístico (`mulberry32`) com balanceamento guloso de capacidade (`buildBalancedCapacities`). Distribui corretamente cabeças de chave e sorteia o restante.

---

### 2.2 Ponto de Falha e Nível de Acoplamento da Draw Arena

Apesar da correção do motor matemático, a **Interface do Usuário (HUD, Canvas 3D e Fallback)** possui acoplamentos severos que entram em colapso com formatos não-convencionais:

#### Cenário de Teste Forense: 7 Grupos de 3 Equipes (21 equipes no total)

```text
Entrada: 21 Equipes | 7 Grupos (A, B, C, D, E, F, G) | 3 Equipes por Grupo
```

Abaixo estão as linhas exatas onde a interface quebra ou apresenta comportamento anômalo:

#### A. Falhas no Componente `src/pages/DrawPage.tsx`
1. **Linha 554 — Limite Hardcoded de 8 Grupos no `<Select>`:**
   ```tsx
   Array.from({ length: Math.max(1, Math.min(8, registeredTeams.length)) }, (_, i) => i + 1)
   ```
   - O seletor de número de grupos corta rigidamente em `8`. Se um campeonato no `CompetitionConfig` exigir 9 ou mais grupos (ex: 12 grupos de 3 em torneios abertos de grande porte), o seletor não permite a seleção e não possui `<SelectItem>` correspondente, resultando em tela desconfigurada ou valor vazio.
2. **Linha 200–204 e Linha 731 — Suposição de Grupos de Tamanho Perfeitamente Uniforme:**
   ```tsx
   const perGroup = Math.ceil(registeredTeams.length / groupsCount);
   return roundRobinMatchCount(perGroup) * Math.min(groupsCount, registeredTeams.length);
   ```
   - Calcula a quantidade de jogos assumindo que todos os grupos têm `Math.ceil(...)` equipes. Em formatos com grupos desiguais (ex: 10 equipes em 3 grupos: 4, 3, 3), o cálculo assume 3 grupos de 4 equipes (6 partidas cada = 18 jogos), quando o correto seriam $6 + 3 + 3 = 12$ jogos.
3. **Linha 312 — Agendamento Cíclico Hardcoded:**
   ```tsx
   const hour = 9 + (idx % 8);
   ```
   - As 21 partidas de 7 grupos recebem horários repetidos entre 09:00 e 16:00 do mesmo dia no mesmo ginásio, sem checagem de quadras nem intervalos de descanso.

#### B. Falhas Críticas no Componente `src/components/draw/cinematic/DrawArenaHUD.tsx`
1. **Linhas 146–158 — Divisão Bipartida Rígida (Alas Esquerda/Direita):**
   ```tsx
   const mid = Math.ceil(arenaCards.length / 2);
   return { leftGroups: arenaCards.slice(0, mid), rightGroups: arenaCards.slice(mid) };
   ```
   - Com 7 grupos, `leftGroups` recebe 4 grupos (A, B, C, D) e `rightGroups` recebe 3 grupos (E, F, G).
2. **Linhas 243 e 525 — Overflow Vertical e Clipping de Tela Sem Scroll:**
   ```tsx
   <aside className="pointer-events-auto hidden lg:flex flex-col justify-center gap-4 w-64 xl:w-72 shrink-0 z-10">
   ```
   - **Vulnerabilidade de UI:** As tags `<aside>` **NÃO POSSUEM `overflow-y-auto` NEM `max-h`**.
   - Cada card de grupo com 3 equipes mede aproximadamente 160px de altura. Quatro cards com espaçamento `gap-4` demandam $4 \times 160\text{px} + 3 \times 16\text{px} = 688\text{px}$.
   - Em monitores Full HD (1080p) e laptops (768p), o espaço vertical disponível entre a Top Bar (65px) e o Dock de Produção (90px) é de aproximadamente 600px.
   - **Efeito:** Os cards dos Grupos C e D sofrem corte vertical absoluto (clipping), vazando para fora da viewport. As equipes alocadas nesses grupos ficam **invisíveis** para a transmissão e para o operador.
3. **Linhas 350–394 — Grid Fixo de Apoteose no Estado `COMPLETE`:**
   ```tsx
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 max-h-[46vh] overflow-y-auto pr-1">
   ```
   - O grid final assume 4 colunas estáticas. Em 7 grupos, a segunda linha exibe 3 cards assimétricos com scroll vertical comprimido em 46vh.

#### C. Quebras Graves no Fallback 3D / CSS (`src/components/draw/DrawScene3D.tsx`)
Quando o cliente não possui aceleração WebGL, a aplicação ativa o `DrawScene3D.tsx`:
1. **Linhas 122–124 — Descarte Arbitrário de Equipes na Urna:**
   ```tsx
   const urnTeams = useMemo(() => {
     return result.groups.flatMap(group => group.teams).slice(0, 18);
   }, [result.groups]);
   ```
   - **BUG CRÍTICO:** O componente faz `.slice(0, 18)`. Em um torneio com 21 equipes (7 grupos de 3), **3 equipes simplesmente não aparecem na urna**!
2. **Linhas 38–47 — Disposição Circular Hardcoded:**
   ```tsx
   const angle = (index / 12) * Math.PI * 2;
   ```
   - O cálculo trigonométrico da posição das bolas divide rigidamente por 12.
3. **Linha 246 — Grid Fixo de Grupos em 2 Colunas Sem Scroll:**
   ```tsx
   <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
   ```
   - Em 7 grupos, renderiza 4 linhas de cards sobre o palco central, cobrindo o grafismo da urna.
4. **Linha 302 — Animação com Coordenadas Restritas a 3 Grupos:**
   ```tsx
   animate={{
     x: currentTargetGroupIndex === 0 ? -180 : currentTargetGroupIndex === 1 ? 0 : currentTargetGroupIndex === 2 ? 180 : 0,
     y: 180,
     scale: [1, 1.08, 1],
   }}
   ```
   - **FALHA DE ANIMAÇÃO:** O cálculo de translação X possui apenas 3 posições: Grupo 0 (-180px), Grupo 1 (0px) e Grupo 2 (180px).
   - Para os Grupos 3, 4, 5 e 6 (Grupos D, E, F e G), a coordenada cai no fallback `0` (centro).
   - **Efeito Visual:** As equipes dos Grupos D, E, F e G animam para o centro da tela, colidindo visualmente com o Grupo B (índice 1).

---

## 3. ESCOPO 3: ROTEAMENTO E GATEKEEPER (ISOLAMENTO MULTI-TENANT)

### 3.1 Mecanismo de Decisão de Redirecionamento Inicial

O fluxo de decisão de rota do usuário autenticado ocorre prioritariamente no componente `RootRedirector.tsx` (rota `/`):

```text
[Usuário acessa '/']
        │
        ├── Não autenticado? ──► Renderiza <PublicPortal /> (PublicCompetitionPage / Jogos)
        │
        └── Autenticado? ──► Carrega user_memberships (dataAccess.listUserMemberships)
                 │
                 ├── Possui membership 'admin' ou 'organizer'?
                 │   OU session.user.role in ['admin', 'organizer']
                 │         │
                 │         └──► SIM ──► Redireciona para '/dashboard' (RootRedirector:80)
                 │
                 ├── Possui apenas memberships 'team_manager' ou 'athlete'?
                 │   OU session.user.role === 'team' (legado sem memberships)
                 │         │
                 │         └──► SIM ──► Redireciona para '/portal/equipe' (RootRedirector:96)
                 │
                 ├── Possui role 'referee' ou 'scorer'?
                 │         │
                 │         └──► SIM ──► Redireciona para '/jogos' (RootRedirector:106)
                 │
                 └── Sem vínculos (fã/viewer) ──► Renderiza <PublicPortal /> (RootRedirector:111)
```

---

### 3.2 Vulnerabilidade de Vazamento de Escopo (IDOR / BOLA Cross-Tenant)

> **DIAGNÓSTICO FORENSE**: **SIM, EXISTE VAZAMENTO DE ESCOPO SISTÊMICO.**
> Qualquer usuário autenticado com perfil `organizer` pode visualizar, alterar regras, realizar sorteios e modificar membros de competições pertencentes a outras organizações e tenants simplesmente manipulando os identificadores na URL.

#### Evidências Técnicas Irrefutáveis no Código-Fonte:

1. **Camada de Dados sem Cláusula de Tenant (`dataAccess.ts`):**
   - **LocalStorage (`dataAccess.ts:399-410`):**
     `listCompetitions()` lê a coleção inteira sem qualquer filtro por `organization_id`. `getCompetition(id)` busca o ID globalmente.
   - **Supabase (`dataAccess.ts:2338-2356`):**
     ```typescript
     const { data, error } = await supabase.from(SUPABASE_TABLES.competitions).select('*');
     ```
     Não há `.eq('organization_id', activeOrgId)`. O `getActiveOrganizationId()` (`dataAccess.ts:562, 2533`) lê uma chave no `localStorage`, mas essa chave **nunca é utilizada para filtrar as queries de competições, equipes, partidas ou atletas**.
   - As queries retornam os registros de **todos os clientes cadastrados**.

2. **Manipulação de Parâmetros em Competições (`CompetitionsPage.tsx`):**
   - **Linhas 110, 151–171:** A página lê `searchParams.get('competitionId')`. O helper `resolveActiveCompetition` busca o ID dentro do array global retornado por `listCompetitions()`.
   - **Linhas 448–464 (`handleUpdateConfig`):** Se um organizador do Tenant A digitar `?competitionId=comp-tenant-b`, a página carrega os dados do Tenant B. Ao editar regras ou configurações, o salvamento é executado diretamente em `dataAccess.updateCompetition(selected.id, updates)` sem validar se `selected.organizationId === user.organizationId`.

3. **Manipulação de Parâmetros no Sorteio (`DrawPage.tsx`):**
   - **Linhas 76, 238, 329, 355:** O sorteio aceita `/sorteio/:competitionId`. Se o organizador passar o ID de uma competição de outro cliente, o sorteio é executado, os confrontos são gerados e o ciclo de vida do torneio alheio é avançado no banco via `CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw`.

4. **Manipulação de Organizações e Membros (`OrganizationDetailPage.tsx`):**
   - **Linhas 101–127:** A rota `/organizacoes/:organizationId` permite carregar qualquer organização do banco.
   - **Vulnerabilidade em `TenantSecurityService.ts:348, 370`:**
     ```typescript
     public static canViewOrganization(user, organizationId, memberships): boolean {
       if (user.role === 'admin' || user.role === 'organizer') return true; // <-- FALHA GRAVE
       ...
     }
     public static canManageOrganizationMembers(user, organizationId, memberships): boolean {
       if (user.role === 'admin' || user.role === 'organizer') return true; // <-- FALHA GRAVE
       ...
     }
     ```
     **A regra de negócio considera qualquer `organizer` como superusuário global.** Um organizador da "Liga Municipal de Vôlei X" tem permissão para visualizar membros, enviar convites, alterar papéis e excluir recursos da "Federação Esportiva Y".

5. **Bypass e Abandono de `validateTenantAccess`:**
   - Em `src/services/tenantSecurityService.ts:165-173`:
     ```typescript
     public static validateTenantAccess<T extends { organizationId?: string }>(tenant, resource): boolean {
       if (!resource.organizationId) return true; // Bypass silencioso se o campo for nulo
       return resource.organizationId === tenant.organizationId;
     }
     ```
   - O método `validateTenantAccess` **nunca é chamado em nenhum componente, hook ou guard da aplicação**. Ele é executado exclusivamente em arquivos de teste unitário (`src/test/tenantSecurity.test.ts:188`).

---

### 3.3 Falhas nas Lógicas de Redirecionamento (Checagens Frágeis)

A auditoria identificou 5 incoerências e fragilidades nas lógicas de redirecionamento:

| Componente | Linhas | Fragilidade Identificada | Risco Operacional |
| :--- | :--- | :--- | :--- |
| `src/components/portal/PortalRouter.tsx` | **22–27** | Checagem: `if (role === 'team' && !session.user.competitionTeamId) return <Navigate to="/login" replace />;` | **Expulsão indevida de usuários:** Usuários modernos da Fase 11 com múltiplas memberships em `user_memberships` que não possuem o atributo legado `competitionTeamId` no perfil raiz são deslogados e redirecionados para a tela de login ao acessar `/portal`. |
| `src/components/auth/TeamContextRedirector.tsx` | **36–39** | Redireciona administradores e organizadores para `/competicoes-ativas`. | **Inconsistência de destino:** `RootRedirector.tsx:81` e `PortalRouter.tsx:30` direcionam admin/organizer para `/dashboard`. Dependendo do link clicado, o usuário cai em telas diferentes. |
| `src/components/auth/TeamContextRedirector.tsx` | **64–66, 89–91** | Redireciona o representante de equipe para `/equipe/:token` (que renderiza `TeamRosterRegistrationPage.tsx` — cadastro de camisas/elenco). | **Bifurcação de rotas da equipe:** O portal completo da equipe fica em `/portal/equipe` (`TeamPortalPage.tsx`), enquanto `/equipe` envia para o formulário de inscrição por token. Os fluxos não convergem. |
| `src/components/auth/RequireAuth.tsx` | **29–37** | `RequireAuth` valida apenas `hasRole(roles)` baseado na string global `session.user.role`. Em caso de falha de permissão, redireciona organizadores para `/competicoes-ativas`. | Não avalia a organização ativa nem as permissões no tenant específico. Não gera página ou feedback HTTP 403 (Acesso Negado). |
| `src/App.tsx` | **151–340** | As rotas de gestão (`/competicoes/:id/inscricoes`, `/sorteio/:competitionId`, `/organizacoes/:organizationId`, `/sumulas/:matchId`, `/documentos/editor/:matchId`) utilizam apenas `<RequireAuth roles={['organizer']}>`. | **Ausência total de TenantGuard nas rotas:** Nenhuma rota com parâmetros de ID (`:id`, `:organizationId`, `:matchId`) valida se o recurso pertence à organização do usuário autenticado. |

---

## 4. PLANO DE REFATORAÇÃO E PLUGAGEM NO MOTOR GENÉRICO

Para sanar os débitos técnicos auditados e permitir que a interface funcione como um verdadeiro SaaS Multi-tenant alimentado pelo Motor Genérico (`CompetitionConfig`), recomenda-se o seguinte plano estruturado em 3 fases:

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           PLANO DE REFATORAÇÃO FRONTEND                        │
├─────────────────────────┬──────────────────────────┬───────────────────────────┤
│ FASE A: CONSTRUTOR      │ FASE B: DRAW ARENA       │ FASE C: MULTI-TENANT      │
├─────────────────────────┼──────────────────────────┼───────────────────────────┤
│ • Unificar StageDefinition│ • HUD responsivo (scroll)│ • Criar TenantGuard       │
│ • Integrar Templates    │ • Eliminar limite de 8   │ • Scoping no dataAccess   │
│ • Eliminar campos planos│ • Generalizar coordenadas│ • Saneamento de RBAC      │
│ • Exibir DAG no ConfigTab│ • Suporte a N grupos    │ • Unificar /portal/equipe │
└─────────────────────────┴──────────────────────────┴───────────────────────────┘
```

### Fase A: Unificação do Construtor de Competições no `CompetitionConfig` Declarativo
1. **Extinção da Tipagem Duplicada:**
   - Remover a interface local de `StageDefinition` em `src/components/competition/format-builder/StageDialog.tsx:22-31`.
   - Adotar exclusivamente `StageDefinition` importada de `@/types/competitionConfig.ts` em todo o ecossistema de format-builder.
2. **Integração de Modelos no Formulário Inicial:**
   - Incorporar o `<FormatTemplateSelector>` diretamente na Aba 2 ("Disputa") do `CompetitionFormDialog.tsx`.
   - Permitir que o organizador inicie a competição selecionando um template homologado (`round-robin`, `groups-knockout`, `groups-play-in-knockout`, `double-elimination`) ou monte seu DAG personalizado.
3. **Eliminação de Campos Planos Redundantes:**
   - Refatorar `CompetitionFormDialog.tsx:300-330` para gerar e persistir unicamente o payload canônico `config: CompetitionConfig`.
   - Delegar a criação de campos legados exclusivamente aos mappers de compatibilidade do backend/adaptador, sem intervenção do formulário.
4. **Visualização Dinâmica de Fases em `CompetitionConfigTab.tsx`:**
   - Substituir o grid estático de 4 fases (`fase_grupos`, `quartas`, `semifinal`, `final`) em `CompetitionConfigTab.tsx:80-98` pela renderização interativa do array `selected.config.format.stages`, exibindo a linha do tempo real do torneio.

### Fase B: Desacoplamento e Responsividade Dinâmica da Draw Arena
1. **Sanar o HUD de Transmissão (`DrawArenaHUD.tsx`):**
   - Adicionar classes de scroll e contenção de altura nas alas laterais (`aside` em `DrawArenaHUD.tsx:243, 525`):
     `max-h-[calc(100vh-180px)] overflow-y-auto pr-1 scrollbar-thin`.
   - Permitir visualização paginada ou sanfonada quando a quantidade de grupos for superior a 4 por ala.
2. **Remover Limitações Hardcoded no `DrawPage.tsx`:**
   - Alterar `DrawPage.tsx:554` para calcular as opções de grupos dinamicamente com base nas equipes elegíveis e na configuração do estágio do campeonato, sem o teto arbitrário `Math.min(8, ...)`.
   - Corrigir o cálculo de partidas em `DrawPage.tsx:200-204` para somar o número de confrontos reais por grupo: `groups.reduce((acc, g) => acc + roundRobinMatchCount(g.teams.length), 0)`.
3. **Generalização do Fallback `DrawScene3D.tsx`:**
   - Remover o `.slice(0, 18)` em `DrawScene3D.tsx:123`, garantindo que todas as equipes participantes apareçam na urna visual.
   - Refatorar o cálculo de interpolação em `DrawScene3D.tsx:302` para calcular dinamicamente a posição X do card com base na posição percentual do grupo no grid (`(targetIndex / totalGroups) * span - offset`), eliminando o switch estático restrito a 3 grupos.

### Fase C: Blindagem Multi-Tenant e Isolamento Seguro de Roteamento
1. **Criação do Componente `TenantRouteGuard`:**
   - Criar um Guard de rota (`src/components/routing/TenantRouteGuard.tsx`) que intercepta rotas parametrizadas (`:competitionId`, `:organizationId`, `:matchId`).
   - O guard deve verificar se o recurso requisitado pertence à `currentOrganizationId` do `TenantContext` ou às memberships ativas do usuário. Caso pertença a outro tenant, emitir erro 403 e redirecionar para `/dashboard`.
2. **Injeção de Tenant Scoping no `dataAccess.ts`:**
   - Modificar os métodos de consulta (`listCompetitions`, `listTeams`, `listMatches`, `listVenues`) em `dataAccess.ts` para aplicar obrigatoriamente o filtro do tenant ativo (`where organization_id = activeOrgId`), a menos que o usuário seja `isPlatformAdmin` navegando em modo global.
3. **Saneamento das Permissões em `TenantSecurityService.ts`:**
   - Revogar o privilégio global concedido a `organizer` em `TenantSecurityService.ts:348, 370`.
   - Um usuário com papel de organizador só deve poder visualizar e gerenciar organizações e competições **nas quais possua membership ativa associada**.
4. **Harmonização do Roteamento de Entrada:**
   - Corrigir `PortalRouter.tsx:23` para não ejetar usuários sem `session.user.competitionTeamId`, delegando a resolução de equipes ao `TeamContextService.getUserAvailableTeams`.
   - Padronizar os redirecionamentos de administradores e organizadores para a rota canônica `/dashboard`.

---

## 5. CONCLUSÃO TÉCNICA E MATRIZ DE APROVAÇÃO

| Domínio Auditado | Situação Atual | Criticidade | Status para SaaS Multi-Tenant |
| :--- | :--- | :---: | :---: |
| **UX do Construtor de Competições** | Bifurcado: timeline simplificada na criação e templates avançados restritos à pós-criação. Payloads híbridos. | **MÉDIA-ALTA** | **Requer Refatoração** |
| **Draw Arena (Engine & HUD)** | Algoritmo Berger correto. HUD e Fallback quebram visualmente e funcionalmente com mais de 4 grupos ou formatos não-convencionais. | **ALTA** | **Requer Correção de Layout/Animação** |
| **Isolamento Multi-Tenant & Guards** | Ausência de scoping em queries. Vazamento de escopo via manipulação de ID na URL (IDOR). Permissões globais excessivas para organizadores. | **CRÍTICA (P0)** | **BLOQUEADO PARA PRODUÇÃO MULTI-TENANT** |

A arquitetura do BaseOS possui uma excelente fundação matemática e canônica em seus serviços de domínio (`competitionRulesService`, `genericPairingEngine`, `competitionLifecycleService`). No entanto, a camada de apresentação frontend ainda carrega fortes resquícios de desenvolvimento mono-tenant e formulários legados. A execução das correções mapeadas neste relatório é pré-requisito mandatório antes do provisionamento de clientes reais na plataforma.

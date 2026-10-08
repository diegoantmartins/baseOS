# BASEOS — AUDITORIA DE PRODUÇÃO CONTROLADA

**Data:** 08 de Outubro de 2026  
**Ambiente Oficial:** PRODUÇÃO (`https://www.baseos.online/`)  
**Backend:** VPS Contabo `vmi3488325` (`169.58.129.187`) / `https://flow.baseos.online`  
**Host do Banco:** Container `supabase_db_baseOs-voltz` (PostgreSQL 17.6)  
**Release Auditada:** Git Commit canônico `04e196ae66ace63b2070dd24f56137ea3fe57f66` (v2.5.0)  
**Status da Auditoria:** Concluída (Execução 100% Somente Leitura)

---

## 1. Resumo Executivo

Esta auditoria de produção controlada inspecionou a totalidade da cadeia de entrada e operação do **BaseOS**:
```text
https://www.baseos.online/
          ↓
        LOGIN
          ↓
       USUÁRIO
          ↓
     ORGANIZAÇÃO
          ↓
   TENANT CONTEXT
          ↓
     ÁREA DA BASE
          ↓
   CRIAR COMPETIÇÃO
```

### Principais Conclusões:
1. **Organização Real Encontrada:** A base cadastrada recentemente pelo administrador no sistema existe no banco de produção: **`Voltz Voleibol`** (ID: `org-d700228a-3f04-4add-bc12-02fb83909afb`).
2. **Usuário Master Autenticado e Reconhecido:** O usuário `diegomartins@baseos.online` possui profile ativo com privilégios de **`is_platform_admin = true`**.
3. **TenantContext Operacional:** Ao inicializar a sessão do administrador da plataforma, o `TenantContext` consulta `dataAccess.listOrganizations()`, identifica a organização `org-d700228a-3f04-4add-bc12-02fb83909afb` e a estabelece automaticamente como tenant ativo no frontend (`currentOrganizationId`).
4. **Caminho até "Criar Competição":** O usuário consegue navegar pelo menu, abrir a tela de campeonatos (`/competicoes`) e acionar o diálogo modal de criação (`CompetitionFormDialog`).
5. **Gaps Arquiteturais Identificados:**
   - **Persistência de Competição:** O mapper físico `src/services/mappers/competitionMapper.ts` omite a coluna `organization_id` do payload enviado ao PostgREST. Como a coluna física `public.competitions.organization_id` é `NOT NULL`, a inserção falhará no banco até que o mapper inclua o `organization_id` do tenant ativo.
   - **Vínculos em `user_memberships`:** A criação de organizações no Painel Master (`MasterDashboard.tsx`) não insere automaticamente uma linha em `user_memberships` para o criador, nem preenche `profiles.organization_id`. Para o Platform Admin isso não bloqueia o acesso devido ao bypass de RLS (`is_platform_admin() = true`), mas bloqueará qualquer usuário comum sem membership explícita.
   - **Ausência de Slug de Organização:** A tabela `public.organizations` **não possui** a coluna `slug`. URLs públicas amigáveis do tipo `https://www.baseos.online/voltz` necessitarão da introdução de `slug text UNIQUE` no schema em etapa planejada.
   - **Descontinuação de `voltz.baseos.online`:** O domínio histórico `voltz.baseos.online` não possui mais resolução de DNS (`ERR_NAME_NOT_RESOLVED`). A produção já opera de forma consolidada sob `www.baseos.online` (frontend Vercel) e `flow.baseos.online` (API VPS/Kong).

---

## 2. Estado Atual de Produção

| Camada | Tecnologia | Estado Operacional | Observações |
| ------ | ---------- | ------------------ | ----------- |
| **Frontend** | React 18 + Vite + Tailwind CSS | 🟢 100% Ativo | Vercel (`https://www.baseos.online/`), build `04e196a` |
| **Reverse Proxy** | Kong Gateway 2.8.1 / OpenResty | 🟢 100% Ativo | VPS `169.58.129.187` (`https://flow.baseos.online`) |
| **Database** | PostgreSQL 17.6 (Docker) | 🟢 100% Ativo | Container `supabase_db_baseOs-voltz`, schema com 43 migrations |
| **Autenticação** | Supabase Auth (GoTrue) | 🟢 100% Ativo | JWT com claim de `role` e `is_platform_admin` |
| **Isolamento** | Row Level Security (RLS) | 🟢 100% Habilitado | Ativo em todas as 11 tabelas de domínio do sistema |
| **Dados de Negócio** | Bases Limpas | 🟢 1 Organização Real | 1 base (`Voltz Voleibol`), 0 campeonatos, 0 equipes, 0 partidas |

---

## 3. Arquitetura Vercel → VPS

```text
              CLIENTE (Navegador)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
https://www.baseos.online     https://flow.baseos.online
  [ Vercel CDN Edge ]          [ VPS Contabo 169.58.129.187 ]
       │                               │
  SPA Bundle HTML/JS                   ▼
  (React 18 + Vite)            Kong Gateway (Porta 443 / SSL Let's Encrypt)
       │                               │
       │                      ┌────────┴────────┐
       │                      ▼                 ▼
       │                GoTrue Auth        PostgREST 12
       │                (Porta 9999)       (Porta 3000)
       │                      │                 │
       └──────────────────────┼─────────────────┘
                              ▼
                     PostgreSQL 17.6 DB
             (supabase_db_baseOs-voltz / Porta 5432)
```

- **Frontend Vercel:** Entrega os arquivos estáticos e bundle da SPA. A variável de ambiente de produção `VITE_SUPABASE_URL` está configurada como `https://flow.baseos.online`.
- **Backend VPS:** Recebe chamadas REST em `/rest/v1/*` e Auth em `/auth/v1/*` via Kong Gateway com SSL ativo e cabeçalhos de CORS permissivos para `*.baseos.online`.

---

## 4. Domínios Encontrados

1. **`https://www.baseos.online/`**: Domínio canônico de produção do frontend (Vercel).
2. **`https://baseos.online/`**: Domínio raiz com redirect 308 permanente para `www.baseos.online`.
3. **`https://flow.baseos.online/`**: Domínio canônico da API PostgREST / GoTrue / Kong na VPS.
4. **`voltz.baseos.online`**: Domínio legado desativado. Não resolve em DNS público (`net::ERR_NAME_NOT_RESOLVED`).
5. **`base-os-henna.vercel.app`**: Domínio padrão gerado pelo projeto Vercel (`prj_3qjKrn5LfkkeAVKCYKhtopcsEuGs`).
6. **`localhost` / `127.0.0.1`**: Usados exclusivamente em desenvolvimento local e testes unitários Vitest.

---

## 5. Dependências de `voltz.baseos.online`

Varredura forense completa realizada em todo o repositório:
- **Código Fonte (`src/`):** **ZERO referências** ativas a `voltz.baseos.online`. A única menção a "Voltz" no código de produção é um comentário disciplinar em `src/services/genericPairingEngine.ts` que proíbe regras específicas ou hardcodes acoplados.
- **Testes Unitários (`src/test/`):** Referências encontradas apenas como nomes de torneios mock (`Copa Voltz Ouro 2026`) ou testes de regressão do chaveamento com 12 equipes.
- **Documentação e Scripts:** Referências históricas em `scripts/audit-prod-data.cjs`, relatórios em `docs/walkthroughs/` e `docs/deploy/`.
- **Frontend em Produção:** O bundle compilado (`index-DLyE4n8S.js`) já aponta para `https://flow.baseos.online`. Erros residuais no navegador de usuários decorrem exclusivamente de cache HTTP de bundles antigos que tentavam acessar `voltz.baseos.online`.
- **Classificação:** Legado histórico e documentação. Não há dependência técnica ativa no código funcional.

---

## 6. Domínio Futuro `www.baseos.online`

A consolidação de toda a experiência pública em `https://www.baseos.online/` é plenamente viável e arquiteturalmente correta:
- Os domínios `baseos.online` e `www.baseos.online` já estão verificados e ativos na Vercel.
- O roteador SPA suporta History API e deep links com fallbacks de rewrite na Vercel (`rewrites: [{ source: "/(.*)", destination: "/index.html" }]`).
- O tráfego de API é direcionado via HTTPS para `flow.baseos.online`, sem colisão de cookies ou CORS.

---

## 7. Home Atual

- **URL:** `https://www.baseos.online/`
- **Componente:** `<RootRedirector />` (`src/components/routing/RootRedirector.tsx`) que renderiza `<PublicPortal />` (`src/pages/PublicPortal.tsx`) para usuários não autenticados.
- **Fontes de Dados:** Consulta real ao PostgREST via `dataAccess.listCompetitions()`, `dataAccess.listMatches()`, `dataAccess.listTeams()` e `dataAccess.listVenues()`.
- **Mocks / Fake Data:** Nenhum dado fake. Com o banco zerado, exibe contadores em `0` e telas de estado vazio limpas.
- **Recursos Existentes:**
  - Barra de navegação com logotipo BaseOS e links para Classificação, Competições e Botão "Acessar Sistema" (`/login`).
  - Abas de filtragem rápida de partidas: `Hoje`, `Ao Vivo`, `Próximas`, `Finalizadas`, `Todas`.
  - Campo de busca textual por equipe, ginásio ou campeonato.
  - Cards de partidas com placar de sets e badges visuais de status.
- **Responsividade:** Layout responsivo testado para Desktop (1280px+), Tablet (768px-1024px) e Mobile (360px-480px).
- **O que difere da Visão "Sports Intelligence":** A redação atual foca em *"Competições Hoje — Central de Resultados & Vitrine Esportiva"*, necessitando da evolução de copy e apresentação editorial (*"BASEOS — SPORTS INTELLIGENCE: O campeonato acontece aqui"*).

---

## 8. Banco de Produção

Auditoria estrutural executada diretamente no PostgreSQL 17.6 (`supabase_db_baseOs-voltz`):

| Tabela | Existe | Coluna `organization_id` | RLS Ativo | Políticas RLS | Status |
| ------ | ------ | ------------------------- | --------- | ------------- | ------ |
| `organizations` | Sim | É a própria PK (`id`) | Sim | Read scoped/admin, Platform admin all | 🟢 PRONTO |
| `profiles` | Sim | Sim (nullable) | Sim | Self read/update, Platform admin all | 🟢 PRONTO |
| `user_memberships` | Sim | Sim (not null) | Sim | Scoped por usuário e org admin | 🟢 PRONTO |
| `organization_invitations` | Sim | Sim (not null) | Sim | Scoped por org admin | 🟢 PRONTO |
| `competitions` | Sim | Sim (not null) | Sim | Public read, Org admin CRUD | 🟢 PRONTO |
| `competition_teams` | Sim | Via `competition_id` | Sim | Public read, Org admin CRUD | 🟢 PRONTO |
| `teams` | Sim | Sim (not null) | Sim | Public read, Org admin CRUD | 🟢 PRONTO |
| `athletes` | Sim | Sim (not null) | Sim | Scoped por org member ou team manager | 🟢 PRONTO |
| `matches` | Sim | Via `competition_id` | Sim | Public read, Referee update, Org admin CRUD | 🟢 PRONTO |
| `venues` | Sim | Sim (not null) | Sim | Public read, Org admin CRUD | 🟢 PRONTO |
| `referees` | Sim | Sim (not null) | Sim | Scoped por org admin | 🟢 PRONTO |

---

## 9. Organização Encontrada

```text
ORGANIZAÇÃO REAL ENCONTRADA EM PRODUÇÃO
========================================
ID:           org-d700228a-3f04-4add-bc12-02fb83909afb
Nome:         Voltz Voleibol
Razão Social: Voltz
CNPJ/Doc:     (não preenchido)
Status:       active
Criada em:    2026-10-07 23:21:31.036+00
Atualizada:   2026-10-07 23:21:31.036+00
Slug:         NÃO EXISTE NO SCHEMA DO BANCO
```

---

## 10. Membership Encontrado

- **Registros em `public.user_memberships`:** **0 registros** encontrados no banco de produção.
- **Motivo Técnico:** A tela `MasterDashboard.tsx` executa `dataAccess.createOrganization()` ao cadastrar uma base, inserindo um registro exclusivamente na tabela `organizations`. Nenhuma membership automática é criada para o usuário logado nessa ação.

---

## 11. Usuário e Role

- **E-mail:** `diegomartins@baseos.online`
- **User ID:** `eb7a654d-e1f0-41ce-a47b-6cc9aabc3ca2`
- **Role em `profiles`:** `admin`
- **Flag Platform Admin:** `is_platform_admin = true`
- **Vínculo com a Organização:** Não possui linha em `user_memberships` nem `profiles.organization_id`. Contudo, a função de RLS `public.is_platform_admin()` retorna `true`, conferindo acesso total de leitura e escrita administrativa em todas as organizações.

---

## 12. TenantContext

- **Componente:** `<TenantProvider />` (`src/contexts/TenantContext.tsx`)
- **Fluxo de Inicialização:**
  1. Chama `dataAccess.listOrganizations()`.
  2. Como o usuário é Platform Admin, o RLS retorna `[ { id: "org-d700228a-3f04-4add-bc12-02fb83909afb", name: "Voltz Voleibol", ... } ]`.
  3. `TenantContext` avalia `list.length > 0` e define `currentOrganizationId = "org-d700228a-3f04-4add-bc12-02fb83909afb"`.
  4. Executa `dataAccess.setActiveOrganizationId(list[0].id)`.
  5. Disponibiliza o objeto `currentOrganization` para toda a aplicação.
- **Resultado:** O `TenantContext` funciona com sucesso para o usuário autenticado.

---

## 13. Login

- **Rota:** `/login` (`src/pages/LoginPage.tsx`)
- **Autenticação:** Integrada ao Supabase Auth GoTrue via `authService.signIn(email, password)`.
- **Sessão:** Token JWT armazenado em `localStorage` sob a chave canônica do Supabase.
- **Reutilização pela Home:** O botão "Entrar" da Home reutiliza o fluxo `/login` existente.

---

## 14. Redirect

O método `getSafeDestination` de `LoginPage.tsx` define os seguintes destinos reais após o login:
- `team`: Redireciona para `/equipe` (que redireciona para `/portal/equipe`).
- `referee` / `scorer`: Redireciona para `/jogos` (ou tela de súmulas).
- `admin` / `organizer`: Redireciona para `/competicoes-ativas` (fallback padrão) ou para a URL original requisitada (`targetPath`).
- O componente `<RootRedirector />` na raiz `/` redireciona `admin` / `organizer` para `/dashboard`.

---

## 15. Master

- **Rota:** `/master` (`src/pages/master/MasterDashboard.tsx`)
- **Guards:** `<RequireAuth roles={['admin']}>` e `<RequirePlatformAdmin>`.
- **Validação:** Usuários sem `is_platform_admin = true` recebem notificação de acesso negado e são redirecionados para `/dashboard`.
- **Recursos:** Listagem de todas as bases cadastradas, estatísticas, criação de nova empresa/base e o `<TenantSwitcher />` no cabeçalho global.

---

## 16. Área da Organização

- **Rotas Existentes:**
  - `/organizacoes`: Lista as organizações.
  - `/organizacoes/:organizationId`: Painel de detalhes da organização (perfil, métricas, abas de membros, equipes e competições).
  - `/organizacoes/:organizationId/membros`: Aba direta de convites e gestão de membros.
- **Isolamento:** Protegido pelo `<TenantRouteGuard>` que valida autorização de acesso ao `organizationId`.

---

## 17. Criação de Competição

- **Caminho:** `/competicoes` -> Botão "Nova Competição" -> `<CompetitionFormDialog />`.
- **Campos Disponíveis:** Modalidade (Indoor/Praia), Categoria (Masculino/Feminino/Misto), Local, Datas, Templates de Fases, Sets e Pontuação (FIVB), Limites de Elenco.
- **Bloqueador Identificado:**
  - `src/components/competition/dialogs/CompetitionFormDialog.tsx` monta o objeto `baseRecord` sem a propriedade `organizationId`.
  - `src/services/mappers/competitionMapper.ts` na lista `COMPETITION_PHYSICAL_COLUMNS` **não inclui** `organization_id`, e a função `toPersistence()` não mapeia essa coluna.
  - No banco de dados, `public.competitions.organization_id` é `NOT NULL` com Foreign Key para `organizations(id)`.
  - **Efeito:** Uma tentativa de submissão do formulário atual resultará em erro do PostgreSQL: `null value in column "organization_id" violates not-null constraint`.

---

## 18. Rotas

Todas as 52 rotas ativas do sistema foram mapeadas na matriz dedicada em `docs/audits/BASEOS-PRODUCTION-ENTRY-ROUTES.md`.

---

## 19. RLS (Row Level Security)

- Todas as tabelas críticas possuem RLS ativo (`relrowsecurity = true`).
- Acesso de leitura público garantido para dados de competições, partidas e equipes.
- Acesso a dados confidenciais (atletas, documentos, membros) restrito ao tenant ou ao próprio atleta/gestor.
- Funções de apoio `is_platform_admin()`, `is_admin_or_organizer()` e `is_org_admin_or_organizer(p_org_id)` operam com precisão.

---

## 20. Multi-Tenancy

- O isolamento é multi-tenant horizontal fundamentado na coluna `organization_id`.
- Operadores e gestores de equipe têm acesso rigorosamente limitado à organização de seu vínculo.
- Platform Admins transitam entre tenants através do seletor global sem misturar dados.

---

## 21. Dados Públicos

O sistema já disponibiliza as seguintes entidades para renderização pública deslogada:
- Torneios e formatos regulamentares (`competitions`).
- Tabela de jogos, horários, quadras e status (`matches`).
- Equipes participantes e siglas (`teams`).
- Classificação por grupos e fases eliminatórias (`standings`).

---

## 22. Jogos "Ao Vivo" (Radar)

- **Mapeamento:** A tabela `matches` possui os campos `status`, `sets` (JSONB com histórico de parciais), `scheduled_time`, `venue`, `court`, `team_a_name` e `team_b_name`.
- **Status Operacionais Suportados:** `in-progress`, `warmup`, `timeout`, `set-break`.
- **Prontidão do Radar:** **Pronto no Backend e Frontend**. O componente `<PublicPortal />` já filtra partidas ativas e renderiza badges com animação pulsante ("AO VIVO"). Atualmente não há jogos cadastrados em produção, mantendo o radar em estado neutro/vazio.

---

## 23. Resultados

- Partidas com status `completed` e `homologated` fornecem placar consolidado de sets e vencedor (`winner_id`).
- Cálculos de classificação CBV/FIVB operam em memória via `standingsService.ts` com base no histórico das partidas.

---

## 24. Problemas Identificados

1. **Persistência de Competição (`competitionMapper.ts`):** O mapper omite `organization_id`, impedindo o salvamento físico de competições criadas no formulário.
2. **Criação de Organização no Master:** Não associa o criador em `user_memberships`.
3. **Ausência de `organizations.slug`:** Impede a criação imediata de URLs no formato `https://www.baseos.online/{slug}`.
4. **Cache de Navegador com Domínio Antigo:** Usuários com sessões antigas ou service workers em cache podem tentar carregar scripts apontando para `voltz.baseos.online`.

---

## 25. O que Já Está Pronto

- [x] Hospedagem na Vercel com domínio canônico `www.baseos.online` ativo e com SSL.
- [x] Backend na VPS com API `flow.baseos.online` respondendo com HTTP 200 OK.
- [x] PostgreSQL 17.6 limpo, íntegro e com 43 migrations aplicadas.
- [x] Base real `Voltz Voleibol` cadastrada e ativa.
- [x] Login funcional com usuário administrador master.
- [x] `TenantContext` descobrindo a base e isolando os dados no frontend.
- [x] Interface de gestão de campeonatos e diálogo `CompetitionFormDialog` com todas as abas.
- [x] Portal público responsivo de jogos com suporte a filtros e busca.

---

## 26. O que Falta para a Home

- [ ] Ajustar a mensagem e branding institucional para **"BASEOS — SPORTS INTELLIGENCE: O campeonato acontece aqui"**.
- [ ] Incluir atalhos/seções institucionais claras para apresentação da plataforma.
- [ ] Implementar rotas públicas dedicadas ou aliases para `/campeonatos`, `/ao-vivo` e `/resultados`.

---

## 27. O que Falta para Criar a Primeira Competição

- [ ] Incluir `organization_id` na lista `COMPETITION_PHYSICAL_COLUMNS` e na função `toPersistence()` em `src/services/mappers/competitionMapper.ts`.
- [ ] Garantir que `CompetitionFormDialog.tsx` passe o `organizationId` do `TenantContext` para o payload da competição.

---

## 28. O que NÃO Precisa ser Desenvolvido

- Não precisa criar novo banco de dados nem rodar reset de containers.
- Não precisa criar novo sistema de autenticação ou login.
- Não precisa criar novo formulário de campeonato (o existente é modular e completo).
- Não precisa reinventar o `TenantContext` ou a barra de navegação.
- Não precisa criar dados falsos/mocks.

---

## 29. O que NÃO Deve ser Alterado

- Não alterar as configurações de DNS nem o domínio da API `flow.baseos.online`.
- Não descartar nem modificar o volume de dados do PostgreSQL 17.6.
- Não alterar as regras de desempate esportivo do vôlei em `standingsService.ts`.
- Não mexer na organização `org-d700228a-3f04-4add-bc12-02fb83909afb`.

---

## 30. Próxima Implementação Recomendada

1. **Passo 1 (Desbloqueio Imediato da Competição):** Corrigir pontualmente o `competitionMapper.ts` e `CompetitionFormDialog.tsx` para persistir o `organization_id` da base ativa.
2. **Passo 2 (Primeira Competição Real):** Cadastrar a primeira competição da `Voltz Voleibol` diretamente pela interface.
3. **Passo 3 (Evolução Visual da Home):** Atualizar o hero da Home para a identidade definitiva *"BASEOS — SPORTS INTELLIGENCE"*.
4. **Passo 4 (Slug Público da Organização):** Em release planejada, adicionar coluna `slug` na tabela `organizations` para habilitar `https://www.baseos.online/voltz`.

---

## 31. Walkthrough Real

### VISITANTE
```text
https://www.baseos.online/
  ↓
Acessa o site sem autenticação
  ↓
O que vê?
Portal Público oficial do BaseOS com contadores em zero (estado limpo real),
calendário de hoje, filtros de partidas (Hoje/Ao Vivo/Próximas/Finalizadas)
e botão "Acessar Sistema".
```

### USUÁRIO
```text
Clica em "Acessar Sistema" (ou navega para /login)
  ↓
Informa credenciais (ex: diegomartins@baseos.online)
  ↓
Quem sou eu?
Diego Martins (Master) — Role: admin, Flag: is_platform_admin = true.
  ↓
Para onde vou?
Redirecionado para /dashboard (ou /competicoes-ativas).
```

### ORGANIZAÇÃO
```text
Inicialização do sistema
  ↓
TenantContext executa listOrganizations()
  ↓
Base encontrada: "Voltz Voleibol" (ID: org-d700228a-3f04-4add-bc12-02fb83909afb)
  ↓
Contexto ativo: TenantSwitcher exibe "Voltz Voleibol" no topo da página
  ↓
Acesso à área da organização: Navega para /organizacoes/org-d700228a-3f04-4add-bc12-02fb83909afb
  ↓
Visualiza dados da base, abas de membros, equipes e competições.
```

### OPERADOR
```text
Menu lateral -> Campeonatos (/competicoes)
  ↓
Clica em "Nova Competição"
  ↓
Abre CompetitionFormDialog com 5 abas completas de configuração esportiva
  ↓
Pronto para criar?
A interface e validações estão 100% prontas. A persistência física no banco aguarda
apenas o ajuste cirúrgico do mapper para vincular o organization_id da base.
```

---

## 32. Matriz "Precisa ou Não Precisa"

| Item | Já existe? | Precisa alterar? | Bloqueia Home? | Bloqueia competição? | Ação |
| ---- | :--------: | :--------------: | :------------: | :------------------: | ---- |
| `organizations` | Sim | Não | Não | Não | 🟢 Preservar intacto no banco |
| `organization.slug` | Não | Sim (futuro) | Não | Não | 🔵 Planejar migration para slug amigável |
| `user_memberships` | Sim | Sim (criar vínculo) | Não | Não (para master) | 🟡 Vincular membros não-admin |
| `TenantContext` | Sim | Não | Não | Não | 🟢 Preservar, já seleciona a base ativa |
| `login` | Sim | Não | Não | Não | 🟢 Preservar existente |
| RBAC | Sim | Não | Não | Não | 🟢 Preservar existente |
| RLS | Sim | Não | Não | Não | 🟢 Preservar políticas ativas |
| Home (`/`) | Sim | Sim (copy/layout) | Sim (apenas cosmético) | Não | 🟡 Atualizar para Sports Intelligence |
| `/competicoes` | Sim | Sim (mapper org_id) | Não | **SIM** | 🟠 Mapear `organization_id` no mapper |
| `/jogos` | Sim | Não | Não | Não | 🟢 Preservar existente |
| `/classificacao` | Sim | Não | Não | Não | 🟢 Preservar existente |
| Equipes & Atletas | Sim | Não | Não | Não | 🟢 Preservar tabelas e formulários |
| Domínio Vercel | Sim | Não | Não | Não | 🟢 Já ativo em `www.baseos.online` |
| Domínio VPS | Sim | Não | Não | Não | 🟢 Já ativo em `flow.baseos.online` |
| Supabase / Postgres | Sim | Não | Não | Não | 🟢 Preservar banco 17.6 com 43 migrations |
| Realtime | Sim | Não | Não | Não | 🟢 Preservar |
| Storage | Sim | Não | Não | Não | 🟢 Preservar |

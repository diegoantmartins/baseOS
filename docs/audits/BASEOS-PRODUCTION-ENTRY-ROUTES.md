# BASEOS — MATRIZ DE ROTAS DE ENTRADA E OPERAÇÃO EM PRODUÇÃO

**Data:** 08/10/2026  
**Ambiente:** PRODUÇÃO (`https://www.baseos.online/`)  
**Backend:** VPS Contabo `169.58.129.187` / `https://flow.baseos.online`  
**Escopo:** Auditoria de Superfície de Roteamento, Acesso Público, Autenticação, Isolamento Multi-Tenant e Guards.

---

## 1. Visão Geral da Arquitetura de Roteamento

O roteamento da aplicação é implementado com `react-router-dom` v6 (`src/App.tsx`). A segurança e resolução de contexto são garantidas por uma hierarquia de três camadas de proteção:
1. **Guarda de Autenticação (`RequireAuth`):** Valida sessão do usuário e filtra por papéis (`admin`, `organizer`, `team`, `referee`, `scorer`).
2. **Guarda Master Platform Admin (`RequirePlatformAdmin`):** Exclusivo para usuários com `is_platform_admin = true`, resguardando o Painel Master `/master`.
3. **Guarda Multi-Tenant (`TenantRouteGuard`):** Protege recursos parametrizados (`:competitionId`, `:organizationId`, `:matchId`) contra vulnerabilidades IDOR/BOLA cross-tenant.

---

## 2. Matriz de Rotas Existentes no Código

| Rota | Existe | Pública | Autenticação | Tenant | Organização | Status | Problema / Observação |
| ---- | ------ | ------- | ------------ | ------ | ----------- | ------ | --------------------- |
| `/` | Sim | Sim (deslogado) | Opcional (`RootRedirector`) | Global | N/A | 🟢 PRONTO | Renderiza `<PublicPortal />` quando anônimo. Se logado como admin/organizer redireciona para `/dashboard`; se team, para `/portal/equipe`. |
| `/login` | Sim | Sim | Não | Não | N/A | 🟢 PRONTO | Realiza autenticação via Supabase Auth GoTrue. Após login redireciona `admin`/`organizer` para `/competicoes-ativas` (ou `targetPath`). |
| `/competicoes-ativas` | Sim | Sim | Não | Global | Todas | 🟢 PRONTO | Vitrine pública de competições ativas. |
| `/classificacao` | Sim | Sim | Não | Global | Todas | 🟢 PRONTO | Tabelas de classificação públicas por competição/grupo. |
| `/standings` | Sim | Sim | Não | Global | Todas | 🟢 PRONTO | Alias para `/classificacao`. |
| `/c/:slug` | Sim | Sim | Não | Scoped | Via competição | 🟢 PRONTO | Página pública detalhada do campeonato pelo slug da competição. |
| `/portal` | Sim | Não | Sim | Scoped | Scoped | 🟢 PRONTO | Roteador dinâmico de entrada por perfil (`PortalRouter`). |
| `/portal/equipe` | Sim | Não | Sim (team/athlete) | Scoped | Scoped | 🟢 PRONTO | Portal exclusivo da equipe e atletas inscritos (`TeamPortalGuard`). |
| `/portal/equipe/*` | Sim | Não | Sim (team/athlete) | Scoped | Scoped | 🟢 PRONTO | Sub-rotas do portal da equipe. |
| `/equipe` | Sim | Não | Sim (team) | Scoped | Scoped | 🟢 PRONTO | Redirecionador para `/portal/equipe` via `TeamContextRedirector`. |
| `/equipe/:token` | Sim | Sim (token) | Token | Scoped | Scoped | 🟢 PRONTO | Inscrição e elenco via token seguro de convite. |
| `/equipe/inscricao/:token` | Sim | Sim (token) | Token | Scoped | Scoped | 🟢 PRONTO | Alias de inscrição por token. |
| `/ajuda` | Sim | Sim | Não | Não | N/A | 🟢 PRONTO | Central de Ajuda e guias operacionais. |
| `/help` | Sim | Sim | Não | Não | N/A | 🟢 PRONTO | Alias para `/ajuda`. |
| `/dashboard` | Sim | Não | Sim (admin/organizer) | Sim | Ativa (`TenantContext`) | 🟢 PRONTO | Painel operacional com métricas da organização ativa. |
| `/competicoes` | Sim | Não | Sim (organizer) | Sim | Ativa (`TenantRouteGuard`) | 🟡 QUASE PRONTO | Gestão de competições. Criação bloqueada no Supabase porque o mapper omite `organization_id`. |
| `/competicoes/:id` | Sim | Não | Sim (organizer) | Sim | Ativa (`TenantRouteGuard`) | 🟢 PRONTO | Detalhe da competição e abas operacionais. |
| `/competicoes/:id/*` | Sim | Não | Sim (organizer) | Sim | Ativa (`TenantRouteGuard`) | 🟢 PRONTO | Sub-abas da competição. |
| `/competicoes/:id/inscricoes` | Sim | Não | Sim (organizer) | Sim | Ativa (`TenantRouteGuard`) | 🟢 PRONTO | Gestão de inscrições e homologação de elencos. |
| `/jogos` | Sim | Não | Sim (admin/org/referee) | Sim | Ativa | 🟢 PRONTO | Central de partidas e controle de quadra. |
| `/jogos/novo` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Agendamento manual de partidas. |
| `/sumulas` | Sim | Não | Sim (admin/org/referee) | Sim | Ativa | 🟢 PRONTO | Lista de súmulas para preenchimento e homologação. |
| `/sumulas/:matchId` | Sim | Não | Sim (admin/org/referee) | Sim | Ativa (`TenantRouteGuard`) | 🟢 PRONTO | Interface digital e homologação de súmula oficial. |
| `/organizacoes` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Listagem das organizações do ecossistema. |
| `/organizacoes/:organizationId` | Sim | Não | Sim (organizer) | Sim | Scoped (`TenantRouteGuard`) | 🟢 PRONTO | Área da organização: perfil, membros, equipes e competições. |
| `/organizacoes/:organizationId/membros` | Sim | Não | Sim (organizer) | Sim | Scoped (`TenantRouteGuard`) | 🟢 PRONTO | Aba direta de convites e gestão de membros da organização. |
| `/master` | Sim | Não | Sim (`is_platform_admin`) | Master | Todas | 🟢 PRONTO | Painel Master: cadastro de novas empresas/bases e switch global. |
| `/equipes` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Cadastro e gestão de equipes da organização ativa. |
| `/atletas` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Base cadastral unificada de atletas por CPF. |
| `/locais` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Ginásios e quadras esportivas da organização. |
| `/venues` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Alias para `/locais`. |
| `/pessoas` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Oficiais de arbitragem e mesa. |
| `/arbitros` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Cadastro de árbitros e apontadores. |
| `/arbitragem` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Alias para `/arbitros`. |
| `/modalidades` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Modalidades (Indoor / Praia). |
| `/estatisticas` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Estatísticas consolidadas da organização. |
| `/relatorios` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Emissão de relatórios e PDFs oficiais. |
| `/reports` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Alias para `/relatorios`. |
| `/sorteio` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Módulo de sorteio e chaveamento. |
| `/sorteio/:competitionId` | Sim | Não | Sim (organizer) | Sim | Ativa (`TenantRouteGuard`) | 🟢 PRONTO | Sorteio parametrizado por campeonato. |
| `/configuracoes` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Configurações gerais da organização ativa. |
| `/documentos/editor` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Editor visual de layout de documentos oficiais. |
| `/documentos/editor/:matchId` | Sim | Não | Sim (organizer) | Sim | Ativa (`TenantRouteGuard`) | 🟢 PRONTO | Edição de documento vinculada à partida. |
| `/matches` | Sim | Não | Sim (admin/org/referee) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `/match-sheets` | Sim | Não | Sim (admin/org/referee) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `/competitions` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟡 QUASE PRONTO | Rota legado preservada. |
| `/teams` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `/athletes` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `/referees` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `/statistics` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `/settings` | Sim | Não | Sim (organizer) | Sim | Ativa | 🟢 PRONTO | Rota legado preservada. |
| `*` | Sim | Sim | Não | Não | N/A | 🟢 PRONTO | Rota curinga 404 (`NotFound`). |

---

## 3. Rotas Conceituais Desejadas (Não Existentes no Router)

| Rota Desejada | Existe | Pública | Autenticação | Tenant | Organização | Status | Problema / Diagnóstico |
| ------------- | ------ | ------- | ------------ | ------ | ----------- | ------ | ---------------------- |
| `/{organization-slug}` (ex: `/voltz`) | Não | Sim | Não | Pretendido | Scoped por Slug | 🔴 NÃO EXISTE | A tabela `organizations` **não possui** a coluna `slug`. O router não possui rota dinâmica na raiz para slug de organização. Rotas de organização exigem ID: `/organizacoes/:organizationId`. |
| `/ao-vivo` | Não | Sim | Não | Global | Todas | 🔴 NÃO EXISTE | O radar de jogos em andamento funciona dentro de `/` através do filtro `filter='live'`. Não existe rota dedicada `/ao-vivo`. |
| `/resultados` | Não | Sim | Não | Global | Todas | 🔴 NÃO EXISTE | Resultados finalizados são exibidos em `/` (`filter='finished'`) e em `/classificacao`. Não há rota `/resultados`. |
| `/campeonatos` | Não | Sim | Não | Global | Todas | 🔴 NÃO EXISTE | A rota pública correspondente é `/competicoes-ativas`. A rota `/competicoes` é privada (exige login e role `organizer`). |

---

## 4. Conclusão da Auditoria de Rotas

1. O router possui **52 rotas ativas** cobrindo todas as funções operacionais, administrativas e públicas.
2. A separação entre áreas públicas e operacionais está devidamente protegida por guards de autenticação e tenant.
3. Para atender à arquitetura pública futura (`/campeonatos`, `/ao-vivo`, `/resultados`, `/{org-slug}`), o router atual precisa apenas de rotas públicas adicionais ou aliases declarados, sem alterar a integridade das rotas privadas existentes.

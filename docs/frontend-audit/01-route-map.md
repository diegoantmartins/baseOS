# BASEOS — MASTER FRONTEND AUDIT
## 01. Mapeamento Completo de Rotas & Páginas (Route Map)

---

## 1. INVENTÁRIO GERAL DE ROTAS DA APLICAÇÃO

O roteamento da aplicação é gerenciado pelo **React Router DOM v6** no arquivo central `src/App.tsx`.
Abaixo está o inventário exaustivo de todas as rotas configuradas, permissões de acesso, layouts associados e diagnósticos.

| Rota (Path) | Componente de Página | Acesso / Permissão | Layout Utilizado | Entidade / Domínio | Diagnóstico & Observações |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `ActiveCompetitionsPage.tsx` | Pública | `MainLayout` | Competições | Rota raiz direciona para a listagem de campeonatos ativos. |
| `/competicoes-ativas` | `ActiveCompetitionsPage.tsx` | Pública | `MainLayout` | Competições | Alias canônico para a visão geral de campeonatos ativos. |
| `/dashboard` | `Index.tsx` | Pública | `DashboardShell` | Dashboard / Torneio | Rota do painel analítico com KPIs, busca e atalhos rápidos. |
| `/jogos` | `MatchesPage.tsx` | Pública | `MainLayout` | Partidas & Súmulas | Lista de confrontos, filtros, mesa do apontador ao vivo e placar. |
| `/sumulas` | `MatchSheetPage.tsx` | Pública | `MainLayout` | Súmula Digital | Seletor de partidas para lançamento de súmula oficial. |
| `/sumulas/:matchId` | `MatchSheetPage.tsx` | Pública | `MainLayout` | Súmula / Tática / Social | Interface interativa de súmula digital, escalação DND e preview PDF. |
| `/equipe/inscricao/:token` | `TeamRosterRegistrationPage.tsx` | Pública (Token) | `PublicShell` | Portal da Equipe | Portal web externo para o dirigente cadastrar atletas via link seguro. |
| `/login` | `LoginPage.tsx` | Pública | Nenhum (Centralizado) | Autenticação | Login por e-mail/senha com atalhos de contas demo rápidas. |
| `/ajuda` | `HelpCenterPage.tsx` | Pública | `MainLayout` | Central de Ajuda | Base de conhecimento categorizada, busca e tutoriais passo a passo. |
| `/help` | `HelpCenterPage.tsx` | Pública | `MainLayout` | Central de Ajuda | Alias em inglês para `/ajuda`. |
| `/jogos/novo` | `CreateMatchPage.tsx` | Requer `organizer` | `MainLayout` | Partidas | Formulário legado de novo jogo (exige `?competition=xxx`). |
| `/competicoes` | `CompetitionsPage.tsx` | Requer `organizer` | `MainLayout` | Competições | Gestão do campeonato, chaveamento, regulamento e classificação. |
| `/competicoes/:id/inscricoes` | `CompetitionRegistrationsPage.tsx` | Requer `organizer` | `MainLayout` | Inscrições | Homologação de equipes inscritas e links de convite. |
| `/equipes` | `TeamsPage.tsx` | Requer `organizer` | `MainLayout` | Equipes | Cadastro de agremiações, logos, contatos e tokens de elenco. |
| `/modalidades` | `ModalitiesPage.tsx` | Requer `organizer` | `MainLayout` | Modalidades | Configuração de tipos (Quadra 6x6, Praia 2x2, pontuações padrão). |
| `/pessoas` | `PeoplePage.tsx` | Requer `organizer` | `MainLayout` | Recursos Humanos | Quadro geral de oficiais, gestores, técnicos e árbitros. |
| `/locais` | `VenuesPage.tsx` | Requer `organizer` | `MainLayout` | Praças Esportivas | Cadastro de ginásios, arenas de praia, endereços e quadras. |
| `/venues` | `VenuesPage.tsx` | Requer `organizer` | `MainLayout` | Praças Esportivas | Alias em inglês para `/locais`. |
| `/atletas` | `AthletesPage.tsx` | Requer `organizer` | `MainLayout` | Atletas | Gestão global de jogadores, documentos, camisas e transferências. |
| `/arbitros` | `RefereesPage.tsx` | Requer `organizer` | `MainLayout` | Arbitragem | Escalação e controle de quadro de árbitros (sobreposição com `/pessoas`). |
| `/estatisticas` | `StatisticsPage.tsx` | Requer `organizer` | `MainLayout` | Estatísticas | Gráficos de desempenho, pontuações e comparativos. |
| `/relatorios` | `ReportsPage.tsx` | Requer `organizer` | `MainLayout` | Relatórios PDF | Emissão de boletins, pódios, súmulas preenchidas e em branco. |
| `/reports` | `ReportsPage.tsx` | Requer `organizer` | `MainLayout` | Relatórios PDF | Alias em inglês para `/relatorios`. |
| `/sorteio` | `DrawPage.tsx` | Requer `organizer` | `MainLayout` | Sorteio / Chaves | Sorteio ao vivo determinístico com drag and drop de grupos. |
| `/sorteio/:competitionId` | `DrawPage.tsx` | Requer `organizer` | `MainLayout` | Sorteio / Chaves | Sorteio direto para uma competição específica. |
| `/configuracoes` | `SettingsPage.tsx` | Requer `organizer` | `MainLayout` | Configurações | Gestão de RBAC, perfil institucional, backup, seed e logs de auditoria. |
| `*` | `NotFound.tsx` | Pública | Nenhum | 404 | Página de captura de rotas inexistentes. |

---

## 2. ROTAS LEGADAS (ALIASES EM INGLÊS MANTIDOS PARA RETROCOMPATIBILIDADE)

As seguintes rotas foram identificadas em `App.tsx` como redirecionamentos legados:
- `/matches` ➔ Renderiza `MatchesPage.tsx` (Canônica: `/jogos`)
- `/match-sheets` ➔ Renderiza `MatchSheetPage.tsx` (Canônica: `/sumulas`)
- `/competitions` ➔ Renderiza `CompetitionsPage.tsx` (Canônica: `/competicoes`)
- `/teams` ➔ Renderiza `TeamsPage.tsx` (Canônica: `/equipes`)
- `/athletes` ➔ Renderiza `AthletesPage.tsx` (Canônica: `/atletas`)
- `/referees` ➔ Renderiza `RefereesPage.tsx` (Canônica: `/arbitros`)
- `/statistics` ➔ Renderiza `StatisticsPage.tsx` (Canônica: `/estatisticas`)
- `/settings` ➔ Renderiza `SettingsPage.tsx` (Canônica: `/configuracoes`)

> **Recomendação**: Manter os aliases funcionando via `<Navigate to="..." replace />` para preservar URLs externas sem duplicar o bundle de renderização.

---

## 3. PÁGINAS ÓRFÃS / NÃO ROTEADAS NO CÓDIGO-FONTE

Durante a auditoria foi identificada a seguinte página existente no repositório que **NÃO está registrada no roteador `App.tsx`**:

### 🚨 `src/pages/DocumentEditorPage.tsx` (21.9 kB, 517 linhas)
- **Objetivo**: Editor visual WYSIWYG de coordenadas de templates de súmulas (`sumula-3-sets`, `sumula-5-sets`, `ordem-saque`), permitindo ajustes finos milimétricos dos campos sobre o PDF nativo.
- **Status**: Órfã / Inacessível por rota.
- **Ação Recomendada**: Criar a rota autenticada `/documentos/editor` ou integrá-la como uma ferramenta dentro da aba de emissão de súmulas em `/relatorios`.

---

## 4. ANÁLISE DE SEGURANÇA E GUARDAS DE ROTA (`RequireAuth`)

- As rotas públicas (`/`, `/competicoes-ativas`, `/dashboard`, `/jogos`, `/sumulas`, `/equipe/inscricao/:token`, `/login`, `/ajuda`) permitem visualização de dados operacionais sem necessidade de login.
- As rotas administrativas utilizam o componente `<RequireAuth roles={['organizer']}>`.
- Quando o usuário não está autenticado e tenta acessar uma rota protegida, é redirecionado para `/login` preservando o caminho original no `location.state.from`.

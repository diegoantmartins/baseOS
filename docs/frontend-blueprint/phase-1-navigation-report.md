# BASEOS — FASE 1: NAVIGATION & LAYOUT UNIFICATION
## Relatório de Implementação

**Data**: 2026-08-26  
**Executor**: Lead Frontend & Agent Skills Architect  
**Escopo Autorizado**: FASE 1 — Navigation & Layout Unification  

---

## 1. ARQUITETURA ANTERIOR

Na arquitetura anterior:
- O layout era **Header-first (Top Navigation)** com navegação fragmentada e dropdowns complexos no topo.
- O componente `Sidebar.tsx` existia no repositório, mas estava completamente órfão (nenhuma página ou layout o utilizava).
- `DashboardShell.tsx` funcionava como um layout paralelo e isolado apenas para a rota `/dashboard` com métricas hardcoded e cabeçalho próprio.
- Não existia componente padrão de breadcrumb semântico para páginas de detalhe/profundas.
- A navegação mobile dependia exclusivamente de um drawer vertical completo acionado pelo cabeçalho.
- A rota `/documentos/editor` existia como página implementada (`DocumentEditorPage.tsx`), mas nunca havia sido registrada em `src/App.tsx`.

---

## 2. ARQUITETURA NOVA

Na nova arquitetura unificada:
- **`MainLayout.tsx` como container mestre**: Coordena a Sidebar fixa lateral (desktop `lg+`), o Header superior enxuto, o container de conteúdo principal (`#main-content`) com suporte a skip link/foco acessível, o `BottomNav` para mobile e os modais globais (`DemoModeBanner`, `InactivityTimeoutModal`).
- **Sidebar estruturada em 5 grupos funcionais**: Substituição da lista plana por agrupamentos operacionais claros com detecção ativa robusta (`startsWith`), preservação de RBAC e recolhimento (collapse) com tooltips nativos.
- **Header enxuto e integrado**: Foco em branding responsivo (visível em mobile), ações do usuário autenticado, notificações PWA e acesso rápido à Central de Ajuda.
- **`BreadcrumbNav.tsx`**: Primitiva acessível sobre Radix/shadcn para páginas com múltiplos níveis de profundidade, ocultando-se automaticamente em rotas raiz.
- **`BottomNav.tsx` (Mobile)**: Barra de navegação inferior otimizada para operação em quadra/praia (Início, Jogos, Súmulas e Menu expansível via Sheet).

---

## 3. MUDANÇAS NO MAINLAYOUT

- Integrado `<Sidebar />` em viewports desktop (`lg+`).
- Adicionado padding responsivo `lg:pl-[240px]` com transição suave para evitar sobreposição de conteúdo.
- Adicionado `<BottomNav />` fixo na base para viewports `< lg`, com espaçamento inferior correspondente (`pb-20 lg:pb-6`) para evitar corte de conteúdo.
- Atribuído `id="main-content"` e `tabIndex={-1}` na tag `<main>` para padrões de acessibilidade e salto de conteúdo.
- Removido rodapé decorativo em favor de densidade operacional SaaS.

---

## 4. MUDANÇAS NA SIDEBAR

A `Sidebar.tsx` foi reescrita e organizada nos 5 grupos definidos no Blueprint:
1. **Painel & Competições**: Competições Ativas (`/competicoes-ativas`), Dashboard (`/dashboard`), Campeonatos (`/competicoes`).
2. **Operação de Quadra**: Partidas (`/jogos`), Súmulas (`/sumulas`), Sorteio (`/sorteio`).
3. **Cadastros de Base**: Equipes (`/equipes`), Atletas (`/atletas`), Locais (`/locais`), Oficiais (`/pessoas`), Modalidades (`/modalidades`).
4. **Documentos Oficiais**: Estatísticas (`/estatisticas`), Relatórios (`/relatorios`), Editor de Súmulas (`/documentos/editor`).
5. **Sistema**: Configurações (`/configuracoes`), Central de Ajuda (`/ajuda`).

**Recursos de UX & Acessibilidade:**
- Detecção ativa via `location.pathname.startsWith(path)` para suporte a sub-rotas como `/sorteio/:competitionId`.
- Atributo `aria-current="page"` no item ativo.
- `requiresOrganizer`: preservação de RBAC compatível com `session.user.role === 'organizer'`.
- Remoção da seção legada "Acesso Rápido" (botões sem função com classes não-padrão).

---

## 5. MUDANÇAS NO HEADER

- Removida a barra de links e dropdown de cadastros no desktop (migrada para a Sidebar lateral).
- Logo BaseOS ocultado em desktop (já presente no topo da Sidebar) e mantido em viewports mobile.
- Preservados 100% dos fluxos de perfil:
  - Exibição de Nome, Email e Role.
  - Ação de "Emitir Súmula em Branco" (`BlankSheetEmitDialog`).
  - Atalhos para Central de Ajuda e Configurações.
  - Logout com redirecionamento para `/login`.
  - Notificações PWA e botão de instalação PWA.

---

## 6. BREADCRUMBNAV

Criado em `src/components/navigation/BreadcrumbNav.tsx`:
- Baseado nos componentes Radix UI de Breadcrumb (`@/components/ui/breadcrumb`).
- Suporta hierarquia dinâmica `items: Array<{ label: string; href?: string }>`.
- Último item renderizado sem link como `BreadcrumbPage` (página atual).
- Retorna `null` quando `items.length <= 1`, evitando ruído visual em páginas raiz.
- Landmark acessível `aria-label="Localização na aplicação"`.

---

## 7. BOTTOMNAV

Criado em `src/components/navigation/BottomNav.tsx`:
- Visível apenas em viewports `< lg` (`lg:hidden`).
- 3 Ações de alta frequência: Início (`/competicoes-ativas`), Jogos (`/jogos`), Súmulas (`/sumulas`).
- 1 Botão "Menu" que aciona um `Sheet` inferior contendo todos os grupos secundários organizados.
- Altura e touch target de no mínimo 52px (em conformidade com WCAG 2.5.5).
- Suporte a `env(safe-area-inset-bottom)` para dispositivos iOS.

---

## 8. ROTAS RESGATADAS & MATRIZ DE ROTEAMENTO

A página `DocumentEditorPage.tsx` foi oficialmente registrada no roteador `src/App.tsx`:
- `/documentos/editor` (Protegida: `organizer`)
- `/documentos/editor/:matchId` (Protegida: `organizer`)

---

## 9. DASHBOARDSHELL

- `DashboardShell.tsx` foi preservado para a rota `/dashboard` (`src/pages/Index.tsx`), mantendo a estabilidade da página de métricas até a sua reformulação dedicada na **Fase 3 (Dashboard)**.

---

## 10. TESTES

Criado `src/test/navigation.test.tsx` com 13 testes unitários cobrindo:
- `BreadcrumbNav`: ocultação em raiz, renderização hierárquica (2 e 3 níveis), links corretos, página atual não-clicável, acessibilidade.
- `BottomNav`: renderização de botões, detecção de rota ativa via `aria-current`, acessibilidade de landmarks e acionamento do menu Sheet.

**Resultado da suíte completa:**
- Test files: **40 passed (40)**
- Total tests: **280 passed (280)** (248 legados + 21 Fase 0 + 13 Fase 1, sendo 2 ajustes/consolidações)

---

## 11. BUILD & QUALIDADE DE CÓDIGO

- **TypeScript (`tsc`)**: 0 erros.
- **ESLint (`lint`)**: 0 erros, 14 warnings pré-existentes (`react-refresh/only-export-components`).
- **Build de Produção**: `✓ built in ~55s`.

---

## 12. RISCOS & DECISÕES MITIGADAS

- **Risco de sobreposição de conteúdo com Sidebar fixa**: Mitigado com `lg:pl-[240px]` no container do `MainLayout`.
- **Risco de sobreposição de conteúdo com BottomNav mobile**: Mitigado com `pb-20` no elemento `<main>` em mobile.
- **Risco de quebra de permissões**: RBAC nos itens de menu espelha os guards de rota (`RequireAuth`) existentes.

---

## 13. PENDÊNCIAS PARA AS PRÓXIMAS FASES

- Substituição dos dados mock do `DashboardShell` por dados reais do `dataAccess` (Fase 3).
- Inclusão do `<BreadcrumbNav />` nas páginas de detalhe conforme forem sendo refatoradas (Fases 4 a 8).

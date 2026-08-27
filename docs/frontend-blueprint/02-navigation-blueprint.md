# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 02. Arquitetura Definitiva de Navegação & Menus (Navigation Blueprint)

---

## 1. UNIFICAÇÃO DO LAYOUT MESTRE (`MainLayout.tsx`)

A fragmentação atual entre `Header.tsx`, `Sidebar.tsx` e `DashboardShell.tsx` será eliminada através de uma **Arquitetura de Navegação Unificada**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR GLOBAL (h-14, sticky top-0, z-40, bg-zinc-950/95 border-b border-border)       │
│ [BaseOS Logo] [Busca Global] [Atalho Rápido Súmula] [Notificações] [Perfil Usuário]    │
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ SIDEBAR DESKTOP   │ ÁREA DE CONTEÚDO PRINCIPAL (max-w-7xl mx-auto px-4 sm:px-6 py-6)  │
│ (w-64 ou w-18)    │ ┌────────────────────────────────────────────────────────────────┐ │
│                   │ │ BREADCRUMB CONTEXTUAL: Início > Competições > Copa Verão 2026 │ │
│ 1. Competições    │ ├────────────────────────────────────────────────────────────────┤ │
│ 2. Partidas       │ │                                                                │ │
│ 3. Súmulas        │ │ [PÁGINA ROTEADA COM HEADER, TABS, CARDS E TABELAS]             │ │
│ 4. Cadastros ▾    │ │                                                                │ │
│ 5. Relatórios     │ └────────────────────────────────────────────────────────────────┘ │
│ 6. Configurações  │                                                                    │
│ 7. Ajuda          │                                                                    │
├───────────────────┴────────────────────────────────────────────────────────────────────┤
│ BOTTOM NAVIGATION BAR (Apenas Mobile < 768px: [Início] [Jogos] [Súmula] [Menu ☰])     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. AGRUPAMENTO HIERÁRQUICO DA SIDEBAR DESKTOP

A Sidebar deixará de ser uma lista plana de 13 itens e passará a ter **5 grupos operacionais lógicos com suporte a colapso**:

```text
SIDEBAR HIERARQUIA OFICIAL
├── 1. PAINEL & COMPETIÇÕES
│   ├── Competições Ativas (/competicoes-ativas) [Ícone: Flame]
│   └── Todas as Competições (/competicoes) [Ícone: Trophy]
│
├── 2. OPERAÇÃO DE QUADRA
│   ├── Calendário de Partidas (/jogos) [Ícone: Volleyball]
│   ├── Súmula Digital (/sumulas) [Ícone: ClipboardList]
│   └── Sorteio & Chaveamento (/sorteio) [Ícone: Dices]
│
├── 3. CADASTROS DE BASE (Sanfona / Submenu)
│   ├── Equipes & Elencos (/equipes) [Ícone: Users]
│   ├── Atletas (/atletas) [Ícone: UserCheck]
│   ├── Praças Esportivas & Ginásios (/locais) [Ícone: Building2]
│   ├── Oficiais & Arbitragem (/pessoas) [Ícone: Users2]
│   └── Modalidades Esportivas (/modalidades) [Ícone: Sliders]  <-- ROTA RESGATADA
│
├── 4. DOCUMENTOS OFICIAIS
│   ├── Relatórios & Boletins (/relatorios) [Ícone: FileSpreadsheet]
│   └── Editor de Coordenadas de Súmula (/documentos/editor) [Ícone: FileEdit]  <-- ROTA RESGATADA
│
└── 5. SISTEMA
    ├── Configurações Gerais (/configuracoes) [Ícone: Settings]
    └── Central de Ajuda & Guia (/ajuda) [Ícone: HelpCircle]
```

---

## 3. NAVEGAÇÃO MOBILE EM QUADRA (BOTTOM NAVIGATION + DRAWER)

Para permitir a operação ágil de apontadores e técnicos com smartphones em ginásios:

1. **Bottom Navigation Bar Fixa (`fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-border h-14`)**:
   - 🏆 **Início**: Rota `/competicoes-ativas`
   - 🏐 **Jogos**: Rota `/jogos`
   - 📋 **Súmula**: Rota `/sumulas`
   - ☰ **Menu**: Abre Drawer lateral (`Sheet` do Radix UI) com Cadastros, Relatórios e Configurações.
2. **Design Otimizado para Toque**:
   - Cada botão possui dimensão mínima de `48px x 48px` com feedback tátil de toque.

---

## 4. SISTEMA UNIVERSAL DE BREADCRUMBS (`<BreadcrumbNav />`)

Todas as páginas secundárias e de detalhe exibirão a trilha navegável no topo do container:

```text
Exemplos de Trilha:
- Súmula ao Vivo:     Competições > Taça Brasil 2026 > Partidas > Jogo #14 (Súmula Digital)
- Homologação:        Competições > Campeonato Estadual > Inscrições de Equipes
- Sorteio de Chaves:  Competições > Superliga 2026 > Sorteio de Grupos
- Editor de Súmula:   Relatórios Oficiais > Editor de Layout de Súmula
```

---

## 5. RESGATE E INTEGRAÇÃO DE ROTAS ÓRFÃS

1. **`/modalidades` (`ModalitiesPage.tsx`)**:
   - Integrada permanentemente ao submenu de Cadastros na Sidebar e no Header.
2. **`/documentos/editor` (`DocumentEditorPage.tsx`)**:
   - Registrada em `src/App.tsx` sob a guarda de `<RequireAuth roles={['organizer']}>` e acessível a partir da Central de Relatórios (`/relatorios`).

# BASEOS — MASTER FRONTEND AUDIT
## 02. Auditoria de Navegação & Arquitetura da Informação (Navigation Audit)

---

## 1. DIAGNÓSTICO DOS SISTEMAS DE NAVEGAÇÃO EXISTENTES

O BaseOS possui atualmente **três estruturas de navegação concorrentes**, gerando fragmentação na experiência do usuário:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Header.tsx (Topo Desktop):                                          │
│    [Logo BaseOS] [Competições Ativas] [Cadastros ▾] [Partidas]         │
│                  [Relatórios] [Configurações] [Ajuda]                  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Sidebar.tsx (Barra Lateral Esquerda):                               │
│    13 itens planos sem agrupamento hierárquico.                        │
│    [Painel] [Competições] [Partidas] [Súmulas] [Equipes] [Atletas]     │
│    [Locais] [Sorteio] [Pessoas] [Estatísticas] [Relatórios]            │
│    [Configurações] [Central de Ajuda]                                  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DashboardShell.tsx (Topbar Isolada em /dashboard):                  │
│    Header proprietário com busca global e perfil "Operador Master"     │
│    sem links para as demais telas da aplicação.                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DISCREPÂNCIAS IDENTIFICADAS ENTRE HEADER E SIDEBAR

| Módulo / Rota | Presença no `Header.tsx` | Presença na `Sidebar.tsx` | Divergência Encontrada |
| :--- | :---: | :---: | :--- |
| **Competições Ativas** (`/competicoes-ativas`) | ✅ Link Direto | ⚠️ Chamado de "Painel" | Inconsistência de rótulo ("Competições Ativas" vs "Painel"). |
| **Súmulas** (`/sumulas`) | ❌ Apenas via Partidas | ✅ Link Primário | Na Sidebar há atalho direto para a súmula; no Header está embutido em Partidas. |
| **Sorteio** (`/sorteio`) | ❌ Ausente no Menu | ✅ Link Primário | Usuário que navega pelo Header não encontra o Sorteio no menu superior. |
| **Pessoas** (`/pessoas`) | ✅ "Árbitros e Oficiais" (`Users2`) | ⚠️ "Pessoas" com ícone de Prédio (`Building2`) | Erro de semântica visual: Sidebar usa ícone de prédio para cadastro de pessoas. |
| **Árbitros** (`/arbitros`) | ❌ Ausente | ❌ Ausente dos menus (apenas rota) | Rota `/arbitros` existe, mas não consta nos menus principais. |
| **Modalidades** (`/modalidades`) | ❌ Ausente | ❌ Ausente | Página funcional `/modalidades` não possui link em nenhum menu do sistema. |
| **Estatísticas** (`/estatisticas`) | ❌ Ausente | ✅ Link Primário | Módulo presente na Sidebar, mas omitido no Header. |

---

## 3. RESPOSTAS ÀS 7 PERGUNTAS DIRETIVAS DE NAVEGAÇÃO

### 1. O usuário entende onde está?
- **Parcialmente**. O item ativo recebe destaque visual nos menus (`bg-zinc-800` no Header e `bg-sidebar-primary` na Sidebar). No entanto, em páginas profundas (`/sumulas/:matchId`, `/competicoes/:id/inscricoes`), **a ausência de Breadcrumbs** impede que o operador saiba a qual competição ou fase o registro atual pertence.

### 2. O usuário sabe para onde ir?
- **Não com agilidade máxima**. O usuário que entra em uma competição precisa alternar entre abas internas, enquanto outro que entra por "Partidas" acessa os mesmos confrontos sem vínculo claro de retorno ao campeonato pai.

### 3. As funcionalidades estão agrupadas logicamente?
- **No Header: Sim** (agrupamento no dropdown "Cadastros").
- **Na Sidebar: Não** (13 itens enfileirados verticalmente misturando operações diárias de jogo com cadastros estáticos e configurações).

### 4. Existem menus duplicados?
- **Sim**. A aplicação possui a barra lateral colapsável `Sidebar.tsx` e a barra superior `Header.tsx` declaradas paralelamente. A maioria das páginas renderiza `MainLayout` (que contém apenas `Header`), tornando a `Sidebar` subutilizada no fluxo atual.

### 5. Existem páginas órfãs?
- **Sim**:
  1. `src/pages/DocumentEditorPage.tsx` (não registrada no roteador).
  2. `src/pages/ModalitiesPage.tsx` (registrada no roteador `/modalidades`, mas sem link nos menus).
  3. `src/pages/RefereesPage.tsx` (acessada somente por URL direta, pois o Header aponta para `/pessoas`).

### 6. Existem funcionalidades escondidas?
- **Sim**. A emissão de súmulas em branco (`BlankSheetEmitDialog`) está escondida dentro do menu de usuário no canto superior direito do Header e na página de relatórios.

### 7. Existem níveis excessivos de navegação?
- **Não em profundidade, mas sim em dispersão horizontal**. Existem muitas páginas irmãs sem hierarquia pai-filho clara.

---

## 4. AUDITORIA DA NAVEGAÇÃO MOBILE

1. **Menu Hambúrguer Atual**:
   - Funciona através de um Drawer sanfonado simples no `Header.tsx`.
   - **Problema**: Fecha automaticamente ao clicar e exige múltiplos toques para voltar à partida ativa durante um jogo ao vivo no ginásio.
2. **Ausência de Bottom Navigation (Barra Inferior)**:
   - Em smartphones (resoluções 375px a 480px), operadores de quadra utilizam o aparelho com uma única mão. A falta de uma barra inferior fixa para as 4 ações primárias (Início, Jogos, Súmula, Menu) reduz a velocidade de resposta.

---

## 5. PROPOSTA DE ARQUITETURA DE INFORMAÇÃO UNIFICADA (IA)

Seguindo as diretrizes da skill `baseos-navigation`:

```text
BASEOS ARQUITETURA DE INFORMAÇÃO
├── 1. PAINEL & COMPETIÇÕES (Core Operacional)
│   ├── Competições Ativas (/competicoes-ativas)
│   ├── Central do Campeonato (/competicoes)
│   │   ├── Visão Geral / Progresso
│   │   ├── Chaveamento & Mata-Mata
│   │   ├── Classificação (FIVB/CBV)
│   │   ├── Homologação de Inscrições (/competicoes/:id/inscricoes)
│   │   └── Sorteio de Grupos (/sorteio)
├── 2. PARTIDAS & SÚMULAS (Mesa de Quadra)
│   ├── Calendário & Jogos (/jogos)
│   ├── Mesa do Apontador ao Vivo (Modal /jogos)
│   ├── Súmula Digital (/sumulas/:matchId)
│   ├── Escalação Tática em Quadra (DND)
│   └── Placar para Telão (/jogos)
├── 3. CADASTROS DE APOIO (Módulos Base)
│   ├── Equipes & Elencos (/equipes)
│   ├── Atletas & Documentos (/atletas)
│   ├── Praças Esportivas & Quadras (/locais)
│   ├── Oficiais & Arbitragem (/pessoas)
│   └── Modalidades & Regras (/modalidades)  <-- Resgatada
├── 4. DOCUMENTOS & RELATÓRIOS (Saída Oficial)
│   ├── Boletins Oficiais (/relatorios)
│   ├── Quadro Geral de Premiação (/relatorios)
│   ├── Emissão de Súmulas PDF (/relatorios)
│   └── Editor de Layout de Súmulas (/documentos/editor)  <-- Resgatada
└── 5. SISTEMA & SUPORTE
    ├── Configurações & Usuários (/configuracoes)
    └── Central de Ajuda & Guia (/ajuda)
```

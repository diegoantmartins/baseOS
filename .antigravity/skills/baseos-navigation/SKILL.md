---
name: baseos-navigation
description: Information architecture, sidebar navigation, menus, submenus, breadcrumbs, routing, feature grouping, desktop/mobile responsive navigation for BaseOS.
---

# BaseOS — Arquitetura de Informação e Navegação

## Identidade da Skill

- **Nome**: baseos-navigation
- **Escopo**: Navegação principal, sidebar, menus de contexto, rotas (`react-router-dom`), breadcrumbs e navegação adaptativa desktop/mobile no BaseOS.
- **Objetivo**: Garantir que toda funcionalidade do sistema seja facilmente encontrável, agrupada logicamente e totalmente preservada durante reformulações de layout.

---

# 1. PROTOCOLO DE ALTERAÇÃO DE NAVEGAÇÃO

Ao ajustar ou reorganizar menus, rotas ou a estrutura de navegação do BaseOS, siga rigorosamente os 7 passos:

```text
PASSO 1: Mapear todas as rotas ativas em `src/App.tsx` e `src/pages/`
                      ↓
PASSO 2: Mapear todos os links e botões de navegação nos menus atuais
                      ↓
PASSO 3: Identificar duplicações ou redundâncias de navegação
                      ↓
PASSO 4: Identificar telas/funcionalidades escondidas ou órfãs
                      ↓
PASSO 5: Agrupar funcionalidades por contexto operacional esportivo
                      ↓
PASSO 6: Garantir a PRESERVAÇÃO TOTAL das rotas existentes
                      ↓
PASSO 7: Propor a estrutura refinada de arquitetura de informação
```

> **REGRA FUNDAMENTAL**: NUNCA remover uma rota ou link existente alegando ser "desnecessário" sem validação explícita.

---

# 2. AGRUPAMENTO CONTEXTUAL DAS FUNCIONALIDADES DO BASEOS

A navegação deve ser organizada nos seguintes pilares contextuais principais:

1. **Painel de Gestão (Dashboard & Visão Geral)**:
   - Resumo da competição ativa, próximas partidas, alertas de pendências.
2. **Competições & Torneios**:
   - Lista de campeonatos, categorias (Quadra/Praia), regulamentos, homologação, sorteio/chaveamento (`/draw`).
3. **Equipes & Atletas**:
   - Cadastro de equipes (`/teams`), controle de elencos, numeração de camisas, capitães e líberos.
4. **Partidas & Súmulas**:
   - Calendário de jogos, súmula digital ao vivo (3 e 5 sets), geração de PDF de súmulas (`/match`).
5. **Classificação & Estatísticas**:
   - Tabela de pontos (critérios FIVB/CBV), desempates, estatísticas individuais e coletivas.
6. **Suporte & Central de Ajuda**:
   - Tutoriais e artigos de ajuda (`helpArticles.ts`).

---

# 3. NAVEGAÇÃO DESKTOP VS. MOBILE

- **Desktop (Sidebar)**:
  - Sidebar lateral expansível/colapsável com ícones claros (`lucide-react`) e suporte a indicação da rota ativa (`bg-accent text-accent-foreground font-semibold`).
  - Submenus sanfonados para categorias dentro de competições.
- **Mobile (Drawer / Bottom Nav)**:
  - Menu inferior (Bottom Navigation) com as 4 rotas mais operacionais (Início, Partidas, Equipes, Menu).
  - Drawer lateral (`Sheet` do Radix UI) para acesso completo ao menu secundário e configurações.

---

# 4. BREADCRUMBS E CONTEXTO DE NAVEGAÇÃO

- Em páginas internas (ex: `/teams/:id` ou `/matches/:id`), sempre disponibilizar uma barra de **Breadcrumbs** clara no topo:
  - `Competições` > `Copa Verão 2026` > `Equipes` > `Vôlei Clube Alpha`
- Botão "Voltar" contexto seguro: sempre retorna à listagem pai, evitando loops de navegação.

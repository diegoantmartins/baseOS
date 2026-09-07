# 01 — System Discovery

## Visão Geral do Projeto BASEOS/VolleyPro

## Framework e Tecnologias

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.8.3 | Linguagem tipada |
| Vite | 5.4.19 | Bundler e dev server |
| React Router | 6.30.1 | Sistema de rotas |
| TanStack Query | 5.83.0 | Gerenciamento de estado server-side |
| Tailwind CSS | 3.4.17 | Framework CSS |
| Radix UI | vários | Componentes primitivos |
| Framer Motion | 12.29.0 | Animações |
| Supabase | 2.109.0 | Backend as a Service |
| Vitest | 3.2.4 | Framework de testes |
| Zod | 3.25.76 | Validação de esquemas |

## Estrutura de Pastas

```
src/
├── App.tsx                    # Router principal
├── components/
│   ├── auth/                 # Autenticação (AuthContext, RequireAuth)
│   ├── competition/          # Componentes de competição
│   ├── dashboard/            # Dashboard
│   ├── draw/                 # ✨ Componentes de sorteio
│   │   └── LiveDrawModal.tsx
│   ├── help/                 # Sistema de ajuda
│   ├── layout/               # Layout principal (MainLayout, Sidebar)
│   ├── navigation/           # Navegação (BottomNav)
│   └── ui/                   # Componentes base UI (Card, Button, etc.)
├── data/
│   ├── seed.ts               # Dados de demonstração
│   └── helpArticles.ts       # Artigos de ajuda
├── hooks/                    # Custom hooks
├── lib/                      # Utilitários (utils, PDF)
├── pages/
│   ├── DrawPage.tsx          # ✨ Página de sorteio
│   ├── MatchesPage.tsx       # Central de jogos
│   ├── StandingsPage.tsx    # Classificação
│   └── ... (outras páginas)
├── services/
│   ├── authService.ts       # Serviço de autenticação
│   ├── competitionReadinessService.ts
│   ├── competitionLifecycleService.ts
│   ├── dataAccess.ts         # ✨ Camada de acesso a dados
│   ├── drawService.ts        # ✨ Motor de sorteio
│   ├── playoffsService.ts    # Serviço de mata-mata
│   ├── registrationService.ts
│   ├── scheduleConflictService.ts
│   └── standingsService.ts   # Classificação
├── test/                     # ✨ Testes unitários
│   ├── drawService.test.ts
│   └── ...
└── types/
    ├── draw.ts               # ✨ Tipos do sorteio
    ├── entities.ts           # Tipos de entidades
    ├── registration.ts
    └── volleyball.ts
```

## Sistema de Rotas

### Rotas Públicas
- `/` — Página inicial (competições ativas)
- `/jogos` — Central de jogos
- `/classificacao` — Tabela de classificação
- `/login` — Login

### Rotas Protegidas (organizador)
- `/sorteio` — Página de sorteio
- `/sorteio/:competitionId` — Sorteio de competição específica
- `/competicoes` — Gestão de competições
- `/equipes` — Gestão de equipes
- `/jogos/novo` — Criar partida
- `/configuracoes` — Configurações

## Camada de Dados

### Arquitetura Adapter

O sistema utiliza um padrão adapter para abstração de dados:

```typescript
// src/services/dataAccess.ts
// Suporta duas implementações:
// 1. LocalStorage (modo demo)
// 2. Supabase (produção)
```

### Tabelas Relacionadas ao Sorteio

| Tabela | Descrição |
|--------|-----------|
| `draws` | Sorteios salvos |
| `competitions` | Competições |
| `teams` | Equipes |
| `competition_teams` | Relação equipe × competição |
| `matches` | Partidas geradas |

## Sistema de Autenticação

- **AuthProvider** — Provedor de contexto de autenticação
- **RequireAuth** — Componente HOC para rotas protegidas
- **Perfis**: `organizer` (organizador), `athlete` (atleta)
- Supabase Auth integrado

## Componentes UI Principais

| Componente | Biblioteca | Uso |
|------------|------------|-----|
| Card | shadcn/ui | Containers |
| Button | shadcn/ui | Botões |
| Select | shadcn/ui | Dropdowns |
| Checkbox | shadcn/ui | Seleção múltipla |
| RadioGroup | shadcn/ui | Seleção única |
| Dialog/Modal | Radix UI | Modais |
| Drag-and-Drop | @dnd-kit | Reordenação |

## Estado da Aplicação

- **Server State**: TanStack Query (competitions, teams, matches, draws)
- **Local State**: useState/useReducer nos componentes
- **Persistência**: LocalStorage (demo) / Supabase (produção)

## Scripts Disponíveis

```bash
npm run dev        # Desenvolvimento
npm run build      # Build de produção
npm run lint       # ESLint
npm test           # Vitest (testes unitários)
```

## Contexto do Módulo de Sorteio

O módulo de sorteio está inserido no fluxo de gerenciamento de competições:

1. Competição criada → status: `planning`
2. Inscrições abertas → status: `registration-open`
3. Inscrições fechadas → status: `registration-closed`
4. **Sorteio pendente → status: `draw-pending`** ← MÓDULO DE SORTEIO
5. Grupos definidos → status: `groups-defined`
6. Competição em andamento → status: `in-progress`
7. Playoffs → status: `playoffs`
8. Finalizada → status: `completed`

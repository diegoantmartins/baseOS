# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 09. Arquitetura de Componentes & Regras Anti-Inconsistência (Component Architecture)

---

## 1. HIERARQUIA DE DIRETÓRIOS DE COMPONENTES

A arquitetura do BaseOS segue uma estrutura de responsabilidades em camadas concêntricas:

```text
src/components/
├── ui/              # Camada 1: Primitivos Headless/Styled shadcn (Button, Dialog, Input, Table, etc.)
├── common/          # Camada 2: Componentes Compartilhados Universais (StateContainer, PageHeader, SportsScoreBadge)
├── layout/          # Camada 3: Estrutura Global (MainLayout, Header, Sidebar, BottomNav, BreadcrumbNav)
└── domain/          # Camada 4: Módulos Especializados de Negócio Esportivo
    ├── competition/ # (CompetitionHeader, LifecycleStepper, StandingsTab, BracketTab, ReadinessModal)
    ├── match/       # (MatchCard, ScheduleMatchDialog, LiveScorerDeskModal, LiveScoreboardModal, CourtLineupDnd)
    ├── match-sheet/ # (MatchSheetInterface, SetScoreHistory, RotationMatrix)
    ├── team/        # (TeamCard, TeamRosterTable, TeamTransferModal, TeamShareDialog)
    ├── draw/        # (LiveDrawModal, SeededGroupCard, BracketRenderer)
    ├── report/      # (ReportPreviewDialog, ScoresheetEmitModal)
    ├── settings/    # (RbacSettings, AuditLogsTable, BackupManager)
    └── help/        # (ContextualHelpButton, HelpArticleModal, HelpArticleViewer)
```

---

## 2. REGRAS ANTI-INCONSISTÊNCIA (GOVERNANÇA DO CÓDIGO)

Para garantir que o BaseOS não volte a acumular dívida técnica visual, o blueprint estabelece **8 Regras de Ouro de Governança**:

1. **⛔ Não Criar Estilos Inline Arbitrários**: Proibido o uso de classes como `w-[327px]`, `bg-[#1a2b3c]` ou `mt-[17px]`. Use sempre a escala de tokens do Tailwind (`gap-4`, `p-6`, `bg-card`).
2. **⛔ Não Criar Modais Customizados se o Dialog Atender**: Toda caixa de diálogo deve utilizar o primitivo `<Dialog>` ou `<AlertDialog>` do shadcn/ui.
3. **⛔ Não Usar Cores Hardcoded sem Justificativa**: Proibido o uso de cores como `bg-purple-500` para identificar papéis. Use os tokens semânticos e variantes oficiais.
4. **⛔ Não Duplicar Diálogos de Confirmação**: Todas as ações destrutivas ou de avanço de fase devem utilizar o componente centralizado `<ConfirmActionDialog />`.
5. **⛔ Não Reinventar Tabelas de Classificação**: Toda exibição de classificação esportiva deve reutilizar `<StandingsTable />` com as colunas oficiais.
6. **⛔ Não Fazer Fetching de Dados sem Tratar os 4 Estados**: Toda requisição assíncrona deve conectar-se ao `<StateContainer />` fornecendo `isLoading`, `isError` e `isEmpty`.
7. **⛔ Não Alterar Regras de Negócio em Componentes**: Componentes de UI apenas disparam ações para os serviços em `src/services/` e consomem dados via `src/services/dataAccess.ts`.
8. **⛔ Não Criar Botões Fora do CVA**: Toda variação visual de botão deve ser registrada e tipada formalmente dentro de `src/components/ui/button.tsx`.

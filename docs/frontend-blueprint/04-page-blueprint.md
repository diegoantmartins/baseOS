# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 04. Especificação de Redesign Tela a Tela (Page Blueprint)

---

Abaixo está o plano arquitetural de redesign e organização de cada uma das telas do BaseOS, eliminando arquivos monolíticos e elevando a experiência para um SaaS esportivo de elite.

---

### 1. `ActiveCompetitionsPage.tsx` (Central de Campeonatos Ativos)
- **Layout**: `MainLayout` com Sidebar colapsável e Topbar global.
- **Estrutura Proposta**:
  1. *Header de Ação*: Título, busca com debounce e botão primário único "Nova Competição".
  2. *Barra de Filtros*: Componente `<ToggleGroup>` para alternar entre "Todas", "Vôlei de Quadra" e "Vôlei de Praia".
  3. *Grid de Cards Operacionais*: Cada card de competição exibirá:
     - Badge de status com ponto indicador pontual (`in-progress`, `playoffs`, `registration-open`).
     - Badge de prontidão (`evaluateCompetitionReadiness`) com percentual `tabular-nums`.
     - Métricas em linha: Equipes inscritas, Jogos concluídos / Total, Etapas cumpridas.
     - Próxima Ação recomendada destacada em box de alto contraste.
     - Barra de progresso discreta de 2px na base do card.
  4. *Tratamento Universal de Estados*: Encapsulado no componente `<StateContainer />` com Skeletons estruturados e tela de erro amigável em falhas de rede.

---

### 2. `Dashboard` / `Index.tsx` (Visão Panorâmica Operacional)
- **Layout**: Migrado do isolado `DashboardShell.tsx` para o container oficial `MainLayout.tsx`.
- **Estrutura Proposta**:
  1. *KPI Cards Reais*: Substituir métricas estáticas por dados calculados via `dataAccess` (Total de equipes ativas, Jogos agendados para hoje, Súmulas pendentes de homologação).
  2. *Feed de Próximas Partidas*: Lista horizontal/vertical dos jogos das próximas 4 horas com atalho direto para a mesa do apontador.
  3. *Central de Alertas Operacionais*: Avisos de conflitos de quadra, pendências de check-in e prazos de inscrição expirando.

---

### 3. `MatchesPage.tsx` (Gestão de Partidas & Mesa de Quadra)
- **Desacoplamento Arquitetural**: O arquivo de 1.278 linhas será decomposto em:
  - `src/components/match/MatchesFilterBar.tsx` (Filtros por fase, grupo, ginásio e data).
  - `src/components/match/MatchCard.tsx` (Card de partida com placar, parciais e status).
  - `src/components/match/ScheduleMatchDialog.tsx` (Diálogo de criação/edição com detector de conflitos).
  - `src/components/match/EditResultDialog.tsx` (Lançamento rápido de placar).
- **Abas Principais**:
  - `Grade Completa`: Lista cronológica de jogos por rodada.
  - `Fase de Grupos`: Visualização dos confrontos divididos por chave (Grupo A, B, C, D).
  - `Eliminatórias (Playoffs)`: Árvore visual de mata-mata conectada com botão de sincronização de classificados.
  - `Ao Vivo (Mesa do Apontador)`: Partidas com status `in-progress` em destaque para controle rápido de pontos.

---

### 4. `MatchSheetPage.tsx` (Súmula Digital, Tática & Social)
- **Estrutura Proposta**:
  1. *Header do Jogo*: Equipe A vs Equipe B, ginásio, árbitros e formato oficial (3 ou 5 sets).
  2. *Divisão em 3 Abas Operacionais*:
     - **Aba Súmula Digital**: Componente `MatchSheetInterface` com botões táteis gigantes de pontuação, cronômetro de tempo técnico, alternância de sacador e registro de substituições.
     - **Aba Escalação em Quadra**: Componente `CourtLineupDnd` permitindo arrastar os atletas titulares para as posições de rotação 1 a 6 da meia-quadra.
     - **Aba Card para Redes**: Gerador visual de imagem para Instagram/WhatsApp com placar final e patrocinadores.
  3. *Preview Lateral de PDF*: Exibição em tempo real do PDF oficial preenchido (`officialScoresheetPdf`), sincronizado com as anotações do apontador.

---

### 5. `CompetitionsPage.tsx` (Central de Gestão do Campeonato)
- **Desacoplamento Arquitetural**: O arquivo de 1.194 linhas será decomposto em:
  - `src/components/competition/CompetitionLifecycleStepper.tsx` (Avanço de etapas: Rascunho ➔ Inscrições ➔ Sorteio ➔ Em Andamento ➔ Mata-mata ➔ Finalizada).
  - `src/components/competition/CompetitionStandingsTab.tsx` (Classificação com os 8 critérios de desempate).
  - `src/components/competition/CompetitionBracketTab.tsx` (Chaveamento eliminatório).
  - `src/components/competition/CompetitionTeamsTab.tsx` (Equipes inscritas e homologação).
  - `src/components/competition/CompetitionSettingsTab.tsx` (Regulamento, formato de sets, pontuação por vitória).

---

### 6. `TeamsPage.tsx` & `AthletesPage.tsx` (Clubes e Atletas)
- **Estrutura Proposta**:
  - *Visão Dual*: Alternância perfeita entre Grid de Cards e Tabela Densa com ordenação por colunas.
  - *Gestão de Elencos*: Controle de camisas únicas (1-99), 1 capitão, até 2 líberos e documentação.
  - *Transferências*: Modal seguro de transferência de atletas entre equipes com histórico.

---

### 7. `PeoplePage.tsx` (Quadro Unificado de Oficiais & RH)
- **Consolidação**: Absorver a página duplicada `RefereesPage.tsx` dentro do módulo unificado de Pessoas.
- **Visual**: Substituir as cores pastel claras por badges semânticos escuros com identificação de funções múltiplas (Árbitro Internacional, Apontador, Delegado, Técnico).

---

### 8. `DrawPage.tsx` (Sorteio ao Vivo Determinístico)
- **Visual**: Painel estilo transmissão com geração de grupos em tempo real, suporte a cabeças de chave e arrasto DND suave com sensores táteis calibrados para tablets.

---

### 9. `ReportsPage.tsx` & `DocumentEditorPage.tsx` (Documentos Oficiais)
- **Integração**: Conectar o editor WYSIWYG de coordenadas de súmulas (`DocumentEditorPage.tsx`) na rota `/documentos/editor`, permitindo ajustes milimétricos dos templates em PDF diretamente pelo painel.

---

### 10. `SettingsPage.tsx` (Configurações, RBAC & Segurança)
- **Desacoplamento**: Dividir em módulos independentes:
  - `RbacSettings`: Gestão de permissões de organizador, árbitro e dirigente.
  - `AuditSecurityLogs`: Tabela com paginação dos eventos de segurança registrados pelo `AuditService`.
  - `DataBackupManager`: Exportação e importação de backups e reset de dados seed para demonstrações.

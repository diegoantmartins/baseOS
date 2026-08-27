# BASEOS — MASTER FRONTEND AUDIT
## 09. Auditoria de Experiência Operacional Esportiva (Sports UX Audit)

---

## 1. O DOMÍNIO DO BASEOS: GESTÃO DE VOLEIBOL PROFISSIONAL

O BaseOS foi concebido para atender organizadores, delegados, árbitros e apontadores sob alta pressão de tempo em ginásios e arenas. A interface precisa entregar máxima **legibilidade, agilidade operacional e fidelidade aos regulamentos oficiais (FIVB e CBV)**.

---

## 2. RESPOSTAS ÀS 7 PERGUNTAS DIRETIVAS DE PRODUTO

### 1. O usuário consegue realizar as operações rapidamente?
- **Na Mesa do Apontador e Súmula**: **Sim**. O modal de mesa ao vivo (`LiveScorerDeskModal`) e a súmula eletrônica (`MatchSheetInterface`) permitem pontuar com toques amplos e alternar sacadores e tempos técnicos com 1 clique.
- **No Agendamento de Jogos**: **Parcialmente**. O modal de edição de partidas possui muitos campos manuais que poderiam ser pré-preenchidos automaticamente com base na rodada e no ginásio padrão.

### 2. A interface prioriza as informações mais importantes?
- **Sim**. Placar atual, sets conquistados, parciais e status da partida (Em andamento, Agendado, Finalizado) recebem destaque tipográfico.

### 3. A informação esportiva é facilmente escaneável?
- **Sim nas listagens de jogos**, mas **precisa de melhoria nas tabelas de classificação**, onde as siglas (J, V, D, SP, SC, SD, PP, PC, SP, PTS) necessitam de tooltips explicativos e números tabulares (`tabular-nums`) para leitura rápida em quadra.

### 4. Placares são legíveis?
- **Sim**. As parciais utilizam contraste adequado. Recomenda-se apenas garantir `tabular-nums` e o estilo clássico `25-21, 22-25, 15-12`.

### 5. Status de partidas são claros?
- **Sim**. O sistema de indicadores por cores semânticas contidas (Âmbar para Ao Vivo, Verde para Homologado/Finalizado, Zinc para Agendado) é altamente eficiente e não polui visualmente a tela.

### 6. Classificações são compreensíveis?
- **Sim**. O motor em `standingsService.ts` calcula com precisão matemática os 8 critérios de desempate (Pontos FIVB/CBV, Vitórias, Confronto Direto, Set Average, Points Average, Saldo de Sets, Saldo de Pontos e Sorteio).

### 7. O usuário sabe qual ação executar a seguir?
- **Na Visão Geral de Campeonatos (`ActiveCompetitionsPage.tsx` e `CompetitionsPage.tsx`)**: **Excelente**. O componente `CompetitionReadinessModal` e o box de "Próxima Ação" orientam exatamente o que falta (ex: "Sortear grupos", "Homologar súmula", "Definir confrontos de mata-mata").

---

## 3. AVALIAÇÃO DOS MÓDULOS ESPECÍFICOS DE VOLEIBOL

| Módulo Esportivo | Avaliação UX | Pontos Fortes | Oportunidades de Melhoria |
| :--- | :---: | :--- | :--- |
| **Súmulas Digitais (3 e 5 Sets)** | **9.0 / 10** | Geração fiel de PDF A4 P&B para impressão oficial e visualização interativa com histórico de pontos. | Unificar os diálogos de emissão de súmula em branco e preenchida. |
| **Escalação em Quadra (`CourtLineupDnd`)** | **8.5 / 10** | Visualização da meia-quadra de vôlei com as 6 posições de rotação (1 a 6) e indicação do sacador. | Inserir indicação de líbero e capitão diretamente na miniatura da quadra. |
| **Sorteio Determinístico (`DrawPage`)** | **9.0 / 10** | Algoritmo com seed determinístico, suporte a cabeças de chave e arrasto DND em tempo real. | Expor o atalho do sorteio no menu superior do Header. |
| **Inscrições & Elenco (`TeamRoster`)** | **8.5 / 10** | Validação em tempo real de 1 capitão, até 2 líberos, camisas 1-99 e bloqueio automático por prazo. | Remover classes legadas `bg-indoor` do cabeçalho do portal público. |
| **Detector de Conflitos (`scheduleConflictService`)** | **9.0 / 10** | Alerta em tempo real de choque de horário na mesma quadra ou mesma equipe jogando em horários próximos. | Exibir o alerta com badge visual destacado no card do jogo. |

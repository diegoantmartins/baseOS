# BASEOS — MASTER FRONTEND AUDIT
## 05. Auditoria de Responsividade & Dispositivos Móveis (Responsive Audit)

---

## 1. MATRIZ DE COMPORTAMENTO POR FAIXA DE RESOLUÇÃO

Auditoria técnica do comportamento das telas do BaseOS nas principais faixas de resolução utilizadas por organizadores e operadores de quadra:

```text
┌─────────────────┬───────────────────┬────────────────────────────────────────────────────────┐
│ Resolução       │ Dispositivo Tipo  │ Diagnóstico de Comportamento                           │
├─────────────────┼───────────────────┼────────────────────────────────────────────────────────┤
│ 1440px+         │ Monitores Grandes │ Layout com max-w-7xl centralizado. Boa densidade.       │
│ 1280px (Desktop)│ Laptops padrão    │ Resolução ótima. Todos os elementos visíveis.          │
│ 1024px (Laptop) │ iPad Pro Paisagem │ Sidebar colapsável precisa de espaço; Header OK.       │
│ 768px (Tablet)  │ iPad Mesa Quadra  │ Ponto crítico: Tabelas de classificação sofrem aperto. │
│ 640px (Mobile G)│ Smartphones Pais. │ Quebra de grids de 2 colunas para 1 coluna.            │
│ 480px / 375px   │ Smartphone Padrão │ Tabelas estouram sem scroll; modais sem ScrollArea.    │
└─────────────────┴───────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. PROBLEMAS CRÍTICOS IDENTIFICADOS EM TELAS MENORES (375px A 768px)

### A. Tabelas Densas sem Scroll Horizontal Delimitado (P1)
- **Onde**: `src/components/competition/StandingsTable.tsx`, `src/pages/AthletesPage.tsx`, `src/pages/SettingsPage.tsx` (tabela de logs de auditoria).
- **Problema**: As tabelas contêm entre 8 e 12 colunas (Jogos, Vitórias, Derrotas, Sets Pró, Sets Contra, Saldo Sets, Pontos Pró, Pontos Contra, Saldo Pontos, Pontuação). Em resoluções < 768px, as células são comprimidas ou provocam rolagem horizontal na tela inteira (`overflow-x` na janela do navegador), desestruturando o cabeçalho.
- **Solução Recomendada**:
  1. Envolver as tabelas em `<div className="overflow-x-auto scrollbar-thin">`.
  2. Implementar visualização adaptativa: em mobile, exibir formato de **Card Resumo de Equipe** com accordion para detalhes secundários.

### B. Modais Longos com Transbordo Vertical (P1)
- **Onde**: `src/pages/SettingsPage.tsx` (criação de usuário), `src/pages/CompetitionsPage.tsx` (criação e edição de regulamento), `src/components/match/CreateMatchForm.tsx`.
- **Problema**: Quando o teclado virtual do smartphone é aberto sobre o formulário, o botão de "Salvar" no `DialogFooter` fica inacessível abaixo da viewport sem possibilidade de rolagem suave.
- **Solução Recomendada**:
  - Adicionar `max-h-[85vh]` e encapsular o corpo do modal dentro do componente `<ScrollArea>` do Radix UI.

### C. Drag and Drop no Sorteio e Escalação Tática (`@dnd-kit`) (P2)
- **Onde**: `src/pages/DrawPage.tsx` e `src/components/match/CourtLineupDnd.tsx`.
- **Diagnóstico**: O BaseOS configurou corretamente o `TouchSensor` com `delay: 150ms` e `tolerance: 5px`, permitindo arrastar atletas para as 6 posições da quadra em tablets.
- **Oportunidade**: Adicionar indicador visual sutil (ex: ícone de `GripVertical` pulsante) indicando ao usuário que o elemento pode ser arrastado por toque.

### D. Ausência de Bottom Navigation Bar em Mobile (P2)
- **Problema**: No uso em smartphones à beira da quadra, o operador precisa esticar o polegar até o topo da tela para abrir o menu hambúrguer a cada ação.
- **Solução Recomendada**: Implementar barra de navegação inferior fixa (`fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-border`) exibindo:
  - 🏆 Competições
  - 🏐 Partidas / Súmula
  - 👥 Equipes
  - ☰ Menu Completo

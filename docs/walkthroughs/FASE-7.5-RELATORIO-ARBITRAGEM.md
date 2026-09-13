# BASEOS — FASE 7.5 — WALKTHROUGH DE IMPLEMENTAÇÃO
## ESCALA OFICIAL DE ARBITRAGEM E OFICIAIS DE MESA

**Data:** 12 de Setembro de 2026  
**Sistema:** BaseOS — Sports Intelligence  
**Ambiente:** DEV Local exclusivamente  
**Produção (VOLTZ):** `https://voltz.baseos.online` — **TOTALMENTE CONGELADA / INTOCADA**  
**Status Final:** **GO**  

---

## 1. O QUE FOI ANALISADO

Antes de qualquer implementação ou escrita de código, foi realizada inspeção profunda nos seguintes componentes do sistema:

1. **Contratos e Entidades de Domínio (`src/types/entities.ts`):**
   * Verificado o formato de armazenamento dos oficiais em partidas (`MatchRecord.referees: MatchRefereeRecord[]`).
   * Constatado que cada item possui formato `{ role: string, name: string }`.
   * Mapeados os papéis canônicos previstos em `src/services/refereeAssignmentService.ts` (`1º Árbitro`, `2º Árbitro`, `Apontador`, `Apontador Assistente`, `Juiz de Linha 1`, `Juiz de Linha 2`).
   * Inspecionado o status de ciclo de vida de partidas (`MatchLifecycleStatus`), identificando os estados válidos (`'scheduled'`, `'in-progress'`, `'completed'`, `'homologated'`, `'cancelled'`).

2. **Acesso a Dados (`src/services/dataAccess.ts`):**
   * Confirmado que os métodos canônicos `dataAccess.listMatches()`, `dataAccess.listCompetitions()`, `dataAccess.listTeams()` e `dataAccess.listReferees()` atendem 100% da necessidade de leitura sem requisições N+1 e sem necessidade de novas tabelas, RPCs ou migrations.

3. **Arquitetura de Relatórios (`src/pages/ReportsPage.tsx` e `src/components/report/`):**
   * Inspecionado o fluxo unificado de View Models (onde HTML e PDF compartilham exatamente as mesmas estruturas tipadas).
   * Inspecionado o seletor `ReportSelector.tsx` com categorias temáticas e contadores contextuais.
   * Analisado o sistema de navegação contextual via `searchParams` (`competitionId` como SSOT e parâmetro `report`).

4. **Motor de PDF e Branding (`src/lib/pdf/`):**
   * Inspecionado o gerador `reportsPdf.ts`.
   * Confirmada a existência de cabeçalhos e rodapés institucionais com marcação legada `'VOLLEYPRO'` na linha 164.
   * Definida a estratégia de substituição cirúrgica no relatório e na base de relatórios para utilizar a identidade canônica BaseOS:
     * Título institucional: `BASEOS`
     * Subtítulo: `SPORTS INTELLIGENCE · SISTEMA OFICIAL`

5. **Página de Árbitros (`src/pages/RefereesPage.tsx`):**
   * Inspecionada a tela de gestão da arbitragem para inclusão de acesso direto ao novo relatório operacional.

---

## 2. O QUE FOI ALTERADO

Abaixo está o registro detalhado de cada arquivo modificado e criado:

### 2.1 [MODIFICADO] `src/lib/pdf/types.ts`
* **Função/Interface:** Adicionada e exportada a interface `RefereesScheduleRow`.
* **Motivo:** Tipar o View Model unificado da escala oficial de arbitragem e oficiais de mesa compartilhado entre a visão HTML e o gerador de PDF.
* **Campos:** `matchNumber`, `round`, `phase`, `groupName`, `date`, `time`, `venue`, `court`, `teamAName`, `teamAShort`, `teamALogo`, `teamBName`, `teamBShort`, `teamBLogo`, `statusLabel`, `firstReferee`, `secondReferee`, `scorer`, `assistantScorer`, `lineJudges`, `hasOfficials`.

### 2.2 [MODIFICADO] `src/lib/pdf/reportsPdf.ts`
* **Função/Componente:**
  1. Atualizado cabeçalho institucional em `docHeader` e rodapé em `footer`: substituição de `'VOLLEYPRO'` por `'BASEOS'` e `'SPORTS INTELLIGENCE · SISTEMA OFICIAL'`.
  2. Adicionada a função pura `parseMatchReferees(referees)`: normaliza nomes, papéis e ausências de oficiais.
  3. Implementada a função `generateRefereesSchedulePdf(rows, competitionName, orgName)`: renderiza a escala oficial em A4 Retrato com 7 colunas balanceadas (186mm de largura total) e caixas de assinatura para a Coordenação de Arbitragem e Diretoria Técnica.
* **Motivo:** Fornecer suporte nativo à exportação de PDF institucional de alta qualidade estética, sem dependência de rede externa e com identidade BaseOS.

### 2.3 [MODIFICADO] `src/lib/pdf/index.ts`
* **Função/Componente:** Re-exportação de `RefereesScheduleRow`, `generateRefereesSchedulePdf` e `parseMatchReferees`.
* **Motivo:** Manter a integridade do padrão barrel export da camada PDF.

### 2.4 [MODIFICADO] `src/components/report/ReportSelector.tsx`
* **Função/Componente:** Inclusão de `'arbitragem'` no tipo de união `ReportType` e registro do card "Escala Oficial de Arbitragem" com ícone `UserCheck` na categoria "Documentos Oficiais & Premiação".
* **Motivo:** Permitir ao organizador alternar para o novo relatório de forma nativa e intuitiva na interface.

### 2.5 [NOVO] `src/components/report/RefereesScheduleReportView.tsx`
* **Função/Componente:** Componente React HTML-first responsável pela visualização interativa da escala de arbitragem.
* **Recursos:**
  * 4 Cards operacionais de resumo no topo: Total de Partidas, Escala Completa, Designação Parcial e Sem Escala.
  * Filtro rápido integrado aos cards de resumo (permite clicar para filtrar instantaneamente partidas por status da escala).
  * Tabela rica para Desktop e Tablet com crachás de status, confronto com logos/siglas e oficiais destacados.
  * Cards verticais para dispositivos móveis (< 768px) garantindo legibilidade perfeita sem scroll horizontal quebrado.
  * Estado vazio claro quando não há partidas cadastradas.

### 2.6 [MODIFICADO] `src/pages/ReportsPage.tsx`
* **Função/Componente:**
  1. Suporte ao parâmetro `report=arbitragem` no estado `activeReport`.
  2. Implementação do `refereesScheduleRows` via `useMemo` com ordenação operacional cronológica (data, hora, local, quadra, número do jogo).
  3. Suporte à exportação de PDF (`generateRefereesSchedulePdf`).
  4. Suporte à exportação de planilha CSV da escala de arbitragem (`exportArbitragemCsv`).
  5. Suporte ao compartilhamento contextual (`handleShare`).
  6. Renderização condicional de `<RefereesScheduleReportView rows={refereesScheduleRows} />`.
* **Motivo:** Integrar a experiência HTML-first, exportação e ações da Central de Relatórios.

### 2.7 [MODIFICADO] `src/pages/RefereesPage.tsx`
* **Função/Componente:** Adicionado botão de ação secundária "Relatório Oficial" no `PageHeader`, navegando diretamente para `/relatorios?report=arbitragem`.
* **Motivo:** Conectar operacionalmente o módulo de gestão de árbitros à Central de Relatórios.

### 2.8 [NOVO] `src/test/refereesScheduleReport.test.tsx`
* **Função/Componente:** Suíte completa com 12 testes unitários e de componentes cobrindo os 10 cenários obrigatórios do Prompt 2.
* **Motivo:** Garantir homologação automatizada, regressão zero e validação de contratos.

### 2.9 [MODIFICADO] `src/test/reportsPage.test.tsx`
* **Função/Componente:** Atualizado o mock de `@/lib/pdf/reportsPdf` para utilizar `importActual`, preservando funções auxiliares de relatórios.
* **Motivo:** Prevenir falhas em testes legados que renderizam o `ReportsPage`.

---

## 3. DECISÕES TÉCNICAS

1. **Modelo de Dados Real Utilizado:**
   * Utilizado exclusivamente o array `MatchRecord.referees` existente.
   * Não foi criada nenhuma tabela nem coluna nova no banco.

2. **Resolução de Oficiais:**
   * Função funcional `parseMatchReferees` normaliza os papéis com expressões regulares resilientes (ex.: `/1º|primeiro|1st|principal/i`).
   * Designações incompletas ou ausentes são preenchidas como `'—'` e exibidas como "— A definir" em itálico discreto na interface e no PDF.
   * Partidas sem arbitragem continuam sendo exibidas normalmente com status "Pendente", sem interromper o fluxo da aplicação.

3. **Renderer de PDF Escolhido:**
   * Utilizado `jsPDF` em `reportsPdf.ts`, mantendo 100% de consistência com os demais relatórios da Central (Boletim, Classificação, Relação Nominal e Pódio).
   * Evitada migração prematura da Central inteira para `@react-pdf/renderer`, reduzindo drasticamente o risco técnico e preservando estabilidade.

4. **Formato do PDF:**
   * **A4 Retrato:** 7 colunas perfeitamente calculadas com larguras em milímetros somando exatamente os 186mm da área útil (`CONTENT_WIDTH`):
     * Jogo (14mm), Data/Hora (26mm), Quadra/Local (24mm), Confronto (46mm), 1º Árbitro (26mm), 2º Árbitro (25mm), Apontador/Mesa (25mm).
   * Paginação automática via `pageBreakIfNeeded` e assinaturas ao final do documento para Coordenação de Arbitragem e Diretoria Técnica.

5. **Estratégia de Ordenação Operacional:**
   * Ordenação rigorosa por:
     1. Data e horário cronológico (`scheduledTime`);
     2. Local/Ginásio (`venue`);
     3. Quadra (`court`);
     4. Número do jogo (`matchNumber`).

6. **Estratégia Responsiva:**
   * Desktop e Notebooks (1366×768, 1280×720): tabela completa de alta densidade.
   * Tablets (1024×768): tabela legível com quebras suaves de linhas secundárias.
   * Mobile (390×844, 375×812): cards operacionais por partida com blocos claros para confronto, horários e lista de oficiais.

7. **Estratégia de Branding:**
   * Substituído o branding legado no novo relatório e no gerador PDF associado.
   * Identidade visual e tipográfica oficial: `BASEOS · SPORTS INTELLIGENCE`.
   * Nenhuma ocorrência da marca antiga foi introduzida no novo relatório nem no seu PDF.

---

## 4. TESTES AUTOMATIZADOS EXECUTADOS

### 4.1 Suíte Focada (`src/test/refereesScheduleReport.test.tsx`)
Comando:
```bash
npx vitest run src/test/refereesScheduleReport.test.tsx
```
Resultado:
```text
 ✓ src/test/refereesScheduleReport.test.tsx (12 tests) 857ms
   ✓ parseMatchReferees > Cenário 1: Extrai arbitragem completa
   ✓ parseMatchReferees > Cenário 2: Partida sem oficiais retorna traço e hasOfficials falso
   ✓ parseMatchReferees > Cenário 3: Designação parcial preenche apenas os oficiais existentes
   ✓ RefereesScheduleReportView > Cenário 4: Renderiza múltiplas partidas com métricas consolidadas
   ✓ RefereesScheduleReportView > Cenário 5: Exibe múltiplas quadras corretamente nas linhas da tabela
   ✓ RefereesScheduleReportView > Cenário 6: Exibe múltiplas datas corretamente nas linhas da tabela
   ✓ RefereesScheduleReportView > Cenário 8: Competição sem partidas exibe estado vazio claro
   ✓ RefereesScheduleReportView > Filtra interativamente por status de escala
   ✓ generateRefereesSchedulePdf > Cenário 10: Gera PDF oficial com orientação retrato A4 e assinaturas
   ✓ generateRefereesSchedulePdf > Cenário 10 (vazio): Gera PDF com estado de sem escalas sem crash
   ✓ generateRefereesSchedulePdf > Cenário 9: Não emite VolleyPro no PDF ou no documento
   ✓ ReportsPage — Integração > Cenário 7: Ordena partidas cronologicamente e renderiza via URL

 Test Files  1 passed (1)
      Tests  12 passed (12)
```

### 4.2 Suíte de Regressão da Central de Relatórios e Arbitragem
Comando:
```bash
npx vitest run src/test/refereesScheduleReport.test.tsx src/test/reportsHtmlContextual.test.tsx src/test/reportsPdf.test.ts src/test/refereesPage.test.tsx src/test/reportsPage.test.tsx
```
Resultado:
```text
 Test Files  5 passed (5)
      Tests  46 passed (46)
   Start at  15:47:39
   Duration  22.06s
```

---

## 5. TESTES DE REGRESSÃO GLOBAL

### 5.1 Checagem de Tipos TypeScript
Comando:
```bash
npx tsc -p tsconfig.app.json --noEmit
```
Resultado:
```text
Código de saída: 0 (Zero erros).
```

### 5.2 Linter ESLint
Comando:
```bash
npm run lint
```
Resultado:
```text
Código de saída: 0 (Zero erros; 1 warning pré-existente de react-refresh/useMemo em DrawArenaCanvas).
```

### 5.3 Build de Produção
Comando:
```bash
npm run build
```
Resultado:
```text
Código de saída: 0 (Build gerado com sucesso em dist/ em 45.19s).
```

---

## 6. VALIDAÇÃO FUNCIONAL MANUAL NO DEV

Foram validados no ambiente de desenvolvimento local os seguintes cenários:

1. **Acesso à rota:** `/relatorios?competitionId=...&report=arbitragem`.
2. **Exibição do Seletor:** Card "Escala Oficial de Arbitragem" selecionável na categoria "Documentos Oficiais & Premiação", com contagem sincronizada.
3. **Métricas operacionais no topo:** Cards com Total, Completa, Parcial e Sem Escala atualizados em tempo real conforme filtros de fase e gênero.
4. **Filtro interativo por clique:** Clicar em "Escala Completa" filtra instantaneamente a listagem para exibir apenas partidas completas.
5. **Designação Parcial e Partidas Sem Escala:** As partidas são apresentadas com clareza, exibindo "— A definir" sem qualquer quebra visual ou erro em console.
6. **Exportação de PDF:**
   * Gerado arquivo `escala_arbitragem_campeonato-....pdf`.
   * Cabeçalho institucional: `BASEOS · SPORTS INTELLIGENCE`.
   * Colunas perfeitamente alinhadas em A4.
   * Assinaturas de homologação presentes.
   * Nenhuma ocorrência de `VolleyPro`.
7. **Exportação de CSV:** Planilha com todos os dados da escala gerada e baixada com sucesso.
8. **Relatórios legados:**
   * Boletim Geral de Jogos: Funcionando 100%.
   * Classificação por Grupos: Funcionando 100%.
   * Relação Nominal: Funcionando 100%.
   * Pódio e Encerramento: Funcionando 100%.
   * Súmulas e documentos: Funcionando 100%.

---

## 7. LIMITAÇÕES REAIS E REGISTRO TÉCNICO

* **Mapeamento de Atletas Árbitros:** O modelo atual armazena o nome do oficial no array de partida (`name`). Caso o organizador altere o nome do oficial no cadastro mestre (`referees`), partidas já gravadas mantêm o snapshot histórico do nome salvo, o que é um comportamento padrão de súmula/escala esportiva.
* **Escopo Estrito:** Os relatórios de "Programação Diária / Ordem dos Jogos" e "Equipe → Atletas" não foram iniciados e aguardam as próximas fases conforme determinado pelo plano diretor.

---

## 8. CONFIRMAÇÃO DE PRODUÇÃO CONGELADA

> **PRODUÇÃO VOLTZ NÃO FOI ACESSADA, MODIFICADA OU IMPLANTADA.**
> 
> Todas as ações, testes, compilações e validações ocorreram estritamente no ambiente de desenvolvimento local (DEV). Nenhum comando SSH, acesso remoto, alteração de banco ou deploy em `https://voltz.baseos.online` foi executado.

---

## 9. STATUS FINAL

```text
GO
```

O recurso **Escala Oficial de Arbitragem e Oficiais de Mesa** está 100% implementado, testado, integrado à Central de Relatórios e homologado para uso no BaseOS.

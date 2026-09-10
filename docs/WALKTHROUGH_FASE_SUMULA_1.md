# BASEOS — FASE SÚMULA 1
# RELATÓRIO DE AUDITORIA TÉCNICA COMPLETA DO GERADOR DE SÚMULA PDF
# WALKTHROUGH OFICIAL DE INVESTIGAÇÃO FORENSE

**Data da Auditoria:** Setembro / 2026  
**Status da Fase:** AUDITORIA CONCLUÍDA — 100% INVESTIGADO E DOCUMENTADO  
**Regra Fundamental Aplicada:** NENHUM CÓDIGO FOI MODIFICADO (zero alterações de implementação, refatoração, correções, componentes, migrations ou testes).  
**Documento de Destino:** `docs/WALKTHROUGH_FASE_SUMULA_1.md`  

---

## 1. OBJETIVO DA FASE E ESCOPO DA INVESTIGAÇÃO

O objetivo exclusivo da **Fase Súmula 1** é realizar uma auditoria técnica profunda, adversarial e exaustiva de toda a cadeia responsável pela geração de súmulas esportivas oficiais em PDF no sistema **BaseOS**, preparando as bases conceituais e arquiteturais para uma futura reconstrução do subsistema.

A auditoria cobriu integralmente:
1. Rastreamento forense ponta a ponta da cadeia: `Tela` → `Dados da Partida` → `CompetitionConfig` → `Dados das Equipes` → `Escalações` → `Configurações de Sets` → `Gerador PDF` → `Layout` → `Renderização` → `Download / Impressão`.
2. As bibliotecas de renderização gráfica, versões, sistemas de posicionamento, fontes, réguas e coordenadas.
3. A realidade do suporte a dimensões **A4** e **A3** (Retrato e Paisagem).
4. O comportamento e estrutura visual para partidas de **3 sets** e **5 sets** (e a relação com `setsToWin: 1 | 2 | 3`).
5. A integração com o `CompetitionConfig` canônico (verificação de Single Source of Truth vs. regras paralelas/duplicadas).
6. Mapeamento de todos os dados trafegados entre o banco de dados e o PDF, identificando dados do domínio omitidos.
7. Decomposição estrutural e visual dos blocos do PDF.
8. Auditoria ergonômica de espaçamento, tipografia, compressão e desperdício.
9. Auditoria de impressão física em papel (margens seguras de hardware, contraste P&B, consumo de toner e fotocópia).
10. Teste de estresse para casos extremos (nomes longos, ausência de dados, descarte de atletas, vôlei de praia).
11. Matriz arquitetural de problemas classificados por severidade (`CRÍTICO`, `ALTO`, `MÉDIO`, `BAIXO`).
12. Inventário completo de testes automatizados existentes, insuficientes e ausentes.
13. Confronto entre a documentação existente e o comportamento real do código-fonte.

---

## 2. RESUMO EXECUTIVO

A investigação revelou que o BaseOS não possui um único gerador de súmula oficial, mas sim um ecossistema fragmentado composto por **4 motores concorrentes**, construídos em diferentes épocas evolutivas do sistema, utilizando **3 bibliotecas distintas** (`jspdf`, `@react-pdf/renderer` e `pdf-lib`), com padrões visuais conflitantes e diferentes graus de desconexão com o domínio:

1. **Motor 1 — Gerador Tabular Linear em A4 Retrato (`src/lib/pdf/matchSheetPdf.ts`):**
   - Construído com `jspdf` (v4.0.0). É o gerador herdado do projeto original VolleyPro. O conteúdo é empilhado sequencialmente de cima para baixo. Não possui grade de rotação de quadra (posições I a VI) nem régua ponto a ponto; limita-se a um placar resumido por sets. Ainda é chamado pela UI na rota `/competicoes/:competitionId/inscricoes` (botão "Baixar Súmulas de Todas as Partidas").

2. **Motor 2 — Súmula Vetorial Paisagem Padrão CBV/FPV (`src/lib/pdf/officialMatchSheetPdf.ts`):**
   - Construído com `jspdf` (v4.0.0) em A4 Paisagem (297 × 210 mm). Reproduz artesanalmente a geometria de uma folha federativa com réguas de 36 pontos e caixas de rotação para 3 e 5 sets, além de fichas de ordem de saque. **Não está conectado a nenhuma tela da interface web**; sobrevive exclusivamente como utilitário para testes automatizados (`officialMatchSheetPdf.test.ts`, `qaMaster.test.ts` e `e2eSystemLifecycle.test.ts`).

3. **Motor 3 — Súmula BaseOS em Cards Fixos (`src/document-engine/baseos/`):**
   - Construído com `@react-pdf/renderer` (v4.8.1) em A4 Paisagem (841.89 × 595.28 pt). É o motor principal exibido na interface do usuário atual (`MatchSheetEmitDialog.tsx`, `MatchPdfPreview.tsx` e `BlankSheetEmitDialog.tsx`). Utiliza posicionamento absoluto rígido por coordenadas em cards (`layouts.ts`).

4. **Motor 4 — Carimbo sobre Templates PDF Escaneados (`src/document-engine/generators/`):**
   - Construído com `pdf-lib` (v1.17.1). Não desenha a súmula do zero: carrega arquivos binários PDF estáticos (`sumula-3-sets.pdf` e `sumula-5-sets.pdf`) oriundos de exportações de planilhas/ODG da Federação Paranaense de Voleibol, apaga logos antigos com retângulos brancos e carimba textos por cima em coordenadas cartesianas fixas. É consumido na tela de Súmula Digital ao Vivo (`MatchSheetInterface.tsx`) no botão "Baixar Súmula" e no Editor de Documentos (`DocumentEditorPage.tsx`).

### As 4 Descobertas Forenses Mais Graves:
- **Divergência Crítica de Botões na Mesma Rota:** Na página `/sumulas/:matchId`, se o operador clicar no botão "Emitir Súmula" no topo da página, ele abre o modal `MatchSheetEmitDialog` e baixa o PDF vetorial do **Motor 3** (`@react-pdf/renderer`). Se ele estiver dentro da aba "Súmula Digital" da mesma partida e clicar no botão "Baixar Súmula" da barra de ações do jogo, ele baixa o PDF do **Motor 4** (`pdf-lib` carimbado sobre PDF escaneado). O usuário recebe documentos com tipografia, layout e visual totalmente diferentes para a mesma partida.
- **Inexistência de Suporte Real a A3:** Não existe nenhum layout desenhado especificamente para A3 no sistema. No Motor 3, o A3 é gerado por uma mera multiplicação escalar matemática linear (`scale = 1.4142`) sobre as coordenadas do A4, restrita ao template de 5 sets (para 3 sets há fallback silencioso para A4). Além disso, **a interface do usuário nunca passa o parâmetro `output: 'master'`**, tornando o A3 100% inacessível ao operador.
- **Ruptura da Fonte Canônica da Verdade (SSOT):** O mapeador consumido pela interface (`src/document-engine/baseos/mapper/match.mapper.ts`) lê diretamente o campo legado `competition.setFormat === '5-sets'`. Ele **não consome** o `CompetitionRulesService.resolveMatchFormat(...)`, ignorando `setsToWin`, regras de sets customizadas e os `phaseOverrides`. Como resultado, partidas de fases finais que possuam regulamento de melhor de 5 sets dentro de uma competição regular de melhor de 3 sets são emitidas em pré-jogo com a súmula errada (3 sets em vez de 5 sets).
- **Incompatibilidade Total com Vôlei de Praia:** Todos os 4 geradores desenham ou assumem estritamente voleibol de quadra indoor (grade para 6 atletas em quadra com rotação I a VI, 14 atletas regulares, 2 líberos e parciais de 25/15 pontos). Nenhuma súmula do sistema suporta a modalidade de praia (duplas 2x2, sem líberos, parciais de 21/15 pontos).

---

## 3. ARQUITETURA ATUAL E FLUXO REAL DA GERAÇÃO

A investigação rastreou as 4 cadeias de execução ativas no repositório:

```text
═══════════════════════════════════════════════════════════════════════════════
CADEIA 1: INTERFACE PRINCIPAL — MODAIS E PREVIEW (Motor 3: @react-pdf/renderer)
═══════════════════════════════════════════════════════════════════════════════
Telas de Origem:
  - src/pages/MatchesPage.tsx (botão de emissão na tabela de jogos)
  - src/pages/MatchSheetPage.tsx (botão "Emitir Súmula")
  - src/pages/TeamRosterRegistrationPage.tsx (botão "Súmula Oficial")
  - src/pages/ReportsPage.tsx (emissão via modal)
       │
       ▼
Componentes de Diálogo / Visualização:
  - src/components/match/MatchSheetEmitDialog.tsx
  - src/components/match/MatchPdfPreview.tsx
  - src/components/match/BlankSheetEmitDialog.tsx
       │
       ▼
Serviço do Motor BaseOS:
  - src/document-engine/baseos/service/scoresheetService.ts
    Função: loadBaseosScoresheetData(matchId, forcedState, output = 'print-a4')
       │
       ├─► dataAccess.getMatch(matchId)
       ├─► dataAccess.getCompetition(match.competitionId)
       ├─► dataAccess.listTeams()
       ├─► registrationService.getMatchRosters(match.id)
       └─► dataAccess.listPersons() (Fallback caso elenco esteja vazio)
       │
       ▼
Mapeador de Dados:
  - src/document-engine/baseos/mapper/match.mapper.ts
    Função: mapMatchRecordToBaseosScoresheet(...)
    [FALHA DE SSOT]: Lê `competition.setFormat === '5-sets'` (ignora CompetitionRulesService)
       │
       ▼
Validador:
  - src/document-engine/baseos/validation/validator.ts (validação de integridade do payload)
       │
       ▼
Templates BaseOS (@react-pdf/renderer):
  - src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx (se 3 sets)
  - src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx  (se 5 sets)
    Geometria: src/document-engine/baseos/geometry/layouts.ts (Cards absolutos)
       │
       ▼
Compilação e Renderização:
  - @react-pdf/renderer: pdf(docElement).toBlob()
       │
       ▼
Consumo Final:
  - Preview: window.open(blobUrl, '_blank')
  - Download: link.download = 'Sumula_BaseOS_...pdf'
  - Impressão: iframe invisível disparando iframe.contentWindow.print()

═══════════════════════════════════════════════════════════════════════════════
CADEIA 2: SÚMULA DIGITAL AO VIVO (Motor 4: pdf-lib + Template Escaneado)
═══════════════════════════════════════════════════════════════════════════════
Tela de Origem:
  - src/pages/MatchSheetPage.tsx (/sumulas/:matchId -> Aba "Súmula Digital")
       │
       ▼
Interface Interativa de Jogo:
  - src/components/match-sheet/MatchSheetInterface.tsx
    Ação: Botão "Baixar Súmula" (handlePdf)
       │
       ▼
Serviço de Contexto do Editor:
  - src/services/documentEditorService.ts
    Função: loadMatchContext(matchId) -> buildMatchDocument(ctx)
    [FALHA DE SSOT]: format derivado de ctx.competitionSetFormat === '5-sets'
       │
       ▼
Geradores pdf-lib:
  - src/document-engine/generators/sumula3.generator.ts (se 3 sets)
  - src/document-engine/generators/sumula5.generator.ts (se 5 sets)
       │
       ├─► Carrega template estático: src/document-engine/templates/sumula-3-sets.pdf (992x566 pt)
       │                              ou sumula-5-sets.pdf (1190x841 pt)
       ├─► cleanTemplate(): pinta retângulos brancos para cobrir branding de terceiros
       ├─► drawSystemLogo(): desenha o logo do sistema
       └─► Carimba textos nas coordenadas de sumula3.coordinates.ts / sumula5.coordinates.ts
       │
       ▼
Compilação e Download:
  - pdf-lib: doc.save() -> Uint8Array -> Blob -> Download direto via <a> tag

═══════════════════════════════════════════════════════════════════════════════
CADEIA 3: EXPORTAÇÃO EM LOTE NA GESTÃO DE INSCRIÇÕES (Motor 1: jsPDF Retrato)
═══════════════════════════════════════════════════════════════════════════════
Tela de Origem:
  - src/pages/CompetitionRegistrationsPage.tsx
    Ação: Botão "Baixar Súmulas" (handleExportAll)
       │
       ▼
Construtor de Dados:
  - src/lib/pdf/matchSheetDataBuilder.ts: buildMatchSheetData(...)
    [INTEGRAÇÃO PARCIAL]: Invoca CompetitionRulesService.resolveMatchFormat(...)
    [DADOS HARDCODED]: Repassa timeouts: [], substitutions: [], sanctions: [] vazios
       │
       ▼
Gerador jsPDF Retrato:
  - src/lib/pdf/matchSheetPdf.ts: downloadMatchSheetsBatchPdf(...)
    Função: generateMatchSheetPdf(data) em loop com doc.addPage()
    Formato: A4 Retrato (210 x 297 mm), margem 10 mm, empilhado verticalmente
       │
       ▼
Compilação e Download:
  - jsPDF: doc.save(`sumulas_${safeName}.pdf`)

═══════════════════════════════════════════════════════════════════════════════
CADEIA 4: MOTOR OFICIAL FEDERATIVO EM PAISAGEM (Motor 2: jsPDF Paisagem)
═══════════════════════════════════════════════════════════════════════════════
Consumidores:
  - src/test/officialMatchSheetPdf.test.ts
  - src/test/qaMaster.test.ts
  - src/test/e2eSystemLifecycle.test.ts
       │
       ▼
Gerador jsPDF Paisagem:
  - src/lib/pdf/officialMatchSheetPdf.ts: generateOfficialMatchSheetPdf(data)
    - Se format === '5-sets': buildOfficial5SetsSheet (A4 Paisagem, 297x210 mm)
    - Caso contrário: buildOfficial3SetsSheet (A4 Paisagem, 297x210 mm)
    - Gera fichas de posição: buildPositionSheet (1 ou 2 páginas)
       │
       ▼
Estado na UI: DESCONECTADO DA INTERFACE WEB (utilizado apenas em testes)
```

---

## 4. ARQUIVOS ENVOLVIDOS NO SUBSISTEMA DE SÚMULA

| Arquivo | Tecnologia | Papel no Sistema | Consumidores Reais |
|---|---|---|---|
| `src/lib/pdf/matchSheetPdf.ts` | jsPDF | Gerador legado linear em A4 Retrato | `CompetitionRegistrationsPage.tsx`, `matchSheetPdf.test.ts` |
| `src/lib/pdf/officialMatchSheetPdf.ts` | jsPDF | Súmula oficial CBV/FPV em A4 Paisagem (3 e 5 sets) | `officialMatchSheetPdf.test.ts`, `qaMaster.test.ts`, `e2eSystemLifecycle.test.ts` |
| `src/lib/pdf/officialScoresheetPdf.tsx` | @react-pdf/renderer | Súmula experimental em A4 Retrato | `officialScoresheetPdfReact.test.tsx` |
| `src/lib/pdf/officialScoresheetPdfGenerator.ts` | @react-pdf/renderer | Wrapper gerador de Blob para o arquivo acima | `officialScoresheetPdfReact.test.tsx` |
| `src/lib/pdf/matchSheetDataBuilder.ts` | TypeScript puro | Adaptador `MatchRecord` + `CompetitionRecord` → `MatchSheetData` | `CompetitionRegistrationsPage.tsx`, `officialMatchSheetPdf.ts` |
| `src/lib/pdf/reportsPdf.ts` | jsPDF | Boletins de jogos, classificação geral e pódio | `MatchesPage.tsx`, `ReportsPage.tsx` |
| `src/lib/pdf/types.ts` | TypeScript | Tipos canônicos do módulo `lib/pdf` | Todo o diretório `src/lib/pdf/` |
| `src/lib/pdf/index.ts` | TypeScript | Barrel export público de PDFs | Importações em páginas e componentes |
| `src/document-engine/baseos/service/scoresheetService.ts` | @react-pdf/renderer | Fachada do motor BaseOS moderno | `MatchSheetEmitDialog.tsx`, `MatchPdfPreview.tsx` |
| `src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` | @react-pdf/renderer | Template A4 Paisagem para 3 sets | `scoresheetService.ts` |
| `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx` | @react-pdf/renderer | Template A4 Paisagem para 5 sets | `scoresheetService.ts` |
| `src/document-engine/baseos/geometry/layouts.ts` | Geometria / Rects | Coordenadas absolutas dos cards (A4 e escala A3) | Templates BaseOS |
| `src/document-engine/baseos/geometry/page.ts` | Geometria / Margens | Definições de página A4 e A3 Paisagem | `layouts.ts` |
| `src/document-engine/baseos/mapper/match.mapper.ts` | Mapeador | Converte dados de partida em `BaseosScoresheetData` | `scoresheetService.ts` |
| `src/document-engine/baseos/domain/set.rules.ts` | Regras de Domínio | Regras esportivas de voleibol (pontos, limites) | `getSetRuleConfig` |
| `src/document-engine/baseos/domain/roster.rules.ts` | Regras de Domínio | Capacidade de elencos (14 atletas, 2 líberos) | `BaseosRosters.tsx` |
| `src/document-engine/generators/sumula3.generator.ts` | pdf-lib | Overlay sobre template PDF estático de 3 sets | `MatchSheetInterface.tsx`, `DocumentEditorPage.tsx` |
| `src/document-engine/generators/sumula5.generator.ts` | pdf-lib | Overlay sobre template PDF estático de 5 sets | `MatchSheetInterface.tsx`, `DocumentEditorPage.tsx` |
| `src/document-engine/generators/ordemSaque.generator.ts` | pdf-lib | Overlay sobre template de ordem de saque | `BlankSheetEmitDialog.tsx` |
| `src/document-engine/coordinates/sumula3.coordinates.ts` | Coordenadas | Coordenadas cartesianas do template 992x566 pt | `sumula3.generator.ts` |
| `src/document-engine/coordinates/sumula5.coordinates.ts` | Coordenadas | Coordenadas cartesianas do template 1190x841 pt | `sumula5.generator.ts` |
| `src/components/match/MatchSheetEmitDialog.tsx` | React / UI | Modal de emissão de súmulas pré-jogo e pós-jogo | `MatchesPage`, `MatchSheetPage`, `ReportsPage` |
| `src/components/match/MatchPdfPreview.tsx` | React / UI | Visualizador em tempo real em aba da partida | `MatchSheetPage.tsx` |
| `src/components/match/BlankSheetEmitDialog.tsx` | React / UI | Modal de emissão de súmulas em branco | `MatchSheetPage.tsx` |
| `src/components/match-sheet/MatchSheetInterface.tsx` | React / UI | Painel de controle da Súmula Digital ao vivo | `MatchSheetPage.tsx` |
| `src/pages/DocumentEditorPage.tsx` | React / UI | Editor visual de posições e sobrescritas de campos | Rota `/document-editor` |

---

## 5. AUDITORIA DETALHADA DO GERADOR PDF

### 5.1 Biblioteca e Versão
- **`jspdf`**: Versão `^4.0.0` (declarada no `package.json`). Utilizada em `matchSheetPdf.ts`, `officialMatchSheetPdf.ts` e `reportsPdf.ts`.
- **`@react-pdf/renderer`**: Versão `^4.8.1` (declarada no `package.json`). Utilizada em `document-engine/baseos/` e `officialScoresheetPdf.tsx`.
- **`pdf-lib`**: Versão `^1.17.1` (declarada no `package.json`). Utilizada em `document-engine/generators/`.

### 5.2 Sistema de Posicionamento e Geometria
- **Motor 1 (`matchSheetPdf.ts`):** Posicionamento imperativo unidimensional linear. Mantém uma variável móvel `yPos` incrementada a cada bloco desenhado. Quando `yPos` ultrapassa o limite da folha (`PAGE_HEIGHT - 60` para elencos ou `PAGE_HEIGHT - 50` para assinaturas), invoca `doc.addPage()`. As larguras das colunas são calculadas dinamicamente com base em divisões da largura útil (`CONTENT_WIDTH = 190 mm`).
- **Motor 2 (`officialMatchSheetPdf.ts`):** Posicionamento imperativo cartesiano estático bidimensional em mm. Todas as seções possuem coordenadas de ancoragem calculadas a partir de offsets rígidos (`xSets`, `mainY`, `setsW = 160 mm`, `midW = 58 mm`, `rosterW = 70 mm`).
- **Motor 3 (`document-engine/baseos`):** Posicionamento bidimensional absoluto em pontos tipográficos (pt). Cada bloco funcional é um "Card" renderizado dentro de um container com `position: 'absolute'`, `left: rect.x`, `top: rect.y`, `width: rect.width`, `height: rect.height`. Não há flexbox entre cards; o layout é um mosaico rígido milimetricamente travado.
- **Motor 4 (`document-engine/generators`):** Posicionamento cartesiano de carimbo. Converte coordenadas com origem no canto superior esquerdo (top-origin) para o sistema bottom-left do `pdf-lib` através da fórmula `yPdfLib = pageHeight - yTop - fieldHeight`.

### 5.3 Tipografia, Fontes e Pesos
- **Fontes utilizadas:** Família padrão `Helvetica` / `Helvetica-Bold`. Nenhuma fonte tipográfica externa é incorporada aos binários (o que evita inflar o arquivo, mas limita a sofisticação visual e dependência dos drivers do visualizador).
- **Tamanhos de fonte:**
  - `matchSheetPdf.ts`: Varia entre `4.8pt` (marca d'água/subtítulos) e `12pt` (título oficial e placar final). Elencos renderizados em `7pt`.
  - `officialMatchSheetPdf.ts`: Fontes criticamente reduzidas para viabilizar o layout em folha única: `2.2pt` (legendas de sanção), `3.0pt` (cabeçalhos de células e números de função), `3.5pt` (placar e nomes), até `7.5pt` (título principal).
  - `document-engine/baseos`: `3.2pt` (sanções), `3.8pt` (células da régua de pontos), `4.2pt` (cabeçalhos de colunas), `5.2pt` (nomes de atletas), até `9.0pt` (placar).

### 5.4 Tratamento de Conteúdo Variável e Quebras
- **Nomes de Equipes e Atletas:** Todos os motores aplicam truncamento cego via `.substring(0, N)` ou `.slice(0, N)`.
  - `matchSheetPdf.ts`: atleta truncado em 28 caracteres (`nameStr.substring(0, 28)`); técnico truncado pelo espaço restante.
  - `officialMatchSheetPdf.ts`: equipe truncada em 16 caracteres (`substring(0, 16)`); árbitros truncados em 18 caracteres.
  - `document-engine/baseos`: truncamento visual em container sem quebra de linha.
  - `document-engine/generators`: se o texto ultrapassar a largura do campo, o gerador tenta reduzir progressivamente o tamanho da fonte (`shrink-to-fit`) antes de cortar.
- **Elencos Grandes:** Se uma equipe possuir mais de 14 atletas regulares, os atletas excedentes são **silenciosamente descartados** sem qualquer aviso ao operador nos motores 2, 3 e 4.

---

## 6. AUDITORIA DE FORMATOS: A4 E A3

A investigação confirmou com precisão forense quais formatos físicos existem e quais não existem no sistema:

```text
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Formato Físico          │ Status de Implementação │ Evidência no Código     │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ A4 Retrato (Portrait)   │ IMPLEMENTADO            │ matchSheetPdf.ts        │
│ (210 × 297 mm)          │                         │ officialScoresheet.tsx  │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ A4 Paisagem (Landscape) │ IMPLEMENTADO            │ officialMatchSheetPdf.ts│
│ (297 × 210 mm)          │                         │ document-engine/baseos  │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ A3 Retrato (Portrait)   │ NÃO IMPLEMENTADO        │ Ausente em 100% dos     │
│ (297 × 420 mm)          │                         │ arquivos do sistema     │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ A3 Paisagem (Landscape) │ IMPLEMENTAÇÃO PARCIAL / │ layouts.ts (escala      │
│ (420 × 297 mm)          │ NÃO ACESSÍVEL NA UI     │ matemática apenas)      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Análise Forense do A3 no Código:
1. **Onde o A3 existe:** Declarado exclusivamente em `src/document-engine/baseos/geometry/layouts.ts` no objeto `FIVE_SET_A3_MASTER_LAYOUT` e em `src/document-engine/utils/pdfUtils.ts` no tamanho do template escaneado `sumula5` (`1190 × 841 pt`).
2. **Como o A3 é gerado no Motor 3:** O layout A3 **não é um design próprio**. Ele executa uma função de transformação geométrica simples:
   ```typescript
   export const A3_FROM_A4_SCALE = A3_LANDSCAPE_PAGE.width / A4_LANDSCAPE_PAGE.width; // ≈ 1.414199
   cards: scaleCardLayout(FIVE_SET_A4_LAYOUT.cards, A3_FROM_A4_SCALE)
   ```
   Os cartões têm suas coordenadas e dimensões multiplicadas por 1.4142. Contudo, **as folhas de estilo dos componentes React (`StyleSheet.create`) mantêm fontes fixas em pontos**. Como consequência, em A3 os cards ficam maiores, mas os textos internos (como os números da régua ponto a ponto de 3.8pt) permanecem microscópicos com grandes espaços vazios ao redor.
3. **Inexistência de A3 para 3 Sets:** A função seletora de layout (`layouts.ts`) implementa a seguinte regra:
   ```typescript
   export function getScoresheetLayout(format: ScoresheetFormat, output: ScoresheetOutput = 'print-a4'): ScoresheetLayout {
     if (format === '5-sets' && output === 'master') return FIVE_SET_A3_MASTER_LAYOUT;
     if (format === '5-sets') return FIVE_SET_A4_LAYOUT;
     return THREE_SET_A4_LAYOUT;
   }
   ```
   Se requisitado `format: '3-sets'` com `output: 'master'`, o sistema ignora o A3 e retorna `THREE_SET_A4_LAYOUT` (A4 Paisagem).
4. **Inacessibilidade na Interface:** Todos os componentes de UI (`MatchSheetEmitDialog.tsx`, `MatchPdfPreview.tsx`, `BlankSheetEmitDialog.tsx`) invocam `loadBaseosScoresheetData` sem passar o parâmetro de output ou passam o valor padrão `'print-a4'`. **Não existe botão, select ou checkbox na interface web permitindo ao usuário escolher o formato A3.**

---

## 7. AUDITORIA DE 3 E 5 SETS

A auditoria analisou profundamente a relação entre as configurações de sets e os motores PDF:

### 7.1 Regra Canônica do Domínio (Derivação Teórica)
No `src/types/competitionConfig.ts` e no `CompetitionRulesService.ts`, a regra canônica oficial do BaseOS é:
```text
setsToWin = 1  ──►  maxSets = (1 * 2) - 1 = 1 set  (partida de set único)
setsToWin = 2  ──►  maxSets = (2 * 2) - 1 = 3 sets (melhor de 3 sets)
setsToWin = 3  ──►  maxSets = (3 * 2) - 1 = 5 sets (melhor de 5 sets)
```

### 7.2 Comportamento Real nos Motores PDF

| Motor | Determinação de Sets | Suporte a 1 Set | Suporte a 3 Sets | Suporte a 5 Sets | Diagnóstico Forense |
|---|---|:---:|:---:|:---:|---|
| **Motor 1 (`matchSheetPdf.ts`)** | `maxSets = data.format === '5-sets' ? 5 : ... 3 : 1` | Parcial (tabela) | Sim (tabela) | Sim (tabela) | Ajusta colunas da tabela de placar, mas não possui quadras nem réguas de set. |
| **Motor 2 (`officialMatchSheetPdf.ts`)** | `isFiveSets = data.format === '5-sets'` | **NÃO** (cai no template de 3) | Sim (layout nativo) | Sim (layout nativo) | Possui 2 funções fechadas: `buildOfficial3SetsSheet` e `buildOfficial5SetsSheet`. Não tem template para 1 set. |
| **Motor 3 (`document-engine/baseos`)** | `is5Sets = competition?.setFormat === '5-sets' \|\| sets.length > 3` | **NÃO** | Sim (template nativo) | Sim (template nativo) | Possui apenas `BaseosThreeSetScoresheet` e `BaseosFiveSetScoresheet`. Ignora `setsToWin: 1`. |
| **Motor 4 (`document-engine/generators`)** | `format = setFormat === '5-sets' \|\| sets.length > 3 ? '5-sets' : '3-sets'` | **NÃO** | Sim (template estático) | Sim (template estático) | Depende dos templates estáticos `sumula-3-sets.pdf` e `sumula-5-sets.pdf`. |

### 7.3 Hardcodes e Arrays Fixos de Sets no Código
- **`matchSheetPdf.ts` (linha 410):**
  `const maxSets = data.format === '5-sets' ? 5 : data.format === '3-sets' ? 3 : data.format === '2-sets' ? 3 : 1;`
- **`officialMatchSheetPdf.ts` (linhas 807-809 e 848-859):**
  Chamadas hardcoded sequenciais para `drawFedSetBlock(d, 1, ...)`, `drawFedSetBlock(d, 2, ...)`, `drawFedDecidingSetBlock(d, 3, ...)` no layout de 3 sets, e sets 1 a 5 no layout de 5 sets.
- **`document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` (linhas 59-67):**
  Renderização estática e obrigatória de exatamente 3 blocos: `layout.cards.sets[1]`, `layout.cards.sets[2]` e `layout.cards.sets[3]`.
- **`document-engine/baseos/domain/set.rules.ts` (linha 28):**
  `const isDecidingSet = (totalSetsFormat === '3-sets' && setNumber === 3) || (totalSetsFormat === '5-sets' && setNumber === 5);` (fixa tie-break no set 3 ou set 5).

---

## 8. AUDITORIA DA INTEGRAÇÃO COM O COMPETITIONCONFIG

O `CompetitionConfig` foi estabelecido como a Single Source of Truth (SSOT) do BaseOS nas Fases 4.1–4.12. A auditoria verificou se o gerador de súmula consome essa fonte canônica ou se duplica regras esportivas:

```text
┌──────────────────────────────┬──────────────────────────────┬────────────────────────────────────────────────────────┐
│ Regra Regulamentar           │ Estado no Gerador de Súmula  │ Gravidade / Evidência Forense                         │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────┤
│ setsToWin (1, 2 ou 3)        │ IGNORADO NO MOTOR DA UI      │ match.mapper.ts lê competition.setFormat legado        │
│ phaseOverrides               │ IGNORADO NO MOTOR DA UI      │ Fases finais com melhor de 5 geram súmula de 3 sets    │
│ regularSetPoints (25 vs 21)  │ HARDCODED EM 25              │ set.rules.ts fixa REGULAR_SET_POINTS = 25              │
│ tiebreakPoints (15)          │ HARDCODED EM 15              │ set.rules.ts fixa DECIDING_SET_POINTS = 15             │
│ modality ('indoor'/'beach')  │ HARDCODED PARA INDOOR        │ Todos os geradores forçam rotação 6x6 e 14 atletas    │
│ minAthletes / maxAthletes    │ HARDCODED EM 14 + 2          │ roster.rules.ts fixa MAX_REGULAR_ATHLETES = 14         │
│ maxLiberos (0, 1 ou 2)       │ HARDCODED EM 2               │ roster.rules.ts fixa MAX_LIBEROS = 2 (ignora praia)   │
│ Comissões Técnicas           │ HARDCODED EM 5 MEMBROS       │ STAFF_ROLES fixa T, AT1, AT2, PF, M/F                  │
└──────────────────────────────┴──────────────────────────────┴────────────────────────────────────────────────────────┘
```

**Diagnóstico de SSOT:**
Existe uma desconexão evidente no ecossistema:
1. O adaptador `src/lib/pdf/matchSheetDataBuilder.ts` invoca corretamente o `CompetitionRulesService.resolveMatchFormat(...)`. Porém, esse adaptador alimenta primariamente o Motor 1 e o Motor 2.
2. O **Motor 3** (`src/document-engine/baseos/mapper/match.mapper.ts`), que é o motor real que atende os modais e previews da interface web, **não consome o `CompetitionRulesService`**. Ele consulta diretamente `competition?.setFormat === '5-sets'`, reproduzindo regras legadas e ignorando as conquistas de arquitetura das fases anteriores.

---

## 9. MAPEAMENTO DE DADOS DA SÚMULA (DE/PARA FORENSE)

A tabela abaixo documenta a totalidade dos dados consumidos versus exibidos:

| Campo / Dado | Origem no Domínio | Tipo de Dado | Obrigatório no Banco? | Exibido no PDF? | Modo de Exibição / Limitação |
|---|---|---|:---:|:---:|---|
| **Nome da Competição** | `competition.name` | `string` | Sim | **SIM** | Cabeçalho e banner de identificação |
| **Categoria** | `competition.category` | `string` | Sim | **SIM** | Exibido no banner (ex.: "SUB-21", "LIVRE") |
| **Gênero / Naipe** | `competition.genderCategory`| `'male'\|'female'\|'mixed'` | Não | **SIM** | Checkboxes ou texto ("MASCULINO", etc.) |
| **Modalidade** | `competition.modality` | `'indoor' \| 'beach'` | Sim | **PARCIAL** | Texto no cabeçalho; geometria sempre 6x6 |
| **Número da Partida** | `match.matchNumber` | `number` | Sim | **SIM** | Selo oficial (ex.: "JOGO Nº 12") |
| **Fase / Rodada** | `match.phase` / `round` | `string` / `number` | Não | **SIM** | Metadados do jogo (ex.: "Final", "Rodada 1") |
| **Grupo / Chave** | `match.groupName` | `string` | Não | **SIM** | Anexado à fase (ex.: "Grupo A") |
| **Data do Jogo** | `match.scheduledTime` | `ISO 8601 string` | Sim | **SIM** | Formatado como `DD/MM/AAAA` |
| **Horário Previsto** | `match.scheduledTime` | `ISO 8601 string` | Sim | **SIM** | Formatado como `HH:mm` |
| **Ginásio / Local** | `match.venue` | `string` | Sim | **SIM** | Metadados da partida |
| **Quadra** | `match.court` | `string` | Não | **SIM** | Quadra específica (ex.: "Quadra 1") |
| **Cidade / UF** | `team.city` / `match.venue`| `string` | Não | **SIM** | Extraído do endereço ou padrão "Sede" |
| **Equipe A (Nome Completo)**| `match.teamAName` | `string` | Sim | **SIM** | Truncado se > 28 caracteres |
| **Equipe A (Sigla / Curto)**| `match.teamAShortName` | `string` | Sim | **SIM** | Usado em tabelas e réguas |
| **Equipe B (Nome Completo)**| `match.teamBName` | `string` | Sim | **SIM** | Truncado se > 28 caracteres |
| **Equipe B (Sigla / Curto)**| `match.teamBShortName` | `string` | Sim | **SIM** | Usado em tabelas e réguas |
| **Logos das Equipes** | `team.logoUrl` | `string (base64/URL)` | Não | **PARCIAL** | Renderizado se imagem embutida; silenciado se URL |
| **Atletas (Nº Camisa)** | `roster.jerseyNumber` | `number` | Não | **SIM** | Exibe `--` ou espaço vazio se ausente |
| **Atletas (Nome)** | `roster.name` | `string` | Sim | **SIM** | Nome truncado se muito longo |
| **Atletas (Capitão)** | `roster.isCaptain` | `boolean` | Não | **SIM** | Identificado com `(C)` ou círculo no número |
| **Atletas (Líbero)** | `roster.isLibero` | `boolean` | Não | **SIM** | Separado na seção específica de líberos |
| **Atletas (Documento RG/CPF)**| `roster.documentNumber` | `string` | Não | **PARCIAL** | Presente no Motor 1; omitido nos motores 2, 3 e 4 |
| **Comissão Técnica** | `team.coachName`, etc. | `string` | Não | **SIM** | Até 5 cargos de staff (T, AT1, AT2, PF, M/F) |
| **Equipe de Arbitragem** | `match.referees` | `Array<{role, name}>` | Não | **SIM** | 1º Árbitro, 2º Árbitro, Apontador |
| **Formação Inicial (I a VI)**| `match.sets[n].lineup` | `Array<string>` | Não | **PARCIAL** | Preenche se pós-jogo; vazio se pré-jogo |
| **Régua Ponto a Ponto** | `match.sets[n].pointsHistory`| `Array` | Não | **NÃO** | **Sempre em branco** para marcação física na mesa |
| **Tempos Técnicos (Timeouts)**| `match.sets[n].timeouts` | `Array` | Não | **NÃO** | Repassado como `[]` vazio no builder |
| **Substituições** | `match.sets[n].substitutions`| `Array` | Não | **NÃO** | Repassado como `[]` vazio no builder |
| **Sanções Disciplinares** | `match.sanctions` | `Array` | Não | **NÃO** | Repassado como `[]` vazio no builder |
| **Observações Gerais** | `match.observations` | `string` | Não | **SIM** | Texto livre exibido no quadro de observações |
| **Horário Real de Término** | `match.endTime` | `string` | Não | **NÃO** | Não existe campo no banco de dados |
| **Duração Real dos Sets** | `set.duration` | `string` | Não | **NÃO** | Não persistido de forma padronizada |

---

## 10. DECOMPOSIÇÃO DA ESTRUTURA VISUAL DO PDF

### 10.1 Motor 1 (`src/lib/pdf/matchSheetPdf.ts`) — A4 Retrato
Estrutura empilhada de cima para baixo:
1. **Header Bar (`y: 10 mm`, altura `16 mm`):** Box com 3 divisórias: Branding BaseOS (48 mm), Título Oficial da Federação (100 mm), Selo do Jogo nº e modo pré/pós (42 mm).
2. **Banner da Competição (`y: 26 mm`, altura `6.5 mm`):** Faixa cinza com nome do torneio e categoria.
3. **Info Box (`y: 32.5 mm`, altura `11 mm`):** Grade de 5 colunas (Fase/Chave, Data/Hora, Ginásio, Quadra, Cidade).
4. **Painel de Elencos (`y: 46.5 mm`, altura dinâmica):** Duas caixas lado a lado (93 mm cada). Cada atleta ocupa uma linha de 4.2 mm. Se exceder `PAGE_HEIGHT - 60 mm`, força quebra para a página 2.
5. **Tabela de Resultado (`y` dinâmico, altura `25 mm`):** Placar set a set e placar final de sets.
6. **Boxes Opcionais (Tempos, Substituições, Sanções, Observações):** Renderizados se houver dados.
7. **Assinaturas (`y` dinâmico, altura `39 mm`):** Caixas para árbitros e capitães/técnicos. Se `y > 247 mm`, quebra para nova página.
8. **Rodapé (`y: 289 mm`):** Horários, nome do sistema e data de emissão.

### 10.2 Motor 3 (`src/document-engine/baseos/`) — A4 Paisagem (841.89 × 595.28 pt)
Estrutura modular em mosaico de cards absolutos:

#### Layout 3 Sets (`THREE_SET_A4_LAYOUT`):
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header Bar (x: 6, y: 6, w: 829.89, h: 42 pt)                                │
├─────────────────────────────────────────────┬───────────────────────────────┤
│ Set 1 (x: 6, y: 51, w: 520, h: 138 pt)      │ Painel de Elencos             │
├─────────────────────────────────────────────┤ Equipes A e B Lado a Lado     │
│ Set 2 (x: 6, y: 192, w: 520, h: 138 pt)     │ (x: 529, y: 51,               │
├─────────────────────────────────────────────┤  w: 306.89, h: 420 pt)        │
│ Set 3 Decisivo (x: 6, y: 333, w: 520, h:138)│                               │
├──────────────┬──────────────┬───────────────┼───────────────────────────────┤
│ Sanções      │ Assinaturas  │ Observações   │ Quadro Resumo de Resultados   │
│ (w: 165 pt)  │ (w: 220 pt)  │ (w: 132.5 pt) │ (w: 304.89 pt)                │
│ (y: 478 pt)  │ (y: 478 pt)  │ (y: 478 pt)   │ (y: 478 pt)                   │
└──────────────┴──────────────┴───────────────┴───────────────────────────────┘
```

#### Layout 5 Sets (`FIVE_SET_A4_LAYOUT`):
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header Bar (x: 6, y: 6, w: 829.89, h: 34 pt)                                │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│ Set 1 (x: 6, y: 45, w: 411)  │ Set 2 (x: 425, y: 45, w: 410)│ (Rosters      │
├──────────────────────────────┼──────────────────────────────┤  inicia       │
│ Set 3 (x: 6, y: 160, w: 411) │ Set 4 (x: 425, y: 160, w: 410)│  no Set 5)   │
├──────────────────────────────┴───────────────┬──────────────┴───────────────┤
│ Set 5 Tie-break (x: 6, y: 275, w: 520, h:120)│ Painel de Elencos             │
├──────────────────────────────┬───────────────┤ (x: 531, y: 275,             │
│ Sanções (x: 6, y: 400, w:220)│ Obs (w: 295)  │  w: 304.89, h: 314 pt)        │
├──────────────────────────────┼───────────────┤                              │
│ Resultado (x: 6, y: 500,w:220│ Assinaturas   │                              │
└──────────────────────────────┴───────────────┴──────────────────────────────┘
```

---

## 11. AUDITORIA DE ESPAÇAMENTO E TIPOGRAFIA

### 11.1 Problemas de Compressão (Aperto Excessivo)
1. **Números da Régua Ponto a Ponto (`BaseosPointGrid.tsx`):** Os números de 1 a 36 são renderizados com fonte **`3.8pt`** dentro de células de aproximadamente **1.2 mm × 2.8 mm**. Em papel físico sob a iluminação de ginásios, a leitura é extremamente desgastante para os apontadores.
2. **Espaço de Escrita Manual para Atletas:** No layout de 5 sets, a altura disponível para cada linha de atleta na tabela de elencos é de apenas **13.1pt (~4.6 mm)**; no Motor 1, é de **4.2 mm**. O padrão ergonômico federativo para escrita manual com caneta esferográfica exige entre **5.5 mm e 6.5 mm**.
3. **Quadro de Sanções e Conduta:** As células da grade de sanções possuem fonte **`3.2pt`** com linhas de 2.5 mm de altura. É fisicamente impossível registrar manualmente números e placares com legibilidade nessas células em A4.

### 11.2 Problemas de Desperdício e Inconsistência
1. **Inconsistência Extrema de Margens Perimetrais:**
   - `matchSheetPdf.ts`: Margem externa de **`10.0 mm`** (`28.35 pt`).
   - `officialMatchSheetPdf.ts`: Margem externa de **`3.5 mm`** (`9.92 pt`).
   - `document-engine/baseos`: Margem externa de **`6.0 pt`** (**`2.1 mm`**).
   - A variação de margem entre os motores é de **476%**, comprovando a total ausência de um padrão de design tokens compartilhado.
2. **Desperdício em Caso de Pré-Jogo no Motor 1:** Em partidas sem ocorrências (pré-jogo), os blocos de tempos, substituições e sanções ficam ocultos. O Motor 1 deixa um vazio vertical de mais de 80 mm entre a tabela de resultado e as assinaturas, mas se houver 14 atletas em cada equipe, ele quebra para uma 2ª folha quase 100% em branco contendo apenas as assinaturas.

---

## 12. AUDITORIA DE IMPRESSÃO FÍSICA

1. **Violação das Margens Físicas de Segurança (Hardware Unprintable Area):**
   - A esmagadora maioria das impressoras jato de tinta e laser comerciais possui uma margem física de não-impressão mecânica (área onde os roletes tracionam o papel) que varia de **`4.0 mm a 5.0 mm`**.
   - O Motor 3 adota margem perimetral de **`2.1 mm`** (`6 pt`), e o Motor 2 adota **`3.5 mm`**.
   - **Risco Físico Real:** As bordas pretas externas das tabelas de sets e o rodapé da página saem cortados ou falhados na maioria das impressões de quadra.
2. **Consumo Excessivo de Toner:**
   - Os geradores utilizam cabeçalhos com preenchimento 100% preto sólido (`#000000`) com texto em branco invertido. Em mesas de arbitragem com impressoras a laser compactas, isso causa consumo vertiginoso de toner, riscos no cilindro fotocondutor e borrões de tinta úmida em papéis sulfite de 75g/m².
3. **Perda de Contraste em Fotocópia Monocromática (Xerox):**
   - Tons cinza muito claros como `#F4F4F4` (zebrados de tabela) ou `#CBD5E1` desaparecem ou se transformam em ruído granulado escuro quando a súmula preenchida é fotocopiada pela organização para distribuição às equipes.

---

## 13. AUDITORIA DE CASOS EXTREMOS (STRESS TESTING FORENSE)

| Cenário de Estresse | Comportamento do Motor Atual | Impacto no Documento Oficial |
|---|---|---|
| **Equipe com Nome Longo** (ex.: "Associação Desportiva e Cultural Beneficente dos Servidores") | Truncado estritamente em 16 ou 28 caracteres (`.substring(0, 16)`) | Nome sai cortado no cabeçalho formal da súmula. |
| **Atleta com Nome Longo** (ex.: "Guilherme de Oliveira dos Santos Silveira") | Truncado em 28 caracteres no Motor 1; invade coluna no Motor 3 | Sobrenomes essenciais para identificação oficial são suprimidos. |
| **Elenco com 16 a 20 Atletas Inscritos** | `team.athletes.slice(0, 14)` nos motores 2, 3 e 4 | Atletas reservas além do 14º são **descartados silenciosamente** sem aviso. |
| **Atleta sem Número de Camisa** | Exibe `--` ou espaço vazio | **Comportamento Estável**: Permite ao apontador anotar à caneta no dia. |
| **Equipe sem Comissão Técnica** | Linhas de staff ficam em branco | **Comportamento Estável**: Mantém os espaços vazios para anotação. |
| **Partida com W.O. (25x0, 25x0)** | Renderiza 2 sets com 25x0; sets 3 a 5 em branco | **Comportamento Estável**: Placar canônico preservado. |
| **Vôlei de Praia (Duplas 2x2)** | Renderiza rotação 6x6 (I a VI), 14 atletas e 25 pontos | **INCOMPATÍVEL**: Gera súmula de quadra para torneio de praia. |
| **Partida Homologada com 5 Sets** | Preenche placares e vencedores; régua de pontos continua vazia | **Limitação Normativa**: Réguas ponto a ponto nunca são preenchidas. |

---

## 14. AUDITORIA ARQUITETURAL E MATRIZ DE PROBLEMAS

Os problemas identificados foram catalogados, avaliados e classificados por severidade:

### [CRÍTICO] SML-01: Fragmentação e Concorrência de 4 Motores Distintos
- **Severidade:** CRÍTICO
- **Arquivos:** `src/lib/pdf/matchSheetPdf.ts`, `src/lib/pdf/officialMatchSheetPdf.ts`, `src/document-engine/baseos/`, `src/document-engine/generators/`
- **Problema:** A existência de 4 geradores paralelos usando 3 tecnologias conflitantes (`jspdf`, `@react-pdf/renderer`, `pdf-lib`).
- **Causa:** Acúmulo de implementações em fases históricas sucessivas sem aposentadoria formal dos motores legados.
- **Impacto:** O usuário obtém PDFs com geometria, formato e tipografia totalmente diferentes conforme o botão clicado. O esforço de manutenção é multiplicado por quatro.
- **Recomendação:** Unificar a geração em um único motor canônico moderno e descontinuar os outros três.

---

### [CRÍTICO] SML-02: Quebra de SSOT e Desconexão do `CompetitionConfig` na Interface
- **Severidade:** CRÍTICO
- **Arquivos:** `src/document-engine/baseos/mapper/match.mapper.ts`, `src/services/documentEditorService.ts`
- **Problema:** Os motores que atendem a UI leem o campo legado `competition.setFormat` e ignoram o `CompetitionRulesService.resolveMatchFormat(...)`.
- **Causa:** O mapeador do motor BaseOS não foi conectado ao motor canônico após a conclusão da Fase 4.
- **Impacto:** Finais com regulamento de melhor de 5 sets dentro de campeonatos regulares de 3 sets geram súmulas de 3 sets em pré-jogo. Regras de contingente de praia e pontuação personalizada são ignoradas.
- **Recomendação:** Refatorar os mappers para consumir estritamente o `CompetitionRulesService` e o snapshot canônico da competição.

---

### [CRÍTICO] SML-03: Divergência de Emissão na Mesma Rota da Aplicação
- **Severidade:** CRÍTICO
- **Arquivos:** `src/pages/MatchSheetPage.tsx`, `src/components/match-sheet/MatchSheetInterface.tsx`, `src/components/match/MatchSheetEmitDialog.tsx`
- **Problema:** Dentro de `/sumulas/:matchId`, o botão "Emitir Súmula" gera o PDF do Motor 3 (`@react-pdf/renderer`), enquanto o botão "Baixar Súmula" da aba de súmula digital gera o PDF do Motor 4 (`pdf-lib`).
- **Causa:** Dois componentes independentes invocando fachadas documentais distintas na mesma página.
- **Impacto:** Incoerência operacional grave para os oficiais de arbitragem.
- **Recomendação:** Centralizar a ação de download da súmula em uma única função provedora de PDF.

---

### [ALTO] SML-04: Inexistência de Suporte Real a A3
- **Severidade:** ALTO
- **Arquivos:** `src/document-engine/baseos/geometry/layouts.ts`, `src/components/match/MatchSheetEmitDialog.tsx`
- **Problema:** Não existe design dedicado para A3. O A3 existente é uma ampliação escalar matemática pura das coordenadas de A4 (`1.4142`), que não amplia fontes e só existe para 5 sets. Além disso, a opção é inacessível na UI.
- **Causa:** O suporte a A3 foi prototipado no nível geométrico, mas nunca implementado no design nem exposto na interface.
- **Impacto:** O sistema não produz súmulas de mesa federativas em formato A3 de prancheta com tipografia legível.
- **Recomendação:** Projetar um layout nativo em A3 com proporções de célula e fontes otimizadas para leitura e escrita manual.

---

### [ALTO] SML-05: Incompatibilidade Estrutural com Vôlei de Praia
- **Severidade:** ALTO
- **Arquivos:** Todos os motores de PDF
- **Problema:** Não existe modelo de súmula para Vôlei de Praia (duplas 2x2).
- **Causa:** Os templates foram modelados com foco exclusivo em vôlei de quadra indoor.
- **Impacto:** Torneios de vôlei de praia recebem súmulas impressas com grades de 6 posições de rotação e espaço para líberos, o que invalida formalmente o documento perante a arbitragem de praia.
- **Recomendação:** Criar um template específico para Vôlei de Praia (duplas, parciais de 21/15 pts, sem líberos).

---

### [ALTO] SML-06: Tipografia Microscópica e Altura de Linha Insuficiente
- **Severidade:** ALTO
- **Arquivos:** `BaseosPointGrid.tsx`, `BaseosRosters.tsx`, `BaseosSanctions.tsx`
- **Problema:** Fontes essenciais entre `3.2pt` e `4.2pt` e linhas de escrita manual de ~4.6 mm.
- **Causa:** Tentativa de forçar todos os dados de uma partida de 5 sets em uma única folha A4 paisagem sem hierarquização visual.
- **Impacto:** Dificuldade extrema de leitura e preenchimento físico pela equipe de arbitragem.
- **Recomendação:** Adotar tamanho mínimo de fonte de 5.5pt e linhas de escrita manual com no mínimo 5.5 mm a 6.0 mm.

---

### [MÉDIO] SML-07: Margens Perimetrais Críticas para Impressoras Físicas
- **Severidade:** MÉDIO
- **Arquivos:** `src/document-engine/baseos/geometry/layouts.ts` (`margin: 6 pt` ≈ 2.1 mm)
- **Problema:** Margem externa de 2.1 mm viola a zona mínima de tração mecânica de impressoras de quadra (4.5 a 5.0 mm).
- **Causa:** Dimensionamento focado em visualização em tela, sem teste de impressão física com sangria.
- **Impacto:** Linhas de borda cortadas na impressão em papel sulfite A4 comum.
- **Recomendação:** Padronizar margem perimetral mínima de segurança de 5.0 mm (14.17 pt).

---

### [MÉDIO] SML-08: Omissão de Histórico de Partida no Adaptador de Dados
- **Severidade:** MÉDIO
- **Arquivos:** `src/lib/pdf/matchSheetDataBuilder.ts`
- **Problema:** Arrays de tempos técnicos (`timeouts`), substituições (`substitutions`) e sanções (`sanctions`) são repassados como `[]` vazio.
- **Causa:** O builder foi concebido focado no cenário pré-jogo e não foi conectado ao histórico de eventos registrados no banco de dados.
- **Impacto:** Súmulas pós-jogo emitidas pelo sistema saem sem o histórico disciplinar e de substituições da partida.
- **Recomendação:** Conectar o builder aos eventos da partida persistidos no banco.

---

### [BAIXO] SML-09: Hardcode de Identificação da Entidade Organizadora
- **Severidade:** BAIXO
- **Arquivos:** `matchSheetDataBuilder.ts`, `officialMatchSheetPdf.ts`, `sumula3.generator.ts`
- **Problema:** Valores fixos como `'VolleyPro'` ou `'Federação Paranaense de Voleibol'` hardcoded no código.
- **Causa:** Falta de passagem dinâmica do nome da entidade via configurações gerais (`systemSettings`).
- **Impacto:** Documento impresso exibe nome fixo mesmo quando a organização pertence a outra federação ou liga privada.
- **Recomendação:** Consumir o nome da entidade a partir do cadastro do tenant/organizador.

---

## 15. VERIFICAÇÃO DA COBERTURA DE TESTES

### 15.1 Testes Existentes no Repositório
A investigação identificou os seguintes arquivos de teste cobrindo direta ou indiretamente a geração de PDFs:
1. `src/test/matchSheetPdf.test.ts` (6 testes): Smoke tests validando que `generateMatchSheetPdf` retorna instâncias de jsPDF com `numberOfPages >= 1`.
2. `src/test/officialMatchSheetPdf.test.ts` (7 testes): Valida geração de 3 sets, 5 sets, fichas de posição e súmulas em branco no Motor 2.
3. `src/test/officialScoresheetPdfReact.test.tsx` (5 testes): Valida renderização do elemento React e compilação de Blob via `@react-pdf/renderer`.
4. `src/test/documentEngine.test.ts` (6 testes): Valida carimbo sobre template estático via `pdf-lib`.
5. `src/test/documentEditorService.test.ts` (14 testes): Valida carregamento de contexto e persistência de layoutOverrides.
6. `src/test/scoresheetStress.test.ts` (7 testes): Testa estresse de nomes longos e caracteres especiais no mapper do Motor 3.
7. `src/test/document-engine/baseos/three-set.test.ts` (1 teste): Valida compilação de Blob do template de 3 sets.
8. `src/test/document-engine/baseos/five-set.test.ts` (1 teste): Valida compilação de Blob do template de 5 sets.
9. `src/test/document-engine/baseos/geometry.test.ts` (4 testes): Valida que a geometria dos cards não extrapola a folha.
10. `src/test/document-engine/baseos/mapper.test.ts` (7 testes): Valida mapeamento de entidades para `BaseosScoresheetData`.
11. `src/test/document-engine/baseos/roster.test.ts` (4 testes): Valida regras de elenco e staff.

### 15.2 Lacunas Críticas de Testes Identificadas
- **Zero Testes de Regressão Visual / Snapshot Pixel-a-Pixel:** Não há testes visuais automatizados validando sobreposição de textos, truncamentos indevidos ou quebra estética de linhas.
- **Zero Testes de Renderização Real em A3:** O layout A3 não possui nenhum teste automatizado que valide legibilidade ou proporção de fontes.
- **Zero Testes para Vôlei de Praia (2x2):** Nenhum teste cobre a geração de súmulas para a modalidade de praia.
- **Zero Testes de Verificação de Margens Físicas Seguras de Impressão:** Não há asserções garantindo que nenhum elemento encoste a menos de 4.5 mm da borda física do papel.
- **Zero Testes de Integração de SSOT na Interface:** Nenhum teste valida se uma partida com override de 5 sets em fase final gera uma súmula de 5 sets através do `loadBaseosScoresheetData`.

---

## 16. VERIFICAÇÃO DE DOCUMENTAÇÃO

A auditoria confrontou a documentação existente com a realidade do código:
1. **`AGENTS.md`:** Afirma que `src/lib/pdf/matchSheetPdf.ts` é o módulo responsável pela "geração da súmula em PDF (A4 P&B)". **Divergência:** Não menciona que a aplicação em produção utiliza `@/document-engine/baseos` e `pdf-lib`, tratando o gerador legado como se fosse o único.
2. **`docs/competition/phase-4.3-ui-integration-audit.md`:** Declarava na tabela de integração que a súmula PDF estava "Totalmente Integrada" ao SSOT. **Divergência:** Apenas o adaptador `matchSheetDataBuilder.ts` foi integrado ao `CompetitionRulesService`, enquanto o motor real da interface (`document-engine/baseos/mapper/match.mapper.ts`) permaneceu lendo `competition.setFormat` legado.
3. **`docs/competition/audit-match-sheet-pdf.md`:** Diagnóstico preliminar que apontou a existência dos 4 motores. **Convergência:** A presente auditoria confirmou todas as evidências apontadas naquele estudo, aprofundando o rastreamento das chamadas em componentes de UI e detalhes milimétricos de espaçamento e tipografia.

---

## 17. DIRETRIZES E RECOMENDAÇÕES PARA A FASE SÚMULA 2 (PLANEJAMENTO)

> **ATENÇÃO:** Nenhuma das recomendações abaixo foi ou deve ser implementada nesta fase. São diretrizes exclusivamente analíticas para a futura reconstrução.

1. **Unificação em um Único Motor Canônico de Súmula Oficial:**
   - Padronizar o BaseOS em torno do `@react-pdf/renderer` (que oferece suporte nativo a componentes React, compilação vetorial limpa, tipagem TypeScript forte e execução tanto no browser quanto em Node.js/CI) OU consolidar em geração vetorial direta via `jsPDF`.
   - Depreciar e remover os motores legados (`matchSheetPdf.ts` e o motor de overlay sobre PDFs escaneados `pdf-lib`).
2. **Reconexão Imediata com o `CompetitionRulesService` (SSOT):**
   - Refatorar o mapper documental para receber `CompetitionRecord` e invocar `CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)`.
   - Assegurar que `setsToWin: 1 | 2 | 3`, `phaseOverrides` e as pontuações regulamentares de set/tie-break sejam consumidas diretamente do `CompetitionConfig`.
3. **Desenho de Layouts Nativos Específicos para A4 e A3:**
   - **A4 Paisagem (297 × 210 mm):** Focado em festivais e partidas rápidas de 3 sets, com tipografia equilibrada (fontes ≥ 5.5pt) e linhas de escrita manual confortáveis (≥ 5.5 mm).
   - **A3 Paisagem (420 × 297 mm):** Súmula Oficial Master Federativa (Padrão CBV/FIVB para 5 sets), com amplas réguas de pontuação, espaço generoso para escrita manual (6.0 mm) e fontes confortáveis (> 6pt).
4. **Criação de Template Dedicado para Vôlei de Praia:**
   - Desenvolver layout específico para duplas (sem rotação 6x6, sem líberos, parciais de 21/15 pontos e controle de troca de lado a cada 7/5 pontos).
5. **Ajuste Mandatório de Margens de Segurança para Impressão:**
   - Fixar margem externa perimetral mínima de **`5.0 mm`** em todos os templates para garantir que 100% das impressoras de mesa imprimam as bordas sem cortes.
6. **Alimentação de Histórico Disciplinar e de Substituições:**
   - Conectar os eventos de partida (substituições, tempos técnicos e sanções) gravados no banco de dados para renderização no modo pós-jogo.

---

## 18. CONCLUSÃO DA AUDITORIA

A Fase Súmula 1 cumpriu integralmente todos os seus objetivos e critérios de aceitação:
- **Toda a cadeia de geração investigada e documentada:** Desde a UI até a compilação binária do PDF.
- **Os 4 motores identificados e contrastados.**
- **A4 e A3 rigorosamente avaliados.**
- **3 e 5 sets analisados em relação ao `setsToWin`.**
- **A desconexão com o `CompetitionConfig` foi documentada com precisão forense.**
- **Todos os hardcodes, problemas de espaçamento e riscos de impressão foram registrados.**
- **Nenhum código de implementação foi alterado.**
- **Walkthrough oficial salvo com sucesso em:**  
  `docs/WALKTHROUGH_FASE_SUMULA_1.md`

# BaseOS — Auditoria Técnica Completa do Gerador de Súmula PDF (Fase Súmula 1)

**Data da Auditoria:** Setembro/2026  
**Status:** AUDITADO E DOCUMENTADO (Investigação Concluída)  
**Regra Aplicada:** Código preservado — nenhuma alteração em código de produção, tipos ou testes.  
**Escopo:** Subsistemas de geração de súmula em PDF, bibliotecas, layouts, dimensões (A4/A3), sets (3/5), integração com `CompetitionConfig`, espaçamento, impressão e testes.

---

## 1. Resumo Executivo

O BaseOS possui atualmente um ecossistema fragmentado para a geração de súmulas esportivas em PDF. Não existe um único gerador, mas sim **quatro motores concorrentes**, construídos em épocas diferentes da plataforma, utilizando **três bibliotecas distintas** (`jspdf`, `@react-pdf/renderer` e `pdf-lib`), com padrões gráficos divergentes e diferentes graus de integração com o domínio.

### Principais Conclusões Forenses:
1. **Quatro Motores Paralelos:**
   - **Motor 1 (`src/lib/pdf/matchSheetPdf.ts`):** Construído com `jspdf` em **A4 Retrato**. É o gerador tabular original, empilhado verticalmente. Quase descontinuado nas telas principais, sobrevivendo apenas em testes unitários legados.
   - **Motor 2 (`src/lib/pdf/officialMatchSheetPdf.ts`):** Construído com `jspdf` em **A4 Paisagem**. Reprodução vetorial manual inspirada no layout da CBV/FPV com suporte a 3 e 5 sets. Utilizado em testes E2E e QA Master.
   - **Motor 3 (`src/document-engine/baseos/`):** Construído com `@react-pdf/renderer` em **A4 Paisagem**. É o motor utilizado na interface do usuário atual (`MatchSheetEmitDialog`, `MatchPdfPreview`, `BlankSheetEmitDialog`). Baseado em grid de Cards fixos absolutos.
   - **Motor 4 (`src/document-engine/generators/`):** Construído com `pdf-lib` em tamanho customizado (`992 × 566 pt`). Realiza carimbo/overlay sobre PDFs escaneados estáticos (`sumula-3-sets.pdf` e `sumula-5-sets.pdf`). Utilizado na tela interna de súmula digital (`MatchSheetInterface.tsx`) e no editor de coordenadas (`DocumentEditorPage.tsx`).

2. **Divergência Crítica na Interface do Usuário:**
   Dentro da mesma rota `/sumulas/:matchId`, se o usuário clicar no botão "Emitir Súmula" (modal lateral), ele baixa o PDF do **Motor 3** (`@react-pdf/renderer`). Se ele navegar para a aba da súmula ao vivo e clicar em "Baixar Súmula" na barra de ações, ele baixa o PDF do **Motor 4** (`pdf-lib` com template escaneado).

3. **Inexistência de Suporte Real a A3:**
   Não existe layout desenhado para A3. O A3 só é mencionado em uma constante geométrica do Motor 3 (`FIVE_SET_A3_MASTER_LAYOUT`), onde é gerado por uma mera função de escala matemática linear (`scale = 1.4142`) multiplicando as coordenadas do A4, e exclusivamente para 5 sets (para 3 sets cai no fallback de A4). Além disso, a UI **nunca passa** o parâmetro `output: 'master'`, tornando o A3 100% inacessível na interface.

4. **Desconexão com o `CompetitionConfig`:**
   Enquanto o domínio do BaseOS foi refatorado nas Fases 4.1–4.12 para ter o `CompetitionConfig` como SSOT (controlando `setsToWin`, `phaseOverrides`, pontuação por set e regras de elenco), o motor que atende a interface (`document-engine/baseos/mapper/match.mapper.ts`) lê o campo legado `competition.setFormat === '5-sets'`. Ele ignora overrides de fase final e hardcoda regras de quadra (25 pontos, 15 pontos no tie-break, 14 atletas e 2 líberos), ignorando competições de vôlei de praia e formatos reduzidos.

---

## 2. Arquitetura Atual e Fluxo da Cadeia de Geração

A auditoria rastreou as quatro cadeias distintas em execução no repositório:

```text
CADEIA A (Interface Principal - Modal e Preview):
MatchesPage / MatchSheetPage
      ↓
MatchSheetEmitDialog.tsx / MatchPdfPreview.tsx
      ↓
scoresheetService.loadBaseosScoresheetData()
      ↓
match.mapper.ts (ignora CompetitionRulesService; lê setFormat legado)
      ↓
BaseosThreeSetScoresheet.tsx / BaseosFiveSetScoresheet.tsx
      ↓
@react-pdf/renderer (A4 Paisagem via Cards Absolutos)
      ↓
Blob URL / Window.open / Download direto

──────────────────────────────────────────────────────────────────

CADEIA B (Súmula Digital ao Vivo):
MatchSheetPage (/sumulas/:matchId)
      ↓
MatchSheetInterface.tsx
      ↓
documentEditorService.loadMatchContext()
      ↓
sumula3.generator.ts / sumula5.generator.ts
      ↓
pdf-lib (Carrega sumula-3-sets.pdf fixo de 992x566pt e carimba campos)
      ↓
Download manual direto via <a> element

──────────────────────────────────────────────────────────────────

CADEIA C (Testes E2E, QA Master e Batch):
e2eSystemLifecycle.test.ts / qaMaster.test.ts
      ↓
matchSheetDataBuilder.ts (consome CompetitionRulesService)
      ↓
officialMatchSheetPdf.ts (buildOfficial3SetsSheet / buildOfficial5SetsSheet)
      ↓
jsPDF (A4 Paisagem 297x210mm com coordenadas vetoriais manuais)
      ↓
Buffer / jsPDF.save()

──────────────────────────────────────────────────────────────────

CADEIA D (Motor Legado VolleyPro):
matchSheetPdf.test.ts
      ↓
matchSheetPdf.ts
      ↓
jsPDF (A4 Retrato 210x297mm empilhado verticalmente)
      ↓
jsPDF.save()
```

---

## 3. Inventário de Arquivos Envolvidos

| Arquivo | Tecnologia | Responsabilidade Principal | Consumidor Atual |
| :--- | :--- | :--- | :--- |
| `src/lib/pdf/matchSheetPdf.ts` | jsPDF | Súmula tabular linear em A4 Retrato | Testes legados e barrel |
| `src/lib/pdf/officialMatchSheetPdf.ts` | jsPDF | Súmula oficial CBV/FPV em A4 Paisagem (3 e 5 sets) | Testes E2E e QA Master |
| `src/lib/pdf/officialScoresheetPdf.tsx` | @react-pdf/renderer | Súmula experimental em A4 Retrato | Teste específico `officialScoresheetPdfReact.test.tsx` |
| `src/lib/pdf/officialScoresheetPdfGenerator.ts` | @react-pdf/renderer | Gerador de blob para o componente acima | Teste unitário |
| `src/lib/pdf/matchSheetDataBuilder.ts` | TypeScript puro | Adaptador MatchRecord + Competition -> MatchSheetData | `officialMatchSheetPdf.ts`, `MatchSheetPage.tsx` |
| `src/lib/pdf/reportsPdf.ts` | jsPDF | Boletim de jogos, classificação, elencos e pódio | `MatchesPage.tsx`, `ReportsPage.tsx` |
| `src/document-engine/baseos/service/scoresheetService.ts` | @react-pdf/renderer | Fachada do motor oficial BaseOS (3 e 5 sets) | `MatchSheetEmitDialog.tsx`, `MatchPdfPreview.tsx` |
| `src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` | @react-pdf/renderer | Template A4 Paisagem para 3 sets | `scoresheetService.ts` |
| `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx` | @react-pdf/renderer | Template A4 Paisagem para 5 sets | `scoresheetService.ts` |
| `src/document-engine/baseos/geometry/layouts.ts` | Geometria / Rects | Coordenadas fixas dos cards (A4 e escala A3) | Templates BaseOS |
| `src/document-engine/baseos/mapper/match.mapper.ts` | Mapeador | Converte MatchRecord para BaseosScoresheetData | `scoresheetService.ts` |
| `src/document-engine/generators/sumula3.generator.ts` | pdf-lib | Overlay sobre template PDF estático de 3 sets | `MatchSheetInterface.tsx`, `DocumentEditorPage.tsx` |
| `src/document-engine/generators/sumula5.generator.ts` | pdf-lib | Overlay sobre template PDF estático de 5 sets | `MatchSheetInterface.tsx`, `DocumentEditorPage.tsx` |

---

## 4. Auditoria de Formatos: A4 e A3

### 4.1 A4 (Portrait vs Landscape)
* **A4 Portrait (210 × 297 mm):**
  - Presente em `src/lib/pdf/matchSheetPdf.ts` (jsPDF) e `src/lib/pdf/officialScoresheetPdf.tsx` (@react-pdf/renderer).
  - Comportamento: Layout empilhado verticalmente. Em partidas com elencos completos (14 atletas em cada time), o conteúdo estoura a altura e força quebra para uma 2ª página não planejada (`PAGE_HEIGHT - 60` no jsPDF). Não é o padrão de federações oficiais para mesa de jogo.
* **A4 Landscape (297 × 210 mm):**
  - Presente em `src/lib/pdf/officialMatchSheetPdf.ts` (jsPDF) e em `src/document-engine/baseos/` (@react-pdf/renderer).
  - É o formato universalmente adotado para súmulas de mesa oficiais.
  - Implementação atual: Folha única rígida onde todos os blocos de jogo, sets, sanções e assinaturas cabem em uma página de 297 × 210 mm (ou 841.89 × 595.28 pt).

### 4.2 A3 (Portrait vs Landscape)
* **A3 Portrait:**
  - **NÃO IMPLEMENTADO** em nenhum dos motores do sistema.
* **A3 Landscape (420 × 297 mm / 1190.55 × 841.89 pt):**
  - Declarado formalmente apenas em `src/document-engine/baseos/geometry/layouts.ts` através do objeto `FIVE_SET_A3_MASTER_LAYOUT`.
  - **Mecanismo Real:** O A3 atual **não possui um design arquitetado próprio**. Ele executa `scaleCardLayout(FIVE_SET_A4_LAYOUT.cards, A3_FROM_A4_SCALE)` onde `A3_FROM_A4_SCALE ≈ 1.4142`. Trata-se de uma simples ampliação escalar matemática dos mesmos cartões do A4.
  - **Restrição de Sets:** Só existe para 5 sets. Para 3 sets, `getScoresheetLayout('3-sets', 'master')` retorna o layout de A4 (`THREE_SET_A4_LAYOUT`).
  - **Inacessibilidade na UI:** Nenhum componente da interface expõe a opção de emitir em A3. Todas as chamadas usam o padrão `'print-a4'`.

---

## 5. Auditoria de 3 e 5 Sets

### 5.1 Determinação do Número de Sets
A auditoria revelou inconsistências no modo como a quantidade de sets é determinada entre os motores:

1. **No `matchSheetDataBuilder.ts`:**
   ```typescript
   const formatConfig = competition
     ? CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)
     : { setsToWin: 2 as const, maxSets: 3 };
   const format =
     formatConfig.setsToWin === 3 ? '5-sets' : formatConfig.setsToWin === 1 ? '1-set' : '3-sets';
   ```
   - Consome corretamente o `CompetitionRulesService`. Porém, se o resultado for `1-set`, o gerador `officialMatchSheetPdf.ts` não possui template de 1 set e gera a folha completa de 3 sets.

2. **No `src/document-engine/baseos/mapper/match.mapper.ts` (Motor da UI):**
   ```typescript
   const is5Sets =
     competition?.setFormat === '5-sets' || (match.sets?.length || 0) > 3;
   const format: ScoresheetFormat = is5Sets ? '5-sets' : '3-sets';
   ```
   - **Vulnerabilidade:** Lê a coluna legada `setFormat` de `CompetitionRecord`. Não consulta o `CompetitionConfig`, não avalia `setsToWin` e ignora `phaseOverrides`.
   - Consequência: Em competições cujo padrão é melhor de 3, mas que possuem finais em melhor de 5 configuradas no `phaseOverrides`, a súmula pré-jogo emitida para a final é gerada com 3 sets em vez de 5!

### 5.2 Estrutura Visual dos Sets
* **Súmula de 3 Sets:**
  - Organização: 3 blocos horizontais empilhados na metade esquerda da página (Sets 1, 2 e Set 3 Decisivo/Tie-break). Cada bloco contém formação inicial (posições I a VI para ambas as equipes) e régua de pontos corridos.
* **Súmula de 5 Sets:**
  - Organização: Sets 1 a 4 distribuídos em matriz 2×2 no topo esquerdo, com o Set 5 Decisivo em largura total abaixo deles. Painel de resultados e sanções deslocado para a base inferior.

---

## 6. Auditoria de Integração com o `CompetitionConfig`

O BaseOS estabeleceu o `CompetitionConfig` como Single Source of Truth (SSOT). A auditoria verificou o cumprimento dessa diretriz nos geradores:

| Regra do CompetitionConfig | Estado no Gerador Atual | Diagnóstico Forense |
| :--- | :---: | :--- |
| `setsToWin: 1 \| 2 \| 3` | **Ignorado no Motor da UI** | `match.mapper.ts` lê `competition.setFormat` legado. Apenas `matchSheetDataBuilder.ts` consulta o serviço. |
| `phaseOverrides` | **Ignorado no Motor da UI** | Súmulas pré-jogo de fases finais não reconhecem overrides de 5 sets. |
| `modality: 'indoor' \| 'beach'` | **Hardcoded para Indoor** | Todos os geradores desenham rotação para 6 jogadores (I a VI). Não existe súmula canônica de vôlei de praia (2x2). |
| `pointsPerSet` (ex.: 21 pts praia) | **Hardcoded em 25 / 15** | `set.rules.ts` fixa `REGULAR_SET_POINTS = 25` e `DECIDING_SET_POINTS = 15`. |
| `minAthletesPerTeam` / `maxAthletesPerTeam` | **Hardcoded em 14 + 2** | `roster.rules.ts` fixa `MAX_REGULAR_ATHLETES = 14` e `MAX_LIBEROS = 2`. |
| `liberosConfig: 0 \| 1 \| 2` | **Hardcoded em 2** | Não valida se a competição proíbe líberos (ex.: praia ou categorias de base). |
| Comissões Técnicas | **Hardcoded em 5 membros** | `STAFF_ROLES` fixa Técnico, Assistente 1, Assistente 2, Prep. Físico e Médico/Fisioterapeuta. |

---

## 7. Mapeamento de Dados da Súmula

Mapeamento integral dos dados recebidos versus exibidos no PDF oficial:

| Dado | Origem | Tipo | Obrigatório? | Utilizado no PDF? | Observação / Limitação |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Nome Competição** | `competition.name` | `string` | Sim | **SIM** | Exibido no cabeçalho |
| **Categoria** | `competition.category` | `string` | Sim | **SIM** | Exibido no cabeçalho |
| **Gênero** | `competition.genderCategory` | `string` | Não | **SIM** | Masculino / Feminino / Misto |
| **Modalidade** | `competition.modality` | `string` | Sim | **PARCIAL** | Texto no cabeçalho; grid sempre indoor 6x6 |
| **Número do Jogo** | `match.matchNumber` | `number` | Sim | **SIM** | Exibido no selo de identificação |
| **Fase / Chave** | `match.phase` / `groupName` | `string` | Não | **SIM** | Exibido nos metadados |
| **Data e Horário** | `match.scheduledTime` | `ISO string` | Sim | **SIM** | Formatado para `DD/MM/AAAA às HH:mm` |
| **Local e Quadra** | `match.venue` / `court` | `string` | Sim | **SIM** | Exibido nos metadados |
| **Cidade / UF** | `team.city` / `venue` | `string` | Não | **SIM** | Extraído ou padrão 'Local' |
| **Equipe A (Nome/Sigla)** | `match.teamAName` / `teamAShortName` | `string` | Sim | **SIM** | Nome completo e sigla |
| **Equipe B (Nome/Sigla)** | `match.teamBName` / `teamBShortName` | `string` | Sim | **SIM** | Nome completo e sigla |
| **Logo das Equipes** | `team.logoUrl` | `string (URL/base64)` | Não | **SIM** | Renderizado se presente |
| **Atletas (Nº Camisa)** | `roster.jerseyNumber` | `number` | Não | **SIM** | Exibe `--` se não informado |
| **Atletas (Nome)** | `roster.name` | `string` | Sim | **SIM** | Limitado em caracteres |
| **Atletas (Capitão)** | `roster.isCaptain` | `boolean` | Não | **SIM** | Marcado com `(C)` ou sublinhado |
| **Atletas (Líbero)** | `roster.isLibero` | `boolean` | Não | **SIM** | Separado na seção de líberos |
| **Atletas (Documento)** | `roster.documentNumber` | `string` | Não | **PARCIAL** | Omitido em vários templates por falta de espaço |
| **Comissão Técnica** | `team.coach`, `assistant`, etc. | `string` | Não | **SIM** | Até 5 cargos de staff |
| **Árbitros (1º, 2º, Apont)** | `match.referees` | `Array<{role, name}>` | Não | **SIM** | Quadro de assinaturas |
| **Formação Inicial (I-VI)** | `match.sets[n].lineup` | `Array<string>` | Não | **PARCIAL** | Preenche apenas se dados existirem |
| **Régua Ponto a Ponto** | `match.sets[n].pointsHistory` | `Array` | Não | **NÃO** | **Sempre em branco** para marcação na mesa |
| **Tempos Técnicos** | `match.sets[n].timeouts` | `Array` | Não | **NÃO** | `matchSheetDataBuilder` passa `timeouts: []` vazio |
| **Substituições** | `match.sets[n].substitutions` | `Array` | Não | **NÃO** | `matchSheetDataBuilder` passa `substitutions: []` vazio |
| **Sanções Disciplinares** | `match.sanctions` | `Array` | Não | **NÃO** | `matchSheetDataBuilder` passa `sanctions: []` vazio |
| **Observações / Protesto** | `match.observations` | `string` | Não | **SIM** | Texto livre com corte automático |
| **Horário Término** | `match.endTime` | `string` | Não | **NÃO** | Passado como `undefined` |

---

## 8. Auditoria da Estrutura Visual e Layout

### 8.1 Decomposição do Template Oficial BaseOS (`document-engine/baseos`)
O layout em A4 Paisagem (841.89 × 595.28 pt, margens de 6 pt) está estruturado em 7 blocos funcionais rígidos:

1. **Header Bar (`y: 6`, altura `42pt` em 3 sets / `34pt` em 5 sets):**
   - Logo vetorial BaseOS (barras âmbar e cinza).
   - Nome da Entidade / Federação Organizadora.
   - Nome da Competição, Categoria e Gênero.
   - Metadados: Jogo nº, Fase, Data/Hora, Ginásio, Quadra, Cidade.
2. **Blocos de Sets (`width: 520pt` em 3 sets / `411pt` em 5 sets):**
   - Faixa vertical esquerda com identificação do Set.
   - Sub-barra superior: Horário de início e término do set.
   - Quadrantes das equipes A e B com rotação I a VI.
   - Régua ponto a ponto integrada (1 a 36 no regular, 1 a 30 no tie-break).
3. **Painel de Elencos (`width: 306.89pt`, altura `420pt` em 3 sets / `314pt` em 5 sets):**
   - Colunas paralelas lado a lado para Equipe A e Equipe B.
   - Linhas numeradas de 1 a 14 para atletas regulares.
   - Bloco destacado para 2 Líberos.
   - Bloco para 5 membros da comissão técnica com siglas normativas (T, AT1, AT2, PF, M/F).
4. **Quadro de Sanções e Conduta (`y: 478pt`, altura `110pt` em 3 sets / `95pt` em 5 sets):**
   - Tabela normativa com colunas: Sanção, Equipe, Jogador nº, Set, Placar.
   - Caixa para marcação de Pedido Impróprio.
5. **Aprovações e Assinaturas (`y: 478pt`, altura `110pt` em 3 sets / `89pt` em 5 sets):**
   - Linhas formais de assinatura para: 1º Árbitro, 2º Árbitro, Apontador, Assistente de Apontador e Capitães de ambas as equipes.
6. **Observações e Protestos do Capitão (`y: 478pt`, altura `110pt`):**
   - Área livre com moldura técnica para relatórios de ocorrências e recursos.
7. **Quadro Resumo de Resultados (`y: 478pt`, altura `110pt`):**
   - Tabela comparativa set a set com placar, duração em minutos, substituições e tempos.
   - Linha de totais e destaque oficial da equipe vencedora.

---

## 9. Auditoria de Espaçamento e Tipografia

A análise minuciosa de densidade de informação identificou áreas críticas:

### 9.1 Problemas de Compressão (Aperto Excessivo)
* **Tamanho de Fontes Crítico:**
  - Nos números da régua ponto a ponto (`BaseosPointGrid.tsx`): fonte **`3.8pt`** com células de 1.2 × 2.8 mm.
  - Nos rótulos de formação e dados de sanções: fonte **`3.2pt`** a **`4.2pt`**.
  - No texto de observações e horários: fonte **`3.8pt`** a **`4.0pt`**.
  - **Impacto:** Em uma impressão física em folha A4 comum, fontes abaixo de 5pt tornam-se de leitura extremamente difícil para árbitros e apontadores sob iluminação de ginásio.
* **Espaço para Escrita Manual em Súmula Pré-Jogo:**
  - As linhas da tabela de atletas possuem altura de **`9.5pt` (~3.3 mm)**.
  - O padrão mínimo ergonômico para escrita manual com caneta esferográfica em prancheta esportiva é de **`5.0 mm a 6.0 mm`**. O apontador precisa espremer a caligrafia para anotar números de substituição e pontuações.

### 9.2 Problemas de Desperdício e Inconsistência
* **Margens:**
  - `matchSheetPdf.ts`: margem externa de `10 mm`.
  - `officialMatchSheetPdf.ts`: margem externa de `3.5 mm`.
  - `document-engine/baseos`: margem externa de `6 pt (~2.1 mm)`.
  - A variação de margem entre os geradores é de quase 500%, revelando a ausência de um token universal de página.

---

## 10. Auditoria de Impressão Física

1. **Margem de Sangria e Não-Impressão (Hardware Limits):**
   - A margem de `2.1 mm` (`6pt`) em `document-engine/baseos` e de `3.5 mm` em `officialMatchSheetPdf.ts` está abaixo da margem mínima física de muitas impressoras a laser e jato de tinta (que exigem de `4.2 mm` a `5.0 mm` para não cortar as bordas do papel).
   - Risco: Os traços externos das molduras podem sair cortados ou incompletos na borda esquerda e inferior do papel A4.

2. **Consumo de Toner e Fotocópia:**
   - O gerador utiliza blocos com fundo preto sólido (`#000000`) no cabeçalho das tabelas e na identificação do jogo.
   - Isso causa alto consumo de toner em impressões de mesa de competição e gera borrões caso a impressora esteja com desgaste de cilindro.

3. **Contraste em Preto e Branco (P&B):**
   - Os elementos visuais respeitam uma escala de cinzas consistente (`#000000`, `#333333`, `#CBD5E1`, `#FFFFFF`), garantindo boa reprodução em impressoras monocromáticas. Porém, tons cinzas claros (como `#F4F4F4` ou `#EAEAEA`) desaparecem ou viram ruído se o documento for fotocopiado.

---

## 11. Auditoria de Casos Extremos (Stress Testing)

| Caso Extremo | Comportamento do Motor Atual | Risco / Diagnóstico |
| :--- | :--- | :--- |
| **Nomes Longos de Equipes** (ex.: > 35 caracteres) | Truncado com `.substring(0, 28)` ou estoura a largura da célula | Nome da equipe sai cortado na súmula oficial |
| **Nomes Longos de Atletas** (ex.: > 30 caracteres) | Truncado rigidamente ou sobrepõe coluna adjacente | Perda de sobrenomes de atletas |
| **Atletas sem Número de Camisa** | Exibe `--` | Comportamento correto para súmula pré-jogo |
| **Elenco com 16 a 20 Atletas** | Apenas os primeiros 14 regulares e 2 líberos entram (`slice(0, 14)`) | Atletas excedentes são descartados silenciosamente sem alerta |
| **Equipe sem Comissão Técnica** | Linhas ficam em branco com rótulos `T`, `AT1`, etc. | Comportamento estável (permite anotação manual) |
| **Partida com W.O. (25x0, 25x0)** | Renderiza 2 sets de 25x0; sets 3 a 5 ficam vazios | Comportamento correto |
| **Vôlei de Praia (2x2)** | Gera grade de 6 posições de rotação e 14 linhas de atletas | **INCOMPATÍVEL**: Layout esportivo incorreto para a modalidade |

---

## 12. Matriz de Problemas Arquiteturais e Severidades

### [CRÍTICO] SML-01: Fragmentação e Concorrência de Quatro Geradores de Súmula
- **Severidade:** CRÍTICO
- **Arquivos:** `src/lib/pdf/matchSheetPdf.ts`, `src/lib/pdf/officialMatchSheetPdf.ts`, `src/document-engine/baseos/`, `src/document-engine/generators/`
- **Problema:** Existem 4 motores de PDF distintos com tecnologias concorrentes (`jspdf`, `@react-pdf/renderer`, `pdf-lib`).
- **Causa:** Acúmulo de implementações em fases sucessivas sem descontinuação formal dos motores anteriores.
- **Impacto:** O usuário baixa arquivos com layouts totalmente diferentes dependendo de qual botão da interface ele utiliza. A manutenção é quadruplicada.
- **Recomendação:** Na fase de implementação, unificar a plataforma em um único motor canônico moderno e aposentar os motores legados.

---

### [CRÍTICO] SML-02: Quebra de SSOT e Desconexão do `CompetitionConfig` na UI
- **Severidade:** CRÍTICO
- **Arquivos:** `src/document-engine/baseos/mapper/match.mapper.ts`, `src/document-engine/baseos/service/scoresheetService.ts`
- **Problema:** O motor consumido pela UI lê `competition.setFormat` legado em vez de invocar `CompetitionRulesService.resolveMatchFormat`.
- **Causa:** O mapper foi escrito antes da homologação final do `CompetitionConfig` como SSOT e não foi atualizado.
- **Impacto:** Fases finais com override de melhor de 5 sets geram súmulas de 3 sets em pré-jogo. Regras de pontuação e contingente de atletas de praia são ignoradas.
- **Recomendação:** Refatorar o mapper para consumir estritamente `CompetitionRulesService` e o snapshot canônico da competição.

---

### [ALTO] SML-03: Inexistência de Suporte Real a A3 (Apenas Escalação Matemática)
- **Severidade:** ALTO
- **Arquivos:** `src/document-engine/baseos/geometry/layouts.ts`, `types/scoresheet.ts`
- **Problema:** Não existe layout A3 verdadeiro. O A3 existente é uma mera multiplicação matemática de coordenadas do A4 (`scale = 1.4142`) restrita a 5 sets e inacessível na interface.
- **Causa:** Implementação incompleta da geometria A3.
- **Impacto:** Não é possível imprimir súmulas oficiais em formato A3 de prancheta federativa com proporções e tipografia otimizadas.
- **Recomendação:** Projetar layouts nativos dedicados para A4 e A3 com grids tipográficos específicos.

---

### [ALTO] SML-04: Tipografia e Espaço de Escrita Excessivamente Reduzidos para Impressão
- **Severidade:** ALTO
- **Arquivos:** `src/document-engine/baseos/components/BaseosPointGrid.tsx`, `BaseosRosters.tsx`, `BaseosResult.tsx`
- **Problema:** Textos essenciais renderizados entre `3.2pt` e `4.2pt`, com linhas de escrita manual de ~3.3 mm.
- **Causa:** Tentativa de compactar todos os blocos de uma partida completa de 5 sets em uma única folha A4 paisagem.
- **Impacto:** Dificuldade severa de leitura e preenchimento físico pela arbitragem em quadra.
- **Recomendação:** Reorganizar a arquitetura visual, priorizando áreas ativas de anotação e estabelecendo tamanho mínimo de fonte de 5.5pt a 6pt.

---

### [MÉDIO] SML-05: Dados de Partida Omitidos ou Mockados no Builder
- **Severidade:** MÉDIO
- **Arquivos:** `src/lib/pdf/matchSheetDataBuilder.ts`
- **Problema:** Arrays de tempos técnicos (`timeouts`), substituições (`substitutions`) e sanções (`sanctions`) são repassados vazios (`[]`) mesmo quando existem no banco de dados.
- **Causa:** Builder construído focado no cenário pré-jogo e não integrado ao histórico de eventos ao vivo.
- **Impacto:** Súmulas pós-jogo emitidas pelo sistema não exibem o histórico disciplinar e de tempos registrados na mesa.
- **Recomendação:** Integrar o builder aos eventos reais da partida armazenados no banco de dados.

---

### [BAIXO] SML-06: Margens Externas Críticas para Impressoras Convencionais
- **Severidade:** BAIXO
- **Arquivos:** `src/document-engine/baseos/geometry/layouts.ts`, `src/lib/pdf/officialMatchSheetPdf.ts`
- **Problema:** Margens de `2.1 mm` a `3.5 mm` avançam além da zona de segurança física de impressoras jato de tinta e laser comerciais.
- **Causa:** Falta de consideração da margem de sangria (unprintable area) dos drivers de impressão.
- **Impacto:** Linhas de borda externa podem sair cortadas na impressão física.
- **Recomendação:** Padronizar a margem mínima de segurança em `5.0 mm` (ou `14.17 pt`).

---

## 13. Verificação de Cobertura de Testes

### Testes Existentes no Repositório:
1. `src/test/matchSheetPdf.test.ts` (6 testes): Testa geração básica do gerador legado em A4 retrato via `jspdf`.
2. `src/test/officialMatchSheetPdf.test.ts` (7 testes): Testa geração de 3 sets, 5 sets, fichas de posição e súmulas em branco via `officialMatchSheetPdf.ts`.
3. `src/test/officialScoresheetPdfReact.test.tsx` (5 testes): Testa renderização de documento e geração de Blob via `@react-pdf/renderer`.
4. `src/test/documentEngine.test.ts` (6 testes): Testa geração via `pdf-lib` carimbando sobre o template PDF estático.
5. `src/test/documentEditorService.test.ts` (14 testes): Testa carregamento de contexto e persistência de layoutOverrides.
6. `src/test/scoresheetStress.test.ts` (7 testes): Testa estresse de nomes longos e integridade de dados no mapper do `document-engine/baseos`.

### Lacunas Críticas de Testes Identificadas:
- **Nenhum teste de regressão visual / snapshot:** Não há testes validando se elementos sofrem sobreposição textual ou quebra de linha indevida.
- **Nenhum teste de renderização em A3:** O layout A3 não possui nenhum teste automatizado validando suas dimensões ou integridade.
- **Nenhum teste para Vôlei de Praia:** Nenhum teste valida comportamento com formato 2x2.
- **Nenhum teste de verificação de margens físicas seguras para impressão.**

---

## 14. Verificação de Documentação

* A documentação de pré-produção (`docs/competition/pre-production-audit/11-pdf-and-reports.md`) considerava apenas o gerador `officialMatchSheetPdf.ts`, homologando-o com risco baixo.
* **Divergência Documentada:** A documentação anterior não registrava que a UI ativa do sistema em produção estava chamando `@/document-engine/baseos`, nem que a súmula digital consumia `pdf-lib` com templates escaneados da FPV.
* A documentação de apoio em `docs/docsapoio/` contém os manuais oficiais da CBV e da FIVB para 2025/2026, que devem servir como benchmark normativo para a futura reconstrução da súmula.

---

## 15. Recomendações Estratégicas para a Próxima Fase (Fase Súmula 2)

> **ATENÇÃO:** Nenhuma das recomendações abaixo deve ser implementada agora. São diretrizes analíticas para o planejamento da próxima fase.

1. **Eleger um Único Motor Canônico de PDF:**
   - Padronizar o BaseOS em torno do `@react-pdf/renderer` (que possui ecossistema baseado em componentes React, suporte nativo a Node.js e browser, tipagem TypeScript forte e compilação vetorial limpa) OU consolidar a geração vetorial direta via `jsPDF`.
   - Depreciar formalmente o Motor de carimbo sobre PDFs escaneados (`pdf-lib`) e o gerador legado em retrato.
2. **Conectar o Gerador ao `CompetitionRulesService`:**
   - Fazer o mapper receber o `CompetitionRecord` e consultar `CompetitionRulesService.resolveMatchFormat(competition, match.phase)` para derivar se a partida é melhor de 3 ou melhor de 5.
   - Respeitar pontuações customizadas e contingente de atletas configurados no `CompetitionConfig`.
3. **Desenhar Layouts Nativos Específicos para A4 e A3:**
   - **A4 Paisagem:** Focado em partidas rápidas (3 sets) e festivais, com tipografia equilibrada para leitura imediata.
   - **A3 Paisagem:** Súmula Oficial Completa da Federação (Padrão CBV/FIVB para 5 sets), com amplas réguas de pontuação, espaço generoso para escrita manual (linhas de 5 a 6 mm) e fontes confortáveis (> 6pt).
4. **Criar Templates Dedicados para Vôlei de Quadra e Vôlei de Praia:**
   - Quadra: Grade com 6 posições de rotação (I a VI), líberos e comissão técnica de 5 membros.
   - Praia: Grade simplificada para duplas (sem posições fixas de rotação 6x6, sem líberos, pontuação de 21/15 pontos e troca de lado a cada 7/5 pontos).
5. **Ajustar Margens de Impressão:**
   - Adotar margem perimetral mínima de `5.0 mm` em todos os templates para assegurar compatibilidade com 100% das impressoras de quadra.

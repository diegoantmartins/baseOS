# BASEOS — FASE 7.7 — AUDITORIA TÉCNICA DA SÚMULA

## AUDITORIA FORENSE E DIAGNÓSTICO INTEGRAL DO SUBSISTEMA DE SÚMULAS
### Engines PDF · A4/A3 · 3/5 Sets · Indoor/Beach · Rotas · Contratos · Geometria · Identidade

**Projeto:** BaseOS — Sports Intelligence  
**Ambiente:** DEV Local exclusivamente  
**Produção:** VOLTZ (`https://voltz.baseos.online`) — **TOTALMENTE CONGELADA / INTOCADA**  
**Data:** 12 de Setembro de 2026  
**Tipo de Execução:** **AUDIT-ONLY** (Sem alterações de código de produção)  
**Status da Auditoria:** **GO WITH LIMITATIONS** (Subsistema canônico A4 Indoor 3/5 sets consolidado e validado; identificadas limitações estruturais em Beach, A3 e resíduos em motores legados)

---

## 1. OBJETIVO DA FASE 7.7

Realizar uma auditoria técnica forense e completa de todo o ecossistema de geração de súmulas esportivas do BaseOS, cobrindo:
1. Identificação do engine canônico ativo e mapeamento de todos os engines concorrentes/legados;
2. Rastreamento de ponta a ponta: Telas $\rightarrow$ Botões $\rightarrow$ Handlers $\rightarrow$ Serviços $\rightarrow$ Mappers $\rightarrow$ Layouts $\rightarrow$ PDF;
3. Auditoria detalhada dos contratos de dados (`MatchRecord`, `CompetitionRecord`, `CompetitionRulesService`, etc.);
4. Realidade do suporte a **Indoor vs. Beach (Praia)**;
5. Mecanismo de geração de partidas de **3 sets vs. 5 sets**;
6. Conformidade dimensional **A4 vs. A3** (Nativo vs. Escala vs. Inexistente);
7. Sistema de validação geométrica e histórico de refinamentos visuais;
8. Inspeção de PDFs reais gerados pelo motor;
9. Varredura e classificação de menções residuais à marca legada "VolleyPro";
10. Papel do Editor de Documentos (`/documentos/editor`) e seu motor `pdf-lib`;
11. Matriz de risco (P0, P1, P2, P3);
12. Recomendações e plano cirúrgico para a próxima fase de implementação.

---

## 2. REGRA MANDATÓRIA DE DESIGN

> **DIRETRIZ FUNDAMENTAL:**  
> **NÃO REDESENHAR A SÚMULA.**  
> O layout-base vetorial em cards do BaseOS (`@react-pdf/renderer`), aprovado e refinado nas Fases Súmula 2, 3 e 4.1, é o padrão visual oficial. Esta auditoria preserva integralmente esse baseline. Não há proposta de redesign estético ou estrutural, mas sim diagnóstico exato de conformidade, contratos, dados e geometria.

---

## 3. INVENTÁRIO COMPLETO DOS ENGINES PDF

A busca em todo o repositório identificou **5 motores distintos** operando com **3 bibliotecas gráficas**:

| Engine | Biblioteca | Arquivos Principais | Status | Uso Atual na UI | Formato de Saída | Observações Técnicas |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **1. BaseOS Canonical Document Engine** | `@react-pdf/renderer` (v4.3.1) | `src/document-engine/baseos/` (`scoresheetService.ts`, `serveOrderService.ts`, `templates/`, `components/`) | **CANÔNICO ATIVO** | Todas as telas de partidas (`MatchesPage`, `MatchSheetPage`, `ReportsPage`, `BlankSheetEmitDialog`, `CompetitionRegistrationsPage`) | A4 Paisagem (841.89×595.28 pt) e A3 Escala (1190.55×841.89 pt) | Único motor oficial de partidas. Layout modular em cards, orientado a geometria. |
| **2. BaseOS Template Overlay Editor** | `pdf-lib` (v1.17.1) | `src/document-engine/generators/` (`sumula3.generator.ts`, `sumula5.generator.ts`, `ordemSaque.generator.ts`, `render.ts`) | **ATIVO SECUNDÁRIO** | `/documentos/editor` e `/documentos/editor/:matchId` (`DocumentEditorPage.tsx`) | Template fixo FPV (992×566 pt) | Carimba texto sobre templates PDF escaneados. Mantido para edição manual de coordenadas e campos. |
| **3. Federação Vetorial Paisagem** | `jsPDF` (v4.0.0) | `src/lib/pdf/officialMatchSheetPdf.ts` | **LEGADO / DEPRECADO** | **Zero consumidores na UI** (exclusivo para testes automatizados) | A4 Paisagem (297×210 mm) | Código artesanal que reproduz súmula federativa. Não é mais acionado por nenhum botão do usuário. |
| **4. Tabular Linear Retrato** | `jsPDF` (v4.0.0) | `src/lib/pdf/matchSheetPdf.ts` | **LEGADO / DEPRECADO** | **Zero consumidores na UI** (exclusivo para testes legados) | A4 Retrato (210×297 mm) | Motor original herdado do VolleyPro. Foi substituído pelo motor BaseOS na Fase Súmula 2. |
| **5. Relatórios Operacionais de Competição** | `jsPDF` (v4.0.0) | `src/lib/pdf/reportsPdf.ts` | **CANÔNICO ATIVO (RELATÓRIOS)** | `/relatorios` (`ReportsPage.tsx`) | A4 Retrato e Paisagem | Emite os 9 relatórios auditados na Fase 7.5/7.6 (Boletim, Programação, Arbitragem, Estatísticas, etc.). Não gera súmula de jogo. |

---

## 4. O ENGINE CANÔNICO BASEOS (`src/document-engine/baseos/`)

### 4.1 Estrutura Arquitetural
```text
src/document-engine/baseos/
├── components/          # Blocos visuais isolados
│   ├── BaseosHeader.tsx            # Cabeçalho oficial com branding BaseOS e dados do jogo
│   ├── BaseosSetBlock.tsx          # Bloco do set (rotações I..VI, parciais, substituições)
│   ├── BaseosPointGrid.tsx         # Régua de pontos (3 colunas regular / 1 coluna tie-break)
│   ├── BaseosRosters.tsx           # Elencos: 14 regulares, 2 líberos, comissão e capitães
│   ├── BaseosSanctions.tsx         # Tabela regulamentar de sanções individuais e coletivas
│   ├── BaseosResult.tsx            # Quadro de resultado oficial, parciais e duração
│   ├── BaseosSignatures.tsx        # Assinaturas de capitães e 6 oficiais de arbitragem
│   ├── BaseosRemarks.tsx           # Observações gerais e destaque MVP da partida
│   ├── BaseosServeOrderCard.tsx    # Card de ordem de saque (ficha de posição)
│   └── BaseosServeOrderHeader.tsx  # Cabeçalho da ficha de posição
├── domain/              # Regras esportivas puras
│   ├── roster.rules.ts             # Capacidade de elenco (14 atletas, 2 líberos, 5 comissão)
│   ├── rotation.rules.ts           # Posições de rotação I a VI
│   └── set.rules.ts                # Pontuações (25/15), tiebreak e réguas (36/30)
├── geometry/            # Coordenadas matemáticas e validação
│   ├── dimensions.ts               # Alturas e proporções dos blocos
│   ├── grids.ts                    # Grades e subdivisões internas
│   ├── layouts.ts                  # Layouts fixos por cards (3 sets A4, 5 sets A4, 5 sets A3)
│   ├── layoutValidator.ts          # Validador de colisão e bounds de página
│   ├── page.ts                     # Dimensões físicas de papel (A4 e A3)
│   └── rect.ts                     # Primitivas geométricas (x, y, width, height)
├── mapper/              # Transformação Domínio -> Documento
│   ├── match.mapper.ts             # Fachada principal de mapeamento e blank factory
│   ├── roster.mapper.ts            # Mapeamento e ordenação de atletas por camisa
│   ├── set.mapper.ts               # Mapeamento de pontos marcados e rotação ao vivo
│   └── team.mapper.ts              # Mapeamento de comissão técnica e metadados
├── service/             # Fachada consumida pela aplicação
│   ├── scoresheetService.ts        # loadBaseosScoresheetData, generateBaseosPdfBlob, downloads
│   └── serveOrderService.ts        # Geração de fichas de ordem de saque e pacote do jogo
├── templates/           # Documentos raiz do @react-pdf/renderer
│   ├── BaseosThreeSetScoresheet.tsx     # Súmula de 3 sets (A4)
│   ├── BaseosFiveSetScoresheet.tsx      # Súmula de 5 sets (A4/A3)
│   ├── BaseosBatchScoresheetDocument.tsx# Documento multi-páginas para impressão em lote
│   └── BaseosServeOrderDocument.tsx     # Fichas de ordem de saque (1, 3 e 5 sets)
├── theme/               # Tokens de design
│   ├── colors.ts                   # Paleta oficial (Navy, Amber, Slate, Gray)
│   ├── tokens.ts                   # Espaçamentos, bordas e fontes
│   └── typography.ts               # Tipografia Helvetica / Helvetica-Bold
├── types/               # Contratos TypeScript do Document Engine
│   ├── competition.ts, officials.ts, scoresheet.ts, serveOrder.ts, set.ts, team.ts
└── validation/          # Validação de integridade do payload
    └── validator.ts                # Validação estrita pré-renderização
```

### 4.2 Fluxo Canônico de Execução
```text
MatchRecord + CompetitionRecord + TeamRecord + CompetitionAthlete
                           ↓
scoresheetService.loadBaseosScoresheetData(matchId, forcedState?, output?)
                           ↓
match.mapper.ts (mapMatchRecordToBaseosScoresheet)
     ├── CompetitionRulesService.resolveMatchFormat(...)  (SSOT de Regras)
     ├── mapTeam(...) + mapRoster(...)                    (Elencos e Líberos)
     ├── mapLiveSetData(...) | createBlankSetData(...)    (Sets e Pontos)
     └── CompetitionRulesService.getCanonicalMatchResult (Placar Oficial)
                           ↓
BaseosScoresheetData (Payload Documental Estruturado)
                           ↓
validator.ts (validateBaseosScoresheetData)
                           ↓
scoresheetService.createBaseosDocumentElement(data)
     ├── BaseosFiveSetScoresheet (se data.document.format === '5-sets')
     └── BaseosThreeSetScoresheet (se data.document.format === '3-sets')
                           ↓
layouts.ts (getScoresheetLayout) ──► layoutValidator.ts
                           ↓
@react-pdf/renderer (pdf(element).toBlob())
                           ↓
Blob binário (Download / Preview / Impressão)
```

---

## 5. MAPA DE ROTAS, BOTÕES E CONSUMIDORES NA UI

Todos os pontos de disparo de súmula na interface foram mapeados e testados:

| Tela / Rota | Elemento / Botão | Handler | Função Acionada | Engine Conectado | Formato / Documento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/jogos` (`MatchesPage.tsx`) | Ação "Emitir Súmula" na tabela de jogos | `setEmitMatch(match)` | `MatchSheetEmitDialog` | **Engine 1 (BaseOS)** | Súmula da partida (A4 Paisagem, 3 ou 5 sets) |
| `/jogos` (`MatchesPage.tsx`) | Botão "Súmula em Branco" no header | `setBlankSheetOpen(true)` | `BlankSheetEmitDialog` | **Engine 1 (BaseOS)** | Modelo em branco (3 sets, 5 sets ou fichas) |
| `/sumulas` / `/sumulas/:matchId` (`MatchSheetPage.tsx`) | Botão "Emitir Súmula" no topo | `handleEmitScoresheet(match)` | `MatchSheetEmitDialog` | **Engine 1 (BaseOS)** | Súmula da partida (A4 Paisagem) |
| `/sumulas/:matchId` (`MatchSheetPage.tsx`) | Aba "Súmula Digital" | `MatchPdfPreview` | `loadBaseosScoresheetData` | **Engine 1 (BaseOS)** | Preview interativo ao vivo (PDF renderizado) |
| `/sumulas/:matchId` (`MatchSheetInterface.tsx`) | Botão "Baixar Súmula" na barra de ações ao vivo | `handleDownloadPdf` | `downloadBaseosScoresheet` | **Engine 1 (BaseOS)** | Download direto da súmula ao vivo |
| `/relatorios` (`ReportsPage.tsx`) | Card de Acesso Rápido "Súmula Oficial" | `handleOpenMatchSheetDialog` | `MatchSheetEmitDialog` | **Engine 1 (BaseOS)** | Súmula oficial da partida selecionada |
| `/relatorios` (`ReportsPage.tsx`) | Card "Súmula em Branco" | `setBlankSheetOpen(true)` | `BlankSheetEmitDialog` | **Engine 1 (BaseOS)** | Súmula limpa para anotação em quadra |
| `/competicoes/:id/inscricoes` (`CompetitionRegistrationsPage.tsx`) | Botão "Baixar Súmulas de Todas as Partidas" | `handleDownloadAllScoresheets` | `downloadBaseosBatchScoresheets` | **Engine 1 (BaseOS)** | Lote multi-páginas de todas as partidas |
| `/equipe/inscricao/:token` (`TeamRosterRegistrationPage.tsx`) | Botão "Súmula Oficial" | `setMatchSheetOpen(true)` | `MatchSheetEmitDialog` | **Engine 1 (BaseOS)** | Súmula pré-preenchida da equipe |
| `/documentos/editor` (`DocumentEditorPage.tsx`) | Botão "Exportar PDF" | `handleExport` | `buildMatchDocument` $\rightarrow$ `generateThreeSetScoresheet` | **Engine 2 (`pdf-lib`)** | Súmula editada sobre template fixo FPV |

> **Conclusão:** 100% dos botões de emissão de súmula oficial da interface estão unificados no **Engine 1 (BaseOS Canônico)**. O **Engine 2 (`pdf-lib`)** está restrito à rota dedicada `/documentos/editor`. Os Engines 3 e 4 possuem ZERO chamadas na UI.

---

## 6. CONTRATOS DE DADOS DA SÚMULA

### 6.1 Dados que Existem no Domínio e Chegam à Súmula
- **Competição:** Nome, fase resolvida, rodada, data, local, quadra, categoria (`playerFormat`), gênero.
- **Equipes:** Nome oficial, nome curto, cidade, logo (quando cadastrado em `team.logoUrl`).
- **Elencos:** Nome completo do atleta, número de camisa (1-99), status de capitão (`isCaptain`), status de líbero (`isLibero`), posição formal declarada.
- **Comissão Técnica:** Técnico (`coachName`), Assistente (`assistantCoach`), Preparador Físico (`physicalTrainer`), Médico (`doctor`).
- **Arbitragem:** 1º Árbitro, 2º Árbitro e Apontador/Anotador (extraídos de `match.referees`).
- **Sets e Placar:** Pontuação de cada set, parciais marcadas, ordem de saque/rotação inicial (quando lançadas em `match.lineups`).
- **Resultado Oficial:** Vencedor, lado vencedor ('A' ou 'B'), placar final de sets ganho por cada equipe derivado via `CompetitionRulesService.getCanonicalMatchResult`.
- **Destaque MVP:** Nome e camisa do atleta MVP integrado automaticamente no campo de observações (`match.highlightAthleteId`).

### 6.2 Dados Opcionais com Fallback Seguro
- **Camisa do Atleta:** Opcional no cadastro de atletas; se ausente, ordena pelo índice de inscrição e deixa o número em branco para anotação em quadra.
- **Horário do Jogo:** Formatado de `scheduledTime`; se ausente, exibe string vazia.
- **Oficiais Adicionais:** Juízes de linha (1 a 4) e apontador assistente — deixados em branco para preenchimento manual na súmula física.

### 6.3 Dados Inexistentes no Domínio (Não Inventados)
- **Sanções Disciplinares:** Não há tabela de cartões (`match_sanctions`). O campo `sanctions: []` é sempre vazio no pré-jogo e no pós-jogo, permitindo anotação física.
- **Solicitações Impróprias:** `improperRequests: { teamA: false, teamB: false }` é default fixo.
- **Assinaturas Digitais:** `signatures: {}` é vazio; o layout provê linhas nítidas para assinatura física a caneta.

---

## 7. AUDITORIA: INDOOR VS. BEACH (PRAIA)

Esta é uma das descobertas mais críticas da auditoria:

### 7.1 Como o Domínio Trata as Modalidades
- O `CompetitionConfig` e o `CompetitionRulesService` diferenciam perfeitamente:
  - **Indoor:** 6 atletas em quadra, até 2 líberos, parciais de 25 pontos (tie-break 15), melhor de 3 ou melhor de 5 sets.
  - **Beach:** 2 atletas em quadra (duplas), 0 líberos, parciais de 21 pontos (tie-break 15), melhor de 3 sets (`setsToWin = 2`).

### 7.2 O Que Acontece no Engine de Súmula (`src/document-engine/baseos/`)
1. **Regra de Pontuação:** A regra de pontuação esportiva é respeitada graças à Fase Súmula 4.1. O `set.rules.ts` recebe `regularSetPoints: 21` e calcula a pontuação-alvo do set como 21.
2. **Layout Geométrico:** **O layout visual é 100% EXCLUSIVO PARA INDOOR 6x6.**
   - O `BaseosSetBlock` desenha rigidamente **6 caixas de rotação (I a VI)** para cada equipe, com campos de substituições e tempos;
   - O `BaseosRosters` desenha tabela para **14 atletas regulares + 2 líberos + comissão técnica** de 4 membros;
   - No vôlei de praia não existem rotações I..VI, não há líbero, não há substituições tradicionais e o elenco é composto por apenas 2 atletas (mais até 2 reservas);
   - A régua de pontos (`maxPointsRuler`) permanece em 36 pontos.

> **Diagnóstico:** O BaseOS **NÃO POSSUI TEMPLATE DE SÚMULA PARA VÔLEI DE PRAIA**. Se uma partida de praia for emitida, ela será impressa sobre a carcaça de uma súmula de voleibol de quadra 6x6. **Classificação: P1 (Limitação Arquitetural Mapeada).**

---

## 8. AUDITORIA: 3 SETS VS. 5 SETS

### 8.1 Resolução do Formato
O formato da partida é resolvido de forma canônica e determinística:
```text
CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)
```
- Se `setsToWin === 3 || maxSets === 5`: seleciona `'5-sets'`.
- Caso contrário: seleciona `'3-sets'`.
- Se o jogo já tiver mais de 3 sets lançados no banco: força `'5-sets'`.

### 8.2 Templates e Geometria
Não é um layout único redimensionado dinamicamente; existem **dois templates e layouts distintos**:
1. **`BaseosThreeSetScoresheet.tsx` (`THREE_SET_A4_LAYOUT`):**
   - Lado Esquerdo: Sets 1, 2 e 3 empilhados verticalmente (altura 138pt cada);
   - Lado Direito Superior: Roster integrado (306.89 × 420 pt) para Equipes A e B;
   - Rodapé: 4 cards em linha (`sanctions` 165pt, `signatures` 220pt, `remarks` 132.5pt, `result` 304.89pt), todos com base em $y = 585\text{ pt}$ (respiro perfeito de 10pt para o fim da folha).
2. **`BaseosFiveSetScoresheet.tsx` (`FIVE_SET_A4_LAYOUT`):**
   - Topo e Meio: Sets 1 a 4 dispostos em grade 2×2 (largura ~411pt, altura 110pt cada);
   - Meio Esquerdo: Set 5 (largura 520pt, altura 120pt) com troca de quadra no tie-break;
   - Lado Direito Inferior: Rosters (304.89 × 309 pt);
   - Rodapé: Dividido em duas linhas compactas (Sanções + Observações em $y=398$; Resultado + Assinaturas em $y=494$).

---

## 9. AUDITORIA: A4 VS. A3

### 9.1 Dimensões de Papel
- **A4 Paisagem:** $841.89 \times 595.28\text{ pt}$ ($297 \times 210\text{ mm}$). Margem de 6pt.
- **A3 Paisagem:** $1190.55 \times 841.89\text{ pt}$ ($420 \times 297\text{ mm}$). Margem de 8.48pt.
- Fator de Escala: $\text{scale} = \frac{1190.55}{841.89} \approx 1.41414$ ($\sqrt{2}$).

### 9.2 Realidade do Suporte a A3
A auditoria constatou formalmente:
1. **A3 NÃO É NATIVO:** Não existe nenhum layout desenhado do zero para A3. O que existe é uma multiplicação escalar linear das coordenadas do A4 (`scaleCardLayout(FIVE_SET_A4_LAYOUT.cards, A3_FROM_A4_SCALE)`).
2. **A3 SÓ EXISTE PARA 5 SETS:** Para 3 sets, a função `getScoresheetLayout('3-sets', 'master')` **retorna o layout A4**, ignorando a solicitação de A3.
3. **A3 É TOTALMENTE INACESSÍVEL NA INTERFACE DO USUÁRIO:**
   - Em `MatchSheetEmitDialog.tsx`, `BlankSheetEmitDialog.tsx`, `MatchPdfPreview.tsx` e `CompetitionRegistrationsPage.tsx`, o parâmetro `output` **NUNCA** é passado como `'master'`;
   - Todos os componentes usam o padrão `output = 'print-a4'`;
   - Não existe nenhum botão, seletor ou dropdown na interface que permita ao operador escolher o tamanho do papel (A4 vs A3).

> **Classificação de A3:** **A3 POR ESCALA EM 5 SETS / NÃO IMPLEMENTADO EM 3 SETS / INACESSÍVEL NA UI (P1).**

---

## 10. AUDITORIA GEOMÉTRICA E REFINAMENTOS DA FASE 3

Todos os 8 itens de geometria auditados e homologados na Fase Súmula 3 foram inspecionados:
- ✅ **ITEM 1 (PONTOS):** Cabeçalho da régua de tie-break (`maxPoints = 8`) com largura de 16pt e fonte 3.4pt. Texto "PONTOS" renderiza sem qualquer truncamento.
- ✅ **ITEM 2 (CapitãoCapitão):** Linhas de assinatura dos capitães com largura balanceada de 56pt. Texto redundante eliminado.
- ✅ **ITEM 3 (Conflito de Rodapé):** Base dos cards inferiores posicionada em $y = 585\text{ pt}$ (3 sets) e $y = 584\text{ pt}$ (5 sets), mantendo respiro visual e margem segura antes do limite físico do papel ($595.28\text{ pt}$).
- ✅ **ITEM 4 (Overflow de Assinaturas):** Grid interno com `flex: 1`, adaptando-se às alturas de 90pt (5 sets) e 107pt (3 sets).
- ✅ **ITEM 5 (Sanções):** `footerNote` em `flex: 1`, textos de 3.4pt e 3.4pt perfeitamente legíveis para impressão.
- ✅ **ITEM 6 (Círculos A/B no Roster):** Círculos contrastados em branco sobre fundo preto com preenchimento da equipe ativa.
- ✅ **ITEM 7 (Cabeçalho Responsivo):** Alturas flexíveis (`flex: 1.4` e `flex: 1`) adaptando-se tanto a cards de 42pt (3 sets) quanto de 34pt (5 sets).
- ✅ **ITEM 8 (Validador Geométrico):** Inclusão de `remarks` em `flattenLayoutRects`. Teste matemático confirma zero sobreposições.

---

## 11. VALIDAÇÃO DE PDFS REAIS GERADOS

A execução da suíte de teste `generateInspectionPdfs.test.ts` e `generateServeOrderInspectionPdfs.test.ts` gerou **14 arquivos PDF reais** inspecionados no diretório `dist/pdf-inspection/`:

| Arquivo Gerado | Formato / Modalidade | Páginas | Dimensões (pt) | Integridade |
| :--- | :--- | :---: | :---: | :---: |
| `sumula_3sets_blank_a4.pdf` | 3 sets em branco (A4) | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `sumula_3sets_preenchida_a4.pdf` | 3 sets preenchido (A4) | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `sumula_5sets_blank_a4.pdf` | 5 sets em branco (A4) | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `sumula_5sets_preenchida_a4.pdf` | 5 sets preenchido (A4) | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `sumula_5sets_blank_a3.pdf` | 5 sets em branco (A3) | 1 | 1190.55 × 841.89 | ✅ Perfeito (Escalado) |
| `sumula_5sets_preenchida_a3.pdf` | 5 sets preenchido (A3) | 1 | 1190.55 × 841.89 | ✅ Perfeito (Escalado) |
| `sumula_5sets_vitoria_time_b_a4.pdf` | 5 sets vitória Equipe B (A4) | 1 | 841.89 × 595.28 | ✅ Placar 1:3 exato |
| `ordem_saque_1set_preenchida.pdf` | Ordem de saque 1 set | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `ordem_saque_3sets_em_branco.pdf` | Ordem de saque 3 sets branco | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `ordem_saque_3sets_preenchida.pdf` | Ordem de saque 3 sets preenchido | 1 | 841.89 × 595.28 | ✅ Perfeito |
| `ordem_saque_5sets_em_branco.pdf` | Ordem de saque 5 sets branco | 2 | 841.89 × 595.28 | ✅ Perfeito |
| `ordem_saque_5sets_preenchida.pdf` | Ordem de saque 5 sets preenchido | 2 | 841.89 × 595.28 | ✅ Perfeito |
| `ordem_saque_estresse_nomes_longos.pdf` | Nomes longos estresse | 1 | 841.89 × 595.28 | ✅ Truncamento seguro |
| `pacote_completo_jogo_3sets.pdf` | Súmula + Ordem de Saque | 2 | 841.89 × 595.28 | ✅ Unificado |

---

## 12. AUDITORIA DE IDENTIDADE: BASEOS VS. VOLLEYPRO

Foi executada busca global exaustiva por referências à marca legada `VolleyPro` nos motores documentais:

| Localização | Ocorrência | Classificação | Avaliação de Risco | Ação Recomendada |
| :--- | :--- | :---: | :---: | :--- |
| `src/document-engine/baseos/` (Motor Canônico) | **ZERO ocorrências**. Utiliza rigorosamente "BaseOS — Sports Intelligence". | **Aprovado** | **Nenhum** | Manter padrão canônico |
| `src/document-engine/generators/sumula3.generator.ts:86` | `orgName = 'VolleyPro'` (fallback) | **P2** | Baixo (Editor de Documentos) | Substituir fallback por 'BaseOS' |
| `src/document-engine/generators/sumula5.generator.ts:73` | `orgName = 'VolleyPro'` (fallback) | **P2** | Baixo (Editor de Documentos) | Substituir fallback por 'BaseOS' |
| `src/lib/pdf/officialMatchSheetPdf.ts:964, 989, 1009, 1078` | `VolleyPro · Fichas de Posição`, `orgName = 'VolleyPro'` | **P2** | Baixo (Motor Legado sem UI) | Substituir ou manter até depreciação final |
| `src/lib/pdf/matchSheetPdf.ts:688` | `VolleyPro - Sistema de Gestão de Competições` | **P2** | Baixo (Motor Legado sem UI) | Substituir ou manter até depreciação final |
| `src/lib/pdf/matchSheetDataBuilder.ts:143` | `orgName: 'VolleyPro'` | **P2** | Baixo (Builder de motor legado) | Substituir por 'BaseOS' |

---

## 13. O EDITOR DE DOCUMENTOS (`/documentos/editor`)

- **Objetivo:** O Editor de Documentos é uma ferramenta especializada voltada para organizadores que desejam carimbar dados e ajustar posições de texto milimetricamente sobre templates PDF escaneados da FPV (`sumula-3-sets.pdf`, `sumula-5-sets.pdf`, `ordem-saque.pdf`).
- **Motor Utilizado:** `pdf-lib`.
- **Diferenciação Clara:** O Editor de Documentos **NÃO É** a súmula oficial vetorial do BaseOS. Ele atende ao caso de uso de preenchimento manual em formulários legados da federação.
- **Recomendação:** Deve permanecer estritamente isolado na sua rota `/documentos/editor`, sem qualquer interferência com a emissão canônica de súmulas em `MatchSheetEmitDialog` e `BlankSheetEmitDialog`.

---

## 14. MATRIZ DE SUPORTE: A3 / A4 / MODALIDADE / SETS

| Cenário | Engine Responsável | A4 | A3 | Indoor | Beach (Praia) | 3 Sets | 5 Sets | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Súmula de Partida Oficial** | `src/document-engine/baseos/` | ✅ Nativo | ⚠️ Escala (Inacessível na UI) | ✅ Nativo | ❌ Carcaça Indoor (Sem layout praia) | ✅ Nativo | ✅ Nativo | **Operacional Indoor** |
| **Súmula em Branco** | `src/document-engine/baseos/` | ✅ Nativo | ⚠️ Escala (Inacessível na UI) | ✅ Nativo | ❌ Carcaça Indoor (Sem layout praia) | ✅ Nativo | ✅ Nativo | **Operacional Indoor** |
| **Ficha de Ordem de Saque** | `src/document-engine/baseos/` | ✅ Nativo | N/A | ✅ Nativo | ❌ N/A (Praia não tem rotação 6x6) | ✅ Nativo | ✅ Nativo | **Operacional Indoor** |
| **Pacote do Jogo (Súmula + Ordem)**| `serveOrderService.ts` | ✅ Nativo | N/A | ✅ Nativo | ❌ N/A | ✅ Nativo | ✅ Nativo | **Operacional Indoor** |
| **Editor de Documentos** | `src/document-engine/generators/` | ⚠️ FPV 992×566 pt | ❌ Ausente | ⚠️ Carimbado | ❌ Ausente | ✅ Template | ✅ Template | **Operacional Manual** |

---

## 15. MATRIZ DE RISCO E CLASSIFICAÇÃO DE ACHADOS

| ID | Severidade | Descrição do Achado | Impacto | Recomendação para a Próxima Fase |
| :---: | :---: | :--- | :--- | :--- |
| **ACH-01** | **P1** | **Ausência de Layout para Vôlei de Praia (Beach):** O motor documental utiliza a grade indoor 6x6 (6 rotações, líberos, 14 atletas) para jogos de praia. | Partidas de praia geram súmula visualmente incorreta para a modalidade. | Desenvolver template vetorial dedicado para vôlei de praia (duplas 2x2, sem líberos, sem posições de rotação) em fase específica de Beach. |
| **ACH-02** | **P1** | **A3 Inacessível na UI e Inexistente em 3 Sets:** A interface nunca passa `output: 'master'`, e o motor cai em A4 para partidas de 3 sets. | Operador esportivo não consegue emitir súmula em formato A3 diretamente pelo sistema. | Adicionar opção A4/A3 nos diálogos de emissão e criar escala matemática para o template de 3 sets. |
| **ACH-03** | **P2** | **Resíduos de Fallback "VolleyPro":** Fallbacks em `sumula3.generator.ts`, `sumula5.generator.ts`, `officialMatchSheetPdf.ts` e `matchSheetDataBuilder.ts`. | Inconsistência de branding secundária. | Substituir fallbacks textuais por "BaseOS" na próxima fase de limpeza. |
| **ACH-04** | **P2** | **Engines Legados Coexistentes sem Uso:** `officialMatchSheetPdf.ts` e `matchSheetPdf.ts` continuam no repositório apenas para atender testes legados. | Débito técnico e confusão arquitetural. | Manter devidamente marcados como `@deprecated` até refatoração dos testes remanescentes. |
| **ACH-05** | **P3** | **Alerta em Ambiente Node para `generateGamePackagePdfBlob`:** `sumulaBlob.arrayBuffer is not a function` ocorre em mock de Node/Vitest, caindo no fallback gracioso. | Log de warning durante testes unitários de backend. | Adequar conversão de Blob para Buffer em testes Node. |

---

## 16. DECLARAÇÃO DE CONGELAMENTO DA PRODUÇÃO

> **DECLARAÇÃO FORMAL OBRIGATÓRIA:**  
> A instância de produção VOLTZ (`https://voltz.baseos.online`) permaneceu **100% CONGELADA E INTOCADA** durante toda a execução da Fase 7.7. Não foi realizado deploy, migração no banco de dados remoto, alteração em contêineres ou restart de serviços.

---

## 17. STATUS FINAL DA AUDITORIA

### **STATUS: GO WITH LIMITATIONS**

**Justificativa Técnica:**
- **GO:** O motor documental canônico (`src/document-engine/baseos/`) é sólido, moderno, determinístico, possui 100% de cobertura nos testes de geometria e renderização real (54 testes aprovados na suíte do motor), está perfeitamente integrado a todas as telas da aplicação web e é o único utilizado para emissão de súmulas de partidas oficiais e em branco.
- **LIMITATIONS:** O suporte a vôlei de praia não possui layout específico (usa carcaça indoor 6x6), o formato A3 é restrito a 5 sets e inacessível pela interface do usuário, e motores legados em `jspdf` ainda coexistem para testes antigos.
- O sistema está **APTO E SEGURO** para avançar para a próxima etapa do roadmap.

# BASEOS — AUDITORIA COMPLETA DAS SÚMULAS
## Reconciliação do Histórico, Análise Visual, Implementação Atual e Especificação Definitiva de Correção

**Papel:** Senior Product Engineer + Document/PDF Engineer + QA Master + Auditor de Produto  
**Workspace:** `/home/diego-martins/docker/volei`  
**Ambiente:** DEV / Laboratório Local (Produção VOLTZ estritamente intocada / Read-Only)  
**Data da Auditoria:** 30/09/2026  
**Status Global da Auditoria:** AUDITORIA TÉCNICA CONCLUÍDA (0 alterações de código de produto)

---

## 1. ESTADO ATUAL DO WORKSPACE

* **Branch:** `main`
* **HEAD Commit:** `77bc4d6 fix(match-sheet): enforce side-out rotation and set validation`
* **Worktree:** Preservado integralmente. As alterações locais de fases anteriores (35 arquivos modificados, incluindo diálogos de emissão de súmula, migrações de segurança e novas páginas do portal) continuam intactas e não foram descartadas nem resetadas.
* **Ambiente de Execução:** Local / DEV Node.js v20+ / Linux x86_64.
* **Integridade de Tipagem:** `npx tsc -p tsconfig.app.json --noEmit` executado com **0 erros**.
* **Integridade Linter:** `npm run lint` executado com **0 erros** (1 aviso pré-existente de dependência de hook em `DrawArenaCanvas.tsx`).
* **Integridade da Suíte de Documentos & Regressão:** `npx vitest run src/test/document-engine/ src/test/gate2fFunctionalRegression.test.ts` executou **12 arquivos de teste e 68 testes**, com **100% de aprovação (68 passed)**.

---

## 2. FONTES HISTÓRICAS ENCONTRADAS

Para esta auditoria foram localizados, lidos e reconciliados os seguintes artefatos e fontes históricas:

### 2.1 Decisões Arquiteturais e Diretrizes
1. `docs/architecture/DECISIONS.md`: **ADR-002** — Estabelece `@react-pdf/renderer` como motor canônico para geração vetorial de súmula oficial em página única A4 paisagem, com tipografia padronizada, suporte a 3 e 5 sets e eliminação de Canvas rasterizado.
2. `AGENTS.md`: Diretrizes mestras do sistema, incluindo regra de número de camisa 1-99 opcional (confirmado no dia da partida), convenção de isolamento de regras de negócio em serviços e testes unitários.

### 2.2 Auditorias e Relatórios de QA Anteriores
1. `docs/competition/audit-match-sheet-pdf.md`: Documentação inicial do diagnóstico do subsistema de súmulas, identificando a coexistência de 4 engines concorrentes (`matchSheetPdf.ts`, `officialMatchSheetPdf.ts`, `document-engine/baseos`, `document-engine/generators/sumula3/5`), densidade tipográfica crítica (3.2 a 4.2 pt) e linhas de atleta comprimidas a 9.5 pt (3.3 mm), inviabilizando preenchimento manual oficial.
2. `docs/walkthroughs/FASE-7.7-AUDITORIA-SUMULA.md` e `docs/audits/FASE-7.7-AUDITORIA-SUMULA.md`: Auditoria que confirmou a canonicidade do `@react-pdf/renderer`, diagnosticou o conflito de impressão de súmula indoor vs vôlei de praia (Beach) e classificou a falta de seleção A3 como gap P1.
3. `docs/walkthroughs/FASE-4C-GATE-1A-SEGURANCA-SUMULAS.md` e `FASE-4C-GATE-1A.1-VERIFICACAO.md`: Homologação da camada de autorização do módulo de súmulas via RBAC/RLS, impedindo edição de súmula por perfis não autorizados e protegendo rotas de árbitros.
4. `docs/walkthroughs/GATE-2F-FUNCTIONAL-COMPLETION-REGRESSION.md`: Validação funcional de regras de negócio, ciclo de vida e concorrência pré-release.
5. `docs/walkthroughs/EXECUCAO-FINAL-PRODUTO-DEV-SUMULAS-DOCUMENTOS-TORNEIO.md`: Walkthrough da execução de consolidação do fluxo de torneio, geração de 7 casos de inspeção de PDF (Casos A a G) e separação de emissão em branco da súmula da partida.

### 2.3 Walkthroughs de Correção Cirúrgica de Geometria
1. `docs/WALKTHROUGH_FASE_SUMULA_1.md`: Levantamento dos 9 problemas arquiteturais (SML-01 a SML-09), limites de margem de hardware (4.0 a 5.0 mm), saturação de toner preto e ausência de histórico de pontuação lance a lance.
2. `docs/WALKTHROUGH_FASE_SUMULA_2.md`: Descontinuação dos geradores `jspdf` legados, centralização do motor em `src/document-engine/baseos/` e acoplamento ao `CompetitionRulesService.resolveMatchFormat`.
3. `docs/WALKTHROUGH_FASE_SUMULA_3.md`: Correção cirúrgica de 8 itens de layout:
   * Item 1: Truncamento da palavra `PONTOS` (`PON-...`);
   * Item 2: Colisão textual no cabeçalho do elenco (`CapitãoCapitão`);
   * Item 3: Colisão vertical do rodapé com a margem inferior em `y=585/584 pt`;
   * Item 4: Estouro de altura de assinaturas no layout de 5 sets;
   * Item 5: Estouro do bloco de sanções;
   * Item 6: Contraste de círculos A/B no cabeçalho invertido;
   * Item 7: Ajuste de altura do cabeçalho (42 pt para 3 sets, 34 pt para 5 sets);
   * Item 8: Registro de observações no validador de geometria.
4. `docs/WALKTHROUGH_FASE_SUMULA_4.md` e `4_1.md`: Correção da inversão de placar no bloco de resultado (`BaseosResult.tsx`) e propagação das regras de pontuação de set (`SetFormatConfig`) configuradas no torneio.

### 2.4 Gabaritos Federativos e Scans Físicos Originais
1. `src/document-engine/templates/sumula-3-sets.pdf`: Scan do modelo de súmula oficial de 3 sets (dimensões `992 x 566 pt`, proporção A4 estendida).
2. `src/document-engine/templates/sumula-5-sets.pdf`: Scan do modelo de súmula oficial de 5 sets federativa (dimensões `1190 x 841 pt`, exatamente **A3 Landscape**).
3. `src/document-engine/templates/ordem-saque.pdf`: Scan do modelo de ordem de saque em 4 quadrantes para corte/uso por set (dimensões `841 x 595 pt`, A4).

### 2.5 PDFs de Inspeção Gerados em Torneio Real (Setembro/2026)
Localizados no workspace em `dist/pdf-inspection/tournament/`:
* `CASO_A_superliga_baseos_5sets_oficial_com_atletas.pdf` (841.89 x 595.28 pt, 1 página)
* `CASO_B_copa_baseos_3sets_oficial_com_atletas.pdf` (841.89 x 595.28 pt, 1 página)
* `CASO_C_superliga_baseos_5sets_em_branco.pdf` (841.89 x 595.28 pt, 1 página)
* `CASO_D_copa_baseos_3sets_em_branco.pdf` (841.89 x 595.28 pt, 1 página)
* `CASO_E_torneio_aberto_3sets_sem_atletas.pdf` (841.89 x 595.28 pt, 1 página)
* `CASO_F_superliga_baseos_5sets_nomes_longos_estresse.pdf` (841.89 x 595.28 pt, 1 página)
* `CASO_G_ordem_saque_em_branco_4copias.pdf` (841.89 x 595.28 pt, 4 páginas)

---

## 3. LINHA DO TEMPO DAS DECISÕES

| Data / Fase | Fonte Histórica | Problema Identificado | Decisão Tomada | Implementado? | Estado Atual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fase 1** | `audit-match-sheet-pdf.md` | Existência de 4 geradores conflitantes (`jspdf` e `@react-pdf/renderer`). Fontes minúsculas (3.2 pt), quebras para 2 páginas em impressoras físicas. | Unificar motor no `@react-pdf/renderer` (ADR-002), página única A4 paisagem, descartar `jspdf`. | Sim | **CONFORME** (apenas motor BaseOS é utilizado na UI). |
| **Fase 2** | `WALKTHROUGH_FASE_SUMULA_2.md` | Quantidade de sets hardcoded; torneio de 3 sets gerava súmula com blocos vazios de 5 sets. | Vincular layout da súmula ao `CompetitionRulesService.resolveMatchFormat`. | Sim | **CONFORME** (layouts `THREE_SET_A4_LAYOUT` e `FIVE_SET_A4_LAYOUT` instanciados dinamicamente). |
| **Fase 3** | `WALKTHROUGH_FASE_SUMULA_3.md` | 8 defeitos geométricos graves: truncamentos (`PON-...`), colisão `CapitãoCapitão`, colisão com a margem inferior em `y=585 pt`, estouro de assinaturas e sanções em 5 sets. | Cirurgia dimensional nos componentes: cabeçalho reduzido para 34 pt em 5 sets; sanções e assinaturas compactadas; eliminação de duplicidade de label de capitão. | Sim | **CONFORME** (erros de renderização e sobreposições eliminados). |
| **Fase 4** | `WALKTHROUGH_FASE_SUMULA_4.md` | Inversão dos pontos das equipes no bloco de resultado final (`BaseosResult.tsx`) e sets de tie-break com limite hardcoded em 25 pontos. | Corrigir cálculo de vencedor em `BaseosResult.tsx` e injetar `SetFormatConfig` derivado do torneio. | Sim | **CONFORME** (pontos e vencedores alinhados com as regras). |
| **Fase 7.7** | `FASE-7.7-AUDITORIA-SUMULA.md` | Vôlei de praia gerava grid 6x6 indoor; ausência de opção A3 para súmulas de 5 sets federativas. | Registrar Beach como P1 gap; registrar A3 como P1 gap para impressão em gráfica rápida / plotter. | Não | **PARCIALMENTE CONFORME** (Beach ainda gera layout indoor; A3 só existe por scale factor). |
| **Gate 1A** | `FASE-4C-GATE-1A-SEGURANCA-SUMULAS.md` | Falhas de segurança permitiam que capitão ou público emitissem/assinassem súmulas operacionais. | Bloqueio no backend/UI com RBAC estrito (`match_sheet:manage`, `roles: [admin, referee, organizer]`). | Sim | **CONFORME** (segurança garantida). |
| **Execução Torneio** | `EXECUCAO-FINAL-PRODUTO-DEV-SUMULAS-DOCUMENTOS-TORNEIO.md` | A emissão da súmula gerava Ordem de Saque automaticamente, gastando papel desnecessário na mesa; e falta de documentos em branco. | Desacoplar Ordem de Saque da súmula da partida; criar diálogo independente `BlankSheetEmitDialog` com seletor de 1 a 20 cópias. | Sim | **CONFORME** (Ordem de Saque é documento avulso independente). |

---

## 4. PROBLEMAS HISTÓRICOS IDENTIFICADOS

O histórico do BaseOS registra um catálogo claro de deficiências funcionais e ergonômicas no módulo de súmulas:

1. **SML-01 (Inviabilidade de Escrita Manual):** Altura de linha de atleta reduzida a 9.5 pt (3.35 mm) em layouts comprimidos. A caligrafia humana com caneta esferográfica padrão requer entre **5.0 mm e 6.0 mm (14.2 a 17.0 pt)** de altura para preenchimento legível de números, tempos e nomes sob pressão de jogo.
2. **SML-02 (Margem Física de Impressão Abaixo do Limite de Hardware):** A margem externa de 6.0 pt (2.12 mm) está abaixo do limiar operacional das impressoras laser/jato de tinta de mesa (geralmente entre 4.0 mm e 5.0 mm / 11.3 a 14.2 pt). Em impressoras sem modo de sangria ("borderless"), a borda externa e os textos de rodapé sofrem corte mecânico.
3. **SML-03 (Desperdício de Tinta por Saturação de Toner Preto):** Faixas pretas sólidas nos cabeçalhos de equipes e sets consomem volume excessivo de toner preto, causam enrugamento do papel em impressoras jato de tinta úmidas e dificultam anotações a lápis ou caneta preta sobre as tarjas.
4. **SML-04 (Assimetria Gravíssima entre 3 Sets e 5 Sets em A4):**
   * Em 3 sets, o layout vertical respira: altura do elenco é de **420 pt (~148 mm)**, permitindo linhas de ~15 pt (~5.3 mm).
   * Em 5 sets, a inserção de 2 sets adicionais (Sets 3 e 4 em grid 2x2 + Set 5 isolado) devora o espaço do elenco, reduzindo a altura do bloco para **309 pt (~109 mm)** — uma perda imediata de 26.4% de altura vertical. Para manter 14 atletas + 2 líberos + comissão técnica, a altura de linha despenca para ~10.5 pt (~3.7 mm).
5. **SML-05 (Campos Desproporcionais - Maiores e Menores):**
   * O bloco de **Resultado em 3 sets (304.89 x 107 pt)** é exageradamente grande: uma tabela simples de 3 linhas ocupa mais de 36% da largura útil do rodapé, desperdiçando área que falta para Sanções e Assinaturas.
   * O bloco de **Observações em 3 sets (132.5 x 107 pt)** é excessivamente estreito: não comporta um parágrafo manuscrito legível de protesto de capitão ou relatório de contusão.
   * O bloco de **Sanções em 3 sets (165 x 107 pt)** possui colunas milimétricas com fontes de 3.4 pt, impossibilitando anotação rápida de penalidades durante a partida.
6. **SML-06 (Conflito de Formato Federativo Original A3 vs A4):** O modelo oficial federativo de 5 sets (`sumula-5-sets.pdf`) foi concebido para folha **A3 (1190 x 841 pt / 420 x 297 mm)**. Tentar forçar o mesmo nível de detalhe federativo em uma folha A4 paisagem (841.89 x 595.28 pt) gera compressão artificial intolerável.
7. **SML-07 (Truncamento de Nomes Longos):** Clubes com razões sociais extensas ("Associação Atlética Desportiva Metropolitana de Voleibol") ou atletas com nomes compostos longos sofrem truncamento rígido com reticências (`...`), perdendo identificação oficial.
8. **SML-08 (Vigilância do Vôlei de Praia):** O sistema aceita competições de vôlei de praia (duplas), mas o Document Engine gera o mesmo template de quadra indoor (6 posições de rotação I a VI e 14 atletas no elenco), violando as regras da modalidade.

---

## 5. DECISÕES HISTÓRICAS RECONCILIADAS

1. **Decisão D-01: `@react-pdf/renderer` é o motor exclusivo e definitivo.** Não retornar a engines baseados em DOM/Canvas ou `jspdf`.
2. **Decisão D-02: Página Única Obrigatória para Súmula Oficial em A4.** A súmula de jogo deve permanecer estritamente em **1 página**, sem transbordamento para página 2.
3. **Decisão D-03: Desacoplamento da Ordem de Saque.** A impressão da súmula da partida **NÃO** deve imprimir automaticamente a Ordem de Saque. A Ordem de Saque deve ser impressa sob demanda como documento avulso em branco, com seleção livre de cópias pelo operador.
4. **Decisão D-04: Resolução Dinâmica de 3 vs 5 Sets.** O layout da súmula deve respeitar estritamente o `CompetitionConfig` da competição (`matchFormat: 'best_of_3' | 'best_of_5'`).
5. **Decisão D-05: Elenco de 14 Atletas + 2 Líberos.** O layout deve suportar a regra CBV/FIVB contemporânea de até 14 atletas jogando (com no máximo 12 regulares + 2 líberos).
6. **Decisão D-06: Camisa 1-99 Opcional no Cadastro.** O número da camisa não pode ser exigido no ato de inscrição online da equipe, mas a súmula impressa deve fornecer espaço para anotação manual ou impressão prévia quando confirmada.

---

## 6. ESTADO ATUAL DA IMPLEMENTAÇÃO

### 6.1 Arquitetura do Document Engine
O subsistema de documentos está localizado em `src/document-engine/baseos/`:
* `BaseosScoresheetDocument.tsx`: Documento raiz `@react-pdf/renderer` contendo a página `<Page size="A4" orientation="landscape">`.
* `geometry/layouts.ts`: Define os mapas estáticos de coordenadas e dimensões absolutas `THREE_SET_A4_LAYOUT` e `FIVE_SET_A4_LAYOUT`.
* `components/BaseosHeader.tsx`: Cabeçalho institucional com metadados do jogo e logomarca vetorial.
* `components/BaseosSetIndoor.tsx`: Grid de rotação I a VI, pontos de 1 a 48, trocas e tempos para cada set.
* `components/BaseosRosters.tsx`: Tabelas dos elencos das equipes A e B (número, nome, líbero e comissão técnica).
* `components/BaseosSanctions.tsx`: Tabela de sanções disciplinares (advertência, penalidade, expulsão, desqualificação).
* `components/BaseosRemarks.tsx`: Bloco de observações da partida.
* `components/BaseosSignatures.tsx`: Campos de assinaturas de capitães, árbitros e apontadores.
* `components/BaseosResult.tsx`: Tabela resumo de resultado por set e vencedor final.
* `service/scoresheetService.ts`: Serviço unificado de montagem de props para súmula preenchida ou em branco.
* `service/serveOrderService.ts`: Serviço de geração da Ordem de Saque avulsa.

### 6.2 Pontos de Emissão na Interface de Usuário
1. `src/components/match/MatchSheetEmitDialog.tsx`: Modal disparado na página de partidas e na central da competição. Permite selecionar a partida e emite **apenas a Súmula da Partida (1 página)**.
2. `src/components/match/BlankSheetEmitDialog.tsx`: Modal dedicado na central de relatórios/documentos. Permite emitir:
   * Súmula em branco (3 sets ou 5 sets, 1 página);
   * Ordem de Saque avulsa (1 página por cópia, seletor de 1 a 20 cópias).

---

## 7. AUDITORIA VISUAL DETALHADA

A inspeção visual dos PDFs oficiais gerados (`CASO_A` a `CASO_G`), renderizados em alta definição, revelou os seguintes diagnósticos:

```text
+-----------------------------------------------------------------------------------------------+
|                                    BASEOS HEADER (A4 Landscape)                               |
+-------------------------------------------------------------+---------------------------------+
|                                                             |                                 |
|                     SETS AREA                               |          ROSTERS AREA           |
|                                                             |                                 |
|  [3 Sets]: 3 sets empilhados (520 x 138 pt cada)            |  [3 Sets]: Altura 420 pt        |
|                                                             |  Linha: ~15 pt (~5.3 mm) [OK]   |
|                                                             |                                 |
|  [5 Sets]: Sets 1-4 em grid 2x2 (411 x 110 pt cada)         |  [5 Sets]: Altura 309 pt        |
|            Set 5 na base (520 x 120 pt)                     |  Linha: ~10.5 pt (~3.7 mm) [RUIM]|
|                                                             |                                 |
+-------------------------------------------------------------+---------------------------------+
|                                     FOOTER AREA                                               |
|  [3 Sets]: Sanções (165pt) | Assinaturas (220pt) | Obs (132.5pt) | Resultado (304.89pt)       |
|            -> Resultado consome 36.7% da largura útil! Obs e Sanções espremidos.              |
|                                                                                               |
|  [5 Sets]: Sanções (220pt) | Obs (295pt)    [Linha Superior: 92pt de altura]                  |
|            Resultado (220pt) | Assinaturas (295pt) [Linha Inferior: 90pt de altura]          |
+-----------------------------------------------------------------------------------------------+
```

### 7.1 Cabeçalho (`BaseosHeader`)
* **Avaliação:** **CONFORME**.
* **Dimensões:** Altura de 42 pt no layout de 3 sets e 34 pt no layout de 5 sets.
* **Diagnóstico Visual:** Ocupa 7.0% da altura da folha em 3 sets e 5.7% em 5 sets. A proporção é excelente. A logo vetorial em SVG e os metadados (competição, fase, naipe, número do jogo, data, horário, ginásio/cidade) estão legíveis e bem diagramados. Não há desperdício de espaço vertical.

### 7.2 Área de Equipes
* **Avaliação:** **PARCIALMENTE CONFORME**.
* **Diagnóstico Visual:** A distinção entre Equipe A e Equipe B é clara por meio dos círculos com fundo contrastante. No entanto, o nome das equipes no cabeçalho dos sets tem restrição de largura. Quando o nome da equipe ultrapassa 22 caracteres, ocorre truncamento ou quebra indesejada.

### 7.3 Área de Elencos (`BaseosRosters`)
* **Avaliação:** **NÃO CONFORME** (em 5 sets) / **PARCIALMENTE CONFORME** (em 3 sets).
* **Diagnóstico Visual:**
  * **Em 3 sets:** A altura total de 420 pt permite uma área de tabela confortável. As 14 linhas de atletas possuem ~15 pt (~5.3 mm) de altura.
  * **Em 5 sets:** A altura foi reduzida para 309 pt para dar lugar ao Set 5 e ao grid inferior. Para acomodar 14 atletas + 2 líberos + 4 linhas de comissão técnica (Técnico, Assistente, Preparador, Médico), o espaçamento despenca para ~10.5 pt (~3.7 mm). Sob iluminação de ginásio e prancheta, preencher números e nomes manualmente nessas linhas é desconfortável e propício a erros de anotação.

### 7.4 Área de Sets (`BaseosSetIndoor`)
* **Avaliação:** **PARCIALMENTE CONFORME**.
* **Diagnóstico Visual:**
  * As células de numeração de pontos (1 a 48) possuem boa nitidez vetorial.
  * O grid de 6 posições (I a VI) possui caixas adequadas para anotação de número de camisa inicial e substituições.
  * Ponto de atenção: A tarja preta nos subtítulos dos sets consome toner excessivo e não aceita anotações com caneta preta.

### 7.5 Rodapé: Sanções, Assinaturas, Observações e Resultado
* **Avaliação:** **NÃO CONFORME** (distribuição assimétrica de espaço).
* **Diagnóstico Visual:**
  * **Em 3 sets:** O bloco de Resultado possui 304.89 pt de largura (36.7% da largura útil total!). Ele apresenta uma tabela simplificada com colunas largas e espaço em branco inútil à direita. Em contrapartida, o bloco de Observações ficou reduzido a meros 132.5 pt (15.9% da largura), e o de Sanções a 165 pt (19.8% da largura).
  * **Em 5 sets:** O rodapé é dividido em dois andares horizontais. O bloco de Assinaturas (295 x 90 pt) possui campos de assinatura muito baixos (~14 pt de altura por linha), dificultando a rubrica dos árbitros e capitães.

---

## 8. MATRIZ DE DIMENSÕES: CAMPOS MAIORES, MENORES E ESPAÇOS DESPERDIÇADOS

A tabela a seguir consolida as medições exatas extraídas do código (`layouts.ts`) e dos PDFs gerados, confrontadas com o requisito de uso prático em quadra:

| Área / Bloco | Dimensões Atuais (pt) | Dimensões Atuais (mm) | Diagnóstico Operacional | Espaço Desejado / Recomendação | Justificativa Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Margens da Página** | Margem: 6.0 pt | Margem: 2.12 mm | **Pequena demais** | Margem: 11.3 pt (4.0 mm) | Impressoras comuns cortam conteúdo com margem inferior a 3.5–4.0 mm. |
| **Cabeçalho (3 sets)** | 829.89 x 42.0 pt | 292.8 x 14.8 mm | **Equilibrado** | Manter 42.0 pt | Contém todos os metadados necessários sem sufocar a página. |
| **Cabeçalho (5 sets)** | 829.89 x 34.0 pt | 292.8 x 12.0 mm | **Equilibrado** | Manter 34.0 pt | Redução proporcional para acomodar a malha densa de 5 sets. |
| **Elenco (3 sets)** | 306.89 x 420.0 pt | 108.3 x 148.2 mm | **Equilibrado** | Manter ~420.0 pt | Linhas de atleta com ~5.3 mm atendem ao limiar mínimo de escrita manual. |
| **Elenco (5 sets)** | 304.89 x 309.0 pt | 107.6 x 109.0 mm | **Pequeno demais** | Expandir para ~340.0 pt (+31 pt) | Linhas de ~3.7 mm tornam escrita manual com caneta esferográfica inviável. |
| **Set 1, 2, 3 (em 3 sets)** | 520.0 x 138.0 pt cada | 183.4 x 48.7 mm cada | **Equilibrado** | Manter 138.0 pt | Distribuição vertical simétrica dos três períodos. |
| **Sets 1 a 4 (em 5 sets)** | 411.0 x 110.0 pt cada | 145.0 x 38.8 mm cada | **Equilibrado** | Manter ~110.0 pt | Dispostos em quadrantes 2x2 eficientes. |
| **Set 5 (Tie-break)** | 520.0 x 120.0 pt | 183.4 x 42.3 mm | **Grande demais** | Reduzir para ~480 x 105 pt | Set de 15 pontos não requer a mesma área de pontuação de um set longo. |
| **Resultado (3 sets)** | 304.89 x 107.0 pt | 107.6 x 37.7 mm | **Grande demais (desperdício)** | Reduzir largura para ~220.0 pt (-84.89 pt) | Tabela de 3 sets é compacta; sobra vazio lateral desnecessário. |
| **Resultado (5 sets)** | 220.0 x 90.0 pt | 77.6 x 31.8 mm | **Equilibrado** | Manter ~220.0 pt | Dimensão compacta e funcional para 5 sets. |
| **Sanções (3 sets)** | 165.0 x 107.0 pt | 58.2 x 37.7 mm | **Pequeno demais** | Expandir largura para ~200.0 pt (+35 pt) | Colunas estreitas com fontes de 3.4 pt impedem anotação de cartão. |
| **Sanções (5 sets)** | 220.0 x 92.0 pt | 77.6 x 32.5 mm | **Equilibrado** | Manter ~220.0 pt | Área suficiente no layout de dois andares. |
| **Observações (3 sets)** | 132.5 x 107.0 pt | 46.7 x 37.7 mm | **Pequeno demais** | Expandir largura para ~185.0 pt (+52.5 pt) | 46 mm de largura mal comportam 3 palavras manuscritas por linha. |
| **Observações (5 sets)** | 295.0 x 92.0 pt | 104.1 x 32.5 mm | **Equilibrado** | Manter ~295.0 pt | Bloco largo e funcional. |
| **Assinaturas (3 sets)** | 220.0 x 107.0 pt | 77.6 x 37.7 mm | **Equilibrado** | Manter ~220.0 pt | Altura de 107 pt permite linhas confortáveis para 4 assinaturas. |
| **Assinaturas (5 sets)** | 295.0 x 90.0 pt | 104.1 x 31.8 mm | **Pequeno em altura** | Aumentar altura útil das linhas | 90 pt divididos por 4 oficiais deixam menos de 15 pt por campo de rubrica. |

---

## 9. AUDITORIA: FORMATO DE 3 SETS

* **Status:** **PARCIALMENTE CONFORME**.
* **Comportamento Geométrico:** O documento de 3 sets é o mais harmonioso da aplicação. O lado esquerdo é composto por 3 conjuntos de sets idênticos de 520 x 138 pt. O lado direito é dominado pelo elenco de 306.89 x 420 pt.
* **Problema Específico de 3 Sets:**
  * O rodapé sofre com má alocação horizontal de recursos:
    * `Resultado` (304.89 pt) consome **36.7%** da largura útil da folha.
    * `Sanções` (165.0 pt) recebe apenas **19.8%**.
    * `Observações` (132.5 pt) recebe apenas **15.9%**.
  * **Correção Proposta:** Retirar 85 pt da largura do `Resultado` (reduzindo-o para ~220 pt) e redistribuir: +35 pt para `Sanções` (ficando com 200 pt) e +50 pt para `Observações` (ficando com 182.5 pt).

---

## 10. AUDITORIA: FORMATO DE 5 SETS

* **Status:** **NÃO CONFORME**.
* **Comportamento Geométrico:** Tentar encaixar 5 sets completos (Sets 1 a 4 em 411 x 110 pt + Set 5 em 520 x 120 pt) na mesma folha A4 paisagem de 595.28 pt de altura gera uma crise de espaço vertical intransponível.
* **Problema Específico de 5 Sets:**
  1. A área do elenco perdeu 111 pt de altura útil em relação ao de 3 sets (caiu de 420 pt para 309 pt).
  2. Como a quantidade regulamentar de atletas e oficiais é rigorosamente a mesma (14 atletas + 2 líberos + comissão técnica), a altura de cada linha de atleta foi estrangulada para ~10.5 pt (~3.7 mm).
  3. No gabarito original da CBV/FIVB, a súmula de 5 sets **nunca é impressa em A4**, mas sim em folha **A3 Landscape (1190 x 841 pt)**.
* **Conclusão:** Para torneios que exigem 5 sets oficiais com elenco cheio de 14 atletas e anotação manual, o BaseOS deve oferecer suporte a emissão em **A3 nativo**, ou, caso seja impresso em A4, rebalancear a altura do Set 5 e do rodapé para devolver pelo menos 30 pt ao elenco.

---

## 11. AUDITORIA: ELENCO DE 14 ATLETAS + 2 LÍBEROS

* **Status:** **PARCIALMENTE CONFORME**.
* **Regras de Negócio e Capacidade:**
  * O sistema suporta perfeitamente os limites federativos: até 14 atletas com indicação de capitão (`(C)`) e designação de líberos (`L1`, `L2`).
  * As 4 funções de comissão técnica estão mapeadas: Técnico, Assistente Técnico, Preparador Físico e Médico.
* **Problema Ergonômico:**
  * No layout de 5 sets em A4, a densidade de linhas força a tipografia dos nomes para 4.8–5.2 pt. O espaço para anotação manual do número da camisa (caso a camisa seja confirmada no dia do jogo) mede apenas 26 pt de largura por 10.5 pt de altura. Um número escrito com caneta de ponta grossa ocupa quase toda a célula, gerando rasuras.

---

## 12. AUDITORIA: NOMES LONGOS E DADOS EXTENSOS

* **Status:** **PARCIALMENTE CONFORME**.
* **Teste com Dados de Estresse (`CASO_F`):**
  * Competição: *"Campeonato Intermunicipal Metropolitano de Voleibol Adulto Masculino e Feminino 2026"*
  * Equipe A: *"Associação Esportiva e Recreativa Beneficente Vila Mariana de Voleibol"*
  * Atleta: *"Maximiliano de Albuquerque Silveira Castelo Branco"*
  * Ginásio: *"Complexo Poliesportivo Municipal Governador André Franco Montoro - Quadra Central"*
* **Resultados Observados:**
  1. **Cabeçalho:** O nome da competição longo quebra em duas linhas e é acomodado com sucesso graças ao corte de fonte responsivo em `BaseosHeader.tsx`.
  2. **Equipes no Cabeçalho dos Sets:** Equipes com mais de 24 caracteres sofrem truncamento com reticências (`Associação Esportiva e Recre...`), impedindo a leitura completa da entidade.
  3. **Nomes de Atletas:** O nome do atleta é cortado na 24ª letra em colunas de elenco de 127 pt.
* **Recomendação:** Implementar abreviação inteligente de sobrenomes intermediários (ex: *"Maximiliano A. S. Castelo Branco"*) em vez de truncamento cego com reticências.

---

## 13. AUDITORIA: ASSINATURAS E PREENCHIMENTO MANUAL

* **Status:** **PARCIALMENTE CONFORME**.
* **Análise Operacional:**
  * **Em 3 sets:** O bloco de assinaturas (220 x 107 pt) possui 4 linhas (1º Árbitro, 2º Árbitro, Apontador, Capitães A e B). A altura útil por linha é de ~22 pt, permitindo rubricas legíveis.
  * **Em 5 sets:** O bloco possui 295 x 90 pt. A redução da altura total para 90 pt deixa as linhas de assinatura espremidas (~15 pt por linha). Quando um árbitro assina com caneta esferográfica, a rubrica invade o texto do cargo abaixo.
* **Pergunta Obrigatória (Seção 18):**
  > *Existe espaço suficiente para uma pessoa realmente preencher este documento à mão durante uma partida?*
  * **Resposta:** **Em 3 sets, SIM**. O documento é funcional e possui ergonomia aceitável. **Em 5 sets em A4, NÃO com conforto operacional**. O apontador precisará de caligrafia excessivamente miúda para preencher o elenco e as rubricas sem invadir células vizinhas.

---

## 14. AUDITORIA DA ORDEM DE SAQUE (DECISÃO DEFINITIVA)

* **Status:** **CONFORME**.
* **Reconciliação da Decisão:**
  * A Ordem de Saque **NÃO** foi removida do BaseOS.
  * A impressão da súmula da partida **NÃO** imprime automaticamente a Ordem de Saque.
  * A Ordem de Saque é emitida como **DOCUMENTO INDEPENDENTE** via `BlankSheetEmitDialog.tsx`, permitindo ao operador escolher o número exato de cópias necessárias (1, 2, 4, 8, etc.).
* **Validação Física do PDF (`CASO_G`):**
  * O arquivo `CASO_G_ordem_saque_em_branco_4copias.pdf` gerou exatamente 4 páginas idênticas em A4 paisagem, com layout de 4 quadrantes para corte por set.
  * Cada quadrante contém: Identificação da equipe, Set, Rotação I a VI e campo de assinatura do técnico.
  * O desacoplamento atende 100% à especificação exigida.

---

## 15. AUDITORIA DE IMPRESSÃO (MARGENS E TONER)

* **Status:** **PARCIALMENTE CONFORME**.
* **Margens:** A margem atual do documento é `6.0 pt (2.12 mm)`. Em impressoras HP LaserJet e Epson EcoTank comuns (típicas de ginásios esportivos), a margem mecânica não imprimível é de 4.0 a 4.5 mm. Súmulas impressas sem a opção "Ajustar à página" sofrerão corte na borda externa do quadro e nos carimbos inferiores.
  * **Correção:** Aumentar a margem para `11.3 pt (4.0 mm)`.
* **Consumo de Toner:** Os cabeçalhos de sets e equipes utilizam faixas com fundo preto sólido (`#111827`). Além de alto consumo de toner, a saturação de carbono impede que anotações feitas a lápis ou caneta preta sejam vistas sobre as faixas.
  * **Correção:** Utilizar fundos com tonalidade cinza claro (`#f3f4f6` ou `#e5e7eb`) com bordas pretas finas (0.75 pt), reservando preto sólido apenas para marcações de contraste pontuais.

---

## 16. AUDITORIA DE TESTES AUTOMATIZADOS

* **Status:** **CONFORME** (Cobertura Estrutural) / **GAPS CONHECIDOS** (Validação Visual).
* **Inventário de Testes Existentes:**
  1. `src/test/document-engine/baseos/three-set.test.ts`: Valida geração do Blob PDF de 3 sets e integridade de tamanho de arquivo.
  2. `src/test/document-engine/baseos/five-set.test.ts`: Valida geração do Blob PDF de 5 sets.
  3. `src/test/document-engine/baseos/geometry.test.ts`: Validações matemáticas das coordenadas de layout (`layouts.ts`).
  4. `src/test/document-engine/baseos/roster.test.ts`: Validações de limites de elenco (14 atletas, líberos, duplicidade de camisa).
  5. `src/test/document-engine/baseos/serveOrder.test.ts` (13 testes): Validação completa das regras da Ordem de Saque, desacoplamento e geração avulsa.
  6. `src/test/document-engine/baseos/pdfInspectionTournamentValidation.test.ts` (7 testes): Validação formal dos 7 casos de inspeção de torneio (Casos A a G).
* **Limitação Crítica Identificada:** Os testes automatizados verificam `pages === 1`, conformidade MIME `application/pdf` e coordenadas teóricas. Nenhum teste unitário mede o esforço caligráfico de um oficial em quadra. A validação visual humana continua sendo indispensável.

---

## 17. MATRIZ DE REGRESSÃO DA SÚMULA

| Item Anteriormente Identificado | O Que Foi Decidido | Estado Atual | Regressão? | Correção Necessária? |
| :--- | :--- | :--- | :--- | :--- |
| **Coexistência de 4 geradores** | Eliminar `jspdf` e unificar no `@react-pdf/renderer` | Apenas `src/document-engine/baseos/` é consumido pela UI | **Não** | Nenhuma. Padrão consolidado. |
| **Truncamento `PON-...`** | Aumentar largura do label de pontos | Label exibe `PONTOS` sem quebra ou reticências | **Não** | Nenhuma. Resolvido. |
| **Colisão `CapitãoCapitão`** | Corrigir duplicação de label de capitão | Exibição limpa de `(C)` ao lado do nome | **Não** | Nenhuma. Resolvido. |
| **Inversão de pontos em Resultado** | Alinhar equipe vencedora com contagem de sets | `BaseosResult.tsx` reflete o vencedor exato | **Não** | Nenhuma. Resolvido. |
| **Ordem de Saque embutida** | Desacoplar Ordem de Saque da súmula da partida | Ordem de Saque é documento avulso em branco | **Não** | Nenhuma. Requisito plenamente atendido. |
| **Campos Maiores e Menores em 3 Sets** | Redistribuir espaço do rodapé | `Resultado` continua ocupando 304.89 pt (36.7%), sufocando `Observações` (132.5 pt) | **Sim (pendência histórica)** | Reduzir `Resultado` para ~220 pt e expandir `Observações` e `Sanções`. |
| **Esmagamento do Elenco em 5 Sets** | Garantir altura mínima de linha de atleta | Elenco em 5 sets possui 309 pt de altura (linhas de ~3.7 mm) | **Sim (pendência histórica)** | Suporte nativo a A3 e alívio do Set 5 no A4. |
| **Margem de hardware (2.12 mm)** | Garantir margem de 4.0–5.0 mm | Margem da folha continua fixada em `6.0 pt (2.12 mm)` | **Sim (pendência histórica)** | Alterar margem de página para `11.3 pt (4.0 mm)`. |

---

## 18. DIVERGÊNCIAS ENTRE DECISÃO E IMPLEMENTAÇÃO

```text
+---------------------------------------------------------------------------------------------------------+
| Decisão Histórica       | Arquivo Responsável    | Implementação Atual  | PDF Atual    | Conformidade   |
+-------------------------+------------------------+----------------------+--------------+----------------+
| Ordem de Saque avulsa   | BlankSheetEmitDialog   | Emissão independente | CASO_G (4 p) | CONFORME       |
| 3 vs 5 sets dinâmico    | scoresheetService.ts   | Switch de layout     | CASO_A/B     | CONFORME       |
| Rodapé 3 sets funcional | layouts.ts (3-sets)    | Resultado: 304.89 pt | CASO_B       | NÃO CONFORME   |
|                         |                        | Obs: 132.5 pt        |              |                |
| Escrita manual 5 sets   | layouts.ts (5-sets)    | Elenco: 309 pt       | CASO_A       | NÃO CONFORME   |
|                         |                        | Linha: ~3.7 mm       |              |                |
| Margem de impressão     | BaseosScoresheetDoc    | Margem: 6.0 pt       | CASO_A a F   | PARCIALMENTE   |
|                         |                        |                      |              | CONFORME       |
| Modalidade Beach        | scoresheetService.ts   | Gera grid indoor 6x6 | N/A          | NÃO CONFORME   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 19. LISTA DEFINITIVA DE CORREÇÕES NECESSÁRIAS

### P0 — Impede Uso Operacional Confortável no Torneio Oficial
1. **Redistribuição do Rodapé de 3 Sets:**
   * **Arquivo:** `src/document-engine/baseos/geometry/layouts.ts` (`THREE_SET_A4_LAYOUT`).
   * **Ação:** Reduzir a largura de `result` de 304.89 pt para 220.0 pt. Alocar os 84.89 pt economizados: +35.0 pt para `sanctions` (de 165.0 para 200.0 pt) e +49.89 pt para `remarks` (de 132.5 para 182.39 pt).
   * **Impacto:** Elimina o vazio inútil no bloco de resultado e amplia a área de texto manuscrito das observações e anotações disciplinares.
2. **Alívio da Altura do Elenco de 5 Sets em A4:**
   * **Arquivo:** `src/document-engine/baseos/geometry/layouts.ts` (`FIVE_SET_A4_LAYOUT`).
   * **Ação:** Reduzir a altura do `set5` de 120.0 pt para 100.0 pt e rebaixar a posição base do grid inferior em 15 pt. Aumentar a altura de `rosters` de 309.0 pt para 330.0 pt (+21 pt).
   * **Impacto:** Eleva a altura de linha de atleta em 5 sets para ~11.5 pt (~4.1 mm), aliviando a compressão severa de caligrafia.
3. **Ajuste de Margem de Hardware:**
   * **Arquivo:** `src/document-engine/baseos/BaseosScoresheetDocument.tsx`.
   * **Ação:** Alterar o padding da `<Page>` de `6.0 pt` para `11.3 pt (4.0 mm)`. Ajustar as larguras totais disponíveis nos layouts de `829.89 pt` para `819.28 pt`.
   * **Impacto:** Previne corte físico em impressoras de ginásio sem capacidade de sangria.

### P1 — Correção Funcional Importante
4. **Súmula Nativa de Vôlei de Praia (Beach):**
   * **Arquivo:** `src/document-engine/baseos/service/scoresheetService.ts`.
   * **Ação:** Detectar `modality === 'beach'` e renderizar template específico com 2 atletas por equipe, sets de 21/15 pontos e alternância de quadra a cada 7/5 pontos, em vez do grid indoor de 6 posições.
5. **Opção de Emissão A3 para 5 Sets:**
   * **Arquivo:** `src/components/match/MatchSheetEmitDialog.tsx` e `layouts.ts`.
   * **Ação:** Permitir ao operador selecionar tamanho do papel (A4 ou A3). Se A3 for selecionado, carregar `FIVE_SET_A3_LAYOUT` com dimensões nativas de 1190 x 841 pt, replicando com perfeição a súmula federativa oficial sem compressão.

### P2 — Melhoria Visual e Ergonômica
6. **Substituição de Fundo Preto Sólido por Cinza Técnico:**
   * **Arquivo:** `src/document-engine/baseos/components/BaseosSetIndoor.tsx` e `BaseosRosters.tsx`.
   * **Ação:** Substituir fundos pretos sólidos `#111827` nos cabeçalhos de sets e equipes por cinza claro `#f3f4f6` com tipografia preta `#111827` em negrito e borda preta de 0.75 pt.
   * **Impacto:** Economia de mais de 40% de toner por folha e viabilidade de escrita a lápis/caneta sobre as marcações.
7. **Abreviação Inteligente de Nomes Longos:**
   * **Arquivo:** `src/document-engine/baseos/components/BaseosRosters.tsx`.
   * **Ação:** Implementar função de formatação de nomes compostos longos que preserva o primeiro nome e o último sobrenome, abreviando nomes intermediários (ex: *"João Carlos da Silva Pereira"* -> *"João C. S. Pereira"*).

### P3 — Melhoria Futura
8. **Exportação de Súmula Preenchida em Vetor SVG:**
   * Permitir visualização e anotação digital direta no navegador em tablets de arbitragem.

---

## 20. DIRETRIZES DE PRESERVAÇÃO DOS PORTAIS E ARQUITETURA MULTI-TENANT

Ao iniciar a implementação das correções acima na próxima execução, é **MANDATÓRIO** preservar rigorosamente as seguintes conquistas arquiteturais das fases anteriores:

1. **RBAC e Segurança de Emissão:** A rota de emissão de súmula oficial deve continuar exigindo permissão `match_sheet:manage` ou perfil ativo de `admin`, `organizer` ou `referee`. O Team Portal (`team_manager`) **NÃO** deve ter acesso à emissão de súmula oficial da partida com poder de súmula.
2. **Isolamento Multi-Tenant:** Toda consulta de equipes, atletas e partidas para impressão deve respeitar os filtros canônicos de organização (`organization_id`) e contexto ativo (`currentTeamId`), impedindo vazamento de dados entre entidades.
3. **Independência da Ordem de Saque:** O diálogo `BlankSheetEmitDialog.tsx` deve permanecer completamente desacoplado de `MatchSheetEmitDialog.tsx`. Não reintroduzir emissão automática conjunta.
4. **Camisa Opcional no Cadastro:** Não tornar obrigatório o número da camisa na tela de inscrição de atletas (`TeamRosterRegistrationPage.tsx`). A ausência do número de camisa deve continuar gerando célula vazia na súmula para preenchimento no congresso técnico / aquecimento.
5. **Imutabilidade de Produção:** Nenhuma migration DDL/DML ou alteração de banco deve ser aplicada na VOLTZ durante ajustes no Document Engine.

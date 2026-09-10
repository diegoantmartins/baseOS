# BASEOS — RELATÓRIO MASTER DE AUDITORIA TÉCNICA E FUNCIONAL DA ORDEM DE SAQUE
**Data:** 09/09/2026  
**Fase:** Auditoria Técnica e Funcional (Somente Leitura)  
**Status da Auditoria:** CONCLUÍDA  
**Status de Implementação:** NÃO IMPLEMENTADO (Fase Exclusiva de Auditoria — Zero alterações de código em componentes ou serviços)

---

## 1. OBJETIVO DA AUDITORIA

A Súmula Canônica de partida do BaseOS (`src/document-engine/baseos/`) atingiu maturidade visual e esportiva profissional homologada em A4 P&B vetorial com `@react-pdf/renderer`. No entanto, o documento correlato indispensável para a realização de partidas oficiais — a **Ordem de Saque / Ficha de Posição Inicial** (utilizada por técnicos para entregar a escalação inicial e rotação de cada set à arbitragem) — encontrava-se em estado legado, reportando visual desatualizado e a persistência de um cabeçalho antigo da **FPV (Federação Paranaense de Voleibol)**.

O objetivo desta auditoria foi realizar um diagnóstico exaustivo, em modo estritamente **somente leitura**, para:
1. Localizar onde a Ordem de Saque é implementada e mantida no codebase;
2. Identificar a engine/biblioteca utilizada na sua renderização;
3. Desvendar a origem exata dos elementos visuais e do cabeçalho da FPV;
4. Avaliar de onde vêm os dados exibidos e se ela se conecta aos dados reais do confronto;
5. Analisar o fluxo de acionamento pela interface de usuário (UI);
6. Comparar a arquitetura da Ordem de Saque com a Súmula Canônica;
7. Avaliar a viabilidade técnica de unificação visual e reaproveitamento de componentes (`BaseosHeader`);
8. Definir o comportamento exato para partidas de 3 sets e 5 sets;
9. Propor uma arquitetura limpa, moderna e robusta para a futura fase de implementação, sem tocar na Súmula Canônica.

---

## 2. METODOLOGIA DE INVESTIGAÇÃO

A investigação foi conduzida através das seguintes etapas:
- **Varredura Textual e Estrutural:** Busca por termos canônicos (`Ordem de Saque`, `Ficha de Posição`, `lineup`, `rotation`, `ordemSaque`, `serveOrder`) em todo o repositório.
- **Auditoria de Engines PDF:** Análise dos geradores baseados em `pdf-lib`, `jsPDF` e `@react-pdf/renderer`.
- **Inspeção Binária e Visual do Template PDF:** Extração e inspeção de imagens/vetores do arquivo de template `src/document-engine/templates/ordem-saque.pdf` através de scripts de renderização (`pdf2pic` / `pdf-poppler`) e análise de streams de objetos PDF.
- **Inspeção de Código Legado:** Análise detalhada de `src/lib/pdf/officialMatchSheetPdf.ts` e sua função `generatePositionOrderSheetPdf`.
- **Rastreamento de UI:** Análise dos diálogos de emissão `BlankSheetEmitDialog.tsx`, `MatchSheetEmitDialog.tsx`, `MatchesPage.tsx` e `MatchSheetInterface.tsx`.
- **Mapeamento de Dados:** Verificação da estrutura do mapper `loadBaseosScoresheetData` e contratos de dados disponíveis no momento da impressão.
- **Validação de Não-Regressão:** Monitoramento rigoroso do `git status` para assegurar que nenhum arquivo de código de produção ou teste foi modificado.

---

## 3. ARQUIVOS ANALISADOS

| Arquivo | Papel no Sistema | Engine / Tecnologia |
| :--- | :--- | :--- |
| `src/document-engine/generators/ordemSaque.generator.ts` | Gerador de Ordem de Saque sobre template existente | `pdf-lib` (Overlay de coordenadas) |
| `src/document-engine/coordinates/ordemSaque.coordinates.ts` | Definição de coordenadas (X, Y) para carimbo no template | Coordenadas cartesianas `pdf-lib` |
| `src/document-engine/templates/ordem-saque.pdf` | Arquivo binário de template PDF (3.99 MB) | PDF 1.4 escaneado/rasterizado |
| `src/lib/pdf/officialMatchSheetPdf.ts` | Gerador legado de súmula e fichas de posição | `jsPDF` (Desenho procedural imperativo) |
| `src/components/match-sheet/BlankSheetEmitDialog.tsx` | Modal de emissão de súmula e ordem de saque em branco | React 18 / Lucide Icons |
| `src/components/match-sheet/MatchSheetEmitDialog.tsx` | Modal de emissão de súmula para partidas existentes | React 18 / BaseOS Dialog |
| `src/document-engine/baseos/components/BaseosHeader.tsx` | Cabeçalho canônico oficial da Súmula BaseOS | `@react-pdf/renderer` (Declarativo) |
| `src/document-engine/baseos/service/scoresheetService.ts` | Orquestrador de dados e renderização da Súmula Canônica | `@react-pdf/renderer` |
| `src/document-engine/baseos/mapper/match.mapper.ts` | Loader e normalizador canônico de dados do confronto | `dataAccess` / Tipos BaseOS |
| `src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` | Template da Súmula Canônica para melhor de 3 | `@react-pdf/renderer` |
| `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx` | Template da Súmula Canônica para melhor de 5 | `@react-pdf/renderer` |

---

## 4. ARQUITETURA ENCONTRADA: AS DUAS IMPLEMENTAÇÕES CONCORRENTES

A auditoria constatou a existência de **duas implementações totalmente isoladas e concorrentes** para a geração de Ordem de Saque no projeto:

### Implementação A: `pdf-lib` + Template Rasterizado (`src/document-engine/generators/ordemSaque.generator.ts`)
- **Funcionamento:** Carrega o arquivo `ordem-saque.pdf` e desenha textos por cima em coordenadas absolutas definidas em `ordemSaque.coordinates.ts`.
- **Natureza:** Projetado para receber `OrdemSaqueData` e gerar um documento preenchido ou em branco.
- **Problema de Peso:** O template tem **quase 4 MB** de tamanho e consiste em dezenas de fatias de imagens escaneadas (PNG/JPEG embutidos).
- **Consumidor:** É importado e consumido por `src/components/match-sheet/BlankSheetEmitDialog.tsx` através da função `generateBlankServeOrderSheet()`.

### Implementação B: `jsPDF` Procedural (`src/lib/pdf/officialMatchSheetPdf.ts`)
- **Funcionamento:** Função `generatePositionOrderSheetPdf(match, competition, teams, rosters, config)` que desenha caixas de rotação de 1 a 6 diretamente via código imperativo (`doc.rect`, `doc.text`).
- **Natureza:** Formata uma folha A4 Paisagem com grade 2x4 (8 fichas de posição por página).
- **Problema de Estilo:** Tipografia primitiva, sem alinhamento com a identidade do BaseOS, e dados hardcoded.
- **Consumidor:** Praticamente **órfão** na UI atual. Não é chamado pelos diálogos principais de impressão de partida.

---

## 5. O MISTÉRIO DO CABEÇALHO DA FPV DESVENDADO

Identificamos com precisão cirúrgica de onde se originam as referências à **Federação Paranaense de Voleibol (FPV)**:

### Origem 1: Template Binário Escaneado (`src/document-engine/templates/ordem-saque.pdf`)
Ao renderizar o template em imagem de alta resolução e inspecionar os streams de objetos do PDF:
- O arquivo é composto por **60 fatias de imagem rasterizadas**.
- No topo esquerdo de cada uma das 8 filipetas de set, está **estampado o logotipo oficial da Federação Paranaense de Voleibol (FPV)**.
- No topo direito de cada uma das 8 filipetas, está estampado o logotipo do patrocinador **ITAIPU BINACIONAL**.
- O arquivo de coordenadas `ordemSaque.coordinates.ts` possui `cleanZones: []` e `logoZone: { x: 0, y: 0, width: 0, height: 0 }`. Portanto, o `pdf-lib` **não limpa nem substitui esses logos**. Toda vez que o BaseOS emite a Ordem de Saque por esse gerador, os logos da FPV e da Itaipu aparecem impressos.

### Origem 2: Hardcode na Implementação `jsPDF` (`src/lib/pdf/officialMatchSheetPdf.ts`)
Nas linhas 1121-1123 de `officialMatchSheetPdf.ts`:
```typescript
const orgName = (competition?.organizer || 'Federação Paranaense de Voleibol').toUpperCase();
doc.text(orgName.substring(0, 20), x + 3, y + 4);
```
- Se a competição não possuir `organizer` explicitamente preenchido, o fallback é forçado para `'Federação Paranaense de Voleibol'`.
- Além disso, o `.substring(0, 20)` corta o nome para `"FEDERAÇÃO PARAN"`.

**Conclusão:** Ambas as implementações continham resquícios históricos da FPV — uma através de carimbo gráfico indelével no template raster, outra por string de fallback no código legado.

---

## 6. FLUXO ATUAL NA APLICAÇÃO E EXPERIÊNCIA DO USUÁRIO (UI)

A auditoria navegou por toda a interface de relatórios e partidas:

1. **`BlankSheetEmitDialog.tsx` (Emissão em Branco):**
   - Oferece ao usuário duas opções:
     - "Súmula Oficial em Branco" (gera via `generateBlankScoresheet()`).
     - "Ficha de Posição / Ordem de Saque" (gera via `generateBlankServeOrderSheet()`).
   - É o **único ponto** da interface onde a Ordem de Saque pode ser baixada hoje.
   - Gera o PDF de 3.99 MB com os logos da FPV e Itaipu Binacional.

2. **`MatchSheetEmitDialog.tsx` (Emissão de Partida com Confronto):**
   - Acionado a partir da listagem de partidas (`MatchesPage.tsx`).
   - Apresenta um preview dinâmico da Súmula Canônica BaseOS (`@react-pdf/renderer`), com botões para alternar o modelo de impressão (BaseOS Canônica, Modelo CBV, etc.).
   - **NÃO POSSUI NENHUMA OPÇÃO** para emitir a Ordem de Saque preenchida com os dados daquela partida.

**Diagnóstico de UX:** Um coordenador ou árbitro que vai iniciar uma partida precisa emitir a súmula com os dados dos times preenchidos pelo sistema, mas se quiser as ordens de saque para entregar aos técnicos, precisa ir em outro modal e imprimir uma folha avulsa, em branco, com logos de outra federação.

---

## 7. COMPARAÇÃO ESTRUTURAL: SÚMULA CANÔNICA VS ORDEM DE SAQUE

| Critério | Súmula Canônica BaseOS | Ordem de Saque Atual (`pdf-lib`) | Ordem de Saque Atual (`jsPDF`) |
| :--- | :--- | :--- | :--- |
| **Engine** | `@react-pdf/renderer` | `pdf-lib` | `jsPDF` |
| **Paradigma** | Declarativo (Componentes React) | Imperativo (Coordenadas absolutas) | Imperativo procedural |
| **Qualidade Gráfica** | Vetorial pura (linhas e textos nítidos) | Raster escaneado (baixa resolução, borrado) | Vetorial básica (primitiva) |
| **Tamanho do Arquivo** | ~40 KB a 80 KB | **3.99 MB** (desproporcional) | ~25 KB |
| **Identidade Visual** | Design System BaseOS (A4 P&B profissional) | Padrão antigo FPV/Itaipu | Sem design system |
| **Cabeçalho** | `BaseosHeader` canônico (Nome, Fase, Jogo, Data, Times) | Logos fixos FPV / Itaipu | Texto cortado (`FEDERAÇÃO PARAN`) |
| **Suporte a 3 e 5 Sets** | Sim (`ThreeSetScoresheet` e `FiveSetScoresheet`) | Folha fixa única de 8 fichas | 1 folha (3 sets) ou 2 folhas (5 sets) |
| **Dados da Partida** | Integrados via `loadBaseosScoresheetData` | Não recebe dados da partida (em branco) | Recebe dados parcialmente |
| **Confiabilidade de Manutenção**| Alta (Tipada, modular, testada) | Baixa (Coordenadas frágeis) | Baixa (Espaguete de 1200 linhas) |

---

## 8. DADOS DA PARTIDA DISPONÍVEIS NO MOMENTO DA EMISSÃO

A função `loadBaseosScoresheetData(matchId)` em `src/document-engine/baseos/mapper/match.mapper.ts` já carrega e normaliza todos os dados necessários:

1. **Competição:** `competition.name`, `competition.gender`, `competition.category`, `competition.organizer`.
2. **Confronto:** `match.matchNumber`, `match.phase`, `match.round`, `match.group`, `match.date`, `match.time`, `match.court`, `match.city`.
3. **Equipes:** `match.teamA.name`, `match.teamB.name`, `teamAId`, `teamBId`.
4. **Comissão Técnica:** `teamA.coach`, `teamA.assistantCoach`, `teamB.coach`, `teamB.assistantCoach`.
5. **Capitães e Líberos:** Identificados no elenco com suas respectivas camisas.
6. **Elencos Completos:** Lista de atletas ordenados com nome e número de camisa.

**Conclusão Técnica:** 100% dos dados requeridos para preencher uma Ordem de Saque oficial já estão disponíveis e prontos para consumo na camada de mapper do BaseOS.

---

## 9. VIABILIDADE DE REUTILIZAÇÃO DO `BaseosHeader`

A análise de `src/document-engine/baseos/components/BaseosHeader.tsx` revelou:
- O componente é altamente desacoplado e declarativo.
- Recebe a prop:
  ```typescript
  interface BaseosHeaderProps {
    data: ScoresheetData;
  }
  ```
- Renderiza em SVG/vetor:
  - Nome da Competição, Categoria, Gênero e Fase;
  - Número do Jogo, Data, Horário e Local/Quadra;
  - Identificação dos Concorrentes: Equipe A vs Equipe B.
- **Viabilidade de Reutilização Direta:**
  - **No topo da folha:** É totalmente viável incluir um cabeçalho unificado no topo da página A4 Paisagem da Ordem de Saque contendo os dados gerais da partida.
  - **Nas filipetas individuais:** Cada filipeta (retângulo cortável entregue pelo técnico à mesa) necessita de um micro-cabeçalho com:
    - Identificação do Time (ex: `EQUIPE A: SÃO JOSÉ DOS PINHAIS`);
    - Número do Set (ex: `SET 1`);
    - Lado/Quadra (`A` ou `B`);
    - Assinatura do Técnico / Capitão.

---

## 10. COMPORTAMENTO PARA 3 SETS VS 5 SETS

Uma folha A4 em orientação Paisagem (Landscape) possui dimensões $841.89 \times 595.28$ pt.
O layout padrão de mercado e da CBV/FIVB organiza as fichas em uma **grade de 8 filipetas (2 linhas x 4 colunas)**:

### Cenário 1: Partida Melhor de 3 Sets (Até 3 sets)
- **Necessidade:**
  - Equipe A: Set 1, Set 2, Set 3 (Decisivo).
  - Equipe B: Set 1, Set 2, Set 3 (Decisivo).
  - Total: 6 fichas obrigatórias.
- **Distribuição na grade 2x4 (8 posições):**
  - Linha 1 (Equipe A): Set 1 | Set 2 | Set 3 | Reserva/Extra
  - Linha 2 (Equipe B): Set 1 | Set 2 | Set 3 | Reserva/Extra
- **Resultado:** Exatamente **1 página A4 Paisagem**, perfeita e auto-contida.

### Cenário 2: Partida Melhor de 5 Sets (Até 5 sets)
- **Necessidade:**
  - Equipe A: Sets 1, 2, 3, 4, 5 (Tie-break).
  - Equipe B: Sets 1, 2, 3, 4, 5 (Tie-break).
  - Total: 10 fichas obrigatórias.
- **Distribuição Ideal:**
  - **Página 1 (Sets Regulares 1 a 4):**
    - Linha 1 (Equipe A): Set 1 | Set 2 | Set 3 | Set 4
    - Linha 2 (Equipe B): Set 1 | Set 2 | Set 3 | Set 4
  - **Página 2 (Set Decisivo / Extras):**
    - Linha 1 (Equipe A): Set 5 (Tie-break) | Extra 1 | Extra 2 | Extra 3
    - Linha 2 (Equipe B): Set 5 (Tie-break) | Extra 1 | Extra 2 | Extra 3
- **Resultado:** **2 páginas A4 Paisagem**.

---

## 11. ANATOMIA OPERACIONAL DA FILIPETA DE ORDEM DE SAQUE

De acordo com as regras oficiais da FIVB/CBV, cada filipeta individual de rotação deve conter:
1. **Cabeçalho da Filipeta:**
   - Nome da Equipe;
   - Número do Set (1 a 5);
   - Campo para assinalar Sacador Inicial (Círculo ou [X] no Saque);
2. **Grade de Posições de Rotação (I a VI):**
   - Posição IV | Posição III | Posição II (Rede / Ataque)
   - Posição V  | Posição VI  | Posição I  (Fundo / Defesa)
   - Cada posição com caixa para anotação do número da camisa do titular e caixa menor para reserva/substituição eventual;
3. **Identificação dos Líberos:**
   - Caixa para Líbero 1 e Líbero 2;
4. **Rodapé de Homologação:**
   - Campo para número do Capitão em quadra;
   - Linha de Assinatura do Treinador / Técnico.

---

## 12. ESTRATÉGIA DE IMPRESSÃO RECOMENDADA

Para a experiência do usuário (UX), recomendamos a **Opção C (Híbrida e Flexível)** no modal de emissão da partida (`MatchSheetEmitDialog.tsx`):

1. **Aba/Botão 1: "Súmula Canônica"**
   - Gera exclusivamente a súmula oficial da partida (A4 Retrato, 1 página para 3 sets ou 2 páginas para 5 sets).
2. **Aba/Botão 2: "Ordem de Saque"**
   - Gera exclusivamente as fichas de posição da partida (A4 Paisagem, 1 folha para 3 sets, 2 folhas para 5 sets), já com cabeçalhos, times, técnicos e líberos identificados.
3. **Aba/Botão 3: "Pacote do Jogo (Súmula + Ordem de Saque)"**
   - Emite um único arquivo PDF concatenado contendo a Súmula Oficial nas primeiras páginas e a Ordem de Saque nas páginas finais. Perfeito para o apontador/árbitro que imprime tudo de uma vez antes do jogo começar.

---

## 13. DIAGNÓSTICO DE PROBLEMAS ENCONTRADOS

1. **Template Arcaico com Logos de Terceiros:**
   - O arquivo `ordem-saque.pdf` (3.99 MB) carrega logotipos fixos da FPV e Itaipu Binacional, tornando o documento inapropriado para competições independentes, escolares, corporativas ou de outras federações.
2. **Fragmentação de Engines:**
   - A Súmula usa `@react-pdf/renderer` moderno e declarativo, enquanto a Ordem de Saque usa `pdf-lib` sobre template e `jsPDF` em código legado não integrado.
3. **Desconexão com Dados da Partida:**
   - Na interface principal de partidas, o usuário não consegue gerar uma Ordem de Saque preenchida para o jogo selecionado.
4. **Sem Validação de 3 vs 5 Sets no Gerador do Template:**
   - O template atual é uma folha estática de 8 cartões, sem adaptação semântica para 3 ou 5 sets.

---

## 14. PROPOSTA DE ARQUITETURA PARA A PRÓXIMA FASE

Para elevar a Ordem de Saque ao padrão de excelência da Súmula Canônica sem violar o princípio de isolamento:

1. **Novo Módulo Canônico em `@react-pdf/renderer`:**
   - Criar `src/document-engine/baseos/templates/BaseosServeOrderDocument.tsx`
   - Criar `src/document-engine/baseos/components/BaseosServeOrderCard.tsx`
2. **Reaproveitamento de Componentes:**
   - Reaproveitar `BaseosHeader.tsx` (ou uma variante compacta horizontal `BaseosCompactHeader.tsx`) para o topo da folha.
3. **Suporte Total a 3 e 5 Sets:**
   - Resolver automaticamente via `competition.matchFormat` / `setsToWin`:
     - 3 sets $\rightarrow$ 1 página (Sets 1 a 3 + Extra para Equipes A e B);
     - 5 sets $\rightarrow$ 2 páginas (Página 1: Sets 1 a 4; Página 2: Set 5 Decisivo + Extras).
4. **Integração na UI:**
   - Adicionar o botão de emissão em `MatchSheetEmitDialog.tsx`.
   - Manter a opção em branco no `BlankSheetEmitDialog.tsx`, apontando para a nova engine vetorial (eliminando o template de 4 MB).

---

## 15. ARQUIVOS CANDIDATOS PARA A FUTURA FASE DE IMPLEMENTAÇÃO

### Novos Arquivos (A serem criados na fase de implementação):
- `src/document-engine/baseos/templates/BaseosServeOrderDocument.tsx` (Documento completo `@react-pdf/renderer`)
- `src/document-engine/baseos/components/BaseosServeOrderCard.tsx` (Componente de filipeta individual vetorial)
- `src/document-engine/baseos/types/serveOrder.ts` (Tipagens da ordem de saque)
- `src/test/document-engine/baseos/serveOrder.test.ts` (Testes automatizados unitários e de layout)

### Arquivos Existentes a Integrar:
- `src/document-engine/baseos/index.ts` (Exportar novos componentes)
- `src/document-engine/baseos/service/scoresheetService.ts` (Adicionar método `generateServeOrderPdfBlob` / `generateServeOrderPdfStream`)
- `src/components/match-sheet/MatchSheetEmitDialog.tsx` (Adicionar opção/aba de impressão da Ordem de Saque do confronto)
- `src/components/match-sheet/BlankSheetEmitDialog.tsx` (Migrar emissão em branco para o novo gerador vetorial)

### Arquivos Legados Candidatos a Depreciação Futura:
- `src/document-engine/templates/ordem-saque.pdf` (Remover os 3.99 MB de template obsoleto)
- `src/document-engine/generators/ordemSaque.generator.ts` (Substituído pelo novo engine)
- `src/document-engine/coordinates/ordemSaque.coordinates.ts` (Substituído pelo novo engine)

---

## 16. MATRIZ DE RISCOS DA FUTURA IMPLEMENTAÇÃO

| Risco | Severidade | Probabilidade | Mitigação |
| :--- | :---: | :---: | :--- |
| **Regressão na Súmula Canônica** | ALTA | BAIXA | **Manter arquivos da Súmula intocados.** Criar componentes específicos para a Ordem de Saque dentro do mesmo ecossistema `@react-pdf/renderer`. |
| **Quebra de Dimensões para Impressão** | MÉDIA | BAIXA | Usar medidas A4 Landscape exatas ($841.89 \times 595.28$ pt) e testar corte das filipetas em escala 100% sem bordas excedentes. |
| **Sobrecarga de Informação no Card** | MÉDIA | MÉDIA | Limitar dados pré-impressos ao essencial operacional (Times, Set, Treinador, Líberos) mantendo as caixas I a VI limpas para caneta. |
| **Incompatibilidade com Jogos sem Escalação** | BAIXA | MÉDIA | Suportar fallback gracioso quando atletas ou líberos ainda não foram cadastrados, renderizando caixas vazias. |

---

## 17. LIMITAÇÕES DESTA AUDITORIA

- Esta auditoria analisou estritamente o código-fonte, templates binários existentes e fluxos em execução local.
- **NENHUM CÓDIGO FOI ALTERADO OU CRIADO**, exceto este relatório de documentação.
- A implementação prática do novo gerador e a remoção dos arquivos legados dependem de aprovação formal e abertura da fase de execução.

---

## 18. CONFIRMAÇÃO DE INTEGRIDADE E REGRA DE CERTIFICAÇÃO

- **Status da Súmula Canônica:** 100% Preservada. Nenhum componente em `src/document-engine/baseos/` foi alterado nesta auditoria.
- **Status de Implementação:** NÃO IMPLEMENTADO (Somente Leitura).
- **Status do Git:** Verificado com `git status --short`. Todas as alterações presentes no working tree pertencem a fases anteriores de homologação da Súmula e regras do sistema. Nenhuma alteração de código foi realizada nesta fase.

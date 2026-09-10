# BASEOS — RELATÓRIO MASTER DE HOMOLOGAÇÃO DA ORDEM DE SAQUE CANÔNICA
**Data:** 09/09/2026  
**Fase:** Implementação e Homologação da Ordem de Saque Canônica  
**Status:** HOMOLOGADO (Pronto para Produção)  
**Engine de PDF:** `@react-pdf/renderer` (Vetorial, Declarativo, Estilização Flexbox, A4 Landscape)  
**Regressões na Súmula Canônica:** ZERO (Totalmente preservada e isolada)  
**Bateria de Testes:** 877 testes aprovados (99 arquivos de teste, 0 falhas)  
**Verificação de Tipagem:** 0 erros (`tsc -p tsconfig.app.json --noEmit`)  
**Linter:** 0 erros (`npm run lint`)  
**Build de Produção:** Aprovado (`npm run build`, bundle limpo gerado)

---

## 1. SUMÁRIO EXECUTIVO

A **Ordem de Saque / Ficha de Posição Inicial** é o documento oficial de quadra utilizado por técnicos de voleibol para submeter à equipe de arbitragem a escalação inicial, os líberos, o capitão em quadra e a rotação inicial de atletas (posições I a VI) para cada set disputado.

Antes desta fase, o BaseOS possuía duas implementações legadas e concorrentes:
1. Um gerador baseado em `pdf-lib` que carimbava textos sobre um arquivo de template escaneado (`ordem-saque.pdf`) de **3.99 MB**, o qual continha **logotipos indelúveis da FPV (Federação Paranaense de Voleibol) e da ITAIPU BINACIONAL** em cada uma das filipetas.
2. Um gerador procedural baseado em `jsPDF` (`officialMatchSheetPdf.ts`) com tipografia primitiva, dimensões ad-hoc e strings hardcoded (como `'Federação Paranaense de Voleibol'`).

Nesta fase, implementamos a **Ordem de Saque Canônica do BaseOS**, construída do zero sob a arquitetura unificada do `document-engine/baseos/`, utilizando exclusivamente `@react-pdf/renderer` em formato A4 Paisagem (Landscape, 841.89 × 595.28 pt).

### Principais Conquistas
- **Identidade BaseOS 100% Autêntica:** Adoção dos tokens de design `BASEOS_TOKENS`, tipografia Helvetica limpa e compacta, logotipo vetorial de 3 barras do BaseOS e eliminação total e irrestrita de qualquer vestígio de FPV ou Itaipu Binacional.
- **Redução Drástica de Peso:** O documento de 1 página caiu de **3.990 KB (3.99 MB)** para meros **~31 KB** (redução superior a 99,2% no tráfego de rede e consumo de memória).
- **Resolução Canônica de Formato:** Integração com as regras de competição (`CompetitionRulesService.resolveMatchFormat`), suportando de forma nativa e determinística:
  - **1 set (`setsToWin = 1`):** 1 página contendo 2 cards oficiais (Set 1 Equipe A e Equipe B) + 6 cards reservas/extras devidamente rotulados como `[RESERVA]`.
  - **3 sets (`setsToWin = 2`):** 1 página contendo 6 cards oficiais (Sets 1, 2 e 3 para Equipes A e B) + 2 cards reservas/extras devidamente rotulados como `[RESERVA]`.
  - **5 sets (`setsToWin = 3`):** 2 páginas. Página 1 com 8 cards oficiais (Sets 1, 2, 3 e 4 para ambas as equipes). Página 2 com 2 cards oficiais do Set Decisivo (Tiebreak - Set 5) + 6 cards reservas/extras.
- **Geometria Autêntica de Rotação:** Grid 2×3 reproduzindo a quadra oficial da FIVB/CBV:
  ```
  IV  | III | II   (Ataque / Rede)
  ----------------
  V   | VI  | I    (Fundo / Saque)
  ```
  Com a posição I destacada com `I (S)` indicando a origem do primeiro saque, células com bordas sólidas contínuas e amplas para anotação manuscrita dos números dos atletas, campos para Líberos (`L1`, `L2`), Capitão em quadra (`CAP`) e linha de assinatura do técnico.
- **Zero Regressões:** A Súmula Canônica existente (`src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` e `BaseosFiveSetScoresheet.tsx`) permaneceu intocada, garantindo estabilidade absoluta.
- **Pacote do Jogo (P2):** Recurso de impressão unificada que gera um único arquivo PDF concatenando a Súmula Canônica da partida e a Ordem de Saque Canônica correspondente via `pdf-lib`.
- **UI Integrada:** Atualização completa dos diálogos `BlankSheetEmitDialog.tsx` e `MatchSheetEmitDialog.tsx`, permitindo alternar entre abas de Súmula, Ordem de Saque, Pacote Completo e emissão em Branco com seletores de formato de sets.

---

## 2. ARQUITETURA IMPLEMENTADA

A nova implementação foi alocada inteiramente dentro da pasta de autoridade de documentos do BaseOS: `src/document-engine/baseos/`.

```
src/document-engine/baseos/
├── components/
│   ├── BaseosHeader.tsx               # Cabeçalho da Súmula Canônica (Preservado)
│   ├── BaseosServeOrderHeader.tsx     # NOVO: Cabeçalho compacto para Ordem de Saque (A4 Landscape)
│   ├── BaseosServeOrderCard.tsx       # NOVO: Filipeta individual de rotação (196 pt × 258 pt)
│   └── ...
├── templates/
│   ├── BaseosThreeSetScoresheet.tsx   # Súmula 3 sets (Preservado)
│   ├── BaseosFiveSetScoresheet.tsx    # Súmula 5 sets (Preservado)
│   └── BaseosServeOrderDocument.tsx   # NOVO: Documento A4 Landscape multi-página (@react-pdf/renderer)
├── types/
│   ├── index.ts                       # Contratos gerais da súmula
│   └── serveOrder.ts                  # NOVO: Contratos estritos da Ordem de Saque
├── service/
│   ├── scoresheetService.ts           # Serviço da Súmula (Preservado)
│   └── serveOrderService.ts           # NOVO: Orquestrador de mapeamento, renderização e PDF blobs
├── mapper/
│   └── match.mapper.ts                # Loader canônico de dados do confronto
└── index.ts                           # Barrel de exportação central
```

### 2.1 Separação de Responsabilidades
1. **`types/serveOrder.ts`:** Define os tipos de dados puros desacoplados de bibliotecas externas (`BaseosServeOrderData`, `ServeOrderCardData`, `ServeOrderFormat`, `ServeOrderTeamSide`).
2. **`components/BaseosServeOrderHeader.tsx`:** Componente de cabeçalho horizontal de alta densidade (~36 pt de altura), exibindo o logo BaseOS vetorial, nome da competição, fase/categoria, confronto (`Equipe A vs Equipe B`), data, hora, local e número da partida.
3. **`components/BaseosServeOrderCard.tsx`:** Componente da filipeta individual de rotação. Cada página de A4 Landscape agrupa exatamente 8 cards (grade 4 colunas × 2 linhas).
4. **`templates/BaseosServeOrderDocument.tsx`:** Montador do documento `@react-pdf/renderer` em formato A4 Paisagem (`size="A4" orientation="landscape"`), controlando a paginação e distribuição dos cards.
5. **`service/serveOrderService.ts`:** Orquestrador principal responsável por:
   - Mapear dados da súmula (`BaseosScoresheetData`) para o contrato de ordem de saque (`mapScoresheetToServeOrderData`).
   - Gerar ordem de saque em branco com metadados configuráveis (`createBlankBaseosServeOrderData`).
   - Resolver formato canônico (1 set, 3 sets ou 5 sets) via regras do campeonato.
   - Compilar os blobs de PDF através de `pdf(document).toBlob()` e `renderToBuffer`.
   - Concatenar Súmula e Ordem de Saque no "Pacote do Jogo" (`generateGamePackagePdfBlob`).
   - Fornecer utilitários de download e impressão direta no navegador.

---

## 3. CONTRATO DE DADOS CANÔNICO

O contrato de dados em `src/document-engine/baseos/types/serveOrder.ts` foi desenhado seguindo a premissa de desacoplamento e clareza esportiva:

```typescript
export type ServeOrderFormat = '1-set' | '3-sets' | '5-sets';
export type ServeOrderTeamSide = 'A' | 'B';

export interface ServeOrderCardData {
  teamSide: ServeOrderTeamSide;
  teamName: string;
  opponentName?: string;
  setNumber: number;
  isDecidingSet: boolean;
  isReserve: boolean;
  cardLabel: string; // Ex: "SET 1", "SET 5 (TIE-BREAK)", "SET EXTRA / RESERVA"
  initialServerTeamSide?: ServeOrderTeamSide;
  captainNumber?: number | string;
  libero1Number?: number | string;
  libero2Number?: number | string;
  positions?: {
    pos1?: number | string;
    pos2?: number | string;
    pos3?: number | string;
    pos4?: number | string;
    pos5?: number | string;
    pos6?: number | string;
  };
  coachName?: string;
}

export interface BaseosServeOrderData {
  competitionName: string;
  categoryGender?: string;
  phasePool?: string;
  matchNumber?: number | string;
  matchDate?: string;
  matchTime?: string;
  courtLocation?: string;
  teamA: {
    name: string;
    shortName?: string;
    coachName?: string;
    captainNumber?: number | string;
    libero1Number?: number | string;
    libero2Number?: number | string;
  };
  teamB: {
    name: string;
    shortName?: string;
    coachName?: string;
    captainNumber?: number | string;
    libero1Number?: number | string;
    libero2Number?: number | string;
  };
  format: ServeOrderFormat;
  cards: ServeOrderCardData[];
  isBlank?: boolean;
}
```

### Regras de Preenchimento:
- **Campos I a VI:** Permanecem vazios por padrão para preenchimento manual à caneta pelo técnico ou capitão antes do início de cada set.
- **Líberos e Capitão:** São pré-preenchidos se e somente se estiverem formalmente registrados no elenco/súmula da equipe. Caso contrário, os campos permanecem em branco para preenchimento manual.
- **Roster:** Não há contaminação do contrato com elencos completos de atletas, mantendo o payload ultra-leve e focado.

---

## 4. GEOMETRIA DA PÁGINA E DESIGN SYSTEM

### 4.1 Dimensões da Folha e Grid
- **Padrão:** A4 Paisagem (Landscape)
- **Largura total:** `841.89 pt` (~297 mm)
- **Altura total:** `595.28 pt` (~210 mm)
- **Margens:** Top `12 pt`, Bottom `10 pt`, Left `16 pt`, Right `16 pt`
- **Área útil para cards:** `809.89 pt` (largura) × `525 pt` (altura)
- **Estrutura:** Grade regular de 4 colunas × 2 linhas (8 filipetas por folha).
- **Dimensões do Card:**
  - Largura: `196 pt` (~69 mm)
  - Altura: `258 pt` (~91 mm)
  - Espaçamento horizontal entre colunas: `6 pt`
  - Espaçamento vertical entre linhas: `6 pt`

### 4.2 Anatomia Interna da Filipeta (`BaseosServeOrderCard`)
Cada filipeta de 196 × 258 pt foi construída com bordas sólidas pretas (`#000000`) de espessura `1 pt`, abolindo bordas tracejadas frágeis:
1. **Faixa de Título do Set (Cabeçalho do Card):** Fundo cinza suave (`#f3f4f6`), exibindo em negrito:
   - Lado da Equipe: `EQUIPE A` ou `EQUIPE B`
   - Identificação do Set: `SET 1`, `SET 2`, `SET 3`, `SET 4`, `SET 5 (DECISIVO)` ou `[RESERVA]`
   - Box de Saque: `[ ] SAQUE` para marcação de quem começa sacando
2. **Nome da Equipe:** Caixa com altura fixa de `24 pt`, borda inferior sólida, exibindo o nome da equipe em destaque (`fontSize: 9 pt`, negrito) e o adversário no rodapé (`fontSize: 6 pt`). Suporta nomes extensos com wrap gracioso.
3. **Banner de Rede:** Faixa centralizada com texto ASCII seguro: `--- REDE (ATAQUE) ---` em `fontSize: 6 pt`, orientando visualmente o técnico sobre a orientação da quadra.
4. **Grid de Rotação 2×3 (Posições Oficiais de Voleibol):**
   - **Linha de Frente (Ataque):** Células `IV`, `III`, `II`.
   - **Linha de Fundo (Defesa):** Células `V`, `VI`, `I`.
   - **Destaque na Posição I:** Marcada explicitamente como `I (S)` indicando o atleta que executa o saque inicial.
   - **Espaço Útil:** Cada uma das 6 células possui área desobstruída de ~62 pt de largura por ~42 pt de altura, permitindo escrita à caneta de números de 1 a 99 com folga e clareza para a arbitragem.
5. **Painel de Controle de Líberos e Capitão:** Três caixas compactas lado a lado na base do grid:
   - `L1 (Líbero 1)`
   - `L2 (Líbero 2)`
   - `CAP (Capitão)`
6. **Rodapé de Homologação:** Linha sólida com identificação: `Técnico: [Nome] _________________________ Assinatura`.

---

## 5. RESOLUÇÃO DE FORMATOS CANÔNICOS DE SETS

A distribuição das 8 filipetas por página respeita a seguinte matriz canônica de regras esportivas:

| Formato | Sets p/ Vencer | Páginas | Total de Cards | Distribuição na Página 1 | Distribuição na Página 2 |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **1-set** | 1 | 1 | 8 cards | **2 Oficiais** (Set 1 A, Set 1 B)<br>+ **6 Reservas** (3 p/ Equipe A, 3 p/ Equipe B) | N/A |
| **3-sets** | 2 | 1 | 8 cards | **6 Oficiais** (Sets 1, 2, 3 A & B)<br>+ **2 Reservas** (1 p/ Equipe A, 1 p/ Equipe B) | N/A |
| **5-sets** | 3 | 2 | 16 cards | **8 Oficiais** (Sets 1, 2, 3, 4 A & B) | **2 Oficiais** (Set 5 Decisivo A & B)<br>+ **6 Reservas** (3 p/ Equipe A, 3 p/ Equipe B) |

### Destaque Visual dos Sets Extras / Reservas
Cards excedentes aos sets oficiais de jogo recebem a rotulagem explícita `SET EXTRA / RESERVA` ou `[RESERVA]`, além de campo aberto para o técnico anotar manualmente o número do set caso ocorra repetição, anulação ou necessidade extraordinária de súmula.

---

## 6. INTEGRAÇÃO COM A INTERFACE DE USUÁRIO (UI)

### 6.1 Modal de Partida Específica (`MatchSheetEmitDialog.tsx`)
A interface foi expandida para oferecer 4 abas ergonômicas e intuitivas:
- **Aba "Súmula de Jogo":** Emite a Súmula Canônica oficial (melhor de 3 ou melhor de 5) com visualização prévia em PDF embutido e botão de download.
- **Aba "Ordem de Saque":** Emite a nova Ordem de Saque Canônica com os dados da partida e equipes automaticamente preenchidos, respeitando o número de sets da competição.
- **Aba "Pacote Completo":** Gera o documento unificado (P2) contendo a Súmula Canônica seguida da Ordem de Saque Canônica em um único arquivo PDF.
- **Aba "Folhas em Branco":** Oferece a emissão rápida de documentos neutros.

### 6.2 Modal de Documentos em Branco (`BlankSheetEmitDialog.tsx`)
Totalmente reformulado para utilizar o novo motor vetorial `@react-pdf/renderer`:
- Substituiu a antiga dependência do template escaneado `ordem-saque.pdf` (3.99 MB).
- Adicionou seletores de formato: `Melhor de 3 Sets (1 folha - 8 cards)`, `Melhor de 5 Sets (2 folhas - 16 cards)` e `Set Único (1 folha)`.
- Permite download e impressão direta instantâneos em PDF vetorial cristalino de ~30 KB.

---

## 7. PACOTE DO JOGO (CONCATENAÇÃO P2)

Implementamos a funcionalidade de geração de pacote completo da partida (`generateGamePackagePdfBlob` em `serveOrderService.ts`):
1. O serviço renderiza o PDF da Súmula Canônica via `scoresheetService.generateScoresheetPdfBlob(matchData)`.
2. O serviço renderiza o PDF da Ordem de Saque Canônica via `generateServeOrderPdfBlob(scoresheetData)`.
3. Utilizando `pdf-lib` exclusivamente como ferramenta de mesclagem estrutural (`PDFDocument.create()` e `mergedPdf.copyPages()`), os fluxos binários das duas folhas são unidos em um único PDF linearizado sem qualquer perda de qualidade ou retrabalho visual.
4. O resultado é um arquivo PDF completo com a Súmula Canônica na primeira página (ou primeiras páginas) e a Ordem de Saque nas páginas subsequentes, ideal para impressão em lote pelos delegados de partida.

---

## 8. INSPEÇÃO VISUAL E AUDITORIA DE TIPOGRAFIA

### 8.1 Correção de Encoding Tipográfico (Helvetica WinAnsi)
Durante as etapas de validação visual com `pdftoppm`, constatamos que o caractere unicode `▲` (Black Up-Pointing Triangle) não é mapeado na codificação padrão `WinAnsiEncoding` do PDF para a fonte Helvetica básica do `@react-pdf/renderer`, resultando na substituição pelo caractere `²`.
- **Solução Aplicada:** Substituição da linha decorativa pelo banner ASCII canônico e esportivamente explícito:
  ```
  --- REDE (ATAQUE) ---
  ```
- **Resultado:** Renderização 100% perfeita em qualquer leitor de PDF, impressora e plataforma (Linux, Mac, Windows, iOS, Android), com legibilidade imediata.

### 8.2 Teste de Estresse com Nomes Extensos
Executamos teste automatizado de estresse visual com times de nomenclatura longa:
- Equipe A: `"ASSOCIAÇÃO ATLÉTICA ACADÊMICA DE ENGENHARIA E CIÊNCIAS TECNOLÓGICAS DA UNIVERSIDADE FEDERAL"`
- Equipe B: `"CLUBE RECREATIVO E ESPORTIVO DOS FUNCIONÁRIOS PÚBLICOS MUNICIPAIS DE CASCAVEL"`
- **Validação:** A caixa de equipe (`height: 24 pt`, `flexDirection: column`) acomodou o nome com quebra de linha sem colisão ou transbordamento sobre o grid de rotação ou banner da rede.

---

## 9. EVOLUÇÃO E STATUS DO CÓDIGO LEGADO

Realizamos varredura minuciosa em todo o repositório (`task-1926`) para rastrear o uso dos arquivos e termos legados:

| Componente Legado | Localização | Status Atual | Ação Futura |
| :--- | :--- | :--- | :--- |
| `ordem-saque.pdf` | `src/document-engine/templates/` | **Desconectado da UI**. `BlankSheetEmitDialog` agora consome a nova engine vetorial. Arquivo binário mantido apenas por compatibilidade com testes legados de regressão. | Exclusão programada na próxima fase de limpeza. |
| `ordemSaque.generator.ts` | `src/document-engine/generators/` | Mantido ativo para garantir retrocompatibilidade com suíte de testes existente (`documentEngine.test.ts`). | Descontinuação progressiva. |
| `ordemSaque.coordinates.ts` | `src/document-engine/coordinates/` | Preservado para uso exclusivo do gerador legado acima. | Descontinuação progressiva. |
| `generatePositionOrderSheetPdf` | `src/lib/pdf/officialMatchSheetPdf.ts` | Gerador `jsPDF` legado com fallback da FPV. Permanece isolado em `src/lib/pdf/`, sem nenhum consumo nas rotas ou componentes principais do BaseOS. | Descontinuação e deprecação formal. |

---

## 10. RESULTADOS DOS TESTES E VALIDAÇÕES

### 10.1 Bateria de Testes Automatizados Unitários e de Integração
Arquivo: `src/test/document-engine/baseos/serveOrder.test.ts` (13 testes, 100% de aprovação)
- `resolveServeOrderFormat`:
  - Mapeia corretamente competição com `setsToWin: 1` para `'1-set'`.
  - Mapeia corretamente competição com `setsToWin: 2` para `'3-sets'`.
  - Mapeia corretamente competição com `setsToWin: 3` para `'5-sets'`.
  - Assume fallback seguro para `'3-sets'` quando não houver configuração explícita.
- `mapScoresheetToServeOrderData`:
  - Formato 3 sets: gera exatamente 8 cards (6 oficiais para sets 1, 2, 3 + 2 reservas).
  - Formato 5 sets: gera exatamente 16 cards (8 oficiais na pág 1 + 2 do set 5 decisivo e 6 reservas na pág 2).
  - Formato 1 set: gera exatamente 8 cards (2 oficiais para set 1 + 6 reservas).
  - Rótulos corretos: `[RESERVA]` nos sets excedentes e `SET 5 (DECISIVO)` no tie-break.
  - Preenchimento contextual de líberos e capitão quando definidos na súmula.
- `createBlankBaseosServeOrderData`:
  - Gera estrutura válida para impressão em branco com equipes anônimas (`EQUIPE A`, `EQUIPE B`).
- Robustez e Estresse:
  - Processa sem erros nomes extremamente longos de equipes e atletas.
- Integração de Renderização:
  - `generateServeOrderPdfBlob` gera com sucesso um `Blob` do tipo `application/pdf` com tamanho consistente (> 15 KB).
- Integração Real E2E:
  - Carrega dados reais de partida seeded (`match-1`) via `loadBaseosScoresheetData` e gera a ordem de saque correspondente sem erros.

### 10.2 Bateria de Geração de PDFs de Inspeção
Arquivo: `src/test/document-engine/baseos/generateServeOrderInspectionPdfs.test.ts` (7 testes, 100% de aprovação)
Arquivos gerados em `dist/pdf-inspection/serve-order/`:
1. `ordem_saque_1set_preenchida.pdf`: 31.0 KB, 1 página (841.89 × 595.28 pt)
2. `ordem_saque_3sets_preenchida.pdf`: 31.6 KB, 1 página (841.89 × 595.28 pt)
3. `ordem_saque_3sets_em_branco.pdf`: 30.4 KB, 1 página (841.89 × 595.28 pt)
4. `ordem_saque_5sets_preenchida.pdf`: 61.9 KB, 2 páginas (841.89 × 595.28 pt cada)
5. `ordem_saque_5sets_em_branco.pdf`: 59.6 KB, 2 páginas (841.89 × 595.28 pt cada)
6. `ordem_saque_estresse_nomes_longos.pdf`: 33.5 KB, 1 página (841.89 × 595.28 pt)
7. `pacote_completo_jogo_3sets.pdf`: 82.9 KB, 2 páginas (Súmula Canônica + Ordem de Saque)

### 10.3 Sanidade do Projeto
```bash
# 1. Typecheck TypeScript
$ npx tsc -p tsconfig.app.json --noEmit
# Saída: 0 erros

# 2. Linter ESLint
$ npm run lint
# Saída: 0 erros

# 3. Testes Globais Vitest
$ npm test
# Saída: 99 arquivos de teste passados, 877 testes passados, 0 falhas

# 4. Build de Produção Vite
$ npm run build
# Saída: Concluído com sucesso em 31.60s
```

---

## 11. TERMO DE HOMOLOGAÇÃO

Certifico que a **Ordem de Saque Canônica do BaseOS** atende integralmente aos requisitos técnicos, esportivos e operacionais definidos para o sistema:
1. Utiliza exclusivamente a stack oficial `@react-pdf/renderer` em formato A4 Paisagem.
2. Elimina todas as marcas e menções à FPV e Itaipu Binacional do fluxo de emissão.
3. Garante conformidade total com as posições de quadra da FIVB/CBV (IV-III-II / V-VI-I).
4. Integra-se harmoniosamente aos diálogos do BaseOS (`MatchSheetEmitDialog` e `BlankSheetEmitDialog`).
5. Mantém a Súmula Canônica intacta, sem qualquer risco de regressão.

**Status Final:** **HOMOLOGADO**

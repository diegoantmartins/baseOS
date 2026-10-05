# BASEOS — COMPARAÇÃO GEOMÉTRICA DE SÚMULAS (3 SETS)
## Súmula de Referência Externa × Súmula BaseOS Atual

**Documento:** Relatório Técnico de Auditoria, Comparação Geométrica, Medição e Proposta de Layout  
**Data:** 30/09/2026  
**Ambiente:** DEV / Laboratório Local (Produção VOLTZ estritamente intocada)  
**Status do Código:** **NENHUMA ALTERAÇÃO DE CÓDIGO — ETAPA EXCLUSIVA DE AUDITORIA E PROPOSTA**  
**Autores/Papéis:** Senior PDF/Document Engineer, Especialista em `@react-pdf/renderer`, Especialista em Formulários Esportivos e Ergonomia, QA Master  

---

## 1. ESTADO INICIAL DO WORKSPACE

Em conformidade rigorosa com a regra de preservação:
- **Diretório:** `/home/diego-martins/docker/volei`
- **Branch atual:** `main`
- **HEAD:** `77bc4d6 (HEAD -> main) fix(match-sheet): enforce side-out rotation and set validation`
- **Status do Git:** Todas as modificações locais de fases anteriores (portais, identidades, segurança e engine de documentos) foram integralmente preservadas. Nenhum comando destrutivo (`reset`, `clean`, `checkout`, `restore`) foi executado.

---

## 2. ARQUITETURA ATUAL DA SÚMULA BASEOS (3 SETS)

A geração da súmula BaseOS de 3 sets baseia-se em um pipeline declarativo e determinístico orientado a geometria fixa:

1. **Componente Raiz:** [`BaseosThreeSetScoresheet.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx) encapsula o `<Document>` e a `<Page size="A4" orientation="landscape">`.
2. **Definição Geométrica Centralizada:** [`layouts.ts`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/geometry/layouts.ts) define o objeto `THREE_SET_A4_LAYOUT` onde cada bloco possui coordenadas absolutas (`x`, `y`, `width`, `height`).
3. **Componentes Modulares por Cartão:**
   - [`BaseosHeader.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosHeader.tsx): Cabeçalho oficial com branding BaseOS, confronto, metadados e selo CBV/FIVB.
   - [`BaseosSetBlock.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosSetBlock.tsx) + [`BaseosPointGrid.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosPointGrid.tsx): Bloco individual do set em formato de faixa horizontal completa (incluindo rotação para ambas as equipes, legendas, substituições e régua de pontos).
   - [`BaseosRosters.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosRosters.tsx): Bloco de elencos para Equipe A e Equipe B lado a lado (14 atletas, 2 líberos, 4 membros de comissão técnica e assinaturas).
   - [`BaseosSanctions.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosSanctions.tsx): Quadro oficial de sanções disciplinares e solicitações indevidas.
   - [`BaseosSignatures.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosSignatures.tsx): Quadro de aprovação da arbitragem (6 oficiais) e capitães.
   - [`BaseosRemarks.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosRemarks.tsx): Quadro exclusivo para observações da partida.
   - [`BaseosResult.tsx`](file:///home/diego-martins/docker/volei/src/document-engine/baseos/components/BaseosResult.tsx): Quadro oficial de resultados set a set, totais e vencedor.

---

## 3. GEOMETRIA ATUAL BASEOS 3 SETS

- **Página:** `A4 Landscape` = `841.89 × 595.28 pt` (`297.00 × 210.00 mm`)
- **Margens Físicas:**
  - Esquerda: `6.00 pt` (`2.12 mm`)
  - Direita: `6.00 pt` (`2.12 mm`)
  - Superior: `6.00 pt` (`2.12 mm`)
  - Inferior: `10.28 pt` (`3.63 mm`)
- **Área Útil de Conteúdo:** `829.89 × 579.00 pt` = `480,506.31 pt²` (95.88% da área da página)

### Coordenadas e Dimensões dos Blocos:
- **Header:** `{ x: 6.00, y: 6.00, width: 829.89, height: 42.00 pt }`
- **Sets (Faixa Vertical Esquerda: x = 6.00 a 526.00, y = 51.00 a 471.00):**
  - Set 1: `{ x: 6.00, y: 51.00, width: 520.00, height: 138.00 pt }`
  - Set 2: `{ x: 6.00, y: 192.00, width: 520.00, height: 138.00 pt }`
  - Set 3: `{ x: 6.00, y: 333.00, width: 520.00, height: 138.00 pt }`
- **Elencos (Roster: Coluna Direita: x = 529.00 a 835.89):**
  - `{ x: 529.00, y: 51.00, width: 306.89, height: 420.00 pt }`
- **Rodapé (Faixa Horizontal Inferior: y = 478.00 a 585.00, height = 107.00 pt):**
  - Sanções: `{ x: 6.00, y: 478.00, width: 200.00, height: 107.00 pt }`
  - Assinaturas: `{ x: 208.50, y: 478.00, width: 220.00, height: 107.00 pt }`
  - Observações: `{ x: 431.00, y: 478.00, width: 182.39, height: 107.00 pt }`
  - Resultado: `{ x: 615.89, y: 478.00, width: 220.00, height: 107.00 pt }`

---

## 4. GEOMETRIA DA SÚMULA DE REFERÊNCIA (MODELO A)

- **Página:** `A4 Landscape` = `841.89 × 595.28 pt` (`297.00 × 210.00 mm`)
- **Margens:** `20.00 pt` uniforme em todos os lados (`7.06 mm`)
- **Área Útil de Conteúdo:** `801.89 × 555.00 pt` = `445,048.95 pt²` (88.80% da área da página)

### Coordenadas e Dimensões dos Blocos:
- **Header:** `{ x: 20.00, y: 20.00, width: 801.89, height: 50.00 pt }`
- **Sets (Disposição Colunar Lado a Lado na Coluna Esquerda):**
  - Bloco Agrupado dos Sets: `{ x: 20.00, y: 75.00, width: 500.00, height: 260.00 pt }`
  - Set 1: `{ width: 164.00, height: 260.00 pt }`
  - Set 2: `{ width: 164.00, height: 260.00 pt }`
  - Set 3: `{ width: 164.00, height: 260.00 pt }`
  - (Nota: 3 × 164 pt = 492 pt + 8 pt de espaçamento = 500 pt)
- **Elencos (Roster: Coluna Direita Contínua do Topo à Base):**
  - `{ x: 525.00, y: 75.00, width: 296.89, height: 500.00 pt }`
  - 16 linhas com `14.00 pt` por linha
- **Blocos Sob os Sets (Coluna Esquerda, y = 345 a 575):**
  - Sanções: `{ x: 20.00, y: 345.00, width: 250.00, height: 110.00 pt }`
  - Resultado: `{ x: 275.00, y: 345.00, width: 245.00, height: 110.00 pt }`
  - Assinaturas: `{ x: 20.00, y: 455.00, width: 500.00, height: 120.00 pt }`
  - Observações: `NÃO EXISTE` (card isolado ausente)

---

## 5. TABELA COMPARATIVA COMPLETA

| Elemento | Referência (pt) | Referência (mm) | BaseOS Atual (pt) | BaseOS Atual (mm) | Diferença (pt) | Variação % |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Largura da Página** | 841.89 | 297.00 | 841.89 | 297.00 | 0.00 | 0.0% |
| **Altura da Página** | 595.28 | 210.00 | 595.28 | 210.00 | 0.00 | 0.0% |
| **Margem Esquerda** | 20.00 | 7.06 | 6.00 | 2.12 | -14.00 | -70.0% |
| **Margem Direita** | 20.00 | 7.06 | 6.00 | 2.12 | -14.00 | -70.0% |
| **Margem Superior** | 20.00 | 7.06 | 6.00 | 2.12 | -14.00 | -70.0% |
| **Margem Inferior** | 20.28 | 7.15 | 10.28 | 3.63 | -10.00 | -49.3% |
| **Área Útil Total** | 445,048.95 pt² | - | 480,506.31 pt² | - | +35,457.36 pt² | **+7.97%** |
| **Header (L × A)** | 801.89 × 50.00 | 282.89 × 17.64 | 829.89 × 42.00 | 292.77 × 14.82 | +28.00 / -8.00 | -13.1% (área) |
| **Área Total dos Sets**| 500.00 × 260.00 | 176.39 × 91.72 | 520.00 × 420.00 | 183.44 × 148.17 | +20.00 / +160.00| **+68.0% (área)** |
| - *Set 1 (L × A)* | 164.00 × 260.00 | 57.86 × 91.72 | 520.00 × 138.00 | 183.44 × 48.68 | +356.00 / -122.00| +68.3% (área) |
| - *Set 2 (L × A)* | 164.00 × 260.00 | 57.86 × 91.72 | 520.00 × 138.00 | 183.44 × 48.68 | +356.00 / -122.00| +68.3% (área) |
| - *Set 3 (L × A)* | 164.00 × 260.00 | 57.86 × 91.72 | 520.00 × 138.00 | 183.44 × 48.68 | +356.00 / -122.00| +68.3% (área) |
| **Roster (L × A)** | 296.89 × 500.00 | 104.74 × 176.39 | 306.89 × 420.00 | 108.26 × 148.17 | +10.00 / -80.00 | **-13.2% (área)** |
| - *Altura Linha Atleta*| 14.00 | 4.94 | 16.38 | 5.78 | +2.38 | **+17.0%** |
| - *Linhas p/ Equipe* | 16 linhas | - | 20 linhas | - | +4 linhas | +25.0% |
| **Sanções (L × A)** | 250.00 × 110.00 | 88.19 × 38.81 | 200.00 × 107.00 | 70.56 × 37.75 | -50.00 / -3.00 | **-22.2% (área)** |
| **Resultado (L × A)** | 245.00 × 110.00 | 86.43 × 38.81 | 220.00 × 107.00 | 77.61 × 37.75 | -25.00 / -3.00 | **-12.7% (área)** |
| **Assinaturas (L × A)**| 500.00 × 120.00 | 176.39 × 42.33 | 220.00 × 107.00 | 77.61 × 37.75 | -280.00 / -13.00| **-60.8% (área)** |
| **Observações (L × A)**| *NÃO EXISTE* | *NÃO EXISTE* | 182.39 × 107.00 | 64.34 × 37.75 | *Presente no BaseOS*| **+19,515.7 pt²** |

---

## 6. DISTRIBUIÇÃO PERCENTUAL DE ESPAÇO

Comparação da partição da área útil (% sobre a área total útil de impressão):

```text
DISTRIBUIÇÃO PERCENTUAL — MODELO A (REFERÊNCIA)
Total útil: 445,048.95 pt²

ROSTER (33.35%)         █████████████████████████████████
SETS (29.21%)           █████████████████████████████
SIGNATURES (13.48%)     █████████████
HEADER (9.01%)          █████████
SANCTIONS (6.18%)       ██████
RESULT (6.06%)          ██████
REMARKS (0.00%)         (ausente)
GAPS / MARGENS INT (2.71%) ██

DISTRIBUIÇÃO PERCENTUAL — MODELO B (BASEOS ATUAL 3 SETS)
Total útil: 480,506.31 pt²

SETS (45.45%)           █████████████████████████████████████████████
ROSTER (26.82%)         ███████████████████████████
HEADER (7.25%)          ███████
SIGNATURES (4.90%)      █████
RESULT (4.90%)          █████
SANCTIONS (4.45%)       ████
REMARKS (4.06%)         ████
GAPS / MARGENS INT (2.16%) ██
```

### Principais Constatações:
1. **Os Sets no BaseOS ocupam quase metade da folha (45.45% vs 29.21%):** O BaseOS trata os sets como o coração analítico da partida, desenhando a grade oficial completa com 8 rodadas de saque, substituições e régua ponto a ponto. Na referência, os sets são compactados em colunas verticais estreitas.
2. **O Roster na Referência é o elemento dominante (33.35% vs 26.82%):** A referência utiliza a altura total da folha para os elencos (500 pt).
3. **Assinaturas na Referência consomem 13.48% (60.000 pt²):** Espaço desproporcional para 6 assinaturas e 2 vistos. No BaseOS, o bloco consome 4.90% (23.540 pt²).
4. **O BaseOS reserva 4.06% para Observações:** O modelo de referência omite esse bloco ou o mescla de forma genérica nas assinaturas, o que viola o regulamento CBV/FIVB para anotação de protestos e ocorrências.

---

## 7. COMPARAÇÃO PROFUNDA DO ROSTER (ELENCOS)

| Parâmetro | Referência (Modelo A) | BaseOS Atual (Modelo B) | Análise Ergonômica e Técnica |
| :--- | :---: | :---: | :--- |
| **Largura Total** | `296.89 pt` (104.7 mm) | `306.89 pt` (108.3 mm) | BaseOS é **10 pt mais largo** que a referência. |
| **Altura Total** | `500.00 pt` (176.4 mm) | `420.00 pt` (148.2 mm) | Referência tem **80 pt a mais** de curso vertical. |
| **Organização** | Equipes empilhadas ou bloco único | Equipe A e Equipe B lado a lado | BaseOS divide os 306.89 pt em duas colunas de 153.45 pt. |
| **Linhas por Equipe** | 16 linhas | **20 linhas** (14 atl. + 2 líb. + 4 comissão) | BaseOS atende integralmente ao regulamento oficial moderno. |
| **Altura por Linha** | `14.00 pt` (4.94 mm) | **`16.38 pt` (5.78 mm)** | **A linha do BaseOS é +2.38 pt (+17%) MAIOR que a referência!** |
| **Largura da Coluna Nome**| ~270 pt (se empilhado) / ~120 pt | `127.45 pt` (44.96 mm) | Nomes longos requerem fonte 4.4 pt no BaseOS. |
| **Coluna Número** | ~26 pt | `26.00 pt` (9.17 mm) | Idêntico; círculos de capitão perfeitamente acomodados. |
| **Assinaturas Técn./Cap.** | Integradas | Bloco inferior de `50.40 pt` | BaseOS reserva bloco exclusivo para técnicos e capitães. |

---

## 8. COMPARAÇÃO PROFUNDA DOS SETS

| Aspecto | Referência (Modelo A) | BaseOS Atual (Modelo B) | Análise Técnica |
| :--- | :---: | :---: | :--- |
| **Orientação dos Sets** | **Vertical (Colunas)** | **Horizontal (Faixas)** | A referência coloca Set 1, 2 e 3 lado a lado; o BaseOS empilha 1, 2 e 3. |
| **Dimensão por Set** | `164.00 × 260.00 pt` | `520.00 × 138.00 pt` | Formato retrato na referência vs formato paisagem no BaseOS. |
| **Espaço para Rotação** | 164 pt para ambas as equipes | `520 pt` com 2 quadrantes completos | BaseOS oferece **34 pt** por posição de rotação contra ~12–14 pt na referência. |
| **Rodadas de Saque** | Abreviadas ou simplificadas | Grade completa de 8 rodadas (1 a 8) | BaseOS permite registro minucioso de cada passagem de saque. |
| **Régua Ponto a Ponto** | Coluna única comprimida | Grade de 3 colunas (até 36 pontos) | BaseOS permite marcação limpa de sets estendidos (tie-break ou vantagens). |
| **Set Decisivo (Set 3)** | Idêntico aos sets 1 e 2 | **Troca de Lado Oficial** | BaseOS implementa a 3ª coluna de troca de lado com 8 pontos de virada. |

---

## 9. COMPARAÇÃO PROFUNDA DO FOOTER (RODAPÉ)

| Bloco | Referência (Modelo A) | BaseOS Atual (Modelo B) | Análise de Espaço e Funcionalidade |
| :--- | :---: | :---: | :--- |
| **Sanções** | `250.00 × 110.00 pt` | `200.00 × 107.00 pt` | Referência possui 50 pt adicionais de largura (+25%). BaseOS possui grade completa de 4 sanções + solicitações indevidas + nota. |
| **Resultado** | `245.00 × 110.00 pt` | `220.00 × 107.00 pt` | BaseOS é 25 pt mais compacto, mas contém 9 colunas detalhadas (T, S, V, Pontos, Set, Pontos, V, S, T), horários e vencedor. |
| **Assinaturas** | `500.00 × 120.00 pt` (60.000 pt²)| `220.00 × 107.00 pt` (23.540 pt²)| **A referência consome 2.55× mais área.** No BaseOS, as linhas de assinatura dos capitães têm 56 pt (curtas). |
| **Observações** | *Inexistente como bloco* | `182.39 × 107.00 pt` (19.516 pt²)| BaseOS garante espaço real para redação de relatórios disciplinares e ocorrências. |

---

## 10. COMPARAÇÃO DE MARGENS E APROVEITAMENTO DE PAPEL

- **Referência:** Margem de `20.00 pt` (`7.06 mm`) em todos os 4 lados.
  - Perda de área em margem: `56,101.33 pt²` (11.20% da folha).
  - Vantagem: Margem extremamente segura contra sangria ou garras de tração de impressoras velhas.
  - Desvantagem: Reduz a área útil útil para `801.89 × 555.00 pt`.
- **BaseOS Atual:** Margens de `6.00 pt` nas laterais e topo (`2.12 mm`), e `10.28 pt` na base (`3.63 mm`).
  - Perda de área em margem: apenas `20,643.97 pt²` (4.12% da folha).
  - Vantagem: **Ganha 35.457 pt² adicionais** (+7.97% de área útil), permitindo que os sets tenham largura de 520 pt e o elenco 306.89 pt.
  - Ponto de Atenção: Margem lateral de 2.12 mm é funcional em impressoras modernas a laser/jato de tinta, mas uma margem de ~3.5 a 4.0 mm (`10 a 11.3 pt`) oferece maior segurança industrial.

---

## 11. COMPARAÇÃO DE TIPOGRAFIA

| Elemento | Referência (Estimada) | BaseOS Atual | Diferença |
| :--- | :---: | :---: | :---: |
| **Título do Documento** | 10.0 pt Bold | 6.8 pt Bold (escalável a 5.2 pt) | BaseOS é mais sutil e funcional |
| **Nomes das Equipes (Topo)**| 8.5 pt Bold | 8.5 pt Bold (escalável a 6.5 pt) | Idêntico |
| **Títulos de Seção** | 6.0 pt Bold | 5.0 – 5.5 pt Bold | Muito próximo |
| **Nomes de Atletas** | ~6.0 pt Regular | 5.2 pt Regular (4.4 pt p/ > 24 chars) | BaseOS tem proteção anti-overflow |
| **Números de Camisa** | ~7.0 pt Bold | 5.2 pt Regular / 4.8 pt Bold em círculo | BaseOS destaca capitão visualmente |
| **Camisa Titular no Set** | ~7.0 pt Bold | 6.8 pt Bold | Praticamente idêntico |
| **Legendas Técnicas** | ~4.0 pt Regular | 3.6 – 4.0 pt Bold/Regular | Alinhado com padrão FIVB |
| **Notas de Rodapé** | ~4.0 pt Regular | 3.4 pt Regular | Alta densidade e legibilidade |

---

## 12. COMPARAÇÃO DE ERGONOMIA DE PREENCHIMENTO MANUAL

| Critério | Referência (Modelo A) | BaseOS Atual (Modelo B) | Vencedor e Justificativa |
| :--- | :---: | :---: | :--- |
| **Escrita no Elenco (Linhas)** | `14.00 pt` (~4.9 mm) | **`16.38 pt` (~5.8 mm)** | **BaseOS (+17% de altura por linha).** Excelente para caneta esferográfica. |
| **Escrita de Nomes Longos** | Ampla se empilhado | Média (45 mm por nome) | **Referência**, caso use coluna de largura total para cada equipe. |
| **Preenchimento dos Sets** | Estreito e comprimido | **Amplo e panorâmico** | **BaseOS (larga vantagem).** 34 pt por coluna de posição contra ~12 pt. |
| **Assinatura de Oficiais** | Muito amplo (linhas longas) | Compacto (linhas de ~42 mm) | **Referência.** Assinaturas têm muito espaço horizontal. |
| **Assinatura de Capitães** | Integrada no Roster | Curta no rodapé (19.7 mm) | **Empate técnico.** Ambos permitem rubrica; BaseOS possui no Roster e no Rodapé. |
| **Registro de Sanções** | Amplo (250 pt) | Equilibrado (200 pt) | **Referência** tem mais espaço de escrita; BaseOS tem melhor estrutura de dados. |
| **Relato de Observações** | *Impossível sem rasurar* | **Dedicado (182 pt × 107 pt)** | **BaseOS.** Essencial para a mesa de apontamento e arbitragem. |

---

## 13. IDENTIFICAÇÃO DE ESPAÇOS DESPERDIÇADOS

### No Modelo de Referência (Modelo A):
1. **Quadro de Assinaturas Hipertrofiado:** `500 × 120 pt` (60.000 pt²). Ocupa 13.48% de toda a área útil da folha para conter 6 linhas de árbitros e 2 de capitães. Mais de 60% dessa caixa é espaço em branco ocioso.
2. **Margens Externas Excessivas:** `20 pt` em todas as bordas consome mais de 56.000 pt² que poderiam alargar as colunas de conjuntos e nomes.

### No BaseOS Atual (Modelo B):
1. **Sets Dominando 45.45% da Folha:** Embora a grade oficial seja rica e bonita, `138 pt` de altura por set para uma partida de 3 sets poderia ser discretamente ajustada (ex: `130 pt`) para conceder mais altura ou largura a outros elementos se necessário.
2. **Largura da Coluna de Nome de Atleta:** Com `127.45 pt` (~45 mm) de largura para o nome do jogador, atletas com nomes extensos ("Maximiliano de Albuquerque...") exigem redução de fonte para `4.4 pt`.

---

## 14. IDENTIFICAÇÃO DE ÁREAS COMPRIMIDAS

### No Modelo de Referência (Modelo A):
1. **Sets em Colunas Verticais Estreitas (164 pt):** Comprimir 6 rotações, substituições e pontuação em 164 pt gera células minúsculas para o apontador marcar durante o calor do jogo.
2. **Ausência de Campo de Observações:** Obriga os árbitros a escreverem nas margens ou sobre o quadro de assinaturas.

### No BaseOS Atual (Modelo B):
1. **Linha de Assinatura dos Capitães no Rodapé:** No componente `BaseosSignatures.tsx`, a linha dos capitães tem `width: 56 pt` (~19.7 mm), o que força uma rubrica extremamente diminuta.
2. **Largura de Sanções (200 pt):** Embora tenha melhorado consideravelmente em relação aos 165 pt históricos, a coluna de nome da equipe na sanção tem cerca de 60 pt, o que trunca nomes longos.

---

## 15. PRINCÍPIOS GEOMÉTRICOS DA REFERÊNCIA

Os principais conceitos que tornam a referência interessante são:
1. **Macro-divisão em 2 colunas verticais:** Toda a página (exceto o header) divide-se na proporção ~62% (esquerda) para jogo/oficiais e ~38% (direita) para elenco contínuo.
2. **Roster Contínuo de Topo a Base:** Ao estender o elenco por 500 pt ininterruptos, cria-se uma âncora visual forte na direita da página.
3. **Agrupamento de Rodapé sob os Sets:** Em vez de uma faixa horizontal completa no fundo da página, o rodapé ocupa exclusivamente a largura da coluna esquerda (500 pt).

---

## 16. PROPOSTAS DE DISTRIBUIÇÃO BASEOS (3 SETS)

Apresentamos duas propostas matemáticas rigorosas, preservando a identidade, as regras de negócio e a integridade do BaseOS.

---

### PROPOSTA A (RECOMENDADA) — EVOLUÇÃO ERGONÔMICA DO MODELO BASEOS
*Mantém a consagrada arquitetura de conjuntos horizontais oficiais CBV/FIVB, mas aperfeiçoa as margens para padrão industrial e amplia a largura do Elenco e de Assinaturas.*

#### Princípios da Proposta A:
1. Eleva as margens externas para `10.00 pt` (~3.5 mm), garantindo compatibilidade com 100% das impressoras de escritório sem risco de corte.
2. Alarga a coluna de Elenco de `306.89 pt` para **`318.00 pt`** (+11.1 pt), aumentando a largura útil dos nomes dos atletas para **`133.00 pt`** (~47 mm).
3. Mantém os sets com `500.00 pt` de largura (redução imperceptível de 20 pt), preservando as 8 rodadas de saque completas.
4. No rodapé, expande o bloco de Assinaturas para `240.00 pt` para permitir linhas de capitão de `75 pt` (~26.5 mm).

#### Coordenadas Matemáticas Proposta A:
```text
PAGE
  width: 841.89 pt
  height: 595.28 pt

MARGINS
  top: 8.00 pt
  bottom: 10.28 pt
  left: 10.00 pt
  right: 10.00 pt
  (Área útil: 821.89 × 577.00 pt = 474,230.53 pt²)

HEADER
  x: 10.00
  y: 8.00
  width: 821.89
  height: 40.00

SETS (Coluna Esquerda, width = 498.00 pt)
  Set 1: { x: 10.00, y: 51.00, width: 498.00, height: 137.00 }
  Set 2: { x: 10.00, y: 191.00, width: 498.00, height: 137.00 }
  Set 3: { x: 10.00, y: 331.00, width: 498.00, height: 137.00 }

ROSTER (Coluna Direita)
  x: 513.89
  y: 51.00
  width: 318.00
  height: 417.00
  (Linha de atleta: 16.2 pt de altura × 133 pt de largura para nome)

FOOTER (y = 472.00, height = 113.00 pt — alinha perfeitamente em y + h = 585.00 pt)
  Sanções:     { x: 10.00,  y: 472.00, width: 195.00, height: 113.00 }
  Assinaturas: { x: 209.00, y: 472.00, width: 235.00, height: 113.00 }
  Observações: { x: 448.00, y: 472.00, width: 175.00, height: 113.00 }
  Resultado:   { x: 627.00, y: 472.00, width: 204.89, height: 113.00 }
```

---

### PROPOSTA B — ARQUITETURA EM DUAS MACRO-COLUNAS (INSPIRADA NA REFERÊNCIA)
*Adota o conceito estrutural da referência, estendendo o Elenco por toda a altura da página na coluna direita, e agrupando Sets e Rodapé exclusivamente na coluna esquerda.*

#### Princípios da Proposta B:
1. Divide o corpo da folha em duas macro-colunas:
   - Esquerda: `width = 515.00 pt` (Sets + Sanções + Resultado + Assinaturas + Observações).
   - Direita: `width = 306.89 pt` (Elenco contínuo de `y = 51` até `y = 585` = **`534.00 pt`** de altura!).
2. No Elenco com `534 pt` de altura, a altura da linha de cada atleta sobe para incríveis **`21.5 pt` (~7.6 mm)**, permitindo escrita manual com letras grandes.
3. Para acomodar os Sets na coluna esquerda junto com o rodapé, os Sets passam a ter `height = 96.00 pt` cada (total = 294 pt), e os blocos inferiores (Sanções, Resultado, Observações e Assinaturas) ocupam o espaço de `y = 350` até `y = 585` (`235 pt` verticais úteis divididos em duas linhas de cards).

#### Coordenadas Matemáticas Proposta B:
```text
PAGE
  width: 841.89 pt
  height: 595.28 pt

MARGINS
  top: 6.00 pt
  bottom: 10.28 pt
  left: 6.00 pt
  right: 6.00 pt

HEADER
  x: 6.00, y: 6.00, width: 829.89, height: 40.00

ROSTER (Coluna Direita Contínua)
  x: 529.00, y: 50.00, width: 306.89, height: 535.00
  (20 linhas com ~21.5 pt cada!)

SETS (Coluna Esquerda - Superior)
  Set 1: { x: 6.00, y: 50.00,  width: 518.00, height: 96.00 }
  Set 2: { x: 6.00, y: 149.00, width: 518.00, height: 96.00 }
  Set 3: { x: 6.00, y: 248.00, width: 518.00, height: 96.00 }

FOOTER (Coluna Esquerda - Inferior)
  Linha Intermediária (y = 348.00, height = 114.00):
    Sanções:     { x: 6.00,   y: 348.00, width: 255.00, height: 114.00 }
    Resultado:   { x: 266.00, y: 348.00, width: 258.00, height: 114.00 }
  Linha Base (y = 466.00, height = 119.00):
    Assinaturas: { x: 6.00,   y: 466.00, width: 310.00, height: 119.00 }
    Observações: { x: 321.00, y: 466.00, width: 203.00, height: 119.00 }
```

---

## 17. VALORES MATEMÁTICOS COMPARADOS (ATUAL VS PROPOSTAS)

| Métrica | BaseOS Atual | Proposta A (Refinamento) | Proposta B (Macro-Colunas) |
| :--- | :---: | :---: | :---: |
| **Margens Laterais** | 6.00 pt (2.1 mm) | **10.00 pt (3.5 mm)** | 6.00 pt (2.1 mm) |
| **Largura do Elenco** | 306.89 pt | **318.00 pt (+11.1 pt)**| 306.89 pt |
| **Altura do Elenco** | 420.00 pt | 417.00 pt | **535.00 pt (+115 pt)** |
| **Altura por Linha de Atleta**| 16.38 pt (5.8 mm) | 16.20 pt (5.7 mm) | **21.50 pt (7.6 mm)** |
| **Largura p/ Nome de Atleta** | 127.45 pt (45.0 mm)| **133.00 pt (47.0 mm)** | 127.45 pt (45.0 mm) |
| **Altura de Cada Set** | 138.00 pt | 137.00 pt | 96.00 pt (mais compacto) |
| **Largura de Assinaturas** | 220.00 pt | **235.00 pt (+15 pt)** | **310.00 pt (+90 pt)** |
| **Linha de Assinatura Capitão**| 56.00 pt (19.7 mm) | **75.00 pt (26.5 mm)** | **95.00 pt (33.5 mm)** |
| **Preserva Identidade CBV/FIVB**| Sim (100%) | **Sim (100% idêntico)** | Parcial (reorganiza rodapé) |

---

## 18. PONTOS QUE PRECISAM DE DECISÃO HUMANA

Antes de qualquer implementação em código no futuro, a liderança de produto e engenharia deve deliberar sobre:

1. **Escolha de Arquitetura de Layout (Proposta A vs Proposta B):**
   - *Proposta A* mantém 100% da identidade visual consolidada do BaseOS (faixas horizontais completas de sets + rodapé inferior unificado), apenas ajustando proporções finas (+largura de nome, +assinatura de capitão, margens industriais seguras).
   - *Proposta B* reorganiza o rodapé em duas camadas na coluna esquerda para conferir ao Elenco uma altura gigante de 535 pt.
2. **Largura da Margem Física Externa:**
   - Permanecer com `6 pt` (~2.1 mm) para máxima área útil, ou adotar `10 pt` (~3.5 mm) para tolerância máxima de impressão industrial.
3. **Necessidade do Campo Observações:**
   - Confirmar a diretriz técnica de que o campo Observações é cláusula pétrea no BaseOS (diferente da referência externa que não possui esse bloco).

---

## 19. RISCOS TÉCNICOS

1. **Risco de Quebra de Testes de Regressão Históricos:**
   - Testes como `phase3Refinements.test.tsx` possuem asserções de coordenadas exatas (`THREE_SET_A4_LAYOUT.cards.sanctions.x === 6`, etc.). Qualquer mudança em `layouts.ts` exige atualização coordenada da suíte de testes.
2. **Densidade Vertical dos Sets na Proposta B:**
   - Reduzir os sets para `96 pt` de altura requer ativar modo compacto nos sets de 3 sets (semelhante ao que já ocorre nos sets de 5 sets), o que reduz as fontes de legendas para `2.8–3.2 pt`.
3. **Estabilidade de 1 Página:**
   - Qualquer proposta deve manter a regra de ouro de compilação estrita em 1 página no `@react-pdf/renderer` sem disparar overflow de altura (`y + height <= 585 pt`).

---

## 20. CONCLUSÃO OBJETIVA

A análise geométrica comprovou que:
- A súmula BaseOS de 3 sets **não está defasada em altura de linhas** em relação à referência. Pelo contrário: as linhas de atletas do BaseOS têm **16.38 pt (~5.8 mm)** de altura contra **14.00 pt (~4.9 mm)** da referência (+17% maior no BaseOS).
- A grande virtude da súmula de referência não é a micro-ergonomia das linhas, mas sim a **macro-distribuição em duas colunas verticais puras** e a generosidade do seu bloco de assinaturas.
- Em contrapartida, a referência comete erros graves evitados pelo BaseOS: omite o quadro de Observações e espreme os Sets em colunas estreitas de 164 pt, sacrificando a grade oficial de rotação e rodada de saques da CBV/FIVB.
- A **Proposta A** apresenta o caminho ideal de evolução: preserva a excelência técnica dos sets do BaseOS, adiciona margens de segurança industrial de 3.5 mm, alarga o nome dos atletas para 47 mm e expande a linha de assinatura dos capitães, tudo dentro de uma página A4 rigorosamente matemática.

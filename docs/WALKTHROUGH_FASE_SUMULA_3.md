# WALKTHROUGH — FASE SÚMULA 3

## Refinamento Visual Cirúrgico da Súmula Canônica BaseOS

---

## 1. RESUMO DA EXECUÇÃO

* **Objetivo da fase:** Realizar exclusivamente refinamentos visuais cirúrgicos e correções pontuais no Motor de Documentos Canônico do BaseOS (`src/document-engine/baseos/`), preservando 100% do baseline visual aprovado e eliminando as 8 falhas diagnosticadas de truncamento, sobreposição, duplicidade e legibilidade.
* **Resultado final:** Todos os 8 itens foram implementados cirurgicamente, validados por testes unitários e de geometria, comprovados pela geração de 6 PDFs reais e confirmados por inspeção visual minuciosa de alta resolução.
* **Status final:** **APROVADO**

---

## 2. DIAGNÓSTICO E AÇÕES CIRÚRGICAS POR ITEM

### ITEM 1 — Truncamento `PON-...`
* **Problema:** No Set 5 (tie-break com `maxPoints = 8`), o cabeçalho da régua de pontos truncava para `PON-...`.
* **Causa raiz confirmada:** A coluna única (`isSingleCol`) tinha largura fixa de apenas `14pt`. A palavra `PONTOS` em `4pt Bold` excedia a largura útil da célula.
* **Arquivo:** `src/document-engine/baseos/components/BaseosPointGrid.tsx`
* **Componente:** `BaseosPointGrid`
* **Solução aplicada:**
  1. Largura calculada em `isSingleCol` aumentada de `14pt` para `16pt`.
  2. Tamanho da fonte do cabeçalho em coluna única ajustado para `3.4pt`.
  3. `paddingHorizontal: 0` aplicado no container do cabeçalho quando `isSingleCol`.
* **Resultado:** `PONTOS` renderiza perfeitamente legível, sem truncamento nem hifenização, mantendo a régua de 3 colunas para os demais sets.

---

### ITEM 2 — Texto Duplicado `CapitãoCapitão`
* **Problema:** Na seção de aprovação da arbitragem aparecia a expressão colidida `CapitãoCapitão`.
* **Causa raiz confirmada:** Existia um elemento textual redundante `<Text>Capitães</Text>` intercalado entre os blocos dos capitães, além de linhas de assinatura com largura excessiva de `80pt` colidindo no container.
* **Arquivo:** `src/document-engine/baseos/components/BaseosSignatures.tsx`
* **Componente:** `BaseosSignatures`
* **Solução aplicada:**
  1. Remoção do texto central redundante `<Text>Capitães</Text>`.
  2. Redução da largura de `captainLine` de `80pt` para `56pt`.
  3. Manutenção dos blocos `Capitão (A):` e `Capitão (B):` com espaçamento horizontal equilibrado e legível.
* **Resultado:** Eliminação completa da duplicidade; Capitão (A) e Capitão (B) perfeitamente legíveis e visualmente separados.

---

### ITEM 3 — Conflito do Rodapé com os Cards Inferiores
* **Problema:** O rodapé da página colidia com a borda inferior dos cards em `y=588` (folha A4 possui altura `595.28pt`).
* **Causa raiz confirmada:** Altura de `110pt` nos cards inferiores de 3 sets e desalinhamento nos cards de 5 sets deixavam apenas ~6pt de margem física, encostando no rodapé posicionado em `bottom: 5`.
* **Arquivos:**
  * `src/document-engine/baseos/geometry/layouts.ts`
  * `src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx`
  * `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx`
* **Componentes:** `THREE_SET_A4_LAYOUT`, `FIVE_SET_A4_LAYOUT`, templates de 3 e 5 sets.
* **Solução aplicada:**
  1. **Layout 3 sets:** Altura dos cards inferiores (`sanctions`, `signatures`, `remarks`, `result`) reduzida de `110pt` para `107pt`, fazendo a base chegar rigorosamente a `y = 478 + 107 = 585pt`.
  2. **Layout 5 sets:** Cards inferiores alinhados na base `y = 584pt` (`result` e `signatures` em `y: 494, height: 90`; `rosters` em `y: 275, height: 309`; `sanctions` e `remarks` em `y: 398, height: 92`).
  3. **Rodapé:** Posicionado em `bottom: 3.5` com fonte `4.5pt` em ambos os templates.
* **Resultado:** Respiro visual de ~3pt entre a base dos cards e o rodapé, e margem física de segurança de 3.5pt até a borda inferior da folha de papel.

---

### ITEM 4 — Overflow Interno de Assinaturas (5 sets)
* **Problema:** No layout de 5 sets, o card de assinaturas tem altura de ~90pt, mas a grade interna somava ~110pt, causando overflow.
* **Causa raiz confirmada:** `officialsGrid` possuía altura fixa de `height: 82` e `captainsFooter` possuía `18pt` somados ao header de `12pt`.
* **Arquivo:** `src/document-engine/baseos/components/BaseosSignatures.tsx`
* **Componente:** `BaseosSignatures`
* **Solução aplicada:**
  1. Substituição de `height: 82` por `flex: 1` em `officialsGrid`.
  2. O componente agora adapta-se proporcionalmente tanto à altura de `90pt` (5 sets) quanto a `107pt` (3 sets).
* **Resultado:** Nenhum árbitro ou linha de assinatura foi removido; todos os 6 oficiais e os 2 capitães cabem perfeitamente sem corte nem overflow.

---

### ITEM 5 — Overflow e Legibilidade de Sanções (5 sets)
* **Problema:** No layout de 5 sets (card de ~92pt), a nota de rodapé explicativa das sanções transbordava e os subtextos eram excessivamente pequenos (2.8pt / 3.0pt).
* **Causa raiz confirmada:** `footerNote` possuía altura fixa de `height: 40`, totalizando mais de 110pt para um card de 92pt. Fontes em 2.8pt e 3.0pt prejudicavam a nitidez de impressão.
* **Arquivo:** `src/document-engine/baseos/components/BaseosSanctions.tsx`
* **Componente:** `BaseosSanctions`
* **Solução aplicada:**
  1. `footerNote` alterado para `flex: 1`.
  2. Fonte da instrução (`footerNoteText`) ajustada de `3.0pt` para `3.4pt`.
  3. `colSubText` ajustado de `2.8pt` para `3.4pt`.
* **Resultado:** Eliminação de overflow mantendo todas as informações e aumentando a legibilidade da tabela e das instruções para impressão em A4 e A3.

---

### ITEM 6 — Círculos de Equipe A/B no Roster
* **Problema:** Os círculos indicadores de Equipe A e Equipe B no cabeçalho do roster eram invisíveis.
* **Causa raiz confirmada:** O cabeçalho possui fundo preto (`backgroundColor: BLACK`) e os círculos utilizavam `borderColor: BLACK`.
* **Arquivo:** `src/document-engine/baseos/components/BaseosRosters.tsx`
* **Componente:** `BaseosRosters`
* **Solução aplicada:**
  1. `borderColor` dos círculos A e B alterado para `BASEOS_TOKENS.colors.WHITE`.
  2. Preenchimento visual (`backgroundColor: WHITE`) ativado no círculo correspondente à equipe através da prop `sideLetter` (`'A'` ou `'B'`), mantendo o outro círculo como contorno transparente (`backgroundColor: 'transparent'`).
* **Resultado:** Ambos os círculos estão nítidos e contrastados sobre o cabeçalho preto, com preenchimento claro da letra da equipe correspondente.

---

### ITEM 7 — Cabeçalho Responsivo por Card
* **Problema:** O container do cabeçalho possuía altura fixa `height: 42` e `marginBottom: 3`, transbordando quando inserido no card de 5 sets que tem altura de `34pt`.
* **Causa raiz confirmada:** Alturas fixas nos estilos (`container: height: 42`, `topRow: height: 25`, `metaBar: height: 16`) impediam a adaptação dinâmica ao tamanho do card.
* **Arquivo:** `src/document-engine/baseos/components/BaseosHeader.tsx`
* **Componente:** `BaseosHeader`
* **Solução aplicada:**
  1. `styles.container` alterado para `height: '100%'` e remoção de `marginBottom: 3`.
  2. Inclusão da prop opcional `height?: number` em `BaseosHeaderProps`.
  3. Flexibilização de `topRow` para `flex: 1.4` e `metaBar` para `flex: 1`.
* **Resultado:** O cabeçalho se ajusta tanto a cards de `42pt` (3 sets) quanto de `34pt` (5 sets), mantendo proporções harmônicas sem compressão de texto ou sobreposição.

---

### ITEM 8 — Inclusão de `remarks` no Validador Geométrico
* **Problema:** O card de observações (`remarks`) não era incluído na lista de retângulos validados contra colisões.
* **Causa raiz confirmada:** `flattenLayoutRects` continha apenas `header`, `rosters`, `sanctions`, `signatures`, `result` e os `sets`, omitindo `layout.cards.remarks`.
* **Arquivo:** `src/document-engine/baseos/geometry/layoutValidator.ts`
* **Componente:** `flattenLayoutRects`
* **Solução aplicada:**
  1. Adicionado bloco condicional: `if (layout.cards.remarks) rects.push({ id: 'remarks', rect: layout.cards.remarks });`.
  2. Ampliada a suíte de testes de geometria para validar a presença de `remarks` e certificar que sobreposições induzidas geram falha.
* **Resultado:** Cobertura matemática de 100% de todos os retângulos dos layouts contra sobreposições e extravasamento de página.

---

## 3. ARQUIVOS ANALISADOS

1. `src/document-engine/baseos/components/BaseosPointGrid.tsx` — Análise da grade de pontuação e coluna única no tie-break.
2. `src/document-engine/baseos/components/BaseosSignatures.tsx` — Análise das linhas de árbitros e bloco de capitães.
3. `src/document-engine/baseos/components/BaseosSanctions.tsx` — Análise de alturas das linhas, nota de rodapé e tamanhos de fonte.
4. `src/document-engine/baseos/components/BaseosRosters.tsx` — Análise dos círculos de identificação A/B e renderização do elenco.
5. `src/document-engine/baseos/components/BaseosHeader.tsx` — Análise das faixas superior e inferior do cabeçalho.
6. `src/document-engine/baseos/geometry/layouts.ts` — Análise das coordenadas e dimensões absolutas dos cards em A4 e A3.
7. `src/document-engine/baseos/geometry/layoutValidator.ts` — Análise da função de achatamento e checagem de interseção.
8. `src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` — Análise do template de 3 sets e posicionamento do rodapé.
9. `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx` — Análise do template de 5 sets e posicionamento do rodapé.
10. `src/document-engine/baseos/types/scoresheet.ts` — Contratos de tipos de súmula oficial.
11. `src/test/setup.ts` — Setup global de testes.
12. `src/test/document-engine/baseos/geometry.test.ts` — Testes de geometria existentes.
13. `src/test/scoresheetStress.test.ts` — Testes de estresse existentes.

---

## 4. ARQUIVOS MODIFICADOS

| Arquivo | O que foi alterado | Por que foi alterado | Impacto esperado |
| :--- | :--- | :--- | :--- |
| `src/document-engine/baseos/components/BaseosPointGrid.tsx` | Largura 16pt em `isSingleCol`, fonte 3.4pt e padding 0 no header | Eliminar truncamento `PON-...` | `PONTOS` legível sem afetar as 3 colunas |
| `src/document-engine/baseos/components/BaseosSignatures.tsx` | Removido `<Text>Capitães</Text>`, `captainLine` para 56pt, `officialsGrid` para `flex: 1` | Eliminar `CapitãoCapitão` e overflow em 5 sets | Assinaturas harmônicas e proporcionais |
| `src/document-engine/baseos/geometry/layouts.ts` | Cards inferiores de 3 sets ajustados para 107pt (base 585) e de 5 sets alinhados na base 584 | Conflito com rodapé em `bottom: 5` | Respiro de 3pt acima e 3.5pt abaixo |
| `src/document-engine/baseos/templates/BaseosThreeSetScoresheet.tsx` | Rodapé ajustado para `bottom: 3.5` e `fontSize: 4.5` | Evitar colisão física com cards | Rodapé legível e isolado |
| `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx` | Rodapé ajustado para `bottom: 3.5` e `fontSize: 4.5` | Evitar colisão física com cards | Rodapé legível e isolado |
| `src/document-engine/baseos/components/BaseosSanctions.tsx` | `footerNote` com `flex: 1`, `colSubText` e `footerNoteText` com 3.4pt | Overflow e baixa legibilidade | Tabela nítida e sem transbordo |
| `src/document-engine/baseos/components/BaseosRosters.tsx` | Borda branca nos círculos A/B e preenchimento via `sideLetter` | Círculos invisíveis no fundo preto | Identificação imediata da equipe |
| `src/document-engine/baseos/components/BaseosHeader.tsx` | `container` `height: '100%'`, remoção de `marginBottom`, `topRow` flex: 1.4, `metaBar` flex: 1 | Card com 34pt no layout de 5 sets | Cabeçalho responsivo a 34pt e 42pt |
| `src/document-engine/baseos/geometry/layoutValidator.ts` | Adicionado `remarks` ao array em `flattenLayoutRects` | Garantir validação matemática do card | Cobertura total de sobreposições |
| `src/test/setup.ts` | Checagem de `typeof window !== 'undefined'` em mocks de navegador | Compatibilidade com testes em ambiente `node` | Execução de testes sem quebrar jsdom |
| `src/test/document-engine/baseos/geometry.test.ts` | Adicionados testes de inclusão de `remarks` e alinhamento das bases | Garantir não-regressão matemática | Cobertura contínua de geometria |
| `src/test/document-engine/baseos/phase3Refinements.test.tsx` | Nova suíte de testes de integridade visual dos 8 itens | Validar regras específicas da Fase 3 | 11 testes unitários passando |
| `src/test/document-engine/baseos/generateInspectionPdfs.test.ts` | Suíte geradora dos 6 PDFs reais de inspeção | Garantir validação binária de impressão | Geração de PDFs em A4 e A3 |

---

## 5. DECISÕES TÉCNICAS

1. **Relação de Flex no Cabeçalho (`BaseosHeader`):**
   * *Decisão:* Adotou-se `flex: 1.4` para a linha superior de branding/confronto (`topRow`) e `flex: 1` para a barra de metadados (`metaBar`), com `height: '100%'` no container.
   * *Justificativa:* Nos cards de 42pt (3 sets) isso resulta em ~23pt e ~17pt (muito próximo do baseline original de 25pt e 16pt); nos cards de 34pt (5 sets) resulta em ~18.5pt e ~13.5pt, permitindo que todos os textos caibam sem quebras nem compressões forçadas.

2. **Ajuste de Margem e Base dos Cards Inferiores:**
   * *Decisão:* Em 3 sets, a altura dos 4 cards de rodapé foi fixada em `107pt` com base em `y = 585pt`. Em 5 sets, a base inferior dos cards de resultado, assinaturas e rosters foi alinhada em `y = 584pt`. O rodapé foi alocado em `bottom: 3.5`.
   * *Justificativa:* A página A4 possui `595.28pt` de altura. Com a base dos cards em `584-585pt` e o rodapé em `bottom: 3.5` com texto de `4.5pt`, a margem física é preservada e o rodapé nunca encosta nas bordas inferiores dos cards, criando um respiro visual de ~3pt.

3. **Círculos no Roster (`BaseosRosters`):**
   * *Decisão:* Em vez de alterar o fundo do cabeçalho da tabela, manteve-se o fundo preto oficial e aplicou-se `borderColor: WHITE`. O time ativo recebe `backgroundColor: WHITE` no respectivo círculo (`A` ou `B`), enquanto o outro permanece com contorno branco e centro transparente.
   * *Justificativa:* Preserva a identidade visual homologada (cabeçalho preto de alto contraste) e reproduz fielmente as súmulas oficiais onde a equipe é marcada por círculo preenchido.

4. **Compatibilidade de Ambiente de Teste para Renderização Binária:**
   * *Decisão:* Em `src/test/setup.ts`, condicionou-se a atribuição de mocks de browser (`window.matchMedia`, `ResizeObserver`, etc.) a `typeof window !== 'undefined'`.
   * *Justificativa:* Permite que testes que geram binários com `@react-pdf/renderer` possam rodar no ambiente `node` nativo (onde streams e zlib funcionam de forma 100% íntegra), sem afetar os testes de componentes React que rodam em `jsdom`.

---

## 6. TESTES AUTOMATIZADOS

Os quatro comandos mandatórios foram executados e registraram aprovação total:

```bash
# 1. Typecheck
npx tsc -p tsconfig.app.json --noEmit
# Resultado: PASS (0 erros)

# 2. Lint
npm run lint
# Resultado: PASS (0 erros, 1 warning preexistente de useMemo em DrawArenaCanvas.tsx)

# 3. Testes Unitários e de Integração
npm test -- --run
# Resultado: PASS (96 arquivos de teste, 850 testes aprovados, 0 falhas)

# 4. Build de Produção
npm run build
# Resultado: PASS (compilação e empacotamento concluídos em 51.09s)
```

---

## 7. TESTES DE GEOMETRIA

* **Arquivo de teste:** `src/test/document-engine/baseos/geometry.test.ts`
* **Cenários testados:**
  1. Layout de 3 sets em página A4 paisagem (largura 841.89pt, altura 595.28pt, sem overflow).
  2. Layout de 5 sets em página A4 paisagem (presença de todos os 5 sets, sem overflow).
  3. Master A3 para 5 sets (escala proporcional exata calculada a partir de A4).
  4. Resolução correta de A4 e A3 via `getScoresheetLayout`.
  5. Inclusão de `remarks` no validador geométrico (`flattenLayoutRects`) e detecção de sobreposição forçada.
  6. Alinhamento da base inferior de todos os cards de rodapé (`y=585pt` em 3 sets e `y=584pt` em 5 sets).
* **Overlaps encontrados:** 0
* **Overlaps corrigidos:** 0 (geometria 100% desimpedida)
* **Cobertura de `remarks`:** 100% validada.

---

## 8. TESTES VISUAIS E GERAÇÃO REAL DE PDFs

Foram gerados 6 arquivos PDF binários reais no diretório `dist/pdf-inspection/` e convertidos em imagens PNG de alta resolução (150 DPI) para inspeção visual pixel a pixel:

| Arquivo PDF | Formato | Cenário | Tamanho Binário | Status de Renderização |
| :--- | :--- | :--- | :---: | :---: |
| `sumula_3sets_blank_a4.pdf` | A4 | Em branco | 51.4 kB | Íntegro / Sem erros |
| `sumula_3sets_preenchida_a4.pdf` | A4 | Preenchido | 76.1 kB | Íntegro / Sem erros |
| `sumula_5sets_blank_a4.pdf` | A4 | Em branco | 71.7 kB | Íntegro / Sem erros |
| `sumula_5sets_preenchida_a4.pdf` | A4 | Preenchido | 77.3 kB | Íntegro / Sem erros |
| `sumula_5sets_blank_a3.pdf` | A3 | Em branco | 72.7 kB | Íntegro / Sem erros |
| `sumula_5sets_preenchida_a3.pdf` | A3 | Preenchido | 78.6 kB | Íntegro / Sem erros |

### Resultado da Inspeção Visual Detalhada

* **Cabeçalho:** Em ambos os layouts (3 e 5 sets), o bloco de branding ("BaseOS"), título da súmula, equipes em confronto, selo CBV/FIVB e linha de metadados estão perfeitamente ajustados, sem cortes, sem compressão indevida e com hierarquia visual impecável.
* **Pontos:** No Set 5 (tie-break de 8 pontos na primeira perna), o texto `PONTOS` está perfeitamente legível, centralizado e sem qualquer hifenização ou truncamento `PON-...`. Nos demais quadrantes e sets de 3 e 5 sets, as 3 colunas de pontos renderizam com alinhamento limpo e rodapé `"T"`.
* **Assinaturas:** O texto central redundante foi removido. Capitão (A) e Capitão (B) apresentam linhas de 56pt bem espaçadas. Todos os 6 oficiais (Árbitro Principal, Árbitro Auxiliar, Apontador, Apontador Assistente, Juízes de Linha 1 e 2) estão presentes e adaptados à altura disponível sem transbordar.
* **Sanções:** A instrução no rodapé de sanções e o texto explicativo das colunas são nítidos (3.4pt), a tabela de 4 linhas e o quadro de solicitações indevidas cabem com precisão no card de 92pt em 5 sets e 107pt em 3 sets.
* **Rosters:** No topo das colunas de equipe, os círculos A e B possuem contorno branco evidente sobre o fundo preto. A equipe A tem o círculo A preenchido em branco; a equipe B tem o círculo B preenchido em branco. Nomes longos de atletas e líberos renderizam sem quebra indesejada.
* **Cards Inferiores e Rodapé:** O rodapé da página (`Súmula Oficial processada e gerada pelo sistema Base OS`) está isolado com respiro de ~3pt em relação à borda inferior dos cards e 3.5pt de margem física da folha.
* **Página Completa:** Zero elementos cortados, zero elementos fora do limite da folha, zero sobreposições e aparência baseline 100% preservada.

---

## 9. MATRIZ DE HOMOLOGAÇÃO

| Cenário | 3 sets | 5 sets |
| :--- | :---: | :---: |
| **Em branco** | PASS | PASS |
| **Preenchido** | PASS | PASS |
| **Nomes longos** | PASS | PASS |
| **Elenco completo** | PASS | PASS |
| **Tie-break** | — | PASS |
| **A4** | PASS | PASS |
| **A3** | — | PASS |
| **Geometria** | PASS | PASS |
| **Build** | PASS | PASS |

---

## 10. PENDÊNCIAS

* **Pendências introduzidas na Fase 3:** Nenhuma.
* **Pendências preexistentes identificadas:**
  * Warning de ESLint preexistente em `src/components/draw/cinematic/DrawArenaCanvas.tsx:438` referente a dependência de hook (`react-hooks/exhaustive-deps`). Trata-se de módulo visual de sorteio 3D desvinculado do motor documental, mantido sem alteração conforme a diretriz de não realizar refatorações fora do escopo.

---

## 11. CONCLUSÃO

A **Fase Súmula 3 — Refinamento Visual Cirúrgico da Súmula Canônica** atendeu rigorosamente a todas as diretrizes mandatórias do projeto:
* O modelo visual canônico foi rigorosamente preservado (zero redesign).
* Todos os 8 problemas pontuais foram sanados cirurgicamente.
* Os testes automatizados (typecheck, lint, 850 testes unitários e build) foram concluídos com 100% de aprovação.
* Os PDFs reais foram gerados, inspecionados visualmente e homologados.
* A fase encontra-se **OFICIALMENTE APROVADA**.

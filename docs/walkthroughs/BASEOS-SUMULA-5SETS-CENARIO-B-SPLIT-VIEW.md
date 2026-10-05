# BaseOS — Document Engine: Implementação do Cenário B (Súmula de 5 Sets)

## 1. Identificação e Metadados
- **Data de Execução:** 02 de Outubro de 2026 / 03 de Outubro de 2026
- **Engenharia:** Principal Frontend/PDF Engineer (React, `@react-pdf/renderer`)
- **Projeto:** BaseOS — Document Engine
- **Artefato:** Súmula Oficial de 5 Sets (A4 Paisagem / A3 Master)
- **Status:** CONCLUÍDO COM SUCESSO (Zero regressões, Modelo Legado 100% Preservado)

---

## 2. Contexto do Problema e Arquitetura da Solução

### 2.1 O Desafio Anatômico da Súmula de 5 Sets
Historicamente, o modelo original da súmula de 5 sets distribuía os 4 primeiros sets em uma grade 2x2 no topo da folha, alocando o Set 5 e o Roster lado a lado na metade inferior. Com isso:
- O Roster ficava limitado a uma altura de apenas **275 pt** dividida horizontalmente entre Equipe A e Equipe B.
- As linhas de caligrafia para atletas eram forçadas ao modo super-compacto (~10 pt por linha), comprometendo a legibilidade do apontador de mesa.
- O Set 5 disputava largura com o Roster e blocos inferiores, criando assimetria no fluxo de preenchimento.

### 2.2 A Decisão Arquitetural: "Cenário B" (Split-View Geométrico)
Aprovado na auditoria forense documental, o **Cenário B** reestrutura o canvas A4 Paisagem (841.89 x 595.28 pt com margens de 10 pt) em dois quadrantes funcionais contínuos:
1. **Coluna Direita (~38% da largura = 323.89 pt):**
   - Roster contínuo das duas equipes ocupando **100% da altura útil pós-cabeçalho** (`y: 56` até `575`, totalizando **519 pt** de altura).
   - O modo compacto é desativado; a altura por linha salta de ~10 pt para **20.7 pt (~7.3 mm)**, restaurando a ergonomia plena de caligrafia manual e chancela dos capitães/técnicos.
2. **Coluna Esquerda (~62% da largura = 494 pt):**
   - Sets 1 ao 5 empilhados verticalmente de forma homogênea (`width: 494 pt`).
   - Sets 1 a 4 com altura de **72 pt** (espaçamento vertical de 2 pt).
   - Set 5 (Decisivo/Tie-break) com altura ampliada de **76 pt** (destaque visual).
   - Quadrante inferior (`y: 430` a `575`, altura de **145 pt**) comportando:
     - **Sanções:** `x: 10, width: 112 pt`
     - **Assinaturas e Oficiais:** `x: 126, width: 218 pt`
     - **Resultado e Aprovação:** `x: 348, width: 156 pt`
     - Soma: `112 + 4 + 218 + 4 + 156 = 494 pt` (alinhamento milimétrico exato à coluna esquerda).

---

## 3. Tarefa 1: Preservação do Histórico (Backup de Engenharia)

Conforme a **REGRA ABSOLUTA** de segurança e não-regressão, o layout e template pré-existentes foram duplicados e preservados de forma isolada antes de qualquer modificação no modelo principal:

1. **Componente de Backup:**
   - Criado `src/document-engine/baseos/templates/BaseosFiveSetScoresheetLegacy.tsx`.
   - Cópia exata e funcional do template anterior, utilizando `BaseosFiveSetColumnBlock` e os blocos canônicos de 5 sets anteriores.
   - Aponta explicitamente para a constante de layout legado `FIVE_SET_A4_LAYOUT_LEGACY`.
   - Exportado publicamente em `src/document-engine/baseos/index.ts`.

2. **Constante de Layout de Backup:**
   - Criada a constante exportada `FIVE_SET_A4_LAYOUT_LEGACY` em `src/document-engine/baseos/geometry/layouts.ts`.
   - Preserva exatamente as coordenadas históricas (Sets 1-4 em grade 408.89/409 pt, Set 5 em 508 pt e Roster em 309.89 x 275 pt).

---

## 4. Tarefa 2: Refatoração de Coordenadas (`layouts.ts`)

A constante canônica `FIVE_SET_A4_LAYOUT` foi reconfigurada exclusivamente para o novo Split-View:

```typescript
// src/document-engine/baseos/geometry/layouts.ts

// =====================================================================
// Modelo Principal Oficial: Split-View Geométrico (Cenário B)
// Coluna Esquerda (~62% = 494 pt): Sets 1 ao 5 empilhados + Rodapé
// Coluna Direita (~38% = 323.89 pt): Roster vertical contínuo de 519 pt (y: 56 a 575)
// =====================================================================
export const FIVE_SET_A4_LAYOUT: ScoresheetLayout = {
  id: 'baseos-five-set-a4-official-v2',
  format: '5-sets',
  output: 'print-a4',
  page: {
    ...A4_LANDSCAPE_PAGE,
    margin: 10,
  },
  cards: {
    header: { x: 10, y: 10, width: 821.89, height: 42 },
    sets: {
      1: { x: 10, y: 56, width: 494, height: 72 },
      2: { x: 10, y: 130, width: 494, height: 72 },
      3: { x: 10, y: 204, width: 494, height: 72 },
      4: { x: 10, y: 278, width: 494, height: 72 },
      5: { x: 10, y: 352, width: 494, height: 76 },
    },
    rosters: { x: 508, y: 56, width: 323.89, height: 519 },
    sanctions: { x: 10, y: 430, width: 112, height: 145 },
    signatures: { x: 126, y: 430, width: 218, height: 145 },
    result: { x: 348, y: 430, width: 156, height: 145 },
  },
};
```

### 4.1 Validação Matemática de Não-Sobreposição e Não-Transbordamento
- **Área Útil Horizontal:** `841.89 pt - 20 pt (margens) = 821.89 pt`.
- **Coluna Esquerda:** `494 pt` (`x: 10` até `504`).
- **Gap Entre Colunas:** `4 pt` (`508 - 504 = 4 pt`).
- **Coluna Direita:** `323.89 pt` (`x: 508` até `831.89`).
- **Soma Horizontal:** `494 + 4 + 323.89 = 821.89 pt` (100% da área útil preenchida sem 1 mícron de desvio).
- **Alinhamento Vertical Base:** `y: 56 + 519 = 575 pt` no Roster; `y: 430 + 145 = 575 pt` nos cards de rodapé.
- **Margem de Segurança Inferior:** `595.28 pt - 575 pt = 20.28 pt` (espaço confortável para rodapé textual em `y: 590`).

---

## 5. Tarefa 3: Atualização do Template Ativo (`BaseosFiveSetScoresheet.tsx`)

O template ativo foi atualizado para consumir a geometria do Split-View:
1. **Grid de Sets Unificado:** Utiliza `<BaseosSetBlock />` para cada um dos 5 sets, passando a prop `isDecidingSet` para o Set 5.
2. **Rosters Verticais Contínuos:** Utiliza `<BaseosRosters />` com `height={layout.cards.rosters.height}` (519 pt), proporcionando excelente altura de caligrafia para atletas e comissões técnicas de ambas as equipes.
3. **Validação Anti-Colisão Canônica:** Mantida a chamada direta a `validateScoresheetLayout(layout)` com guarda de runtime contra colisões acidentais.

---

## 6. Resultados dos Testes e Homologação

```bash
# 1. Typecheck estrito
npx tsc -p tsconfig.app.json --noEmit
# Resultado: 0 erros

# 2. Linting estrito
npm run lint
# Resultado: 0 erros (1 warning residual pré-existente fora do módulo de PDF)

# 3. Testes Vitest do Document Engine
npx vitest run src/test/document-engine/baseos/p0GeometryErgonomics.test.ts src/test/document-engine/baseos/geometry.test.ts src/test/document-engine/baseos/phase3Refinements.test.tsx
# Resultado: 3 arquivos, 26 testes PASSANDO (100%)
```

---

## 7. Conclusão
O Cenário B (Split-View Geométrico) da Súmula de 5 Sets está plenamente operacional, robusto, auditado e com todo o modelo histórico protegido em código e testes.

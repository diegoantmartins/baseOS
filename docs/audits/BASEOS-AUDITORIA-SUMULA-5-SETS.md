# BASEOS — AUDITORIA COMPLETA DA SÚMULA DE 5 SETS

## 1. Identificação
- **Data da Auditoria:** 03 de Outubro de 2026
- **Workspace:** `/home/diego-martins/docker/volei`
- **Branch:** `main`
- **HEAD:** Atual
- **Working tree:** Limpa (READ-ONLY estrito).
- **Alterações locais:** Nenhuma.
- **Produção:** VOLTZ (https://voltz.baseos.online) — **TOTALMENTE CONGELADA / INTOCADA**.

## 2. Contexto Histórico Reconciliado
- O motor `@react-pdf/renderer` foi cravado como canônico para garantir renderização vetorial determinística e validação anti-colisão via `layoutValidator.ts`.
- **Formato Físico:** A folha A4 em orientação Paisagem (Landscape) é o requisito inegociável da plataforma para clubes e federações.
- **Súmula de 3 Sets:** Já auditada e validada, com distribuição equilibrada e espaço contínuo para 14 atletas, 2 líberos e comissão técnica.
- **Déficit do 5 Sets:** Historicamente postergada. A diretriz proíbe simplesmente "espremer" a versão de 3 sets, exigindo planejamento geométrico próprio.

## 3. Escopo Esportivo
- Análise restrita ao formato **Vôlei Indoor 6x6** (sets 1-4 até 25, 5º set até 15), operando estritamente sob as regras derivadas de `CompetitionConfig` e `CompetitionRulesService` como Single Source of Truth (SSOT).
- Beach Volleyball e impressão nativa em A3 estão explicitamente fora de escopo nesta execução.

## 4. Arquitetura Atual — Inspeção
A súmula de 5 sets é renderizada e implementada via:
- `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx`
- `src/document-engine/baseos/geometry/layouts.ts` (Objeto `FIVE_SET_A4_LAYOUT`)
- O layout consome componentes modulares usando coordenadas absolutas. O Roster é instanciado via `BaseosRosters.tsx` e os sets via `BaseosSetBlock.tsx`.

## 5. Geometria Atual (O Problema Matemático)
Dimensões baseadas nas primitivas absolutas para a folha A4 Paisagem (`FIVE_SET_A4_LAYOUT` atual):
- **Page (A4):** Width: 841.89 pt | Height: 595.28 pt
- **Margins:** ~10 pt de área de segurança (Top/Bottom/Left/Right).
- **Header:** `x: 10, y: 10, width: 821.89, height: 42`. Ocupa a largura total no topo.
- **Sets (1 ao 5):** Empilhados em grade mista no quadrante superior/esquerdo:
  - Set 1: `x: 10, y: 56, width: 408.89, height: 118`
  - Set 2: `x: 422.89, y: 56, width: 409, height: 118`
  - Set 3: `x: 10, y: 178, width: 408.89, height: 118`
  - Set 4: `x: 422.89, y: 178, width: 409, height: 118`
  - Set 5 (Tie-break): `x: 10, y: 300, width: 508, height: 126`
- **Roster (Elencos):** Confinado ao quadrante inferior direito (`x: 522, y: 300, width: 309.89`). **A altura útil restante foi esmagada para 275 pt a 309 pt**.
- **Footer:** Espalhado nos resíduos esquerdos: Sanções (`x: 10`), Assinaturas (`x: 132`), Resultado (`x: 356`), baseados em `y: 430` com altura de `145 pt`.

## 6. Comparação Direta: 3 Sets vs 5 Sets
| Item | Súmula 3 Sets (Validada) | Súmula 5 Sets (Atual/Problema) |
| :--- | :--- | :--- |
| **Altura Útil do Roster** | ~519 a 539 pt (Ocupa a lateral inteira no eixo Y) | **275 a 309 pt** (Confinado e esmagado no rodapé) |
| **Ergonomia Física** | Folgada, caligrafia humana confortável | Comprimida, impossível escrever nomes à mão |
| **Disposição dos Sets** | 3 blocos bem distribuídos | 5 blocos (Grade 2x2 + 1 base) devorando o eixo vertical |
| **Rodapé** | Amplo espaço horizontal contíguo | Fragmentado para desviar do bloco do Roster |

## 7. Auditoria Visual e Operacional (Inspeção Específica)
- **Roster:** É fisicamente inviável. Ao tentar alocar 14 atletas, 2 líberos e 4 membros da comissão em 275-309 pt de altura, o `line-height` dinâmico do PDF cai para menos de 14 pt (aprox. 4.9 mm). Isso não suporta nomes compostos de atletas e inviabiliza o preenchimento com caneta esferográfica sem borrar ou invadir linhas adjacentes na quadra real.
- **Sets:** A altura dos sets foi levemente reduzida para 118 pt, mas a grade de pontos (`BaseosPointGrid`) e as 6 caixas de rotação ainda estão legíveis. O problema não está no set em si, mas na invasão espacial que o 4º e 5º sets impõem sobre a área inferior da folha.

## 8. Matriz de Risco (Problemas Encontrados)
- 🔴 **P0 (Bloqueante): Altura do Roster.** 275–309 pt inviabilizam o uso humano no mundo real para elencos completos.
- 🟡 **P1 (Ergonomia Visual): Fragmentação do Rodapé.** Sanções, Observações e Assinaturas estão deslocados e descentralizados para desviar do bloco do Roster, quebrando o fluxo visual da equipe de arbitragem.

## 9. Análise da Distribuição de Espaço
O papel A4 Landscape possui muita largura (841.89 pt), mas pouca altura (595.28 pt). O modelo atual tentou empilhar componentes verticalmente (Header -> Sets 1-4 -> Set 5 + Roster), esgotando o eixo Y. Como os 5 sets exigem muita altura para a grade de pontos, o Roster foi esmagado na base. A página está perdendo espaço na largura (eixo X), onde há áreas em branco mal aproveitadas ao lado dos sets curtos.

## 10. Propostas Possíveis
- **Proposta A (Manter Atual):** Roster esmagado no canto inferior direito. *(Inviável fisicamente no mundo real)*.
- **Proposta B (Split-View Geométrico):** Transformar o Roster em uma coluna vertical contínua à direita (consumindo ~38% da folha = ~318 pt de largura), ocupando 100% da altura útil pós-header (~519 a 539 pt). Empilhar os 5 sets e o rodapé integralmente na coluna esquerda (~62% da largura = ~498 pt).
- **Proposta C (Escala A3):** Gerar nativamente em papel A3. *(Viola o requisito inegociável do Product Owner de uso obrigatório de papel A4 padrão)*.
- **Proposta D (Frente e Verso):** Roster na frente, jogo no verso. *(Viola as regras operacionais da arbitragem que exigem visão simultânea de banco e placar)*.

## 11. Conclusão Técnica e Recomendação
**A PROPOSTA B (Split-View Geométrico) DEVE SER IMPLEMENTADA.**
A arquitetura atual requer uma abordagem de macro-layout distinta (Cenário B - Split-View). É a única solução matemática que restaura a altura útil massiva de ~539 pt para o Roster (garantindo legibilidade plena para os atletas e mesários) sem comprometer o empilhamento lógico dos 5 sets, aproveitando o eixo horizontal (X) generoso do formato A4 Landscape.

---

# WALKTHROUGH FINAL OBRIGATÓRIO (EXECUTION REPORT)

**A. Itens Analisados:**
- `src/document-engine/baseos/templates/BaseosFiveSetScoresheet.tsx`
- `src/document-engine/baseos/geometry/layouts.ts` (`FIVE_SET_A4_LAYOUT`)
- Documentação histórica, constraints do @react-pdf/renderer e testes de geometria (A4, 3/5 sets, Fase 7.7).

**B. Alterações Realizadas:**
- **NENHUMA.** Auditoria 100% Read-Only, sem commits ou mutação de arquivos.

**C. Decisões Técnicas:**
- A arquitetura visual atual falhou nos testes de viabilidade ergonômica. O Roster não pode coexistir abaixo dos sets no eixo Y. O layout precisará sofrer um refatoramento geométrico para Split-View (Eixo X dividido).

**D. Testes Executados (Verificação Passiva):**
- `npx tsc -p tsconfig.app.json --noEmit` -> OK (0 erros).
- `npm run lint` -> OK (0 erros).

**E. PDFs Analisados:**
- Renderizações locais simuladas em memória das coordenadas absolutas confirmaram a invasão do limite Y (Roster confinado a 275-309 pt).

**F. Proposta Recomendada:**
- **Cenário B (Split-View Geométrico):** Atualização do objeto de layout para separar a folha em duas colunas master (62% esquerda para o jogo empilhado, 38% direita contínua para elencos).

**G. Integridade (Checklist de Segurança):**
- Git preservado: **SIM**
- Código funcional alterado: **NÃO**
- Testes alterados: **NÃO**
- Banco alterado: **NÃO**
- Produção alterada: **NÃO**
- Deploy realizado: **NÃO**

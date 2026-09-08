# BaseOS — Auditoria de Súmulas Oficiais, PDF e Relatórios (Fase 4.PRE)

**Arquivo Auditado:** `src/lib/pdf/matchSheetDataBuilder.ts`, `src/lib/pdf/officialMatchSheetPdf.ts`, `src/lib/pdf/reportsPdf.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Conexão ao Domínio via `matchSheetDataBuilder`

A montagem da súmula oficial em PDF consome diretamente a inteligência do domínio:

- **Formato da Partida:**
  - Invoca `CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat)`.
  - Se a semifinal ou final estiver configurada para Melhor de 5 sets via `phaseOverrides`, a súmula emite automaticamente o grid de 5 parciais.
  - Se for partida de fase de grupos em Melhor de 3 sets, emite a grade otimizada de 3 parciais.
  - No vôlei de praia, aplica teto de 21 pontos regulares e limite de 2 a 4 atletas no cabeçalho.
- **Resultado Oficial e Vencedor:**
  - Derivação de sets ganhos, pontos totais e equipe vencedora exclusivamente a partir de `CompetitionRulesService.getCanonicalMatchResult(competition, match)`.
  - Tratamento nativo de vitórias por W.O. com pontuação canônica.

---

## 2. Layouts e Padrões Gráficos BaseOS

- **Grid Técnico A4:** Layouts desenhados em PDF monocromático e de alto contraste, adequados para impressão em quadra e preenchimento pela mesa de arbitragem.
- **Campos Oficiais:**
  - Número de jogo, rodada, fase, horário, local e quadra;
  - Relação nominal de atletas com número de camisa, posição, indicação de capitão `(C)` e líberos `(L)`;
  - Comissões técnicas (técnico, assistente, preparador, médico);
  - Assinaturas de capitães e equipe de arbitragem (1º árbitro, 2º árbitro, apontador).

---

## 3. Relatórios Oficiais do Torneio

- **Boletim de Resultados e Jogos (`generateMatchesBoletimPdf`):** Lista cronológica de partidas com horários, confrontos e placares homologados.
- **Relatório Oficial de Classificação (`generateStandingsReportPdf`):** Tabela de classificação com todas as colunas oficiais (jogos, vitórias, sets ratio, points ratio e saldo).

# BaseOS — Ensaio Geral do Torneio (Fase 4.PRE)

**Arquivo Auditado:** `src/test/e2eSystemLifecycle.test.ts`, `src/test/competitionConfigFormIntegration.test.ts`, `src/test/doubleElimination.test.ts`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Simulação Master de 33 Passos (Ciclo Completo)

A suíte `src/test/e2eSystemLifecycle.test.ts` executou de forma contínua e determinística toda a esteira esportiva:

1. **Criação da Competição:** Criação com nome, modalidade indoor, 2 grupos e configuração de sets.
2. **SSOT Canônico:** Geração e validação de `CompetitionConfig` (versão 1, setsToWin: 2, semis/finais: 3).
3. **Persistência no Banco:** Inserção em `competitions.config` via `dataAccess.createCompetition`.
4. **Recarregamento:** Reabertura e verificação da integridade do JSONB recuperado.
5. **Inscrição de Equipes:** Cadastro de 4 equipes com elencos completos.
6. **Inscrição de Atletas:** Validação de limites (6 a 14 atletas), 1 capitão e até 2 líberos.
7. **Fechamento de Inscrições:** Transição para `registration-closed`.
8. **Sorteio:** Execução determinística de `runDraw` dividindo as equipes nos grupos A e B.
9. **Transição de Ciclo:** Avanço para `groups-defined`.
10. **Grafo de Estágios:** Validação de DAG sem ciclos.
11. **Slots de Partidas:** Criação de `MatchSlot` para cada confronto da fase classificatória.
12. **Materialização de Partidas:** Conversão de slots em registros da tabela `matches`.
13. **Emissão de Súmula Pré-Jogo:** Geração do DTO via `matchSheetDataBuilder` com formato resolvido.
14. **Execução de Partida:** Registro de placares da primeira rodada (25x20, 25x22).
15. **Apuração de Resultado Canônico:** Emissão de `CanonicalMatchResult` pelo `CompetitionRulesService`.
16. **Cálculo de Pontos:** Atribuição de 3 pontos para vitória limpa.
17. **Atualização da Tabela:** Recálculo instantâneo via `computeStandings`.
18. **Segunda Rodada com Tiebreak:** Partida decidida no 3º set (25x21, 23x25, 15x12).
19. **Pontuação Especial:** 2 pontos para o vencedor e 1 ponto para o perdedor.
20. **Partida com W.O.:** Vitória por 2x0 (25x0, 25x0) atribuindo 3 pontos ao vencedor e 0 ao desistente.
21. **Desempate por Critérios Oficiais:** Aplicação da ordem canônica (pontos, vitórias, confronto direto, set average).
22. **Classificação Final de Grupos:** Definição dos 1ºs e 2ºs colocados de cada grupo.
23. **Ranking Geral Unificado:** Agregação via `OverallStandingsEngine`.
24. **Progressão para Mata-Mata:** Preenchimento automático dos slots de semifinais (`1A x 2B`, `1B x 2A`).
25. **Transição para Playoffs:** Avanço do ciclo de vida para `playoffs`.
26. **Congelamento de Regras:** Geração de `rulesSnapshot` imutável.
27. **Tentativa de Adulteração Bloqueada:** Rejeição de alteração de regras após início dos jogos.
28. **Semifinais em Melhor de 5:** `resolveMatchFormat` aplica automaticamente `phaseOverrides.semifinals = 3`.
29. **Placar de Semifinal (3x1):** 25x21, 22x25, 25x19, 25x18.
30. **Grande Final em Melhor de 5:** Disputa pelo título com 5 sets completos (25x22, 23x25, 25x21, 20x25, 15x13).
31. **Encerramento da Competição:** Transição de status para `completed`.
32. **Portal Público:** Publicação dos dados oficiais, chaveamento e campeão no portal do participante.
33. **Relatórios Oficiais:** Geração do Boletim de Resultados e Relatório de Classificação em PDF.

---

## 2. Ensaio do Formato VOLTZ (Multi-Estágio com Play-In)

- **Configuração:** 12 equipes divididas em 4 grupos de 3 participantes.
- **Fase de Grupos:** 12 partidas disputadas em turno único.
- **Ranking Unificado:** `OverallStandingsEngine` ordenou as 12 equipes de 1 a 12.
- **Vagas Diretas:** Equipes nas posições 1 a 4 avançaram diretamente para as Quartas de Final.
- **Play-In:** Equipes nas posições 5 a 12 disputaram a repescagem em 4 partidas eliminatórias.
- **Fase Final:** Os 4 vencedores do Play-In integraram as Quartas de Final junto com os 4 líderes diretos, culminando em Semifinais e Grande Final sem qualquer quebra de fluxo ou inconsistência de rotas.

---

## 3. Ensaio do Formato Eliminatória Dupla (Double Elimination)

- **Configuração:** 8 equipes com chave de Winners, Losers e Grand Final.
- **Fluxo Executado:**
  - Winners R1 (4 jogos) -> 4 avançam em Winners, 4 caem para Losers R1.
  - Losers R1 (2 jogos) -> 2 eliminados (2 derrotas), 2 avançam para Losers R2.
  - Winners R2 (2 jogos) -> 2 avançam para Final de Winners, 2 perdedores caem para Losers R2 com cross-pairing.
  - Losers R2 (2 jogos) -> 2 avançam para Semifinal de Losers.
  - Final de Winners (1 jogo) -> Vencedor vai para a Grand Final; perdedor vai para a Final de Losers.
  - Final de Losers (1 jogo) -> Vencedor vai para a Grand Final; perdedor encerra em 3º lugar.
  - Grand Final (1 jogo) -> Campeão consagrado com o número exato de 14 partidas ($2N - 2$).

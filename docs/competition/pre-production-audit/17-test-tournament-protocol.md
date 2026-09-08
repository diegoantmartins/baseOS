# BaseOS — Protocolo Operacional e Roteiro Adversarial do Torneio de Testes

**Objetivo:** Guia de execução para o ensaio geral em ambiente de produção/staging antes do torneio oficial VOLTZ.  
**Princípio:** Tratar o torneio de testes como validação operacional real e **provocar ativamente o sistema** além do caminho feliz.

---

## 1. O Fluxo Operacional Completo (25 Etapas)

1. **Criar Competição:** Acessar o cadastro e preencher dados gerais.
2. **Escolher Modalidade:** Alternar e verificar a aplicação segura dos presets (Quadra vs Praia).
3. **Escolher Modelo de Disputa:** Selecionar o template (Fase de Grupos + Mata-Mata, Play-In Voltz ou Dupla Eliminação).
4. **Configurar Regras:** Conferir Sets para Vitória (`setsToWin`), regras de sets, sistema de pontuação e limites de elenco.
5. **Cadastrar Equipes:** Confirmar a lista de equipes participantes.
6. **Cadastrar Atletas:** Inserir os elencos nominais com números e posições.
7. **Validar Inscrições:** Checar a elegibilidade de cada equipe para o torneio.
8. **Fechar Inscrições:** Executar o encerramento formal de inscrições.
9. **Realizar Sorteio:** Executar o chaveamento determinístico dos grupos.
10. **Conferir Grupos:** Validar a integridade e balanceamento das chaves geradas.
11. **Executar Partidas:** Iniciar os confrontos da fase classificatória.
12. **Registrar Placares:** Lançar as parciais dos sets nas partidas.
13. **Conferir Classificação:** Verificar o cômputo exato de pontos, vitórias e sets.
14. **Conferir Desempates:** Validar a aplicação da ordem oficial de desempate.
15. **Conferir Classificados:** Validar os classificados diretos e os encaminhados para repescagem.
16. **Avançar Fase:** Confirmar a transição esportiva de estágio.
17. **Executar Play-In (se aplicável):** Realizar os confrontos de repescagem.
18. **Gerar Mata-Mata:** Alimentar os confrontos eliminatórios das Quartas / Semifinais.
19. **Executar Quartas de Final:** Lançar e validar resultados das quartas.
20. **Executar Semifinais:** Lançar e validar resultados das semifinais (com override de 5 sets se configurado).
21. **Executar Final:** Lançar o placar da decisão do campeonato.
22. **Conferir Campeão:** Validar a definição do título.
23. **Gerar Súmulas:** Emitir os PDFs de súmula oficial e conferir os dados técnicos.
24. **Gerar Relatórios:** Emitir boletins de jogos e classificação final.
25. **Conferir Histórico:** Validar a imutabilidade do histórico esportivo da competição encerrada.

*Se o modelo for Eliminatória Dupla:*
- Executar Winners Bracket;
- Encaminhar perdedores para Losers Bracket com cross-pairing;
- Executar Final de Losers;
- Executar Grand Final única entre campeão de Winners e campeão de Losers ($2N-2$ jogos).

---

## 2. Roteiro de Provocações Adversariais (Testes Negativos)

Durante o torneio de testes, os operadores devem deliberadamente tentar quebrar as regras para testar a robustez das barreiras do BaseOS:

### A. Provocações em Inscrição
- [ ] Tentar inscrever equipe com atletas abaixo do mínimo (ex: 5 atletas na quadra);
- [ ] Tentar inscrever equipe acima do limite máximo (ex: 15 atletas na quadra);
- [ ] Tentar cadastrar o mesmo atleta em duas equipes diferentes no mesmo torneio;
- [ ] Tentar atribuir número de camisa inválido (< 1 ou > 99);
- [ ] Tentar atribuir o mesmo número de camisa a dois atletas da mesma equipe;
- [ ] Tentar cadastrar um segundo capitão na mesma equipe;
- [ ] Tentar cadastrar líberos além do limite (ex: 3 na quadra ou 1 na praia).

### B. Provocações em Partidas
- [ ] Tentar salvar placar impossível de set (ex: 25x24 sem vantagem mínima de 2 pontos);
- [ ] Tentar salvar set com pontuação insuficiente (ex: 23x21 na quadra);
- [ ] Tentar finalizar partida sem atingir o número necessário de vitórias de sets (`setsToWin`);
- [ ] Tentar alterar resultado de partida já finalizada e homologada;
- [ ] Registrar partidas por W.O. e verificar atribuição de sets (2x0 / 3x0) e pontos canônicos;
- [ ] Exercitar partidas em 3x0, 3x1 e 3x2, conferindo a pontuação FIVB (3/3/2/1/0).

### C. Provocações na Classificação
- [ ] Forçar empate em pontos entre duas equipes e validar desempate por vitórias;
- [ ] Forçar empate em vitórias e validar confronto direto;
- [ ] Forçar empate em confronto direto e validar set average;
- [ ] Forçar empate total e validar pontos average e saldo de pontos.

### D. Provocações no Sorteio
- [ ] Efetuar duplo clique rápido no botão de salvar sorteio;
- [ ] Recarregar a página durante a execução do sorteio e verificar recuperação íntegra;
- [ ] Sair da página e voltar antes de salvar o preview;
- [ ] Tentar executar novo sorteio após partidas já terem sido iniciadas.

### E. Provocações no Ciclo de Vida e Congelamento (Freeze)
- [ ] Tentar alterar regras de sets após início dos jogos;
- [ ] Tentar alterar sistema de pontuação com a competição em andamento;
- [ ] Tentar alterar elenco de equipe após congelamento de inscrições;
- [ ] Tentar alterar formato ou topologia após a geração de partidas.

---

## 3. Regra de Congelamento de Commit e Deploy

O deploy para o torneio de testes e para produção deve obedecer a governança estrita:
1. **Commit de Release Congelado:** O pacote submetido a deploy é estritamente o código validado pela auditoria. Nenhuma alteração silenciosa de código é permitida.
2. **Ciclo Formal de Correção de Bugs:** Se uma anomalia for identificada durante o torneio:
   $$\text{Bug Identificado} \implies \text{Registrar no Livro de Incidentes} \implies \text{Reproduzir} \implies \text{Corrigir} \implies \text{Criar Teste de Regressão} \implies \text{Nova Build} \implies \text{Novo Commit}$$

---

## 4. Critérios de Liberação para o Torneio Principal (VOLTZ)

Após a realização do torneio de testes, a comissão técnica avaliará o Livro de Incidentes:

### 🟢 GO para o VOLTZ
- 0 incidentes críticos;
- 0 incidentes altos;
- Classificação e desempates 100% corretos;
- Sorteio e chaveamento íntegros;
- Progressões de fases e play-in sem falhas;
- Placares e súmulas emitidos corretamente;
- Zero perda de dados ou necessidade de intervenção manual no banco.

### 🔴 NO-GO para o VOLTZ
- Ocorrência de qualquer classificação incorreta;
- Equipe avançando indevidamente de fase;
- Chaveamento ou grafo de estágios inconsistente;
- Sorteio corrompendo grupos;
- Resultado oficial adulterado;
- Regras sofrendo mutação após freeze;
- Perda de dados ou necessidade de intervenção manual não rastreada.

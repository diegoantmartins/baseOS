# BaseOS — Matriz de Achados e Classificação de Riscos (Fase 4.PRE)

**Status:** CONCLUÍDO E CLASSIFICADO  
**Data:** Setembro/2026  

---

## 1. Critérios Formais de Classificação

- **CRÍTICO:** Pode corromper competição, gerar classificação incorreta, perder dados, permitir alteração de regras congeladas ou gerar resultado oficial incorreto. **Bloqueia deploy.**
- **ALTO:** Pode causar falha operacional grave durante o torneio. **Bloqueia deploy.**
- **MÉDIO / LIMITAÇÃO:** Questão com contorno claro, limitação de infraestrutura de teste ou item de backlog futuro. **Avaliação pré-torneio.**
- **BAIXO:** Problema cosmético, documental ou de warning sem impacto na integridade esportiva.

---

## 2. Inventário de Achados do Software

### Achados Críticos no Software: 0 (Zero)
Nenhum risco de integridade esportiva, concorrência, perda de dados ou adulteração de regras foi detectado no sistema.

### Achados Altos no Software: 0 (Zero)
Nenhuma falha de bloqueio operacional ou quebra de fluxo foi detectada.

---

## 3. Limitações de Ambiente e Backlog Futuro

### LIM-01 (Anteriormente M01): Limitação do Ambiente de Auditoria para Teste Visual
- **Tipo:** Limitação de ambiente de teste / Infraestrutura headless.
- **Descrição:** Durante a tentativa de execução do subagente de navegação no container de auditoria, o utilitário de instalação do Playwright Driver encontrou erro de rede externa (`HTTP 404 Not Found` no endpoint CDN da Azure: `https://playwright.azureedge.net/builds/driver/playwright-1.57.0-linux.zip`).
- **Impacto no Software:** **Não demonstrado**. O código da UI, componentes, estilos e contratos TypeScript compilam e operam normalmente.
- **Impacto na Auditoria:** Impede a execução do teste visual E2E automatizado com gravação de tela. O teste automatizado de integração lógica passou com 100% de sucesso.
- **Mitigação:** Realização de smoke test manual de 2 minutos pelo operador no navegador (`http://localhost:5173`) antes do apito inicial do torneio.

---

### BKL-01 (Anteriormente M02): Editor Ad-Hoc de Pontuação por Saldo Ponto-a-Ponto
- **Tipo:** Backlog funcional futuro (Fora do escopo do VOLTZ).
- **Descrição:** O `CompetitionFormDialog` expõe os 3 modelos regulamentares oficiais (`fivb-standard`, `simple`, `win-loss`). Ligas recreativas hipotéticas que atribuam pontuações atípicas customizadas por faixas de saldo ponto-a-ponto (ex: 4 pontos por vitória com saldo > 10) não possuem editor específico na UI básica.
- **Impacto no Software:** **Nulo para o Torneio de Testes e para o VOLTZ**, pois ambos utilizam estritamente o regulamento oficial FIVB/CBV (`fivb-standard`).
- **Decisão:** **Não alterar o código agora.** Manter congelado para o torneio de testes e arquivar como melhoria para versões futuras do BaseOS.

---

## 4. Achados Baixos

### ACHADO-B01: Warning Cosmético de ESLint em DrawArenaCanvas
- **Tipo:** Manutenção cosmética de código.
- **Descrição:** `src/components/draw/cinematic/DrawArenaCanvas.tsx:438` apresenta aviso `react-hooks/exhaustive-deps` (dependência `'team'` omitida no `useMemo`).
- **Impacto no Software:** Nenhum. Zero erros de build e zero erros de lint (`0 errors, 1 warning`).
- **Ação:** Manutenção de rotina pós-torneio.

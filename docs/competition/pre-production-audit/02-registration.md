# BaseOS — Auditoria do Cadastro de Competições (Fase 4.PRE)

**Arquivo Auditado:** `src/components/competition/dialogs/CompetitionFormDialog.tsx`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Estrutura da Interface em 4 Abas

O diálogo de criação de competições foi completamente refatorado e organizado em 4 abas coesas:

### Aba 1 — Geral
- **Campos:** Nome da Competição, Modalidade (Quadra vs Praia), Categoria/Naipe (Feminino, Masculino, Misto), Local Principal/Ginásio e Datas (Início, Fim, Prazo de Inscrição).
- **Validação:** Exige no mínimo 3 caracteres no nome da competição para habilitar a submissão (`canSubmit = name.trim().length >= 3`).
- **Reatividade de Presets:** Ao selecionar a modalidade, dispara `applyModalityPreset`:
  - `indoor`: Aplica cópia profunda segura (`JSON.parse(JSON.stringify(DEFAULT_INDOOR_COMPETITION_CONFIG))`).
  - `beach`: Aplica cópia profunda segura (`JSON.parse(JSON.stringify(DEFAULT_BEACH_COMPETITION_CONFIG))`).
  - Garante ausência de mutação nos presets estáticos em memória.

### Aba 2 — Sistema de Disputa
- **Carregamento Dinâmico:** Carrega a lista oficial de templates em tempo de execução via `CompetitionTemplateService.listTemplates()`.
- **Ausência de Hardcode:** Nenhuma lista estática ou paralela de templates existe no componente. Se um novo template for registrado no domínio, ele aparece automaticamente na interface.
- **Exibição de Metadados:** Apresenta nome, descrição, faixa recomendada de participantes e tags do modelo selecionado.
- **Parâmetros Estruturais:** Para modelos baseados em grupos, expõe campos numéricos para Número de Grupos (mínimo 1), Vagas Diretas por Grupo (mínimo 1) e Vagas para Melhores Terceiros (mínimo 0).

### Aba 3 — Sets & Pontos
- **Sets para Vitória:** Seletor com valores `1 | 2 | 3` alimentados pelos helpers canônicos `deriveMaxSets()` e `formatSetsToWinLabel()`.
- **Phase Overrides:** Switch regulamentar "Semifinais e Final em melhor de 5 sets", habilitado por padrão no vôlei de quadra e desabilitado na praia.
- **Regras de Fechamento:** Configuração explícita de Pontos do Set Regular (25 ou 21), Pontos do Tiebreak (15) e Vantagem Mínima (2).
- **Sistema de Pontuação:** Seletor de modelos de classificação (`fivb-standard`, `simple`, `win-loss`).

### Aba 4 — Inscrição
- **Limites de Elenco:** Mínimo de Atletas (padrão 6 na quadra, 2 na praia), Máximo de Atletas (padrão 14 na quadra, 4 na praia), Máximo de Líberos (2 na quadra, 0 na praia), Máximo de Capitães (1).
- **Exigência de Camisa:** Switch regulamentar "Exigir número de camisa já na inscrição online".

---

## 2. Construção Canônica no Submit

Ao submeter o formulário:
1. Invoca `CompetitionTemplateService.createConfigFromTemplate(selectedTemplateId, { modality, setsToWin })`.
2. Aplica as customizações regulamentares do organizador sobre o objeto canônico `CompetitionConfig`.
3. Sincroniza retroativamente os campos legados de `CompetitionRecord` (`playerFormat`, `setFormat`, `groupsCount`, `advancingPerGroup`, `bestThirdsCount`, `phaseSetRules`, `tiebreakCriteriaOrder`) para total compatibilidade com componentes ou relatórios legados.
4. Salva o `CompetitionConfig` como JSONB no banco de dados através de `dataAccess.createCompetition`.

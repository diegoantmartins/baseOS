---
name: baseos-audit
description: Full-spectrum audit and quality control for BaseOS covering visual UX/UI, responsiveness, accessibility, component duplication, state coverage, performance, and non-regression.
---

# BaseOS — Auditoria, Padronização e Controle de Qualidade Frontend

## Identidade da Skill

- **Nome**: baseos-audit
- **Escopo**: Auditoria de ponta a ponta de interfaces, UX/UI, acessibilidade, responsividade, estados de componente, consistência de dados e não-regressão no BaseOS.
- **Premissa**: Garantir que o BaseOS funcione como um produto SaaS coeso, confiável, padronizado e sem falhas visuais ou operacionais.

---

# 1. MODOS DE EXECUÇÃO

Esta skill opera em dois modos distintos de trabalho:

---

## MODO 1 — AUDITORIA (PADRÃO - SOMENTE LEITURA)

Neste modo, a atuação é **estritamente investigativa**.

**REGRAS DO MODO 1**:
- ⛔ **NÃO** alterar arquivos de código.
- ⛔ **NÃO** modificar o banco de dados nem schemas.
- ⛔ **NÃO** refatorar componentes nem estilos.
- ⛔ **NÃO** alterar rotas nem serviços.

**AÇÕES PERMITIDAS**:
1. Analisar o código-fonte em `src/`.
2. Executar comandos de verificação (`npx tsc`, `npm run lint`, `npm test`).
3. Mapear inconsistências visuais, termos em inglês, erros de acessibilidade e estados faltantes.
4. Gerar o **Relatório de Auditoria Frontend do BaseOS** detalhado com classificações de gravidade (Crítica, Alta, Média, Baixa).

---

## MODO 2 — CORREÇÃO (SOMENTE APÓS AUTORIZAÇÃO EXPLICITA)

Este modo só é ativado quando o usuário aprovar explicitamente os itens do relatório.

**FLUXO DO MODO 2**:
```text
PROBLEMAS APROVADOS PELO USUÁRIO
              ↓
    PLANEJAMENTO EM LOTES
              ↓
  IMPLEMENTAÇÃO GRADUAL (SEM REDESIGN TOTAL)
              ↓
 VERIFICAÇÃO AUTOMATIZADA (TSC + LINT + TEST)
              ↓
     AUDITORIA DE REGRESSÃO
```

---

# 2. CHECKLIST COMPLETO DA AUDITORIA FRONTEND (20 PONTOS)

1. **Idiomas e Termos**: Todos os rótulos, botões, placeholders e mensagens estão em português do Brasil? Sem uso de "&" em títulos?
2. **TypeScript**: `npx tsc -p tsconfig.app.json --noEmit` roda com zero erros?
3. **Linter**: `npm run lint` roda sem erros?
4. **Testes Unitários**: `npm test` passa em 100% dos testes da suíte Vitest?
5. **Acessibilidade (WCAG)**: Contraste de cor adequado, suporte a leitor de tela, foco visível de teclado?
6. **Estados de Carregamento**: Skeletons estão presentes durante buscas e carregamentos?
7. **Estados Vazio**: Páginas e tabelas exibem mensagens e CTAs quando não há registros?
8. **Estados de Erro**: Tratamento visual amigável quando falhas de API ou rede ocorrem?
9. **Responsividade Mobile**: Layout quebra em telas de 360px a 414px? Ha scroll horizontal indesejado (`overflow-x`)?
10. **Tabelas e Placares**: Placares e tabelas utilizam `font-mono` / `tabular-nums` para estabilidade visual?
11. **Rotas e Links**: Algum link em menus ou Central de Ajuda aponta para rota 404 ou inexistente?
12. **Componentes Duplicados**: Existem botões, modais ou inputs similares implementados duas vezes?
13. **Uso do Adapter**: Alguém acessou `localStorage` ou `supabase` fora de `src/services/dataAccess.ts`?
14. **Validações de Inscrição**: O formulário de inscrição valida capitão único, camisas (1-99) e até 2 líberos?
15. **Súmulas PDF**: A geração de súmulas em PDF funciona corretamente para partidas de 3 e 5 sets?
16. **Classificação FIVB/CBV**: A tabela de classificação reflete pontuação e critérios de desempate fiéis ao regulamento?
17. **Integridade de Temas**: A interface mantém contraste legível nos modos Claro e Escuro?
18. **Feedback de Formulários**: Indicador visual de salvamento e validação de campos obrigatórios?
19. **Performance Frontend**: Imagens otimizadas, imports sem peso morto, re-renderizações controladas?
20. **Preservação de Código**: Alguma funcionalidade existente foi desativada ou removida sem autorização?

---

# 3. ESTRUTURA DO RELATÓRIO DE AUDITORIA

Quando a skill for invocada para auditar, ela deve apresentar o resultado na seguinte estrutura:

```markdown
# RELATÓRIO DE AUDITORIA FRONTEND — BASEOS

## Visão Geral
- **Data da Auditoria**: [Data]
- **Status do Build**: [Sucesso / Falha]
- **Status do Typecheck**: [Zero erros / X erros]
- **Status dos Testes**: [X/X passando]

## Inconsistências Identificadas por Categoria

### 1. UI / UX & Acessibilidade
- [Crítica/Alta/Média/Baixa] Descrição do problema em `caminho/do/arquivo:linha`.

### 2. Estados de Interface (Loading / Empty / Error)
- Descrição das lacunas encontradas.

### 3. Responsividade & Layout Mobile
- Descrição de quebras de layout.

### 4. Coerência com a Arquitetura (dataAccess / Componentes)
- Desvios em relação ao padrão do BaseOS.

## Recomendações e Plano de Ação Priorizado
1. Lote 1 (Prioridade Alta)
2. Lote 2 (Melhorias Finais)
```

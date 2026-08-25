# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [1.0.0] - 2026-08-25

### Adicionado
- **Motor de Documentos BaseOS**:
  - Geração de Súmulas Oficiais em PDF (formato A4 paisagem, página única) para partidas de 3 Sets e 5 Sets.
  - Geração de Fichas de Ordem de Saque / Posição Inicial.
  - Suporte a preview, impressão e download direto com sanitização e fallbacks para deploy limpo.
- **Gestão de Competições e Partidas**:
  - Modalidades Quadra e Praia.
  - Tabelas de jogos, chaveamentos e fases eliminatórias.
  - Pontuação ao vivo com controle de sets, rotações e líberos.
- **Classificação e Desempate**:
  - Critérios oficiais FIVB / CBV (pontos, vitórias, sets average, pontos average, confronto direto).
- **Inscrições e Elencos**:
  - Validações de limites de atletas, duplicidade de camisas, capitães e líberos.
- **Arquitetura & Segurança**:
  - Adapter Pattern unificado em `dataAccess.ts` com suporte a LocalStorage e Supabase.
  - Sistema de permissões e autenticação baseado em papéis (Admin, Organizador, Árbitro, Técnico, Visualizador).
  - Cobertura completa de testes automatizados com Vitest.

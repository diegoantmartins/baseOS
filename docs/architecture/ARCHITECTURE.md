# Arquitetura do Sistema — BaseOS

## 1. Visão Geral da Arquitetura

O **BaseOS** é projetado seguindo uma arquitetura em camadas orientada a serviços e adaptadores (*Hexagonal / Ports & Adapters Architecture*):

```text
┌─────────────────────────────────────────────────────────────┐
│                    Interface com Usuário                    │
│            React 18 + TypeScript + Radix UI + Vite          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Camada de Serviços                      │
│   authService │ registrationService │ standingsService      │
│   tenantSecurityService │ scoresheetService │ healthCheck   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Camada de Acesso a Dados (Port)              │
│                       dataAccess.ts                         │
├──────────────────────────────┬──────────────────────────────┤
│  Adapter 1: LocalStorage     │  Adapter 2: Supabase Postgre │
│  (Modo Demonstração Offline) │  (Modo Produção em Nuvem)    │
└──────────────────────────────┴──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Motor Documental BaseOS                   │
│             Geração Vetorial de Súmulas Oficiais            │
│         BaseosThreeSetScoresheet (A4) / FiveSet (A4)        │
└─────────────────────────────────────────────────────────────┘
```

## 2. Princípios Fundamentais
1. **Padrão Adapter**: Toda persistência passa exclusivamente por `src/services/dataAccess.ts`. A UI e as regras de negócio desconhecem o meio de armazenamento (LocalStorage ou PostgreSQL/Supabase).
2. **Regras de Negócio Isoladas**: Toda a lógica de pontuação FIVB/CBV, desempate, rotação e súmula reside em serviços puros (`src/services/` e `src/document-engine/baseos/`), garantindo 100% de testabilidade unitária.
3. **Motor Documental Nativo**: Documentos oficiais gerados sem rasterização, garantindo nitidez vetorial milimétrica em qualquer resolução de impressão.

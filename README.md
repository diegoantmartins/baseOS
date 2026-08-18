# VolleyPro - Sistema de Gestão de Competições de Voleibol

<div align="center">

![VolleyPro](https://img.shields.io/badge/VolleyPro-0F2A44?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)

**Sistema profissional de gerenciamento de competições de voleibol de quadra e praia**

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [Documentação](#-documentação) • [Roadmap](#-roadmap)

</div>

---

## 🏐 Sobre o Projeto

O **VolleyPro** é um sistema web completo para gerenciamento de competições de voleibol, desenvolvido para atender federações, ligas, organizadores, árbitros e equipes. Suporta vôlei de quadra (6x6, 4x4) e vôlei de praia (2x2, 3x3).

### Principais Diferenciais

- 📱 **Responsivo** - Desktop, tablet e celular
- ⚡ **Tempo Real** - Acompanhamento de partidas ao vivo
- 📄 **Súmula Digital** - Geração automática de PDF oficial
- 🔄 **Ordem de Saque** - Controle automático de rotação
- 🏆 **Multi-formato** - Diversos formatos de competição

---

## 🎯 Funcionalidades

### ✅ Implementado

| Módulo | Status |
|--------|--------|
| Dashboard com estatísticas | ✅ |
| Listagem e filtros de jogos | ✅ |
| Formulário de agendamento de partida | ✅ |
| Súmula digital com placar em tempo real | ✅ |
| Geração de PDF oficial (A4, P&B) | ✅ |
| Gestão de competições e chaveamentos | ✅ |
| Cadastro de equipes e atletas | ✅ |
| Gestão de árbitros | ✅ |
| Dashboards estatísticos | ✅ |
| Configurações do sistema | ✅ |
| Inscrição online por equipe (prazo, limites, regras de elenco) | ✅ |
| Testes automatizados (Vitest) | ✅ |

### 🔜 Em Desenvolvimento

- Autenticação com perfis de acesso
- Banco de dados PostgreSQL/Supabase
- CRUD completo de todas entidades
- Controle avançado de ordem de saque
- Assinatura digital

---

## 🛠️ Stack Tecnológica

- **React 18** + **TypeScript** + **Vite**
- **TailwindCSS** + **shadcn/ui**
- **Framer Motion** (animações)
- **React Hook Form** + **Zod** (formulários)
- **jsPDF** (geração de PDF)
- **Recharts** (gráficos)

---

## 🚀 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/volleypro.git
cd volleypro

# Instale as dependências
npm install

# Inicie o servidor
npm run dev
```

Acesse `http://localhost:5173`

### Testes

```bash
npm test          # roda a suíte completa (Vitest, 32 testes)
npm run test:watch
npm run lint      # ESLint (5 erros pré-existentes no template de UI)
npx tsc -p tsconfig.app.json --noEmit   # typecheck
```

Os testes cobrem regras de negócio de inscrição (`src/test/registrationService.test.ts`),
o motor de classificação/desempate (`src/test/standingsService.test.ts`) e
a geração do PDF da súmula (`src/test/matchSheetPdf.test.ts`).

---

## 📚 Documentação

- [Análise de Completude](docs/ANALISE_COMPLETUDE.md) - Status e roadmap detalhado
- [Schema do Banco](docs/DATABASE_SCHEMA.md) - Modelagem PostgreSQL
- [Contribuindo](CONTRIBUTING.md) - Guia de contribuição

---

## 📋 Roadmap

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Frontend completo | ✅ Concluído |
| 2 | Backend (Supabase) | 🔜 Próximo |
| 3 | Autenticação | 🔜 Próximo |
| 4 | Tempo Real | ⏳ Planejado |
| 5 | PWA Offline | ⏳ Planejado |

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">

**Desenvolvido com 💙 para a comunidade do voleibol brasileiro**

</div>

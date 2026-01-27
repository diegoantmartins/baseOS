# Contribuindo para o VolleyPro

Obrigado pelo seu interesse em contribuir para o VolleyPro! Este documento fornece diretrizes para contribuição.

## 🚀 Como Contribuir

### 1. Fork e Clone

```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/seu-usuario/volleypro.git
cd volleypro
```

### 2. Crie uma Branch

```bash
# Crie uma branch para sua feature/fix
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-fix
```

### 3. Faça suas Alterações

- Siga os padrões de código existentes
- Use TypeScript para tipagem
- Use os componentes do design system
- Adicione testes quando apropriado

### 4. Commit

```bash
# Use mensagens de commit descritivas
git commit -m "feat: adiciona controle de substituições na súmula"
```

#### Padrão de Commits

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação (não afeta código)
- `refactor:` Refatoração de código
- `test:` Adição de testes
- `chore:` Manutenção

### 5. Push e Pull Request

```bash
git push origin feature/minha-feature
```

Abra um Pull Request no GitHub com descrição clara das alterações.

---

## 📋 Padrões de Código

### TypeScript

- Use tipos explícitos sempre que possível
- Evite `any`
- Use interfaces para objetos complexos
- Mantenha os tipos em `src/types/`

### React

- Use componentes funcionais com hooks
- Mantenha componentes pequenos e focados
- Use a estrutura de pastas existente
- Componentes reutilizáveis em `src/components/ui/`

### Tailwind CSS

- Use classes semânticas do design system
- Evite cores hardcoded (use tokens)
- Mantenha consistência com o tema existente

### Exemplos

```tsx
// ✅ Correto
import { cn } from '@/lib/utils';

function MyComponent({ className }: { className?: string }) {
  return (
    <div className={cn('bg-primary text-primary-foreground', className)}>
      Conteúdo
    </div>
  );
}

// ❌ Evitar
function MyComponent() {
  return (
    <div className="bg-blue-500 text-white">
      Conteúdo
    </div>
  );
}
```

---

## 🧪 Testes

```bash
# Rodar testes
npm run test

# Rodar testes com watch
npm run test:watch
```

---

## 📝 Issues

### Reportando Bugs

- Use o template de issue para bugs
- Inclua passos para reproduzir
- Inclua screenshots se aplicável
- Informe navegador e sistema operacional

### Sugerindo Features

- Descreva o problema que a feature resolve
- Sugira uma implementação se possível
- Considere o escopo do projeto

---

## 🎯 Áreas que Precisam de Ajuda

1. **Testes** - Precisamos de mais cobertura de testes
2. **Documentação** - Melhorar documentação de componentes
3. **Acessibilidade** - Melhorar suporte a leitores de tela
4. **i18n** - Suporte a múltiplos idiomas
5. **Performance** - Otimizações de renderização

---

## 📞 Contato

- Abra uma issue para dúvidas gerais
- Use discussions para ideias e sugestões

Obrigado por contribuir! 🏐

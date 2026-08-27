/**
 * StateContainer.test.tsx
 *
 * Testes unitários do componente universal de estados do BaseOS.
 * Segue o padrão dos testes existentes em src/test/ (Vitest + jsdom).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  StateContainer,
  ErrorState,
  EmptyState,
} from '@/components/ui/StateContainer';

// ─────────────────────────────────────────────────────────────────────────────
// StateContainer — Testes de renderização por estado
// ─────────────────────────────────────────────────────────────────────────────

describe('StateContainer', () => {
  it('exibe children no estado normal (padrão)', () => {
    render(
      <StateContainer>
        <p>Conteúdo da página</p>
      </StateContainer>
    );
    expect(screen.getByText('Conteúdo da página')).toBeDefined();
  });

  it('exibe Skeleton padrão quando isLoading=true', () => {
    const { container } = render(<StateContainer isLoading />);
    // aria-busy="true" é aplicado ao container de loading
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('exibe Skeleton customizado quando loadingSkeleton é fornecido', () => {
    render(
      <StateContainer isLoading loadingSkeleton={<div>Carregando partidas…</div>} />
    );
    expect(screen.getByText('Carregando partidas…')).toBeDefined();
  });

  it('exibe ErrorState quando isError=true', () => {
    render(<StateContainer isError />);
    // role="alert" é obrigatório para acessibilidade de leitores de tela
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('exibe título e descrição de erro personalizados', () => {
    render(
      <StateContainer
        isError
        errorTitle="Falha ao carregar equipes"
        errorDescription="Sem conexão com o servidor."
      />
    );
    expect(screen.getByText('Falha ao carregar equipes')).toBeDefined();
    expect(screen.getByText('Sem conexão com o servidor.')).toBeDefined();
  });

  it('chama onRetry ao clicar no botão de retry', () => {
    const onRetry = vi.fn();
    render(<StateContainer isError onRetry={onRetry} retryLabel="Tentar de Novo" />);
    const retryBtn = screen.getByRole('button', { name: /Tentar de Novo/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('não exibe botão de retry quando onRetry não é fornecido', () => {
    render(<StateContainer isError />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('exibe EmptyState quando isEmpty=true', () => {
    render(
      <StateContainer
        isEmpty
        emptyTitle="Nenhuma competição ativa"
        emptyDescription="Crie um campeonato para começar."
      />
    );
    expect(screen.getByText('Nenhuma competição ativa')).toBeDefined();
    expect(screen.getByText('Crie um campeonato para começar.')).toBeDefined();
  });

  it('exibe ação (CTA) no estado vazio', () => {
    render(
      <StateContainer
        isEmpty
        emptyAction={<button>Nova Competição</button>}
      />
    );
    expect(screen.getByRole('button', { name: /Nova Competição/i })).toBeDefined();
  });

  it('prioriza loading sobre erro (isLoading tem precedência sobre isError)', () => {
    const { container } = render(<StateContainer isLoading isError />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('prioriza erro sobre vazio (isError tem precedência sobre isEmpty)', () => {
    render(<StateContainer isError isEmpty />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.queryByText('Nenhum item encontrado')).toBeNull();
  });

  it('não exibe children quando isLoading=true', () => {
    render(
      <StateContainer isLoading>
        <p>Este conteúdo não deve aparecer</p>
      </StateContainer>
    );
    expect(screen.queryByText('Este conteúdo não deve aparecer')).toBeNull();
  });

  it('aceita className personalizado', () => {
    const { container } = render(
      <StateContainer isLoading className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('exibe número correto de skeletons (skeletonRows)', () => {
    const { container } = render(<StateContainer isLoading skeletonRows={5} />);
    // O DefaultLoadingSkeleton gera um wrapper por linha com flex items-center
    const skeletonRows = container.querySelectorAll('[aria-busy="true"] > .flex');
    expect(skeletonRows.length).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ErrorState — Sub-componente independente
// ─────────────────────────────────────────────────────────────────────────────

describe('ErrorState', () => {
  it('renderiza com valores padrão', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Não foi possível carregar os dados')).toBeDefined();
  });

  it('renderiza com props personalizados', () => {
    render(
      <ErrorState
        title="Erro de rede"
        description="Sem acesso à internet."
        retryLabel="Recarregar"
        onRetry={() => {}}
      />
    );
    expect(screen.getByText('Erro de rede')).toBeDefined();
    expect(screen.getByText('Sem acesso à internet.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Recarregar/i })).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — Sub-componente independente
// ─────────────────────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renderiza com título padrão', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nenhum item encontrado')).toBeDefined();
  });

  it('renderiza com ícone personalizado', () => {
    render(
      <EmptyState
        title="Nenhuma súmula registrada"
        icon={<span data-testid="trophy-icon">🏆</span>}
      />
    );
    expect(screen.getByTestId('trophy-icon')).toBeDefined();
    expect(screen.getByText('Nenhuma súmula registrada')).toBeDefined();
  });

  it('não exibe descrição quando não fornecida', () => {
    render(<EmptyState title="Vazio" />);
    // Não deve haver parágrafo de descrição
    const ps = screen.queryAllByRole('paragraph');
    // O título está em <p>, mas a descrição não deve existir com texto vazio
    expect(ps.some(p => p.textContent === '')).toBe(false);
  });
});

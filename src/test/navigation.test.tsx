/**
 * navigation.test.tsx
 *
 * Testes unitários dos componentes de navegação da Fase 1:
 * - BreadcrumbNav
 * - BottomNav
 *
 * Segue a infraestrutura existente: Vitest + React Testing Library + jsdom.
 * Sidebar e MainLayout são testados separadamente em sidebar.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BreadcrumbNav } from '@/components/navigation/BreadcrumbNav';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks necessários para componentes que dependem de contextos externos
// ─────────────────────────────────────────────────────────────────────────────

// Mock do AuthContext para BottomNav (usa useAuth)
vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => ({
    session: { user: { name: 'Teste', email: 'teste@baseos.app', role: 'organizer' } },
    signOut: vi.fn(),
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// BreadcrumbNav — Testes
// ─────────────────────────────────────────────────────────────────────────────

describe('BreadcrumbNav', () => {
  it('não renderiza quando há 0 itens', () => {
    const { container } = render(
      <MemoryRouter>
        <BreadcrumbNav items={[]} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza quando há apenas 1 item (página raiz)', () => {
    const { container } = render(
      <MemoryRouter>
        <BreadcrumbNav items={[{ label: 'Competições' }]} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza com 2 itens — pai clicável + página atual não clicável', () => {
    render(
      <MemoryRouter>
        <BreadcrumbNav
          items={[
            { label: 'Competições', href: '/competicoes' },
            { label: 'Campeonato X' },
          ]}
        />
      </MemoryRouter>
    );
    // Link clicável para o pai
    const link = screen.getByRole('link', { name: /Competições/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/competicoes');

    // Página atual não é link
    const current = screen.getByText('Campeonato X');
    expect(current.tagName).not.toBe('A');
  });

  it('renderiza hierarquia profunda com 3 itens', () => {
    render(
      <MemoryRouter>
        <BreadcrumbNav
          items={[
            { label: 'Competições', href: '/competicoes' },
            { label: 'Campeonato X', href: '/competicoes/123' },
            { label: 'Inscrições' },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Competições/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Campeonato X/i })).toBeDefined();
    expect(screen.getByText('Inscrições')).toBeDefined();
  });

  it('possui landmark de navegação acessível (aria-label)', () => {
    render(
      <MemoryRouter>
        <BreadcrumbNav
          items={[
            { label: 'Partidas', href: '/jogos' },
            { label: 'Partida 42' },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation', { name: /Localização/i })).toBeDefined();
  });

  it('aceita className personalizado', () => {
    const { container } = render(
      <MemoryRouter>
        <BreadcrumbNav
          items={[
            { label: 'Raiz', href: '/' },
            { label: 'Filho' },
          ]}
          className="minha-classe"
        />
      </MemoryRouter>
    );
    expect(container.querySelector('.minha-classe')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BottomNav — Testes
// ─────────────────────────────────────────────────────────────────────────────

// BottomNav depende de Sheet do shadcn, que é mais complexo de testar em jsdom.
// Testamos os itens principais e a acessibilidade básica.

describe('BottomNav — itens e acessibilidade', () => {
  beforeEach(() => {
    // Importação dinâmica para usar o mock de AuthContext acima
  });

  it('renderiza os 3 itens primários + botão Menu', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/competicoes-ativas']}>
        <BottomNav />
      </MemoryRouter>
    );

    // Os 3 links primários
    expect(screen.getByRole('link', { name: /Início/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Jogos/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Súmulas/i })).toBeDefined();

    // Botão de menu
    expect(screen.getByRole('button', { name: /Abrir menu completo/i })).toBeDefined();
  });

  it('item Início ativo em /competicoes-ativas', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/competicoes-ativas']}>
        <BottomNav />
      </MemoryRouter>
    );
    const inicioLink = screen.getByRole('link', { name: /Início/i });
    expect(inicioLink.getAttribute('aria-current')).toBe('page');
  });

  it('item Jogos ativo em /jogos', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/jogos/novo']}>
        <BottomNav />
      </MemoryRouter>
    );
    const jogosLink = screen.getByRole('link', { name: /Jogos/i });
    expect(jogosLink.getAttribute('aria-current')).toBe('page');
  });

  it('item Súmulas ativo em /sumulas', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/sumulas']}>
        <BottomNav />
      </MemoryRouter>
    );
    const sumulasLink = screen.getByRole('link', { name: /Súmulas/i });
    expect(sumulasLink.getAttribute('aria-current')).toBe('page');
  });

  it('nav tem aria-label de navegação rápida', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation', { name: /Navegação rápida/i })).toBeDefined();
  });

  it('botão Menu tem aria-haspopup=dialog', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );
    const menuBtn = screen.getByRole('button', { name: /Abrir menu completo/i });
    expect(menuBtn.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('abre o Sheet ao clicar em Menu', async () => {
    const { BottomNav } = await import('@/components/navigation/BottomNav');
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );
    const menuBtn = screen.getByRole('button', { name: /Abrir menu completo/i });
    fireEvent.click(menuBtn);
    // O Sheet renderiza um h2 como SheetTitle com o texto "Menu"
    // (o botão do BottomNav também tem "Menu", então usamos getAllByText)
    const allMenuTexts = screen.getAllByText('Menu');
    // Pelo menos um deve ser o h2 do SheetTitle
    const sheetTitle = allMenuTexts.find(el => el.tagName === 'H2');
    expect(sheetTitle).toBeDefined();
  });
});

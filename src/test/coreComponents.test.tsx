/**
 * coreComponents.test.tsx
 *
 * Suíte de testes unitários dos Core Universal Components da Fase 2:
 * - PageHeader
 * - Section & SectionCard
 * - StatusBadge
 * - TableSkeleton
 * - DataTable
 *
 * Utiliza: Vitest + React Testing Library + jsdom.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Section, SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { STATUS_CONFIG_MAP } from '@/components/ui/statusBadgeConfig';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

// ─────────────────────────────────────────────────────────────────────────────
// 1. PageHeader Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PageHeader', () => {
  it('renderiza título obrigatório como h1', () => {
    render(<PageHeader title="Competições Ativas" />);
    const heading = screen.getByRole('heading', { level: 1, name: /Competições Ativas/i });
    expect(heading).toBeDefined();
  });

  it('renderiza descrição quando fornecida', () => {
    render(
      <PageHeader
        title="Partidas"
        description="Gerenciamento de jogos em andamento e agendados."
      />
    );
    expect(screen.getByText('Gerenciamento de jogos em andamento e agendados.')).toBeDefined();
  });

  it('renderiza badge contextual ao lado do título', () => {
    render(
      <PageHeader
        title="Superliga 2026"
        badge={<span data-testid="test-badge">Oficial</span>}
      />
    );
    expect(screen.getByTestId('test-badge')).toBeDefined();
  });

  it('renderiza breadcrumb no topo quando fornecido', () => {
    render(
      <PageHeader
        title="Editar Súmula"
        breadcrumb={<nav aria-label="Breadcrumb">Home / Súmulas</nav>}
      />
    );
    expect(screen.getByRole('navigation', { name: /Breadcrumb/i })).toBeDefined();
  });

  it('renderiza ações primárias e secundárias', () => {
    render(
      <PageHeader
        title="Equipes"
        primaryAction={<button>Nova Equipe</button>}
        secondaryActions={<button>Exportar CSV</button>}
      />
    );
    expect(screen.getByRole('button', { name: /Nova Equipe/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Exportar CSV/i })).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Section & SectionCard Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Section', () => {
  it('renderiza título como h2 e conteúdo children', () => {
    render(
      <Section title="Informações Gerais">
        <p>Conteúdo da seção</p>
      </Section>
    );
    expect(screen.getByRole('heading', { level: 2, name: /Informações Gerais/i })).toBeDefined();
    expect(screen.getByText('Conteúdo da seção')).toBeDefined();
  });

  it('renderiza ações do cabeçalho da seção', () => {
    render(
      <Section title="Atletas" actions={<button>Adicionar</button>}>
        <div>Lista</div>
      </Section>
    );
    expect(screen.getByRole('button', { name: /Adicionar/i })).toBeDefined();
  });

  it('aplica borda dividida quando divided=true', () => {
    const { container } = render(
      <Section title="Seção Dividida" divided>
        <div>Corpo</div>
      </Section>
    );
    expect(container.firstChild).toHaveClass('border-b');
  });
});

describe('SectionCard', () => {
  it('renderiza título, descrição, children e footer', () => {
    render(
      <SectionCard
        title="Resumo Financeiro"
        description="Taxas de arbitragem e premiação"
        footer={<button>Salvar Alterações</button>}
      >
        <div>Dados do Card</div>
      </SectionCard>
    );
    expect(screen.getByText('Resumo Financeiro')).toBeDefined();
    expect(screen.getByText('Taxas de arbitragem e premiação')).toBeDefined();
    expect(screen.getByText('Dados do Card')).toBeDefined();
    expect(screen.getByRole('button', { name: /Salvar Alterações/i })).toBeDefined();
  });

  it('suporta densidades dense, default e loose', () => {
    const { rerender, container } = render(
      <SectionCard title="Dense" density="dense">
        <div>Conteúdo</div>
      </SectionCard>
    );
    expect(container.querySelector('.p-3')).not.toBeNull();

    rerender(
      <SectionCard title="Loose" density="loose">
        <div>Conteúdo</div>
      </SectionCard>
    );
    expect(container.querySelector('.p-6')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. StatusBadge Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it('mapeia corretamente todos os estados esportivos oficiais', () => {
    const testCases: Array<{ status: string; expectedText: string }> = [
      { status: 'scheduled', expectedText: 'Agendado' },
      { status: 'live', expectedText: 'Ao Vivo' },
      { status: 'completed', expectedText: 'Encerrado' },
      { status: 'finished', expectedText: 'Encerrado' },
      { status: 'homologated', expectedText: 'Homologado' },
      { status: 'approved', expectedText: 'Homologado' },
      { status: 'pending', expectedText: 'Pendente' },
      { status: 'cancelled', expectedText: 'Cancelado' },
      { status: 'walkover', expectedText: 'W.O.' },
      { status: 'wo', expectedText: 'W.O.' },
    ];

    testCases.forEach(({ status, expectedText }) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(expectedText)).toBeDefined();
      unmount();
    });
  });

  it('mapeia estados administrativos oficiais', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Ativo')).toBeDefined();
  });

  it('permite customLabel sobrescrever a label padrão', () => {
    render(<StatusBadge status="live" customLabel="3º Set em Andamento" />);
    expect(screen.getByText('3º Set em Andamento')).toBeDefined();
  });

  it('trata estado desconhecido de forma segura e resiliente', () => {
    render(<StatusBadge status="custom_unknown_status" />);
    expect(screen.getByText('Custom_unknown_status')).toBeDefined();
  });

  it('não quebra com status vazio ou nulo', () => {
    render(<StatusBadge status={'' as unknown as string} />);
    expect(screen.getByText('Indefinido')).toBeDefined();
  });

  it('oculta ícone quando showIcon=false', () => {
    const { container } = render(<StatusBadge status="live" showIcon={false} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. TableSkeleton Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TableSkeleton', () => {
  it('renderiza com número padrão de colunas e linhas (4 colunas, 5 linhas)', () => {
    const { container } = render(<TableSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    const headerCols = container.querySelectorAll('thead th');
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(headerCols.length).toBe(4);
    expect(bodyRows.length).toBe(5);
  });

  it('permite customizar número de colunas e linhas', () => {
    const { container } = render(<TableSkeleton columns={6} rows={8} />);
    const headerCols = container.querySelectorAll('thead th');
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(headerCols.length).toBe(6);
    expect(bodyRows.length).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DataTable Tests
// ─────────────────────────────────────────────────────────────────────────────

interface TestTeam {
  id: string;
  name: string;
  points: number;
  city: string;
}

const mockTeams: TestTeam[] = [
  { id: '1', name: 'Vôlei Clube', points: 15, city: 'Curitiba' },
  { id: '2', name: 'Aliança Voleibol', points: 12, city: 'Londrina' },
];

const mockColumns: DataTableColumn<TestTeam>[] = [
  { id: 'name', header: 'Equipe', accessorKey: 'name' },
  { id: 'city', header: 'Cidade', accessorKey: 'city' },
  {
    id: 'points',
    header: 'Pontos',
    accessorKey: 'points',
    isNumeric: true,
  },
];

describe('DataTable', () => {
  it('renderiza cabeçalhos e linhas de dados corretamente', () => {
    render(<DataTable data={mockTeams} columns={mockColumns} />);
    expect(screen.getByText('Equipe')).toBeDefined();
    expect(screen.getByText('Cidade')).toBeDefined();
    expect(screen.getByText('Pontos')).toBeDefined();

    expect(screen.getByText('Vôlei Clube')).toBeDefined();
    expect(screen.getByText('Aliança Voleibol')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('aplica tabular-nums e font-mono em colunas numéricas (isNumeric=true)', () => {
    const { container } = render(<DataTable data={mockTeams} columns={mockColumns} />);
    const pointsCell = container.querySelector('td.tabular-nums.font-mono');
    expect(pointsCell).not.toBeNull();
    expect(pointsCell?.textContent).toBe('15');
  });

  it('renderiza TableSkeleton quando isLoading=true', () => {
    const { container } = render(
      <DataTable data={[]} columns={mockColumns} isLoading />
    );
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Vôlei Clube')).toBeNull();
  });

  it('renderiza EmptyState quando dados são vazios', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyTitle="Nenhuma equipe cadastrada"
        emptyDescription="Cadastre equipes para iniciar o torneio."
        emptyAction={<button>Cadastrar Equipe</button>}
      />
    );
    expect(screen.getByText('Nenhuma equipe cadastrada')).toBeDefined();
    expect(screen.getByText('Cadastre equipes para iniciar o torneio.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Cadastrar Equipe/i })).toBeDefined();
  });

  it('renderiza ErrorState quando isError=true com callback de retry', () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        isError
        errorTitle="Erro de Conexão"
        errorDescription="Não foi possível buscar as equipes."
        onRetry={onRetry}
      />
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Erro de Conexão')).toBeDefined();
    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('aciona onRowClick ao clicar em uma linha', () => {
    const onRowClick = vi.fn();
    render(<DataTable data={mockTeams} columns={mockColumns} onRowClick={onRowClick} />);
    const firstRowText = screen.getByText('Vôlei Clube');
    fireEvent.click(firstRowText);
    expect(onRowClick).toHaveBeenCalledWith(mockTeams[0]);
  });

  it('renderiza controles de paginação quando configurado', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={mockTeams}
        columns={mockColumns}
        pagination={{
          page: 1,
          totalPages: 3,
          totalItems: 30,
          onPageChange,
        }}
      />
    );
    expect(screen.getByText(/Total de/i)).toBeDefined();
    expect(screen.getByText('30')).toBeDefined();
    const nextBtn = screen.getByRole('button', { name: /Próxima página/i });
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

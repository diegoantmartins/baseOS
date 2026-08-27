import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback';
import { StateContainer } from '@/components/ui/StateContainer';
import { CompetitionHeader } from '@/components/competition/CompetitionHeader';
import { MatchTabsNav } from '@/components/match/MatchTabsNav';
import type { CompetitionRecord } from '@/types/entities';

describe('Accessibility Refinements — BaseOS Phase 9.6', () => {
  describe('RouteLoadingFallback', () => {
    it('renders with role="status" and aria-busy="true"', () => {
      render(<RouteLoadingFallback />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText(/carregando conteúdo/i)).toBeInTheDocument();
    });
  });

  describe('StateContainer', () => {
    it('renders loading state with role="status" and aria-busy="true"', () => {
      render(
        <StateContainer isLoading={true}>
          <div>Conteúdo Principal</div>
        </StateContainer>
      );
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText(/carregando dados/i)).toBeInTheDocument();
    });

    it('renders error state with role="alert"', () => {
      render(
        <StateContainer
          isError={true}
          errorTitle="Erro de carregamento"
          errorDescription="Falha ao conectar com o banco"
        />
      );
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(screen.getByText('Erro de carregamento')).toBeInTheDocument();
    });
  });

  describe('DataTable Keyboard Accessibility', () => {
    const testData = [
      { id: '1', name: 'Equipe Alpha', points: 15 },
      { id: '2', name: 'Equipe Beta', points: 12 },
    ];
    const columns = [
      { accessorKey: 'name' as const, header: 'Equipe' },
      { accessorKey: 'points' as const, header: 'Pontos', isNumeric: true },
    ];

    it('makes interactive rows accessible via keyboard Enter and Space', () => {
      const handleRowClick = vi.fn();
      render(
        <DataTable
          data={testData}
          columns={columns}
          onRowClick={handleRowClick}
        />
      );

      const rows = screen.getAllByRole('button');
      // Cada linha interativa tem role="button"
      expect(rows.length).toBe(2);
      expect(rows[0]).toHaveAttribute('tabindex', '0');

      // Testar disparo com Enter
      fireEvent.keyDown(rows[0], { key: 'Enter' });
      expect(handleRowClick).toHaveBeenCalledWith(testData[0]);

      // Testar disparo com Space
      fireEvent.keyDown(rows[1], { key: ' ' });
      expect(handleRowClick).toHaveBeenCalledWith(testData[1]);
    });
  });

  describe('CompetitionHeader ARIA Tablist', () => {
    const mockCompetition: CompetitionRecord = {
      id: 'comp-1',
      name: 'Campeonato Metropolitano 2026',
      status: 'in-progress',
      modality: 'indoor',
      genderCategory: 'male',
      format: 'groups_and_playoffs',
      playerFormat: '6v6',
      setFormat: 'best_of_3',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    it('renders tabs with role="tablist" and active tab marked with aria-selected="true"', () => {
      const onTabChange = vi.fn();
      render(
        <CompetitionHeader
          competition={mockCompetition}
          activeTab="overview"
          onTabChange={onTabChange}
        />
      );

      const tablist = screen.getByRole('tablist', { name: /abas da competição/i });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(8);

      const overviewTab = screen.getByRole('tab', { name: /visão geral/i });
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');

      const teamsTab = screen.getByRole('tab', { name: /equipes/i });
      expect(teamsTab).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(teamsTab);
      expect(onTabChange).toHaveBeenCalledWith('teams');
    });
  });

  describe('MatchTabsNav ARIA Tablist', () => {
    it('renders match filter tabs with semantic ARIA attributes', () => {
      const onTabChange = vi.fn();
      render(
        <MatchTabsNav
          activeSubTab="mata-mata"
          onTabChange={onTabChange}
        />
      );

      const tablist = screen.getByRole('tablist', { name: /filtro de partidas/i });
      expect(tablist).toBeInTheDocument();

      const mataMataTab = screen.getByRole('tab', { name: /mata-mata/i });
      expect(mataMataTab).toHaveAttribute('aria-selected', 'true');

      const todosTab = screen.getByRole('tab', { name: /todos os jogos/i });
      expect(todosTab).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(todosTab);
      expect(onTabChange).toHaveBeenCalledWith('todos');
    });
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompetitionFormDialog } from '@/components/competition/dialogs/CompetitionFormDialog';
import type { CompetitionRecord, VenueRecord } from '@/types/entities';

describe('CompetitionFormDialog — Integração do Construtor de Fases (Grafo DAG)', () => {
  const mockVenues: VenueRecord[] = [
    {
      id: 'venue-1',
      name: 'Ginásio Poliesportivo Central',
      address: 'Rua Principal, 100',
      courts: ['Quadra 1', 'Quadra 2'],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('1. Renderiza a aba Disputa contendo a Linha do Tempo do Construtor de Fases (abandonando templates estáticos)', async () => {
    render(
      <CompetitionFormDialog
        open={true}
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        modalities={[]}
        venues={mockVenues}
      />
    );

    // Clica na aba Disputa
    const disputaTab = screen.getByRole('tab', { name: /Disputa/i });
    expect(disputaTab).toBeInTheDocument();
    fireEvent.mouseDown(disputaTab, { button: 0 });
    fireEvent.click(disputaTab);

    // Verifica que o Construtor Progressivo está ativo na tela
    await waitFor(() => {
      expect(screen.getByText('Linha do Tempo de Fases da Competição')).toBeInTheDocument();
    });
    expect(screen.getByText(/Modelos Prontos de Formato/i)).toBeInTheDocument();
    expect(screen.getByText(/01 GRUPOS/i)).toBeInTheDocument();
    expect(screen.getByText('Fase de Grupos')).toBeInTheDocument();
    expect(screen.getByText(/02 ELIMINATÓRIA/i)).toBeInTheDocument();
    expect(screen.getByText('Fase Final (Playoffs)')).toBeInTheDocument();

    // Verifica ausência dos antigos controles de templates fixos
    expect(screen.queryByText(/Modelo de Disputa \(Template Oficial\)/i)).not.toBeInTheDocument();
  });

  it('2. Submete a competição anexando o array StageDefinition[] ao payload config.format.stages', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CompetitionFormDialog
        open={true}
        onOpenChange={() => {}}
        onSubmit={handleSubmit}
        modalities={[]}
        venues={mockVenues}
      />
    );

    // Preenche o nome da competição
    const nameInput = screen.getByLabelText(/Nome da Competição \*/i);
    fireEvent.change(nameInput, { target: { value: 'Torneio Aberto Regional 2026' } });

    // Dispara submissão
    const submitBtn = screen.getByRole('button', { name: /Criar Competição/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedRecord: Omit<CompetitionRecord, 'id'> = handleSubmit.mock.calls[0][0];

    // Verifica que campos legados planos NÃO são mais enviados
    expect(submittedRecord.name).toBe('Torneio Aberto Regional 2026');
    expect(submittedRecord.format).toBeUndefined();
    expect(submittedRecord.groupsCount).toBeUndefined();
    expect(submittedRecord.advancingPerGroup).toBeUndefined();

    // Verifica a anexação correta do Grafo de Fases no config
    expect(submittedRecord.config).toBeDefined();
    expect(submittedRecord.config?.format.stages).toBeDefined();
    expect(submittedRecord.config?.format.stages).toHaveLength(2);
    expect(submittedRecord.config?.format.stages?.[0]).toMatchObject({
      order: 1,
      name: 'Fase de Grupos',
      type: 'group-stage',
    });
    expect(submittedRecord.config?.format.stages?.[1]).toMatchObject({
      order: 2,
      name: 'Fase Final (Playoffs)',
      type: 'knockout',
    });
  });
});

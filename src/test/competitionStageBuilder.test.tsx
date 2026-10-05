import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompetitionStageBuilder } from '@/components/competition/format-builder/CompetitionStageBuilder';
import { StageDialog } from '@/components/competition/format-builder/StageDialog';
import type { StageDefinition } from '@/types/competitionConfig';

describe('CompetitionStageBuilder & StageDialog — Construtor Progressivo de Fases (Fase 3 UI)', () => {
  const mockStages: StageDefinition[] = [
    {
      id: 'stg-1',
      order: 1,
      name: 'Classificatória de Grupos',
      type: 'round-robin',
      participantsCount: 8,
      participantsOrigin: 'global',
      groupsCount: 2,
      advancingCount: 4,
    },
    {
      id: 'stg-2',
      order: 2,
      name: 'Semifinais e Final',
      type: 'knockout',
      participantsCount: 4,
      participantsOrigin: 'stage-position',
      advancingCount: 1,
    },
  ];

  it('1. Renderiza a lista de fases com prefixos ordinais padronizados ("01 GRUPOS", "02 ELIMINATÓRIA")', () => {
    render(<CompetitionStageBuilder initialStages={mockStages} />);

    expect(screen.getByText(/01 GRUPOS/i)).toBeInTheDocument();
    expect(screen.getByText('Classificatória de Grupos')).toBeInTheDocument();

    expect(screen.getByText(/02 ELIMINATÓRIA/i)).toBeInTheDocument();
    expect(screen.getByText('Semifinais e Final')).toBeInTheDocument();

    expect(screen.getByText(/Adicionar Fase/i)).toBeInTheDocument();
  });

  it('2. Garante que botões temporários de debug foram removidos do construtor de produção', () => {
    render(<CompetitionStageBuilder initialStages={mockStages} />);

    expect(screen.queryByRole('button', { name: /Debug Payload/i })).not.toBeInTheDocument();
  });

  it('3. Abre o StageDialog com as 3 seções obrigatórias (Identificação, Entrada, Saída/Mecânica)', () => {
    render(
      <StageDialog
        open={true}
        onOpenChange={() => {}}
        stage={mockStages[0]}
        onSave={() => {}}
      />
    );

    // Seção 1: Identificação
    expect(screen.getByText(/1\. Identificação da Fase/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da Fase/i)).toHaveValue('Classificatória de Grupos');

    // Seção 2: Entrada
    expect(screen.getByText(/2\. Fluxo de Entrada de Participantes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantidade de Participantes/i)).toHaveValue(8);
    expect(screen.getByText(/Quantidade de Grupos \/ Chaves/i)).toBeInTheDocument();

    // Seção 3: Saída / Mecânica
    expect(screen.getByText(/3\. Saída e Mecânica de Avanço/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vagas de Avanço/i)).toHaveValue(4);
  });

  it('4. O botão "Salvar Fase" no modal é estilizado com a cor Laranja da marca e formato de pílula', () => {
    render(
      <StageDialog
        open={true}
        onOpenChange={() => {}}
        stage={null}
        onSave={() => {}}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Salvar Fase/i });
    expect(saveBtn).toBeInTheDocument();
    // Verifica a presença do estilo laranja da marca e formato pílula
    expect(saveBtn.className).toContain('bg-[#f59e0b]');
    expect(saveBtn.className).toContain('rounded-full');
    expect(saveBtn.className).toContain('text-white');
  });

  it('5. Permite adicionar nova fase e emite o payload atualizado via onChange', () => {
    const handleChange = vi.fn();
    render(<CompetitionStageBuilder initialStages={mockStages} onChange={handleChange} />);

    const addBtn = screen.getByRole('button', { name: /Adicionar Fase/i });
    fireEvent.click(addBtn);

    // Modal deve estar visível
    const stageNameInput = screen.getByLabelText(/Nome da Fase/i);
    fireEvent.change(stageNameInput, { target: { value: 'Disputa de 3º Lugar' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar Fase/i });
    fireEvent.click(saveBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ order: 1, name: 'Classificatória de Grupos' }),
        expect.objectContaining({ order: 2, name: 'Semifinais e Final' }),
        expect.objectContaining({ order: 3, name: 'Disputa de 3º Lugar' }),
      ])
    );
  });

  it('6. Permite reordenar fases para cima e para baixo preservando a sequência de order', () => {
    const handleChange = vi.fn();
    render(<CompetitionStageBuilder initialStages={mockStages} onChange={handleChange} />);

    // Clica para mover a segunda fase para cima
    const moveUpButtons = screen.getAllByTitle('Mover para cima');
    fireEvent.click(moveUpButtons[1]); // Segundo botão (fase 2)

    expect(handleChange).toHaveBeenCalledWith([
      expect.objectContaining({ order: 1, name: 'Semifinais e Final' }),
      expect.objectContaining({ order: 2, name: 'Classificatória de Grupos' }),
    ]);
  });
});

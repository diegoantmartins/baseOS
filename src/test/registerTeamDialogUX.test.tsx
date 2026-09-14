import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterTeamInCompetitionDialog } from '@/components/competition/dialogs/RegisterTeamInCompetitionDialog';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import * as registrationService from '@/services/registrationService';
import { dataAccess } from '@/services/dataAccess';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/dataAccess', () => ({
  dataAccess: {
    updateCompetition: vi.fn().mockResolvedValue({}),
  },
}));

const mockCompetitionWithDeadline: CompetitionRecord = {
  id: 'comp-1',
  name: 'Copa Regional 2026',
  modality: 'indoor',
  status: 'registration-open',
  format: 'groups',
  playerFormat: '6x6',
  setFormat: 'best-of-3',
  genderCategory: 'male',
  defaultDeadline: '2026-10-31T23:59:59Z',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockCompetitionWithoutDeadline: CompetitionRecord = {
  id: 'comp-no-deadline',
  name: 'Copa Sem Prazo',
  modality: 'indoor',
  status: 'registration-open',
  format: 'groups',
  playerFormat: '6x6',
  setFormat: 'best-of-3',
  genderCategory: 'male',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('RegisterTeamInCompetitionDialog — Melhorias de UX e Resolução de Bloqueio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gera automaticamente a sigla (3 letras) a partir do nome da equipe', () => {
    render(
      <RegisterTeamInCompetitionDialog
        open={true}
        onOpenChange={vi.fn()}
        competition={mockCompetitionWithDeadline}
        availableTeams={[]}
        onSuccess={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/Nome Oficial da Equipe/i);
    const shortInput = screen.getByLabelText(/Sigla \(3 Letras\)/i) as HTMLInputElement;

    // Digita "divoleiu"
    fireEvent.change(nameInput, { target: { value: 'divoleiu' } });

    // A sigla deve ser auto-preenchida com "DIV" (3/3)
    expect(shortInput.value).toBe('DIV');
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('respeita a sigla quando o usuário a edita manualmente', () => {
    render(
      <RegisterTeamInCompetitionDialog
        open={true}
        onOpenChange={vi.fn()}
        competition={mockCompetitionWithDeadline}
        availableTeams={[]}
        onSuccess={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/Nome Oficial da Equipe/i);
    const shortInput = screen.getByLabelText(/Sigla \(3 Letras\)/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'divoleiu' } });
    expect(shortInput.value).toBe('DIV');

    // Usuário edita manualmente para "DVL"
    fireEvent.change(shortInput, { target: { value: 'DVL' } });
    expect(shortInput.value).toBe('DVL');

    // Alterar o nome não deve sobrescrever a sigla editada manualmente
    fireEvent.change(nameInput, { target: { value: 'divoleiu clube' } });
    expect(shortInput.value).toBe('DVL');
  });

  it('exibe campo de definição rápida de prazo quando a competição não possui prazo', () => {
    render(
      <RegisterTeamInCompetitionDialog
        open={true}
        onOpenChange={vi.fn()}
        competition={mockCompetitionWithoutDeadline}
        availableTeams={[]}
        onSuccess={vi.fn()}
      />,
    );

    // Deve exibir o campo de configuração rápida com rótulo
    expect(screen.getByText(/Definir Prazo de Inscrição da Competição/i)).toBeInTheDocument();
    expect(screen.getByText(/Regularização Automática/i)).toBeInTheDocument();
  });

  it('notifica via toast quando o usuário tenta salvar com a sigla incompleta', async () => {
    render(
      <RegisterTeamInCompetitionDialog
        open={true}
        onOpenChange={vi.fn()}
        competition={mockCompetitionWithDeadline}
        availableTeams={[]}
        onSuccess={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/Nome Oficial da Equipe/i);
    const shortInput = screen.getByLabelText(/Sigla \(3 Letras\)/i);
    const managerInput = screen.getByLabelText(/Nome do Responsável \/ Capitão/i);
    const submitBtn = screen.getByRole('button', { name: /Salvar Equipe e Gerar Acesso/i });

    fireEvent.change(nameInput, { target: { value: 'divoleiu' } });
    // Limpa a sigla para forçar erro
    fireEvent.change(shortInput, { target: { value: '' } });
    fireEvent.change(managerInput, { target: { value: 'Diego Antonio Martins' } });

    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('sigla da equipe deve conter exatamente 3 letras'),
    );
  });

  it('regulariza prazo no banco e conclui cadastro com sucesso para competição sem prazo prévio', async () => {
    const registerSpy = vi.spyOn(registrationService, 'registerTeamInCompetition').mockResolvedValue({
      ok: true,
      errors: [],
      isExistingTeamReused: false,
      team: { id: 'team-div', name: 'divoleiu', shortName: 'DIV', modality: 'indoor' } as unknown as TeamRecord,
      competitionTeam: { id: 'ct-div', competitionId: 'comp-no-deadline', teamId: 'team-div' } as unknown as CompetitionTeam,
    });

    const onSuccess = vi.fn();

    render(
      <RegisterTeamInCompetitionDialog
        open={true}
        onOpenChange={vi.fn()}
        competition={mockCompetitionWithoutDeadline}
        availableTeams={[]}
        onSuccess={onSuccess}
      />,
    );

    const nameInput = screen.getByLabelText(/Nome Oficial da Equipe/i);
    const managerInput = screen.getByLabelText(/Nome do Responsável \/ Capitão/i);
    const submitBtn = screen.getByRole('button', { name: /Salvar Equipe e Gerar Acesso/i });

    fireEvent.change(nameInput, { target: { value: 'divoleiu' } });
    fireEvent.change(managerInput, { target: { value: 'Diego Antonio Martins' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Deve ter chamado dataAccess.updateCompetition para gravar o prazo
      expect(dataAccess.updateCompetition).toHaveBeenCalledWith(
        'comp-no-deadline',
        expect.objectContaining({ defaultDeadline: expect.any(String) }),
      );
      // E em seguida chamado o registro da equipe
      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          competitionId: 'comp-no-deadline',
          name: 'divoleiu',
          shortName: 'DIV',
          managerName: 'Diego Antonio Martins',
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

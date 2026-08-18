import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreateMatchForm } from '@/components/match/CreateMatchForm';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';

interface MatchFormData {
  competitionId?: string;
  modality?: string;
  playerFormat?: string;
  setFormat?: string;
  teamAId?: string;
  teamBId?: string;
  round?: number;
  matchNumber?: number;
  venue?: string;
  court?: string;
  date?: string;
  time?: string;
  referee1Id?: string;
  referee2Id?: string;
  scorerId?: string;
  observations?: string;
}

const CreateMatchPage = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: MatchFormData) => {
    try {
      const teams = await dataAccess.listTeams();
      const teamA = teams.find(t => t.id === data.teamAId);
      const teamB = teams.find(t => t.id === data.teamBId);
      const referees = await dataAccess.listReferees();
      await dataAccess.createMatch({
        competitionId: data.competitionId,
        round: data.round,
        matchNumber: data.matchNumber,
        teamAId: data.teamAId,
        teamBId: data.teamBId,
        teamAName: teamA?.name ?? '',
        teamBName: teamB?.name ?? '',
        teamAShortName: teamA?.shortName ?? '',
        teamBShortName: teamB?.shortName ?? '',
        venue: data.venue,
        court: data.court,
        scheduledTime: `${data.date}T${data.time}:00`,
        status: 'scheduled',
        sets: [],
        referees: [
          { role: '1º Árbitro', name: referees.find(r => r.id === data.referee1Id)?.name ?? '' },
          { role: '2º Árbitro', name: referees.find(r => r.id === data.referee2Id)?.name ?? '' },
          { role: 'Apontador', name: referees.find(r => r.id === data.scorerId)?.name ?? '' },
        ],
        observations: data.observations,
      });
      toast.success('Partida agendada com sucesso!', {
        description: 'A partida foi adicionada ao calendário.',
      });
      navigate('/jogos');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao agendar partida.');
    }
  };

  const handleCancel = () => {
    navigate('/jogos');
  };

  return (
    <MainLayout>
      <div className="py-6">
        <CreateMatchForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </MainLayout>
  );
};

export default CreateMatchPage;

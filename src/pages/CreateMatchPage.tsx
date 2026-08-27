import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Volleyball } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
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
  const [searchParams] = useSearchParams();
  const competitionParam = searchParams.get('competition');

  useEffect(() => {
    if (!competitionParam) {
      toast.info('Entre em uma competição para agendar um jogo.');
      navigate('/competicoes', { replace: true });
    }
  }, [competitionParam, navigate]);

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
        description: 'A partida foi adicionada ao calendário da competição.',
      });
      navigate('/competicoes');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao agendar partida.');
    }
  };

  const handleCancel = () => {
    navigate('/competicoes');
  };

  if (!competitionParam) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Volleyball className="w-5 h-5 text-primary" />
              Novo Confronto
            </span>
          }
          description="Agende uma nova partida preenchendo as equipes, rodada, local, horário e equipe de arbitragem."
          secondaryActions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-md"
              onClick={handleCancel}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para Competições
            </Button>
          }
        />

        <CreateMatchForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultCompetitionId={competitionParam}
        />
      </div>
    </MainLayout>
  );
};

export default CreateMatchPage;

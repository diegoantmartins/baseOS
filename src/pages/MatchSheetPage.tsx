import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, MapPin, Volleyball } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MatchSheetInterface } from '@/components/match-sheet/MatchSheetInterface';
import { MatchPdfPreview } from '@/components/match/MatchPdfPreview';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { dataAccess } from '@/services/dataAccess';
import { getMatchRosters } from '@/services/registrationService';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import type { MatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

const MatchSheetPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [teamARoster, setTeamARoster] = useState<CompetitionAthlete[]>([]);
  const [teamBRoster, setTeamBRoster] = useState<CompetitionAthlete[]>([]);
  const [pdfData, setPdfData] = useState<MatchSheetData | null>(null);
  const [loading, setLoading] = useState(Boolean(matchId));
  const [notFound, setNotFound] = useState(false);

  const loadMatch = useCallback(async (id: string) => {
    setLoading(true);
    setNotFound(false);
    const found = await dataAccess.getMatch(id);
    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setMatch(found);
    const competition = await dataAccess.getCompetition(found.competitionId);
    setCompetition(competition);
    const rosters = await getMatchRosters(found.id);
    setTeamARoster(rosters.teamA);
    setTeamBRoster(rosters.teamB);
    setPdfData(await buildMatchSheetData(found, competition, rosters.teamA, rosters.teamB));
    setLoading(false);
  }, []);

  const handlePersist = useCallback(
    async (updates: Partial<MatchRecord>) => {
      if (!match) return;
      const updated = await dataAccess.updateMatch(match.id, updates);
      if (updated) {
        setMatch(updated);
        setPdfData(await buildMatchSheetData(updated, competition, teamARoster, teamBRoster));
      }
    },
    [match, competition, teamARoster, teamBRoster],
  );

  useEffect(() => {
    if (matchId) {
      loadMatch(matchId);
    } else {
      dataAccess.listMatches().then(setMatches);
    }
  }, [matchId, loadMatch]);

  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : notFound ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                <p className="text-muted-foreground">Partida não encontrada.</p>
                <Button variant="outline" onClick={() => navigate('/sumulas')}>
                  Escolher outra partida
                </Button>
              </CardContent>
            </Card>
          ) : match ? (
            <MatchSheetInterface
              modality="indoor"
              format={(competition?.setFormat ?? '3-sets') as '3-sets' | '5-sets'}
              match={match}
              competition={competition}
              teamARoster={teamARoster}
              teamBRoster={teamBRoster}
              onPersist={handlePersist}
            />
          ) : (
            <MatchSelector matches={matches} onSelect={id => navigate(`/sumulas/${id}`)} />
          )}
        </div>
        <div className="lg:col-span-1">
          <MatchPdfPreview matchData={pdfData ?? undefined} matchId={match?.id} />
        </div>
      </div>
    </MainLayout>
  );
};

function MatchSelector({ matches, onSelect }: { matches: MatchRecord[]; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-display font-bold">Súmula Digital</h1>
        <p className="text-muted-foreground">Selecione uma partida para abrir a súmula com os atletas inscritos.</p>
      </div>
      {matches.map(match => (
        <Card key={match.id} className="card-elevated cursor-pointer hover:shadow-lg transition-all">
          <CardContent
            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            onClick={() => onSelect(match.id)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indoor/10 text-indoor">
                <Volleyball className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">
                  {match.teamAName} <span className="text-muted-foreground">vs</span> {match.teamBName}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(match.scheduledTime).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {match.venue}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={match.status === 'completed' ? 'outline' : match.status === 'scheduled' ? 'secondary' : 'default'}>
                {match.status === 'completed' ? 'Finalizado' : match.status === 'scheduled' ? 'Agendado' : 'Em andamento'}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
      {matches.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Nenhuma partida cadastrada.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// PDF preview com os dados reais da partida (shape do MatchPdfPreview)

export default MatchSheetPage;

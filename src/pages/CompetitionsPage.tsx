import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { TournamentBracket } from '@/components/competition/TournamentBracket';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, GitBranch, ListOrdered, UserPlus, ChevronRight, Info } from 'lucide-react';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup } from '@/services/standingsService';
import { GENDER_CATEGORY_LABELS } from '@/types/registration';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  registration: 'Inscrições',
  'in-progress': 'Em Andamento',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
  draft: 'outline',
  registration: 'secondary',
  'in-progress': 'default',
  completed: 'success',
  cancelled: 'outline',
};

const CompetitionsPage = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listMatches(),
    ]).then(([comps, teams, matches]) => {
      setCompetitions(comps);
      setTeams(teams);
      setMatches(matches);
      setSelectedId(comps[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  const selected = competitions.find(c => c.id === selectedId) ?? null;

  const standings = useMemo(() => {
    if (!selected) return [];
    const competitionMatches = matches.filter(m => m.competitionId === selected.id);
    const registrations: { team: TeamRecord; groupName?: string }[] = [];
    for (const match of competitionMatches) {
      for (const teamId of [match.teamAId, match.teamBId]) {
        const team = teams.find(t => t.id === teamId);
        if (team && !registrations.some(r => r.team.id === team.id)) {
          registrations.push({ team, groupName: selected.groupName });
        }
      }
    }
    return computeStandingsByGroup(registrations, competitionMatches);
  }, [selected, teams, matches]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Campeonatos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie competições, inscrições por equipe, chaveamentos e classificações
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6 items-start">
          {/* Lista de competições */}
          <Card className="card-elevated">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                Competições
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {competitions.map(competition => (
                <button
                  key={competition.id}
                  type="button"
                  onClick={() => setSelectedId(competition.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between gap-2',
                    selectedId === competition.id ? 'bg-accent/10 border border-accent/30' : 'hover:bg-muted/50',
                  )}
                >
                  <div>
                    <p className="font-semibold">{competition.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {GENDER_CATEGORY_LABELS[competition.genderCategory]} · {competition.playerFormat} ·{' '}
                      {competition.modality === 'indoor' ? 'Quadra' : 'Praia'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Detalhe da competição */}
          {selected ? (
            <Card className="card-elevated">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-display">{selected.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                      <Badge variant="outline">{GENDER_CATEGORY_LABELS[selected.genderCategory]}</Badge>
                      <Badge variant="outline">{selected.format?.replace(/-/g, ' ')}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="accent"
                    className="gap-2"
                    onClick={() => navigate(`/competicoes/${selected.id}/inscricoes`)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Inscrições por Equipe
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="standings" className="space-y-6">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="standings" className="gap-2">
                      <ListOrdered className="w-4 h-4" />
                      Classificação
                    </TabsTrigger>
                    <TabsTrigger value="bracket" className="gap-2">
                      <GitBranch className="w-4 h-4" />
                      Chaveamento
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="standings">
                    <div className="space-y-6">
                      {standings.map(group => (
                        <div key={group.groupName} className="space-y-2">
                          <h3 className="text-sm font-semibold text-muted-foreground">{group.groupName}</h3>
                          <StandingsTable standings={group.standings} title={`Classificação - ${group.groupName}`} />
                        </div>
                      ))}
                      {standings.length === 0 && (
                        <Card>
                          <CardContent className="p-10 text-center text-muted-foreground">
                            Sem partidas finalizadas nesta competição.
                          </CardContent>
                        </Card>
                      )}
                      <ClassificationCriteriaCard />
                    </div>
                  </TabsContent>

                  <TabsContent value="bracket">
                    <TournamentBracket title={`Chaveamento - ${selected.name}`} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Nenhuma competição cadastrada.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

const CRITERIA = [
  { order: '1º', title: 'Maior número de pontos', description: 'Soma de pontos conquistados (3 pts por vitória 3-0/3-1; 2 pts por vitória 3-2; 1 pt por derrota 2-3; 0 pt por derrota 0-3/1-3).' },
  { order: '2º', title: 'Confronto direto', description: 'Vence a equipe que venceu o jogo entre elas. Se 1x1 ou empate com 3+ equipes, segue o critério seguinte.' },
  { order: '3º', title: 'Set Average', description: 'Sets vencidos ÷ sets perdidos. Maior índice vence.' },
  { order: '4º', title: 'Pontos Average', description: 'Pontos marcados ÷ pontos sofridos. Maior índice vence.' },
  { order: '5º', title: 'Saldo de pontos', description: 'Pontos marcados − pontos sofridos. Maior saldo vence.' },
  { order: '6º', title: 'Maior número de pontos marcados', description: 'Maior total de pontos marcados na fase classificatória.' },
  { order: '7º', title: 'Sorteio', description: 'Igualdade absoluta após todos os critérios: sorteio pela organização.' },
];

function ClassificationCriteriaCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Info className="w-4 h-4 text-accent" />
            Critérios de Classificação e Desempate
          </CardTitle>
          <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {CRITERIA.map(criterion => (
            <div key={criterion.order} className="flex gap-3 text-sm">
              <span className="font-bold text-accent shrink-0">{criterion.order}</span>
              <div>
                <p className="font-semibold">{criterion.title}</p>
                <p className="text-muted-foreground text-xs">{criterion.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default CompetitionsPage;

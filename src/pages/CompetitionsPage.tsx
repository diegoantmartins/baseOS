import { MainLayout } from '@/components/layout/MainLayout';
import { TournamentBracket } from '@/components/competition/TournamentBracket';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, GitBranch, ListOrdered } from 'lucide-react';

const CompetitionsPage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Campeonatos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie competições, chaveamentos e classificações
          </p>
        </div>

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
            <StandingsTable title="Superliga Feminina 2024/25" />
          </TabsContent>

          <TabsContent value="bracket">
            <TournamentBracket title="Playoffs - Superliga Feminina" />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default CompetitionsPage;

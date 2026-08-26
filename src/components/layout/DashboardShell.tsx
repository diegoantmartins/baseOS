import React, { ReactNode } from 'react';
import {
  Users,
  Calendar,
  ClipboardList,
  Plus,
  FileSpreadsheet,
  TrendingUp,
  Bell,
  Search,
} from 'lucide-react';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface DashboardShellProps {
  children?: ReactNode;
  tournamentName?: string;
  category?: string;
  stats?: {
    registeredTeams?: number;
    matchesToday?: number;
    pendingScoresheets?: number;
  };
  onCreateTournament?: () => void;
  onGenerateReport?: () => void;
}

export function DashboardShell({
  children,
  tournamentName = 'Superliga Nacional e Taça Brasil 2026',
  category = 'Voleibol de Quadra · Masculino Especial',
  stats = {
    registeredTeams: 32,
    matchesToday: 14,
    pendingScoresheets: 3,
  },
  onCreateTournament,
  onGenerateReport,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased w-full max-w-full overflow-x-hidden">
      {/* Topbar fixa */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-zinc-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <BaseOsLogo size="md" showSubtitle />
          </div>

          {/* Busca & controles rápidos */}
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar torneio, equipe, súmula..."
                className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-zinc-800/60 text-muted-foreground hover:text-foreground" aria-label="Notificações">
              <Bell className="w-3.5 h-3.5" />
            </Button>

            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium flex items-center justify-center text-[10px]">
                OP
              </div>
              <div className="hidden lg:block text-left leading-none">
                <span className="text-xs font-medium text-foreground block">Operador Master</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">Gestão Geral</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cabeçalho da página + ação primária única */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Visão Geral do Torneio
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {tournamentName} — {category}. Monitoramento de chaves, confrontos homologados e súmulas.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateReport}
              className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium text-zinc-300 hover:text-foreground"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
              Exportar Relatório
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={onCreateTournament}
              className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Torneio
            </Button>
          </div>
        </div>

        {/* KPIs densos e monocromáticos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="hover-raise border-border bg-card shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Equipes Inscritas
                </p>
                <div className="text-xl font-semibold tabular-nums text-foreground">
                  {stats.registeredTeams}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <TrendingUp className="w-3 h-3 text-zinc-400" />
                  <span>+4 validadas nas últimas 24h</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-zinc-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-raise border-border bg-card shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Jogos Hoje
                </p>
                <div className="text-xl font-semibold tabular-nums text-foreground">
                  {stats.matchesToday}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>6 em andamento · 8 agendados</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-zinc-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-raise border-border bg-card shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Súmulas Pendentes
                </p>
                <div className="text-xl font-semibold tabular-nums text-foreground">
                  {stats.pendingScoresheets}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>2 prontas para homologação</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4 text-zinc-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {children && <div className="pt-2">{children}</div>}
      </main>

      {/* Rodapé discreto */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BaseOsLogo size="sm" showSubtitle={false} />
            <span className="text-[11px] text-muted-foreground">— Sistema Operacional de Gestão Esportiva</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DashboardShell;

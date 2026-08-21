import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  ClipboardList,
  Plus,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  ShieldCheck,
  Bell,
  Search,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  tournamentName = 'Superliga Nacional & Taça Brasil 2026',
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-amber-500 selection:text-zinc-950 w-full max-w-full overflow-x-hidden">
      {/* Topbar Fixo com BaseOsLogo */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Version Tag */}
          <div className="flex items-center gap-3">
            <BaseOsLogo size="md" showSubtitle />
            <Badge
              variant="outline"
              className="hidden sm:inline-flex border-cyan-500/30 text-cyan-400 bg-cyan-950/20 text-[10px] uppercase font-mono tracking-widest px-2 py-0.5"
            >
              Dark Tech OS
            </Badge>
          </div>

          {/* Search bar & Quick controls */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar torneio, equipe, súmula..."
                className="pl-9 h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500"
              />
            </div>

            <Button variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-100">
              <Bell className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-xs">
                OP
              </div>
              <div className="hidden lg:block text-left leading-none">
                <span className="font-semibold text-zinc-200 block text-xs">Operador Master</span>
                <span className="text-[10px] text-zinc-500">Gestão Geral</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Cabeçalho da Página (Display em Space Grotesk) & Painel de Ações */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>PAINEL DE CONTROLE OPERACIONAL</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{category}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-zinc-100 tracking-tight">
              Visão Geral do Torneio
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {tournamentName} — Monitoramento de chaves eliminatórias, confrontos homologados e auditoria digital de súmulas.
            </p>
          </div>

          {/* Painel de Ações: Botão Primário (amber-500) e Secundário (cyan-400 outline) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Button
              variant="outline"
              size="default"
              onClick={onGenerateReport}
              className="gap-2 font-medium"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              Exportar Relatório Tech
            </Button>

            <Button
              variant="default"
              size="default"
              onClick={onCreateTournament}
              className="gap-2 font-bold shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              Criar Novo Torneio
            </Button>
          </div>
        </div>

        {/* 3 Cards de Estatísticas com Ícones cyan-400 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Equipes Inscritas */}
          <Card className="hover:border-zinc-700/80 transition-all group">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
                  Equipes Inscritas
                </p>
                <div className="text-3xl font-display font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                  {stats.registeredTeams}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="text-emerald-400 font-semibold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5 inline" /> +4
                  </span>
                  <span>validadas nas últimas 24h</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Jogos Hoje */}
          <Card className="hover:border-zinc-700/80 transition-all group">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
                  Jogos Hoje
                </p>
                <div className="text-3xl font-display font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                  {stats.matchesToday}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="text-amber-400 font-semibold">6 em andamento</span>
                  <span>· 8 agendados</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                <Calendar className="w-6 h-6 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Súmulas Pendentes */}
          <Card className="hover:border-zinc-700/80 transition-all group">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
                  Súmulas Pendentes
                </p>
                <div className="text-3xl font-display font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                  {stats.pendingScoresheets}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="text-cyan-400 font-semibold flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-0.5 inline" /> 2 prontas
                  </span>
                  <span>para homologação</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                <ClipboardList className="w-6 h-6 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children Slot (Para renderização de tabelas, chaveamento e páginas) */}
        {children && <div className="pt-2">{children}</div>}
      </main>

      {/* Footer Dark Tech */}
      <footer className="border-t border-zinc-800/80 py-4 bg-zinc-950 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BaseOsLogo size="sm" showSubtitle={false} />
            <span>— Sistema Operacional de Gestão Esportiva</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-600">
            ENGINE v2.4 · SECURE DIGITAL SCORESHEETS · DARK TECH
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DashboardShell;

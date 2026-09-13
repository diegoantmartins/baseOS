/**
 * DelegationReportView.tsx
 *
 * Componente de visualização nativa em HTML-First para o Relatório Oficial de
 * Delegações & Responsáveis da Competição (BaseOS Fase 7.5 Prompt 7).
 *
 * Apresenta para cada equipe da competição:
 * - Identificação cadastral e status da inscrição (Aprovada, Pendente, etc.)
 * - Gestor / Responsável pela equipe (nome, e-mail, telefone)
 * - Comissão Técnica declarada (Técnico, Auxiliar, Prep. Físico, Médico)
 * - Elenco oficial de atletas com numeração de camisa, posição, documento e função
 * - Métricas consolidadas e filtros em tempo real
 *
 * Responsividade completa: Tabela em desktop e cards em mobile.
 */

import React, { useState, useMemo } from 'react';
import type { DelegationReportData } from '@/lib/pdf/types';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Lock,
  Phone,
  Mail,
  User,
  Activity,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DelegationReportViewProps {
  data: DelegationReportData;
  className?: string;
  initialTeamFilter?: string;
  initialStatusFilter?: 'all' | 'approved' | 'pending' | 'draft';
}

export function DelegationReportView({
  data,
  className = '',
  initialTeamFilter = 'all',
  initialStatusFilter = 'all',
}: DelegationReportViewProps) {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(initialTeamFilter);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtra as equipes com base nos filtros selecionados
  const filteredTeams = useMemo(() => {
    return data.teams.filter((team) => {
      // 1. Filtro por equipe
      if (selectedTeamFilter !== 'all' && team.teamId !== selectedTeamFilter) {
        return false;
      }

      // 2. Filtro por status
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'approved' && team.rawStatus !== 'approved') return false;
        if (
          selectedStatusFilter === 'pending' &&
          team.rawStatus !== 'pending' &&
          team.rawStatus !== 'invited'
        ) {
          return false;
        }
        if (
          selectedStatusFilter === 'draft' &&
          team.rawStatus !== 'draft' &&
          team.rawStatus !== 'in_progress'
        ) {
          return false;
        }
      }

      // 3. Busca textual
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const matchTeam = team.teamName.toLowerCase().includes(query);
        const matchShort = (team.teamShortName || '').toLowerCase().includes(query);
        const matchCity = (team.city || '').toLowerCase().includes(query);
        const matchManager = (team.managerName || '').toLowerCase().includes(query);
        const matchCoach = (team.coachName || '').toLowerCase().includes(query);
        const matchAthlete = team.athletes.some(
          (a) =>
            a.name.toLowerCase().includes(query) ||
            (a.documentNumber || '').toLowerCase().includes(query) ||
            (a.jerseyNumber != null && a.jerseyNumber.toString() === query),
        );

        if (!matchTeam && !matchShort && !matchCity && !matchManager && !matchCoach && !matchAthlete) {
          return false;
        }
      }

      return true;
    });
  }, [data.teams, selectedTeamFilter, selectedStatusFilter, searchQuery]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="delegation-report-view">
      {/* 1. Métricas Operacionais Consolidadas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total de Equipes */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Delegações</span>
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.totalTeams}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {data.metrics.approvedTeams} homologadas ({Math.round((data.metrics.approvedTeams / (data.metrics.totalTeams || 1)) * 100)}%)
          </span>
        </div>

        {/* Atletas Inscritos */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Atletas Inscritos</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.totalAthletes}
          </p>
          <span className="text-[10px] text-blue-400/90 font-medium block">
            Elencos oficiais
          </span>
        </div>

        {/* Inscrições Aprovadas */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Aprovadas</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.approvedTeams}
          </p>
          <span className="text-[10px] text-emerald-400/90 font-medium block">
            Elegíveis para os jogos
          </span>
        </div>

        {/* Gestores / Responsáveis Declarados */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Responsáveis</span>
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.teamsWithManager}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            Contatos cadastrados
          </span>
        </div>

        {/* Treinadores Registrados */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Comissão / Técnicos</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.teamsWithCoach}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            Técnicos informados
          </span>
        </div>
      </div>

      {/* 2. Barra de Filtros Operacionais */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Relação de Delegações & Integrantes
            </h3>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 font-mono">
              {filteredTeams.length} {filteredTeams.length === 1 ? 'equipe' : 'equipes'}
            </Badge>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 sm:max-w-xl justify-end">
            {/* Filtro por Equipe */}
            <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
              <SelectTrigger className="w-full sm:w-44 h-8 text-xs bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Todas as equipes" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 max-h-56">
                <SelectItem value="all" className="text-xs">
                  Todas as Equipes
                </SelectItem>
                {data.teams.map((t) => (
                  <SelectItem key={t.teamId} value={t.teamId} className="text-xs">
                    {t.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Situação da Inscrição */}
            <Select
              value={selectedStatusFilter}
              onValueChange={(v) => setSelectedStatusFilter(v as 'all' | 'approved' | 'pending' | 'draft')}
            >
              <SelectTrigger className="w-full sm:w-36 h-8 text-xs bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                <SelectItem value="all" className="text-xs">
                  Todas as Situações
                </SelectItem>
                <SelectItem value="approved" className="text-xs">
                  Aprovadas
                </SelectItem>
                <SelectItem value="pending" className="text-xs">
                  Pendentes
                </SelectItem>
                <SelectItem value="draft" className="text-xs">
                  Rascunho
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Busca textual */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar equipe, atleta, técnico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lista de Delegações por Equipe */}
      {filteredTeams.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
          <Shield className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Nenhuma delegação encontrada</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não há equipes ou atletas correspondentes aos filtros selecionados nesta competição.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTeams.map((team) => {
            const isApproved = team.rawStatus === 'approved';
            const isPending = team.rawStatus === 'pending';

            return (
              <div
                key={team.competitionTeamId}
                data-testid={`delegation-card-${team.teamId}`}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm space-y-4 p-4 sm:p-5"
              >
                {/* Cabeçalho da Equipe e Responsáveis */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border">
                  {/* Identidade da Equipe */}
                  <div className="flex items-center gap-3">
                    {team.teamLogoUrl ? (
                      <img
                        src={team.teamLogoUrl}
                        alt={team.teamName}
                        className="w-12 h-12 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0 font-mono">
                        {team.teamShortName || team.teamName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">{team.teamName}</h4>
                        {team.teamShortName && (
                          <span className="text-xs text-muted-foreground font-mono">
                            [{team.teamShortName}]
                          </span>
                        )}
                        <Badge
                          variant={isApproved ? 'default' : isPending ? 'secondary' : 'outline'}
                          className={`text-[10px] font-semibold h-5 ${
                            isApproved
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                              : isPending
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {team.registrationStatus}
                        </Badge>
                        {team.isLocked && (
                          <Badge variant="outline" className="text-[9px] gap-1 h-5 text-zinc-400 border-zinc-800">
                            <Lock className="w-2.5 h-2.5" /> Bloqueada
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground pt-0.5">
                        {team.city ? `${team.city}${team.state ? ` - ${team.state}` : ''}` : 'Cidade não informada'}
                        {team.modality ? ` · Modalidade: ${team.modality}` : ''}
                        {' · '}
                        <span className="font-semibold text-foreground font-mono">
                          {team.athleteCount} {team.athleteCount === 1 ? 'atleta inscrito' : 'atletas inscritos'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bloco de Gestor & Comissão Técnica */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto text-xs bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
                    {/* Responsável / Gestor */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-400" />
                        Gestor / Responsável
                      </span>
                      <p className="font-semibold text-foreground">
                        {team.managerName || <span className="text-muted-foreground italic font-normal">Não informado</span>}
                      </p>
                      <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                        {team.managerEmail && (
                          <span className="flex items-center gap-1 truncate" title={team.managerEmail}>
                            <Mail className="w-2.5 h-2.5 shrink-0" /> {team.managerEmail}
                          </span>
                        )}
                        {team.managerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 shrink-0" /> {team.managerPhone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comissão Técnica */}
                    <div className="space-y-0.5 sm:border-l sm:border-zinc-800 sm:pl-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        Comissão Técnica
                      </span>
                      <p className="font-semibold text-foreground">
                        {team.coachName ? `Técnico: ${team.coachName}` : <span className="text-muted-foreground italic font-normal">Sem técnico cadastrado</span>}
                      </p>
                      <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                        {team.assistantCoach && <span>Aux: {team.assistantCoach}</span>}
                        {team.physicalTrainer && <span>Prep: {team.physicalTrainer}</span>}
                        {team.doctor && <span>Médico: {team.doctor}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Elenco em Desktop */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs" aria-label={`Elenco de ${team.teamName}`}>
                    <thead className="bg-zinc-900/80 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      <tr>
                        <th scope="col" className="py-2 px-3 w-14 text-center font-mono">Nº</th>
                        <th scope="col" className="py-2 px-3">Nome do Atleta</th>
                        <th scope="col" className="py-2 px-3 w-36">Posição</th>
                        <th scope="col" className="py-2 px-3 w-36 font-mono">Documento</th>
                        <th scope="col" className="py-2 px-3 w-32 text-center">Função na Equipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {team.athletes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-muted-foreground text-xs italic">
                            Nenhum atleta vinculado a esta delegação até o momento.
                          </td>
                        </tr>
                      ) : (
                        team.athletes.map((ath, idx) => (
                          <tr
                            key={ath.athleteId}
                            className={`hover:bg-zinc-900/40 transition-colors ${
                              idx % 2 === 1 ? 'bg-zinc-900/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                              {ath.jerseyNumber != null ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                                  #{ath.jerseyNumber}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic font-normal">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <span>{ath.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{ath.position}</td>
                            <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                              {ath.documentNumber || '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {ath.isCaptain && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold font-mono"
                                    title="Capitão da Equipe"
                                  >
                                    (C) Capitão
                                  </span>
                                )}
                                {ath.isLibero && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold font-mono"
                                    title="Líbero"
                                  >
                                    (L) Líbero
                                  </span>
                                )}
                                {!ath.isCaptain && !ath.isLibero && (
                                  <span className="text-[11px] text-muted-foreground">Atleta</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cards de Elenco em Mobile */}
                <div className="md:hidden space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
                    Atletas da Delegação ({team.athletes.length})
                  </div>
                  {team.athletes.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground text-xs italic bg-zinc-900/40 rounded-lg border border-border">
                      Nenhum atleta inscrito nesta equipe.
                    </div>
                  ) : (
                    team.athletes.map((ath) => (
                      <div
                        key={ath.athleteId}
                        className="p-2.5 rounded-lg bg-zinc-900/40 border border-border space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {ath.jerseyNumber != null && (
                              <span className="font-mono font-bold text-amber-400 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700 text-[11px]">
                                #{ath.jerseyNumber}
                              </span>
                            )}
                            <span className="font-semibold text-foreground">{ath.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {ath.isCaptain && (
                              <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[8px] font-bold font-mono">
                                CAP
                              </span>
                            )}
                            {ath.isLibero && (
                              <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold font-mono">
                                LÍB
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>{ath.position}</span>
                          {ath.documentNumber && <span className="font-mono">Doc: {ath.documentNumber}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

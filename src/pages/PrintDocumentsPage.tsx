import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dataAccess } from '@/services/dataAccess';
import { loadMatchContext } from '@/services/documentEditorService';
import { MatchDocumentsPrint, type MatchPrintData } from '@/components/match/MatchDocumentsPrint';
import type { MatchRecord } from '@/types/entities';

const SAMPLE_MATCH_DATA: MatchPrintData = {
  competitionName: 'Copa Toledo de Voleibol 2026',
  category: 'Adulto Especial',
  genderCategory: 'Masculino',
  matchNumber: '01',
  phase: 'Fase de Grupos',
  round: '1',
  date: '22/08/2026',
  time: '14:20',
  venue: 'Ginásio Municipal de Esportes',
  court: 'Quadra 1',
  city: 'Toledo / PR',
  teamA: {
    name: 'Osasco Voleibol',
    shortName: 'OSA',
    coach: 'Luizomar de Moura',
    assistantCoach: 'Jefferson Arosti',
    players: [
      { number: 1, name: 'Lucas Silva', isCaptain: true },
      { number: 2, name: 'Gabriel Santos' },
      { number: 3, name: 'Rafael Oliveira' },
      { number: 4, name: 'Matheus Costa' },
      { number: 5, name: 'João Pedro Alves' },
      { number: 6, name: 'Thiago Almeida' },
      { number: 7, name: 'Bruno Rodrigues' },
      { number: 8, name: 'Felipe Cardoso' },
      { number: 9, name: 'André Pereira' },
      { number: 10, name: 'Diego Martins' },
      { number: 11, name: 'Vitor Hugo' },
      { number: 12, name: 'Caio Rocha' },
    ],
    liberos: [
      { number: 16, name: 'Maique Nascimento', isLibero: true },
      { number: 18, name: 'Alexandre Souza', isLibero: true },
    ],
  },
  teamB: {
    name: 'Minas Tênis Clube',
    shortName: 'MIN',
    coach: 'Nicola Negro',
    assistantCoach: 'Guilherme Novaes',
    players: [
      { number: 1, name: 'João Pedro Alves' },
      { number: 2, name: 'Thiago Almeida' },
      { number: 3, name: 'Bruno Rodrigues' },
      { number: 4, name: 'Felipe Cardoso' },
      { number: 5, name: 'André Pereira' },
      { number: 6, name: 'Diego Martins' },
      { number: 7, name: 'Vitor Hugo', isCaptain: true },
      { number: 8, name: 'Caio Rocha' },
      { number: 9, name: 'Rodrigo Nunes' },
      { number: 10, name: 'Paulo Henrique' },
      { number: 11, name: 'Marcos Vinicius' },
      { number: 12, name: 'Eduardo Lima' },
    ],
    liberos: [
      { number: 17, name: 'Lukinha', isLibero: true },
      { number: 19, name: 'Bernardo Lima', isLibero: true },
    ],
  },
  sets: [
    { setNumber: 1, scoreA: 25, scoreB: 22, duration: '24 min' },
    { setNumber: 2, scoreA: 20, scoreB: 25, duration: '28 min' },
    { setNumber: 3, scoreA: 25, scoreB: 19, duration: '22 min' },
  ],
  referees: [
    { role: '1º Árbitro', name: 'Paulo Silva (Internacional)' },
    { role: '2º Árbitro', name: 'Marcos Souza (Nacional)' },
    { role: 'Apontador', name: 'Carlos Mendes (Regional)' },
  ],
  observations: 'Partida realizada com transmissão oficial ao vivo.',
  winnerName: 'Osasco Voleibol',
};

export function PrintDocumentsPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId || '');
  const [matchData, setMatchData] = useState<MatchPrintData>(SAMPLE_MATCH_DATA);
  const [docFilter, setDocFilter] = useState<'all' | 'sumula-3' | 'sumula-5' | 'ordem-saque'>('all');

  useEffect(() => {
    dataAccess.listMatches().then(list => {
      setMatches(list);
      setSelectedMatchId(prev => (prev || (list.length > 0 ? list[0].id : '')));
    });
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;
    loadMatchData(selectedMatchId);
  }, [selectedMatchId]);

  const loadMatchData = async (mId: string) => {
    try {
      const ctx = await loadMatchContext(mId);
      if (!ctx) return;

      const m = ctx.match;
      const tA = ctx.teamA;
      const tB = ctx.teamB;

      const rosterA = (ctx.rosterA || []).map((a, i) => ({
        number: a.jerseyNumber !== undefined ? a.jerseyNumber : i + 1,
        name: a.name,
        isCaptain: a.isCaptain,
        isLibero: a.isLibero,
      }));

      const rosterB = (ctx.rosterB || []).map((a, i) => ({
        number: a.jerseyNumber !== undefined ? a.jerseyNumber : i + 1,
        name: a.name,
        isCaptain: a.isCaptain,
        isLibero: a.isLibero,
      }));

      const libA = rosterA.filter(a => a.isLibero);
      const libB = rosterB.filter(a => a.isLibero);

      const setsData = (m.sets || []).map(s => ({
        setNumber: s.setNumber,
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        duration: '',
      }));

      const winnerTeam = m.winnerId === m.teamAId ? m.teamAName : m.winnerId === m.teamBId ? m.teamBName : undefined;

      setMatchData({
        competitionName: ctx.competitionName || 'Competição Oficial',
        category: ctx.competitionCategory || 'Adulto Especial',
        genderCategory: ctx.gender === 'female' ? 'Feminino' : ctx.gender === 'male' ? 'Masculino' : 'Misto',
        matchNumber: m.matchNumber ? String(m.matchNumber).padStart(2, '0') : '01',
        phase: m.phase || 'Fase de Grupos',
        round: String(m.round || 1),
        date: m.scheduledTime ? new Date(m.scheduledTime).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        time: m.scheduledTime ? new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '19:00',
        venue: m.venue || 'Ginásio Municipal',
        court: m.court || 'Quadra Principal',
        city: 'Toledo / PR',
        teamA: {
          name: m.teamAName || 'Equipe 1',
          shortName: m.teamAShortName,
          coach: tA?.coachName,
          assistantCoach: '',
          players: rosterA,
          liberos: libA,
        },
        teamB: {
          name: m.teamBName || 'Equipe 2',
          shortName: m.teamBShortName,
          coach: tB?.coachName,
          assistantCoach: '',
          players: rosterB,
          liberos: libB,
        },
        sets: setsData,
        referees: m.referees || [],
        observations: m.observations || '',
        winnerName: winnerTeam,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-4 print:p-0 print:bg-white print:text-black">
      {/* Barra de Ações Superior (print:hidden) */}
      <div className="max-w-[297mm] mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-lg print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <span className="text-xs font-black text-teal-400 uppercase tracking-wider">
            Módulo de Impressão de Documentos (HTML-to-Print)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMatchId}
            onChange={e => setSelectedMatchId(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">-- Partida de Exemplo --</option>
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                Jogo #{m.matchNumber || '?'}: {m.teamAName} vs {m.teamBName}
              </option>
            ))}
          </select>

          <select
            value={docFilter}
            onChange={e => setDocFilter(e.target.value as 'all' | 'sumula-3' | 'sumula-5' | 'ordem-saque')}
            className="text-xs bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Todos os 3 Documentos</option>
            <option value="sumula-3">1. Súmula 3 Sets</option>
            <option value="sumula-5">2. Súmula 5 Sets</option>
            <option value="ordem-saque">3. Fichas de Ordem de Saque</option>
          </select>

          <Button
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir / Gerar PDF
          </Button>
        </div>
      </div>

      {/* Renderização do Componente de Impressão */}
      <MatchDocumentsPrint matchData={matchData} documentType={docFilter} />
    </div>
  );
}

export default PrintDocumentsPage;

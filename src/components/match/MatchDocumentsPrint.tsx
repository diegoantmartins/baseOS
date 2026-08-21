// =====================================================================
// MatchDocumentsPrint — Módulo Oficial de Impressão "HTML-to-Print"
//
// Componente puramente visual (layout de impressão A4) que renderiza:
// 1. Súmula Oficial de 3 Sets (A4 Paisagem)
// 2. Súmula Oficial de 5 Sets (A4 Paisagem)
// 3. Fichas de Ordem de Saque / Posição (8 Filipetas A4 Paisagem)
//
// Preenchido automaticamente com a prop `matchData`. Campos vazios
// recebem linhas e espaços formatados para escrita manual à caneta.
// =====================================================================

import React from 'react';

export interface MatchPrintAthlete {
  number?: number | string;
  name: string;
  isCaptain?: boolean;
  isLibero?: boolean;
  position?: string;
}

export interface MatchPrintTeam {
  name: string;
  shortName?: string;
  city?: string;
  coach?: string;
  assistantCoach?: string;
  players: MatchPrintAthlete[];
  liberos?: MatchPrintAthlete[];
}

export interface MatchPrintData {
  competitionName: string;
  category?: string;
  genderCategory?: string;
  matchNumber?: number | string;
  phase?: string;
  groupName?: string;
  round?: number | string;
  date?: string;
  time?: string;
  venue?: string;
  court?: string;
  city?: string;
  teamA: MatchPrintTeam;
  teamB: MatchPrintTeam;
  sets?: Array<{
    setNumber: number;
    scoreA?: number | string;
    scoreB?: number | string;
    duration?: string;
    lineupA?: string[];
    lineupB?: string[];
  }>;
  referees?: Array<{ role: string; name: string }>;
  observations?: string;
  winnerName?: string;
}

interface Props {
  matchData: MatchPrintData;
  documentType?: 'all' | 'sumula-3' | 'sumula-5' | 'ordem-saque';
}

export const MatchDocumentsPrint: React.FC<Props> = ({ matchData, documentType = 'all' }) => {
  return (
    <div className="match-documents-print bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900 font-sans">
      {/* 1. SÚMULA DE 3 SETS (A4 PAISAGEM) */}
      {(documentType === 'all' || documentType === 'sumula-3') && (
        <ThreeSetsScoresheet data={matchData} />
      )}

      {/* 2. SÚMULA DE 5 SETS (A4 PAISAGEM) */}
      {(documentType === 'all' || documentType === 'sumula-5') && (
        <FiveSetsScoresheet data={matchData} />
      )}

      {/* 3. FICHAS DE ORDEM DE SAQUE (8 FILIPETAS A4 PAISAGEM) */}
      {(documentType === 'all' || documentType === 'ordem-saque') && (
        <ServeOrderSlipsSheet data={matchData} />
      )}

      {/* Estilos Globais de Impressão */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-a4-landscape {
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
};

// =====================================================================
// DOCUMENTO 1: SÚMULA OFICIAL DE 3 SETS (A4 PAISAGEM)
// =====================================================================
const ThreeSetsScoresheet: React.FC<{ data: MatchPrintData }> = ({ data }) => {
  const regularA = (data.teamA.players || []).filter(p => !p.isLibero).slice(0, 12);
  const regularB = (data.teamB.players || []).filter(p => !p.isLibero).slice(0, 12);
  const liberosA = (data.teamA.liberos || data.teamA.players?.filter(p => p.isLibero) || []).slice(0, 2);
  const liberosB = (data.teamB.liberos || data.teamB.players?.filter(p => p.isLibero) || []).slice(0, 2);

  const ref1 = data.referees?.find(r => r.role.includes('1') || r.role.toLowerCase().includes('primeiro'))?.name;
  const ref2 = data.referees?.find(r => r.role.includes('2') || r.role.toLowerCase().includes('segundo'))?.name;
  const scorer = data.referees?.find(r => r.role.toLowerCase().includes('pont') || r.role.toLowerCase().includes('anot') || r.role.toLowerCase().includes('mesa'))?.name;

  return (
    <div className="page-a4-landscape w-[297mm] h-[210mm] bg-white text-black mx-auto relative mb-8 shadow-xl print:shadow-none p-3 select-text box-border flex flex-col justify-between">
      {/* ── CABEÇALHO SUPERIOR ── */}
      <div className="border border-slate-900 mb-1">
        {/* Top Bar Dark Navy */}
        <div className="bg-[#0f2942] text-white px-3 py-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-sm tracking-wider">VOLLEYPRO</span>
            <span className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider">
              Súmula Oficial de Voleibol de Quadra
            </span>
          </div>
          <span className="text-[9px] text-cyan-200 font-bold uppercase">
            Formato: 2 de 3 Sets
          </span>
        </div>

        {/* Grid de Metadados da Partida */}
        <div className="grid grid-cols-12 text-[10px] border-t border-b border-slate-900 bg-slate-50/50">
          <div className="col-span-3 border-r border-slate-800 p-1">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Competição</span>
            <span className="font-bold text-slate-900 truncate block">{data.competitionName || '________________________'}</span>
          </div>
          <div className="col-span-3 border-r border-slate-800 p-1">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Ginásio / Cidade</span>
            <span className="font-semibold text-slate-900 truncate block">
              {data.venue ? `${data.venue}${data.court ? ' (' + data.court + ')' : ''} - ${data.city || 'Toledo / PR'}` : '________________________'}
            </span>
          </div>
          <div className="col-span-1 border-r border-slate-800 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Jogo</span>
            <span className="font-black text-slate-900 block">{data.matchNumber ? `Nº ${data.matchNumber}` : 'Nº __'}</span>
          </div>
          <div className="col-span-1 border-r border-slate-800 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Fase</span>
            <span className="text-[8.5px] text-slate-800 truncate block">{data.phase || 'Grupo'}</span>
          </div>
          <div className="col-span-2 border-r border-slate-800 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Data / Hora</span>
            <span className="text-[8.5px] font-medium text-slate-800 block">{data.date ? `${data.date} ${data.time || ''}` : '__/__/____'}</span>
          </div>
          <div className="col-span-2 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Categoria / Sexo</span>
            <span className="text-[8.5px] font-bold text-slate-900 truncate block">
              {data.category || 'Adulto'}{data.genderCategory ? ` | ${data.genderCategory}` : ''}
            </span>
          </div>
        </div>

        {/* Faixa de Confronto (Sem siglas e sem A e B pré-marcados) */}
        <div className="flex items-center justify-between px-4 py-1 bg-cyan-50/40">
          <span className="text-xs font-black text-[#0f2942] uppercase">{data.teamA.name || 'EQUIPE 1'}</span>
          <span className="text-[10px] font-extrabold text-slate-400 tracking-widest">VS</span>
          <span className="text-xs font-black text-[#0f2942] uppercase">{data.teamB.name || 'EQUIPE 2'}</span>
        </div>
      </div>

      {/* ── CORPO CENTRAL (Sets 1..3 | Sanções e Resultado | Relação de Equipes) ── */}
      <div className="grid grid-cols-12 gap-1 flex-1">
        {/* Coluna Esquerda: Blocos de Sets 1, 2, 3 */}
        <div className="col-span-6 flex flex-col gap-1">
          {[1, 2, 3].map(setNum => {
            const setInfo = data.sets?.find(s => s.setNumber === setNum);
            return (
              <div key={setNum} className="border border-slate-900 flex-1 flex flex-col">
                <div className="bg-[#0f2942] text-white text-[9px] px-2 py-0.5 font-bold flex justify-between items-center">
                  <span>SET {setNum}</span>
                  <div className="flex gap-4 text-[8px] font-normal">
                    <span>Início: [ &nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                    <span>Término: [ &nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 flex-1 divide-x divide-slate-900 text-[8px]">
                  {/* Lado Equipe 1 */}
                  <div className="p-0.5 flex flex-col justify-between">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-0.5 font-bold">
                      <span className="truncate">{data.teamA.name || 'EQUIPE 1'}</span>
                      <span className="w-3.5 h-3.5 border border-slate-600 rounded-full text-center text-[7px] leading-3.5">( &nbsp; )</span>
                    </div>
                    {/* Rotação I..VI */}
                    <div className="grid grid-cols-6 text-center border-b border-slate-300 py-0.5">
                      {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, idx) => (
                        <div key={pos} className="border-r last:border-r-0 border-slate-200">
                          <span className="text-[6.5px] text-slate-500 font-bold block">{pos}</span>
                          <span className="text-[8px] font-bold block h-3">{setInfo?.lineupA?.[idx] || '--'}</span>
                        </div>
                      ))}
                    </div>
                    {/* Grade de 24 Pontos */}
                    <div className="grid grid-cols-12 gap-0.5 py-0.5 text-center text-[6.5px] text-slate-600">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="border border-slate-200 leading-tight">{i + 1}</div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-0.5 text-[7.5px] border-t border-slate-300">
                      <span>Tempos: [ &nbsp; ] [ &nbsp; ]</span>
                      <span className="font-bold">Pontos: {setInfo?.scoreA !== undefined ? setInfo.scoreA : '____'}</span>
                    </div>
                  </div>

                  {/* Lado Equipe 2 */}
                  <div className="p-0.5 flex flex-col justify-between">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-0.5 font-bold">
                      <span className="truncate">{data.teamB.name || 'EQUIPE 2'}</span>
                      <span className="w-3.5 h-3.5 border border-slate-600 rounded-full text-center text-[7px] leading-3.5">( &nbsp; )</span>
                    </div>
                    {/* Rotação I..VI */}
                    <div className="grid grid-cols-6 text-center border-b border-slate-300 py-0.5">
                      {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, idx) => (
                        <div key={pos} className="border-r last:border-r-0 border-slate-200">
                          <span className="text-[6.5px] text-slate-500 font-bold block">{pos}</span>
                          <span className="text-[8px] font-bold block h-3">{setInfo?.lineupB?.[idx] || '--'}</span>
                        </div>
                      ))}
                    </div>
                    {/* Grade de 24 Pontos */}
                    <div className="grid grid-cols-12 gap-0.5 py-0.5 text-center text-[6.5px] text-slate-600">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="border border-slate-200 leading-tight">{i + 1}</div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-0.5 text-[7.5px] border-t border-slate-300">
                      <span>Tempos: [ &nbsp; ] [ &nbsp; ]</span>
                      <span className="font-bold">Pontos: {setInfo?.scoreB !== undefined ? setInfo.scoreB : '____'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coluna Central: Sanções & Resultado Oficial */}
        <div className="col-span-3 flex flex-col gap-1">
          {/* Bloco Sanções */}
          <div className="border border-slate-900">
            <div className="bg-[#0f2942] text-white text-[8px] px-2 py-0.5 font-bold uppercase text-center">
              Sanções & Solicitações
            </div>
            <div className="p-1 text-[7px]">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[6.5px] text-slate-600 font-bold">
                    <th>A</th><th>P</th><th>E</th><th>D</th><th>EQ</th><th>SET</th><th>PLACAR</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-slate-200 last:border-b-0 h-3.5">
                      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloco Resultado Oficial */}
          <div className="border border-slate-900 flex-1 flex flex-col justify-between">
            <div>
              <div className="bg-[#0f2942] text-white text-[8px] px-2 py-0.5 font-bold uppercase text-center">
                Resultado Oficial
              </div>
              <div className="p-1.5 text-[8px]">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[7px] font-bold">
                      <th className="text-left">SET</th><th>DUR</th><th>EQ 1</th><th>EQ 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map(setNum => {
                      const s = data.sets?.find(st => st.setNumber === setNum);
                      return (
                        <tr key={setNum} className="border-b border-slate-200 h-4">
                          <td className="text-left font-bold">{setNum}º Set</td>
                          <td>{s?.duration || '--'}</td>
                          <td className="font-bold">{s?.scoreA !== undefined ? s.scoreA : '--'}</td>
                          <td className="font-bold">{s?.scoreB !== undefined ? s.scoreB : '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-1.5 border-t border-slate-900 bg-slate-50/50">
              <span className="block text-[7px] font-bold text-slate-500 uppercase">Vencedor da Partida</span>
              <span className="text-[9px] font-black text-[#0f2942] uppercase block">
                {data.winnerName || '__________________________________'}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Tabela EQUIPES, Comissão Técnica e Assinaturas */}
        <div className="col-span-3 border border-slate-900 flex flex-col justify-between text-[8px]">
          <div>
            <div className="bg-[#0f2942] text-white text-[8px] px-2 py-0.5 font-bold uppercase text-center">
              Relação Nominal das Equipes
            </div>

            {/* Cabeçalho Equipes com Sigla de 3 Letras */}
            <div className="grid grid-cols-2 text-[8.5px] border-b border-slate-800 bg-slate-100 font-black">
              <div className="p-0.5 border-r border-slate-300 truncate text-center uppercase tracking-wider">
                {data.teamA.shortName ? data.teamA.shortName.toUpperCase().slice(0, 3) : (data.teamA.name?.slice(0, 3) || 'EQ1')}
              </div>
              <div className="p-0.5 truncate text-center uppercase tracking-wider">
                {data.teamB.shortName ? data.teamB.shortName.toUpperCase().slice(0, 3) : (data.teamB.name?.slice(0, 3) || 'EQ2')}
              </div>
            </div>

            {/* 12 Linhas de Atletas Regulares */}
            <div className="divide-y divide-slate-200">
              {Array.from({ length: 12 }).map((_, idx) => {
                const pA = regularA[idx];
                const pB = regularB[idx];
                return (
                  <div key={idx} className="grid grid-cols-2 text-[7px] h-[10.5px] leading-[10.5px]">
                    <div className="flex border-r border-slate-300 px-0.5">
                      <span className="w-4 text-center font-bold">{pA?.number ? String(pA.number).padStart(2, '0') : '--'}</span>
                      <span className={`flex-1 truncate pl-1 ${pA?.isCaptain ? 'font-bold' : ''}`}>
                        {pA ? `${pA.name}${pA.isCaptain ? ' (C)' : ''}` : ''}
                      </span>
                    </div>
                    <div className="flex px-0.5">
                      <span className="w-4 text-center font-bold">{pB?.number ? String(pB.number).padStart(2, '0') : '--'}</span>
                      <span className={`flex-1 truncate pl-1 ${pB?.isCaptain ? 'font-bold' : ''}`}>
                        {pB ? `${pB.name}${pB.isCaptain ? ' (C)' : ''}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Líberos (L1 e L2) */}
            <div className="border-t border-slate-400 bg-cyan-50/20">
              {[0, 1].map(idx => {
                const lA = liberosA[idx];
                const lB = liberosB[idx];
                return (
                  <div key={idx} className="grid grid-cols-2 text-[7px] h-[11px] leading-[11px] border-b last:border-b-0 border-slate-200">
                    <div className="flex border-r border-slate-300 px-0.5">
                      <span className="text-[6.5px] text-slate-500 font-bold mr-0.5">L{idx + 1}:</span>
                      <span className="w-3 text-center font-bold">{lA?.number || '--'}</span>
                      <span className="flex-1 truncate pl-0.5 font-bold">{lA ? `${lA.name} (L)` : ''}</span>
                    </div>
                    <div className="flex px-0.5">
                      <span className="text-[6.5px] text-slate-500 font-bold mr-0.5">L{idx + 1}:</span>
                      <span className="w-3 text-center font-bold">{lB?.number || '--'}</span>
                      <span className="flex-1 truncate pl-0.5 font-bold">{lB ? `${lB.name} (L)` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comissão Técnica */}
          <div className="border-t border-slate-800 bg-slate-50/50">
            <div className="bg-slate-200 text-[6.5px] font-bold text-center uppercase py-0.5 text-slate-700">
              Comissão Técnica
            </div>
            <div className="grid grid-cols-2 text-[7px] border-b border-slate-200 px-0.5 py-0.5">
              <div className="border-r border-slate-300 pr-1 truncate">
                <span className="font-bold text-slate-500">T: </span>
                <span>{data.teamA.coach || '_________________'}</span>
              </div>
              <div className="pl-1 truncate">
                <span className="font-bold text-slate-500">T: </span>
                <span>{data.teamB.coach || '_________________'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 text-[7px] px-0.5 py-0.5">
              <div className="border-r border-slate-300 pr-1 truncate">
                <span className="font-bold text-slate-500">AT: </span>
                <span>{data.teamA.assistantCoach || '_________________'}</span>
              </div>
              <div className="pl-1 truncate">
                <span className="font-bold text-slate-500">AT: </span>
                <span>{data.teamB.assistantCoach || '_________________'}</span>
              </div>
            </div>
          </div>

          {/* Assinaturas (Em branco para assinatura física) */}
          <div className="border-t border-slate-800 bg-white">
            <div className="bg-slate-200 text-[6.5px] font-bold text-center uppercase py-0.5 text-slate-700">
              Assinaturas (Pós-Jogo)
            </div>
            <div className="grid grid-cols-2 text-[6.5px] text-slate-400 h-8 divide-x divide-slate-300">
              <div className="p-1 flex flex-col justify-between">
                <span>Capitão EQ 1</span>
                <div className="border-b border-slate-400 border-dashed" />
              </div>
              <div className="p-1 flex flex-col justify-between">
                <span>Capitão EQ 2</span>
                <div className="border-b border-slate-400 border-dashed" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RODAPÉ (Observações e Árbitros) ── */}
      <div className="grid grid-cols-12 gap-1 mt-1 border border-slate-900 text-[8px]">
        <div className="col-span-7 border-r border-slate-900 p-1">
          <span className="block text-[7px] font-bold text-slate-500 uppercase">Observações da Arbitragem</span>
          <span className="text-[7.5px] block">{data.observations || 'Nenhuma ocorrência registrada.'}</span>
        </div>
        <div className="col-span-5 grid grid-cols-3 divide-x divide-slate-800 p-1 text-center">
          <div>
            <span className="block text-[6.5px] font-bold text-slate-500">1º ÁRBITRO</span>
            <span className="text-[7.5px] font-bold block">{ref1 || '________________'}</span>
          </div>
          <div>
            <span className="block text-[6.5px] font-bold text-slate-500">2º ÁRBITRO</span>
            <span className="text-[7.5px] font-bold block">{ref2 || '________________'}</span>
          </div>
          <div>
            <span className="block text-[6.5px] font-bold text-slate-500">APONTADOR</span>
            <span className="text-[7.5px] font-bold block">{scorer || '________________'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// DOCUMENTO 2: SÚMULA OFICIAL DE 5 SETS (A4 PAISAGEM)
// =====================================================================
const FiveSetsScoresheet: React.FC<{ data: MatchPrintData }> = ({ data }) => {
  const regularA = (data.teamA.players || []).filter(p => !p.isLibero).slice(0, 12);
  const regularB = (data.teamB.players || []).filter(p => !p.isLibero).slice(0, 12);
  const liberosA = (data.teamA.liberos || data.teamA.players?.filter(p => p.isLibero) || []).slice(0, 2);
  const liberosB = (data.teamB.liberos || data.teamB.players?.filter(p => p.isLibero) || []).slice(0, 2);

  return (
    <div className="page-a4-landscape w-[297mm] h-[210mm] bg-white text-black mx-auto relative mb-8 shadow-xl print:shadow-none p-3 select-text box-border flex flex-col justify-between">
      {/* Cabeçalho */}
      <div className="border border-slate-900 mb-1">
        <div className="bg-[#0f2942] text-white px-3 py-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-sm tracking-wider">VOLLEYPRO</span>
            <span className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider">
              Súmula Oficial de Voleibol (3 de 5 Sets)
            </span>
          </div>
          <span className="text-[9px] text-cyan-200 font-bold uppercase">Formato: 5 Sets</span>
        </div>

        <div className="grid grid-cols-12 text-[10px] border-t border-b border-slate-900 bg-slate-50/50">
          <div className="col-span-3 border-r border-slate-800 p-1">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Competição</span>
            <span className="font-bold text-slate-900 truncate block">{data.competitionName || '________________________'}</span>
          </div>
          <div className="col-span-3 border-r border-slate-800 p-1">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Ginásio / Cidade</span>
            <span className="font-semibold text-slate-900 truncate block">
              {data.venue ? `${data.venue}${data.court ? ' (' + data.court + ')' : ''} - ${data.city || 'Toledo / PR'}` : '________________________'}
            </span>
          </div>
          <div className="col-span-1 border-r border-slate-800 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Jogo</span>
            <span className="font-black text-slate-900 block">{data.matchNumber ? `Nº ${data.matchNumber}` : 'Nº __'}</span>
          </div>
          <div className="col-span-1 border-r border-slate-800 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Fase</span>
            <span className="text-[8.5px] text-slate-800 truncate block">{data.phase || 'Final'}</span>
          </div>
          <div className="col-span-2 border-r border-slate-800 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Data / Hora</span>
            <span className="text-[8.5px] font-medium text-slate-800 block">{data.date ? `${data.date} ${data.time || ''}` : '__/__/____'}</span>
          </div>
          <div className="col-span-2 p-1 text-center">
            <span className="block text-[7.5px] font-bold text-slate-500 uppercase">Categoria / Sexo</span>
            <span className="text-[8.5px] font-bold text-slate-900 truncate block">
              {data.category || 'Adulto'}{data.genderCategory ? ` | ${data.genderCategory}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-1 bg-cyan-50/40">
          <span className="text-xs font-black text-[#0f2942] uppercase">{data.teamA.name || 'EQUIPE 1'}</span>
          <span className="text-[10px] font-extrabold text-slate-400 tracking-widest">VS</span>
          <span className="text-xs font-black text-[#0f2942] uppercase">{data.teamB.name || 'EQUIPE 2'}</span>
        </div>
      </div>

      {/* Grid de 5 Sets */}
      <div className="grid grid-cols-12 gap-1 flex-1">
        <div className="col-span-7 flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map(setNum => (
            <div key={setNum} className="border border-slate-900 flex-1 flex flex-col">
              <div className="bg-[#0f2942] text-white text-[8px] px-2 py-0.5 font-bold flex justify-between items-center">
                <span>SET {setNum} {setNum === 5 ? '(TIEBREAK 15 PTS)' : ''}</span>
                <span className="text-[7.5px] font-normal">Início: [ &nbsp;:&nbsp; ] Término: [ &nbsp;:&nbsp; ]</span>
              </div>
              <div className="grid grid-cols-2 flex-1 divide-x divide-slate-900 text-[7.5px] p-0.5">
                <div className="flex justify-between items-center px-1">
                  <span className="truncate">{data.teamA.name || 'EQUIPE 1'}</span>
                  <span className="font-bold">Pontos: _____</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="truncate">{data.teamB.name || 'EQUIPE 2'}</span>
                  <span className="font-bold">Pontos: _____</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela de Atletas */}
        <div className="col-span-5 border border-slate-900 flex flex-col justify-between text-[8px]">
          <div>
            <div className="bg-[#0f2942] text-white text-[8px] px-2 py-0.5 font-bold uppercase text-center">
              Relação Nominal das Equipes
            </div>
            {/* Cabeçalho Equipes com Sigla de 3 Letras */}
            <div className="grid grid-cols-2 text-[8.5px] border-b border-slate-800 bg-slate-100 font-black">
              <div className="p-0.5 border-r border-slate-300 truncate text-center uppercase tracking-wider">
                {data.teamA.shortName ? data.teamA.shortName.toUpperCase().slice(0, 3) : (data.teamA.name?.slice(0, 3) || 'EQ1')}
              </div>
              <div className="p-0.5 truncate text-center uppercase tracking-wider">
                {data.teamB.shortName ? data.teamB.shortName.toUpperCase().slice(0, 3) : (data.teamB.name?.slice(0, 3) || 'EQ2')}
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {Array.from({ length: 12 }).map((_, idx) => {
                const pA = regularA[idx];
                const pB = regularB[idx];
                return (
                  <div key={idx} className="grid grid-cols-2 text-[7px] h-[9.5px] leading-[9.5px]">
                    <div className="flex border-r border-slate-300 px-0.5">
                      <span className="w-4 text-center font-bold">{pA?.number ? String(pA.number).padStart(2, '0') : '--'}</span>
                      <span className={`flex-1 truncate pl-1 ${pA?.isCaptain ? 'font-bold' : ''}`}>
                        {pA ? `${pA.name}${pA.isCaptain ? ' (C)' : ''}` : ''}
                      </span>
                    </div>
                    <div className="flex px-0.5">
                      <span className="w-4 text-center font-bold">{pB?.number ? String(pB.number).padStart(2, '0') : '--'}</span>
                      <span className={`flex-1 truncate pl-1 ${pB?.isCaptain ? 'font-bold' : ''}`}>
                        {pB ? `${pB.name}${pB.isCaptain ? ' (C)' : ''}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-400 bg-cyan-50/20">
              {[0, 1].map(idx => (
                <div key={idx} className="grid grid-cols-2 text-[7px] h-[10px] leading-[10px] border-b last:border-b-0 border-slate-200">
                  <div className="flex border-r border-slate-300 px-0.5">
                    <span className="text-[6px] text-slate-500 font-bold mr-0.5">L{idx + 1}:</span>
                    <span className="w-3 text-center font-bold">{liberosA[idx]?.number || '--'}</span>
                    <span className="flex-1 truncate pl-0.5 font-bold">{liberosA[idx] ? `${liberosA[idx]?.name} (L)` : ''}</span>
                  </div>
                  <div className="flex px-0.5">
                    <span className="text-[6px] text-slate-500 font-bold mr-0.5">L{idx + 1}:</span>
                    <span className="w-3 text-center font-bold">{liberosB[idx]?.number || '--'}</span>
                    <span className="flex-1 truncate pl-0.5 font-bold">{liberosB[idx] ? `${liberosB[idx]?.name} (L)` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 bg-slate-50/50 p-1 text-[7px]">
            <div className="grid grid-cols-2 gap-1">
              <div><span className="font-bold">Técnico 1:</span> {data.teamA.coach || '______________'}</div>
              <div><span className="font-bold">Técnico 2:</span> {data.teamB.coach || '______________'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// DOCUMENTO 3: FICHAS DE ORDEM DE SAQUE (8 FILIPETAS A4 PAISAGEM)
// =====================================================================
const ServeOrderSlipsSheet: React.FC<{ data: MatchPrintData }> = ({ data }) => {
  return (
    <div className="page-a4-landscape w-[297mm] h-[210mm] bg-white text-black mx-auto relative shadow-xl print:shadow-none p-3 select-text box-border flex flex-col justify-between">
      <div className="text-center pb-1 border-b border-slate-900 mb-2">
        <h2 className="text-xs font-black uppercase text-[#0f2942]">Fichas de Posição Inicial e Ordem de Saque</h2>
        <p className="text-[9px] text-slate-600 font-semibold">
          {data.competitionName} &nbsp;|&nbsp; Jogo {data.matchNumber ? `Nº ${data.matchNumber}` : ''}: {data.teamA.name} vs {data.teamB.name}
        </p>
      </div>

      {/* Grid de 8 Filipetas (4 para Equipe 1, 4 para Equipe 2) */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {/* Coluna Equipe A (Sets 1 a 4) */}
        <div className="flex flex-col gap-2 justify-between">
          {[1, 2, 3, 4].map(setNum => (
            <div key={setNum} className="border border-slate-900 p-1.5 rounded-sm bg-slate-50/30">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1 text-[8px] font-bold">
                <span className="text-[#0f2942] uppercase">{data.teamA.name || 'EQUIPE 1'}</span>
                <span className="bg-[#0f2942] text-white px-1.5 py-0.5 rounded text-[7px]">SET {setNum}</span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-center">
                {['IV', 'III', 'II', 'V', 'VI', 'I'].map(pos => (
                  <div key={pos} className="border border-slate-400 p-1">
                    <span className="block text-[6.5px] font-bold text-slate-500">{pos}</span>
                    <span className="block text-[9px] font-black h-3.5 leading-tight">--</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1 text-[6.5px] text-slate-600">
                <span>Líbero: [ &nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                <span>Assinatura do Técnico: ___________________</span>
              </div>
            </div>
          ))}
        </div>

        {/* Coluna Equipe B (Sets 1 a 4) */}
        <div className="flex flex-col gap-2 justify-between">
          {[1, 2, 3, 4].map(setNum => (
            <div key={setNum} className="border border-slate-900 p-1.5 rounded-sm bg-slate-50/30">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1 text-[8px] font-bold">
                <span className="text-[#0f2942] uppercase">{data.teamB.name || 'EQUIPE 2'}</span>
                <span className="bg-[#0f2942] text-white px-1.5 py-0.5 rounded text-[7px]">SET {setNum}</span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-center">
                {['IV', 'III', 'II', 'V', 'VI', 'I'].map(pos => (
                  <div key={pos} className="border border-slate-400 p-1">
                    <span className="block text-[6.5px] font-bold text-slate-500">{pos}</span>
                    <span className="block text-[9px] font-black h-3.5 leading-tight">--</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1 text-[6.5px] text-slate-600">
                <span>Líbero: [ &nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                <span>Assinatura do Técnico: ___________________</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchDocumentsPrint;

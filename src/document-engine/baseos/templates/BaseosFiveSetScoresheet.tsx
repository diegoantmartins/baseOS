// =====================================================================
// BaseOS Template - Súmula Oficial de 5 Sets (A4 Paisagem - Layout Homologado)
// =====================================================================

import React from 'react';
import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import type { BaseosScoresheetData } from '../types/scoresheet';
import { A4_LANDSCAPE } from '../geometry/page';
import { BaseosHeader } from '../components/BaseosHeader';
import { BaseosSetBlock } from '../components/BaseosSetBlock';
import { BaseosRosters } from '../components/BaseosRosters';
import { BaseosSanctions } from '../components/BaseosSanctions';
import { BaseosResult } from '../components/BaseosResult';
import { BaseosSignatures } from '../components/BaseosSignatures';
import { createBlankSetData } from '../mapper/set.mapper';

const styles = StyleSheet.create({
  page: {
    width: A4_LANDSCAPE.WIDTH,
    height: A4_LANDSCAPE.HEIGHT,
    padding: 6,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  upperBody: {
    height: 420,
    flexDirection: 'row',
    marginBottom: 3,
  },
  setsColumn: {
    width: 480,
    height: 420,
    flexDirection: 'column',
    paddingRight: 3,
    justifyContent: 'space-between',
  },
  rostersColumn: {
    width: 345,
    height: 420,
    flexDirection: 'column',
  },
  footerRow: {
    height: 110,
    flexDirection: 'row',
  },
  footerColSanctions: {
    width: 165,
    paddingRight: 2.5,
  },
  footerColSignatures: {
    width: 355,
    paddingHorizontal: 2.5,
  },
  footerColResult: {
    width: 305,
    paddingLeft: 2.5,
  },
});

interface BaseosFiveSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosFiveSetScoresheet: React.FC<BaseosFiveSetScoresheetProps> = ({ data }) => {
  const set1 = data.sets.set1 || createBlankSetData(1, '5-sets');
  const set2 = data.sets.set2 || createBlankSetData(2, '5-sets');
  const set3 = data.sets.set3 || createBlankSetData(3, '5-sets');
  const set4 = data.sets.set4 || createBlankSetData(4, '5-sets');
  const set5 = data.sets.set5 || createBlankSetData(5, '5-sets');

  return (
    <Document title={`Sumula_Oficial_5Sets_Jogo_${data.match.number || '1'}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho do Jogo */}
        <BaseosHeader
          competition={data.competition}
          match={data.match}
          teamAName={data.teams.A.name}
          teamBName={data.teams.B.name}
        />

        {/* Corpo Superior: 5 Sets na Esquerda e Tabela de EQUIPES na Direita */}
        <View style={styles.upperBody}>
          <View style={styles.setsColumn}>
            <BaseosSetBlock
              setData={set1}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={82}
            />
            <BaseosSetBlock
              setData={set2}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={82}
            />
            <BaseosSetBlock
              setData={set3}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={82}
            />
            <BaseosSetBlock
              setData={set4}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={82}
            />
            <BaseosSetBlock
              setData={set5}
              teamA={data.teams.A}
              teamB={data.teams.B}
              isDecidingSet={true}
              height={82}
            />
          </View>

          <View style={styles.rostersColumn}>
            <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} />
          </View>
        </View>

        {/* Rodapé Integrado: Sanções | Aprovação (2 Juízes de Linha) | Resultados (5 Sets) */}
        <View style={styles.footerRow}>
          <View style={styles.footerColSanctions}>
            <BaseosSanctions
              sanctions={data.sanctions}
              improperRequests={data.improperRequests}
            />
          </View>
          <View style={styles.footerColSignatures}>
            <BaseosSignatures
              officials={data.officials}
              signatures={data.signatures}
              observations={data.observations}
            />
          </View>
          <View style={styles.footerColResult}>
            <BaseosResult
              result={data.result}
              teamA={data.teams.A}
              teamB={data.teams.B}
              maxSets={5}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
};

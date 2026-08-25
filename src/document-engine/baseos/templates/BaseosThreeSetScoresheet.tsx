// =====================================================================
// BaseOS Template - Súmula Oficial de 3 Sets (A4 Paisagem - Layout Homologado)
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

interface BaseosThreeSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosThreeSetScoresheet: React.FC<BaseosThreeSetScoresheetProps> = ({ data }) => {
  return (
    <Document title={`Sumula_Oficial_3Sets_Jogo_${data.match.number || '1'}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho do Jogo */}
        <BaseosHeader
          competition={data.competition}
          match={data.match}
          teamAName={data.teams.A.name}
          teamBName={data.teams.B.name}
        />

        {/* Corpo Superior: Sets 1..3 na Esquerda e Tabela de EQUIPES na Direita */}
        <View style={styles.upperBody}>
          <View style={styles.setsColumn}>
            <BaseosSetBlock
              setData={data.sets.set1}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={138}
            />
            <BaseosSetBlock
              setData={data.sets.set2}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={138}
            />
            <BaseosSetBlock
              setData={data.sets.set3}
              teamA={data.teams.A}
              teamB={data.teams.B}
              isDecidingSet={true}
              height={138}
            />
          </View>

          <View style={styles.rostersColumn}>
            <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} />
          </View>
        </View>

        {/* Rodapé Integrado de Ponta a Ponta: Sanções | Aprovação | Resultados */}
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
              maxSets={3}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
};

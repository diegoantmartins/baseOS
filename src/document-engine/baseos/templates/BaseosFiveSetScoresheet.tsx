// =====================================================================
// BaseOS Template - Súmula Oficial de 5 Sets (A4 Paisagem - 1 Página Única)
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
    padding: 5,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 2,
    height: 130,
  },
  halfColLeft: {
    flex: 1,
    paddingRight: 2,
    height: 130,
  },
  halfColRight: {
    flex: 1,
    paddingLeft: 2,
    height: 130,
  },
  footerRow: {
    height: 138,
    flexDirection: 'row',
    marginTop: 1,
  },
  footerColSanctions: {
    width: 170,
    paddingRight: 2,
    height: 138,
  },
  footerColSignatures: {
    flex: 1,
    paddingHorizontal: 2,
    height: 138,
  },
  footerColResult: {
    width: 320,
    paddingLeft: 2,
    height: 138,
  },
});

interface BaseosFiveSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosFiveSetScoresheet: React.FC<BaseosFiveSetScoresheetProps> = ({ data }) => {
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

        {/* Linha 1: Set 1 e Set 2 (Cards Uniformes de 130pt) */}
        <View style={styles.gridRow}>
          <View style={styles.halfColLeft}>
            <BaseosSetBlock
              setData={data.sets.set1}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={130}
            />
          </View>
          <View style={styles.halfColRight}>
            <BaseosSetBlock
              setData={data.sets.set2}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={130}
            />
          </View>
        </View>

        {/* Linha 2: Set 3 e Set 4 (Cards Uniformes de 130pt) */}
        <View style={styles.gridRow}>
          <View style={styles.halfColLeft}>
            <BaseosSetBlock
              setData={data.sets.set3}
              teamA={data.teams.A}
              teamB={data.teams.B}
              height={130}
            />
          </View>
          <View style={styles.halfColRight}>
            {data.sets.set4 ? (
              <BaseosSetBlock
                setData={data.sets.set4}
                teamA={data.teams.A}
                teamB={data.teams.B}
                height={130}
              />
            ) : null}
          </View>
        </View>

        {/* Linha 3: Set 5 (Tie-Break) e Tabela EQUIPES com Amplo Espaço Horizontal */}
        <View style={styles.gridRow}>
          <View style={styles.halfColLeft}>
            {data.sets.set5 ? (
              <BaseosSetBlock
                setData={data.sets.set5}
                teamA={data.teams.A}
                teamB={data.teams.B}
                isDecidingSet={true}
                height={130}
              />
            ) : null}
          </View>
          <View style={styles.halfColRight}>
            <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} height={130} isCompact={true} />
          </View>
        </View>

        {/* Linha 4 (Rodapé Oficial): Sanções | Aprovação | Resultados (Sets 1 a 5) */}
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

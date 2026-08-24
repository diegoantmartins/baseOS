// =====================================================================
// BaseOS Template - Súmula Oficial de 5 Sets (A3 Paisagem - Padrão Nacional CBV)
// =====================================================================

import React from 'react';
import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import type { BaseosScoresheetData } from '../types/scoresheet';
import { A3_LANDSCAPE } from '../geometry/page';
import { BaseosHeader } from '../components/BaseosHeader';
import { BaseosSetBlock } from '../components/BaseosSetBlock';
import { BaseosRosters } from '../components/BaseosRosters';
import { BaseosSanctions } from '../components/BaseosSanctions';
import { BaseosResult } from '../components/BaseosResult';
import { BaseosSignatures } from '../components/BaseosSignatures';

const styles = StyleSheet.create({
  page: {
    width: A3_LANDSCAPE.WIDTH,
    height: A3_LANDSCAPE.HEIGHT,
    padding: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  halfColLeft: {
    flex: 1,
    paddingRight: 3,
  },
  halfColRight: {
    flex: 1,
    paddingLeft: 3,
  },
  footerRow: {
    height: 110,
    flexDirection: 'row',
    marginTop: 4,
  },
  footerColSanctions: {
    width: 230,
    paddingRight: 3,
  },
  footerColSignatures: {
    flex: 1,
    paddingHorizontal: 3,
  },
  footerColResult: {
    width: 440,
    paddingLeft: 3,
  },
});

interface BaseosFiveSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosFiveSetScoresheet: React.FC<BaseosFiveSetScoresheetProps> = ({ data }) => {
  return (
    <Document title={`Sumula_Oficial_5Sets_Jogo_${data.match.number || '1'}`}>
      <Page size="A3" orientation="landscape" style={styles.page}>
        {/* Cabeçalho Oficial BaseOS / CBV */}
        <BaseosHeader
          competition={data.competition}
          match={data.match}
          teamAName={data.teams.A.name}
          teamBName={data.teams.B.name}
        />

        {/* Linha 1: Set 1 e Set 2 */}
        <View style={styles.gridRow}>
          <View style={styles.halfColLeft}>
            <BaseosSetBlock
              setData={data.sets.set1}
              teamA={data.teams.A}
              teamB={data.teams.B}
            />
          </View>
          <View style={styles.halfColRight}>
            <BaseosSetBlock
              setData={data.sets.set2}
              teamA={data.teams.A}
              teamB={data.teams.B}
            />
          </View>
        </View>

        {/* Linha 2: Set 3 e Set 4 */}
        <View style={styles.gridRow}>
          <View style={styles.halfColLeft}>
            <BaseosSetBlock
              setData={data.sets.set3}
              teamA={data.teams.A}
              teamB={data.teams.B}
            />
          </View>
          <View style={styles.halfColRight}>
            {data.sets.set4 ? (
              <BaseosSetBlock
                setData={data.sets.set4}
                teamA={data.teams.A}
                teamB={data.teams.B}
              />
            ) : null}
          </View>
        </View>

        {/* Linha 3: Set 5 (Tie-Break com 1 a 8 pts no 1º bloco) e Tabela EQUIPES */}
        <View style={styles.gridRow}>
          <View style={styles.halfColLeft}>
            {data.sets.set5 ? (
              <BaseosSetBlock
                setData={data.sets.set5}
                teamA={data.teams.A}
                teamB={data.teams.B}
                isDecidingSet={true}
              />
            ) : null}
          </View>
          <View style={styles.halfColRight}>
            <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} />
          </View>
        </View>

        {/* Linha 4 (Rodapé Oficial CBV): Sanções | Aprovação | Resultados */}
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

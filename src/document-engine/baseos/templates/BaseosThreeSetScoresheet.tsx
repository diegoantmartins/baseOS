// =====================================================================
// BaseOS Template - Súmula Oficial de 3 Sets (A4 Paisagem Geometry-Driven)
// =====================================================================

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosScoresheetData } from '../types/scoresheet';
import type { Rect } from '../geometry/rect';
import { getScoresheetLayout } from '../geometry/layouts';
import { BaseosHeader } from '../components/BaseosHeader';
import { BaseosSetBlock } from '../components/BaseosSetBlock';
import { BaseosRosters } from '../components/BaseosRosters';
import { BaseosSanctions } from '../components/BaseosSanctions';
import { BaseosResult } from '../components/BaseosResult';
import { BaseosSignatures } from '../components/BaseosSignatures';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  card: {
    position: 'absolute',
  },
});

function cardStyle(rect: Rect) {
  return [
    styles.card,
    {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    },
  ];
}

interface BaseosThreeSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosThreeSetScoresheet: React.FC<BaseosThreeSetScoresheetProps> = ({ data }) => {
  const layout = getScoresheetLayout('3-sets', data.document.output);

  return (
    <Document title={`Sumula_Oficial_3Sets_Jogo_${data.match.number || '1'}`}>
      <Page size={layout.page.name} orientation={layout.page.orientation} style={styles.page}>
        <View style={cardStyle(layout.cards.header)}>
          <BaseosHeader
            competition={data.competition}
            match={data.match}
            teamAName={data.teams.A.name}
            teamBName={data.teams.B.name}
          />
        </View>

        <View style={cardStyle(layout.cards.sets[1]!)}>
          <BaseosSetBlock setData={data.sets.set1} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[1]!.height} />
        </View>
        <View style={cardStyle(layout.cards.sets[2]!)}>
          <BaseosSetBlock setData={data.sets.set2} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[2]!.height} />
        </View>
        <View style={cardStyle(layout.cards.sets[3]!)}>
          <BaseosSetBlock setData={data.sets.set3} teamA={data.teams.A} teamB={data.teams.B} isDecidingSet height={layout.cards.sets[3]!.height} />
        </View>

        <View style={cardStyle(layout.cards.rosters)}>
          <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} />
        </View>
        <View style={cardStyle(layout.cards.sanctions)}>
          <BaseosSanctions sanctions={data.sanctions} improperRequests={data.improperRequests} />
        </View>
        <View style={cardStyle(layout.cards.signatures)}>
          <BaseosSignatures officials={data.officials} signatures={data.signatures} observations={data.observations} />
        </View>
        <View style={cardStyle(layout.cards.result)}>
          <BaseosResult result={data.result} teamA={data.teams.A} teamB={data.teams.B} maxSets={3} />
        </View>
        
        <View style={{ position: 'absolute', bottom: 5, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 5.0, color: '#666' }}>
            Súmula Oficial processada e gerada pelo sistema Base OS
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// =====================================================================
// BaseOS Template - Súmula Oficial de 3 Sets (A4 Paisagem Commercial Forense)
// =====================================================================

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosScoresheetData } from '../types/scoresheet';
import type { Rect } from '../geometry/rect';
import { getScoresheetLayout } from '../geometry/layouts';
import { BaseosThreeSetHeader } from '../components/BaseosThreeSetHeader';
import { BaseosThreeSetColumnBlock } from '../components/BaseosThreeSetColumnBlock';
import { BaseosThreeSetRosters } from '../components/BaseosThreeSetRosters';
import { BaseosThreeSetSanctions } from '../components/BaseosThreeSetSanctions';
import { BaseosThreeSetResult } from '../components/BaseosThreeSetResult';
import { BaseosThreeSetSignatures } from '../components/BaseosThreeSetSignatures';
import { BaseosThreeSetTeamSignatures } from '../components/BaseosThreeSetTeamSignatures';

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

export interface BaseosThreeSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosThreeSetPage: React.FC<BaseosThreeSetScoresheetProps> = ({ data }) => {
  const layout = getScoresheetLayout('3-sets', data.document.output);

  return (
    <Page size={layout.page.name} orientation={layout.page.orientation} style={styles.page}>
      <View style={cardStyle(layout.cards.header)}>
        <BaseosThreeSetHeader
          competition={data.competition}
          match={data.match}
          teamAName={data.teams.A.name}
          teamBName={data.teams.B.name}
        />
      </View>

      <View style={cardStyle(layout.cards.sets[1]!)}>
        <BaseosThreeSetColumnBlock setData={data.sets.set1} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[1]!.height} />
      </View>
      <View style={cardStyle(layout.cards.sets[2]!)}>
        <BaseosThreeSetColumnBlock setData={data.sets.set2} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[2]!.height} />
      </View>
      <View style={cardStyle(layout.cards.sets[3]!)}>
        <BaseosThreeSetColumnBlock setData={data.sets.set3} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[3]!.height} />
      </View>

      <View style={cardStyle(layout.cards.rosters)}>
        <BaseosThreeSetRosters teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.rosters.height} />
      </View>
      <View style={cardStyle(layout.cards.sanctions)}>
        <BaseosThreeSetSanctions sanctions={data.sanctions} improperRequests={data.improperRequests} height={layout.cards.sanctions.height} />
      </View>
      <View style={cardStyle(layout.cards.result)}>
        <BaseosThreeSetResult result={data.result} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.result.height} />
      </View>
      <View style={cardStyle(layout.cards.signatures)}>
        <BaseosThreeSetSignatures officials={data.officials} signatures={data.signatures} observations={data.observations} height={layout.cards.signatures.height} />
      </View>
      {layout.cards.remarks && (
        <View style={cardStyle(layout.cards.remarks)}>
          <BaseosThreeSetTeamSignatures signatures={data.signatures} height={layout.cards.remarks.height} />
        </View>
      )}

      <View style={{ position: 'absolute', bottom: 5, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 4.5, color: '#666' }}>
          Súmula Oficial processada e gerada pelo sistema Base OS
        </Text>
      </View>
    </Page>
  );
};

export const BaseosThreeSetScoresheet: React.FC<BaseosThreeSetScoresheetProps> = ({ data }) => {
  return (
    <Document title={`Sumula_Oficial_3Sets_Jogo_${data.match.number || '1'}`}>
      <BaseosThreeSetPage data={data} />
    </Document>
  );
};

// =====================================================================
// BaseOS Template - Súmula Oficial de 5 Sets (A4 Print / A3 Master)
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
import { BaseosRemarks } from '../components/BaseosRemarks';
import { createBlankSetData } from '../mapper/set.mapper';

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

interface BaseosFiveSetScoresheetProps {
  data: BaseosScoresheetData;
}

export const BaseosFiveSetScoresheet: React.FC<BaseosFiveSetScoresheetProps> = ({ data }) => {
  const layout = getScoresheetLayout('5-sets', data.document.output);
  const set1 = data.sets.set1 || createBlankSetData(1, '5-sets');
  const set2 = data.sets.set2 || createBlankSetData(2, '5-sets');
  const set3 = data.sets.set3 || createBlankSetData(3, '5-sets');
  const set4 = data.sets.set4 || createBlankSetData(4, '5-sets');
  const set5 = data.sets.set5 || createBlankSetData(5, '5-sets');

  return (
    <Document title={`Sumula_Oficial_5Sets_Jogo_${data.match.number || '1'}_${layout.output}`}>
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
          <BaseosSetBlock setData={set1} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[1]!.height} />
        </View>
        <View style={cardStyle(layout.cards.sets[2]!)}>
          <BaseosSetBlock setData={set2} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[2]!.height} />
        </View>
        <View style={cardStyle(layout.cards.sets[3]!)}>
          <BaseosSetBlock setData={set3} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[3]!.height} />
        </View>
        <View style={cardStyle(layout.cards.sets[4]!)}>
          <BaseosSetBlock setData={set4} teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.sets[4]!.height} />
        </View>
        <View style={cardStyle(layout.cards.sets[5]!)}>
          <BaseosSetBlock setData={set5} teamA={data.teams.A} teamB={data.teams.B} isDecidingSet height={layout.cards.sets[5]!.height} />
        </View>

        <View style={cardStyle(layout.cards.rosters)}>
          <BaseosRosters teamA={data.teams.A} teamB={data.teams.B} height={layout.cards.rosters.height} />
        </View>
        <View style={cardStyle(layout.cards.sanctions)}>
          <BaseosSanctions sanctions={data.sanctions} improperRequests={data.improperRequests} height={layout.cards.sanctions.height} />
        </View>
        <View style={cardStyle(layout.cards.signatures)}>
          <BaseosSignatures officials={data.officials} signatures={data.signatures} observations={data.observations} height={layout.cards.signatures.height} />
        </View>
        <View style={cardStyle(layout.cards.result)}>
          <BaseosResult result={data.result} teamA={data.teams.A} teamB={data.teams.B} maxSets={5} height={layout.cards.result.height} />
        </View>

        {layout.cards.remarks && (
          <View style={cardStyle(layout.cards.remarks)}>
            <BaseosRemarks layout={layout.cards.remarks} observations={data.observations} />
          </View>
        )}
        
        <View style={{ position: 'absolute', bottom: 5, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 5.0, color: '#666' }}>
            Súmula Oficial processada e gerada pelo sistema Base OS
          </Text>
        </View>
      </Page>
    </Document>
  );
};

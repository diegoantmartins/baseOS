import { MainLayout } from '@/components/layout/MainLayout';
import { MatchSheetInterface } from '@/components/match-sheet/MatchSheetInterface';

const MatchSheetPage = () => {
  return (
    <MainLayout>
      <MatchSheetInterface modality="indoor" format="3-sets" />
    </MainLayout>
  );
};

export default MatchSheetPage;

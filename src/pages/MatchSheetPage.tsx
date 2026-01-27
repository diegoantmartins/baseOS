import { MainLayout } from '@/components/layout/MainLayout';
import { MatchSheetInterface } from '@/components/match-sheet/MatchSheetInterface';
import { MatchPdfPreview } from '@/components/match/MatchPdfPreview';

const MatchSheetPage = () => {
  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MatchSheetInterface modality="indoor" format="3-sets" />
        </div>
        <div className="lg:col-span-1">
          <MatchPdfPreview />
        </div>
      </div>
    </MainLayout>
  );
};

export default MatchSheetPage;

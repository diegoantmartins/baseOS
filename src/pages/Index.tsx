import { useNavigate } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Dashboard } from '@/components/dashboard/Dashboard';

const Index = () => {
  const navigate = useNavigate();

  return (
    <DashboardShell
      onCreateTournament={() => navigate('/competicoes?new=1')}
      onGenerateReport={() => navigate('/relatorios')}
    >
      <Dashboard />
    </DashboardShell>
  );
};

export default Index;

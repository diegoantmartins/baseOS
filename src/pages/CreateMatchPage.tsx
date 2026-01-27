import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreateMatchForm } from '@/components/match/CreateMatchForm';
import { toast } from 'sonner';

const CreateMatchPage = () => {
  const navigate = useNavigate();

  const handleSubmit = (data: any) => {
    console.log('Match created:', data);
    toast.success('Partida agendada com sucesso!', {
      description: 'A partida foi adicionada ao calendário.',
    });
    navigate('/jogos');
  };

  const handleCancel = () => {
    navigate('/jogos');
  };

  return (
    <MainLayout>
      <div className="py-6">
        <CreateMatchForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </MainLayout>
  );
};

export default CreateMatchPage;

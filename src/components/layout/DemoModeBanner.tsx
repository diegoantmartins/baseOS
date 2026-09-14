import React, { useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const DemoModeBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const isConfigured = isSupabaseConfigured();

  // Quando o Supabase está configurado e ativo, nenhum banner de demo é exibido
  if (isConfigured || dismissed) return null;

  const isDev = Boolean(import.meta.env.DEV);

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 text-foreground px-3 py-1.5 text-xs flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
        <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          {isDev ? 'Backend Indisponível' : 'Modo Demo'}
        </Badge>
        <span className="truncate">
          {isDev ? (
            <>
              <strong>Supabase Local Não Configurado:</strong> O ambiente de homologação exige o backend real (PostgreSQL/Supabase em http://localhost:8400). Inicialize o Supabase local antes de continuar.
            </>
          ) : (
            <>
              <strong>Base Local:</strong> O sistema está operando em modo offline / demonstração. Todos os dados são persistidos no armazenamento do seu navegador.
            </>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:opacity-80 p-0.5 rounded"
        title="Ocultar aviso"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

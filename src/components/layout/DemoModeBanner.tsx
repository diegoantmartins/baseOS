import React, { useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const DemoModeBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const isDemo = !isSupabaseConfigured();

  if (!isDemo || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-300 px-3 py-1.5 text-xs flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
        <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold tracking-wider py-0 px-1.5">
          Modo Demo
        </Badge>
        <span className="truncate">
          <strong>Base Local:</strong> O sistema está operando em modo offline / demonstração. Todos os dados são persistidos no armazenamento do seu navegador.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-700 dark:text-amber-400 hover:opacity-80 p-0.5 rounded"
        title="Ocultar aviso"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

import React from 'react';
import { analyzePasswordStrength } from '@/lib/security';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
  showCriteria?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showCriteria = true,
}) => {
  if (!password) return null;

  const analysis = analyzePasswordStrength(password);
  const { criteria, score, label } = analysis;

  const getProgressBarColor = () => {
    if (score < 30) return 'bg-destructive';
    if (score < 60) return 'bg-amber-500';
    if (score < 85) return 'bg-emerald-500';
    return 'bg-green-600';
  };

  const getBadgeColor = () => {
    if (score < 30) return 'text-destructive bg-destructive/10 border-destructive/20';
    if (score < 60) return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30';
    if (score < 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30';
    return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30';
  };

  return (
    <div className="space-y-2.5 pt-1.5 animate-in fade-in-50 duration-200">
      {/* Barra de Progresso e Classificação */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
            {analysis.isValid ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            )}
            Força da senha:
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeColor()}`}>
            {label} ({score}%)
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Checklist de Critérios de Segurança */}
      {showCriteria && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border/50">
          <CriteriaItem met={criteria.hasMinLength} text="Mínimo 8 caracteres" />
          <CriteriaItem met={criteria.hasUpper && criteria.hasLower} text="Letras maiúsculas e minúsculas" />
          <CriteriaItem met={criteria.hasNumber} text="Ao menos um número (0-9)" />
          <CriteriaItem met={criteria.hasSpecial} text="Símbolo especial (!@#$%...)" />
        </div>
      )}
    </div>
  );
};

const CriteriaItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <div className={`flex items-center gap-1.5 ${met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
    {met ? (
      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    ) : (
      <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
    )}
    <span>{text}</span>
  </div>
);

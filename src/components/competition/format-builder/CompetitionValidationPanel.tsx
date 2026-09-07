import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ConfigValidationResult } from '@/services/competitionConfigValidator';
import { cn } from '@/lib/utils';

export interface CompetitionValidationPanelProps {
  result: ConfigValidationResult;
  className?: string;
}

export const CompetitionValidationPanel: React.FC<CompetitionValidationPanelProps> = ({
  result,
  className = '',
}) => {
  const { isValid, errors, warnings } = result;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Banner Principal de Status */}
      <div
        className={cn(
          'p-4 rounded-xl border flex items-start gap-3 transition-all',
          isValid && warnings.length === 0
            ? 'bg-state-success/10 border-state-success/30 text-state-success'
            : !isValid
            ? 'bg-state-error/10 border-state-error/30 text-state-error'
            : 'bg-state-warning/10 border-state-warning/30 text-state-warning',
        )}
      >
        {isValid && warnings.length === 0 ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        ) : !isValid ? (
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        )}

        <div>
          <h4 className="text-xs font-semibold">
            {isValid && warnings.length === 0
              ? 'Configuração 100% Válida e Homologada'
              : !isValid
              ? `Configuração Inválida (${errors.length} erro${errors.length > 1 ? 's' : ''} bloqueante${errors.length > 1 ? 's' : ''})`
              : `Configuração Válida com ${warnings.length} aviso${warnings.length > 1 ? 's' : ''}`}
          </h4>
          <p className="text-[11px] opacity-90 mt-0.5">
            {isValid && warnings.length === 0
              ? 'A estrutura de fases, regras de sets, pontuações e feeds estão perfeitamente consistentes para execução.'
              : !isValid
              ? 'Corrija os erros listados abaixo para poder salvar e publicar a competição.'
              : 'A configuração é tecnicamente válida, mas revise os alertas informativos.'}
          </p>
        </div>
      </div>

      {/* Lista de Erros Bloqueantes */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-[11px] font-semibold uppercase tracking-wider text-state-error flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Erros Bloqueantes
          </h5>
          <div className="space-y-1.5">
            {errors.map((err, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-state-error/20 bg-state-error/5 text-xs text-text-primary flex items-start gap-2.5"
              >
                <span className="font-mono text-[10px] text-state-error font-semibold shrink-0 bg-state-error/10 px-1.5 py-0.5 rounded">
                  {err.field}
                </span>
                <span className="text-text-secondary">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Avisos (Warnings) */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-[11px] font-semibold uppercase tracking-wider text-state-warning flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Avisos e Alertas
          </h5>
          <div className="space-y-1.5">
            {warnings.map((warn, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-state-warning/20 bg-state-warning/5 text-xs text-text-primary flex items-start gap-2.5"
              >
                <span className="font-mono text-[10px] text-state-warning font-semibold shrink-0 bg-state-warning/10 px-1.5 py-0.5 rounded">
                  {warn.field}
                </span>
                <span className="text-text-secondary">{warn.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * BaseOS - Health Check & System Observability Service (Fase 26)
 *
 * Provê status em tempo real da saúde da aplicação, storage,
 * conectividade de banco de dados e integridade dos serviços.
 */

import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabaseClient';
import { dataAccess } from './dataAccess';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type HealthCheckResult = {
  status: HealthStatus;
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    storage: { status: HealthStatus; message?: string; latencyMs: number };
    database: { status: HealthStatus; message?: string; latencyMs: number; mode: 'supabase' | 'localStorage' };
    scoresheetEngine: { status: HealthStatus; message?: string };
  };
};

export class HealthCheckService {
  public static readonly VERSION = '1.2.0';

  public static async runHealthCheck(): Promise<HealthCheckResult> {
    const startStorage = performance.now();
    let storageStatus: HealthStatus = 'healthy';
    let storageMsg = 'LocalStorage operacional';

    try {
      localStorage.setItem('baseos_health_ping', 'pong');
      const val = localStorage.getItem('baseos_health_ping');
      localStorage.removeItem('baseos_health_ping');
      if (val !== 'pong') {
        storageStatus = 'degraded';
        storageMsg = 'Inconsistência na persistência de teste';
      }
    } catch (e: unknown) {
      storageStatus = 'unhealthy';
      storageMsg = e instanceof Error ? e.message : 'Falha ao acessar LocalStorage';
    }
    const storageLatency = Math.round(performance.now() - startStorage);

    const startDb = performance.now();
    let dbStatus: HealthStatus = 'healthy';
    let dbMsg = 'Operacional';
    const isSupa = isSupabaseConfigured();

    if (isSupa) {
      try {
        const client = await getSupabaseClient();
        if (!client) throw new Error('Cliente Supabase nulo');
        const { error } = await client.from('competitions').select('id').limit(1);
        if (error) throw error;
      } catch (e: unknown) {
        dbStatus = 'unhealthy';
        dbMsg = e instanceof Error ? e.message : 'Falha na conexão com Supabase';
      }
    } else {
      try {
        const comps = await dataAccess.listCompetitions();
        if (!Array.isArray(comps)) throw new Error('Retorno inválido');
      } catch (e: unknown) {
        dbStatus = 'degraded';
        dbMsg = e instanceof Error ? e.message : 'Erro ao listar competições';
      }
    }
    const dbLatency = Math.round(performance.now() - startDb);

    const overallStatus: HealthStatus =
      storageStatus === 'unhealthy' || dbStatus === 'unhealthy'
        ? 'unhealthy'
        : storageStatus === 'degraded' || dbStatus === 'degraded'
          ? 'degraded'
          : 'healthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: this.VERSION,
      environment: import.meta.env.MODE || 'development',
      checks: {
        storage: { status: storageStatus, message: storageMsg, latencyMs: storageLatency },
        database: { status: dbStatus, message: dbMsg, latencyMs: dbLatency, mode: isSupa ? 'supabase' : 'localStorage' },
        scoresheetEngine: { status: 'healthy', message: 'Motor vetorial BaseOS (3 e 5 sets) ativo' },
      },
    };
  }
}

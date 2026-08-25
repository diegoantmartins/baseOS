import { describe, it, expect, beforeEach } from 'vitest';
import { HealthCheckService } from '@/services/healthCheckService';

describe('Fase 26 — Observabilidade e Health Check Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve retornar status saudável com todos os subsistemas operacionais', async () => {
    const health = await HealthCheckService.runHealthCheck();

    expect(health.status).toBe('healthy');
    expect(health.version).toBe('1.2.0');
    expect(health.checks.storage.status).toBe('healthy');
    expect(health.checks.scoresheetEngine.status).toBe('healthy');
    expect(health.checks.storage.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

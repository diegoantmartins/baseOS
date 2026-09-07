#!/usr/bin/env node
/**
 * BaseOS — Validador de Isolamento de Ambiente de Staging
 * 
 * Garante que o ambiente de Staging NUNCA aponte para recursos de Produção.
 */

const targetEnv = process.env.TARGET_ENVIRONMENT || 'development';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const prodSupabaseUrl = process.env.PRODUCTION_SUPABASE_URL || '';
const prodProjectId = process.env.PRODUCTION_SUPABASE_PROJECT_ID || '';

console.log(`[BaseOS Env Validator] Validando ambiente: ${targetEnv}`);

if (targetEnv === 'staging') {
  if (!supabaseUrl) {
    console.warn('[BaseOS Env Validator] AVISO: VITE_SUPABASE_URL não definida em staging (usando fallback demo/local).');
  } else {
    // Validação 1: URL de staging não pode coincidir com a de produção
    if (prodSupabaseUrl && supabaseUrl.trim() === prodSupabaseUrl.trim()) {
      console.error('[BaseOS Env Validator] ERRO FATAL: Staging VITE_SUPABASE_URL coincide exatamente com a URL de PRODUÇÃO!');
      process.exit(1);
    }

    // Validação 2: Project ID de produção não pode estar presente na URL de staging
    if (prodProjectId && supabaseUrl.includes(prodProjectId)) {
      console.error(`[BaseOS Env Validator] ERRO FATAL: Staging URL contém o ID do projeto de PRODUÇÃO (${prodProjectId})!`);
      process.exit(1);
    }

    // Validação 3: Domínio de produção não pode estar presente
    if (supabaseUrl.includes('app.baseos.app')) {
      console.error('[BaseOS Env Validator] ERRO FATAL: Staging URL aponta para o domínio de produção app.baseos.app!');
      process.exit(1);
    }
  }

  console.log('✅ [BaseOS Env Validator] Isolamento de dados de Staging confirmado com sucesso.');
} else {
  console.log(`[BaseOS Env Validator] Ambiente ${targetEnv} validado.`);
}

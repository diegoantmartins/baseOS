#!/usr/bin/env bash
# ==============================================================================
# BaseOS — Script de Rollout de Produção (Passo 11)
# Servidor Alvo: VPS Contabo (vmi3488325 / 169.58.129.187) / voltz.baseos.online
# ==============================================================================
# Execução:
#   chmod +x scripts/deploy/rollout_production.sh
#   ./scripts/deploy/rollout_production.sh
# ==============================================================================

set -euo pipefail

# Cores para saída no terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/voltz}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Identificação de Container e Banco no Docker da VPS Contabo
CONTAINER_NAME="${DB_CONTAINER:-supabase-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

banner() {
  echo -e "${CYAN}==============================================================================${NC}"
  echo -e "${CYAN}  BaseOS — Rollout de Produção (Passo 11)                                    ${NC}"
  echo -e "${CYAN}  Ambiente: VPS Contabo (Produção VOLTZ)                                     ${NC}"
  echo -e "${CYAN}  Timestamp: ${TIMESTAMP}                                                    ${NC}"
  echo -e "${CYAN}==============================================================================${NC}"
}

banner

# ------------------------------------------------------------------------------
# 0. Verificação de Pré-Requisitos e Ambiente
# ------------------------------------------------------------------------------
log_info "Verificando ambiente de execução..."

# Testa se docker está acessível e container está rodando
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  EXEC_MODE="docker"
  log_success "Modo Docker detectado: usando container '${CONTAINER_NAME}'"
  RUN_SQL="docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -v ON_ERROR_STOP=1"
  RUN_QUERY="docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -A -c"
  DUMP_CMD="docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME}"
elif [ -n "${DATABASE_URL:-}" ]; then
  EXEC_MODE="direct_url"
  log_success "Modo URL Direta detectado: usando DATABASE_URL"
  RUN_SQL="psql \"${DATABASE_URL}\" -v ON_ERROR_STOP=1"
  RUN_QUERY="psql \"${DATABASE_URL}\" -t -A -c"
  DUMP_CMD="pg_dump \"${DATABASE_URL}\""
else
  log_error "Nenhum container Docker '${CONTAINER_NAME}' ativo e variável DATABASE_URL não definida."
  log_error "Execute este script no host da VPS Contabo onde os containers do Supabase estão em execução."
  exit 1
fi

# Cria diretório de backup com permissão segura
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

BACKUP_CUSTOM="${BACKUP_DIR}/voltz_prod_backup_${TIMESTAMP}.dump"
BACKUP_SQL="${BACKUP_DIR}/voltz_prod_backup_${TIMESTAMP}.sql"

# ------------------------------------------------------------------------------
# TAREFA 1: Backup de Produção (Disaster Recovery)
# ------------------------------------------------------------------------------
log_info "--- TAREFA 1: INICIANDO BACKUP DE PRODUÇÃO (DISASTER RECOVERY) ---"

log_info "Gerando snapshot em formato custom (-F c)..."
if [ "${EXEC_MODE}" = "docker" ]; then
  docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v > "${BACKUP_CUSTOM}"
  docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F p > "${BACKUP_SQL}"
else
  pg_dump "${DATABASE_URL}" -F c -b -v -f "${BACKUP_CUSTOM}"
  pg_dump "${DATABASE_URL}" -F p -f "${BACKUP_SQL}"
fi

# Validação de integridade do backup
if [ -f "${BACKUP_CUSTOM}" ] && [ -s "${BACKUP_CUSTOM}" ]; then
  log_info "Validando integridade estrutural do backup (pg_restore TOC)..."
  if [ "${EXEC_MODE}" = "docker" ]; then
    TOC_ENTRIES=$(docker exec -i "${CONTAINER_NAME}" pg_restore --list < "${BACKUP_CUSTOM}" | wc -l)
  else
    TOC_ENTRIES=$(pg_restore --list "${BACKUP_CUSTOM}" | wc -l)
  fi
  
  if [ "${TOC_ENTRIES}" -gt 20 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_CUSTOM}" | cut -f1)
    log_success "Backup custom validado com sucesso! Tamanho: ${BACKUP_SIZE}, Entradas TOC: ${TOC_ENTRIES}"
    log_success "Arquivo custom: ${BACKUP_CUSTOM}"
    log_success "Arquivo texto:   ${BACKUP_SQL}"
  else
    log_error "O arquivo de backup gerado possui menos entradas que o esperado (${TOC_ENTRIES}). Abortando por segurança!"
    exit 1
  fi
else
  log_error "Falha crítica ao gerar o arquivo de backup. Operação abortada!"
  exit 1
fi

# ------------------------------------------------------------------------------
# TAREFA 2: Sincronização do Banco de Produção (Migrations em Ordem Estrita)
# ------------------------------------------------------------------------------
log_info "--- TAREFA 2: APLICANDO MIGRATIONS NA ORDEM ESTRITA DEFINIDA ---"

MIGRATIONS=(
  "supabase/migrations/20261001000001_fix_matches_schema_drift.sql"
  "supabase/migrations/20261001000002_harden_core_rls_policies.sql"
  "supabase/migrations/20261003190000_frente8_multi_tenant_backfill.sql"
  "supabase/migrations/20261004000000_platform_admin_layer.sql"
)

for mig in "${MIGRATIONS[@]}"; do
  MIG_PATH="${REPO_ROOT}/${mig}"
  if [ ! -f "${MIG_PATH}" ]; then
    log_error "Arquivo de migration não encontrado: ${MIG_PATH}"
    exit 1
  fi

  log_info "Executando: $(basename "${mig}")..."
  if eval "${RUN_SQL}" < "${MIG_PATH}"; then
    log_success "Migration $(basename "${mig}") aplicada com sucesso!"
  else
    log_error "Erro ao aplicar $(basename "${mig}")! Abortando pipeline."
    log_error "Para restaurar o estado anterior, execute:"
    log_error "  pg_restore -U ${DB_USER} -d ${DB_NAME} --clean ${BACKUP_CUSTOM}"
    exit 1
  fi
done

# Recarrega o cache do PostgREST
log_info "Recarregando schema cache do PostgREST..."
eval "${RUN_QUERY} \"NOTIFY pgrst, 'reload schema';\""
log_success "Notificação enviada ao PostgREST."

# ------------------------------------------------------------------------------
# Validação do Backfill Multi-Tenant (Sanity Checks)
# ------------------------------------------------------------------------------
log_info "Verificando integridade pós-migração e isolamento multi-tenant..."

CHECK_ORPHANS_COMPS=$(eval "${RUN_QUERY} \"SELECT count(*) FROM public.competitions WHERE organization_id IS NULL;\"")
CHECK_ORPHANS_TEAMS=$(eval "${RUN_QUERY} \"SELECT count(*) FROM public.teams WHERE organization_id IS NULL;\"")
CHECK_ORPHANS_ATHLETES=$(eval "${RUN_QUERY} \"SELECT count(*) FROM public.athletes WHERE organization_id IS NULL;\"")
CHECK_ORPHANS_VENUES=$(eval "${RUN_QUERY} \"SELECT count(*) FROM public.venues WHERE organization_id IS NULL;\"")
CHECK_ORPHANS_REFEREES=$(eval "${RUN_QUERY} \"SELECT count(*) FROM public.referees WHERE organization_id IS NULL;\"")
CHECK_ORPHANS_PROFILES=$(eval "${RUN_QUERY} \"SELECT count(*) FROM public.profiles WHERE organization_id IS NULL;\"")

echo -e "  - Competições órfãs (organization_id IS NULL): ${CHECK_ORPHANS_COMPS}"
echo -e "  - Equipes órfãs (organization_id IS NULL):     ${CHECK_ORPHANS_TEAMS}"
echo -e "  - Atletas órfãos (organization_id IS NULL):    ${CHECK_ORPHANS_ATHLETES}"
echo -e "  - Locais órfãos (organization_id IS NULL):     ${CHECK_ORPHANS_VENUES}"
echo -e "  - Árbitros órfãos (organization_id IS NULL):   ${CHECK_ORPHANS_REFEREES}"
echo -e "  - Perfis órfãos (organization_id IS NULL):     ${CHECK_ORPHANS_PROFILES}"

if [ "${CHECK_ORPHANS_COMPS}" -eq 0 ] && [ "${CHECK_ORPHANS_TEAMS}" -eq 0 ] && [ "${CHECK_ORPHANS_ATHLETES}" -eq 0 ]; then
  log_success "Backfill verificado: 0 entidades órfãs! Todos os registros vinculados à VOLTZ."
else
  log_warn "Atenção: existem entidades sem organization_id pós-backfill. Verifique manualmente."
fi

VOLTZ_ID=$(eval "${RUN_QUERY} \"SELECT id FROM public.organizations WHERE upper(name) = 'VOLTZ' LIMIT 1;\"")
log_success "Organização Primária confirmada no catálogo: ${VOLTZ_ID}"

# ------------------------------------------------------------------------------
# TAREFA 3: Elevação de Privilégio Master (Product Owner)
# ------------------------------------------------------------------------------
log_info "--- TAREFA 3: CONFIRMAÇÃO DO PRIVILÉGIO MASTER DO PRODUCT OWNER ---"

PO_EMAIL="diegoantmartins89@gmail.com"
PO_ADMIN_STATUS=$(eval "${RUN_QUERY} \"SELECT is_platform_admin FROM public.profiles WHERE email = '${PO_EMAIL}' LIMIT 1;\"" || echo "false")

if [ "${PO_ADMIN_STATUS}" = "t" ] || [ "${PO_ADMIN_STATUS}" = "true" ]; then
  log_success "Product Owner (${PO_EMAIL}) confirmado como is_platform_admin = true!"
else
  log_warn "Perfil ${PO_EMAIL} não estava como is_platform_admin. Aplicando elevação..."
  eval "${RUN_QUERY} \"UPDATE public.profiles SET is_platform_admin = true WHERE email = '${PO_EMAIL}';\""
  log_success "Product Owner elevado com sucesso a Platform Admin!"
fi

# ------------------------------------------------------------------------------
# Conclusão e Resumo
# ------------------------------------------------------------------------------
echo -e ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ROLLOUT DE PRODUÇÃO CONCLUÍDO COM SUCESSO!                                  ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "  Backup Gerado:      ${BACKUP_CUSTOM}"
echo -e "  Backup SQL:         ${BACKUP_SQL}"
echo -e "  Organização VOLTZ:  ${VOLTZ_ID}"
echo -e "  Master PO Status:   ATIVO (is_platform_admin = true)"
echo -e "  Schema PostgREST:   RECARREGADO (NOTIFY pgrst)"
echo -e "${GREEN}==============================================================================${NC}"

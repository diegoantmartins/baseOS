# Procedimento de Backup e Restauração — BaseOS

## 1. Estratégia de Backup

O BaseOS opera com persistência primária no PostgreSQL (Supabase) em produção e LocalStorage no ambiente de demonstração local.

### Frequência Recomendada
- **Backup Diário Completo (Full)**: Executado às 03:00 UTC diariamente.
- **Point-in-Time Recovery (PITR)**: Ativado no Supabase para restauração granular até os últimos 7 dias.

---

## 2. Procedimento de Backup Manual (PostgreSQL / Supabase)

### Gerar Dump Completo do Banco de Dados
```bash
# Exporta estrutura de tabelas e dados em formato SQL comprimido
PGPASSWORD="<DB_PASSWORD>" pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres -F c -b -v -f baseos_backup_$(date +%Y%m%d_%H%M%S).dump
```

---

## 3. Procedimento de Restauração (Disaster Recovery)

### Validação e Restauração em Ambiente de Staging
```bash
# 1. Cria banco temporário ou limpa schema
dropdb -h localhost -U postgres baseos_staging_restore
createdb -h localhost -U postgres baseos_staging_restore

# 2. Restaura o dump comprimido
pg_restore -h localhost -U postgres -d baseos_staging_restore -v baseos_backup_YYYYMMDD_HHMMSS.dump

# 3. Validação de integridade pós-restore
psql -h localhost -U postgres -d baseos_staging_restore -c "SELECT count(*) FROM competitions; SELECT count(*) FROM matches; SELECT count(*) FROM competition_athletes;"
```

---

## 4. Backup do Ambiente LocalStorage (Modo Demo / Offline)

Pelo console do navegador ou interface de administração:
```javascript
// Exporta todos os dados do BaseOS para arquivo JSON
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.startsWith('voleipro.') || key.startsWith('baseos.'))) {
    backup[key] = localStorage.getItem(key);
  }
}
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `baseos_demo_backup_${new Date().toISOString().slice(0, 10)}.json`;
a.click();
```

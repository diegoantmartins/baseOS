# Guia de Deploy e Operação em Produção — BaseOS

## 1. Ambientes

| Ambiente | URL | Estratégia de Deploy |
| :--- | :--- | :--- |
| **Development** | `http://localhost:3004` | `npm run dev` (Vite HMR) |
| **Staging** | `https://staging.baseos.app` | Automático via merge na branch `develop` |
| **Production** | `https://app.baseos.app` | Automático via criação de tag SemVer (`v*.*.*`) na branch `main` |

---

## 2. Deploy com Docker (Container de Produção)

### Construção da Imagem
```bash
docker build -t baseos/volleyscore-hub:1.2.0 .
```

### Execução do Container
```bash
docker run -d \
  --name baseos-app \
  -p 80:80 \
  --restart unless-stopped \
  baseos/volleyscore-hub:1.2.0
```

### Validação de Saúde (Health Check)
```bash
docker inspect --format='{{json .State.Health}}' baseos-app
```

---

## 3. Variáveis de Ambiente de Produção
Configuradas no provedor de hospedagem ou secrets do GitHub Actions:
- `VITE_SUPABASE_URL`: Endpoint da API do Supabase em produção.
- `VITE_SUPABASE_ANON_KEY`: Chave anônima pública do Supabase com RLS ativo.

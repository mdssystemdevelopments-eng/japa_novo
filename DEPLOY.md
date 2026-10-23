# Deploy — Neon + Render (API) + Vercel (painel)

## 1. Neon (PostgreSQL)

1. No [Neon Console](https://console.neon.tech), confirme o projeto e a connection string **pooled** (host com `-pooler`).
2. Use na Render a URL com `sslmode=require` (pode omitir `channel_binding=require` se o Prisma falhar).
3. Migrações e seed (uma vez, na sua máquina ou no start da Render):

```powershell
cd backend
$env:DATABASE_URL="SUA_URL_NEON"
npx prisma migrate deploy
npm run seed
```

Credenciais iniciais após seed: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defina na Render antes do seed).

---

## 2. Render — Backend NestJS

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Conecte o repositório GitHub `mdssystemdevelopments-eng/japa_novo`.
3. Configuração:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm run start:prod`
   - **Health Check Path:** `/api/health`
4. **Environment Variables** (obrigatórias):

| Variável | Valor |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | connection string Neon (pooled) |
| `JWT_ACCESS_SECRET` | string aleatória ≥ 32 caracteres |
| `JWT_REFRESH_SECRET` | outra string ≥ 32 caracteres |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL` | `7d` |
| `CORS_ORIGIN` | URL do Vercel (ex. `https://seu-app.vercel.app`) |
| `APP_PUBLIC_URL` | mesma URL do Vercel |
| `SEED_ADMIN_EMAIL` | e-mail do admin |
| `SEED_ADMIN_PASSWORD` | senha forte inicial |

5. **Create Web Service** e aguarde o deploy.
6. Teste: `https://SEU-SERVICO.onrender.com/api/health` → deve retornar `ok`.
7. OpenAPI: `https://SEU-SERVICO.onrender.com/api/docs`

Opcional: importar o `render.yaml` na raiz do repo (Blueprint).

---

## 3. Vercel — Frontend Next.js

1. [vercel.com/new](https://vercel.com/new) → importar `japa_novo`.
2. Configuração:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js
3. **Environment Variables:**

| Variável | Valor |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://SEU-SERVICO.onrender.com/api` |

4. **Deploy**.
5. Copie a URL gerada (ex. `https://japa-insufilm.vercel.app`) e atualize na Render:
   - `CORS_ORIGIN` = essa URL (sem barra no final)
   - `APP_PUBLIC_URL` = mesma URL
6. Redeploy da Render após alterar CORS.

---

## 4. Ordem recomendada

1. Neon → migrar + seed  
2. Render → API no ar  
3. Vercel → painel com `NEXT_PUBLIC_API_URL` apontando para a Render  
4. Ajustar CORS na Render com a URL final do Vercel  

---

## Segurança

- Nunca commite `.env`, tokens GitHub ou senhas do banco.
- Revogue tokens que foram expostos em chat e crie novos.
- Troque a senha do admin após o primeiro login em produção.

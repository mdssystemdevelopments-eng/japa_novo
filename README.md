# Japa Insufilm — Sistema de Gestão

Aplicação administrativa com backend NestJS, frontend Next.js e PostgreSQL.

## Pré-requisitos

- Node.js 20+

**Banco de dados (escolha uma opção):**

1. **Prisma Dev (recomendado sem Docker)** — PostgreSQL embutido, evita conflito com PostgreSQL já instalado na porta 5432.
2. **Docker Compose** — PostgreSQL na porta **5433** (para não conflitar com PG local).

## Inicialização rápida

```powershell
cd japa
npm run setup
cd backend
copy .env.example .env
npm run db:dev
npm run db:sync-env
npm exec prisma migrate deploy
npm run seed
cd ..
npm run dev
```

- Painel: `http://localhost:3000`
- API: `http://localhost:3001/api`
- OpenAPI: `http://localhost:3001/api/docs`

### Com Docker (opcional)

```powershell
docker compose up -d
```

Ajuste `DATABASE_URL` no `backend/.env` para `postgresql://japa:japa_dev_password@localhost:5433/japa_insufilm?schema=public` e rode migrate + seed.

## Acesso inicial

Após o seed (variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no `.env` do backend):

- E-mail padrão: `admin@japainsufilm.local`
- Senha padrão: `AlterarSenha123!`

Altere a senha após o primeiro acesso.

## Recuperação de senha

1. Use **Esqueci minha senha** na tela de login.
2. Em desenvolvimento, o link completo é registrado no log do backend (`Recuperação de senha (desenvolvimento)`).
3. Em produção, configure um provedor de e-mail e `APP_PUBLIC_URL` no backend.

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `backend/` | API REST, Prisma, autenticação, módulos de negócio |
| `frontend/` | Painel administrativo Next.js |
| `docker-compose.yml` | PostgreSQL, Redis, MinIO |

## Estado do projeto

Consulte `PROJECT_STATUS.md` e `IMPLEMENTATION_PLAN.md`.

## Entrada de mercadorias (CSV)

Exemplo de cabeçalho:

```text
codigo;descricao;quantidade;valor_unitario
PEL-001;Película fumê 35%;50;12.50
```

Fluxo: **Entrada de mercadorias** → importar CSV → vincular produtos → salvar rascunho → confirmar (atualiza estoque).

## Limitações atuais

- **Docker**: necessário para o banco local; se o daemon não estiver ativo, migrações e seed falham até subir os containers.
- **WhatsApp (Evolution API)**: estrutura de dados preparada; integração operacional na Etapa 4 (`EVOLUTION_API_URL` e `EVOLUTION_API_KEY`).
- **E-mail transacional**: recuperação de senha grava token no banco; envio por e-mail depende de provedor configurado.

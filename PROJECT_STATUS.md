# PROJECT_STATUS — Japa Insufilm

**Última atualização:** 23/10/2025

## Diagnóstico

| Item | Situação |
|------|----------|
| Frontend | Next.js 15, TypeScript, Tailwind, TanStack Query, React Hook Form, Zod |
| Backend | NestJS 10, Prisma 6, PostgreSQL, OpenAPI, JWT, RBAC |
| Infra local | `docker-compose.yml` (PostgreSQL, Redis, MinIO) |
| Migrações | até `20251023180000_work_orders` |
| Mobile | Não iniciado (Etapa 6) |
| Evolution API | Modelo `WhatsappConfig` / mensagens; integração na Etapa 4 |

## Problemas / dependências externas

1. **Banco local:** use `npm run db:dev` (Prisma Dev) se não tiver Docker — evita conflito com PostgreSQL 18 na porta 5432. Depois `npm run db:sync-env` e `npm run db:prepare`.
2. **Docker (opcional):** PostgreSQL exposto na porta **5433** no `docker-compose.yml`.
3. **E-mail**: recuperação de senha grava token; em dev o link vai para o log do backend. Produção exige provedor de e-mail (a implementar).
4. **Evolution API e fiscal**: exigem credenciais e validação contábil antes de produção.

## Módulos

| Módulo | Status |
|--------|--------|
| Autenticação (login, refresh, logout, recuperação de senha) | Funcional |
| RBAC (5 perfis, permissões no backend) | Funcional |
| Dashboard (indicadores reais do banco) | Funcional |
| Configurações da empresa | Funcional |
| Usuários (listagem e criação) | Funcional |
| Auditoria (listagem) | Funcional |
| Clientes (cadastro completo, edição, arquivar, CEP) | Funcional |
| Veículos (por cliente + listagem) | Funcional |
| Produtos e bobinas | Funcional (base) |
| Estoque (movimentações) | Funcional (base) |
| Fornecedores | Funcional |
| Entrada de mercadorias (CSV + conferência + estoque) | Funcional (OCR/PDF/XLSX pendente) |
| Orçamentos e agendamentos (base) | Funcional |
| Ordens de serviço (checklist, estoque, contas a receber na conclusão) | Funcional |
| Conversão orçamento aprovado → OS (opcional agendamento) | Funcional |
| WhatsApp, financeiro completo, fiscal | Pendente |

## Funcionalidades concluídas nesta base

- API REST com guards globais (JWT, permissões, rate limit).
- Seed: empresa Japa Insufilm, perfis, permissões, administrador.
- Painel administrativo com navegação filtrada por permissão.
- Validação CPF/CNPJ no cadastro de clientes.
- Testes unitários: validadores de documento.

## Comandos para validar

```powershell
cd japa
docker compose up -d
cd backend
copy .env.example .env
npm install
npx prisma migrate deploy
npm run seed
cd ..
npm install
npm run dev
```

API: `http://localhost:3001/api` · Docs: `http://localhost:3001/api/docs` · Painel: `http://localhost:3000`

Acesse `http://localhost:3000/login` com as credenciais do seed.

## Próximos passos

Ver `IMPLEMENTATION_PLAN.md` (completar clientes na UI, veículos, produtos, estoque).

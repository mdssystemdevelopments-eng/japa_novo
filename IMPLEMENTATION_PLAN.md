# IMPLEMENTATION_PLAN — Japa Insufilm

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído

## Etapa 2 — Cadastros e estoque

- [x] Clientes, veículos, produtos, bobinas, estoque base
- [x] Fornecedores
- [~] Entrada de mercadorias (CSV, conferência, confirmação, estoque transacional)
- [ ] OCR/PDF/XLSX para entrada
- [ ] Fornecedores: histórico de preços e pedidos de compra

## Etapa 3 — Operação

- [~] Orçamentos (rascunho, itens, totais, alteração de status)
- [~] Agendamentos (CRUD, conflito de horário)
- [x] Orçamentos: conversão em OS (agendamento opcional)
- [ ] Orçamentos: histórico de preços, envio WhatsApp
- [ ] Agenda: visão semanal/mensal, profissionais, lembretes
- [~] Ordens de serviço (checklist, baixa de estoque, conta a receber na conclusão)
- [ ] Garantias pós-OS

## Etapas 4–7

- Ver plano anterior (WhatsApp, financeiro, relatórios, mobile, estabilização)

---

**Última atualização:** 23/10/2025

**Migração:** `20251023180000_work_orders`  
**Seed:** executar `npm run seed` no backend após migrate (permissões `work_orders.*`).  
**Dev:** na raiz do projeto, `npm run dev` (API + frontend).

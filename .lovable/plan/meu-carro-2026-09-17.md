# Meu Carro 🚗

Nova tela independente para acompanhar a compra e a quitação do veículo, sem mexer em nada do que já existe.

## Acesso

- Item "Meu Carro 🚗" no menu lateral, visível apenas nas suas contas (mesma regra do "Gastos do mês").
- Acesso direto pelo link é redirecionado ao Dashboard para outras contas.
- As parcelas do carro **não** entram nos totais de gastos do mês nem no Dashboard.

## 1. Cadastro do objetivo

Formulário para criar e editar:

- Nome do objetivo (padrão: Meu Carro)
- Descrição (opcional)
- Valor total (padrão R$ 68.300,00)
- Data de início dos pagamentos
- Quantidade de parcelas
- Dia do vencimento
- Forma de pagamento (Pix, Débito, Dinheiro, Boleto, Transferência, Outros)
- Observações

Modo de parcelas:

- Valores iguais (centavos de sobra na primeira parcela); ou
- Primeira parcela personalizada + demais fixas.

Antes de salvar, o sistema mostra a soma das parcelas e bloqueia o salvamento quando ela não fecha com o valor total.

## 2. Painel do carro

Cards de resumo: valor total, total pago, saldo restante, parcelas pagas / total, percentual de quitação, próxima parcela a vencer e último pagamento realizado. Barra de progresso destacada com o percentual quitado.

## 3. Lista de parcelas

Geradas automaticamente ao salvar o cadastro. Cada linha: número (ex. 01/48), vencimento, valor previsto, checkbox de pago, status (Pendente, Pago, Atrasado — atrasado é vencimento passado sem pagamento), data do pagamento, forma de pagamento e observação.

Marcar o checkbox registra a data do pagamento (editável) e atualiza na hora total pago, saldo, percentual e contagem. Desmarcar desfaz tudo.

## 4. Filtros

Abas Todas / Pagas / Pendentes / Atrasadas e filtro por mês e ano do vencimento.

## 5. Design

Segue o padrão atual: cards claros, barra de progresso, cores suaves distinguindo pago, pendente e atrasado, checkbox grande e fácil de tocar, tabela em telas grandes e cartões empilhados no celular.

## Detalhes técnicos

- Migração: tabela `carro_objetivos` (nome, descricao, valor_total, data_inicio, qtd_parcelas, dia_vencimento, forma_pagamento reaproveitando `payment_method`, primeira_parcela_valor, observacao, created_by, timestamps) e `carro_parcelas` (objetivo_id, numero, total, valor_previsto, data_vencimento, pago, data_pagamento, forma_pagamento, observacao). GRANTs para `authenticated`/`service_role`, RLS: leitura autenticada, escrita do dono ou admin. Trigger de `updated_at` reutilizando `update_updated_at_column()`.
- Regeneração de parcelas ao editar o cadastro preserva pagamentos já marcados pelo número da parcela.
- `src/lib/carro.ts` com tipos, queries TanStack e cálculo de resumo; `src/routes/carro.tsx` com painel, filtros e lista; `src/components/app/CarroObjetivoDialog.tsx` para cadastro/edição.
- `AppShell.tsx` ganha o item de menu com a flag `somenteLarisse`.
- Tipos do banco regenerados após a migração.

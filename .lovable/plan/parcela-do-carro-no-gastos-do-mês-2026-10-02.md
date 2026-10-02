# Parcela do carro no "Gastos do mês"

## O que muda
- Em "Gastos do mês", a parcela do carro que vence no mês selecionado aparece numa linha própria "Meu Carro 🚗 — parcela 05/48", com valor, vencimento e situação (Pago / Pendente / Atrasado).
- A parcela entra **sempre** no total do mês em que vence, paga ou não.
- Só para ver: para marcar como paga, continue usando o "Meu Carro". Um link leva direto para lá.
- Fechamento mensal ganha a linha "Carro"; o resumo por categoria soma o carro em "Carro"; a comparação entre meses e o saldo do mês passam a incluir a parcela.
- Nada é lançado em dobro: a parcela não vira um gasto novo, ela é lida direto do "Meu Carro". Se você já tiver lançado o carro à mão como gasto recorrente, eu aviso na tela para você excluir esses lançamentos e não somar duas vezes.
- O card do Dashboard continua igual (sem o carro), como combinado antes.

## Detalhes técnicos
- `src/routes/gastos.tsx`: usar `carroParcelasQuery` + `carroObjetivosQuery`; filtrar por `data_vencimento` no mês selecionado; somar em `totalMes`, no fechamento, em categoria "Carro" e no histórico mensal; card/linha somente leitura com `parcelaStatus` e link para `/carro`.
- Aviso de duplicidade: se houver gasto do mês com categoria "Carro" e descrição contendo "carro", mostrar alerta.
- Sem mudança no banco.

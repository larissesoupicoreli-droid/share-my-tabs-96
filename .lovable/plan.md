# Recorrência de gastos e recebíveis mensais

## O que será entregue

- No cadastro de gasto, incluir a opção **Recorrente** e a quantidade de meses. Um gasto de 48 meses criará 48 lançamentos, cada um no seu mês, preservando o dia informado.
- Criar a área **Recebíveis** dentro de **Gastos do mês**, usando o mesmo seletor de mês.
- Permitir cadastrar, editar, duplicar e excluir receitas como Salário, Casarão Decorações, Comissão e Extras.
- Cada receita terá descrição, valor, data prevista, mês de referência, status **Recebido** ou **A receber** e observação.
- Mostrar no fechamento mensal: total recebido, total a receber, despesas nos cartões da Larisse, despesas fora do cartão e saldo do mês.

## Comportamento

- Recorrência será criada somente quando a pessoa marcar a opção e informar a quantidade de meses.
- A edição de um lançamento altera apenas aquele mês; não modifica automaticamente toda a série.
- Receitas ficam organizadas pelo mês de referência, sem repetição automática.
- O saldo considera receitas recebidas menos todas as despesas do mês; valores ainda a receber aparecem separadamente.

## Detalhes técnicos

- Adicionar uma tabela protegida para recebíveis, com acesso de leitura para usuários autenticados e edição/exclusão pelo criador ou administrador.
- Relacionar lançamentos recorrentes de gastos por um identificador de série, mantendo cada parcela como um registro mensal independente.
- Atualizar consultas, formulários, totais e a tela mensal sem duplicar valores já vindos das faturas.
- Validar a tela em computador e celular, além das operações de criar, editar e excluir.
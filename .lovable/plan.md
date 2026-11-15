# Corrigir os 11 alertas de acesso selecionados

## Resultado
- Impedir que qualquer pessoa que crie uma conta veja os dados financeiros da família.
- Preservar o acesso compartilhado aos cartões, compras, parcelas, rateios, responsáveis e categorias para as duas contas atuais da Larisse e a conta atual do Matheus.
- Restringir gastos, receitas, objetivos do carro e parcelas do carro ao autor do registro e às administradoras atuais. Matheus não poderá consultar esses dados pessoais, inclusive fora das telas do aplicativo.
- Não alterar valores, pagamentos, regras de edição, nem outros alertas de segurança.

## Confirmação necessária
Aprovar o plano confirma esses limites de acesso. Novas contas não receberão automaticamente acesso aos dados compartilhados; será necessária uma autorização explícita.

## Detalhes técnicos
- Criar uma lista protegida de contas autorizadas para leitura compartilhada, preenchida com os três identificadores de contas existentes verificados no banco. Não usar nome de perfil nem o papel `member`, que é atribuído automaticamente a novos cadastros.
- Substituir somente as 11 políticas SELECT permissivas: leitura compartilhada exige autorização nessa lista ou papel administrativo; leitura pessoal exige autoria ou papel administrativo; parcelas do carro seguem a autorização do objetivo correspondente.
- Aplicar a mudança pelo mecanismo de migrações do Lovable Cloud, mantendo as demais políticas intactas.
- Validar as políticas efetivas com contas autorizadas e uma identidade sem autorização; conferir que registros e totais não foram alterados.
- Registrar a regra de acesso em AGENTS.md e marcar somente os 11 alertas selecionados como corrigidos depois da validação.
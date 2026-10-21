// Guarda o último mês selecionado em uma tela com seletor de mês (fatura, compras),
// para pré-preencher a "Fatura de referência" ao abrir "Nova compra".
let mesAtivo: string | null = null;

export function setMesAtivo(mes: string) {
  mesAtivo = mes;
}

export function getMesAtivo() {
  return mesAtivo;
}

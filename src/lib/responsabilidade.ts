export function resolveResponsabilidade(temRateio: boolean, selecionado: string, atual: string | null) {
  const manterRateio = temRateio && selecionado === "manter-rateio";
  return {
    manterRateio,
    responsavelCompra: manterRateio ? atual : selecionado || null,
    responsavelParcela: manterRateio ? null : selecionado || null,
    removerRateio: temRateio && !manterRateio,
  };
}
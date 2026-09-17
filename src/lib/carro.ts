import { supabase } from "@/integrations/supabase/client";
import { addMonths, dueDateFor, monthKey, splitAmount } from "@/lib/finance";
import type { PaymentMethod } from "@/lib/gastos";

export type CarroObjetivo = {
  id: string;
  nome: string;
  descricao: string | null;
  valor_total: number;
  data_inicio: string;
  qtd_parcelas: number;
  dia_vencimento: number;
  forma_pagamento: PaymentMethod;
  primeira_parcela_valor: number | null;
  observacao: string | null;
  created_by: string;
};

export type CarroParcela = {
  id: string;
  objetivo_id: string;
  numero: number;
  total: number;
  valor_previsto: number;
  data_vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  forma_pagamento: PaymentMethod;
  observacao: string | null;
};

const unwrap = <T,>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
};

export const carroObjetivosQuery = {
  queryKey: ["carro_objetivos"],
  queryFn: async () =>
    unwrap<CarroObjetivo[]>(
      await supabase
        .from("carro_objetivos")
        .select(
          "id,nome,descricao,valor_total,data_inicio,qtd_parcelas,dia_vencimento,forma_pagamento,primeira_parcela_valor,observacao,created_by",
        )
        .order("created_at"),
    ),
};

export const carroParcelasQuery = {
  queryKey: ["carro_parcelas"],
  queryFn: async () =>
    unwrap<CarroParcela[]>(
      await supabase
        .from("carro_parcelas")
        .select(
          "id,objetivo_id,numero,total,valor_previsto,data_vencimento,pago,data_pagamento,forma_pagamento,observacao",
        )
        .order("numero"),
    ),
};

/** Valores das parcelas: iguais, ou 1ª personalizada e as demais fixas. */
export function planParcelas(input: {
  valorTotal: number;
  qtdParcelas: number;
  primeiraParcela?: number | null;
}): number[] {
  const n = Math.max(1, Math.round(input.qtdParcelas));
  const primeira = input.primeiraParcela ?? null;
  if (primeira == null || primeira <= 0) return splitAmount(input.valorTotal, n);
  if (n === 1) return [primeira];
  const restoCents = Math.round(input.valorTotal * 100) - Math.round(primeira * 100);
  const fixa = Math.round(restoCents / (n - 1)) / 100;
  return [primeira, ...Array.from({ length: n - 1 }, () => fixa)];
}

export function planVencimentos(dataInicio: string, diaVencimento: number, n: number): string[] {
  const [y, m] = dataInicio.split("-").map(Number);
  const mesBase = monthKey(new Date(Date.UTC(y!, (m ?? 1) - 1, 1)));
  return Array.from({ length: n }, (_, i) => dueDateFor(addMonths(mesBase, i), diaVencimento));
}

export type CarroParcelaStatus = "pago" | "pendente" | "atrasado";

export const parcelaStatus = (p: CarroParcela, hoje: string): CarroParcelaStatus =>
  p.pago ? "pago" : p.data_vencimento < hoje ? "atrasado" : "pendente";

export function resumoCarro(objetivo: CarroObjetivo | null, parcelas: CarroParcela[], hoje: string) {
  const total = Number(objetivo?.valor_total ?? 0);
  const pagas = parcelas.filter((p) => p.pago);
  const totalPago = pagas.reduce((s, p) => s + Number(p.valor_previsto), 0);
  const restante = Math.max(total - totalPago, 0);
  const percentual = total > 0 ? Math.min((totalPago / total) * 100, 100) : 0;
  const proxima = parcelas
    .filter((p) => !p.pago)
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0] ?? null;
  const ultimo = pagas
    .slice()
    .sort((a, b) => (a.data_pagamento ?? "").localeCompare(b.data_pagamento ?? ""))
    .pop() ?? null;
  const atrasadas = parcelas.filter((p) => parcelaStatus(p, hoje) === "atrasado").length;
  return {
    total,
    totalPago,
    restante,
    percentual,
    pagasCount: pagas.length,
    totalCount: parcelas.length,
    proxima,
    ultimo,
    atrasadas,
  };
}

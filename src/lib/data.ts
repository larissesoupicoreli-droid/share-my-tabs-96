import { supabase } from "@/integrations/supabase/client";
import { installmentShares, type InstallmentStatus, type PurchaseType } from "./finance";

export type Responsavel = { id: string; nome: string; cor: string; ativo: boolean };
export type Categoria = { id: string; nome: string };
export type Cartao = {
  id: string;
  nome: string;
  banco: string | null;
  ultimos4: string | null;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  titular_id: string | null;
  ativo: boolean;
};
export type Compra = {
  id: string;
  descricao: string;
  valor_total: number;
  data_compra: string;
  tipo: PurchaseType;
  qtd_parcelas: number;
  cartao_id: string;
  categoria_id: string | null;
  responsavel_id: string | null;
  observacao: string | null;
  recorrencia_fim: string | null;
  created_by: string;
};
export type Parcela = {
  id: string;
  compra_id: string;
  cartao_id: string;
  responsavel_id: string | null;
  categoria_id: string | null;
  numero: number;
  total: number;
  valor: number;
  mes_referencia: string;
  data_prevista: string;
  status: InstallmentStatus;
};
export type Rateio = { id: string; compra_id: string; responsavel_id: string; valor: number };

const unwrap = <T,>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
};

export const responsaveisQuery = {
  queryKey: ["responsaveis"],
  queryFn: async () =>
    unwrap<Responsavel[]>(await supabase.from("responsaveis").select("*").order("nome")),
};

export const categoriasQuery = {
  queryKey: ["categorias"],
  queryFn: async () => unwrap<Categoria[]>(await supabase.from("categorias").select("*").order("nome")),
};

export const cartoesQuery = {
  queryKey: ["cartoes"],
  queryFn: async () => unwrap<Cartao[]>(await supabase.from("cartoes").select("*").order("nome")),
};

export const comprasQuery = {
  queryKey: ["compras"],
  queryFn: async () =>
    unwrap<Compra[]>(await supabase.from("compras").select("*").order("data_compra", { ascending: false })),
};

export const parcelasQuery = {
  queryKey: ["parcelas"],
  queryFn: async () =>
    unwrap<Parcela[]>(await supabase.from("parcelas").select("*").order("mes_referencia")),
};

export const rateiosQuery = {
  queryKey: ["rateios"],
  queryFn: async () => unwrap<Rateio[]>(await supabase.from("rateios").select("*")),
};

/** Explode as parcelas em "quem deve pagar quanto", já aplicando rateio. */
export function shareRows(parcelas: Parcela[], compras: Compra[], rateios: Rateio[]) {
  const byCompra = new Map<string, Rateio[]>();
  for (const r of rateios) {
    const list = byCompra.get(r.compra_id) ?? [];
    list.push(r);
    byCompra.set(r.compra_id, list);
  }
  const compraById = new Map(compras.map((c) => [c.id, c]));
  return parcelas.flatMap((p) =>
    installmentShares(Number(p.valor), p.responsavel_id, byCompra.get(p.compra_id) ?? []).map((s) => ({
      ...s,
      parcela: p,
      compra: compraById.get(p.compra_id),
    })),
  );
}
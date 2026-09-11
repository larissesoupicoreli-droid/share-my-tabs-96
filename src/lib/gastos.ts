import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "pix" | "debito" | "dinheiro" | "boleto" | "transferencia" | "outros";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "outros", label: "Outros" },
];

export const paymentLabel = (v: string) =>
  PAYMENT_METHODS.find((p) => p.value === v)?.label ?? "Outros";

export type GastoCategoria = { id: string; nome: string };
export type Gasto = {
  id: string;
  descricao: string;
  valor: number;
  data_gasto: string;
  mes_referencia: string;
  categoria_id: string | null;
  forma_pagamento: PaymentMethod;
  responsavel_id: string | null;
  observacao: string | null;
  created_by: string;
};

export type MeuPerfil = { id: string; nome: string; responsavel_id: string | null };

export const meuPerfilQuery = {
  queryKey: ["meu-perfil"],
  queryFn: async (): Promise<MeuPerfil | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id,nome,responsavel_id")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as MeuPerfil | null) ?? { id: user.id, nome: "", responsavel_id: null };
  },
};

const unwrap = <T,>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
};

export const gastoCategoriasQuery = {
  queryKey: ["gasto_categorias"],
  queryFn: async () =>
    unwrap<GastoCategoria[]>(await supabase.from("gasto_categorias").select("id,nome").order("nome")),
};

export const gastosQuery = {
  queryKey: ["gastos"],
  queryFn: async () =>
    unwrap<Gasto[]>(
      await supabase
        .from("gastos")
        .select("id,descricao,valor,data_gasto,mes_referencia,categoria_id,forma_pagamento,responsavel_id,observacao,created_by")
        .order("data_gasto", { ascending: true }),
    ),
};

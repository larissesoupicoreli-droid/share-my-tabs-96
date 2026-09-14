import { supabase } from "@/integrations/supabase/client";

export type RecebivelStatus = "a_receber" | "recebido";

export type Recebivel = {
  id: string;
  descricao: string;
  valor: number;
  data_prevista: string;
  mes_referencia: string;
  status: RecebivelStatus;
  data_recebimento: string | null;
  observacao: string | null;
  created_by: string;
};

export const recebiveisQuery = {
  queryKey: ["recebiveis"],
  queryFn: async (): Promise<Recebivel[]> => {
    const { data, error } = await supabase
      .from("recebiveis")
      .select("id,descricao,valor,data_prevista,mes_referencia,status,data_recebimento,observacao,created_by")
      .order("data_prevista", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Recebivel[];
  },
};
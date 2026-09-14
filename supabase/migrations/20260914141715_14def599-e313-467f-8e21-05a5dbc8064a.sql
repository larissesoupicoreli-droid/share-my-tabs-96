ALTER TABLE public.gastos
  ADD COLUMN recorrencia_id uuid,
  ADD COLUMN recorrencia_numero integer,
  ADD COLUMN recorrencia_total integer;

CREATE INDEX gastos_recorrencia_idx ON public.gastos (recorrencia_id)
  WHERE recorrencia_id IS NOT NULL;

CREATE TYPE public.receivable_status AS ENUM ('a_receber', 'recebido');

CREATE TABLE public.recebiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data_prevista date NOT NULL,
  mes_referencia date NOT NULL,
  status public.receivable_status NOT NULL DEFAULT 'a_receber',
  data_recebimento date,
  observacao text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebiveis TO authenticated;
GRANT ALL ON public.recebiveis TO service_role;
ALTER TABLE public.recebiveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY recebiveis_read ON public.recebiveis FOR SELECT TO authenticated USING (true);
CREATE POLICY recebiveis_insert ON public.recebiveis FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY recebiveis_update ON public.recebiveis FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY recebiveis_delete ON public.recebiveis FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX recebiveis_mes_idx ON public.recebiveis (mes_referencia);

CREATE TRIGGER update_recebiveis_updated_at BEFORE UPDATE ON public.recebiveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
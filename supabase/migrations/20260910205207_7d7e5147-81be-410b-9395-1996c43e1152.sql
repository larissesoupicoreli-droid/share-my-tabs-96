CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.gasto_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gasto_categorias TO authenticated;
GRANT ALL ON public.gasto_categorias TO service_role;
ALTER TABLE public.gasto_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY gasto_categorias_read ON public.gasto_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY gasto_categorias_admin ON public.gasto_categorias FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT INSERT, UPDATE, DELETE ON public.gasto_categorias TO authenticated;

CREATE TYPE public.payment_method AS ENUM ('pix','debito','dinheiro','boleto','transferencia','outros');

CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data_gasto date NOT NULL,
  mes_referencia date NOT NULL,
  categoria_id uuid REFERENCES public.gasto_categorias(id),
  forma_pagamento public.payment_method NOT NULL DEFAULT 'pix',
  responsavel_id uuid REFERENCES public.responsaveis(id),
  observacao text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO authenticated;
GRANT ALL ON public.gastos TO service_role;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY gastos_read ON public.gastos FOR SELECT TO authenticated USING (true);
CREATE POLICY gastos_insert ON public.gastos FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY gastos_update ON public.gastos FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY gastos_delete ON public.gastos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX gastos_mes_idx ON public.gastos (mes_referencia);

CREATE TRIGGER update_gastos_updated_at BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.gasto_categorias (nome) VALUES
  ('Beleza'),('Casa'),('Carro'),('Pet'),('Alimentação'),('Saúde'),('Trabalho'),('Impostos'),('Contas'),('Lazer'),('Outros');
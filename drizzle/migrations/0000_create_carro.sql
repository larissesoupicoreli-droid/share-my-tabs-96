CREATE TABLE public.carro_objetivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'Meu Carro',
  descricao text,
  valor_total numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL,
  qtd_parcelas integer NOT NULL DEFAULT 1,
  dia_vencimento integer NOT NULL DEFAULT 10,
  forma_pagamento public.payment_method NOT NULL DEFAULT 'pix',
  primeira_parcela_valor numeric,
  observacao text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carro_objetivos TO authenticated;
GRANT ALL ON public.carro_objetivos TO service_role;
ALTER TABLE public.carro_objetivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY carro_objetivos_read ON public.carro_objetivos FOR SELECT TO authenticated USING (true);
CREATE POLICY carro_objetivos_insert ON public.carro_objetivos FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY carro_objetivos_update ON public.carro_objetivos FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY carro_objetivos_delete ON public.carro_objetivos FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_carro_objetivos_updated_at BEFORE UPDATE ON public.carro_objetivos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.carro_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id uuid NOT NULL REFERENCES public.carro_objetivos(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  total integer NOT NULL,
  valor_previsto numeric NOT NULL,
  data_vencimento date NOT NULL,
  pago boolean NOT NULL DEFAULT false,
  data_pagamento date,
  forma_pagamento public.payment_method NOT NULL DEFAULT 'pix',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (objetivo_id, numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carro_parcelas TO authenticated;
GRANT ALL ON public.carro_parcelas TO service_role;
ALTER TABLE public.carro_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY carro_parcelas_read ON public.carro_parcelas FOR SELECT TO authenticated USING (true);
CREATE POLICY carro_parcelas_write ON public.carro_parcelas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.carro_objetivos o WHERE o.id = carro_parcelas.objetivo_id AND (o.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.carro_objetivos o WHERE o.id = carro_parcelas.objetivo_id AND (o.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE INDEX carro_parcelas_objetivo_idx ON public.carro_parcelas (objetivo_id, numero);
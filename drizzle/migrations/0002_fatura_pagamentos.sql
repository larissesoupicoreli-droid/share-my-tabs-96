CREATE TABLE public.fatura_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id uuid NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cartao_id, mes_referencia, created_by)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatura_pagamentos TO authenticated;
GRANT ALL ON public.fatura_pagamentos TO service_role;
ALTER TABLE public.fatura_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.fatura_pagamentos FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "own insert" ON public.fatura_pagamentos FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "own delete" ON public.fatura_pagamentos FOR DELETE TO authenticated USING (created_by = auth.uid());
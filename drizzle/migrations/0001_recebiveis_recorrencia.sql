ALTER TABLE public.recebiveis ADD COLUMN recorrencia_id uuid;
ALTER TABLE public.recebiveis ADD COLUMN recorrencia_numero integer;
ALTER TABLE public.recebiveis ADD COLUMN recorrencia_total integer;
CREATE INDEX recebiveis_recorrencia_idx ON public.recebiveis (recorrencia_id) WHERE recorrencia_id IS NOT NULL;
CREATE TABLE public.finance_read_members (
  user_id uuid PRIMARY KEY
);
GRANT SELECT ON public.finance_read_members TO authenticated;
GRANT ALL ON public.finance_read_members TO service_role;
ALTER TABLE public.finance_read_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_read_members_self_read ON public.finance_read_members
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
COMMENT ON TABLE public.finance_read_members IS 'Explicit approval for shared family financial reads; signup never adds membership. Manage through privileged administration only.';

INSERT INTO public.finance_read_members (user_id)
SELECT id FROM public.profiles
WHERE id IN (
  'cf926dd3-47dd-435c-b5ea-3075fcc27a38'::uuid,
  'c2329fec-d6e2-4a65-bb0a-c8611a0c3b4e'::uuid,
  '9a4c25ec-e20b-41a2-bcfa-82c2b0085aaf'::uuid
);

CREATE FUNCTION public.can_read_shared_finances()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.finance_read_members m WHERE m.user_id = auth.uid()
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_shared_finances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_shared_finances() TO authenticated, service_role;

ALTER POLICY responsaveis_read ON public.responsaveis USING ((SELECT public.can_read_shared_finances()));
ALTER POLICY cartoes_read ON public.cartoes USING ((SELECT public.can_read_shared_finances()));
ALTER POLICY categorias_read ON public.categorias USING ((SELECT public.can_read_shared_finances()));
ALTER POLICY gasto_categorias_read ON public.gasto_categorias USING ((SELECT public.can_read_shared_finances()));
ALTER POLICY compras_read ON public.compras USING ((SELECT public.can_read_shared_finances()));
ALTER POLICY parcelas_read ON public.parcelas USING ((SELECT public.can_read_shared_finances()));
ALTER POLICY rateios_read ON public.rateios USING ((SELECT public.can_read_shared_finances()));

ALTER POLICY gastos_read ON public.gastos USING (
  created_by = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);
ALTER POLICY recebiveis_read ON public.recebiveis USING (
  created_by = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);
ALTER POLICY carro_objetivos_read ON public.carro_objetivos USING (
  created_by = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);
ALTER POLICY carro_parcelas_read ON public.carro_parcelas USING (
  EXISTS (
    SELECT 1 FROM public.carro_objetivos o
    WHERE o.id = carro_parcelas.objetivo_id
      AND (o.created_by = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  )
);
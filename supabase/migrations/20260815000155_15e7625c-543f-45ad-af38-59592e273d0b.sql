CREATE TYPE public.app_role AS ENUM ('admin','member');
CREATE TYPE public.purchase_type AS ENUM ('avista','parcelada','recorrente');
CREATE TYPE public.installment_status AS ENUM ('pendente','pago','cancelado');

CREATE TABLE public.responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT 'chart-1',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cartoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  banco text,
  ultimos4 text,
  limite numeric(12,2) NOT NULL DEFAULT 0,
  dia_fechamento int NOT NULL DEFAULT 1,
  dia_vencimento int NOT NULL DEFAULT 10,
  titular_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  pode_lancar boolean NOT NULL DEFAULT true,
  pode_editar boolean NOT NULL DEFAULT true,
  pode_excluir boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor_total numeric(12,2) NOT NULL,
  data_compra date NOT NULL,
  tipo public.purchase_type NOT NULL DEFAULT 'avista',
  qtd_parcelas int NOT NULL DEFAULT 1,
  cartao_id uuid NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  observacao text,
  recorrencia_fim date,
  cancelada boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rateios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  responsavel_id uuid NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  valor numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  cartao_id uuid NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  numero int NOT NULL DEFAULT 1,
  total int NOT NULL DEFAULT 1,
  valor numeric(12,2) NOT NULL,
  mes_referencia date NOT NULL,
  data_prevista date NOT NULL,
  status public.installment_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parcelas_mes_idx ON public.parcelas (mes_referencia);
CREATE INDEX parcelas_compra_idx ON public.parcelas (compra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsaveis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rateios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas TO authenticated;
GRANT ALL ON public.responsaveis, public.categorias, public.cartoes, public.profiles, public.user_roles, public.compras, public.rateios, public.parcelas TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role='admin') = 0 THEN 'admin'::public.app_role ELSE 'member'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rateios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responsaveis_read" ON public.responsaveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "responsaveis_admin" ON public.responsaveis FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "categorias_read" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_admin" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "cartoes_read" ON public.cartoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cartoes_admin" ON public.cartoes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "profiles_read_self" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_read_self" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "compras_read" ON public.compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "compras_insert" ON public.compras FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "compras_update" ON public.compras FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "compras_delete" ON public.compras FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "rateios_read" ON public.rateios FOR SELECT TO authenticated USING (true);
CREATE POLICY "rateios_write" ON public.rateios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "parcelas_read" ON public.parcelas FOR SELECT TO authenticated USING (true);
CREATE POLICY "parcelas_write" ON public.parcelas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compra_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

INSERT INTO public.responsaveis (nome, cor) VALUES
  ('Larisse','chart-1'),('Matheus','chart-2'),('Mãe','chart-3'),('Casa','chart-4'),
  ('Zoe','chart-5'),('Todos','chart-1'),('Empresa','chart-2'),('Outros','chart-3');

INSERT INTO public.categorias (nome) VALUES
  ('Alimentação'),('Transporte'),('Saúde'),('Academia'),('Estética'),('Aplicativos/Assinaturas'),
  ('Casa'),('Automóvel'),('Viagem'),('Compras'),('Outros');

INSERT INTO public.cartoes (nome, banco, ultimos4, limite, dia_fechamento, dia_vencimento, titular_id)
VALUES
  ('Nubank','Nubank','1234',8000,28,5,(SELECT id FROM public.responsaveis WHERE nome='Larisse')),
  ('Itaú','Itaú','5678',6000,20,1,(SELECT id FROM public.responsaveis WHERE nome='Larisse')),
  ('Inter','Inter','9012',4000,15,25,(SELECT id FROM public.responsaveis WHERE nome='Matheus'));
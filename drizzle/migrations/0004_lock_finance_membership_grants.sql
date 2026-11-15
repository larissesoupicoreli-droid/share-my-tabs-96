REVOKE ALL ON TABLE public.finance_read_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.finance_read_members TO authenticated;
GRANT ALL ON TABLE public.finance_read_members TO service_role;
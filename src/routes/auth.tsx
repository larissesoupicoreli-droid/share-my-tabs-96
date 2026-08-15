import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Controle de Cartões da Família" },
      { name: "description", content: "Acesse o controle financeiro familiar de cartões, parcelas e divisão de faturas." },
      { property: "og:title", content: "Entrar — Controle de Cartões da Família" },
      { property: "og:description", content: "Acesse o controle financeiro familiar de cartões e faturas." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  const entrar = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/" });
  };

  const cadastrar = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada! Se pedir confirmação, verifique seu e-mail.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="gradient-brand hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Controle familiar</p>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">
            Cadastre a compra uma vez.<br />O sistema cuida das parcelas.
          </h1>
          <p className="mt-4 max-w-md text-sm opacity-85">
            Titular do cartão e responsável pela compra são coisas diferentes — e na hora do fechamento você vê
            exatamente quanto cada pessoa deve pagar na fatura.
          </p>
        </div>
        <p className="text-xs opacity-70">Larisse · Matheus · Mãe · Casa · Zoe · Empresa</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="surface-card w-full max-w-sm p-6">
          <h2 className="text-xl font-semibold">Acessar o sistema</h2>
          <Tabs defaultValue="login" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Senha</Label>
                <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <Button onClick={entrar} disabled={busy}>Entrar</Button>
            </TabsContent>
            <TabsContent value="signup" className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Senha</Label>
                <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <Button onClick={cadastrar} disabled={busy}>Criar conta</Button>
              <p className="text-xs text-muted-foreground">
                A primeira conta criada vira administradora do sistema.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
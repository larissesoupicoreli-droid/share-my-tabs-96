import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [modo, setModo] = useState<"login" | "signup">("login");

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
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 text-sm">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`rounded-md px-3 py-1.5 transition-colors ${modo === m ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {modo === "signup" ? (
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            {modo === "login" ? (
              <Button onClick={entrar} disabled={busy}>Entrar</Button>
            ) : (
              <>
                <Button onClick={cadastrar} disabled={busy}>Criar conta</Button>
                <p className="text-xs text-muted-foreground">
                  A primeira conta criada vira administradora do sistema.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
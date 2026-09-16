import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, LayoutDashboard, Receipt, CalendarClock, User, LogOut, Menu, PiggyBank, X, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { meuPerfilQuery } from "@/lib/gastos";
import { Button } from "@/components/ui/button";
import { NovaCompraDialog } from "./NovaCompraDialog";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/fatura", label: "Divisão da fatura", icon: Receipt },
  { to: "/futuro", label: "Parcelas futuras", icon: CalendarClock },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/gastos", label: "Gastos do mês", icon: PiggyBank, somenteLarisse: true },
  { to: "/meu-financeiro", label: "Meu financeiro", icon: User },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { session, loading } = useSession();
  const { data: perfil } = useQuery(meuPerfilQuery);
  const isLarisse = (perfil?.nome ?? "").trim().toLowerCase().startsWith("larisse");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {open ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-foreground/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none print:hidden`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-sidebar-border px-2 pb-5 pt-1">
            <div className="grid size-9 shrink-0 place-items-center rounded-md border border-sidebar-primary/45 bg-sidebar-primary/10 text-sidebar-primary">
              <WalletCards className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">Controle familiar</p>
              <h2 className="truncate text-xl leading-tight text-sidebar-foreground">Cartões & Faturas</h2>
            </div>
            <Button aria-label="Fechar menu" variant="ghost" size="icon" className="text-sidebar-foreground lg:hidden" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </Button>
          </div>
          <nav className="mt-5 flex flex-col gap-1.5">
            {nav.filter((item) => !("somenteLarisse" in item && item.somenteLarisse) || isLarisse).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" }}
                className="group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4 shrink-0 text-sidebar-primary transition-colors group-hover:text-sidebar-accent-foreground" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="mt-auto flex items-center gap-2 rounded-md border-t border-sidebar-border px-3 py-4 text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8 print:hidden">
          <Button aria-label="Abrir menu" variant="outline" size="icon" className="shrink-0 lg:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-normal leading-none text-foreground sm:text-3xl">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <NovaCompraDialog />
        </header>
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8 print:p-0">{children}</div>
      </main>
    </div>
  );
}
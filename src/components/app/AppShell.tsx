import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { CreditCard, LayoutDashboard, Receipt, CalendarClock, Wallet, User, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { NovaCompraDialog } from "./NovaCompraDialog";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/fatura", label: "Divisão da fatura", icon: Receipt },
  { to: "/compras", label: "Compras", icon: Wallet },
  { to: "/futuro", label: "Parcelas futuras", icon: CalendarClock },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/meu-financeiro", label: "Meu financeiro", icon: User },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { session, loading } = useSession();
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
      <aside
        className={`${open ? "block" : "hidden"} bg-sidebar text-sidebar-foreground lg:block lg:w-64 lg:shrink-0`}
      >
        <div className="sticky top-0 flex h-full flex-col gap-6 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sidebar-primary">Controle familiar</p>
            <h2 className="mt-1 text-lg font-semibold">Cartões & Faturas</h2>
          </div>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <NovaCompraDialog />
        </header>
        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}
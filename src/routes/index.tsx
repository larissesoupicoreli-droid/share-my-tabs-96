import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CreditCard, UserRound, UsersRound, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { MonthPicker } from "@/components/app/MonthPicker";
import {
  cartoesQuery,
  categoriasQuery,
  comprasQuery,
  parcelasQuery,
  rateiosQuery,
  responsaveisQuery,
  shareRows,
} from "@/lib/data";
import { currentMonthKey, money, monthLabel } from "@/lib/finance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Controle de Cartões da Família" },
      {
        name: "description",
        content:
          "Visão mensal dos cartões: total das faturas, gastos por responsável, por categoria e por cartão, com parcelas geradas automaticamente.",
      },
      { property: "og:title", content: "Dashboard — Controle de Cartões da Família" },
      { property: "og:description", content: "Total das faturas, gastos por responsável, categoria e cartão." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [mes, setMes] = useState(currentMonthKey());
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);
  const { data: categorias = [] } = useQuery(categoriasQuery);
  const { data: parcelas = [] } = useQuery(parcelasQuery);
  const { data: compras = [] } = useQuery(comprasQuery);
  const { data: rateios = [] } = useQuery(rateiosQuery);

  const doMes = useMemo(
    () => parcelas.filter((p) => p.mes_referencia === mes && p.status !== "cancelado"),
    [parcelas, mes],
  );
  const total = doMes.reduce((s, p) => s + Number(p.valor), 0);

  const shares = useMemo(() => shareRows(doMes, compras, rateios), [doMes, compras, rateios]);

  const porResponsavel = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shares) {
      const nome = responsaveis.find((r) => r.id === s.responsavel_id)?.nome ?? "Sem responsável";
      map.set(nome, (map.get(nome) ?? 0) + s.valor);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [shares, responsaveis]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of doMes) {
      const nome = categorias.find((c) => c.id === p.categoria_id)?.nome ?? "Sem categoria";
      map.set(nome, (map.get(nome) ?? 0) + Number(p.valor));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [doMes, categorias]);

  const destaque = ["Larisse", "Matheus", "Mãe"];

  return (
    <AppShell title="Dashboard" subtitle={monthLabel(mes)}>
      <MonthPicker value={mes} onChange={setMes} />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="surface-card gradient-brand relative overflow-hidden p-5 text-primary-foreground sm:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] opacity-80">
            <WalletCards className="size-4" /> Total das faturas
          </div>
          <p className="num mt-3 text-3xl font-semibold">{money(total)}</p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-primary-foreground/15">
            <div className="h-full w-4/5 rounded-full bg-accent" />
          </div>
        </div>
        {destaque.map((nome, index) => {
          const valor = porResponsavel.find(([n]) => n === nome)?.[1] ?? 0;
          return (
            <div key={nome} className="surface-card p-5 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary">
                  <UserRound className="size-3.5" />
                </span>
                <span className="truncate">{nome}</span>
              </div>
              <p className="num mt-3 text-2xl font-semibold">{money(valor)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{total ? Math.round((valor / total) * 100) : 0}% do total</p>
            </div>
          );
        })}
        <div className="surface-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary"><UsersRound className="size-3.5" /></span>
            Outros
          </div>
          {(() => {
            const outros = porResponsavel.filter(([n]) => !destaque.includes(n)).reduce((s, [, v]) => s + v, 0);
            return <><p className="num mt-3 text-2xl font-semibold">{money(outros)}</p><p className="mt-1 text-xs text-muted-foreground">{total ? Math.round((outros / total) * 100) : 0}% do total</p></>;
          })()}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {cartoes.map((c) => {
          const doCartao = doMes.filter((p) => p.cartao_id === c.id).reduce((s, p) => s + Number(p.valor), 0);
          const titular = responsaveis.find((r) => r.id === c.titular_id)?.nome ?? "—";
          const uso = Number(c.limite) ? Math.min(100, (doCartao / Number(c.limite)) * 100) : 0;
          return (
            <div key={c.id} className="surface-card overflow-hidden p-5 transition-shadow hover:shadow-md">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary"><CreditCard className="size-4" /></span>
                  <div className="min-w-0">
                  <p className="font-semibold">{c.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.banco ?? ""} •••• {c.ultimos4 ?? "----"} · titular {titular}
                  </p>
                  </div>
                </div>
                <p className="num whitespace-nowrap text-lg font-semibold">{money(doCartao)}</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${uso}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <span>Limite<br/><strong className="num text-foreground">{money(Number(c.limite))}</strong></span>
                <span>Disponível<br/><strong className="num text-foreground">{money(Number(c.limite) - doCartao)}</strong></span>
                <span>Fechamento<br/><strong className="text-foreground">Dia {c.dia_fechamento}</strong></span>
                <span>Vencimento<br/><strong className="text-foreground">Dia {c.dia_vencimento}</strong></span>
              </div>
              <Link
                to="/fatura"
                className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold text-primary hover:text-primary/75"
              >
                Ver divisão da fatura <ArrowRight className="size-3" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Breakdown title="Gastos por responsável" rows={porResponsavel} total={total} />
        <Breakdown title="Gastos por categoria" rows={porCategoria} total={total} />
      </div>
    </AppShell>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-lg font-normal">{title}</h3>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p> : null}
        {rows.map(([nome, valor]) => (
          <div key={nome}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
              <span className="truncate">{nome}</span>
              <span className="num font-semibold">{money(valor)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${total ? (valor / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

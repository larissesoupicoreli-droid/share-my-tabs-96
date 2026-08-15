import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
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
  const pago = doMes.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

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

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="surface-card gradient-brand p-5 text-primary-foreground">
          <p className="text-xs uppercase tracking-[0.16em] opacity-80">Total das faturas</p>
          <p className="num mt-2 text-2xl font-semibold">{money(total)}</p>
          <p className="mt-1 text-xs opacity-80">Pago: {money(pago)}</p>
        </div>
        {destaque.map((nome) => (
          <div key={nome} className="surface-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total {nome}</p>
            <p className="num mt-2 text-2xl font-semibold">
              {money(porResponsavel.find(([n]) => n === nome)?.[1] ?? 0)}
            </p>
          </div>
        ))}
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Outros</p>
          <p className="num mt-2 text-2xl font-semibold">
            {money(porResponsavel.filter(([n]) => !destaque.includes(n)).reduce((s, [, v]) => s + v, 0))}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {cartoes.map((c) => {
          const doCartao = doMes.filter((p) => p.cartao_id === c.id).reduce((s, p) => s + Number(p.valor), 0);
          const titular = responsaveis.find((r) => r.id === c.titular_id)?.nome ?? "—";
          const uso = Number(c.limite) ? Math.min(100, (doCartao / Number(c.limite)) * 100) : 0;
          return (
            <div key={c.id} className="surface-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.banco ?? ""} •••• {c.ultimos4 ?? "----"} · titular {titular}
                  </p>
                </div>
                <p className="num text-lg font-semibold">{money(doCartao)}</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${uso}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Limite {money(Number(c.limite))}</span>
                <span className="text-right">Disponível {money(Number(c.limite) - doCartao)}</span>
                <span>Fecha dia {c.dia_fechamento}</span>
                <span className="text-right">Vence dia {c.dia_vencimento}</span>
              </div>
              <Link
                to="/fatura"
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
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
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p> : null}
        {rows.map(([nome, valor]) => (
          <div key={nome}>
            <div className="flex justify-between text-sm">
              <span>{nome}</span>
              <span className="num font-medium">{money(valor)}</span>
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

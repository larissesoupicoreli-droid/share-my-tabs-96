import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { MonthPicker } from "@/components/app/MonthPicker";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { cartoesQuery, categoriasQuery, comprasQuery, parcelasQuery, rateiosQuery, responsaveisQuery, shareRows } from "@/lib/data";
import { addMonths, currentMonthKey, dateLabel, money, shortMonthLabel } from "@/lib/finance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/meu-financeiro")({
  head: () => ({
    meta: [
      { title: "Meu financeiro — minhas compras e parcelas" },
      { name: "description", content: "Área pessoal: total do mês, parcelas, recorrentes e o que será lançado nos próximos meses." },
      { property: "og:title", content: "Meu financeiro — minhas compras e parcelas" },
      { property: "og:description", content: "Total do mês, parcelas e compromissos futuros da pessoa." },
    ],
  }),
  component: MeuFinanceiro,
});

function MeuFinanceiro() {
  const { user } = useSession();
  const [mes, setMes] = useState(currentMonthKey());
  const [respId, setRespId] = useState("");

  const { data: responsaveis = [] } = useQuery(responsaveisQuery);
  const { data: parcelas = [] } = useQuery(parcelasQuery);
  const { data: compras = [] } = useQuery(comprasQuery);
  const { data: rateios = [] } = useQuery(rateiosQuery);
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: categorias = [] } = useQuery(categoriasQuery);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("responsavel_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.responsavel_id) setRespId(data.responsavel_id);
      });
  }, [user]);

  const shares = useMemo(
    () => shareRows(parcelas.filter((p) => p.status !== "cancelado"), compras, rateios).filter((s) => s.responsavel_id === respId),
    [parcelas, compras, rateios, respId],
  );

  const doMes = shares.filter((s) => s.parcela.mes_referencia === mes);
  const proximos = Array.from({ length: 6 }, (_, i) => addMonths(mes, i + 1)).map((m) => ({
    mes: m,
    total: shares.filter((s) => s.parcela.mes_referencia === m).reduce((sum, s) => sum + s.valor, 0),
  }));

  return (
    <AppShell title="Meu financeiro" subtitle="O que é responsabilidade sua, independente do cartão usado">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={respId} onValueChange={setRespId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Escolha a pessoa" /></SelectTrigger>
          <SelectContent>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MonthPicker value={mes} onChange={setMes} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Total do mês" value={money(doMes.reduce((s, x) => s + x.valor, 0))} highlight />
        <Stat label="Pago" value={money(doMes.filter((s) => s.parcela.status === "pago").reduce((s, x) => s + x.valor, 0))} />
        <Stat label="Próximos 6 meses" value={money(proximos.reduce((s, p) => s + p.total, 0))} />
      </div>

      <div className="surface-card mt-5 p-5">
        <h3 className="text-sm font-semibold">Compromisso nos próximos meses</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-6">
          {proximos.map((p) => (
            <div key={p.mes} className="rounded-lg bg-secondary/60 p-3 text-center">
              <p className="text-[11px] uppercase text-muted-foreground">{shortMonthLabel(p.mes)}</p>
              <p className="num text-sm font-semibold">{money(p.total)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doMes.map((s, i) => (
              <TableRow key={`${s.parcela.id}-${i}`}>
                <TableCell className="font-medium">{s.compra?.descricao ?? "—"}</TableCell>
                <TableCell>{cartoes.find((c) => c.id === s.parcela.cartao_id)?.nome ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {categorias.find((c) => c.id === s.parcela.categoria_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>{s.compra?.tipo ?? "—"}</TableCell>
                <TableCell className="num">{s.parcela.total ? `${s.parcela.numero}/${s.parcela.total}` : "recorrente"}</TableCell>
                <TableCell className="num">{dateLabel(s.parcela.data_prevista)}</TableCell>
                <TableCell className="num text-right">{money(s.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {doMes.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nada neste mês.</p> : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`surface-card p-5 ${highlight ? "gradient-brand text-primary-foreground" : ""}`}>
      <p className={`text-xs uppercase tracking-[0.16em] ${highlight ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
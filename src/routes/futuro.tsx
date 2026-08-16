import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import {
  cartoesQuery,
  categoriasQuery,
  comprasQuery,
  parcelasQuery,
  rateiosQuery,
  responsaveisQuery,
  shareRows,
} from "@/lib/data";
import { currentMonthKey, dateLabel, money, monthLabel, monthRange, shortMonthLabel } from "@/lib/finance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/futuro")({
  head: () => ({
    meta: [
      { title: "Parcelas futuras — comprometimento dos próximos meses" },
      { name: "description", content: "Veja quanto já está comprometido nos próximos meses por cartão, responsável e categoria." },
      { property: "og:title", content: "Parcelas futuras — comprometimento dos próximos meses" },
      { property: "og:description", content: "Comprometimento futuro por cartão, responsável e categoria." },
    ],
  }),
  component: FuturoPage,
});

const ALL = "todos";

function FuturoPage() {
  const inicio = currentMonthKey();
  const meses = monthRange(inicio, 12);
  const [mesSel, setMesSel] = useState(inicio);
  const [cartao, setCartao] = useState(ALL);
  const [resp, setResp] = useState(ALL);
  const [cat, setCat] = useState(ALL);

  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);
  const { data: categorias = [] } = useQuery(categoriasQuery);
  const { data: parcelas = [] } = useQuery(parcelasQuery);
  const { data: compras = [] } = useQuery(comprasQuery);
  const { data: rateios = [] } = useQuery(rateiosQuery);

  const base = useMemo(
    () =>
      parcelas.filter(
        (p) =>
          p.status !== "cancelado" &&
          (cartao === ALL || p.cartao_id === cartao) &&
          (cat === ALL || p.categoria_id === cat),
      ),
    [parcelas, cartao, cat],
  );

  const withShares = useMemo(
    () => shareRows(base, compras, rateios).filter((s) => resp === ALL || s.responsavel_id === resp),
    [base, compras, rateios, resp],
  );

  const porMes = useMemo(() => {
    const map = new Map<string, number>(meses.map((m) => [m, 0]));
    for (const s of withShares) {
      if (map.has(s.parcela.mes_referencia)) {
        map.set(s.parcela.mes_referencia, (map.get(s.parcela.mes_referencia) ?? 0) + s.valor);
      }
    }
    return [...map.entries()];
  }, [withShares, meses]);

  const maior = Math.max(...porMes.map(([, v]) => v), 1);
  const doMes = withShares.filter((s) => s.parcela.mes_referencia === mesSel);
  const nome = (id: string | null) => responsaveis.find((r) => r.id === id)?.nome ?? "—";

  return (
    <AppShell title="Parcelas futuras" subtitle="Quanto já está comprometido nos próximos meses">
      <div className="flex flex-wrap gap-3">
        <Filter value={cartao} onChange={setCartao} placeholder="Todos os cartões" options={cartoes.map((c) => [c.id, c.nome])} />
        <Filter value={resp} onChange={setResp} placeholder="Todos os responsáveis" options={responsaveis.map((r) => [r.id, r.nome])} />
        <Filter value={cat} onChange={setCat} placeholder="Todas as categorias" options={categorias.map((c) => [c.id, c.nome])} />
      </div>

      <div className="surface-card mt-5 p-5">
        <h3 className="text-sm font-semibold">Calendário de parcelas</h3>
        <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-2">
          {porMes.map(([m, v]) => (
            <button
              key={m}
              onClick={() => setMesSel(m)}
              className={`flex min-w-20 flex-col items-center gap-2 rounded-lg p-2 transition-colors ${m === mesSel ? "bg-secondary" : "hover:bg-secondary/60"}`}
            >
              <span className="num text-[11px] font-medium">{money(v)}</span>
              <span
                className="w-8 rounded-t-md bg-primary"
                style={{ height: `${Math.max(4, (v / maior) * 120)}px` }}
              />
              <span className="text-[11px] text-muted-foreground">{shortMonthLabel(m)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card mt-5 overflow-x-auto">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-sm font-semibold">{monthLabel(mesSel)}</h3>
          <p className="num text-sm font-semibold">{money(doMes.reduce((s, x) => s + x.valor, 0))}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Data da compra</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doMes.map((s, i) => (
              <TableRow key={`${s.parcela.id}-${i}`}>
                <TableCell className="font-medium">{s.compra?.descricao ?? "—"}</TableCell>
                <TableCell>{cartoes.find((c) => c.id === s.parcela.cartao_id)?.nome ?? "—"}</TableCell>
                <TableCell className="num">
                  {s.parcela.total ? `${s.parcela.numero}/${s.parcela.total}` : "recorrente"}
                </TableCell>
                <TableCell>{nome(s.responsavel_id)}</TableCell>
                <TableCell className="num">{s.compra ? dateLabel(s.compra.data_compra) : "—"}</TableCell>
                <TableCell className="num text-right">{money(s.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}

function Filter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-52"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map(([id, label]) => (
          <SelectItem key={id} value={id}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
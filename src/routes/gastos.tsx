import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { MonthPicker } from "@/components/app/MonthPicker";
import { GastoDialog } from "@/components/app/GastoDialog";
import { cartoesQuery, comprasQuery, parcelasQuery, rateiosQuery, responsaveisQuery, shareRows } from "@/lib/data";
import { gastoCategoriasQuery, gastosQuery, paymentLabel } from "@/lib/gastos";
import { currentMonthKey, dateLabel, money, monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/gastos")({
  head: () => ({
    meta: [
      { title: "Gastos do mês fora do cartão" },
      {
        name: "description",
        content:
          "Lance os gastos pagos por Pix, débito, boleto ou dinheiro e veja o fechamento do mês somando cartões e gastos fora do cartão.",
      },
      { property: "og:title", content: "Gastos do mês fora do cartão" },
      { property: "og:description", content: "Controle mensal de gastos fora do cartão com fechamento automático." },
    ],
  }),
  component: GastosPage,
});

function GastosPage() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(currentMonthKey());
  const [filtro, setFiltro] = useState("todas");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");

  const { data: gastos = [] } = useQuery(gastosQuery);
  const { data: categorias = [] } = useQuery(gastoCategoriasQuery);
  const { data: parcelasAll = [] } = useQuery(parcelasQuery);
  const { data: compras = [] } = useQuery(comprasQuery);
  const { data: rateios = [] } = useQuery(rateiosQuery);
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);

  // Controle da Larisse: cartões mostram somente a parte dela em cada fatura.
  const larisseId = responsaveis.find((r) => r.nome.trim().toLowerCase() === "larisse")?.id ?? null;

  const catNome = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";

  const doMes = useMemo(
    () =>
      gastos
        .filter((g) => g.mes_referencia === mes)
        .filter((g) => filtro === "todas" || g.categoria_id === filtro)
        .sort((a, b) =>
          ordem === "asc" ? a.data_gasto.localeCompare(b.data_gasto) : b.data_gasto.localeCompare(a.data_gasto),
        ),
    [gastos, mes, filtro, ordem],
  );

  const totalFora = useMemo(
    () => gastos.filter((g) => g.mes_referencia === mes).reduce((s, g) => s + Number(g.valor), 0),
    [gastos, mes],
  );

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gastos.filter((x) => x.mes_referencia === mes)) {
      const nome = catNome(g.categoria_id);
      map.set(nome, (map.get(nome) ?? 0) + Number(g.valor));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, mes, categorias]);

  const porCartao = useMemo(() => {
    const doMesParcelas = parcelasAll.filter((p) => p.mes_referencia === mes && p.status !== "cancelado");
    const sharesLarisse = shareRows(doMesParcelas, compras, rateios).filter(
      (s) => s.responsavel_id === larisseId,
    );
    return cartoes
      .map((c) => ({
        nome: c.nome,
        total: sharesLarisse
          .filter((s) => s.parcela.cartao_id === c.id)
          .reduce((sum, s) => sum + s.valor, 0),
      }))
      .filter((c) => c.total > 0);
  }, [parcelasAll, compras, rateios, cartoes, mes, larisseId]);

  const totalCartoes = porCartao.reduce((s, c) => s + c.total, 0);
  const totalMes = totalFora + totalCartoes;

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("gastos").delete().eq("id", id).select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("Não foi possível excluir (sem permissão para este gasto).");
    },
    onSuccess: () => {
      toast.success("Gasto excluído.");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Gastos do mês" subtitle={`Controle da Larisse — ${monthLabel(mes)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={mes} onChange={setMes} />
        <GastoDialog mes={mes} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="surface-card gradient-brand p-5 text-primary-foreground">
          <p className="text-xs uppercase tracking-[0.16em] opacity-80">Total gasto no mês</p>
          <p className="num mt-2 text-2xl font-semibold">{money(totalMes)}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Fora do cartão</p>
          <p className="num mt-2 text-2xl font-semibold">{money(totalFora)}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cartões (parte da Larisse)</p>
          <p className="num mt-2 text-2xl font-semibold">{money(totalCartoes)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setOrdem((o) => (o === "asc" ? "desc" : "asc"))}>
          Data {ordem === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      <div className="surface-card mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {doMes.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="num">{dateLabel(g.data_gasto)}</TableCell>
                <TableCell>
                  <p className="font-medium">{g.descricao}</p>
                  {g.observacao ? <p className="text-xs text-muted-foreground">{g.observacao}</p> : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{catNome(g.categoria_id)}</TableCell>
                <TableCell className="text-muted-foreground">{paymentLabel(g.forma_pagamento)}</TableCell>
                <TableCell className="num text-right font-medium">{money(Number(g.valor))}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <GastoDialog
                      mes={mes}
                      gasto={g}
                      modo="editar"
                      trigger={
                        <Button size="icon" variant="outline" aria-label="Editar gasto">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <GastoDialog
                      mes={mes}
                      gasto={g}
                      modo="duplicar"
                      trigger={
                        <Button size="icon" variant="outline" aria-label="Duplicar gasto">
                          <Copy className="size-4" />
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="outline" aria-label="Excluir gasto">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir gasto</AlertDialogTitle>
                          <AlertDialogDescription>
                            “{g.descricao}” de {money(Number(g.valor))} será removido deste mês.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluir.mutate(g.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {doMes.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nenhum gasto neste mês. Use “Adicionar gasto” para lançar o que realmente aconteceu.
          </p>
        ) : (
          <div className="flex justify-between border-t border-border px-4 py-3 text-sm">
            <span className="font-medium">Total de gastos fora do cartão</span>
            <span className="num font-semibold">{money(doMes.reduce((s, g) => s + Number(g.valor), 0))}</span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold">Fechamento — {monthLabel(mes)}</h3>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Gastos fora do cartão</span>
              <span className="num font-medium">{money(totalFora)}</span>
            </div>
            {porCartao.map((c) => (
              <div key={c.nome} className="flex justify-between text-muted-foreground">
                <span className="pl-3">{c.nome}</span>
                <span className="num">{money(c.total)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Total nos cartões</span>
              <span className="num font-medium">{money(totalCartoes)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base">
              <span className="font-semibold">Total gasto no mês</span>
              <span className="num font-semibold">{money(totalMes)}</span>
            </div>
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold">Fora do cartão por categoria</h3>
          <div className="mt-4 grid gap-3">
            {porCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p>
            ) : null}
            {porCategoria.map(([nome, valor]) => (
              <div key={nome}>
                <div className="flex justify-between text-sm">
                  <span>{nome}</span>
                  <span className="num font-medium">{money(valor)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${totalFora ? (valor / totalFora) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

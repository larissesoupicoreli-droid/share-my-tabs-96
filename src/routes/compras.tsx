import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { MonthPicker } from "@/components/app/MonthPicker";
import { EditarCompraDialog } from "@/components/app/EditarCompraDialog";
import { cartoesQuery, categoriasQuery, comprasQuery, parcelasQuery, rateiosQuery, responsaveisQuery } from "@/lib/data";
import { currentMonthKey, dateLabel, money } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export const Route = createFileRoute("/compras")({
  head: () => ({
    meta: [
      { title: "Compras e parcelas do mês" },
      { name: "description", content: "Lista das compras à vista, parceladas e recorrentes do mês, com responsável, cartão, categoria e status de pagamento." },
      { property: "og:title", content: "Compras e parcelas do mês" },
      { property: "og:description", content: "Compras à vista, parceladas e recorrentes com responsável e status." },
    ],
  }),
  component: ComprasPage,
});

function ComprasPage() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(currentMonthKey());
  const { data: parcelas = [] } = useQuery(parcelasQuery);
  const { data: compras = [] } = useQuery(comprasQuery);
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: categorias = [] } = useQuery(categoriasQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);
  const { data: rateios = [] } = useQuery(rateiosQuery);

  const doMes = useMemo(() => {
    const compraById = new Map(compras.map((c) => [c.id, c]));
    return parcelas
      .filter((p) => p.mes_referencia === mes)
      .sort((a, b) =>
        (compraById.get(b.compra_id)?.data_compra ?? "").localeCompare(
          compraById.get(a.compra_id)?.data_compra ?? "",
        ),
      );
  }, [parcelas, compras, mes]);
  const nome = (id: string | null | undefined) => responsaveis.find((r) => r.id === id)?.nome;

  const excluir = useMutation({
    mutationFn: async ({ id, tudo }: { id: string; tudo: boolean }) => {
      const parcela = parcelas.find((p) => p.id === id)!;
      const { error } = tudo
        ? await supabase.from("compras").delete().eq("id", parcela.compra_id)
        : await supabase.from("parcelas").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Removido.");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = doMes.filter((p) => p.status !== "cancelado").reduce((s, p) => s + Number(p.valor), 0);
  const pago = doMes.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);

  return (
    <AppShell title="Compras" subtitle="Lançamentos do mês selecionado">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={mes} onChange={setMes} />
        <div className="flex gap-6 text-sm">
          <span>Previsto <strong className="num">{money(total)}</strong></span>
          <span>Pendente <strong className="num">{money(total - pago)}</strong></span>
        </div>
      </div>

      <div className="surface-card mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Data da compra</TableHead>
              <TableHead>Cartão / titular</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {doMes.map((p) => {
              const compra = compras.find((c) => c.id === p.compra_id);
              const cartao = cartoes.find((c) => c.id === p.cartao_id);
              const rateio = rateios.filter((r) => r.compra_id === p.compra_id);
              const futuras = parcelas.filter((x) => x.compra_id === p.compra_id && x.mes_referencia > mes).length;
              const primeiroMes = parcelas
                .filter((x) => x.compra_id === p.compra_id)
                .reduce((min, x) => (min && min <= x.mes_referencia ? min : x.mes_referencia), "");
              return (
                <TableRow key={p.id} className={p.status === "cancelado" ? "opacity-50" : ""}>
                  <TableCell>
                    <p className="font-medium">{compra?.descricao ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {compra?.tipo}
                    </p>
                  </TableCell>
                  <TableCell className="num">{compra ? dateLabel(compra.data_compra) : "—"}</TableCell>
                  <TableCell>
                    <p>{cartao?.nome}</p>
                    <p className="text-xs text-muted-foreground">titular {nome(cartao?.titular_id) ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    {rateio.length ? (
                      <div className="flex flex-wrap gap-1">
                        {rateio.map((r) => (
                          <Badge key={r.id} variant="secondary" className="num">
                            {nome(r.responsavel_id)} {money(Number(r.valor))}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      nome(p.responsavel_id) ?? "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categorias.find((c) => c.id === p.categoria_id)?.nome ?? "—"}
                  </TableCell>
                  <TableCell className="num">{p.total ? `${p.numero}/${p.total}` : "recorrente"}</TableCell>
                  <TableCell className="num">{dateLabel(p.data_prevista)}</TableCell>
                  <TableCell className="num text-right font-medium">{money(Number(p.valor))}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {compra ? (
                        <EditarCompraDialog
                          compra={compra}
                          cartoes={cartoes}
                          categorias={categorias}
                          responsaveis={responsaveis}
                          temRateio={rateio.length > 0}
                          mesReferencia={primeiroMes || p.mes_referencia}
                        />
                      ) : null}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="outline"><Trash2 className="size-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta compra possui {futuras} parcela(s) futura(s). Deseja excluir toda a compra e suas
                              parcelas ou apenas esta parcela?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => excluir.mutate({ id: p.id, tudo: false })}>
                              Só esta parcela
                            </AlertDialogAction>
                            <AlertDialogAction onClick={() => excluir.mutate({ id: p.id, tudo: true })}>
                              Compra inteira
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {doMes.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum lançamento neste mês. Use “Nova compra”.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
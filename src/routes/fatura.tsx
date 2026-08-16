import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { MonthPicker } from "@/components/app/MonthPicker";
import { EditarCompraDialog } from "@/components/app/EditarCompraDialog";
import { cartoesQuery, categoriasQuery, comprasQuery, parcelasQuery, rateiosQuery, responsaveisQuery, shareRows } from "@/lib/data";
import { currentMonthKey, dateLabel, money, monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/fatura")({
  head: () => ({
    meta: [
      { title: "Quanto cada um deve pagar na fatura" },
      { name: "description", content: "Divisão da fatura do cartão por responsável: quanto Larisse, Matheus, Mãe e outros devem pagar no fechamento." },
      { property: "og:title", content: "Quanto cada um deve pagar na fatura" },
      { property: "og:description", content: "Divisão da fatura do cartão por responsável no fechamento do mês." },
    ],
  }),
  component: FaturaPage,
});

function FaturaPage() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(currentMonthKey());
  const [cartaoId, setCartaoId] = useState<string>("");
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);
  const { data: parcelas = [] } = useQuery(parcelasQuery);
  const { data: compras = [] } = useQuery(comprasQuery);
  const { data: rateios = [] } = useQuery(rateiosQuery);
  const { data: categorias = [] } = useQuery(categoriasQuery);

  const excluir = useMutation({
    mutationFn: async ({ id, compraId, tudo }: { id: string; compraId: string; tudo: boolean }) => {
      if (!tudo) {
        const { error } = await supabase.from("parcelas").delete().eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error: rateioErr } = await supabase.from("rateios").delete().eq("compra_id", compraId);
      if (rateioErr) throw new Error(rateioErr.message);
      const { error: parcelasErr } = await supabase.from("parcelas").delete().eq("compra_id", compraId);
      if (parcelasErr) throw new Error(parcelasErr.message);
      const { error } = await supabase.from("compras").delete().eq("id", compraId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Removido.");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cartao = cartoes.find((c) => c.id === cartaoId) ?? cartoes[0];
  const nomeResp = (id: string | null) => responsaveis.find((r) => r.id === id)?.nome ?? "Sem responsável";

  const doMes = useMemo(
    () => parcelas.filter((p) => p.mes_referencia === mes && p.cartao_id === cartao?.id && p.status !== "cancelado"),
    [parcelas, mes, cartao?.id],
  );

  const shares = useMemo(
    () =>
      shareRows(doMes, compras, rateios).sort(
        (a, b) => (b.compra?.data_compra ?? "").localeCompare(a.compra?.data_compra ?? ""),
      ),
    [doMes, compras, rateios],
  );

  const porPessoa = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; itens: number }>();
    for (const s of shares) {
      const key = s.responsavel_id ?? "sem";
      const cur = map.get(key) ?? { nome: nomeResp(s.responsavel_id), total: 0, itens: 0 };
      cur.total += s.valor;
      cur.itens += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [shares, responsaveis]);

  const total = porPessoa.reduce((s, p) => s + p.total, 0);

  return (
    <AppShell
      title="Quanto cada um deve pagar na fatura?"
      subtitle="Divisão por responsável da compra — não pelo titular do cartão"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select value={cartao?.id ?? ""} onValueChange={setCartaoId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Cartão" /></SelectTrigger>
          <SelectContent>
            {cartoes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MonthPicker value={mes} onChange={setMes} />
      </div>

      <div className="surface-card mt-5 overflow-hidden">
        <div className="gradient-brand flex flex-wrap items-end justify-between gap-4 p-6 text-primary-foreground">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] opacity-80">Fatura</p>
            <h2 className="text-2xl font-semibold">
              {cartao?.nome ?? "—"} — {monthLabel(mes)}
            </h2>
            {cartao ? (
              <p className="mt-1 text-xs opacity-85">
                Titular: {nomeResp(cartao.titular_id)} · fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] opacity-80">Total da fatura</p>
            <p className="num text-3xl font-semibold">{money(total)}</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {porPessoa.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum lançamento nesta fatura.</p>
          ) : (
            porPessoa.map((p) => (
              <div key={p.nome} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.itens} lançamento{p.itens > 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${total ? (p.total / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-lg font-semibold">{money(p.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {total ? Math.round((p.total / total) * 100) : 0}% da fatura
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="surface-card mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Data da compra</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.map((s, i) => {
              const rateioCompra = rateios.filter((r) => r.compra_id === s.parcela.compra_id);
              const primeiroMes = parcelas
                .filter((x) => x.compra_id === s.parcela.compra_id)
                .reduce((min, x) => (min && min <= x.mes_referencia ? min : x.mes_referencia), "");
              const futuras = parcelas.filter(
                (x) => x.compra_id === s.parcela.compra_id && x.mes_referencia > mes,
              ).length;
              return (
                <TableRow key={`${s.parcela.id}-${i}`}>
                  <TableCell className="font-medium">{s.compra?.descricao ?? "—"}</TableCell>
                  <TableCell className="num text-muted-foreground">
                    {s.parcela.total ? `${s.parcela.numero}/${s.parcela.total}` : "recorrente"}
                  </TableCell>
                  <TableCell>{nomeResp(s.responsavel_id)}</TableCell>
                  <TableCell className="num">{s.compra ? dateLabel(s.compra.data_compra) : "—"}</TableCell>
                  <TableCell>
                    {s.parcela.status === "pago" ? (
                      <Badge className="gap-1"><CheckCircle2 className="size-3" /> Pago</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="num text-right">{money(s.valor)}</TableCell>
                  <TableCell>
                    {s.compra ? (
                      <div className="flex justify-end gap-1">
                        <EditarCompraDialog
                          compra={s.compra}
                          cartoes={cartoes}
                          categorias={categorias}
                          responsaveis={responsaveis}
                          temRateio={rateioCompra.length > 0}
                          mesReferencia={primeiroMes || s.parcela.mes_referencia}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="outline"><Trash2 className="size-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta compra possui {futuras} parcela(s) futura(s). Deseja excluir toda a compra e
                                suas parcelas ou apenas esta parcela?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  excluir.mutate({ id: s.parcela.id, compraId: s.parcela.compra_id, tudo: false })
                                }
                              >
                                Só esta parcela
                              </AlertDialogAction>
                              <AlertDialogAction
                                onClick={() =>
                                  excluir.mutate({ id: s.parcela.id, compraId: s.parcela.compra_id, tudo: true })
                                }
                              >
                                Compra inteira
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
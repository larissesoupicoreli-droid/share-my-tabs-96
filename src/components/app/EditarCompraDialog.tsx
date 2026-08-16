import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Cartao, Categoria, Compra, Responsavel } from "@/lib/data";
import { generateInstallments, money, monthLabel, type PurchaseType } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EditarCompraDialog({
  compra,
  cartoes,
  categorias,
  responsaveis,
  temRateio,
}: {
  compra: Compra;
  cartoes: Cartao[];
  categorias: Categoria[];
  responsaveis: Responsavel[];
  temRateio: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState(compra.descricao);
  const [valor, setValor] = useState(String(compra.valor_total));
  const [data, setData] = useState(compra.data_compra);
  const [tipo, setTipo] = useState<PurchaseType>(compra.tipo);
  const [qtd, setQtd] = useState(String(compra.qtd_parcelas || 1));
  const [cartaoId, setCartaoId] = useState(compra.cartao_id);
  const [categoriaId, setCategoriaId] = useState(compra.categoria_id ?? "");
  const [responsavelId, setResponsavelId] = useState(compra.responsavel_id ?? "");
  const [observacao, setObservacao] = useState(compra.observacao ?? "");
  const [recFim, setRecFim] = useState(compra.recorrencia_fim ?? "");

  const cartao = cartoes.find((c) => c.id === cartaoId);
  const valorNum = Number(String(valor).replace(",", ".")) || 0;

  const preview = useMemo(() => {
    if (!cartao || !valorNum) return [];
    return generateInstallments({
      tipo,
      valorTotal: valorNum,
      dataCompra: data,
      qtdParcelas: Number(qtd) || 1,
      diaFechamento: cartao.dia_fechamento,
      diaVencimento: cartao.dia_vencimento,
      recorrenciaFim: recFim || null,
    });
  }, [cartao, valorNum, tipo, data, qtd, recFim]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!cartao) throw new Error("Selecione o cartão.");
      if (!descricao.trim()) throw new Error("Informe a descrição.");
      if (valorNum <= 0) throw new Error("Informe o valor.");

      const { data: upd, error } = await supabase
        .from("compras")
        .update({
          descricao: descricao.trim(),
          valor_total: valorNum,
          data_compra: data,
          tipo,
          qtd_parcelas: tipo === "parcelada" ? Number(qtd) || 1 : 1,
          cartao_id: cartao.id,
          categoria_id: categoriaId || null,
          responsavel_id: temRateio ? compra.responsavel_id : responsavelId || null,
          observacao: observacao.trim() || null,
          recorrencia_fim: tipo === "recorrente" && recFim ? recFim : null,
        })
        .eq("id", compra.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!upd || upd.length === 0)
        throw new Error("Nada foi salvo: sua conta não tem permissão para editar esta compra.");

      const { error: delErr } = await supabase.from("parcelas").delete().eq("compra_id", compra.id);
      if (delErr) throw new Error(delErr.message);

      const { error: insErr } = await supabase.from("parcelas").insert(
        preview.map((p) => ({
          ...p,
          compra_id: compra.id,
          cartao_id: cartao.id,
          categoria_id: categoriaId || null,
          responsavel_id: temRateio ? null : responsavelId || null,
        })),
      );
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: () => {
      toast.success("Compra atualizada e parcelas recalculadas.");
      setOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" title="Editar compra">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
          <DialogDescription>
            Ao salvar, as parcelas são recalculadas com a data da compra e o fechamento do cartão.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Cartão</Label>
            <Select value={cartaoId} onValueChange={setCartaoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {cartoes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Valor total (R$)</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
          </div>
          <div className="grid gap-2">
            <Label>Data da compra</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as PurchaseType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">À vista</SelectItem>
                <SelectItem value="parcelada">Parcelada</SelectItem>
                <SelectItem value="recorrente">Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipo === "parcelada" ? (
            <div className="grid gap-2">
              <Label>Quantidade de parcelas</Label>
              <Input type="number" min={1} max={48} value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </div>
          ) : null}
          {tipo === "recorrente" ? (
            <div className="grid gap-2">
              <Label>Encerra em (opcional)</Label>
              <Input type="date" value={recFim} onChange={(e) => setRecFim(e.target.value)} />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Responsável pela compra</Label>
            {temRateio ? (
              <p className="text-xs text-muted-foreground">
                Esta compra é rateada entre vários responsáveis — o rateio é mantido.
              </p>
            ) : (
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
          </div>
        </div>

        {preview.length ? (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">
              {preview.length} parcela{preview.length > 1 ? "s" : ""} será{preview.length > 1 ? "ão" : ""} regerada
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {preview.slice(0, 8).map((p) => (
                <li key={p.numero} className="num flex justify-between gap-2">
                  <span>
                    {p.total ? `${p.numero}/${p.total}` : `Mês ${p.numero}`} — {monthLabel(p.mes_referencia)}
                  </span>
                  <span>{money(p.valor)}</span>
                </li>
              ))}
              {preview.length > 8 ? <li>+ {preview.length - 8} …</li> : null}
            </ul>
          </div>
        ) : null}

        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
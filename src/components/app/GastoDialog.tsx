import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { gastoCategoriasQuery, PAYMENT_METHODS, type Gasto, type PaymentMethod } from "@/lib/gastos";
import { responsaveisQuery } from "@/lib/data";
import { monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NOVA = "__nova__";

export function GastoDialog({
  mes,
  gasto,
  modo = "novo",
  trigger,
}: {
  mes: string;
  gasto?: Gasto;
  modo?: "novo" | "editar" | "duplicar";
  trigger?: ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: categorias = [] } = useQuery(gastoCategoriasQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);

  const inicial = () => ({
    descricao: gasto?.descricao ?? "",
    valor: gasto ? String(gasto.valor).replace(".", ",") : "",
    data: gasto?.data_gasto ?? `${mes.slice(0, 7)}-01`,
    mesRef: gasto && modo === "editar" ? gasto.mes_referencia : mes,
    categoriaId: gasto?.categoria_id ?? "",
    forma: (gasto?.forma_pagamento ?? "pix") as PaymentMethod,
    responsavelId: gasto?.responsavel_id ?? "",
    observacao: gasto?.observacao ?? "",
  });

  const [f, setF] = useState(inicial);
  const [novaCategoria, setNovaCategoria] = useState("");
  const set = <K extends keyof ReturnType<typeof inicial>>(k: K, v: ReturnType<typeof inicial>[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) {
      setF(inicial());
      setNovaCategoria("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mes, gasto?.id]);

  const salvar = useMutation({
    mutationFn: async () => {
      const valorNum = Number(f.valor.replace(",", ".")) || 0;
      if (!f.descricao.trim()) throw new Error("Informe a descrição.");
      if (valorNum <= 0) throw new Error("Informe o valor.");

      let categoriaId = f.categoriaId || null;
      if (f.categoriaId === NOVA) {
        if (!novaCategoria.trim()) throw new Error("Informe o nome da nova categoria.");
        const { data, error } = await supabase
          .from("gasto_categorias")
          .insert({ nome: novaCategoria.trim() })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        categoriaId = data.id;
      }

      const payload = {
        descricao: f.descricao.trim(),
        valor: valorNum,
        data_gasto: f.data,
        mes_referencia: `${f.mesRef.slice(0, 7)}-01`,
        categoria_id: categoriaId,
        forma_pagamento: f.forma,
        responsavel_id: f.responsavelId || null,
        observacao: f.observacao.trim() || null,
      };

      if (modo === "editar" && gasto) {
        const { data, error } = await supabase.from("gastos").update(payload).eq("id", gasto.id).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("Não foi possível salvar (sem permissão para editar este gasto).");
        return;
      }
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("gastos").insert({ ...payload, created_by: user.user!.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(modo === "editar" ? "Gasto atualizado." : "Gasto lançado.");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="gap-2">
            <Plus className="size-4" /> Adicionar gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {modo === "editar" ? "Editar gasto" : modo === "duplicar" ? "Duplicar gasto" : "Novo gasto do mês"}
          </DialogTitle>
          <DialogDescription>
            Gastos pagos fora do cartão de crédito. Cada lançamento vale só para o mês escolhido — nada é repetido
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Descrição</Label>
            <Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Cabelo" />
          </div>
          <div className="grid gap-2">
            <Label>Valor (R$)</Label>
            <Input value={f.valor} onChange={(e) => set("valor", e.target.value)} inputMode="decimal" placeholder="400,00" />
          </div>
          <div className="grid gap-2">
            <Label>Data</Label>
            <Input type="date" value={f.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Mês do controle</Label>
            <Input
              type="month"
              value={f.mesRef.slice(0, 7)}
              onChange={(e) => set("mesRef", e.target.value ? `${e.target.value}-01` : f.mesRef)}
            />
            <p className="text-xs text-muted-foreground">Entra no fechamento de {monthLabel(f.mesRef)}.</p>
          </div>
          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <Select value={f.forma} onValueChange={(v) => set("forma", v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Cartão de crédito entra pelas faturas, não aqui.</p>
          </div>
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select value={f.categoriaId} onValueChange={(v) => set("categoriaId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
                <SelectItem value={NOVA}>+ Nova categoria…</SelectItem>
              </SelectContent>
            </Select>
            {f.categoriaId === NOVA ? (
              <Input
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Nome da nova categoria"
              />
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Responsável (opcional)</Label>
            <Select value={f.responsavelId} onValueChange={(v) => set("responsavelId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Observação</Label>
            <Textarea value={f.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} />
          </div>
        </div>

        <Button size="lg" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : modo === "editar" ? "Salvar alterações" : "Salvar gasto"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

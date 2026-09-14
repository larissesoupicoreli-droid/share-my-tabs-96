import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Recebivel, RecebivelStatus } from "@/lib/recebiveis";
import { monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RecebivelDialog({
  mes,
  recebivel,
  modo = "novo",
  trigger,
}: {
  mes: string;
  recebivel?: Recebivel;
  modo?: "novo" | "editar" | "duplicar";
  trigger?: ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const inicial = () => ({
    descricao: recebivel?.descricao ?? "",
    valor: recebivel ? String(recebivel.valor).replace(".", ",") : "",
    dataPrevista: recebivel?.data_prevista ?? `${mes.slice(0, 7)}-01`,
    mesRef: recebivel && modo === "editar" ? recebivel.mes_referencia : mes,
    status: (recebivel?.status ?? "a_receber") as RecebivelStatus,
    dataRecebimento: recebivel?.data_recebimento ?? "",
    observacao: recebivel?.observacao ?? "",
  });
  const [f, setF] = useState(inicial);
  const set = <K extends keyof ReturnType<typeof inicial>>(key: K, value: ReturnType<typeof inicial>[K]) =>
    setF((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    if (open) setF(inicial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mes, recebivel?.id]);

  const salvar = useMutation({
    mutationFn: async () => {
      const valor = Number(f.valor.replace(",", ".")) || 0;
      if (!f.descricao.trim()) throw new Error("Informe a descrição da receita.");
      if (valor <= 0) throw new Error("Informe o valor da receita.");
      const payload = {
        descricao: f.descricao.trim(),
        valor,
        data_prevista: f.dataPrevista,
        mes_referencia: `${f.mesRef.slice(0, 7)}-01`,
        status: f.status,
        data_recebimento: f.status === "recebido" ? f.dataRecebimento || f.dataPrevista : null,
        observacao: f.observacao.trim() || null,
      };

      if (modo === "editar" && recebivel) {
        const { data, error } = await supabase.from("recebiveis").update(payload).eq("id", recebivel.id).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("Não foi possível salvar esta receita.");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Entre novamente para salvar a receita.");
      const { error } = await supabase.from("recebiveis").insert({ ...payload, created_by: userData.user.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(modo === "editar" ? "Receita atualizada." : "Receita lançada.");
      qc.invalidateQueries({ queryKey: ["recebiveis"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="lg" className="gap-2"><Plus className="size-4" /> Adicionar receita</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{modo === "editar" ? "Editar receita" : modo === "duplicar" ? "Duplicar receita" : "Nova receita do mês"}</DialogTitle>
          <DialogDescription>Registre o que já recebeu e o que ainda tem a receber no mês.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Descrição</Label>
            <Input value={f.descricao} onChange={(event) => set("descricao", event.target.value)} placeholder="Salário, comissão, extras…" />
          </div>
          <div className="grid gap-2">
            <Label>Valor (R$)</Label>
            <Input value={f.valor} onChange={(event) => set("valor", event.target.value)} inputMode="decimal" placeholder="3.500,00" />
          </div>
          <div className="grid gap-2">
            <Label>Data prevista</Label>
            <Input type="date" value={f.dataPrevista} onChange={(event) => set("dataPrevista", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Mês do controle</Label>
            <Input type="month" value={f.mesRef.slice(0, 7)} onChange={(event) => set("mesRef", event.target.value ? `${event.target.value}-01` : f.mesRef)} />
            <p className="text-xs text-muted-foreground">Entra no fechamento de {monthLabel(f.mesRef)}.</p>
          </div>
          <div className="grid gap-2">
            <Label>Situação</Label>
            <Select value={f.status} onValueChange={(value) => set("status", value as RecebivelStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a_receber">A receber</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.status === "recebido" ? (
            <div className="grid gap-2">
              <Label>Data do recebimento</Label>
              <Input type="date" value={f.dataRecebimento} onChange={(event) => set("dataRecebimento", event.target.value)} />
            </div>
          ) : null}
          <div className="grid gap-2 sm:col-span-2">
            <Label>Observação</Label>
            <Textarea value={f.observacao} onChange={(event) => set("observacao", event.target.value)} rows={2} />
          </div>
        </div>
        <Button size="lg" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : modo === "editar" ? "Salvar alterações" : "Salvar receita"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { cartoesQuery, responsaveisQuery } from "@/lib/data";
import { money } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type CartaoRow = {
  id: string;
  nome: string;
  banco: string | null;
  ultimos4: string | null;
  limite: number | string;
  dia_fechamento: number;
  dia_vencimento: number;
  ativo: boolean;
  titular_id: string | null;
};

function EditarCartaoDialog({ cartao, responsaveis }: { cartao: CartaoRow; responsaveis: { id: string; nome: string }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: cartao.nome,
    banco: cartao.banco ?? "",
    ultimos4: cartao.ultimos4 ?? "",
    limite: String(cartao.limite ?? ""),
    dia_fechamento: String(cartao.dia_fechamento),
    dia_vencimento: String(cartao.dia_vencimento),
    titular_id: cartao.titular_id ?? "",
    ativo: cartao.ativo,
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do cartão.");
      const { error } = await supabase
        .from("cartoes")
        .update({
          nome: form.nome.trim(),
          banco: form.banco || null,
          ultimos4: form.ultimos4 || null,
          limite: Number(form.limite.replace(",", ".")) || 0,
          dia_fechamento: Number(form.dia_fechamento) || 1,
          dia_vencimento: Number(form.dia_vencimento) || 10,
          titular_id: form.titular_id || null,
          ativo: form.ativo,
        })
        .eq("id", cartao.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cartão atualizado.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["cartoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cartoes").update({ ativo: false }).eq("id", cartao.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cartão desativado.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["cartoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campos = [
    ["nome", "Nome"],
    ["banco", "Banco"],
    ["ultimos4", "Últimos 4 dígitos"],
    ["limite", "Limite (R$)"],
    ["dia_fechamento", "Dia de fechamento"],
    ["dia_vencimento", "Dia de vencimento"],
  ] as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-4 w-full">Editar cartão</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {cartao.nome}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {campos.map(([key, label]) => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={`${cartao.id}-${key}`}>{label}</Label>
              <Input
                id={`${cartao.id}-${key}`}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="grid gap-2">
            <Label>Titular do cartão</Label>
            <Select value={form.titular_id} onValueChange={(v) => setForm((f) => ({ ...f, titular_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <Label htmlFor={`${cartao.id}-ativo`}>Cartão ativo</Label>
            <Switch
              id={`${cartao.id}-ativo`}
              checked={form.ativo}
              onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar alterações</Button>
          <Button variant="ghost" onClick={() => excluir.mutate()} disabled={excluir.isPending}>Desativar cartão</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/cartoes")({
  head: () => ({
    meta: [
      { title: "Cartões — titular, limite e fechamento" },
      { name: "description", content: "Cadastre os cartões da família com titular, limite, dia de fechamento e vencimento." },
      { property: "og:title", content: "Cartões — titular, limite e fechamento" },
      { property: "og:description", content: "Cartões da família com titular, limite e datas de fechamento." },
    ],
  }),
  component: CartoesPage,
});

function CartoesPage() {
  const qc = useQueryClient();
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);
  const [form, setForm] = useState({
    nome: "",
    banco: "",
    ultimos4: "",
    limite: "",
    dia_fechamento: "1",
    dia_vencimento: "10",
    titular_id: "",
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do cartão.");
      const { error } = await supabase.from("cartoes").insert({
        nome: form.nome.trim(),
        banco: form.banco || null,
        ultimos4: form.ultimos4 || null,
        limite: Number(form.limite.replace(",", ".")) || 0,
        dia_fechamento: Number(form.dia_fechamento) || 1,
        dia_vencimento: Number(form.dia_vencimento) || 10,
        titular_id: form.titular_id || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cartão cadastrado.");
      setForm({ nome: "", banco: "", ultimos4: "", limite: "", dia_fechamento: "1", dia_vencimento: "10", titular_id: "" });
      qc.invalidateQueries({ queryKey: ["cartoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Cartões" subtitle="O titular do cartão é apenas quem responde pela fatura no banco">
      <div className="grid gap-4 lg:grid-cols-3">
        {cartoes.map((c) => (
          <div key={c.id} className="surface-card p-5">
            <p className="font-semibold">{c.nome}</p>
            <p className="text-xs text-muted-foreground">
              {c.banco ?? ""} •••• {c.ultimos4 ?? "----"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Limite {money(Number(c.limite))}</span>
              <span className="text-right">Fecha dia {c.dia_fechamento}</span>
              <span>Vence dia {c.dia_vencimento}</span>
              <span className="text-right">{c.ativo ? "Ativo" : "Inativo"}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Titular: {responsaveis.find((r) => r.id === c.titular_id)?.nome ?? "não definido"}
            </p>
            <EditarCartaoDialog cartao={c as CartaoRow} responsaveis={responsaveis} />
          </div>
        ))}
      </div>

      <div className="surface-card mt-6 p-5">
        <h3 className="text-sm font-semibold">Cadastrar novo cartão</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {([
            ["nome", "Nome"],
            ["banco", "Banco"],
            ["ultimos4", "Últimos 4 dígitos"],
            ["limite", "Limite (R$)"],
            ["dia_fechamento", "Dia de fechamento"],
            ["dia_vencimento", "Dia de vencimento"],
          ] as const).map(([key, label]) => (
            <div key={key} className="grid gap-2">
              <Label>{label}</Label>
              <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="grid gap-2">
            <Label>Titular</Label>
            <Select value={form.titular_id} onValueChange={(v) => setForm((f) => ({ ...f, titular_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          Salvar cartão
        </Button>
      </div>
    </AppShell>
  );
}
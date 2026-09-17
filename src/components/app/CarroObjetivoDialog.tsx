import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/finance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/gastos";
import { planParcelas, planVencimentos, type CarroObjetivo, type CarroParcela } from "@/lib/carro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = () => new Date().toISOString().slice(0, 10);
const num = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

export function CarroObjetivoDialog({
  objetivo,
  parcelas = [],
}: {
  objetivo?: CarroObjetivo | null;
  parcelas?: CarroParcela[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const editando = Boolean(objetivo);

  const [nome, setNome] = useState(objetivo?.nome ?? "Meu Carro");
  const [descricao, setDescricao] = useState(objetivo?.descricao ?? "");
  const [valorTotal, setValorTotal] = useState(String(objetivo?.valor_total ?? 68300).replace(".", ","));
  const [dataInicio, setDataInicio] = useState(objetivo?.data_inicio ?? today());
  const [qtd, setQtd] = useState(String(objetivo?.qtd_parcelas ?? 48));
  const [diaVenc, setDiaVenc] = useState(String(objetivo?.dia_vencimento ?? 10));
  const [forma, setForma] = useState<PaymentMethod>(objetivo?.forma_pagamento ?? "pix");
  const [observacao, setObservacao] = useState(objetivo?.observacao ?? "");
  const [primeiraCustom, setPrimeiraCustom] = useState(Boolean(objetivo?.primeira_parcela_valor));
  const [primeira, setPrimeira] = useState(
    objetivo?.primeira_parcela_valor ? String(objetivo.primeira_parcela_valor).replace(".", ",") : "",
  );

  const totalNum = num(valorTotal);
  const qtdNum = Math.max(1, Number(qtd) || 1);
  const primeiraNum = primeiraCustom ? num(primeira) : null;

  const valores = useMemo(
    () => planParcelas({ valorTotal: totalNum, qtdParcelas: qtdNum, primeiraParcela: primeiraNum }),
    [totalNum, qtdNum, primeiraNum],
  );
  const somaParcelas = valores.reduce((s, v) => s + v, 0);
  const fecha = Math.abs(somaParcelas - totalNum) < 0.005;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do objetivo.");
      if (totalNum <= 0) throw new Error("Informe o valor total da compra.");
      if (!fecha)
        throw new Error(
          `A soma das parcelas (${money(somaParcelas)}) não fecha com o valor total (${money(totalNum)}).`,
        );

      const dias = Math.min(31, Math.max(1, Number(diaVenc) || 1));
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        valor_total: totalNum,
        data_inicio: dataInicio,
        qtd_parcelas: qtdNum,
        dia_vencimento: dias,
        forma_pagamento: forma,
        primeira_parcela_valor: primeiraNum && primeiraNum > 0 ? primeiraNum : null,
        observacao: observacao.trim() || null,
      };

      let objetivoId = objetivo?.id ?? null;
      if (editando && objetivoId) {
        const { data, error } = await supabase
          .from("carro_objetivos")
          .update(payload)
          .eq("id", objetivoId)
          .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("Não foi possível salvar. Verifique suas permissões.");
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("carro_objetivos")
          .insert({ ...payload, created_by: userData.user!.id })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        objetivoId = data.id;
      }

      // Regenera as parcelas preservando os pagamentos já marcados pelo número.
      const pagosPorNumero = new Map(
        parcelas.filter((p) => p.pago).map((p) => [p.numero, p]),
      );
      const vencimentos = planVencimentos(dataInicio, dias, qtdNum);
      const rows = valores.map((valor, i) => {
        const antiga = pagosPorNumero.get(i + 1);
        return {
          objetivo_id: objetivoId!,
          numero: i + 1,
          total: qtdNum,
          valor_previsto: valor,
          data_vencimento: vencimentos[i]!,
          pago: Boolean(antiga?.pago),
          data_pagamento: antiga?.data_pagamento ?? null,
          forma_pagamento: antiga?.forma_pagamento ?? forma,
          observacao: antiga?.observacao ?? null,
        };
      });

      const { error: delErr } = await supabase.from("carro_parcelas").delete().eq("objetivo_id", objetivoId!);
      if (delErr) throw new Error(delErr.message);
      const { error: insErr } = await supabase.from("carro_parcelas").insert(rows);
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: () => {
      toast.success(editando ? "Cadastro atualizado." : "Objetivo criado com as parcelas geradas.");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editando ? (
          <Button variant="outline" className="gap-2">
            <Pencil className="size-4" /> Editar cadastro
          </Button>
        ) : (
          <Button size="lg" className="gap-2">
            <Car className="size-4" /> Cadastrar compra
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cadastro do carro" : "Cadastrar compra do carro"}</DialogTitle>
          <DialogDescription>
            Defina o valor, as parcelas e o vencimento — as parcelas são geradas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Nome do objetivo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Valor total (R$)</Label>
            <Input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} inputMode="decimal" />
          </div>
          <div className="grid gap-2">
            <Label>Início dos pagamentos</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Quantidade de parcelas</Label>
            <Input type="number" min={1} max={240} value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Dia do vencimento</Label>
            <Input type="number" min={1} max={31} value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={(v) => setForma(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Descrição (opcional)</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Primeira parcela diferente</p>
              <p className="text-xs text-muted-foreground">
                Ligue para informar uma entrada ou 1ª parcela personalizada; as demais ficam fixas.
              </p>
            </div>
            <Switch checked={primeiraCustom} onCheckedChange={setPrimeiraCustom} />
          </div>
          {primeiraCustom ? (
            <div className="mt-3 grid gap-2 sm:max-w-xs">
              <Label>Valor da 1ª parcela (R$)</Label>
              <Input value={primeira} onChange={(e) => setPrimeira(e.target.value)} inputMode="decimal" />
            </div>
          ) : null}
          <p className={`mt-3 num text-xs ${fecha ? "text-muted-foreground" : "text-destructive"}`}>
            {qtdNum}x — soma das parcelas {money(somaParcelas)} de {money(totalNum)}
            {valores.length > 1 ? ` · 1ª ${money(valores[0]!)} · demais ${money(valores[1]!)}` : ""}
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Observações</Label>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
        </div>

        <Button size="lg" onClick={() => salvar.mutate()} disabled={salvar.isPending || !fecha}>
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

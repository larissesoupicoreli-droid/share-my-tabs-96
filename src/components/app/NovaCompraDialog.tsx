import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cartoesQuery, categoriasQuery, responsaveisQuery } from "@/lib/data";
import { currentMonthKey, generateInstallments, invoiceMonthFor, money, monthLabel, type PurchaseType } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = () => new Date().toISOString().slice(0, 10);

export function NovaCompraDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: cartoes = [] } = useQuery(cartoesQuery);
  const { data: categorias = [] } = useQuery(categoriasQuery);
  const { data: responsaveis = [] } = useQuery(responsaveisQuery);

  const [cartaoId, setCartaoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(today());
  const [tipo, setTipo] = useState<PurchaseType>("avista");
  const [qtd, setQtd] = useState("2");
  const [categoriaId, setCategoriaId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [recFim, setRecFim] = useState("");
  const [usarRateio, setUsarRateio] = useState(false);
  const [rateio, setRateio] = useState<Record<string, string>>({});
  const [mesRefManual, setMesRefManual] = useState<string | null>(null);

  const cartao = cartoes.find((c) => c.id === cartaoId);
  const titular = responsaveis.find((r) => r.id === cartao?.titular_id);
  const valorNum = Number(valor.replace(",", ".")) || 0;
  // Uma compra lançada com atraso não pode cair numa fatura que já fechou:
  // a sugestão nunca recua para antes da fatura aberta atual.
  const mesSugerido = cartao
    ? [invoiceMonthFor(data, cartao.dia_fechamento), currentMonthKey()].sort().pop()!
    : `${data.slice(0, 7)}-01`;
  const mesRef = mesRefManual ?? mesSugerido;

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
      mesInicial: mesRef,
    });
  }, [cartao, valorNum, tipo, data, qtd, recFim, mesRef]);

  const rateioTotal = Object.values(rateio).reduce((s, v) => s + (Number(v.replace(",", ".")) || 0), 0);

  const reset = () => {
    setDescricao("");
    setValor("");
    setQtd("2");
    setTipo("avista");
    setObservacao("");
    setRecFim("");
    setUsarRateio(false);
    setRateio({});
    setMesRefManual(null);
  };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!cartao) throw new Error("Selecione o cartão.");
      if (!descricao.trim()) throw new Error("Informe a descrição.");
      if (valorNum <= 0) throw new Error("Informe o valor.");
      if (!usarRateio && !responsavelId) throw new Error("Informe o responsável pela compra.");
      const rateioRows = Object.entries(rateio)
        .map(([responsavel_id, v]) => ({ responsavel_id, valor: Number(v.replace(",", ".")) || 0 }))
        .filter((r) => r.valor > 0);
      if (usarRateio) {
        if (rateioRows.length < 2) throw new Error("O rateio precisa de pelo menos 2 responsáveis.");
        if (Math.abs(rateioTotal - valorNum) > 0.009)
          throw new Error(`A soma do rateio (${money(rateioTotal)}) deve ser igual ao total (${money(valorNum)}).`);
      }

      const { data: user } = await supabase.auth.getUser();
      const { data: compra, error } = await supabase
        .from("compras")
        .insert({
          descricao: descricao.trim(),
          valor_total: valorNum,
          data_compra: data,
          tipo,
          qtd_parcelas: tipo === "parcelada" ? Number(qtd) || 1 : 1,
          cartao_id: cartao.id,
          categoria_id: categoriaId || null,
          responsavel_id: usarRateio ? (rateioRows[0]?.responsavel_id ?? null) : responsavelId,
          observacao: observacao.trim() || null,
          recorrencia_fim: tipo === "recorrente" && recFim ? recFim : null,
          created_by: user.user!.id,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      if (usarRateio) {
        const { error: rErr } = await supabase
          .from("rateios")
          .insert(rateioRows.map((r) => ({ ...r, compra_id: compra.id })));
        if (rErr) throw new Error(rErr.message);
      }

      const { error: pErr } = await supabase.from("parcelas").insert(
        preview.map((p) => ({
          ...p,
          compra_id: compra.id,
          cartao_id: cartao.id,
          categoria_id: categoriaId || null,
          responsavel_id: usarRateio ? null : responsavelId,
        })),
      );
      if (pErr) throw new Error(pErr.message);
    },
    onSuccess: () => {
      toast.success("Compra cadastrada com as parcelas geradas.");
      qc.invalidateQueries();
      reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="size-4" /> Nova compra
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova compra</DialogTitle>
          <DialogDescription>
            Cadastre uma vez — o sistema gera as parcelas, o mês de cada fatura e a divisão por responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Cartão</Label>
            <Select value={cartaoId} onValueChange={setCartaoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {cartoes.filter((c) => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {titular ? (
              <p className="text-xs text-muted-foreground">Titular do cartão: <strong>{titular.nome}</strong></p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Midea Lava Louças" />
          </div>
          <div className="grid gap-2">
            <Label>Valor total (R$)</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="401,54" />
          </div>
          <div className="grid gap-2">
            <Label>Data da compra</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <p className="text-xs text-muted-foreground">Data real em que a compra foi feita.</p>
          </div>
          <div className="grid gap-2">
            <Label>Fatura de referência</Label>
            <Input
              type="month"
              value={mesRef.slice(0, 7)}
              onChange={(e) => setMesRefManual(e.target.value ? `${e.target.value}-01` : null)}
            />
            <p className="text-xs text-muted-foreground">
              Mês da fatura em que a compra entra ({monthLabel(mesRef)}). Alterar a data da compra não muda este campo.
            </p>
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
              <Input type="number" min={2} max={48} value={qtd} onChange={(e) => setQtd(e.target.value)} />
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
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Users className="size-4" /> Responsável pela compra
              </p>
              <p className="text-xs text-muted-foreground">
                Independente do titular do cartão — quem usou é quem paga.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              Ratear
              <Switch checked={usarRateio} onCheckedChange={setUsarRateio} />
            </div>
          </div>

          {!usarRateio ? (
            <div className="mt-3">
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                <SelectContent>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {responsaveis.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm">{r.nome}</span>
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={rateio[r.id] ?? ""}
                    onChange={(e) => setRateio((p) => ({ ...p, [r.id]: e.target.value }))}
                  />
                </div>
              ))}
              <p className={`text-xs sm:col-span-2 ${Math.abs(rateioTotal - valorNum) > 0.009 ? "text-destructive" : "text-muted-foreground"}`}>
                Rateio: {money(rateioTotal)} de {money(valorNum)}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Observação</Label>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
        </div>

        {preview.length ? (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">
              {preview.length} lançamento{preview.length > 1 ? "s" : ""} gerado{preview.length > 1 ? "s" : ""}
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

        <Button size="lg" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : "Salvar compra"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
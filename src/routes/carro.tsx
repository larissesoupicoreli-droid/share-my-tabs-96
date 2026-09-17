import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { CarroObjetivoDialog } from "@/components/app/CarroObjetivoDialog";
import {
  carroObjetivosQuery,
  carroParcelasQuery,
  parcelaStatus,
  resumoCarro,
  type CarroParcela,
  type CarroParcelaStatus,
} from "@/lib/carro";
import { meuPerfilQuery, PAYMENT_METHODS, paymentLabel, type PaymentMethod } from "@/lib/gastos";
import { dateLabel, money, monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/carro")({
  head: () => ({
    meta: [
      { title: "Meu Carro — acompanhamento da quitação" },
      {
        name: "description",
        content:
          "Acompanhe a compra do carro: parcelas previstas, total pago, saldo restante e percentual de quitação mês a mês.",
      },
      { property: "og:title", content: "Meu Carro — acompanhamento da quitação" },
      { property: "og:description", content: "Controle das parcelas do carro com progresso da quitação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CarroPage,
});

const STATUS_LABEL: Record<CarroParcelaStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

const statusClass = (s: CarroParcelaStatus) =>
  s === "pago"
    ? "bg-chart-2/15 text-chart-2"
    : s === "atrasado"
      ? "bg-destructive/15 text-destructive"
      : "bg-secondary text-muted-foreground";

function CarroPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: perfil, isLoading: perfilLoading } = useQuery(meuPerfilQuery);
  const isLarisse = (perfil?.nome ?? "").trim().toLowerCase().startsWith("larisse");
  useEffect(() => {
    if (!perfilLoading && perfil && !isLarisse) navigate({ to: "/" });
  }, [perfilLoading, perfil, isLarisse, navigate]);

  const { data: objetivos = [] } = useQuery(carroObjetivosQuery);
  const { data: todasParcelas = [] } = useQuery(carroParcelasQuery);
  const objetivo = objetivos[0] ?? null;
  const parcelas = useMemo(
    () =>
      todasParcelas
        .filter((p) => p.objetivo_id === objetivo?.id)
        .sort((a, b) => a.numero - b.numero),
    [todasParcelas, objetivo],
  );

  const [filtro, setFiltro] = useState<"todas" | CarroParcelaStatus>("todas");
  const [mesFiltro, setMesFiltro] = useState("todos");

  const meses = useMemo(
    () => [...new Set(parcelas.map((p) => `${p.data_vencimento.slice(0, 7)}-01`))].sort(),
    [parcelas],
  );

  const lista = useMemo(
    () =>
      parcelas
        .filter((p) => filtro === "todas" || parcelaStatus(p, hoje) === filtro)
        .filter((p) => mesFiltro === "todos" || p.data_vencimento.slice(0, 7) === mesFiltro.slice(0, 7)),
    [parcelas, filtro, mesFiltro, hoje],
  );

  const r = resumoCarro(objetivo, parcelas, hoje);

  const atualizar = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CarroParcela> }) => {
      const { data, error } = await supabase.from("carro_parcelas").update(patch).eq("id", id).select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("Não foi possível salvar. Verifique suas permissões.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carro_parcelas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePago = (p: CarroParcela, pago: boolean) =>
    atualizar.mutate({
      id: p.id,
      patch: { pago, data_pagamento: pago ? (p.data_pagamento ?? hoje) : null },
    });

  if (!objetivo) {
    return (
      <AppShell title="Meu Carro 🚗" subtitle="Acompanhamento da quitação do veículo">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Cadastre a compra do carro</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Informe o valor total, o início dos pagamentos e a quantidade de parcelas. Todas as parcelas são criadas
            automaticamente para você apenas marcar o que já foi pago.
          </p>
          <div className="mt-5 flex justify-center">
            <CarroObjetivoDialog />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`${objetivo.nome} 🚗`} subtitle={objetivo.descricao ?? "Acompanhamento da quitação do veículo"}>
      <div className="grid gap-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Progresso da quitação</p>
              <p className="num mt-1 text-3xl font-semibold">{r.percentual.toFixed(1)}%</p>
              <p className="num mt-1 text-sm text-muted-foreground">
                {money(r.totalPago)} pagos de {money(r.total)} · {r.pagasCount}/{r.totalCount} parcelas
              </p>
            </div>
            <CarroObjetivoDialog objetivo={objetivo} parcelas={parcelas} />
          </div>
          <Progress value={r.percentual} className="mt-4 h-3" />
          {r.atrasadas > 0 ? (
            <p className="mt-3 text-sm text-destructive">
              {r.atrasadas} parcela{r.atrasadas > 1 ? "s" : ""} em atraso.
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Valor total", value: money(r.total) },
            { label: "Total pago", value: money(r.totalPago) },
            { label: "Saldo restante", value: money(r.restante) },
            { label: "Parcelas pagas", value: `${r.pagasCount} / ${r.totalCount}` },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{c.label}</p>
              <p className="num mt-2 text-xl font-semibold">{c.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Próxima parcela a vencer</p>
            {r.proxima ? (
              <p className="num mt-2 text-sm">
                {String(r.proxima.numero).padStart(2, "0")}/{r.proxima.total} — {dateLabel(r.proxima.data_vencimento)} ·{" "}
                {money(Number(r.proxima.valor_previsto))}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Tudo quitado 🎉</p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Último pagamento</p>
            {r.ultimo?.data_pagamento ? (
              <p className="num mt-2 text-sm">
                {String(r.ultimo.numero).padStart(2, "0")}/{r.ultimo.total} — {dateLabel(r.ultimo.data_pagamento)} ·{" "}
                {money(Number(r.ultimo.valor_previsto))}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum pagamento marcado ainda.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="flex flex-wrap gap-1">
              {(["todas", "pago", "pendente", "atrasado"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filtro === f ? "default" : "ghost"}
                  onClick={() => setFiltro(f)}
                >
                  {f === "todas" ? "Todas" : f === "pago" ? "Pagas" : f === "pendente" ? "Pendentes" : "Atrasadas"}
                </Button>
              ))}
            </div>
            <div className="ml-auto w-48">
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {meses.map((m) => (
                    <SelectItem key={m} value={m}>
                      {monthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Celular: cartões empilhados */}
          <div className="grid gap-3 p-4 lg:hidden">
            {lista.map((p) => {
              const st = parcelaStatus(p, hoje);
              return (
                <div key={p.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-0.5 size-5"
                      checked={p.pago}
                      onCheckedChange={(v) => togglePago(p, Boolean(v))}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="num text-sm font-medium">
                          {String(p.numero).padStart(2, "0")}/{p.total}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(st)}`}>
                          {STATUS_LABEL[st]}
                        </span>
                      </div>
                      <p className="num mt-1 text-sm text-muted-foreground">
                        Vence {dateLabel(p.data_vencimento)} · {money(Number(p.valor_previsto))}
                      </p>
                      {p.pago ? (
                        <div className="mt-2 grid gap-2">
                          <Input
                            type="date"
                            value={p.data_pagamento ?? ""}
                            onChange={(e) =>
                              atualizar.mutate({ id: p.id, patch: { data_pagamento: e.target.value || null } })
                            }
                          />
                          <Select
                            value={p.forma_pagamento}
                            onValueChange={(v) =>
                              atualizar.mutate({ id: p.id, patch: { forma_pagamento: v as PaymentMethod } })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      <Input
                        className="mt-2"
                        placeholder="Observação"
                        defaultValue={p.observacao ?? ""}
                        onBlur={(e) =>
                          e.target.value !== (p.observacao ?? "") &&
                          atualizar.mutate({ id: p.id, patch: { observacao: e.target.value || null } })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {!lista.length ? <p className="text-sm text-muted-foreground">Nenhuma parcela neste filtro.</p> : null}
          </div>

          {/* Computador: tabela */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Paga</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor previsto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data do pagamento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => {
                  const st = parcelaStatus(p, hoje);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          className="size-5"
                          checked={p.pago}
                          onCheckedChange={(v) => togglePago(p, Boolean(v))}
                        />
                      </TableCell>
                      <TableCell className="num">
                        {String(p.numero).padStart(2, "0")}/{p.total}
                      </TableCell>
                      <TableCell className="num">{dateLabel(p.data_vencimento)}</TableCell>
                      <TableCell className="num text-right">{money(Number(p.valor_previsto))}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(st)}`}>
                          {STATUS_LABEL[st]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.pago ? (
                          <Input
                            type="date"
                            className="w-36"
                            value={p.data_pagamento ?? ""}
                            onChange={(e) =>
                              atualizar.mutate({ id: p.id, patch: { data_pagamento: e.target.value || null } })
                            }
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.pago ? (
                          <Select
                            value={p.forma_pagamento}
                            onValueChange={(v) =>
                              atualizar.mutate({ id: p.id, patch: { forma_pagamento: v as PaymentMethod } })
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground">{paymentLabel(p.forma_pagamento)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-48"
                          placeholder="—"
                          defaultValue={p.observacao ?? ""}
                          onBlur={(e) =>
                            e.target.value !== (p.observacao ?? "") &&
                            atualizar.mutate({ id: p.id, patch: { observacao: e.target.value || null } })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!lista.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-sm text-muted-foreground">
                      Nenhuma parcela neste filtro.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

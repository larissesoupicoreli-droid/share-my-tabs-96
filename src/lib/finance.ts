export type PurchaseType = "avista" | "parcelada" | "recorrente";
export type InstallmentStatus = "pendente" | "pago" | "cancelado";

export const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  const s = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const shortMonthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
};

export const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso + "T00:00:00Z"),
  );

export const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;

export const currentMonthKey = () => monthKey(new Date());

export const addMonths = (iso: string, n: number) => {
  const [y, m] = iso.split("-").map(Number);
  return monthKey(new Date(Date.UTC(y!, (m ?? 1) - 1 + n, 1)));
};

export const monthRange = (start: string, count: number) =>
  Array.from({ length: count }, (_, i) => addMonths(start, i));

/** Divide um valor em n parcelas garantindo soma exata (centavos sobram na 1ª). */
export function splitAmount(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? rest : 0)) / 100);
}

const clampDay = (year: number, month0: number, day: number) => {
  const last = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return Math.min(day, last);
};

/**
 * Fatura em que a compra cai: se comprou depois do fechamento do cartão,
 * entra na fatura do mês seguinte.
 */
export function invoiceMonthFor(purchaseDate: string, closingDay: number): string {
  const [y, m, d] = purchaseDate.split("-").map(Number);
  const offset = (d ?? 1) > closingDay ? 1 : 0;
  return monthKey(new Date(Date.UTC(y!, (m ?? 1) - 1 + offset, 1)));
}

export function dueDateFor(refMonth: string, dueDay: number): string {
  const [y, m] = refMonth.split("-").map(Number);
  const day = clampDay(y!, (m ?? 1) - 1, dueDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const RECURRING_HORIZON_MONTHS = 12;

export type GeneratedInstallment = {
  numero: number;
  total: number;
  valor: number;
  mes_referencia: string;
  data_prevista: string;
};

/** Gera as parcelas de uma compra a partir de um único cadastro. */
export function generateInstallments(input: {
  tipo: PurchaseType;
  valorTotal: number;
  dataCompra: string;
  qtdParcelas: number;
  diaFechamento: number;
  diaVencimento: number;
  recorrenciaFim?: string | null;
}): GeneratedInstallment[] {
  const firstMonth = invoiceMonthFor(input.dataCompra, input.diaFechamento);

  if (input.tipo === "recorrente") {
    let count = RECURRING_HORIZON_MONTHS;
    if (input.recorrenciaFim) {
      const endMonth = input.recorrenciaFim.slice(0, 8) + "01";
      count = 0;
      for (let i = 0; i < 240; i++) {
        if (addMonths(firstMonth, i) > endMonth) break;
        count = i + 1;
      }
    }
    return Array.from({ length: Math.max(count, 1) }, (_, i) => {
      const mes = addMonths(firstMonth, i);
      return {
        numero: i + 1,
        total: 0,
        valor: input.valorTotal,
        mes_referencia: mes,
        data_prevista: dueDateFor(mes, input.diaVencimento),
      };
    });
  }

  const n = input.tipo === "parcelada" ? Math.max(1, input.qtdParcelas) : 1;
  return splitAmount(input.valorTotal, n).map((valor, i) => {
    const mes = addMonths(firstMonth, i);
    return {
      numero: i + 1,
      total: n,
      valor,
      mes_referencia: mes,
      data_prevista: dueDateFor(mes, input.diaVencimento),
    };
  });
}

/**
 * Quem paga o quê numa parcela.
 * Se a compra tem rateio, divide a parcela na mesma proporção do rateio.
 * Caso contrário, a parcela inteira vai para o RESPONSÁVEL DA COMPRA
 * (nunca para o titular do cartão).
 */
export function installmentShares(
  valor: number,
  responsavelId: string | null,
  rateios: { responsavel_id: string; valor: number }[],
): { responsavel_id: string | null; valor: number }[] {
  if (!rateios.length) return [{ responsavel_id: responsavelId, valor }];
  const total = rateios.reduce((s, r) => s + Number(r.valor), 0);
  if (total <= 0) return [{ responsavel_id: responsavelId, valor }];
  const cents = Math.round(valor * 100);
  let used = 0;
  return rateios.map((r, i) => {
    const part =
      i === rateios.length - 1 ? cents - used : Math.round((Number(r.valor) / total) * cents);
    used += part;
    return { responsavel_id: r.responsavel_id, valor: part / 100 };
  });
}
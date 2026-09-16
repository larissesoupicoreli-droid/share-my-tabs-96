import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";

export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <Button aria-label="Mês anterior" variant="ghost" size="icon" className="rounded-none border-r border-border" onClick={() => onChange(addMonths(value, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="flex min-w-36 items-center justify-center gap-2 px-3 text-center text-sm font-medium capitalize">
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <span className="truncate">{monthLabel(value)}</span>
      </span>
      <Button aria-label="Próximo mês" variant="ghost" size="icon" className="rounded-none border-l border-border" onClick={() => onChange(addMonths(value, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
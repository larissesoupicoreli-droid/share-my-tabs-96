import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel } from "@/lib/finance";
import { Button } from "@/components/ui/button";

export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => onChange(addMonths(value, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-40 text-center text-sm font-medium">{monthLabel(value)}</span>
      <Button variant="outline" size="icon" onClick={() => onChange(addMonths(value, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
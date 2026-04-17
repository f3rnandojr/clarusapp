
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const statusClasses: Record<string, string> = {
  available:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  L:           "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_cleaning: "bg-sky-50 text-sky-700 border-sky-200",
  occupied:    "bg-orange-50 text-orange-700 border-orange-200",
  "*":         "bg-orange-50 text-orange-700 border-orange-200",
  "•":         "bg-orange-50 text-orange-700 border-orange-200",
};

const statusText: Record<string, string> = {
  available:   "Disponível",
  L:           "Disponível",
  in_cleaning: "Higienizando",
  occupied:    "Ocupado",
  "*":         "Ocupado",
  "•":         "Ocupado",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-[0.15em]",
        statusClasses[status] || statusClasses.available,
        className
      )}
    >
      {statusText[status] || status}
    </span>
  );
}

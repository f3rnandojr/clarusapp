
import { cn } from "@/lib/utils";
import type { LocationStatus } from "@/lib/schemas";

type StatusBadgeProps = {
  status: string; // Permitir strings de fallback como "L" ou "•"
  className?: string;
};

const statusClasses: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  L: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  in_cleaning: "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse",
  occupied: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "*": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "•": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const statusText: Record<string, string> = {
    available: "Disponível",
    L: "Disponível",
    in_cleaning: "Higienizando",
    occupied: "Ocupado",
    "*": "Ocupado",
    "•": "Ocupado"
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-[0.15em]",
        statusClasses[status] || statusClasses.available,
        className
      )}
    >
      {statusText[status] || status}
    </span>
  );
}

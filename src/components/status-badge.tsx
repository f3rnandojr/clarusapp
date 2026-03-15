
import { cn } from "@/lib/utils";
import type { LocationStatus } from "@/lib/schemas";

type StatusBadgeProps = {
  status: LocationStatus;
  className?: string;
};

const statusClasses: Record<LocationStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  in_cleaning: "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse",
  occupied: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const statusText: Record<LocationStatus, string> = {
    available: "Disponível",
    in_cleaning: "Higienizando",
    occupied: "Ocupado"
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-[0.15em]",
        statusClasses[status],
        className
      )}
    >
      {statusText[status]}
    </span>
  );
}

import { cn } from "@/lib/utils";
import type { LocationStatus } from "@/lib/schemas";

type StatusBadgeProps = {
  status: LocationStatus;
  className?: string;
};

const statusClasses: Record<LocationStatus, string> = {
  available: "bg-status-available-bg text-status-available-fg border-status-available-fg/30",
  in_cleaning: "bg-status-cleaning-bg text-status-cleaning-fg border-status-cleaning-fg/30 animate-pulse",
  occupied: "bg-status-occupied-bg text-status-occupied-fg border-status-occupied-fg/30",
};

const statusText: Record<LocationStatus, string> = {
    available: "Disponível",
    in_cleaning: "Em Higienização",
    occupied: "Ocupado"
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusClasses[status],
        className
      )}
    >
      {statusText[status]}
    </span>
  );
}

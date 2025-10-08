import type { Location, LocationStatus, CleaningSettings } from "@/lib/schemas";
import LocationCard from "./location-card";
import { cn } from "@/lib/utils";

interface LocationColumnProps {
  title: string;
  icon: React.ReactNode;
  locations: Location[];
  cleaningSettings: CleaningSettings;
  count: number;
  status: LocationStatus;
}

const statusClasses = {
  available: "bg-status-available-bg",
  in_cleaning: "bg-status-cleaning-bg",
  occupied: "bg-status-occupied-bg",
}

export default function LocationColumn({ title, icon, locations, cleaningSettings, count, status }: LocationColumnProps) {
    return (
        <div className={cn("flex flex-col gap-2 p-2 rounded-lg h-full", statusClasses[status])}>
            <div className={cn("flex items-center gap-2 p-1 sticky top-0 z-10", statusClasses[status])}>
                {icon}
                <h2 className="text-base font-bold">{title}</h2>
                <span className="ml-auto bg-card text-card-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">{count}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto scroll-container">
                {locations.length > 0 ? (
                    locations.map(location => (
                        <LocationCard key={location._id.toString()} location={location} cleaningSettings={cleaningSettings} />
                    ))
                ) : (
                    <div className="text-center text-muted-foreground italic py-6 text-sm">
                        <p>Nenhum local neste estado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

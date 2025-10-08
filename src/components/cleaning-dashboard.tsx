"use client";

import type { Location, Asg, CleaningSettings } from "@/lib/schemas";
import { Bed, Sparkles, UserCheck } from "lucide-react";
import LocationCardColumn from "./location-card-column";

interface CleaningDashboardProps {
  availableLocations: Location[];
  inCleaningLocations: Location[];
  occupiedLocations: Location[];
  cleaningSettings: CleaningSettings;
}

export default function CleaningDashboard({
  availableLocations,
  inCleaningLocations,
  occupiedLocations,
  cleaningSettings
}: CleaningDashboardProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <LocationCardColumn
        title="Disponíveis"
        icon={<Bed className="h-5 w-5 text-status-available-fg" />}
        locations={availableLocations}
        cleaningSettings={cleaningSettings}
        count={availableLocations.length}
        status="available"
      />
      <LocationCardColumn
        title="Em Higienização"
        icon={<Sparkles className="h-5 w-5 text-status-cleaning-fg" />}
        locations={inCleaningLocations}
        cleaningSettings={cleaningSettings}
        count={inCleaningLocations.length}
        status="in_cleaning"
      />
      <LocationCardColumn
        title="Ocupados"
        icon={<UserCheck className="h-5 w-5 text-status-occupied-fg" />}
        locations={occupiedLocations}
        cleaningSettings={cleaningSettings}
        count={occupiedLocations.length}
        status="occupied"
      />
    </div>
  );
}

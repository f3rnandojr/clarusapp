
"use client";

import type { Location, CleaningSettings } from "@/lib/schemas";
import { Bed, UserCheck } from "lucide-react";
import LocationColumn from "./location-column";

interface CleaningDashboardProps {
  availableLocations: Location[];
  occupiedLocations: Location[];
  cleaningSettings: CleaningSettings;
}

export default function CleaningDashboard({
  availableLocations,
  occupiedLocations,
  cleaningSettings
}: CleaningDashboardProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <LocationColumn
          title="Disponíveis"
          icon={<Bed className="h-5 w-5 text-status-available-fg" />}
          locations={availableLocations}
          cleaningSettings={cleaningSettings}
          count={availableLocations.length}
          status="available"
        />
        <LocationColumn
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

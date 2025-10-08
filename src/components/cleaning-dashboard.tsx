
"use client";

import type { Location, CleaningSettings } from "@/lib/schemas";
import { Bed, UserCheck } from "lucide-react";
import LocationCardColumn from "./location-card-column";
import { CleaningSections } from "./cleaning-sections";

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
    <div className="flex flex-col gap-4">
      {/* Seções Disponíveis e Ocupados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LocationCardColumn
          title="Disponíveis"
          icon={<Bed className="h-5 w-5 text-status-available-fg" />}
          locations={availableLocations}
          cleaningSettings={cleaningSettings}
          count={availableLocations.length}
          status="available"
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

      {/* Seção Em Higienização */}
      <div>
        <CleaningSections 
          locations={inCleaningLocations} 
          cleaningSettings={cleaningSettings}
        />
      </div>
    </div>
  );
}

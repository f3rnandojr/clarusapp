"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers } from "@/lib/actions";
import CleaningDashboard from "@/components/cleaning-dashboard";
import Header from "@/components/header";
import { Loader2 } from "lucide-react";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence } from "@/lib/schemas";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    locations: Location[];
    asgs: Asg[];
    users: User[];
    nextAsgCode: string;
    cleaningSettings: CleaningSettings;
    occurrences: CleaningOccurrence[];
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ A conversão agora é feita nas Server Actions, então podemos usar os dados diretamente.
        const [
          locations,
          asgs,
          users,
          nextAsgCode,
          cleaningSettings,
          occurrences,
        ] = await Promise.all([
          getLocations(),
          getAsgs(),
          getUsers(),
          getNextAsgCode(),
          getCleaningSettings(),
          getCleaningOccurrences(),
        ]);
        
        setData({ locations, asgs, users, nextAsgCode, cleaningSettings, occurrences });

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const { locations, asgs, users, nextAsgCode, cleaningSettings, occurrences } = data;

  const availableLocations = locations.filter((l) => l.status === "available");
  const inCleaningLocations = locations.filter((l) => l.status === "in_cleaning");
  const occupiedLocations = locations.filter((l) => l.status === "occupied");
  const availableAsgs = asgs.filter((a) => a.status === "available" && a.active);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header asgs={asgs} users={users} nextAsgCode={nextAsgCode} cleaningSettings={cleaningSettings} occurrences={occurrences} />
      <main className="flex-1 p-2 md:p-4 overflow-hidden">
        <CleaningDashboard
          availableLocations={availableLocations}
          inCleaningLocations={inCleaningLocations}
          occupiedLocations={occupiedLocations}
          availableAsgs={availableAsgs}
          allAsgs={asgs}
          cleaningSettings={cleaningSettings}
        />
      </main>
    </div>
  );
}

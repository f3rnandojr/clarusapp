"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getLocationByCode } from "@/lib/actions";
import CleaningDashboard from "@/components/cleaning-dashboard";
import Header from "@/components/header";
import { Loader2 } from "lucide-react";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence, Area } from "@/lib/schemas";
import { StartCleaningDialog } from "@/components/start-cleaning-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    locations: Location[];
    asgs: Asg[];
    users: User[];
    nextAsgCode: string;
    cleaningSettings: CleaningSettings;
    occurrences: CleaningOccurrence[];
    areas: Area[];
  } | null>(null);

  // State for the auto-triggered cleaning dialog
  const [cleaningLocation, setCleaningLocation] = useState<Location | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          locations,
          asgs,
          users,
          nextAsgCode,
          cleaningSettings,
          occurrences,
          areas,
        ] = await Promise.all([
          getLocations(),
          getAsgs(),
          getUsers(),
          getNextAsgCode(),
          getCleaningSettings(),
          getCleaningOccurrences(),
          getAreas(),
        ]);
        
        setData({ locations, asgs, users, nextAsgCode, cleaningSettings, occurrences, areas });

        // --- QR Code Logic ---
        const locationCodeToClean = searchParams.get("startCleaning");
        if (locationCodeToClean) {
          console.log(`QR Scan detected: Looking for location with code '${locationCodeToClean}'`);
          const foundLocation = await getLocationByCode(locationCodeToClean);
          if (foundLocation) {
            console.log("Location found, triggering dialog:", foundLocation);
            setCleaningLocation(foundLocation);
            setDialogOpen(true);
          } else {
            console.warn("Location code from QR scan not found.");
          }
          // Clean up URL
          router.replace('/dashboard', { scroll: false });
        }
        // --- End QR Code Logic ---

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const { locations, asgs, users, nextAsgCode, cleaningSettings, occurrences, areas } = data;

  const availableLocations = locations.filter((l) => l.status === "available");
  const inCleaningLocations = locations.filter((l) => l.status === "in_cleaning");
  const occupiedLocations = locations.filter((l) => l.status === "occupied");

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header asgs={asgs} users={users} nextAsgCode={nextAsgCode} cleaningSettings={cleaningSettings} occurrences={occurrences} allAreas={areas} />
      <main className="flex-1 p-2 md:p-4 overflow-hidden">
        <CleaningDashboard
          availableLocations={availableLocations}
          inCleaningLocations={inCleaningLocations}
          occupiedLocations={occupiedLocations}
          cleaningSettings={cleaningSettings}
        />
      </main>
      
      {/* Auto-triggered dialog for QR code scan */}
      {cleaningLocation && (
        <StartCleaningDialog
          location={cleaningLocation}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        >
          {/* This dialog is opened programmatically, no trigger needed here */}
        </StartCleaningDialog>
      )}
    </div>
  );
}

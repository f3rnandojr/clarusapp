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
    const fetchDataAndHandleQRCode = async () => {
      try {
        setLoading(true);
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
          console.log(`[Dashboard] QR Scan detectado: Procurando local com código '${locationCodeToClean}'`);
          const foundLocation = await getLocationByCode(locationCodeToClean);
          if (foundLocation) {
            console.log("[Dashboard] Local encontrado, acionando modal de limpeza:", foundLocation);
            setCleaningLocation(foundLocation);
            setDialogOpen(true);
          } else {
            console.warn(`[Dashboard] Código do local do QR scan ('${locationCodeToClean}') não encontrado.`);
            // Optionally, show a toast message to the user
          }
          // Limpa a URL para que o modal não reabra em um refresh.
          router.replace('/dashboard', { scroll: false });
        }
        // --- End QR Code Logic ---

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataAndHandleQRCode();
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
          onOpenChange={(isOpen) => {
            setDialogOpen(isOpen);
            if (!isOpen) {
              // Limpa a localização para não reabrir o dialog acidentalmente
              setCleaningLocation(null);
            }
          }}
        >
          {/* This dialog is opened programmatically, no trigger needed here */}
        </StartCleaningDialog>
      )}
    </div>
  );
}

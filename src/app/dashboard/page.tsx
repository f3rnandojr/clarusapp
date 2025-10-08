"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getLocationByCode, finishCleaning } from "@/lib/actions";
import CleaningDashboard from "@/components/cleaning-dashboard";
import Header from "@/components/header";
import { Loader2 } from "lucide-react";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence, Area } from "@/lib/schemas";
import { StartCleaningDialog } from "@/components/start-cleaning-dialog";
import { CleaningSections } from "@/components/cleaning-sections";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    locations: Location[];
    asgs: Asg[];
    users: User[];
    nextAsgCode: string;
    cleaningSettings: CleaningSettings;
    occurrences: CleaningOccurrence[];
    areas: Area[];
  } | null>(null);

  const [cleaningLocation, setCleaningLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFinalizing, startFinalizingTransition] = useTransition();


  const loadDashboardData = async () => {
    console.log('🔄 Carregando dados do dashboard...');
    setIsLoading(true);
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
      console.log('✅ Dados do dashboard carregados.');

      const locationCodeToClean = searchParams.get("startCleaning");
      if (locationCodeToClean) {
        console.log(`[Dashboard] QR Scan detectado: Procurando local com código '${locationCodeToClean}'`);
        const foundLocation = await getLocationByCode(locationCodeToClean);
        if (foundLocation) {
          console.log("[Dashboard] Local encontrado, acionando modal de limpeza:", foundLocation);
          setCleaningLocation(foundLocation);
          setIsDialogOpen(true);
        } else {
          console.warn(`[Dashboard] Código do local do QR scan ('${locationCodeToClean}') não encontrado.`);
          toast({ title: "Erro", description: `Local com código "${locationCodeToClean}" não encontrado.`, variant: "destructive" });
        }
        router.replace('/dashboard', { scroll: false });
      }

    } catch (error) {
      console.error("❌ Erro ao carregar dashboard:", error);
      toast({ title: "Erro de Carregamento", description: "Não foi possível carregar os dados do dashboard.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleDialogClose = (wasSuccessful: boolean) => {
    setIsDialogOpen(false);
    setCleaningLocation(null);
    if (wasSuccessful) {
      // Pequeno delay para garantir que a revalidação do path tenha efeito
      setTimeout(() => {
        loadDashboardData();
      }, 500);
    }
  };

  const handleFinalizeCleaning = (locationId: string) => {
    startFinalizingTransition(async () => {
        const result = await finishCleaning(locationId);
        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.success,
            });
            loadDashboardData(); // Recarrega os dados para atualizar a UI
        } else {
            toast({
                title: "Erro",
                description: result.error,
                variant: "destructive",
            });
        }
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const { locations, asgs, users, nextAsgCode, cleaningSettings, occurrences, areas } = data;

  const inCleaningLocations = locations.filter((l) => l.status === "in_cleaning");
  const availableLocations = locations.filter((l) => l.status === "available");
  const occupiedLocations = locations.filter((l) => l.status === "occupied");

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header asgs={asgs} users={users} nextAsgCode={nextAsgCode} cleaningSettings={cleaningSettings} occurrences={occurrences} allAreas={areas} />
      
      <main className="flex-1 p-2 md:p-4 overflow-hidden flex flex-col gap-4">
        
        <div className="flex-shrink-0">
          <CleaningSections 
              locations={inCleaningLocations} 
              cleaningSettings={cleaningSettings}
              onFinalizeCleaning={handleFinalizeCleaning}
              isFinalizing={isFinalizing}
          />
        </div>

        <Separator />
        
        <div className="flex-1 overflow-hidden">
           <CleaningDashboard
              availableLocations={availableLocations}
              occupiedLocations={occupiedLocations}
              cleaningSettings={cleaningSettings}
              onStartCleaning={(location) => {
                setCleaningLocation(location);
                setIsDialogOpen(true);
              }}
            />
        </div>

      </main>
      
      {cleaningLocation && (
        <StartCleaningDialog
          location={cleaningLocation}
          open={isDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleDialogClose(false); // Fecha sem recarregar se cancelado
            } else {
               setIsDialogOpen(true);
            }
          }}
          onCleaningStarted={() => handleDialogClose(true)} // Fecha e recarrega em caso de sucesso
        />
      )}
    </div>
  );
}

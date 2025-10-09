
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getLocationByCode, finishCleaning } from "@/lib/actions";
import Header from "@/components/header";
import { Loader2 } from "lucide-react";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence, Area } from "@/lib/schemas";
import { StartCleaningDialog } from "@/components/start-cleaning-dialog";
import { CleaningSections } from "@/components/cleaning-sections";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetorExpansivel } from "@/components/setor-expansivel";
import { Building, Sparkles } from "lucide-react";

type SetorGroup = {
  nome: string;
  locais: Location[];
  total: number;
  disponiveis: number;
  emLimpeza: number;
  ocupados: number;
};

type DashboardData = {
    locations: Location[];
    asgs: Asg[];
    users: User[];
    nextAsgCode: string;
    cleaningSettings: CleaningSettings;
    occurrences: CleaningOccurrence[];
    areas: Area[];
};

interface AdminDashboardProps {
  initialData: DashboardData;
  user: User;
}

export function AdminDashboard({ initialData, user }: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [data, setData] = useState<DashboardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const [cleaningLocation, setCleaningLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFinalizing, startFinalizingTransition] = useTransition();

  const loadDashboardData = async () => {
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

    } catch (error) {
      console.error("❌ Erro ao carregar dashboard:", error);
      toast({ title: "Erro de Carregamento", description: "Não foi possível carregar os dados do dashboard.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const processUrlParams = async () => {
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
    };
    processUrlParams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDialogClose = (wasSuccessful: boolean) => {
    setIsDialogOpen(false);
    setCleaningLocation(null);
    if (wasSuccessful) {
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
            loadDashboardData();
        } else {
            toast({
                title: "Erro",
                description: result.error,
                variant: "destructive",
            });
        }
    });
  };

  const setoresAgrupados: SetorGroup[] = useMemo(() => {
    if (!data?.locations) return [];
    
    const grupos: Record<string, Location[]> = data.locations.reduce((acc, local) => {
      const setor = local.setor || 'Sem Setor';
      if (!acc[setor]) {
        acc[setor] = [];
      }
      acc[setor].push(local);
      return acc;
    }, {} as Record<string, Location[]>);

    return Object.entries(grupos).map(([nome, locais]) => ({
      nome,
      locais,
      total: locais.length,
      disponiveis: locais.filter(l => l.status === 'available').length,
      emLimpeza: locais.filter(l => l.status === 'in_cleaning').length,
      ocupados: locais.filter(l => l.status === 'occupied').length,
    })).sort((a,b) => a.nome.localeCompare(b.nome));
  }, [data?.locations]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const { locations, asgs, users, nextAsgCode, cleaningSettings, occurrences, areas } = data;
  const inCleaningLocations = locations.filter((l) => l.status === "in_cleaning");
  
  const handleLocationClick = (location: Location) => {
    setCleaningLocation(location);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header 
        asgs={asgs} 
        users={users} 
        nextAsgCode={nextAsgCode} 
        cleaningSettings={cleaningSettings} 
        occurrences={occurrences} 
        allAreas={areas}
        user={user}
      />
      
      <main className="flex-1 p-2 md:p-4 overflow-y-auto">
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="cleaning"><Sparkles className="mr-2 h-4 w-4" />Em Higienização ({inCleaningLocations.length})</TabsTrigger>
                <TabsTrigger value="overview"><Building className="mr-2 h-4 w-4" />Visão Geral por Setor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cleaning">
              <CleaningSections 
                  locations={inCleaningLocations} 
                  cleaningSettings={cleaningSettings}
                  onFinalizeCleaning={handleFinalizeCleaning}
                  isFinalizing={isFinalizing}
              />
            </TabsContent>

            <TabsContent value="overview">
              <div className="space-y-3">
                {setoresAgrupados.map((setor) => (
                  <SetorExpansivel key={setor.nome} setor={setor} onLocationClick={handleLocationClick} />
                ))}
              </div>
            </TabsContent>
        </Tabs>
      </main>
      
      {cleaningLocation && (
        <StartCleaningDialog
          location={cleaningLocation}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onCleaningStarted={() => handleDialogClose(true)}
        />
      )}
    </div>
  );
}

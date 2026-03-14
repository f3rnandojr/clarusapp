
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getLocationByCode, finishCleaning, getActiveCleanings, getNonConformities } from "@/lib/actions";
import Header from "@/components/header";
import { Loader2 } from "lucide-react";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence, Area, NonConformity } from "@/lib/schemas";
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
    nonConformities: NonConformity[];
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
        nonConformities,
      ] = await Promise.all([
        getLocations(),
        getAsgs(),
        getUsers(),
        getNextAsgCode(),
        getCleaningSettings(),
        getCleaningOccurrences(),
        getAreas(),
        getNonConformities(),
      ]);
      
      setData({ locations, asgs, users, nextAsgCode, cleaningSettings, occurrences, areas, nonConformities });

    } catch (error) {
      console.error("❌ Erro ao carregar dashboard:", error);
      toast({ title: "Erro de Carregamento", description: "Não foi possível carregar os dados do dashboard.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleStartCleaningByCode = async (code: string) => {
        const location = await getLocationByCode(code);
        if (location) {
            console.log('📍 [DEBUG PROCESSAMENTO] Local encontrado:', location);
            setCleaningLocation(location);
            setIsDialogOpen(true);
        } else {
            console.warn(`❌ [DEBUG PROCESSAMENTO] Local NÃO encontrado para código: '${code}'`);
            toast({ title: "Erro", description: `Local com código "${code}" não encontrado.`, variant: "destructive" });
        }
    };
    
    const startCleaningParam = searchParams.get('startCleaning');
    if (startCleaningParam) {
        console.log('🚀 [AUTO-START] Iniciando higienização automática para:', startCleaningParam);
        handleStartCleaningByCode(startCleaningParam);
        router.replace('/dashboard', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const { locations, asgs, users, nextAsgCode, cleaningSettings, occurrences, areas, nonConformities } = data;
  const inCleaningLocations = locations.filter((l) => l.status === "in_cleaning");
  
  const handleLocationClick = (location: Location) => {
    setCleaningLocation(location);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        asgs={asgs} 
        users={users} 
        nextAsgCode={nextAsgCode} 
        cleaningSettings={cleaningSettings} 
        occurrences={occurrences} 
        nonConformities={nonConformities}
        allAreas={areas}
        user={user}
      />
      
      <main className="flex-1 p-2 md:p-4 pb-10">
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="cleaning"><Sparkles className="mr-2 h-4 w-4" />Higienização ({inCleaningLocations.length})</TabsTrigger>
                <TabsTrigger value="overview"><Building className="mr-2 h-4 w-4" />Setores</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cleaning">
              <CleaningSections 
                  locations={inCleaningLocations} 
                  cleaningSettings={cleaningSettings}
                  onFinalizeCleaning={handleFinalizeCleaning}
                  isFinalizing={isFinalizing}
                  userProfile={user.perfil}
                  currentUserId={user._id}
              />
            </TabsContent>

            <TabsContent value="overview">
              <div className="space-y-3">
                {setoresAgrupados.map((setor) => (
                  <SetorExpansivel key={setor.nome} setor={setor} onLocationClick={handleLocationClick} userProfile={user.perfil} currentUserId={user._id} />
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

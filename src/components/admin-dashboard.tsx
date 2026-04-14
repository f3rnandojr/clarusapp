
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getLocationByCode, finishCleaning, getNonConformities, getPendingRequests } from "@/lib/actions";
import Header from "@/components/header";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence, Area, NonConformity, ScheduledRequest } from "@/lib/schemas";
import { StartCleaningDialog } from "@/components/start-cleaning-dialog";
import { CleaningSections } from "@/components/cleaning-sections";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetorExpansivel } from "@/components/setor-expansivel";
import { Building, Sparkles, Bell } from "lucide-react";
import { Badge } from "./ui/badge";

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
    pendingRequests: ScheduledRequest[];
};

interface AdminDashboardProps {
  initialData: DashboardData;
  user: User;
  viewMode?: 'solicitation' | 'view_only';
}

export function AdminDashboard({ initialData, user, viewMode = 'solicitation' }: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [data, setData] = useState<DashboardData>(initialData);
  const [cleaningLocation, setCleaningLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFinalizing, startFinalizingTransition] = useTransition();

  const loadDashboardData = async () => {
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
        pendingRequests,
      ] = await Promise.all([
        getLocations(),
        getAsgs(),
        getUsers(),
        getNextAsgCode(),
        getCleaningSettings(),
        getCleaningOccurrences(),
        getAreas(),
        getNonConformities(),
        getPendingRequests(),
      ]);
      
      setData({ 
        locations: locations || [], 
        asgs: asgs || [], 
        users: users || [], 
        nextAsgCode: nextAsgCode || 'ASG001', 
        cleaningSettings: cleaningSettings || { concurrent: 30, terminal: 45 }, 
        occurrences: occurrences || [], 
        areas: areas || [], 
        nonConformities: nonConformities || [],
        pendingRequests: pendingRequests || [] 
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar dashboard:", error);
    }
  };

  // Polling automático a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStartCleaningByCode = async (code: string) => {
        const location = await getLocationByCode(code);
        if (location) {
            setCleaningLocation(location);
            setIsDialogOpen(true);
        } else {
            toast({ title: "Atenção", description: `Local "${code}" não identificado.`, variant: "destructive" });
        }
    };
    
    const startCleaningParam = searchParams.get('startCleaning');
    if (startCleaningParam) {
        handleStartCleaningByCode(startCleaningParam);
        router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, router, toast]);

  const handleDialogClose = (wasSuccessful: boolean) => {
    setIsDialogOpen(false);
    setCleaningLocation(null);
    if (wasSuccessful) {
      loadDashboardData();
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
                description: result.error || "Não foi possível finalizar a limpeza.",
                variant: "destructive",
            });
        }
    });
  };

  const setoresAgrupados: SetorGroup[] = useMemo(() => {
    const locations = data?.locations || [];
    
    const grupos: Record<string, Location[]> = locations.reduce((acc, local) => {
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

  const locations = data?.locations || [];
  const asgs = data?.asgs || [];
  const users = data?.users || [];
  const nextAsgCode = data?.nextAsgCode || 'ASG001';
  const cleaningSettings = data?.cleaningSettings || { concurrent: 30, terminal: 45 };
  const occurrences = data?.occurrences || [];
  const areas = data?.areas || [];
  const nonConformities = data?.nonConformities || [];
  const pendingRequests = data?.pendingRequests || [];

  const inCleaningLocations = locations.filter((l) => l.status === "in_cleaning");
  
  const handleLocationClick = (location: Location) => {
    setCleaningLocation(location);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 transition-colors">
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
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100 dark:bg-slate-800 border border-[#A0E9FF]/40 dark:border-slate-700 p-1 h-11 rounded-xl">
                <TabsTrigger value="cleaning" className="rounded-lg data-[state=active]:bg-[#A0E9FF] data-[state=active]:text-[#0F4C5C] data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest text-gray-500">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />Higienização ({inCleaningLocations.length})
                </TabsTrigger>
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-[#A0E9FF] data-[state=active]:text-[#0F4C5C] data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest text-gray-500">
                  <Building className="mr-2 h-3.5 w-3.5" />Setores
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="cleaning">
              {pendingRequests.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-[#A0E9FF]/10 border border-[#A0E9FF]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-[#0F4C5C]" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#0F4C5C]">Solicitações Pendentes ({pendingRequests.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingRequests.map(req => (
                      <Badge key={req._id.toString()} variant="outline" className="bg-[#A0E9FF]/20 border-[#A0E9FF]/50 text-[#0F4C5C] text-[10px] py-1 px-3">
                        {req.locationName} • {req.cleaningType === 'terminal' ? 'Terminal' : 'Conc.'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                  <SetorExpansivel
                    key={setor.nome}
                    setor={setor}
                    onLocationClick={handleLocationClick}
                    userProfile={user.perfil}
                    currentUserId={user._id}
                    cleaningSettings={cleaningSettings}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </TabsContent>
        </Tabs>
      </main>
      
      {cleaningLocation && (
        <StartCleaningDialog
          location={cleaningLocation}
          userProfile={user.perfil}
          open={isDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleDialogClose(false);
          }}
          onCleaningStarted={() => handleDialogClose(true)}
        />
      )}
    </div>
  );
}

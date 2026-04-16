
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getLocationByCode, getNonConformities, getPendingRequests } from "@/lib/actions";
import Header from "@/components/header";
import type { Location, Asg, User, CleaningSettings, CleaningOccurrence, Area, NonConformity, ScheduledRequest } from "@/lib/schemas";
import { StartCleaningDialog } from "@/components/start-cleaning-dialog";
import { useToast } from "@/hooks/use-toast";
import { SetorExpansivel } from "@/components/setor-expansivel";

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'in_cleaning'>('all');

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

  const countByStatus = useMemo(() => ({
    all: locations.length,
    available: locations.filter(l => l.status === 'available').length,
    occupied: locations.filter(l => l.status === 'occupied').length,
    in_cleaning: locations.filter(l => l.status === 'in_cleaning').length,
  }), [locations]);

  const filteredSetores = useMemo(() => {
    if (statusFilter === 'all') return setoresAgrupados;
    return setoresAgrupados
      .map(setor => ({ ...setor, locais: setor.locais.filter(l => l.status === statusFilter) }))
      .filter(setor => setor.locais.length > 0);
  }, [setoresAgrupados, statusFilter]);

  const handleLocationClick = (location: Location) => {
    setCleaningLocation(location);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F0E8] dark:bg-slate-900 transition-colors">
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
        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'all',         label: 'Todos',        activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C]' },
            { key: 'available',   label: 'Disponíveis',  activeClass: 'bg-emerald-500 text-white border-emerald-500' },
            { key: 'occupied',    label: 'Ocupados',     activeClass: 'bg-amber-500 text-white border-amber-500' },
            { key: 'in_cleaning', label: 'Em Limpeza',   activeClass: 'bg-[#A0E9FF] text-[#0F4C5C] border-[#A0E9FF]' },
          ] as const).map(({ key, label, activeClass }) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                  isActive
                    ? activeClass
                    : 'bg-transparent border-gray-300 text-gray-500 hover:border-gray-400 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                {label}
                <span className={`text-[10px] font-black ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {countByStatus[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredSetores.map((setor) => (
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
          {filteredSetores.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              Nenhum leito encontrado com este status.
            </div>
          )}
        </div>
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

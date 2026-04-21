"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetorExpansivel } from "@/components/setor-expansivel";
import { logout, getLocations } from "@/lib/actions";
import type { Location, User, CleaningSettings } from "@/lib/schemas";

type SetorGroup = {
  nome: string;
  locais: Location[];
  total: number;
  disponiveis: number;
  emLimpeza: number;
  ocupados: number;
};

type StatusFilter = 'leito' | 'all' | 'available' | 'occupied' | 'in_cleaning';

interface VisualizadorDashboardProps {
  locations: Location[];
  user: User;
  cleaningSettings: CleaningSettings;
}

export function VisualizadorDashboard({ locations: initialLocations, user, cleaningSettings }: VisualizadorDashboardProps) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('leito');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const locs = await getLocations();
        if (locs) setLocations(locs);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const setoresAgrupados: SetorGroup[] = useMemo(() => {
    const grupos: Record<string, Location[]> = (locations || []).reduce((acc, local) => {
      const setor = local.setor || 'Sem Setor';
      if (!acc[setor]) acc[setor] = [];
      acc[setor].push(local);
      return acc;
    }, {} as Record<string, Location[]>);

    return Object.entries(grupos).map(([nome, locais]) => ({
      nome,
      locais,
      total: locais.length,
      disponiveis: locais.filter(l => l.status === 'available').length,
      emLimpeza:   locais.filter(l => l.status === 'in_cleaning').length,
      ocupados:    locais.filter(l => l.status === 'occupied').length,
    })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [locations]);

  const leitos = useMemo(() => locations.filter(l => l.locationType === 'leito'), [locations]);

  const countByStatus = useMemo(() => ({
    leito:       leitos.length,
    all:         locations.length,
    available:   locations.filter(l => l.status === 'available').length,
    occupied:    locations.filter(l => l.status === 'occupied').length,
    in_cleaning: locations.filter(l => l.status === 'in_cleaning').length,
  }), [locations, leitos]);

  const filteredSetores = useMemo(() => {
    if (statusFilter === 'all') return setoresAgrupados;
    if (statusFilter === 'leito') {
      return setoresAgrupados
        .map(s => ({ ...s, locais: s.locais.filter(l => l.locationType === 'leito') }))
        .filter(s => s.locais.length > 0);
    }
    return setoresAgrupados
      .map(s => ({ ...s, locais: s.locais.filter(l => l.status === statusFilter) }))
      .filter(s => s.locais.length > 0);
  }, [setoresAgrupados, statusFilter]);

  const chips = [
    { key: 'leito'       as const, label: 'Leitos',      activeClass: 'bg-[#1565C0] text-white border-[#1565C0]' },
    { key: 'all'         as const, label: 'Todos',       activeClass: 'bg-[#0F4C5C] text-white border-[#0F4C5C]' },
    { key: 'available'   as const, label: 'Disponíveis', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
    { key: 'occupied'    as const, label: 'Ocupados',    activeClass: 'bg-amber-500 text-white border-amber-500' },
    { key: 'in_cleaning' as const, label: 'Em Limpeza',  activeClass: 'bg-[#A0E9FF] text-[#0F4C5C] border-[#A0E9FF]' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F0E8]">
      {/* Navbar mínima */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#A0E9FF]/50 bg-white shadow-sm shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <Image src="/logo_32x32.png" alt="navi" width={28} height={28} className="rounded-full" />
          <h1 className="text-lg font-black text-[#1565C0] tracking-tight">navi</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm text-[#0F4C5C]">{user.name}</p>
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-[#A0E9FF]/60 text-[#0F4C5C]/50 mt-0.5 px-1.5 h-4">
              Visualizador
            </Badge>
          </div>
          <form action={logout}>
            <Button variant="ghost" type="submit" size="sm" className="h-9 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50">
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Sair</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-2 md:p-4 pb-10">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map(({ key, label, activeClass }) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                  isActive ? activeClass : 'bg-transparent border-gray-300 text-gray-500 hover:border-gray-400'
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

        {/* Sector grid — view_only, no click actions */}
        <div className="space-y-3">
          {filteredSetores.map(setor => (
            <SetorExpansivel
              key={setor.nome}
              setor={setor}
              onLocationClick={() => {}}
              userProfile="visualizador"
              cleaningSettings={cleaningSettings}
              viewMode="view_only"
            />
          ))}
          {filteredSetores.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              Nenhum leito encontrado com este status.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

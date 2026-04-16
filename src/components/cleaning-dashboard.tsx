
"use client";

import type { Location, CleaningSettings } from "@/lib/schemas";
import { Bed, UserCheck } from "lucide-react";
import LocationColumn from "./location-column";
import { SetorExpansivel } from "./setor-expansivel";
import { useMemo } from "react";

interface CleaningDashboardProps {
  locations: Location[];
  cleaningSettings: CleaningSettings;
  onStartCleaning: (location: Location) => void;
}

type SetorGroup = {
  nome: string;
  locais: Location[];
  total: number;
  disponiveis: number;
  emLimpeza: number;
  ocupados: number;
};

export default function CleaningDashboard({
  locations,
  cleaningSettings,
  onStartCleaning,
}: CleaningDashboardProps) {

  const setoresAgrupados: SetorGroup[] = useMemo(() => {
    if (!locations) return [];
    
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
    }));
  }, [locations]);

  return (
     <div className="space-y-3">
      {setoresAgrupados.map((setor) => (
        <SetorExpansivel key={setor.nome} setor={setor} onLocationClick={onStartCleaning} />
      ))}
    </div>
  );
}

    
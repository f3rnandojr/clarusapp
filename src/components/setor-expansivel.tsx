
'use client';

import { useState } from 'react';
import type { Location, CleaningSettings, UserProfile } from '@/lib/schemas';
import { ChevronDown, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';
import LocationCard from './location-card';

type SetorGroup = {
  nome: string;
  locais: Location[];
  total: number;
  disponiveis: number;
  emLimpeza: number;
  ocupados: number;
};

interface SetorExpansivelProps {
  setor: SetorGroup;
  onLocationClick: (location: Location) => void;
  userProfile?: UserProfile;
  currentUserId?: string;
  cleaningSettings: CleaningSettings;
}

export function SetorExpansivel({
  setor,
  onLocationClick,
  userProfile = 'admin',
  currentUserId,
  cleaningSettings,
}: SetorExpansivelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-[#A0E9FF]/40 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-300">
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-[#A0E9FF]/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-[#A0E9FF]/25 p-1.5 rounded-lg flex-shrink-0">
            <Hospital className="h-4 w-4 text-[#0F4C5C]" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-[#0F4C5C] leading-tight">{setor.nome}</h3>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider mt-0.5">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {setor.disponiveis} livres
              </span>
              <span className="flex items-center gap-1 text-sky-500">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block animate-pulse" />
                {setor.emLimpeza} limpando
              </span>
              <span className="flex items-center gap-1 text-orange-500">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                {setor.ocupados} ocupados
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-[#A0E9FF]/20 text-[#0F4C5C] font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
            {setor.total} unid
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transform transition-transform duration-300',
              isExpanded && 'rotate-180 text-[#0F4C5C]'
            )}
          />
        </div>
      </div>

      {/* Cards grid */}
      {isExpanded && (
        <div className="border-t border-[#A0E9FF]/20 bg-gray-50/60 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {setor.locais.map((local) => (
            <LocationCard
              key={local._id.toString()}
              location={local}
              cleaningSettings={cleaningSettings}
              onStartClick={onLocationClick}
              userProfile={userProfile}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

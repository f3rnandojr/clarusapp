
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

export function SetorExpansivel({ setor, onLocationClick, userProfile = 'admin', currentUserId, cleaningSettings }: SetorExpansivelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-slate-800 rounded-3xl bg-slate-900/30 shadow-xl overflow-hidden transition-all duration-300">
      <div 
        className="flex justify-between items-center p-5 md:p-6 cursor-pointer hover:bg-slate-800/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-5">
          <div className="bg-sky-500/10 p-3 rounded-2xl shadow-inner border border-sky-500/10">
            <Hospital className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h3 className="font-black text-xl text-white tracking-tight leading-none">{setor.nome}</h3>
            <div className="hidden md:flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">
              <div className='flex items-center gap-2'><div className='w-1.5 h-1.5 rounded-full bg-emerald-500'></div>{setor.disponiveis} LIVRES</div>
              <div className='flex items-center gap-2'><div className='w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse'></div>{setor.emLimpeza} LIMPANDO</div>
              <div className='flex items-center gap-2'><div className='w-1.5 h-1.5 rounded-full bg-orange-500'></div>{setor.ocupados} OCUPADOS</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <span className="bg-slate-800 text-sky-400 font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-slate-700">
            {setor.total} UNID
          </span>
          
          <ChevronDown className={cn('h-5 w-5 text-slate-600 transform transition-transform duration-500', isExpanded && 'rotate-180 text-sky-400')} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-800/50 bg-slate-900/20 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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

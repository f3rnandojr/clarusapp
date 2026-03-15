
'use client';

import { useState } from 'react';
import type { Location, LocationStatus, UserProfile } from '@/lib/schemas';
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
}

export function SetorExpansivel({ setor, onLocationClick, userProfile = 'admin', currentUserId }: SetorExpansivelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-border/40 rounded-xl bg-card shadow-sm overflow-hidden transition-all duration-300">
      <div 
        className="flex justify-between items-center p-4 md:p-5 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2.5 rounded-lg shadow-inner">
            <Hospital className="h-6 w-6 text-primary-foreground/80" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-card-foreground leading-tight">{setor.nome}</h3>
            <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-muted-foreground mt-1.5">
              <div className='flex items-center gap-1.5'><div className='w-2 h-2 rounded-full bg-green-500 shadow-sm'></div>{setor.disponiveis} disponíveis</div>
              <div className='flex items-center gap-1.5'><div className='w-2 h-2 rounded-full bg-yellow-500 shadow-sm animate-pulse'></div>{setor.emLimpeza} em limpeza</div>
              <div className='flex items-center gap-1.5'><div className='w-2 h-2 rounded-full bg-orange-500 shadow-sm'></div>{setor.ocupados} ocupados</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="bg-primary/10 text-primary-foreground/70 font-bold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider border border-primary/20">
            {setor.total} locais
          </span>
          
          <ChevronDown className={cn('h-5 w-5 text-muted-foreground/50 transform transition-transform duration-300', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border/30 bg-muted/10 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {setor.locais.map((local) => (
            <LocationCard 
              key={local._id.toString()}
              location={local}
              // @ts-ignore
              cleaningSettings={{}} 
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

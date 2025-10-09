
'use client';

import { useState } from 'react';
import type { Location, LocationStatus, UserProfile } from '@/lib/schemas';
import { ChevronDown, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElapsedTime } from './elapsed-time';
import LocationCard from './location-card'; // Importando o LocationCard

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
}

export function SetorExpansivel({ setor, onLocationClick, userProfile = 'admin' }: SetorExpansivelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border rounded-lg bg-card shadow-sm">
      <div 
        className="flex justify-between items-center p-3 md:p-4 cursor-pointer hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <Hospital className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-semibold text-card-foreground">{setor.nome}</h3>
            <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <div className='flex items-center gap-1.5'><div className='w-2 h-2 rounded-full bg-green-500'></div>{setor.disponiveis} disponíveis</div>
              <div className='flex items-center gap-1.5'><div className='w-2 h-2 rounded-full bg-yellow-500'></div>{setor.emLimpeza} em limpeza</div>
              <div className='flex items-center gap-1.5'><div className='w-2 h-2 rounded-full bg-orange-500'></div>{setor.ocupados} ocupados</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="bg-primary/20 text-primary-foreground font-semibold text-xs px-2.5 py-1 rounded-full">
            {setor.total} locais
          </span>
          
          <ChevronDown className={cn('h-5 w-5 text-muted-foreground transform transition-transform', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t bg-muted/30 p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {setor.locais.map((local) => (
            <LocationCard 
              key={local._id.toString()}
              location={local}
              // @ts-ignore - cleaningSettings não é necessário aqui
              cleaningSettings={{}} 
              onStartClick={onLocationClick}
              userProfile={userProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

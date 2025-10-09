
'use client';

import { useState } from 'react';
import type { Location, LocationStatus } from '@/lib/schemas';
import { ChevronDown, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElapsedTime } from './elapsed-time';

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
}

const statusIndicatorClasses: Record<LocationStatus, string> = {
    available: 'bg-green-500',
    in_cleaning: 'bg-yellow-500 animate-pulse',
    occupied: 'bg-orange-500',
};

const statusTextClasses: Record<LocationStatus, string> = {
    available: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    in_cleaning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    occupied: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
};

const statusText: Record<LocationStatus, string> = {
    available: 'Disponível',
    in_cleaning: 'Em Higienização',
    occupied: 'Ocupado'
}

export function SetorExpansivel({ setor, onLocationClick }: SetorExpansivelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="border-t bg-muted/30">
          {setor.locais.map((local) => (
            <div
              key={local._id.toString()}
              className="flex items-center gap-4 p-3 border-b last:border-b-0 hover:bg-card cursor-pointer"
              onClick={() => onLocationClick(local)}
            >
              <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusIndicatorClasses[local.status])} />
              
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm text-foreground">{local.name} - {local.number}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusTextClasses[local.status])}>
                    {statusText[local.status]}
                  </span>
                </div>
                
                {local.status === 'in_cleaning' && local.currentCleaning && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Iniciado por: {local.currentCleaning.userName} | ⏱️ <ElapsedTime startTime={local.currentCleaning.startTime} />
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

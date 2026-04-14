
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
  viewMode?: 'solicitation' | 'view_only';
}

const statusDot: Record<string, string> = {
  available:   'w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block',
  in_cleaning: 'w-2.5 h-2.5 rounded-full bg-sky-400 inline-block animate-pulse',
  occupied:    'w-2.5 h-2.5 rounded-full bg-orange-400 inline-block',
};

export function SetorExpansivel({
  setor,
  onLocationClick,
  userProfile = 'admin',
  currentUserId,
  cleaningSettings,
  viewMode = 'solicitation',
}: SetorExpansivelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isViewOnly = viewMode === 'view_only';

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
                <span className={cn('inline-block rounded-full bg-emerald-500', isViewOnly ? 'w-2 h-2' : 'w-1.5 h-1.5')} />
                {setor.disponiveis} livres
              </span>
              <span className="flex items-center gap-1 text-sky-500">
                <span className={cn('inline-block rounded-full bg-sky-400 animate-pulse', isViewOnly ? 'w-2 h-2' : 'w-1.5 h-1.5')} />
                {setor.emLimpeza} limpando
              </span>
              <span className="flex items-center gap-1 text-orange-500">
                <span className={cn('inline-block rounded-full bg-orange-400', isViewOnly ? 'w-2 h-2' : 'w-1.5 h-1.5')} />
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
        isViewOnly ? (
          /* View-only: compact seat-map grid */
          <div className="border-t border-[#A0E9FF]/20 bg-gray-50/60 p-3">
            <div className="flex flex-wrap gap-2">
              {setor.locais.map((local) => {
                const statusLabel =
                  local.status === 'available'   ? 'Livre' :
                  local.status === 'in_cleaning' ? 'Limpando' : 'Ocupado';
                const bgColor =
                  local.status === 'available'   ? '#1D9E75' :
                  local.status === 'in_cleaning' ? '#378ADD' : '#EF9F27';
                const isPulsing = local.status === 'in_cleaning';
                const displayCode = local.externalCode || local.name;

                return (
                  <div
                    key={local._id.toString()}
                    title={`${displayCode} — ${statusLabel}`}
                    className={cn(
                      'relative group flex flex-col items-center justify-center rounded-lg cursor-default select-none transition-transform duration-150 hover:scale-110 active:scale-95',
                      isPulsing && 'animate-pulse'
                    )}
                    style={{
                      width: 72,
                      height: 72,
                      backgroundColor: bgColor,
                      boxShadow: `0 2px 8px 0 ${bgColor}55`,
                    }}
                  >
                    <span className="text-white font-black text-[11px] leading-tight text-center px-1 break-all">
                      {displayCode}
                    </span>

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                        {displayCode}
                        <span className="mx-1.5 text-gray-400">·</span>
                        <span className={cn(
                          local.status === 'available'   ? 'text-emerald-400' :
                          local.status === 'in_cleaning' ? 'text-sky-400' : 'text-orange-400'
                        )}>{statusLabel}</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Normal grid with cards */
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
        )
      )}
    </div>
  );
}

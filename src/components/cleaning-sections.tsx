
'use client';

import { useState } from 'react';
import type { Location, CleaningSettings } from '@/lib/schemas';
import LocationCard from './location-card';
import { ChevronDown, Sparkles, Bed, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface CleaningSectionsProps {
  locations: Location[];
  cleaningSettings: CleaningSettings;
}

export function CleaningSections({ locations, cleaningSettings }: CleaningSectionsProps) {

  // Separar locais em leitos e áreas
  const bedsCleaning = locations.filter(loc => loc.locationType === 'leito');
  const areasCleaning = locations.filter(loc => loc.locationType === 'area');

  if (locations.length === 0) {
    return (
      <div className="bg-status-cleaning-bg rounded-lg border p-4 text-center">
        <div className="flex items-center gap-2 p-1 justify-center">
            <Sparkles className="h-5 w-5 text-status-cleaning-fg" />
            <h2 className="text-base font-bold">Em Higienização</h2>
             <span className="ml-auto bg-card text-card-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">0</span>
        </div>
        <p className="text-muted-foreground mt-4 italic text-sm">Nenhum local em higienização no momento</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={['all', 'beds', 'areas']} className="w-full space-y-2">
      
      {/* SEÇÃO: TODOS EM HIGIENIZAÇÃO */}
      <AccordionItem value="all" className="bg-status-cleaning-bg rounded-lg border">
        <AccordionTrigger className="p-3 text-base hover:no-underline">
           <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-status-cleaning-fg" />
              <h2 className="font-bold">Todos em Higienização</h2>
              <span className="ml-2 bg-card text-card-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">{locations.length}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {locations.map(location => (
              <LocationCard 
                key={location._id.toString()} 
                location={location} 
                cleaningSettings={cleaningSettings}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
      
      {/* SEÇÃO: LEITOS EM HIGIENIZAÇÃO */}
      {bedsCleaning.length > 0 && (
        <AccordionItem value="beds" className="bg-status-cleaning-bg/80 rounded-lg border">
           <AccordionTrigger className="p-3 text-base hover:no-underline">
             <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-status-cleaning-fg" />
                <h2 className="font-bold">Leitos em Higienização</h2>
                 <span className="ml-2 bg-card text-card-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">{bedsCleaning.length}</span>
            </div>
           </AccordionTrigger>
          <AccordionContent className="p-3 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {bedsCleaning.map(location => (
                <LocationCard 
                  key={location._id.toString()} 
                  location={location} 
                  cleaningSettings={cleaningSettings}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* SEÇÃO: ÁREAS EM HIGIENIZAÇÃO */}
      {areasCleaning.length > 0 && (
        <AccordionItem value="areas" className="bg-status-cleaning-bg/60 rounded-lg border">
            <AccordionTrigger className="p-3 text-base hover:no-underline">
               <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-status-cleaning-fg" />
                  <h2 className="font-bold">Áreas em Higienização</h2>
                  <span className="ml-2 bg-card text-card-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">{areasCleaning.length}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-3 pt-0">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {areasCleaning.map(location => (
                    <LocationCard 
                        key={location._id.toString()} 
                        location={location} 
                        cleaningSettings={cleaningSettings}
                    />
                    ))}
                </div>
            </AccordionContent>
        </AccordionItem>
      )}
    </div>
  );
}

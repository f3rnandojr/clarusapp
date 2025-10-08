
'use client';

import { useState } from 'react';
import type { Location, CleaningSettings } from '@/lib/schemas';
import LocationCard from './location-card';
import { Sparkles, Bed, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
      <div className="bg-card rounded-lg border p-4 text-center">
        <div className="flex items-center gap-2 p-1 justify-center mb-4">
            <Sparkles className="h-5 w-5 text-status-cleaning-fg" />
            <h2 className="text-base font-bold">Em Higienização</h2>
        </div>
        <p className="text-muted-foreground italic text-sm">Nenhum local em higienização no momento</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="all">
                <Sparkles className="mr-2 h-4 w-4" /> Todos ({locations.length})
            </TabsTrigger>
            <TabsTrigger value="beds">
                <Bed className="mr-2 h-4 w-4" /> Leitos ({bedsCleaning.length})
            </TabsTrigger>
            <TabsTrigger value="areas">
                <Building className="mr-2 h-4 w-4" /> Áreas ({areasCleaning.length})
            </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {locations.map(location => (
                <LocationCard 
                    key={location._id.toString()} 
                    location={location} 
                    cleaningSettings={cleaningSettings}
                />
                ))}
            </div>
        </TabsContent>
        <TabsContent value="beds" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {bedsCleaning.length > 0 ? bedsCleaning.map(location => (
                <LocationCard 
                  key={location._id.toString()} 
                  location={location} 
                  cleaningSettings={cleaningSettings}
                />
              )) : <p className='text-muted-foreground text-sm italic col-span-full text-center py-4'>Nenhum leito em higienização.</p>}
            </div>
        </TabsContent>
        <TabsContent value="areas" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {areasCleaning.length > 0 ? areasCleaning.map(location => (
                <LocationCard 
                  key={location._id.toString()} 
                  location={location} 
                  cleaningSettings={cleaningSettings}
                />
              )): <p className='text-muted-foreground text-sm italic col-span-full text-center py-4'>Nenhuma área em higienização.</p>}
            </div>
        </TabsContent>
    </Tabs>
  );
}

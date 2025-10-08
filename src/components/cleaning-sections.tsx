
'use client';

import type { Location, CleaningSettings } from '@/lib/schemas';
import LocationCard from './location-card';
import { Sparkles, Bed, Building, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from './ui/button';

interface CleaningSectionsProps {
  locations: Location[];
  cleaningSettings: CleaningSettings;
  onFinalizeCleaning: (locationId: string) => void;
  isFinalizing: boolean;
}

export function CleaningSections({ locations, cleaningSettings, onFinalizeCleaning, isFinalizing }: CleaningSectionsProps) {
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

  const renderCardList = (locationList: Location[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {locationList.map(location => (
          <LocationCard 
              key={location._id.toString()} 
              location={location} 
              cleaningSettings={cleaningSettings}
              onFinalizeClick={() => onFinalizeCleaning(location._id.toString())}
              isFinalizing={isFinalizing}
          />
        ))}
    </div>
  );

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
            {locations.length > 0 
                ? renderCardList(locations) 
                : <p className='text-muted-foreground text-sm italic col-span-full text-center py-4'>Nenhum local em higienização.</p>
            }
        </TabsContent>
        <TabsContent value="beds" className="mt-4">
             {bedsCleaning.length > 0 
                ? renderCardList(bedsCleaning)
                : <p className='text-muted-foreground text-sm italic col-span-full text-center py-4'>Nenhum leito em higienização.</p>
            }
        </TabsContent>
        <TabsContent value="areas" className="mt-4">
            {areasCleaning.length > 0
                ? renderCardList(areasCleaning)
                : <p className='text-muted-foreground text-sm italic col-span-full text-center py-4'>Nenhuma área em higienização.</p>
            }
        </TabsContent>
    </Tabs>
  );
}

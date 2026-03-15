
"use client";

import type { Location, CleaningSettings, LocationStatus, UserProfile } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bed, Building, Clock, Sparkles, User, QrCode, Loader2, AlertTriangle } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { ElapsedTime } from "./elapsed-time";
import { StartCleaningDialog } from "./start-cleaning-dialog";
import { ProgressBar } from "./progress-bar";
import { QrCodeDialog } from "./qr-code-dialog";
import { NonConformityDialog } from "./non-conformity-dialog";
import { cn } from "@/lib/utils";

interface LocationCardProps {
  location: Location;
  cleaningSettings: CleaningSettings;
  onStartClick?: (location: Location) => void;
  onFinalizeClick?: (locationId: string) => void;
  isFinalizing?: boolean;
  userProfile?: UserProfile;
  currentUserId?: string;
}

const statusIndicatorClasses: Record<LocationStatus, string> = {
  available: "bg-green-500",
  in_cleaning: "bg-yellow-500",
  occupied: "bg-orange-500",
};

export default function LocationCard({ location, cleaningSettings, onStartClick, onFinalizeClick, isFinalizing, userProfile = 'admin', currentUserId }: LocationCardProps) {
  
  const renderCardContent = () => {
    switch (location.status) {
      case "in_cleaning":
        if (!location.currentCleaning) return null;
        // @ts-ignore
        const cleaningTime = cleaningSettings[location.currentCleaning.type] || 30;
        return (
          <div className="space-y-3 mt-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{location.currentCleaning.userName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>
                  {location.currentCleaning.type === "concurrent" ? "Limpeza Concorrente" : "Limpeza Terminal"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-accent/10 w-fit px-2 py-0.5 rounded-md mt-1">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <ElapsedTime startTime={location.currentCleaning.startTime} />
              </div>
            </div>
            <ProgressBar
              startTime={location.currentCleaning.startTime}
              cleaningType={location.currentCleaning.type}
              cleaningTimeMinutes={cleaningTime}
            />
          </div>
        );
      default:
        return (
            <p className="text-[11px] text-muted-foreground italic mt-2">Pronto para a próxima tarefa.</p>
        );
    }
  };

  const handleStartClick = () => {
    if (onStartClick) {
      onStartClick(location);
    }
  }

  const renderCardFooter = () => {
    if (location.status === 'in_cleaning') {
      return (
        <div className="flex flex-col gap-3 w-full pt-2">
            <NonConformityDialog locationId={location._id.toString()} locationName={`${location.name} - ${location.number}`}>
                <Button variant="ghost" size="sm" className="w-full text-[11px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 flex items-center justify-center gap-1.5 font-semibold uppercase tracking-wider">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Relatar Problema
                </Button>
            </NonConformityDialog>
            
            {onFinalizeClick && (
                <Button 
                    size="lg" 
                    variant="destructive" 
                    className="w-full font-bold text-sm uppercase tracking-tight shadow-sm border-b-4 border-red-800 active:border-b-0 active:translate-y-0.5 transition-all h-12 bg-red-600 hover:bg-red-700" 
                    onClick={() => onFinalizeClick(location._id.toString())} 
                    disabled={isFinalizing}
                >
                    {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                    Finalizar Limpeza
                </Button>
            )}
        </div>
      );
    }
    
    if (userProfile === 'admin' || userProfile === 'gestor') {
      const buttonText = "Solicitar Higienização";

      switch (location.status) {
        case "available":
          if (onStartClick) {
              return <Button size="sm" className="w-full shadow-sm font-bold uppercase text-[10px]" onClick={handleStartClick}>{buttonText}</Button>;
          }
          return (
            <StartCleaningDialog location={location} onCleaningStarted={() => {}}>
              <Button size="sm" className="w-full shadow-sm font-bold uppercase text-[10px]">{buttonText}</Button>
            </StartCleaningDialog>
          );
        case "occupied":
          if (onStartClick) {
              return (
                  <Button size="sm" variant="outline" className="w-full shadow-sm font-bold uppercase text-[10px]" onClick={handleStartClick}>
                      Limpeza Concorrente
                  </Button>
              );
          }
          return (
            <StartCleaningDialog location={location} onCleaningStarted={() => {}}>
              <Button size="sm" variant="outline" className="w-full shadow-sm font-bold uppercase text-[10px]">Limpeza Concorrente</Button>
            </StartCleaningDialog>
          );
        default:
          return null;
      }
    }
    
    return null;
  };

  const Icon = location.locationType === 'leito' ? Bed : Building;

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-none bg-card flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-sm", statusIndicatorClasses[location.status])}></div>
                <Icon className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="flex items-center gap-1">
                {location.externalCode && (
                    <QrCodeDialog
                        item={{
                        type: location.locationType as 'leito' | 'area',
                        displayName: `${location.name} - ${location.number}`,
                        code: location.locationType === 'area' ? location.externalCode : location.number,
                        shortCode: location.locationType === 'area' ? location.number : location.externalCode,
                        }}
                    >
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-accent">
                        <QrCode className="h-4 w-4" />
                        </Button>
                    </QrCodeDialog>
                )}
                <StatusBadge status={location.status} className="scale-90 origin-right" />
            </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-extrabold text-card-foreground tracking-tight leading-tight">
          {location.name} - {location.number}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 flex-grow pb-2">
        {renderCardContent()}
      </CardContent>
       <CardFooter className="px-4 pb-4 pt-0">
          {renderCardFooter()}
       </CardFooter>
    </Card>
  );
}

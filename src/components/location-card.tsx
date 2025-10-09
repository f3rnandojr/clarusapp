
"use client";

import type { Location, CleaningSettings, LocationStatus, UserProfile } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bed, Building, Clock, Sparkles, User, QrCode, Loader2 } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { ElapsedTime } from "./elapsed-time";
import { StartCleaningDialog } from "./start-cleaning-dialog";
import { FinishCleaningDialog } from "./finish-cleaning-dialog";
import { ProgressBar } from "./progress-bar";
import { QrCodeDialog } from "./qr-code-dialog";
import { cn } from "@/lib/utils";

interface LocationCardProps {
  location: Location;
  cleaningSettings: CleaningSettings;
  onStartClick?: (location: Location) => void;
  onFinalizeClick?: (locationId: string) => void;
  isFinalizing?: boolean;
  userProfile?: UserProfile;
}

const statusIndicatorClasses: Record<LocationStatus, string> = {
  available: "bg-green-500",
  in_cleaning: "bg-yellow-500",
  occupied: "bg-orange-500",
};

export default function LocationCard({ location, cleaningSettings, onStartClick, onFinalizeClick, isFinalizing, userProfile = 'admin' }: LocationCardProps) {
  
  const showActions = userProfile === 'admin' || userProfile === 'gestor';

  const renderCardContent = () => {
    switch (location.status) {
      case "in_cleaning":
        if (!location.currentCleaning) return null;
        // @ts-ignore
        const cleaningTime = cleaningSettings[location.currentCleaning.type]
        return (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span>{location.currentCleaning.userName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span>
                  {location.currentCleaning.type === "concurrent" ? "Limpeza Concorrente" : "Limpeza Terminal"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-3 w-3" />
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
            <p className="text-xs text-muted-foreground italic">Pronto para a próxima tarefa.</p>
        );
    }
  };

  const handleStartClick = () => {
    if (onStartClick) {
      onStartClick(location);
    }
  }

  const renderCardFooter = () => {
    if (!showActions) {
      return null;
    }
    
    switch (location.status) {
      case "available":
        if (onStartClick) {
            return <Button size="sm" className="w-full" onClick={handleStartClick}>Iniciar Higienização</Button>;
        }
        return (
          <StartCleaningDialog location={location}>
            <Button size="sm" className="w-full">Iniciar Higienização</Button>
          </StartCleaningDialog>
        );
      case "in_cleaning":
        if (onFinalizeClick) {
          return (
             <Button size="sm" variant="destructive" className="w-full" onClick={() => onFinalizeClick(location._id.toString())} disabled={isFinalizing}>
               {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
               Finalizar
             </Button>
          )
        }
        return (
          <FinishCleaningDialog location={location}>
            <Button size="sm" variant="destructive" className="w-full">Finalizar</Button>
          </FinishCleaningDialog>
        );
      case "occupied":
         if (onStartClick) {
            return (
                <Button size="sm" variant="outline" className="w-full" onClick={handleStartClick}>
                    Limpeza Concorrente
                </Button>
            );
        }
        return (
          <StartCleaningDialog location={location}>
            <Button size="sm" variant="outline" className="w-full">Limpeza Concorrente</Button>
          </StartCleaningDialog>
        );
      default:
        return null;
    }
  };

  const Icon = location.locationType === 'leito' ? Bed : Building;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="p-2.5 pb-1">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", statusIndicatorClasses[location.status])}></div>
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{location.name} - {location.number}</span>
          </div>
          <div className="flex items-center gap-1">
             {location.externalCode && (
              <QrCodeDialog
                item={{
                  type: location.locationType,
                  displayName: `${location.name} - ${location.number}`,
                  code: location.externalCode,
                  shortCode: location.locationType === 'area' ? location.number : location.externalCode,
                }}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <QrCode className="h-4 w-4" />
                </Button>
              </QrCodeDialog>
            )}
            <StatusBadge status={location.status} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("p-2.5 pt-1 flex-grow", showActions ? "pb-1.5" : "pb-2.5")}>
        {renderCardContent()}
      </CardContent>
       <CardFooter className="p-2.5 pt-0">
          {renderCardFooter()}
       </CardFooter>
    </Card>
  );
}

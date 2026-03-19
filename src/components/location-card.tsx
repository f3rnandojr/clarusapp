
"use client";

import type { Location, CleaningSettings, LocationStatus, UserProfile } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bed, Building, Clock, Sparkles, User, QrCode, Loader2, AlertTriangle, ClipboardCheck, Bell } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { ElapsedTime } from "./elapsed-time";
import { StartCleaningDialog } from "./start-cleaning-dialog";
import { ProgressBar } from "./progress-bar";
import { QrCodeDialog } from "./qr-code-dialog";
import { NonConformityDialog } from "./non-conformity-dialog";
import { AuditChecklistDialog } from "./audit-checklist-dialog";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getLastCleaningRecord } from "@/lib/actions";
import { Badge } from "./ui/badge";

interface LocationCardProps {
  location: Location & { isRequested?: boolean };
  cleaningSettings: CleaningSettings;
  onStartClick?: (location: Location) => void;
  onFinalizeClick?: (locationId: string) => void;
  isFinalizing?: boolean;
  userProfile?: UserProfile;
  currentUserId?: string;
}

const statusIndicatorClasses: Record<LocationStatus, string> = {
  available: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  in_cleaning: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
  occupied: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]",
};

export default function LocationCard({ location, cleaningSettings, onStartClick, onFinalizeClick, isFinalizing, userProfile = 'admin', currentUserId }: LocationCardProps) {
  const [lastCleaning, setLastCleaning] = useState<any>(null);

  useEffect(() => {
    if (userProfile === 'auditor' && location.status === 'in_cleaning') {
        getLastCleaningRecord(location._id.toString()).then(setLastCleaning);
    }
  }, [userProfile, location.status, location._id]);
  
  const renderCardContent = () => {
    switch (location.status) {
      case "in_cleaning":
        if (!location.currentCleaning) return null;
        // @ts-ignore
        const cleaningTime = cleaningSettings[location.currentCleaning.type] || 30;
        return (
          <div className="space-y-4 mt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="truncate font-medium">{location.currentCleaning.userName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400/80">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider">
                  {userProfile === 'auditor' ? 'Auditoria em Curso' : (location.currentCleaning.type === "concurrent" ? "Limpeza Concorrente" : "Limpeza Terminal")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-lg font-bold text-white bg-sky-500/10 w-fit px-3 py-1 rounded-lg mt-1 border border-sky-500/20">
                <Clock className="h-4 w-4 text-sky-400" />
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
            <div className="flex flex-col gap-2 mt-4">
              {location.isRequested && (
                <Badge variant="outline" className="w-fit bg-sky-500/10 border-sky-500/30 text-sky-400 animate-pulse flex gap-1.5 items-center py-1 px-3">
                  <Bell className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Solicitado</span>
                </Badge>
              )}
              <p className="text-xs text-muted-foreground/60 italic font-medium">
                {location.isRequested ? "Aguardando colaborador" : "Pronto para nova tarefa"}
              </p>
            </div>
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
        <div className="flex flex-col gap-4 w-full pt-4">
            <NonConformityDialog locationId={location._id.toString()} locationName={`${location.name} - ${location.number}`}>
                <button className="w-full text-[11px] text-orange-400/80 hover:text-orange-400 flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-colors">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Relatar Problema
                </button>
            </NonConformityDialog>
            
            {userProfile === 'auditor' ? (
                <AuditChecklistDialog location={location} lastCleaning={lastCleaning}>
                    <Button 
                        size="lg" 
                        className="w-full font-black text-sm uppercase tracking-widest shadow-[0_4px_12px_rgba(56,189,248,0.3)] rounded-xl transition-all h-14 bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-600 hover:to-sky-800 border-none group"
                    >
                        <ClipboardCheck className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                        Checklist de Verificação
                    </Button>
                </AuditChecklistDialog>
            ) : (
                onFinalizeClick && (
                    <Button 
                        size="lg" 
                        className="w-full font-black text-sm uppercase tracking-widest shadow-[0_4px_12px_rgba(220,38,38,0.3)] rounded-xl transition-all h-14 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 border-none group" 
                        onClick={() => onFinalizeClick(location._id.toString())} 
                        disabled={isFinalizing}
                    >
                        {isFinalizing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" />}
                        Finalizar Limpeza
                    </Button>
                )
            )}
        </div>
      );
    }
    
    if (userProfile === 'admin' || userProfile === 'gestor') {
      const buttonText = location.isRequested ? "Reforçar Solicitação" : "Solicitar Higienização";

      switch (location.status) {
        case "available":
          return (
            <StartCleaningDialog location={location} userProfile={userProfile} onCleaningStarted={() => handleDialogClose()}>
              <Button size="sm" className="w-full shadow-lg font-bold uppercase text-[10px] tracking-widest h-10 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-900" onClick={handleStartClick}>{buttonText}</Button>
            </StartCleaningDialog>
          );
        case "occupied":
          return (
            <StartCleaningDialog location={location} userProfile={userProfile} onCleaningStarted={() => handleDialogClose()}>
              <Button size="sm" variant="outline" className="w-full shadow-sm font-bold uppercase text-[10px] tracking-widest h-10 rounded-lg border-sky-500/30 text-sky-400 hover:bg-sky-500/10" onClick={handleStartClick}>Limpeza Concorrente</Button>
            </StartCleaningDialog>
          );
        default:
          return null;
      }
    }
    
    return null;
  };

  const handleDialogClose = () => {
    // Gatilho para o pai atualizar os dados
    if (onStartClick) {
        onStartClick(location);
    }
  };

  const Icon = location.locationType === 'leito' ? Bed : Building;

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-800/50 bg-card flex flex-col overflow-hidden group">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full ring-4 ring-background/50", statusIndicatorClasses[location.status])}></div>
                <Icon className="h-4 w-4 text-muted-foreground/40 group-hover:text-sky-400/50 transition-colors" />
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 hover:text-sky-400 hover:bg-sky-500/5">
                        <QrCode className="h-4 w-4" />
                        </Button>
                    </QrCodeDialog>
                )}
                <StatusBadge status={location.status} className="scale-90 origin-right border-none" />
            </div>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tighter leading-none group-hover:text-sky-400 transition-colors">
          {location.name}
          <span className="block text-sm font-bold text-muted-foreground mt-1 uppercase tracking-[0.2em]">{location.number}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pt-0 flex-grow pb-4">
        {renderCardContent()}
      </CardContent>
       <CardFooter className="px-5 pb-5 pt-0">
          {renderCardFooter()}
       </CardFooter>
    </Card>
  );
}

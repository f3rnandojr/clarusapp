
"use client";

import type { Location, CleaningSettings, LocationStatus, UserProfile } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Bed, Building, Clock, Sparkles, User, QrCode, Loader2, AlertTriangle, ClipboardCheck, Bell } from "lucide-react";
import { ElapsedTime } from "./elapsed-time";
import { StartCleaningDialog } from "./start-cleaning-dialog";
import { ProgressBar } from "./progress-bar";
import { QrCodeDialog } from "./qr-code-dialog";
import { NonConformityDialog } from "./non-conformity-dialog";
import { AuditChecklistDialog } from "./audit-checklist-dialog";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getLastCleaningRecord } from "@/lib/actions";

interface LocationCardProps {
  location: Location & { isRequested?: boolean };
  cleaningSettings: CleaningSettings;
  onStartClick?: (location: Location) => void;
  onFinalizeClick?: (locationId: string) => void;
  isFinalizing?: boolean;
  userProfile?: UserProfile;
  currentUserId?: string;
}

const borderLeftColor: Record<LocationStatus, string> = {
  available:   "border-l-emerald-500",
  in_cleaning: "border-l-sky-400",
  occupied:    "border-l-orange-400",
};

const statusDotColor: Record<LocationStatus, string> = {
  available:   "bg-emerald-500",
  in_cleaning: "bg-sky-400 animate-pulse",
  occupied:    "bg-orange-400",
};

export default function LocationCard({
  location,
  cleaningSettings,
  onStartClick,
  onFinalizeClick,
  isFinalizing,
  userProfile = 'admin',
  currentUserId,
}: LocationCardProps) {
  const [lastCleaning, setLastCleaning] = useState<any>(null);

  useEffect(() => {
    if (userProfile === 'auditor' && location.status === 'in_cleaning') {
      getLastCleaningRecord(location._id.toString()).then(setLastCleaning);
    }
  }, [userProfile, location.status, location._id]);

  const Icon = location.locationType === 'leito' ? Bed : Building;

  const handleDialogClose = () => {
    if (onStartClick) onStartClick(location);
  };

  const cleaningTime = location.currentCleaning
    ? (cleaningSettings as any)[location.currentCleaning.type] || 30
    : 30;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col",
        borderLeftColor[location.status]
      )}
    >
      {/* Header */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[15px] font-bold text-gray-800 truncate leading-tight">
              {location.name}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider ml-5 mt-0.5">
            {location.number}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {location.externalCode && (
            <QrCodeDialog
              item={{
                type: location.locationType as 'leito' | 'area',
                displayName: `${location.name} - ${location.number}`,
                code: location.locationType === 'area' ? location.externalCode : location.number,
                shortCode: location.locationType === 'area' ? location.number : location.externalCode,
              }}
            >
              <button className="text-gray-300 hover:text-[#0F4C5C] transition-colors">
                <QrCode className="h-3.5 w-3.5" />
              </button>
            </QrCodeDialog>
          )}
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDotColor[location.status])} />
        </div>
      </div>

      {/* In-cleaning details */}
      {location.status === 'in_cleaning' && location.currentCleaning && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-gray-50 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{location.currentCleaning.userName}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-sky-50 rounded-lg px-2 py-1">
            <Clock className="h-3 w-3 text-sky-500 flex-shrink-0" />
            <span className="text-xs font-bold text-sky-600">
              <ElapsedTime startTime={new Date(location.currentCleaning.startTime)} />
            </span>
          </div>
          <ProgressBar
            startTime={new Date(location.currentCleaning.startTime)}
            cleaningType={location.currentCleaning.type}
            cleaningTimeMinutes={cleaningTime}
          />
        </div>
      )}

      {/* Requested badge */}
      {location.status !== 'in_cleaning' && location.isRequested && (
        <div className="px-3 pb-1.5 border-t border-gray-50 pt-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-500">
            <Bell className="h-3 w-3" /> Solicitado
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 mt-auto">
        {location.status === 'in_cleaning' ? (
          <div className="space-y-1.5">
            <NonConformityDialog
              locationId={location._id.toString()}
              locationName={`${location.name} - ${location.number}`}
            >
              <button className="w-full text-[10px] text-orange-400 hover:text-orange-500 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider transition-colors py-0.5">
                <AlertTriangle className="h-3 w-3" /> Relatar Problema
              </button>
            </NonConformityDialog>

            {userProfile === 'auditor' ? (
              <AuditChecklistDialog location={location} lastCleaning={lastCleaning}>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs font-bold bg-[#A0E9FF] hover:bg-[#7ed8f0] text-[#0F4C5C] border-none shadow-sm"
                >
                  <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Verificar
                </Button>
              </AuditChecklistDialog>
            ) : (
              onFinalizeClick && (
                <Button
                  size="sm"
                  className="w-full h-8 text-xs font-bold bg-red-500 hover:bg-red-600 text-white border-none shadow-sm"
                  onClick={() => onFinalizeClick(location._id.toString())}
                  disabled={isFinalizing}
                >
                  {isFinalizing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Finalizar Limpeza
                </Button>
              )
            )}
          </div>
        ) : (userProfile === 'admin' || userProfile === 'gestor') ? (
          location.status === 'available' ? (
            <StartCleaningDialog location={location} userProfile={userProfile} onCleaningStarted={handleDialogClose}>
              <Button
                size="sm"
                className="w-full h-8 text-xs font-bold bg-[#A0E9FF] hover:bg-[#7ed8f0] text-[#0F4C5C] border-none shadow-sm"
              >
                {location.isRequested ? 'Reforçar Solicitação' : 'Iniciar Higienização'}
              </Button>
            </StartCleaningDialog>
          ) : location.status === 'occupied' ? (
            <StartCleaningDialog location={location} userProfile={userProfile} onCleaningStarted={handleDialogClose}>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs font-bold border-[#A0E9FF] text-[#0F4C5C] hover:bg-[#A0E9FF]/20"
              >
                Limpeza Concorrente
              </Button>
            </StartCleaningDialog>
          ) : null
        ) : null}
      </div>
    </div>
  );
}

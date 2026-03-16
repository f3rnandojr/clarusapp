"use client";

import { useState, useTransition, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { startCleaning, getLastCleaningRecord } from "@/lib/actions";
import type { Location, UserProfile, CleaningRecord } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2, AlertTriangle, Info, Clock, User as UserIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NonConformityDialog } from "./non-conformity-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StartCleaningDialogProps {
  location: Location;
  userProfile?: UserProfile;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCleaningStarted?: () => void;
  children?: React.ReactNode;
}

export function StartCleaningDialog({ location, userProfile = 'usuario', open, onOpenChange, onCleaningStarted, children }: StartCleaningDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const isOccupied = location.status === 'occupied';
  const isAuditor = userProfile === 'auditor';
  
  const [cleaningType, setCleaningType] = useState<'concurrent' | 'terminal' | ''>(isOccupied ? 'concurrent' : '');
  const [lastCleaning, setLastCleaning] = useState<CleaningRecord | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    if (isAuditor && open) {
        setIsLoadingContext(true);
        getLastCleaningRecord(location._id.toString()).then(record => {
            setLastCleaning(record);
            if (record) {
                setCleaningType(record.cleaningType);
            }
            setIsLoadingContext(false);
        });
    }
  }, [isAuditor, open, location._id]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!cleaningType) {
      toast({ title: "Atenção", description: "Por favor, selecione um tipo de higienização.", variant: "destructive" });
      return;
    }
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('locationId', location._id.toString());
      formData.append('type', cleaningType);

      const response = await startCleaning(null, formData);
      
      if (response.success) {
        toast({
          title: "Sucesso!",
          description: response.message,
        });
        
        if (onCleaningStarted) {
          onCleaningStarted();
        }
      } else if (response.error) {
         toast({
            title: "Erro ao Iniciar",
            description: response.error,
            variant: "destructive",
        });
      }
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  };

  useEffect(() => {
    if (!isAuditor) {
        setCleaningType(isOccupied ? 'concurrent' : '');
    }
  }, [location, isOccupied, open, isAuditor]);

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px] w-[95vw] border-slate-800 bg-slate-900 text-white">
      <DialogHeader>
        <DialogTitle className="text-xl font-black tracking-tight text-white">
            {isAuditor ? 'Confirmar Auditoria' : 'Iniciar Higienização'}
        </DialogTitle>
        <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
          Local: {location.name} - {location.number}
        </DialogDescription>
      </DialogHeader>
      
      {isLoadingContext ? (
          <div className="py-10 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Buscando histórico...</p>
          </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        
        {isAuditor ? (
            <div className="space-y-4">
                <Alert className="bg-sky-500/5 border-sky-500/20 rounded-2xl">
                    <Info className="h-4 w-4 text-sky-400" />
                    <AlertTitle className="text-sky-400 font-black uppercase text-[10px] tracking-widest mb-2">Contexto da Auditoria</AlertTitle>
                    <AlertDescription className="text-sm text-slate-300">
                        {lastCleaning ? (
                            <div className="space-y-2">
                                <p className="font-medium">Validando limpeza <span className="text-white font-bold">{lastCleaning.cleaningType === 'terminal' ? 'Terminal' : 'Concorrente'}</span></p>
                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {lastCleaning.userName}</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(lastCleaning.finishTime), 'HH:mm', { locale: ptBR })}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="italic text-slate-500 text-xs">Nenhum registro de limpeza concluído recentemente para este local.</p>
                        )}
                    </AlertDescription>
                </Alert>
                <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">Clique abaixo para iniciar o checkout</p>
            </div>
        ) : (
            <>
                {!isOccupied ? (
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tipo de Higienização</Label>
                    <RadioGroup name="type" value={cleaningType} onValueChange={(value) => setCleaningType(value as any)} required className="grid grid-cols-1 gap-2">
                    <div className={cn(
                        "flex items-center space-x-3 border p-4 rounded-2xl cursor-pointer transition-all duration-300",
                        cleaningType === 'concurrent' ? "bg-sky-500/10 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.1)]" : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    )}>
                        <RadioGroupItem value="concurrent" id="concurrent" disabled={isPending} className="border-sky-500 text-sky-500" />
                        <Label htmlFor="concurrent" className="flex-1 cursor-pointer font-bold text-sm">Higienização Concorrente</Label>
                    </div>
                    <div className={cn(
                        "flex items-center space-x-3 border p-4 rounded-2xl cursor-pointer transition-all duration-300",
                        cleaningType === 'terminal' ? "bg-sky-500/10 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.1)]" : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    )}>
                        <RadioGroupItem value="terminal" id="terminal" disabled={isPending} className="border-sky-500 text-sky-500" />
                        <Label htmlFor="terminal" className="flex-1 cursor-pointer font-bold text-sm">Higienização Terminal</Label>
                    </div>
                    </RadioGroup>
                </div>
                ) : (
                <Alert className="bg-orange-500/5 border-orange-500/20 rounded-2xl">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    <AlertTitle className="text-orange-400 font-black uppercase text-[10px] tracking-widest mb-1">Local Ocupado</AlertTitle>
                    <AlertDescription className="text-xs text-slate-300">
                    Apenas a limpeza <span className="text-white font-bold">concorrente</span> pode ser realizada agora.
                    </AlertDescription>
                </Alert>
                )}
            </>
        )}

        <div className="border-t border-slate-800 pt-6 mt-2">
            <NonConformityDialog locationId={location._id.toString()} locationName={`${location.name} - ${location.number}`}>
                <Button type="button" variant="ghost" className="w-full text-orange-400/80 hover:text-orange-400 hover:bg-orange-500/5 h-11 font-black uppercase text-[10px] tracking-widest" disabled={isPending}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Relatar Problema (NC)
                </Button>
            </NonConformityDialog>
        </div>
        
        <DialogFooter className="flex flex-col gap-2">
          <Button 
            type="submit" 
            className="w-full h-14 bg-sky-500 hover:bg-sky-400 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-95" 
            disabled={isPending || !cleaningType}
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            {isAuditor ? 'Iniciar Auditoria / Checkout' : 'Confirmar e Iniciar'}
          </Button>
          <Button type="button" variant="ghost" className="w-full text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-widest" onClick={() => handleOpenChange(false)} disabled={isPending}>Cancelar</Button>
        </DialogFooter>
      </form>
      )}
    </DialogContent>
  );

  if (children) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
    </Dialog>
  );
}

// Helper para classes condicionais
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}


"use client";

import { useState, useTransition, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { startCleaning, getLastCleaningRecord } from "@/lib/actions";
import type { Location, UserProfile, CleaningRecord } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle, Info, Clock, User as UserIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NonConformityDialog } from "./non-conformity-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  
  const isOccupied  = location.status === 'occupied';
  const isAvailable = location.status === 'available';
  const isAuditor   = userProfile === 'auditor';
  const isManager   = userProfile === 'admin' || userProfile === 'gestor';

  const isUsuarioOccupied = userProfile === 'usuario' && isOccupied;
  const [cleaningType, setCleaningType] = useState<'concurrent' | 'terminal' | ''>(
    isUsuarioOccupied ? '' : isOccupied ? 'concurrent' : 'terminal'
  );
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
        
        // Gatilho de reatividade: fecha o modal e atualiza a lista
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
      if (userProfile === 'usuario' && isOccupied) {
        setCleaningType('');
      } else {
        setCleaningType(isOccupied ? 'concurrent' : 'terminal');
      }
    }
  }, [location, isOccupied, open, isAuditor, userProfile]);

  const buttonLabel = isPending 
    ? (isManager ? 'Solicitando...' : 'Iniciando...')
    : (isAuditor ? 'Iniciar Auditoria / Checkout' : (isManager ? 'Solicitar Higienização' : 'Confirmar e Iniciar'));

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px] w-[95vw] border-slate-800 bg-slate-900 text-white">
      <DialogHeader>
        <DialogTitle className="text-xl font-black tracking-tight text-white">
            {isAuditor ? 'Confirmar Auditoria' : 'Configurar Higienização'}
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
                {isOccupied && userProfile === 'usuario' ? (
                /* usuario + occupied: choice between concurrent and terminal */
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Higienização</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { val: 'concurrent' as const, label: 'Concorrente', sub: 'Leito ocupado', color: 'orange' },
                            { val: 'terminal'   as const, label: 'Terminal',    sub: 'Limpeza completa', color: 'sky' },
                        ].map(({ val, label, sub, color }) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setCleaningType(val)}
                                className={`rounded-2xl border-2 p-3 text-left transition-all active:scale-95 ${
                                    cleaningType === val
                                        ? color === 'orange'
                                            ? 'border-orange-400 bg-orange-500/10'
                                            : 'border-sky-400 bg-sky-500/10'
                                        : 'border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <p className={`font-black text-sm ${cleaningType === val ? (color === 'orange' ? 'text-orange-300' : 'text-sky-300') : 'text-white'}`}>{label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
                            </button>
                        ))}
                    </div>
                </div>
                ) : isOccupied ? (
                <Alert className="bg-orange-500/5 border-orange-500/20 rounded-2xl">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    <AlertTitle className="text-orange-400 font-black uppercase text-[10px] tracking-widest mb-1">Local Ocupado</AlertTitle>
                    <AlertDescription className="text-xs text-slate-300">
                    Apenas a limpeza <span className="text-white font-bold">concorrente</span> pode ser realizada agora.
                    </AlertDescription>
                </Alert>
                ) : (
                <Alert className="bg-sky-500/5 border-sky-500/20 rounded-2xl">
                    <Sparkles className="h-4 w-4 text-sky-400" />
                    <AlertTitle className="text-sky-400 font-black uppercase text-[10px] tracking-widest mb-1">Leito Disponível</AlertTitle>
                    <AlertDescription className="text-xs text-slate-300">
                    Apenas a higienização <span className="text-white font-bold">terminal</span> está disponível para leitos livres.
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
            className="w-full h-14 bg-sky-500 hover:bg-sky-400 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50" 
            disabled={isPending || !cleaningType}
          >
            {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {!isPending && (isAuditor ? <UserIcon className="mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />)}
            {buttonLabel}
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

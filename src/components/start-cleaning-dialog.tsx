
"use client";

import { useState, useTransition, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { startCleaning } from "@/lib/actions";
import type { Location } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NonConformityDialog } from "./non-conformity-dialog";

interface StartCleaningDialogProps {
  location: Location;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCleaningStarted?: () => void;
  children?: React.ReactNode;
}

export function StartCleaningDialog({ location, open, onOpenChange, onCleaningStarted, children }: StartCleaningDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const isOccupied = location.status === 'occupied';
  const [cleaningType, setCleaningType] = useState<'concurrent' | 'terminal' | ''>(isOccupied ? 'concurrent' : '');

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
    setCleaningType(isOccupied ? 'concurrent' : '');
  }, [location, isOccupied, open]);

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px] w-[95vw]">
      <DialogHeader>
        <DialogTitle>Iniciar Higienização</DialogTitle>
        <DialogDescription>
          Local: {location.name} - {location.number}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {!isOccupied ? (
          <div className="space-y-2">
            <Label>Tipo de Higienização</Label>
            <RadioGroup name="type" value={cleaningType} onValueChange={(value) => setCleaningType(value as any)} required className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="concurrent" id="concurrent" disabled={isPending} />
                <Label htmlFor="concurrent" className="flex-1 cursor-pointer">Concorrente</Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="terminal" id="terminal" disabled={isPending} />
                <Label htmlFor="terminal" className="flex-1 cursor-pointer">Terminal</Label>
              </div>
            </RadioGroup>
          </div>
        ) : (
           <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-bold">Local Ocupado</AlertTitle>
            <AlertDescription className="text-xs">
              Apenas a limpeza <strong>concorrente</strong> pode ser realizada agora.
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground pt-2 italic">
          A higienização será iniciada imediatamente após a confirmação.
        </p>

        <div className="border-t pt-4 mt-2">
            <NonConformityDialog locationId={location._id.toString()} locationName={`${location.name} - ${location.number}`}>
                <Button type="button" variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-11" disabled={isPending}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Relatar Problema (NC)
                </Button>
            </NonConformityDialog>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)} disabled={isPending}>Cancelar</Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isPending || !cleaningType}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Confirmar e Iniciar
          </Button>
        </DialogFooter>
      </form>
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

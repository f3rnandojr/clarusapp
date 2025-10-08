"use client";

import { useState, useTransition, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { startCleaning } from "@/lib/actions";
import type { Location } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StartCleaningDialogProps {
  location: Location;
  isOccupied?: boolean;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCleaningStarted?: () => void;
}

export function StartCleaningDialog({ location, isOccupied = false, children, open, onOpenChange, onCleaningStarted }: StartCleaningDialogProps) {
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [cleaningType, setCleaningType] = useState<'concurrent' | 'terminal' | ''>(isOccupied ? 'concurrent' : '');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!cleaningType) {
      setResult({ error: "Por favor, selecione um tipo de higienização." });
      return;
    }
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('locationId', location._id.toString());
      formData.append('type', cleaningType);

      const response = await startCleaning(null, formData);
      
      setResult(response);

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
    if (!isOpen) {
      setResult(null);
      setCleaningType(isOccupied ? 'concurrent' : '');
    }
  };

  useEffect(() => {
    setCleaningType(isOccupied ? 'concurrent' : '');
    setResult(null);
  }, [location, isOccupied, open]);


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Iniciar Higienização</DialogTitle>
          <DialogDescription>
            Local: {location.name} - {location.number}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isOccupied && (
            <div className="space-y-2">
              <Label>Tipo de Higienização</Label>
              <RadioGroup name="type" value={cleaningType} onValueChange={(value) => setCleaningType(value as any)} required>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="concurrent" id="concurrent" disabled={isPending} />
                  <Label htmlFor="concurrent">Concorrente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="terminal" id="terminal" disabled={isPending} />
                  <Label htmlFor="terminal">Terminal</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {isOccupied && (
             <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Limpeza em Local Ocupado</AlertTitle>
              <AlertDescription>
                Apenas a limpeza <strong>concorrente</strong> pode ser realizada em locais ocupados.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground pt-2">
            Você será registrado como o responsável por esta higienização.
          </p>

          {result?.error && (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                {result.error}
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending || !cleaningType}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Confirmar Início
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

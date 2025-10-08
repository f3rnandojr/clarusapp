"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { startCleaning } from "@/lib/actions";
import type { Location } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2 } from "lucide-react";

interface StartCleaningDialogProps {
  location: Location;
  isOccupied?: boolean;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}


export function StartCleaningDialog({ location, isOccupied = false, children, open, onOpenChange }: StartCleaningDialogProps) {
  const [state, setState] = useState<{success?: boolean, message?: string, error?: string | null} | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Sucesso!",
        description: state.message,
      });
      closeButtonRef.current?.click();
      formRef.current?.reset();
    }
    if (state?.error) {
      toast({
        title: "Erro",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, toast]);
  
  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await startCleaning(null, formData);
      setState(result);
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Iniciar Higienização</DialogTitle>
          <DialogDescription>
            Local: {location.name} - {location.number}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleAction} className="space-y-4">
          <input type="hidden" name="locationId" value={location._id.toString()} />
          
          {!isOccupied && (
            <div className="space-y-2">
              <Label>Tipo de Higienização</Label>
              <RadioGroup name="type" defaultValue="concurrent" required>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="concurrent" id="concurrent" />
                  <Label htmlFor="concurrent">Concorrente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="terminal" id="terminal" />
                  <Label htmlFor="terminal">Terminal</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {isOccupied && <input type="hidden" name="type" value="concurrent" />}

          <p className="text-sm text-muted-foreground pt-2">
            Você será registrado como o responsável por esta higienização.
          </p>
          
          <DialogFooter>
            <DialogClose asChild>
                <Button ref={closeButtonRef} type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Confirmar Início
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

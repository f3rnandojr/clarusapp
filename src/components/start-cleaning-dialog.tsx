"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { startCleaning } from "@/lib/actions";
import type { Asg, Location } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { ObjectId } from "mongodb";

interface StartCleaningDialogProps {
  location: Location;
  availableAsgs: Asg[];
  isOccupied?: boolean;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Confirmar Início
    </Button>
  );
}

export function StartCleaningDialog({ location, availableAsgs, isOccupied = false, children, open, onOpenChange }: StartCleaningDialogProps) {
  const [state, formAction] = useActionState(startCleaning, null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  // Use a ref for the close button if you need to imperatively click it.
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Sucesso!",
        description: state.success,
      });
      // Close dialog via state change passed to onOpenChange
      onOpenChange?.(false);
      formRef.current?.reset();
    }
    if (state?.error) {
      toast({
        title: "Erro",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, toast, onOpenChange]);

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
        <form ref={formRef} action={formAction} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="asgId">Colaborador (ASG)</Label>
             <Select name="asgId" required>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                    {availableAsgs.length > 0 ? (
                        availableAsgs.map(asg => (
                            <SelectItem key={asg._id.toString()} value={asg._id.toString()}>{asg.name} - {asg.code}</SelectItem>
                        ))
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">Nenhum colaborador disponível.</div>
                    )}
                </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
                <Button ref={closeButtonRef} type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

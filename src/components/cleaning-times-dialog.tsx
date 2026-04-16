"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateCleaningSettings } from "@/lib/actions";
import type { CleaningSettings } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface CleaningTimesDialogProps {
  settings: CleaningSettings;
  children: React.ReactNode;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Salvar
    </Button>
  );
}

export function CleaningTimesDialog({ settings, children }: CleaningTimesDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateCleaningSettings, null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Sucesso!",
        description: state.success,
      });
      closeButtonRef.current?.click();
    }
  }, [state, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⌛ Tempos de Limpeza</DialogTitle>
          <DialogDescription>
            Defina os tempos padrões em minutos para cada tipo de higienização.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concurrent">Limpeza Concorrente (minutos)</Label>
            <Input
              id="concurrent"
              name="concurrent"
              type="number"
              defaultValue={settings.concurrent}
              required
              min="1"
            />
            {state?.fieldErrors?.concurrent && <p className="text-sm text-destructive">{state.fieldErrors.concurrent}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminal">Limpeza Terminal (minutos)</Label>
            <Input
              id="terminal"
              name="terminal"
              type="number"
              defaultValue={settings.terminal}
              required
              min="1"
            />
             {state?.fieldErrors?.terminal && <p className="text-sm text-destructive">{state.fieldErrors.terminal}</p>}
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

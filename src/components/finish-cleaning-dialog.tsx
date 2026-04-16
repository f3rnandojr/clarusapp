"use client";

import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { finishCleaning } from "@/lib/actions";
import type { Location } from "@/lib/schemas";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FinishCleaningDialogProps {
  location: Location;
  children: React.ReactNode;
}

export function FinishCleaningDialog({ location, children }: FinishCleaningDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFinish = () => {
    startTransition(async () => {
      const result = await finishCleaning(location._id.toString());
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.success,
        });
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar Higienização?</AlertDialogTitle>
          <AlertDialogDescription>
            Você confirma a finalização da higienização do local{" "}
            <strong>{location.name} - {location.number}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={handleFinish} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Finalização
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

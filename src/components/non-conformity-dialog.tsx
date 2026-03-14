"use client";

import { useState, useTransition, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { createNonConformity } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import Image from "next/image";

interface NonConformityDialogProps {
  locationId: string;
  locationName: string;
  children: React.ReactNode;
}

export function NonConformityDialog({ locationId, locationName, children }: NonConformityDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast({ title: "Atenção", description: "Por favor, descreva a não conformidade.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("locationId", locationId);
      formData.append("locationName", locationName);
      formData.append("description", description);
      if (photoDataUri) {
        formData.append("photoDataUri", photoDataUri);
      }

      const result = await createNonConformity(formData);

      if (result.success) {
        toast({ title: "Sucesso!", description: result.message });
        setOpen(false);
        resetForm();
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    });
  };

  const resetForm = () => {
    setDescription("");
    setPhotoDataUri(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Registrar Não Conformidade
          </DialogTitle>
          <DialogDescription>
            Relate problemas encontrados em: <strong>{locationName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Problema</Label>
            <Textarea
              id="description"
              placeholder="Descreva brevemente o problema encontrado (ex: vazamento, lâmpada queimada, sujeira excessiva...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto (Opcional)</Label>
            <div className="flex flex-col items-center gap-3">
              {photoDataUri ? (
                <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                  <Image src={photoDataUri} alt="Captura de não conformidade" fill className="object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => setPhotoDataUri(null)}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Camera className="h-8 w-8" />
                    <span>Tirar Foto / Anexar</span>
                  </div>
                </Button>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handlePhotoCapture}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
              Enviar Relato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Area } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createArea, updateArea } from "@/lib/actions";

interface AreaFormProps {
  area?: Area | null;
  onFinished: () => void;
}

function slugify(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AreaForm({ area, onFinished }: AreaFormProps) {
  const isEditing = !!area;
  const { toast } = useToast();

  const [setor, setSetor] = useState(area?.setor || '');
  const [locationId, setLocationId] = useState(area?.locationId || '');

  const [result, setResult] = useState<{
    error?: string | null;
    fieldErrors?: Record<string, string[] | undefined>;
    success?: boolean;
    message?: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSetorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSetor(value);
    if (!isEditing) {
      setLocationId(slugify(value));
    }
  };

  const handleLocationIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const action = isEditing
        ? () => updateArea(area!._id.toString(), null, formData)
        : () => createArea(null, formData);

      const response = await action();
      setResult(response);

      if (response.success) {
        toast({ title: "Sucesso!", description: response.message });
        onFinished();
      } else if (response.error) {
        toast({
          title: "Erro",
          description: response.error,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor="setor">Setor / Nome da Área</Label>
        <Input
          id="setor"
          name="setor"
          value={setor}
          onChange={handleSetorChange}
          required
          placeholder="Ex: CENTRO CIRÚRGICO, UTI, PRONTO SOCORRO"
        />
        {result?.fieldErrors?.setor && (
          <p className="text-sm text-destructive">{result.fieldErrors.setor[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="locationId">ID da Localização (QR Code)</Label>
        <Input
          id="locationId"
          name="locationId"
          value={locationId}
          onChange={handleLocationIdChange}
          required
          readOnly={isEditing}
          disabled={isEditing}
          placeholder="Ex: SALA-01, CONSULTORIO-A, UTI-LEITO-10"
        />
        {result?.fieldErrors?.locationId && (
          <p className="text-sm text-destructive">{result.fieldErrors.locationId[0]}</p>
        )}
        {!isEditing && (
          <p className="text-xs text-muted-foreground">
            Gerado automaticamente a partir do nome. Deve conter apenas letras maiúsculas, números e hífens.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (Opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={area?.description}
          placeholder="Qualquer informação adicional sobre a área"
        />
        {result?.fieldErrors?.description && (
          <p className="text-sm text-destructive">{result.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="ghost" onClick={onFinished}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Salvar Alterações' : 'Adicionar Área'}
        </Button>
      </div>
    </form>
  );
}

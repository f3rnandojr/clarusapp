
"use client";

import { useState, useTransition, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { LocationMapping } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createLocationMapping, updateLocationMapping } from "@/lib/actions";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface LocationMappingFormProps {
  mapping?: LocationMapping | null;
  onFinished: () => void;
}

export function LocationMappingForm({ mapping, onFinished }: LocationMappingFormProps) {
  const isEditing = !!mapping;
  const { toast } = useToast();
  
  const [result, setResult] = useState<{
    error?: string | null;
    fieldErrors?: Record<string, string[] | undefined>;
    success?: boolean;
    message?: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const action = isEditing 
        ? () => updateLocationMapping(mapping!._id.toString(), formData)
        : () => createLocationMapping(formData);
        
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
  
  // Limpa o resultado quando o formulário é remontado para um novo item
  useEffect(() => {
    setResult(null);
  }, [mapping]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="externalCode">Código Externo (Sistema Legado)</Label>
          <Input 
            id="externalCode" 
            name="externalCode" 
            defaultValue={mapping?.externalCode} 
            required 
            placeholder="Ex: LT-18C, CTI-05"
            readOnly={isEditing}
            disabled={isEditing}
          />
          {result?.fieldErrors?.externalCode && (
            <p className="text-sm text-destructive">{result.fieldErrors.externalCode[0]}</p>
          )}
          {isEditing && <p className="text-xs text-muted-foreground">O código externo não pode ser alterado.</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="setor">Setor</Label>
          <Input 
            id="setor"
            name="setor" 
            defaultValue={mapping?.setor} 
            required 
            placeholder="Ex: Cardiologia, UTI, Pediatria"
          />
          {result?.fieldErrors?.setor && (
            <p className="text-sm text-destructive">{result.fieldErrors.setor[0]}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="internalName">Nome Interno (Amigável)</Label>
          <Input 
            id="internalName" 
            name="internalName" 
            defaultValue={mapping?.internalName} 
            required 
            placeholder="Ex: Leito Cardiológico, UTI Pediátrica"
          />
          {result?.fieldErrors?.internalName && (
            <p className="text-sm text-destructive">{result.fieldErrors.internalName[0]}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="internalNumber">Número Interno (Amigável)</Label>
          <Input 
            id="internalNumber"
            name="internalNumber" 
            defaultValue={mapping?.internalNumber} 
            required 
            placeholder="Ex: 18C, 05, L2-01"
          />
          {result?.fieldErrors?.internalNumber && (
            <p className="text-sm text-destructive">{result.fieldErrors.internalNumber[0]}</p>
          )}
        </div>
      </div>

       <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup name="type" defaultValue={mapping?.type || 'leito'} required className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="leito" id="leito" disabled={isPending} />
                <Label htmlFor="leito">Leito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="area" id="area" disabled={isPending} />
                <Label htmlFor="area">Área</Label>
              </div>
            </RadioGroup>
             {result?.fieldErrors?.type && (
                <p className="text-sm text-destructive">{result.fieldErrors.type[0]}</p>
            )}
        </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (Opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={mapping?.description}
          placeholder="Qualquer informação adicional sobre o local"
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
          {isEditing ? 'Salvar Alterações' : 'Adicionar Mapeamento'}
        </Button>
      </div>
    </form>
  );
}

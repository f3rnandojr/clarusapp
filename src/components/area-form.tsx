"use client";

import { useActionState, useFormStatus } from "react-dom";
import { useRef, useEffect } from "react";
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

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditing ? 'Salvar Alterações' : 'Adicionar Área'}
    </Button>
  );
}

export function AreaForm({ area, onFinished }: AreaFormProps) {
  const isEditing = !!area;
  const { toast } = useToast();
  
  const action = isEditing 
    ? (prevState: any, formData: FormData) => updateArea(area!._id.toString(), prevState, formData)
    : createArea;
    
  const [state, formAction] = useActionState(action, { error: null, fieldErrors: {}, success: false, message: '' });

  useEffect(() => {
    if (state.success) {
      toast({ title: "Sucesso!", description: state.message });
      onFinished();
    } else if (state.error) {
      toast({ 
        title: "Erro", 
        description: state.error, 
        variant: "destructive" 
      });
    }
  }, [state, toast, onFinished]);

  return (
    <form action={formAction} className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor="setor">Setor</Label>
        <Input 
          id="setor" 
          name="setor" 
          defaultValue={area?.setor} 
          required 
          placeholder="Ex: Centro Cirúrgico, UTI, Pronto Socorro"
        />
        {state.fieldErrors?.setor && (
          <p className="text-sm text-destructive">{state.fieldErrors.setor[0]}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="locationId">ID da Localização</Label>
        <Input 
          id="locationId" 
          name="locationId" 
          defaultValue={area?.locationId} 
          required 
          readOnly={isEditing}
          disabled={isEditing}
          placeholder="Ex: sala-01, consultorio-a, uti-leito-10"
        />
        {state.fieldErrors?.locationId && (
          <p className="text-sm text-destructive">{state.fieldErrors.locationId[0]}</p>
        )}
        {!isEditing && (
            <p className="text-xs text-muted-foreground">Deve ser único, sem espaços, em minúsculas. Será usado para o QR Code.</p>
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
         {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">{state.fieldErrors.description[0]}</p>
        )}
      </div>
      
      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="ghost" onClick={onFinished}>
          Cancelar
        </Button>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}

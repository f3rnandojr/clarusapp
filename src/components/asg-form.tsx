"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Asg } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { createAsg, updateAsg } from "@/lib/actions"; // ✅ Use Server Actions

interface AsgFormProps {
  asg?: Asg | null;
  onFinished: () => void;
  nextAsgCode?: string;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditing ? 'Salvar Alterações' : 'Adicionar Colaborador'}
    </Button>
  );
}

export function AsgForm({ asg, onFinished, nextAsgCode }: AsgFormProps) {
  const isEditing = !!asg;
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [createState, createAction] = useFormState(
    createAsg, 
    { error: null, fieldErrors: {}, success: false, message: '' }
  );
  
  const [updateState, updateAction] = useFormState(
    (prevState: any, formData: FormData) => updateAsg(asg!._id.toString(), prevState, formData),
    { error: null, fieldErrors: {}, success: false, message: '' }
  );

  const state = isEditing ? updateState : createState;
  const action = isEditing ? updateAction : createAction;

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
    <form 
      ref={formRef} 
      action={action}
      className="space-y-4 p-1"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
        <Input 
          id="name" 
          name="name" 
          defaultValue={asg?.name} 
          required 
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="code">Código</Label>
        <Input 
          id="code" 
          name="code" 
          value={isEditing ? asg?.code : nextAsgCode} 
          readOnly 
          disabled 
        />
        {!isEditing && (
          <p className="text-xs text-muted-foreground">O código é gerado automaticamente.</p>
        )}
      </div>
      
      {isEditing && (
        <div className="flex items-center space-x-2">
          <Switch id="active" name="active" defaultChecked={asg?.active} />
          <Label htmlFor="active">Colaborador Ativo</Label>
        </div>
      )}
      
      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="ghost" onClick={onFinished}>
          Cancelar
        </Button>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}

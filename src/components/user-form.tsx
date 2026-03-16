"use client";

import { useActionState } from "react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createUser, updateUser } from "@/lib/actions";
import type { User, UserProfile } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface UserFormProps {
  user?: User | null;
  onFinished: () => void;
}

const profileOptions: { value: UserProfile; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'usuario', label: 'Usuário' },
    { value: 'auditor', label: 'Auditor' },
];

export function UserForm({ user, onFinished }: UserFormProps) {
  const isEditing = !!user;
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [createState, createAction] = useActionState(
    createUser, 
    { error: null, fieldErrors: {}, success: false, message: '' }
  );
  
  const [updateState, updateAction] = useActionState(
    (prevState: any, formData: FormData) => updateUser(user!._id.toString(), prevState, formData),
    { error: null, fieldErrors: {}, success: false, message: '' }
  );

  const state = isEditing ? updateState : createState;
  const action = isEditing ? updateAction : createAction;

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Sucesso!", description: state.message });
      onFinished();
      router.refresh();
      setIsSubmitting(false);
    } else if (state?.error) {
      toast({ 
        title: "Erro", 
        description: state.error, 
        variant: "destructive" 
      });
      setIsSubmitting(false);
    }
  }, [state, toast, onFinished, router]);

  const handleSubmit = (formData: FormData) => {
    setIsSubmitting(true);
    action(formData);
  };

  const passwordPlaceholder = isEditing ? "Deixe em branco para não alterar" : "Senha";

  return (
    <form 
      action={handleSubmit}
      className="space-y-4 p-1"
    >
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white/70">Nome Completo</Label>
        <Input id="name" name="name" defaultValue={user?.name} required className="bg-slate-900 border-slate-800" />
        {state?.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="login" className="text-white/70">Login</Label>
                <Input 
                id="login" 
                name="login" 
                defaultValue={user?.login} 
                required 
                readOnly={isEditing || user?.login === 'admin'} 
                disabled={user?.login === 'admin'} 
                className="bg-slate-900 border-slate-800"
                />
                {state?.fieldErrors?.login && <p className="text-sm text-destructive">{state.fieldErrors.login[0]}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="perfil" className="text-white/70">Perfil</Label>
                <Select name="perfil" defaultValue={user?.perfil || 'usuario'} disabled={user?.login === 'admin'}>
                    <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                        {profileOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                 {state?.fieldErrors?.perfil && <p className="text-sm text-destructive">{state.fieldErrors.perfil[0]}</p>}
            </div>
       </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-white/70">Senha</Label>
        <Input 
          id="password" 
          name="password" 
          type="password" 
          placeholder={passwordPlaceholder} 
          required={!isEditing} 
          className="bg-slate-900 border-slate-800"
        />
        {state?.fieldErrors?.password && <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>}
      </div>
      
      {isEditing && (
        <div className="flex items-center space-x-2">
          <Switch id="active" name="active" defaultChecked={user?.active} disabled={user?.login === 'admin'} />
          <Label htmlFor="active" className="text-white/70">Usuário Ativo</Label>
        </div>
      )}
      
      <div className="flex justify-end pt-4 space-x-2">
        <Button type="button" variant="ghost" onClick={onFinished} className="text-white/50 hover:text-white">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}
        </Button>
      </div>
    </form>
  );
}

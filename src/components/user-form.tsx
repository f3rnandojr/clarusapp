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
  { value: 'admin',   label: 'Administrador' },
  { value: 'gestor',  label: 'Gestor' },
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

  const state  = isEditing ? updateState  : createState;
  const action = isEditing ? updateAction : createAction;

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Sucesso!", description: state.message });
      onFinished();
      router.refresh();
      setIsSubmitting(false);
    } else if (state?.error) {
      toast({ title: "Erro", description: state.error, variant: "destructive" });
      setIsSubmitting(false);
    }
  }, [state, toast, onFinished, router]);

  const handleSubmit = (formData: FormData) => {
    setIsSubmitting(true);
    action(formData);
  };

  const inputCls = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-300 focus-visible:ring-[#A0E9FF]/50 focus-visible:border-[#A0E9FF] h-10 rounded-lg";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-gray-400";

  return (
    <form action={handleSubmit} className="space-y-4 p-1">

      <div className="space-y-1.5">
        <Label htmlFor="name" className={labelCls}>Nome Completo</Label>
        <Input id="name" name="name" defaultValue={user?.name} required className={inputCls} />
        {state?.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="login" className={labelCls}>Login</Label>
          <Input
            id="login"
            name="login"
            defaultValue={user?.login}
            required
            readOnly={isEditing || user?.login === 'admin'}
            disabled={user?.login === 'admin'}
            className={inputCls}
          />
          {state?.fieldErrors?.login && <p className="text-xs text-destructive">{state.fieldErrors.login[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perfil" className={labelCls}>Perfil</Label>
          <Select name="perfil" defaultValue={user?.perfil || 'usuario'} disabled={user?.login === 'admin'}>
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {profileOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {state?.fieldErrors?.perfil && <p className="text-xs text-destructive">{state.fieldErrors.perfil[0]}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className={labelCls}>Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={isEditing ? "Deixe em branco para não alterar" : "Senha"}
          required={!isEditing}
          className={inputCls}
        />
        {state?.fieldErrors?.password && <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>}
      </div>

      {isEditing && (
        <div className="flex items-center gap-3 py-1">
          <Switch id="active" name="active" defaultChecked={user?.active} disabled={user?.login === 'admin'} />
          <Label htmlFor="active" className="text-sm text-gray-600 cursor-pointer">Usuário Ativo</Label>
        </div>
      )}

      <div className="flex justify-end pt-2 gap-2">
        <Button type="button" variant="ghost" onClick={onFinished} className="text-gray-400 hover:text-gray-600 font-bold uppercase text-[10px] tracking-widest">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#0F4C5C] hover:bg-[#0a3844] text-white font-black uppercase tracking-widest text-xs h-10 px-6 rounded-xl"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}
        </Button>
      </div>
    </form>
  );
}

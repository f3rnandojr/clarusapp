"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "./user-form";
import { useToast } from "@/hooks/use-toast";
import { toggleUserActive, getUsers } from "@/lib/actions";
import { Loader2, Pencil, UserPlus, List } from "lucide-react";

interface UserManagementDialogProps {
  allUsers: User[];
  children: React.ReactNode;
}

const profileLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    usuario: 'Usuário',
    auditor: 'Auditor',
};

export function UserManagementDialog({ allUsers: initialUsers, children }: UserManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setActiveTab("edit");
  };

  const handleTabChange = (value: string) => {
    if (value !== 'edit') {
      setSelectedUser(null);
    }
    setActiveTab(value);
  }

  const handleFormFinished = () => {
    setSelectedUser(null);
    setActiveTab('list');
    
    const refreshData = async () => {
      try {
        const refreshedUsers = await getUsers();
        setUsers(refreshedUsers);
      } catch (error) {
        console.error('Erro ao atualizar lista de usuários:', error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar a lista de usuários.', variant: 'destructive'});
      }
    };
    refreshData();
  };

  const handleToggleActive = (id: string, currentActiveState: boolean) => {
    startTransition(async () => {
      const result = await toggleUserActive(id, !currentActiveState);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.success });
        const refreshedUsers = await getUsers();
        setUsers(refreshedUsers);
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    });
  };
  
  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedUser(null);
      setActiveTab('list');
      setUsers(initialUsers); // Reseta a lista ao fechar
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-sky-400 uppercase tracking-tighter">Gerenciamento de Usuários</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-950 border border-slate-800 p-1">
            <TabsTrigger value="list" className="data-[state=active]:bg-sky-500 data-[state=active]:text-slate-900 font-bold uppercase text-[10px] tracking-widest"><List className="mr-2 h-4 w-4" />Listar</TabsTrigger>
            <TabsTrigger value="add" className="data-[state=active]:bg-sky-500 data-[state=active]:text-slate-900 font-bold uppercase text-[10px] tracking-widest"><UserPlus className="mr-2 h-4 w-4" />Adicionar Novo</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedUser} className="data-[state=active]:bg-sky-500 data-[state=active]:text-slate-900 font-bold uppercase text-[10px] tracking-widest"><Pencil className="mr-2 h-4 w-4" />Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto pr-2 scroll-container">
              <Table>
                <TableHeader className="bg-slate-950 sticky top-0 z-10">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nome</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Login</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Perfil</TableHead>
                    <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right text-slate-400 font-black uppercase text-[10px] tracking-widest">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id.toString()} className="border-slate-800/50 hover:bg-slate-800/20">
                      <TableCell className="font-bold text-white text-sm">{user.name}</TableCell>
                      <TableCell className="text-slate-400 text-sm font-mono">{user.login}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-widest h-5">
                            {profileLabels[user.perfil] || 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Badge variant={user.active ? 'default' : 'outline'} className={user.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'border-slate-700 text-slate-500'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => handleEditClick(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={user.active ? 'destructive' : 'default'}
                          size="sm"
                          className={user.active ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white" : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"}
                          onClick={() => handleToggleActive(user._id.toString(), user.active)}
                          disabled={isPending || user.login === 'admin'}
                        >
                           {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : (user.active ? 'Desativar' : 'Ativar')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="add" className="mt-4">
            <UserForm onFinished={handleFormFinished} />
          </TabsContent>
          <TabsContent value="edit" className="mt-4">
             {selectedUser && <UserForm user={selectedUser} onFinished={handleFormFinished} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

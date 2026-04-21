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
  admin:        'Administrador',
  gestor:       'Gestor',
  usuario:      'Usuário',
  auditor:      'Auditor',
  visualizador: 'Visualizador',
};

const profileColors: Record<string, string> = {
  admin:        'border-[#0F4C5C]/30 text-[#0F4C5C] bg-[#A0E9FF]/20',
  gestor:       'border-violet-300 text-violet-700 bg-violet-50',
  usuario:      'border-emerald-300 text-emerald-700 bg-emerald-50',
  auditor:      'border-amber-300 text-amber-700 bg-amber-50',
  visualizador: 'border-gray-300 text-gray-600 bg-gray-50',
};

export function UserManagementDialog({ allUsers: initialUsers, children }: UserManagementDialogProps) {
  const [open, setOpen]             = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab]   = useState("list");
  const { toast }                   = useToast();
  const [isPending, startTransition]= useTransition();
  const router                      = useRouter();
  const [users, setUsers]           = useState(initialUsers);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setActiveTab("edit");
  };

  const handleTabChange = (value: string) => {
    if (value !== 'edit') setSelectedUser(null);
    setActiveTab(value);
  };

  const handleFormFinished = () => {
    setSelectedUser(null);
    setActiveTab('list');
    getUsers().then(setUsers).catch(() =>
      toast({ title: 'Erro', description: 'Não foi possível atualizar a lista.', variant: 'destructive' })
    );
  };

  const handleToggleActive = (id: string, currentActiveState: boolean) => {
    startTransition(async () => {
      const result = await toggleUserActive(id, !currentActiveState);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.success });
        const refreshed = await getUsers();
        setUsers(refreshed);
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
      setUsers(initialUsers);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl bg-white border-gray-200 text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#0F4C5C] uppercase tracking-tight">
            Gerenciamento de Usuários
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 border border-gray-200 p-1 rounded-xl">
            <TabsTrigger
              value="list"
              className="rounded-lg data-[state=active]:bg-[#A0E9FF] data-[state=active]:text-[#0F4C5C] data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest text-gray-500"
            >
              <List className="mr-2 h-4 w-4" />Listar
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="rounded-lg data-[state=active]:bg-[#A0E9FF] data-[state=active]:text-[#0F4C5C] data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest text-gray-500"
            >
              <UserPlus className="mr-2 h-4 w-4" />Adicionar Novo
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              disabled={!selectedUser}
              className="rounded-lg data-[state=active]:bg-[#A0E9FF] data-[state=active]:text-[#0F4C5C] data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest text-gray-500 disabled:opacity-40"
            >
              <Pencil className="mr-2 h-4 w-4" />Editar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto pr-1 scroll-container">

              {/* Mobile: cards verticais */}
              <div className="flex flex-col gap-3 md:hidden">
                {users.map((user) => (
                  <div key={user._id.toString()} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{user.name}</p>
                        <p className="text-gray-400 text-xs font-mono mt-0.5">{user.login}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={user.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase tracking-widest shrink-0'
                          : 'bg-gray-50 text-gray-400 border-gray-200 text-[10px] font-black uppercase tracking-widest shrink-0'
                        }
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-black uppercase tracking-widest h-5 ${profileColors[user.perfil] || profileColors.usuario}`}
                    >
                      {profileLabels[user.perfil] || 'Usuário'}
                    </Badge>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 text-[#0F4C5C] border-[#A0E9FF]/60 hover:bg-[#A0E9FF]/20 font-bold text-xs uppercase tracking-widest"
                        onClick={() => handleEditClick(user)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />Editar
                      </Button>
                      <Button
                        className={`flex-1 h-11 font-bold text-xs uppercase tracking-widest ${user.active
                          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white border-0'
                        }`}
                        onClick={() => handleToggleActive(user._id.toString(), user.active)}
                        disabled={isPending || user.login === 'admin'}
                      >
                        {isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : (user.active ? 'Desativar' : 'Ativar')
                        }
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela horizontal */}
              <Table className="hidden md:table">
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Nome</TableHead>
                    <TableHead className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Login</TableHead>
                    <TableHead className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Perfil</TableHead>
                    <TableHead className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="text-right text-gray-400 font-black uppercase text-[10px] tracking-widest">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id.toString()} className="border-gray-100 hover:bg-gray-50/60">
                      <TableCell className="font-bold text-gray-900 text-sm">{user.name}</TableCell>
                      <TableCell className="text-gray-500 text-sm font-mono">{user.login}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-black uppercase tracking-widest h-5 ${profileColors[user.perfil] || profileColors.usuario}`}
                        >
                          {profileLabels[user.perfil] || 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={user.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase tracking-widest'
                            : 'bg-gray-50 text-gray-400 border-gray-200 text-[10px] font-black uppercase tracking-widest'
                          }
                        >
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-[#0F4C5C] hover:bg-[#A0E9FF]/20"
                          onClick={() => handleEditClick(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className={user.active
                            ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                            : "bg-emerald-500 hover:bg-emerald-400 text-white border-0"
                          }
                          onClick={() => handleToggleActive(user._id.toString(), user.active)}
                          disabled={isPending || user.login === 'admin'}
                        >
                          {isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : (user.active ? 'Desativar' : 'Ativar')
                          }
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

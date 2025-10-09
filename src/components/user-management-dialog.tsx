
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gerenciamento de Usuários</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Listar</TabsTrigger>
            <TabsTrigger value="add"><UserPlus className="mr-2 h-4 w-4" />Adicionar Novo</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedUser}><Pencil className="mr-2 h-4 w-4" />Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id.toString()}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.login}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{profileLabels[user.perfil] || 'Usuário'}</Badge>
                      </TableCell>
                      <TableCell>
                         <Badge variant={user.active ? 'default' : 'outline'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={user.active ? 'destructive' : 'default'}
                          size="sm"
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

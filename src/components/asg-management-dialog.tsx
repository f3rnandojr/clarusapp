"use client";

import { useState } from "react";
import type { Asg } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AsgForm } from "./asg-form";
import { useToast } from "@/hooks/use-toast";
import { toggleAsgActive, getAsgs } from "@/lib/actions";
import { useTransition } from "react";
import { Loader2, Pencil, UserPlus, List } from "lucide-react";

interface AsgManagementDialogProps {
  allAsgs: Asg[];
  children: React.ReactNode;
  nextAsgCode: string;
}

export function AsgManagementDialog({ allAsgs, children, nextAsgCode }: AsgManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAsg, setSelectedAsg] = useState<Asg | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [asgs, setAsgs] = useState(allAsgs);

  const handleEditClick = (asg: Asg) => {
    setSelectedAsg(asg);
    setActiveTab("edit");
  };

  const handleFormFinished = () => {
    setSelectedAsg(null);
    setActiveTab('list');
    
    // Buscar dados atualizados do servidor
    const refreshData = async () => {
      try {
        const refreshedAsgs = await getAsgs();
        setAsgs(refreshedAsgs);
      } catch (error) {
        console.error('Erro ao atualizar lista:', error);
      }
    };
    refreshData();
  };

  const handleTabChange = (value: string) => {
    if (value !== 'edit') {
      setSelectedAsg(null);
    }
    setActiveTab(value);
  }

  const handleToggleActive = (id: string, currentActiveState: boolean) => {
    startTransition(async () => {
      const result = await toggleAsgActive(id, !currentActiveState);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.success });
        const refreshedAsgs = await getAsgs();
        setAsgs(refreshedAsgs);
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    });
  };
  
  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedAsg(null);
      setActiveTab('list');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciamento de Colaboradores</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Listar</TabsTrigger>
            <TabsTrigger value="add"><UserPlus className="mr-2 h-4 w-4" />Adicionar Novo</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedAsg}><Pencil className="mr-2 h-4 w-4" />Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asgs.map((asg) => (
                    <TableRow key={asg._id.toString()}>
                      <TableCell className="font-medium">{asg.name}</TableCell>
                      <TableCell>{asg.code}</TableCell>
                      <TableCell>
                        <Badge variant={asg.status === 'busy' ? 'destructive' : 'secondary'}>
                          {asg.status === 'busy' ? 'Ocupado' : 'Disponível'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Badge variant={asg.active ? 'default' : 'outline'}>
                          {asg.active ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(asg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={asg.active ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleActive(asg._id.toString(), asg.active)}
                          disabled={isPending}
                        >
                           {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : (asg.active ? 'Desativar' : 'Ativar')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="add" className="mt-4">
            <AsgForm onFinished={handleFormFinished} nextAsgCode={nextAsgCode} />
          </TabsContent>
          <TabsContent value="edit" className="mt-4">
             {selectedAsg && <AsgForm asg={selectedAsg} onFinished={handleFormFinished} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

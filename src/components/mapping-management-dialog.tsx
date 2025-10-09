
"use client";

import { useState, useTransition, useEffect } from "react";
import type { LocationMapping } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationMappingForm } from "./location-mapping-form";
import { useToast } from "@/hooks/use-toast";
import { getLocationMappings, toggleLocationMappingActive } from "@/lib/actions";
import { Loader2, Pencil, PlusCircle, List, QrCode } from "lucide-react";
import { QrCodeDialog } from "./qr-code-dialog";

interface MappingManagementDialogProps {
  children: React.ReactNode;
}

export function MappingManagementDialog({ children }: MappingManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<LocationMapping | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mappings, setMappings] = useState<LocationMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = (mapping: LocationMapping) => {
    setSelectedMapping(mapping);
    setActiveTab("edit");
  };

  const handleFormFinished = async () => {
    setSelectedMapping(null);
    setActiveTab('list');
    await refreshData();
  };

  const handleTabChange = (value: string) => {
    if (value !== 'edit') {
      setSelectedMapping(null);
    }
    setActiveTab(value);
  }
  
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const refreshedMappings = await getLocationMappings();
      setMappings(refreshedMappings);
    } catch (error) {
      console.error('Erro ao atualizar lista de mapeamentos:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os mapeamentos.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (open) {
      refreshData();
    }
  }, [open]);

  const handleToggleActive = (id: string, currentIsActive: boolean) => {
    startTransition(async () => {
      const result = await toggleLocationMappingActive(id, !currentIsActive);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.message });
        await refreshData();
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    });
  };
  
  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedMapping(null);
      setActiveTab('list');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Gerenciamento de Mapeamento de Locais</DialogTitle>
           <DialogDescription>
            Crie e gerencie o mapeamento entre códigos de sistemas externos e a nomenclatura interna, incluindo a geração de QR Codes.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Listar Mapeamentos</TabsTrigger>
            <TabsTrigger value="add"><PlusCircle className="mr-2 h-4 w-4" />Adicionar Novo</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedMapping}><Pencil className="mr-2 h-4 w-4" />Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cód. Externo</TableHead>
                    <TableHead>Nome Interno</TableHead>
                    <TableHead>Nº Interno</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping._id.toString()}>
                      <TableCell><Badge variant="secondary">{mapping.externalCode}</Badge></TableCell>
                      <TableCell className="font-medium">{mapping.internalName}</TableCell>
                      <TableCell>{mapping.internalNumber}</TableCell>
                      <TableCell>{mapping.setor}</TableCell>
                      <TableCell>{mapping.type}</TableCell>
                      <TableCell>
                         <Badge variant={mapping.isActive ? 'default' : 'outline'}>
                          {mapping.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <QrCodeDialog
                          item={{
                            type: mapping.type,
                            displayName: `${mapping.internalName} ${mapping.internalNumber}`,
                            code: mapping.locationId,
                            shortCode: mapping.shortCode
                          }}
                        >
                          <Button variant="outline" size="sm">
                            <QrCode className="mr-2 h-4 w-4" />
                            QR
                          </Button>
                        </QrCodeDialog>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(mapping)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={mapping.isActive ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleActive(mapping._id.toString(), mapping.isActive)}
                          disabled={isPending}
                        >
                           {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : (mapping.isActive ? 'Desativar' : 'Ativar')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </div>
          </TabsContent>
          <TabsContent value="add" className="mt-4">
            <LocationMappingForm onFinished={handleFormFinished} />
          </TabsContent>
          <TabsContent value="edit" className="mt-4">
             {selectedMapping && <LocationMappingForm mapping={selectedMapping} onFinished={handleFormFinished} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

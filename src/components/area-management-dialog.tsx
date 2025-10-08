"use client";

import { useState, useTransition, useEffect } from "react";
import type { Area } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaForm } from "./area-form";
import { useToast } from "@/hooks/use-toast";
import { getAreas, toggleAreaActive } from "@/lib/actions";
import { Loader2, Pencil, PlusCircle, List, QrCode } from "lucide-react";
import { QrCodeDialog } from "./qr-code-dialog";

interface AreaManagementDialogProps {
  allAreas: Area[];
  children: React.ReactNode;
}

export function AreaManagementDialog({ allAreas, children }: AreaManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [areas, setAreas] = useState(allAreas);

  const handleEditClick = (area: Area) => {
    setSelectedArea(area);
    setActiveTab("edit");
  };

  const handleFormFinished = async () => {
    setSelectedArea(null);
    setActiveTab('list');
    await refreshData();
  };

  const handleTabChange = (value: string) => {
    if (value !== 'edit') {
      setSelectedArea(null);
    }
    setActiveTab(value);
  }
  
  const refreshData = async () => {
    try {
      const refreshedAreas = await getAreas();
      setAreas(refreshedAreas);
    } catch (error) {
      console.error('Erro ao atualizar lista de áreas:', error);
    }
  };
  
  useEffect(() => {
    if (open) {
      refreshData();
    }
  }, [open]);

  const handleToggleActive = (id: string, currentIsActive: boolean) => {
    startTransition(async () => {
      const result = await toggleAreaActive(id, !currentIsActive);
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
      setSelectedArea(null);
      setActiveTab('list');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Gerenciamento de Áreas (QR Code)</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Listar Áreas</TabsTrigger>
            <TabsTrigger value="add"><PlusCircle className="mr-2 h-4 w-4" />Adicionar Nova</TabsTrigger>
            <TabsTrigger value="edit" disabled={!selectedArea}><Pencil className="mr-2 h-4 w-4" />Editar Área</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor</TableHead>
                    <TableHead>ID da Localização</TableHead>
                    <TableHead>Código Curto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.map((area) => (
                    <TableRow key={area._id.toString()}>
                      <TableCell className="font-medium">{area.setor}</TableCell>
                      <TableCell>{area.locationId}</TableCell>
                      <TableCell><Badge variant="secondary">{area.shortCode}</Badge></TableCell>
                      <TableCell>
                         <Badge variant={area.isActive ? 'default' : 'outline'}>
                          {area.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <QrCodeDialog
                          item={{
                            type: 'area',
                            displayName: area.setor,
                            code: area.locationId,
                            shortCode: area.shortCode
                          }}
                        >
                          <Button variant="outline" size="sm">
                            <QrCode className="mr-2 h-4 w-4" />
                            Gerar QR
                          </Button>
                        </QrCodeDialog>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(area)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={area.isActive ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleActive(area._id.toString(), area.isActive)}
                          disabled={isPending}
                        >
                           {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : (area.isActive ? 'Desativar' : 'Ativar')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="add" className="mt-4">
            <AreaForm onFinished={handleFormFinished} />
          </TabsContent>
          <TabsContent value="edit" className="mt-4">
             {selectedArea && <AreaForm area={selectedArea} onFinished={handleFormFinished} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

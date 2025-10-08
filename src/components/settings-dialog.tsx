"use client";

import { useState } from "react";
import type { Area, Asg, CleaningSettings, User } from "@/lib/schemas";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AsgManagementDialog } from "./asg-management-dialog";
import { CleaningTimesDialog } from "./cleaning-times-dialog";
import { ReportsDialog } from "./reports-dialog";
import { IntegrationsDialog } from "./integrations-dialog";
import { UserManagementDialog } from "./user-management-dialog";
import { Users, BarChart, Info, Settings as SettingsIcon, Clock, Link as LinkIcon, FileText, QrCode } from "lucide-react";
import { LogsDialog } from "./logs-dialog";
import { AreaManagementDialog } from "./area-management-dialog";

interface SettingsDialogProps {
  allAsgs: Asg[];
  allUsers: User[];
  children: React.ReactNode;
  nextAsgCode: string;
  cleaningSettings: CleaningSettings;
  allAreas: Area[];
}

export function SettingsDialog({ allAsgs, allUsers, children, nextAsgCode, cleaningSettings, allAreas }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Gerencie as configurações do sistema, colaboradores e visualize relatórios.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 pt-4">
          <UserManagementDialog allUsers={allUsers}>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Gerenciar Usuários
            </Button>
          </UserManagementDialog>
          <AsgManagementDialog allAsgs={allAsgs} nextAsgCode={nextAsgCode}>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Gerenciar Colaboradores
            </Button>
          </AsgManagementDialog>
           <AreaManagementDialog allAreas={allAreas}>
             <Button variant="outline" className="w-full justify-start">
               <QrCode className="mr-2 h-4 w-4" />
               Gerenciar Áreas (QR Code)
             </Button>
           </AreaManagementDialog>
          <CleaningTimesDialog settings={cleaningSettings}>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" />
              Tempos de Limpeza
            </Button>
          </CleaningTimesDialog>
           <ReportsDialog>
              <Button variant="outline" className="w-full justify-start">
                <BarChart className="mr-2 h-4 w-4" />
                Relatórios e Estatísticas
              </Button>
            </ReportsDialog>
            <IntegrationsDialog open={integrationsOpen} onOpenChange={setIntegrationsOpen}>
                <Button variant="outline" className="w-full justify-start" onClick={() => setIntegrationsOpen(true)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Integrações
                </Button>
            </IntegrationsDialog>
            <LogsDialog>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Logs da Aplicação
              </Button>
            </LogsDialog>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Info className="mr-2 h-4 w-4" />
              Sobre
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

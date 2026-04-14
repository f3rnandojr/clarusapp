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
import { Users, BarChart, Info, Settings as SettingsIcon, Clock, Link as LinkIcon, FileText, QrCode, Map, Bell, Printer, Eye } from "lucide-react";
import { LogsDialog } from "./logs-dialog";
import { AreaManagementDialog } from "./area-management-dialog";
import { MappingManagementDialog } from "./mapping-management-dialog";
import { WebhookSettingsDialog } from "./webhook-settings-dialog";
import { QrPrintDialog } from "./qr-print-dialog";
import { ViewModeDialog } from "./view-mode-dialog";

interface SettingsDialogProps {
  allAsgs: Asg[];
  allUsers: User[];
  children: React.ReactNode;
  nextAsgCode: string;
  cleaningSettings: CleaningSettings;
  allAreas: Area[];
  userProfile?: string;
}

export function SettingsDialog({ allAsgs, allUsers, children, nextAsgCode, cleaningSettings, allAreas, userProfile = 'admin' }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const isAdmin = userProfile === 'admin';

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

          {/* Admin-only items */}
          {isAdmin && (
            <MappingManagementDialog>
              <Button variant="outline" className="w-full justify-start">
                <Map className="mr-2 h-4 w-4" /> Mapeamento de Locais
              </Button>
            </MappingManagementDialog>
          )}

          <UserManagementDialog allUsers={allUsers}>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" /> Gerenciar Usuários
            </Button>
          </UserManagementDialog>

          {isAdmin && (
            <AsgManagementDialog allAsgs={allAsgs} nextAsgCode={nextAsgCode}>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> Gerenciar Colaboradores
              </Button>
            </AsgManagementDialog>
          )}

          {isAdmin && (
            <AreaManagementDialog allAreas={allAreas}>
              <Button variant="outline" className="w-full justify-start">
                <QrCode className="mr-2 h-4 w-4" /> Gerenciar Áreas (QR Code)
              </Button>
            </AreaManagementDialog>
          )}

          <QrPrintDialog>
            <Button variant="outline" className="w-full justify-start">
              <Printer className="mr-2 h-4 w-4" /> Impressão de QR Codes
            </Button>
          </QrPrintDialog>

          <CleaningTimesDialog settings={cleaningSettings}>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" /> Tempos de Limpeza
            </Button>
          </CleaningTimesDialog>

          <ReportsDialog>
            <Button variant="outline" className="w-full justify-start">
              <BarChart className="mr-2 h-4 w-4" /> Relatórios e Estatísticas
            </Button>
          </ReportsDialog>

          {isAdmin && (
            <ViewModeDialog>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="mr-2 h-4 w-4" /> Modo de Visualização
              </Button>
            </ViewModeDialog>
          )}

          {isAdmin && (
            <WebhookSettingsDialog>
              <Button variant="outline" className="w-full justify-start">
                <Bell className="mr-2 h-4 w-4" /> Notificações (Webhook)
              </Button>
            </WebhookSettingsDialog>
          )}

          {isAdmin && (
            <IntegrationsDialog open={integrationsOpen} onOpenChange={setIntegrationsOpen}>
              <Button variant="outline" className="w-full justify-start" onClick={() => setIntegrationsOpen(true)}>
                <LinkIcon className="mr-2 h-4 w-4" /> Integrações de Dados
              </Button>
            </IntegrationsDialog>
          )}

          {isAdmin && (
            <LogsDialog>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" /> Logs da Aplicação
              </Button>
            </LogsDialog>
          )}

          {isAdmin && (
            <Button variant="outline" className="w-full justify-start" disabled>
              <Info className="mr-2 h-4 w-4" /> Sobre
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

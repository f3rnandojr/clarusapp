
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Separator } from "./ui/separator";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { getIntegrationConfig, saveIntegrationConfig, testIntegrationConnection } from '@/lib/actions';
import type { IntegrationConfig } from "@/lib/schemas";
import { Skeleton } from "./ui/skeleton";


const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  _id: 'integration_settings',
  enabled: false,
  host: '',
  port: 5432,
  database: '',
  username: '',
  password: '',
  syncInterval: 5,
  query: "SELECT code1, tipobloq FROM cable1 WHERE tipobloq IN ('*', 'L')",
  statusMappings: {
    available: 'L',
    occupied: '*'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export function IntegrationsDialog({ children }: { children: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<IntegrationConfig>(DEFAULT_INTEGRATION_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const loadConfig = async () => {
        setIsLoading(true);
        try {
          const savedConfig = await getIntegrationConfig();
          setConfig(savedConfig);
        } catch (error) {
          console.error('Erro ao carregar configuração:', error);
          toast({ title: "Erro", description: "Não foi possível carregar as configurações de integração.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      loadConfig();
    }
  }, [open, toast]);

  const handleFieldChange = (field: keyof IntegrationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testIntegrationConnection(config);
      toast({
        title: result.success ? "Conexão Testada" : "Falha na Conexão",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao testar a conexão.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveIntegrationConfig(config);
      if (result.success) {
        toast({ title: "Configurações Salvas", description: result.message });
        setOpen(false);
      } else {
        toast({ title: "Erro ao Salvar", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro Inesperado", description: "Não foi possível salvar as configurações.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>🔗 Integração com Sistema de Leitos</DialogTitle>
          <DialogDescription>
            Configure a sincronização automática com o sistema externo para atualização de status dos leitos.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
            <div className="space-y-6 py-2">
                <Skeleton className="h-8 w-1/3" />
                <Separator />
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>
        ) : (
        <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center space-x-2">
                <Switch 
                  id="integration-active"
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleFieldChange('enabled', checked)}
                />
                <Label htmlFor="integration-active" className="text-base">Ativar Integração Automática</Label>
            </div>

            <Separator />

            <div className="space-y-4">
                 <h3 className="font-semibold text-lg">⚙️ Configuração da Conexão</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input id="host" placeholder="ex: db.hospital.com.br" value={config.host} onChange={(e) => handleFieldChange('host', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="port">Porta</Label>
                        <Input id="port" type="number" value={config.port} onChange={(e) => handleFieldChange('port', Number(e.target.value))} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="database">Banco</Label>
                        <Input id="database" placeholder="ex: leitos_db" value={config.database} onChange={(e) => handleFieldChange('database', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="user">Usuário</Label>
                        <Input id="user" placeholder="ex: admin_leitos" value={config.username} onChange={(e) => handleFieldChange('username', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type="password" value={config.password} onChange={(e) => handleFieldChange('password', e.target.value)} />
                    </div>
                 </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">🕐 Configuração da Sincronização</h3>
                 <div className="space-y-2">
                    <Label htmlFor="interval">Intervalo de Sincronização (minutos)</Label>
                    <Input id="interval" type="number" value={config.syncInterval} onChange={(e) => handleFieldChange('syncInterval', Number(e.target.value))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="query">Query de Consulta</Label>
                    <Textarea id="query" rows={4} value={config.query} onChange={(e) => handleFieldChange('query', e.target.value)} />
                </div>
            </div>

             <Separator />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Estrutura de Dados Esperada</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Os dados da sua query precisam ser transformados para o seguinte formato JSON antes de serem processados pela aplicação:</p>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                  {`{
  "name": "Quarto",
  "number": "203-A",
  "status": "available" // ou "occupied"
}`}
                </pre>
              </AlertDescription>
            </Alert>

        </div>
        )}
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isTesting || isSaving}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleTestConnection} disabled={isTesting || isSaving || isLoading}>
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
            </Button>
            <Button type="submit" onClick={handleSave} disabled={isTesting || isSaving || isLoading}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

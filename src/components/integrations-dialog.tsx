
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


interface IntegrationsDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationsDialog({ children, open, onOpenChange }: IntegrationsDialogProps) {
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
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
    if (!config) return;
    setConfig(prev => ({ ...prev!, [field]: value }));
  };
  
  const handleNestedFieldChange = (section: 'statusMappings' | 'fieldMappings', field: string, value: any) => {
    if (!config) return;
    setConfig(prev => ({
      ...prev!,
      [section]: {
        // @ts-ignore
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleTestConnection = async () => {
    if (!config) return;
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
    if (!config) return;
    setIsSaving(true);
    try {
      const result = await saveIntegrationConfig(config);
      if (result.success) {
        toast({ title: "Configurações Salvas", description: result.message });
        onOpenChange(false);
      } else {
        toast({ title: "Erro ao Salvar", description: result.message || "Ocorreu um erro.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro Inesperado", description: "Não foi possível salvar as configurações.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        ) : config && (
          <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto px-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => handleFieldChange('enabled', checked)}
                  />
                  Ativar Integração Automática
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração da Conexão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">Host</Label>
                    <Input id="host" placeholder="ex: db.hospital.com.br" value={config.host} onChange={(e) => handleFieldChange('host', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="port">Porta</Label>
                    <Input id="port" type="number" value={config.port} onChange={(e) => handleFieldChange('port', Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="database">Banco</Label>
                    <Input id="database" placeholder="ex: leitos_db" value={config.database} onChange={(e) => handleFieldChange('database', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="username">Usuário</Label>
                    <Input id="user" placeholder="ex: admin_leitos" value={config.username} onChange={(e) => handleFieldChange('username', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={config.password} onChange={(e) => handleFieldChange('password', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de Status</CardTitle>
                <CardDescription>Defina como os valores do sistema externo mapeiam para os status do CleanFlow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="availableMapping">Valor para "Disponível"</Label>
                    <Input id="availableMapping" value={config.statusMappings.available} onChange={(e) => handleNestedFieldChange('statusMappings', 'available', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="occupiedMapping">Valor para "Ocupado"</Label>
                    <Input id="occupiedMapping" value={config.statusMappings.occupied} onChange={(e) => handleNestedFieldChange('statusMappings', 'occupied', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração da Sincronização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="interval">Intervalo de Sincronização (minutos)</Label>
                  <Input id="interval" type="number" value={config.syncInterval} onChange={(e) => handleFieldChange('syncInterval', Number(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="query">Query de Consulta</Label>
                  <Textarea id="query" rows={4} value={config.query} onChange={(e) => handleFieldChange('query', e.target.value)} />
                </div>
              </CardContent>
            </Card>

          </div>
        )}
        <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isTesting || isSaving}>Cancelar</Button>
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

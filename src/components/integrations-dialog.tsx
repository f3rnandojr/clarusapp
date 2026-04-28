"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getIntegrationConfig, saveIntegrationConfig, testIntegrationConnection, runManualSync, getSyncStatus, testTransformation } from '@/lib/actions';
import type { IntegrationConfig } from "@/lib/schemas";
import SyncDashboard from "./sync-dashboard";


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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
        if (open) {
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
        }
    };
    loadData();
  }, [open, toast]);

  const handleFieldChange = (field: keyof IntegrationConfig, value: any) => {
    if (!config) return;
    setConfig(prev => ({ ...prev!, [field]: value }));
  };
  
  const handleNestedFieldChange = (section: 'statusMappings' | 'fieldMappings' | 'transformation', field: string, value: any) => {
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
      const result = await testIntegrationConnection();
      toast({
        title: result.success ? "Conexão Testada" : "Falha na Conexão",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Ocorreu um erro ao testar a conexão.", variant: "destructive" });
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
  
  const handleTestTransformation = async () => {
    try {
      const result = await testTransformation();
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Teste de Transformação",
          description: "Transformação testada com sucesso!",
          variant: "default"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no Teste",
        description: error.message || "Falha ao testar transformação",
        variant: "destructive"
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>🔗 Integração com Sistema de Leitos</DialogTitle>
          <DialogDescription>
            Configure e monitore a sincronização automática com o sistema externo para atualização de status dos leitos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
             <div className="space-y-6 py-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-8 w-1/3" />
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>
        ) : config && (
          <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto px-1">
            <SyncDashboard />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Switch
                    id="integration-enabled"
                    checked={config.enabled}
                    onCheckedChange={(checked) => handleFieldChange('enabled', checked)}
                  />
                  <Label htmlFor="integration-enabled">Ativar Integração Automática</Label>
                </CardTitle>
              </CardHeader>
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
                    <Input id="availableMapping" value={config.statusMappings?.available || ''} onChange={(e) => handleNestedFieldChange('statusMappings', 'available', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="occupiedMapping">Valor para "Ocupado"</Label>
                    <Input id="occupiedMapping" value={config.statusMappings?.occupied || ''} onChange={(e) => handleNestedFieldChange('statusMappings', 'occupied', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                    <span>Configurações Avançadas de Transformação</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                        {showAdvanced ? "Ocultar" : "Mostrar"}
                    </Button>
                    </CardTitle>
                </CardHeader>
                
                {showAdvanced && (
                    <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <Label htmlFor="codeField">Campo do Código do Leito</Label>
                        <Input
                            id="codeField"
                            value={config.fieldMappings?.codeField || 'code1'}
                            onChange={(e) => handleNestedFieldChange('fieldMappings', 'codeField', e.target.value)}
                            placeholder="code1"
                        />
                        </div>
                        <div>
                        <Label htmlFor="statusField">Campo do Status do Leito</Label>
                        <Input
                            id="statusField"
                            value={config.fieldMappings?.statusField || 'tipoblog'}
                            onChange={(e) => handleNestedFieldChange('fieldMappings', 'statusField', e.target.value)}
                            placeholder="tipoblog"
                        />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <Label htmlFor="namePattern">Padrão de Nome (Regex)</Label>
                        <Input
                            id="namePattern"
                            value={config.transformation?.namePattern || ''}
                            onChange={(e) => handleNestedFieldChange('transformation', 'namePattern', e.target.value)}
                            placeholder="([A-Za-z]+)"
                        />
                        <p className="text-xs text-muted-foreground">Ex: ([A-Za-z]+)</p>
                        </div>
                        <div>
                        <Label htmlFor="numberPattern">Padrão de Número (Regex)</Label>
                        <Input
                            id="numberPattern"
                            value={config.transformation?.numberPattern || ''}
                            onChange={(e) => handleNestedFieldChange('transformation', 'numberPattern', e.target.value)}
                            placeholder="([0-9]+)"
                        />
                        <p className="text-xs text-muted-foreground">Ex: ([0-9]+)</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleTestTransformation}
                        variant="outline"
                        size="sm"
                    >
                        Testar Transformação
                    </Button>

                    {testResult && (
                        <div className="p-3 border rounded-lg bg-muted mt-4">
                        <h4 className="font-medium mb-2">Resultado do Teste de Transformação:</h4>
                        <pre className="text-xs overflow-auto bg-background p-2 rounded">
                            {JSON.stringify(testResult, null, 2)}
                        </pre>
                        </div>
                    )}
                    </CardContent>
                )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração da Query</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="interval">Intervalo de Sincronização (minutos)</Label>
                  <Input id="interval" type="number" value={config.syncInterval || 5} onChange={(e) => handleFieldChange('syncInterval', Number(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="query">Query de Consulta SQL</Label>
                  <Textarea id="query" rows={4} value={config.query || ''} onChange={(e) => handleFieldChange('query', e.target.value)} />
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

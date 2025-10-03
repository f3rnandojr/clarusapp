'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from 'lucide-react';

interface SyncStatus {
  config: {
    enabled: boolean;
    lastSync: string | null;
    syncInterval: number;
  };
  service: {
    isRunning: boolean;
    isScheduled: boolean;
    lastRun: string | null;
    nextRun: string | null;
  };
  timestamp: string;
}

export default function SyncDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForcing, setIsForcing] = useState(false);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    }
  };

  const forceSync = async () => {
    setIsForcing(true);
    try {
      const response = await fetch('/api/sync/force', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Sincronização Forçada",
          description: "Sincronização manual iniciada com sucesso.",
          variant: "default"
        });
        setTimeout(() => fetchStatus(), 2000); // Re-fetch status after a moment
      } else {
        toast({
          title: "Erro ao Forçar Sync",
          description: result.error || "Ocorreu um erro desconhecido.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro de Rede",
        description: "Falha ao comunicar com o servidor para forçar a sincronização.",
        variant: "destructive"
      });
    } finally {
      setIsForcing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchStatus();
      setIsLoading(false);
    };

    loadData();

    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    fetchStatus();
  }

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Status da Sincronização</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Carregando...</p>
            </CardContent>
        </Card>
    );
  }

  if (!status) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Status da Sincronização</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive">Não foi possível carregar o status da sincronização.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex justify-between items-center">
                <span>Status da Sincronização</span>
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Integração</span>
                <Badge variant={status.config.enabled ? "default" : "secondary"}>
                    {status.config.enabled ? "Ativa" : "Inativa"}
                </Badge>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Serviço</span>
                <Badge variant={status.service.isRunning ? "default" : "secondary"}>
                    {status.service.isRunning ? "Executando..." : "Parado"}
                </Badge>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Última Sync</span>
                <span>
                    {status.service.lastRun 
                        ? new Date(status.service.lastRun).toLocaleTimeString('pt-BR')
                        : 'Nunca'
                    }
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Próxima Sync</span>
                <div className="flex items-center justify-between">
                    <span>
                        {status.service.nextRun && status.config.enabled
                            ? new Date(status.service.nextRun).toLocaleTimeString('pt-BR')
                            : '---'
                        }
                    </span>
                    <Button
                        size="sm"
                        onClick={forceSync}
                        disabled={isForcing || status.service.isRunning || !status.config.enabled}
                    >
                        {isForcing || status.service.isRunning ? <Loader2 className="h-4 w-4 animate-spin"/> : "Forçar"}
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
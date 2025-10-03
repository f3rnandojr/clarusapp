"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Separator } from "./ui/separator";
import { Loader2 } from "lucide-react";

interface IntegrationsDialogProps {
  children: React.ReactNode;
}

export function IntegrationsDialog({ children }: IntegrationsDialogProps) {
  const [open, setOpen] = useState(false);
  const [integrationActive, setIntegrationActive] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [interval, setInterval] = useState('5');
  const [query, setQuery] = useState("SELECT code1, tipobloq FROM cable1 \nWHERE tipobloq IN ('*', 'L')");


  const handleTestConnection = async () => {
    // Valida se os campos essenciais estão preenchidos
    if (!host || !database || !user || !password) {
      toast({
        title: "❌ Campos Incompletos",
        description: "Por favor, preencha Host, Banco, Usuário e Senha para testar a conexão.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    // Simula uma chamada de API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    
    // Simula sucesso ou falha, mas com maior chance de sucesso se os campos estiverem preenchidos
    if (Math.random() > 0.2) { // 80% de chance de sucesso
      toast({
        title: "✅ Sucesso!",
        description: "A conexão com o banco de dados foi bem-sucedida (simulação).",
      });
    } else {
      toast({
        title: "❌ Falha na Conexão",
        description: "Não foi possível conectar ao banco de dados. Verifique as credenciais (simulação).",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simula uma chamada de API para salvar
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Salvando configurações:", {
      integrationActive,
      host,
      port,
      database,
      user,
      // Não logar a senha em um app real
      interval,
      query
    });
    setIsSaving(false);
    toast({
      title: "Configurações Salvas",
      description: "As configurações de integração foram salvas com sucesso.",
    });
    setOpen(false);
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
        <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center space-x-2">
                <Switch 
                  id="integration-active"
                  checked={integrationActive}
                  onCheckedChange={setIntegrationActive}
                />
                <Label htmlFor="integration-active" className="text-base">Ativar Integração Automática</Label>
            </div>

            <Separator />

            <div className="space-y-4">
                 <h3 className="font-semibold text-lg">⚙️ Configuração da Conexão</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input id="host" placeholder="ex: db.hospital.com.br" value={host} onChange={(e) => setHost(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="port">Porta</Label>
                        <Input id="port" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="database">Banco</Label>
                        <Input id="database" placeholder="ex: leitos_db" value={database} onChange={(e) => setDatabase(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="user">Usuário</Label>
                        <Input id="user" placeholder="ex: admin_leitos" value={user} onChange={(e) => setUser(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                 </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">🕐 Configuração da Sincronização</h3>
                 <div className="space-y-2">
                    <Label htmlFor="interval">Intervalo de Sincronização (minutos)</Label>
                    <Input id="interval" type="number" value={interval} onChange={(e) => setInterval(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="query">Query de Consulta</Label>
                    <Textarea id="query" rows={4} value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
            </div>

        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isTesting || isSaving}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleTestConnection} disabled={isTesting || isSaving}>
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
            </Button>
            <Button type="submit" onClick={handleSave} disabled={isTesting || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

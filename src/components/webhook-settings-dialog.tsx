"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getWebhookSettings, saveWebhookSettings, testWebhookConnection } from "@/lib/actions";
import type { WebhookSettings } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Loader2, Send, Variable, CheckCircle2, CheckSquare } from "lucide-react";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";

interface WebhookSettingsDialogProps {
  children: React.ReactNode;
}

const TEMPLATE_VARIABLES = [
  { tag: "{local}", label: "Local" },
  { tag: "{tipo_limpeza}", label: "Tipo" },
  { tag: "{prioridade}", label: "Prioridade" },
  { tag: "{horario}", label: "Horário" },
];

const EVENT_LABELS = [
  { id: "newRequest",        label: "Nova Solicitação de Higienização" },
  { id: "cleaningFinished",  label: "Finalização de Higienização (Usuário)" },
  { id: "auditFinished",     label: "Finalização de Auditoria (Auditor)" },
  { id: "checklistFinished", label: "Conclusão de Checklist (APTO/NÃO APTO)" },
  { id: "ncRegistered",      label: "Registro de Não Conformidade (NC)" },
];

export function WebhookSettingsDialog({ children }: WebhookSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebhookSettings>({ 
    url: '', 
    template: '',
    enabledEvents: {
      newRequest:        true,
      cleaningFinished:  false,
      auditFinished:     true,
      checklistFinished: true,
      ncRegistered:      true,
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLoading(true);
      getWebhookSettings().then(data => {
        setSettings(data);
        setLoading(false);
      });
    }
  }, [open]);

  const handleTest = async () => {
    if (!settings.url) {
      toast({ title: "Atenção", description: "Insira uma URL antes de testar.", variant: "destructive" });
      return;
    }
    setTesting(true);
    const result = await testWebhookConnection(settings.url);
    if (result.success) {
      toast({ title: "Sucesso!", description: result.message });
    } else {
      toast({ title: "Falha no Teste", description: result.error, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveWebhookSettings(settings);
    if (result.success) {
      toast({ title: "Configurações Salvas", description: result.message });
      setOpen(false);
    } else {
      toast({ title: "Erro ao Salvar", description: result.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const addVariable = (tag: string) => {
    setSettings(prev => ({ ...prev, template: prev.template + ' ' + tag }));
  };

  const toggleEvent = (eventId: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      enabledEvents: {
        ...prev.enabledEvents,
        [eventId]: value
      }
    }));
  };

  const markAll = () => {
    setSettings(prev => ({
      ...prev,
      enabledEvents: {
        newRequest:        true,
        cleaningFinished:  true,
        auditFinished:     true,
        checklistFinished: true,
        ncRegistered:      true,
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto scroll-container">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-sky-400 uppercase tracking-tighter">
            <Bell className="h-6 w-6" /> Integrações de Notificações
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure o destino e os gatilhos dos alertas de higienização via Webhook.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carregando configurações...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  placeholder="https://nextcloud.hospital.com/index.php/apps/talk/api/v1/external/..."
                  value={settings.url}
                  onChange={(e) => setSettings(prev => ({ ...prev, url: e.target.value }))}
                  className="bg-slate-950 border-slate-800 focus:ring-sky-500/20"
                />
                <Button 
                  variant="outline" 
                  onClick={handleTest} 
                  disabled={testing || !settings.url}
                  className="border-slate-800 bg-slate-800/50 hover:bg-slate-800"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline text-xs font-bold uppercase">Testar</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="webhook-template" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Template da Mensagem</Label>
                <div className="flex gap-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <Badge 
                      key={v.tag} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-sky-500/10 border-sky-500/20 text-sky-400 text-[9px] py-0 h-5"
                      onClick={() => addVariable(v.tag)}
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Textarea
                id="webhook-template"
                placeholder="Defina a estrutura da mensagem..."
                value={settings.template}
                onChange={(e) => setSettings(prev => ({ ...prev, template: e.target.value }))}
                className="bg-slate-950 border-slate-800 min-h-[100px] focus:ring-sky-500/20 font-medium text-sm leading-relaxed"
              />
              <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/10 flex gap-3 items-start">
                <Variable className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Utilize as tags acima para preenchimento automático. Exemplo: <br/>
                  <span className="text-sky-400/60 font-mono">"Nova tarefa no {`{local}`} | {`{tipo_limpeza}`}"</span>
                </p>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-sky-400">Eventos para Notificação</h3>
                <Button variant="ghost" size="sm" onClick={markAll} className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:text-sky-400">
                  <CheckSquare className="h-3 w-3 mr-1.5" /> Marcar Todos
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EVENT_LABELS.map(event => (
                  <div key={event.id} className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                    <Checkbox 
                      id={event.id} 
                      checked={(settings.enabledEvents as any)[event.id]}
                      onCheckedChange={(checked) => toggleEvent(event.id, !!checked)}
                      className="border-sky-500 data-[state=checked]:bg-sky-500 data-[state=checked]:text-slate-900"
                    />
                    <Label htmlFor={event.id} className="text-xs font-bold text-slate-300 cursor-pointer flex-1 leading-tight">
                      {event.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="bg-sky-500 hover:bg-sky-400 text-slate-900 font-black uppercase tracking-widest text-xs px-8 rounded-xl shadow-lg shadow-sky-500/20 h-12"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

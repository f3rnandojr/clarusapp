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
      <DialogContent className="max-w-2xl bg-white border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto scroll-container">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#0F4C5C] uppercase tracking-tighter">
            <Bell className="h-6 w-6" /> Integrações de Notificações
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure o destino e os gatilhos dos alertas de higienização via Webhook.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#A0E9FF]" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carregando configurações...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  placeholder="https://nextcloud.hospital.com/index.php/apps/talk/api/v1/external/..."
                  value={settings.url}
                  onChange={(e) => setSettings(prev => ({ ...prev, url: e.target.value }))}
                  className="bg-white border-gray-200 text-gray-900 focus-visible:ring-[#A0E9FF]/50 focus-visible:border-[#A0E9FF]"
                />
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !settings.url}
                  className="border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline text-xs font-bold uppercase">Testar</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="webhook-template" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Template da Mensagem</Label>
                <div className="flex gap-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <Badge
                      key={v.tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-[#A0E9FF]/10 border-[#A0E9FF]/40 text-[#0F4C5C] text-[9px] py-0 h-5"
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
                className="bg-white border-gray-200 text-gray-900 min-h-[100px] focus-visible:ring-[#A0E9FF]/50 focus-visible:border-[#A0E9FF] font-medium text-sm leading-relaxed"
              />
              <div className="p-3 rounded-xl bg-[#A0E9FF]/10 border border-[#A0E9FF]/30 flex gap-3 items-start">
                <Variable className="h-4 w-4 text-[#0F4C5C] shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-normal">
                  Utilize as tags acima para preenchimento automático. Exemplo: <br/>
                  <span className="text-[#0F4C5C]/60 font-mono">"Nova tarefa no {`{local}`} | {`{tipo_limpeza}`}"</span>
                </p>
              </div>
            </div>

            <Separator className="bg-gray-100" />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0F4C5C]">Eventos para Notificação</h3>
                <Button variant="ghost" size="sm" onClick={markAll} className="h-7 text-[10px] uppercase font-bold text-gray-400 hover:text-[#0F4C5C]">
                  <CheckSquare className="h-3 w-3 mr-1.5" /> Marcar Todos
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EVENT_LABELS.map(event => (
                  <div key={event.id} className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors">
                    <Checkbox
                      id={event.id}
                      checked={(settings.enabledEvents as any)[event.id]}
                      onCheckedChange={(checked) => toggleEvent(event.id, !!checked)}
                      className="border-[#0F4C5C]/40 data-[state=checked]:bg-[#0F4C5C] data-[state=checked]:border-[#0F4C5C] data-[state=checked]:text-white"
                    />
                    <Label htmlFor={event.id} className="text-xs font-bold text-gray-700 cursor-pointer flex-1 leading-tight">
                      {event.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#0F4C5C] hover:bg-[#0a3844] text-white font-black uppercase tracking-widest text-xs px-8 rounded-xl h-12"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { createAuditRecord } from "@/lib/actions";
import type { Location, CleaningRecord } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditChecklistDialogProps {
  location: Location;
  lastCleaning: CleaningRecord | null;
  children: React.ReactNode;
}

const CHECKLIST_ITEMS = [
  { id: "ambiente", label: "Higiene do Ambiente Geral" },
  { id: "piso", label: "Conservação e Limpeza do Piso" },
  { id: "paredes", label: "Limpeza das Paredes e Cantos" },
  { id: "mobiliario", label: "Desinfecção do Mobiliário" },
  { id: "banheiro", label: "Higiene Completa do Banheiro" },
  { id: "vidros", label: "Transparência de Vidros e Janelas" },
  { id: "equipamentos", label: "Limpeza de Equipamentos" },
  { id: "residuos", label: "Gestão de Resíduos (Lixeiras)" },
];

type Answer = "conforme" | "não_conforme" | "n/a";

export function AuditChecklistDialog({ location, lastCleaning, children }: AuditChecklistDialogProps) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [observations, setObservations] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isChecklistComplete = CHECKLIST_ITEMS.every(item => answers[item.id]);

  const handleAnswerChange = (itemId: string, value: Answer) => {
    setAnswers(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChecklistComplete) return;

    startTransition(async () => {
      const result = await createAuditRecord({
        locationId: location._id.toString(),
        locationName: `${location.name} - ${location.number}`,
        lastCleaningId: lastCleaning ? lastCleaning._id.toString() : null,
        checklistData: answers,
        observations: observations,
      });

      if (result.success) {
        toast({ title: "Sucesso!", description: result.message });
        setOpen(false);
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden bg-slate-900 border-slate-800 text-white p-0">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-sky-400">
            <ClipboardCheck className="h-6 w-6" />
            Checklist de Validação
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
            Local: {location.name} - {location.number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-6 scroll-container">
          <div className="space-y-4">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                <Label className="text-sm font-bold text-slate-200">{item.label}</Label>
                <RadioGroup 
                  onValueChange={(val) => handleAnswerChange(item.id, val as Answer)}
                  className="flex flex-wrap gap-2 sm:gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="conforme" id={`${item.id}-c`} className="border-emerald-500 text-emerald-500" />
                    <Label htmlFor={`${item.id}-c`} className="text-xs cursor-pointer text-emerald-400">Conforme</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="não_conforme" id={`${item.id}-nc`} className="border-red-500 text-red-500" />
                    <Label htmlFor={`${item.id}-nc`} className="text-xs cursor-pointer text-red-400">Não Conforme</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="n/a" id={`${item.id}-na`} className="border-slate-500 text-slate-500" />
                    <Label htmlFor={`${item.id}-na`} className="text-xs cursor-pointer text-slate-500">N/A</Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>

          <div className="space-y-2 pb-4">
            <Label htmlFor="obs" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Observações Adicionais</Label>
            <Textarea 
              id="obs"
              placeholder="Descreva observações relevantes encontradas na auditoria..."
              className="bg-slate-950 border-slate-800 min-h-[100px] rounded-xl focus:ring-sky-500/20"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>
        </form>

        <DialogFooter className="p-6 pt-2 shrink-0 bg-slate-950/50 border-t border-slate-800">
          <Button 
            type="submit" 
            className={cn(
              "w-full h-14 font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg",
              isChecklistComplete 
                ? "bg-sky-500 hover:bg-sky-400 text-slate-900 shadow-sky-500/20" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
            disabled={!isChecklistComplete || isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Finalizar Atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

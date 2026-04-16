"use client";

import { useState, useEffect } from "react";
import { getViewMode, saveViewMode, type ViewMode } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MousePointer, Eye, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ViewMode; label: string; description: string; Icon: any }[] = [
  {
    value: "solicitation",
    label: "Com Solicitação de Higienização",
    description: "Exibe botão de solicitar/iniciar higienização em cada leito.",
    Icon: MousePointer,
  },
  {
    value: "view_only",
    label: "Somente Visualização",
    description: "Remove os botões de ação. Indicadores de status maiores e grid mais compacta.",
    Icon: Eye,
  },
];

export function ViewModeDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen]   = useState(false);
  const [mode, setMode]   = useState<ViewMode>("solicitation");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getViewMode().then(m => { setMode(m); setLoading(false); });
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveViewMode(mode);
    if (result.success) {
      toast({ title: "Modo salvo!", description: "A configuração será aplicada no próximo carregamento." });
      setOpen(false);
    } else {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0F4C5C]">Modo de Visualização</DialogTitle>
          <DialogDescription>
            Controla se os botões de ação aparecem nos cartões de leitos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#A0E9FF]" />
          </div>
        ) : (
          <div className="py-2 space-y-3">
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  mode === opt.value
                    ? "border-[#A0E9FF] bg-[#A0E9FF]/10"
                    : "border-gray-200 hover:border-[#A0E9FF]/40"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  mode === opt.value ? "bg-[#A0E9FF]/30" : "bg-gray-100"
                )}>
                  <opt.Icon className={cn("h-4 w-4", mode === opt.value ? "text-[#0F4C5C]" : "text-gray-400")} />
                </div>
                <div>
                  <p className={cn("font-bold text-sm", mode === opt.value ? "text-[#0F4C5C]" : "text-gray-700")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 text-xs font-bold uppercase tracking-widest">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#0F4C5C] hover:bg-[#0a3844] text-white font-black uppercase tracking-widest text-xs h-10 rounded-xl"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

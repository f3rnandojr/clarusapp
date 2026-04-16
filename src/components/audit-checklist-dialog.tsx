"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { createAuditRecord, saveAuditDraft, getAuditDraft } from "@/lib/actions";
import type { Location, CleaningRecord } from "@/lib/schemas";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, Loader2, ShieldCheck, ChevronDown, CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ─── Estrutura dos tópicos ───────────────────────────────────────────────────

type Answer = "conforme" | "não_conforme" | "n/a";

type Item = { id: string; label: string };
type Topic = {
  id: string;
  titulo: string;
  itens: Item[];
  isConclusao?: boolean;
};

const TOPICS: Topic[] = [
  {
    id: "t1",
    titulo: "1 · Verificação Geral do Ambiente",
    itens: [
      { id: "amb_limpo",        label: "Ambiente limpo e organizado" },
      { id: "piso_limpo",       label: "Piso limpo e seco" },
      { id: "paredes",          label: "Paredes, portas e rodapés higienizados" },
      { id: "iluminacao",       label: "Iluminação adequada" },
      { id: "ventilacao",       label: "Ventilação / Ar condicionado" },
      { id: "janelas",          label: "Janelas limpas" },
      { id: "barreira_janelas", label: "Barreira física nas janelas" },
      { id: "odores",           label: "Ausência de odores" },
    ],
  },
  {
    id: "t2",
    titulo: "2 · Leito / Mobília",
    itens: [
      { id: "cama_hosp",      label: "Cama hospitalar" },
      { id: "colchao",        label: "Colchão / Travesseiro" },
      { id: "grades",         label: "Grades da cama" },
      { id: "mesa_ref",       label: "Mesa de refeição" },
      { id: "criado",         label: "Criado-mudo" },
      { id: "campainha",      label: "Campainha" },
      { id: "lixeira_leito",  label: "Lixeira" },
      { id: "persiana",       label: "Persiana" },
      { id: "regua_gases",    label: "Régua de gases" },
      { id: "escada",         label: "Escada beira leito" },
      { id: "quadros",        label: "Quadros decorativos" },
      { id: "disp_papel",     label: "Dispenser de papel toalha" },
      { id: "disp_alcool",    label: "Dispenser de álcool / sabonete" },
    ],
  },
  {
    id: "t3",
    titulo: "3 · Enxoval Hospitalar",
    itens: [
      { id: "lencol",      label: "Lençol de cama" },
      { id: "fronha",      label: "Fronha" },
      { id: "cobertor",    label: "Cobertor embalado" },
      { id: "toalha",      label: "Toalha embalada" },
      { id: "toalha_piso", label: "Toalha de piso" },
    ],
  },
  {
    id: "t4",
    titulo: "4 · Banheiro",
    itens: [
      { id: "vaso",        label: "Vaso sanitário" },
      { id: "pia",         label: "Pia / Torneira / Ralo" },
      { id: "chuveiro",    label: "Chuveiro" },
      { id: "espelho",     label: "Espelho" },
      { id: "barras",      label: "Barras de apoio" },
      { id: "lixeira_ban", label: "Lixeira" },
      { id: "papel_ban",   label: "Dispenser papel toalha" },
      { id: "sabonete_ban",label: "Dispenser sabonete" },
      { id: "paredes_ban", label: "Paredes / Rejuntes" },
      { id: "piso_ban",    label: "Piso" },
      { id: "ralos",       label: "Ralos" },
    ],
  },
  {
    id: "t5",
    titulo: "5 · Segurança do Paciente",
    itens: [
      { id: "riscos",    label: "Ambiente livre de riscos físicos" },
      { id: "tomadas",   label: "Tomadas / Interruptores íntegros" },
      { id: "pragas",    label: "Controle de pragas" },
      { id: "mobiliario",label: "Mobiliário sem avaria" },
    ],
  },
  {
    id: "t6",
    titulo: "6 · Conclusão",
    isConclusao: true,
    itens: [
      { id: "conclusao", label: "Quarto / Leito APTO para ocupação" },
    ],
  },
];

// All required item IDs (excluding conclusao which is handled separately)
const ALL_ITEM_IDS = TOPICS.flatMap(t => t.itens.map(i => i.id));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTopicComplete(topic: Topic, answers: Record<string, Answer>): boolean {
  return topic.itens.every(item => !!answers[item.id]);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AuditChecklistDialogProps {
  location: Location;
  lastCleaning: CleaningRecord | null;
  children: React.ReactNode;
}

export function AuditChecklistDialog({ location, lastCleaning, children }: AuditChecklistDialogProps) {
  const [open, setOpen]                 = useState(false);
  const [answers, setAnswers]           = useState<Record<string, Answer>>({});
  const [observations, setObservations] = useState("");
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({ t1: true });
  const [isPending, startTransition]    = useTransition();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const { toast } = useToast();
  const router    = useRouter();

  const locationId = location._id.toString();

  // Load draft on open
  useEffect(() => {
    if (!open) return;
    getAuditDraft(locationId).then(draft => {
      if (draft && Object.keys(draft).length > 0) {
        setAnswers(draft as Record<string, Answer>);
        toast({ title: "Rascunho carregado", description: "Preenchimento anterior restaurado." });
      }
    });
  }, [open, locationId]);

  // Auto-save draft whenever a topic is fully completed
  const handleAnswerChange = useCallback(async (itemId: string, value: Answer) => {
    const next = { ...answers, [itemId]: value };
    setAnswers(next);

    // Find which topic this item belongs to
    const topic = TOPICS.find(t => t.itens.some(i => i.id === itemId));
    if (topic && isTopicComplete(topic, next)) {
      setIsSavingDraft(true);
      await saveAuditDraft(locationId, next);
      setIsSavingDraft(false);
      // Auto-expand next topic
      const idx = TOPICS.findIndex(t => t.id === topic.id);
      if (idx < TOPICS.length - 1) {
        const nextTopic = TOPICS[idx + 1];
        setExpanded(prev => ({ ...prev, [nextTopic.id]: true }));
      }
    }
  }, [answers, locationId]);

  const completedTopics = TOPICS.filter(t => isTopicComplete(t, answers)).length;
  const allComplete     = completedTopics === TOPICS.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allComplete) {
      toast({ title: "Atenção", description: "Preencha todos os tópicos antes de finalizar.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        const locId    = typeof location._id === 'string' ? location._id : location._id?.toString();
        const cleanId  = lastCleaning ? (typeof lastCleaning._id === 'string' ? lastCleaning._id : lastCleaning._id?.toString()) : null;
        const result   = await createAuditRecord({
          locationId: locId,
          locationName: `${location.name} - ${location.number}`,
          locationCode: location.externalCode || location.number,
          setor: location.setor,
          lastCleaningId: cleanId || null,
          checklistData: answers as any,
          observations,
        });
        if (result.success) {
          toast({ title: "Auditoria finalizada!", description: "Conferência registrada e local liberado." });
          setAnswers({});
          setObservations("");
          setOpen(false);
          router.push('/dashboard');
          router.refresh();
        } else {
          toast({ title: "Falha ao Salvar", description: result.error || "Erro interno.", variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "Erro Inesperado", description: "Tente novamente.", variant: "destructive" });
      }
    });
  };

  const toggleTopic = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Answer button renderer ────────────────────────────────────────────────
  const AnswerButtons = ({ itemId }: { itemId: string }) => {
    const val = answers[itemId];
    return (
      <div className="flex gap-1.5 flex-shrink-0">
        {(["conforme", "não_conforme", "n/a"] as const).map(opt => {
          const active = val === opt;
          const colors: Record<string, string> = {
            conforme:      active ? "bg-emerald-500 text-white border-emerald-500" : "border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-500",
            "não_conforme": active ? "bg-red-500 text-white border-red-500"        : "border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500",
            "n/a":         active ? "bg-gray-400 text-white border-gray-400"      : "border-gray-200 text-gray-400 hover:border-gray-400",
          };
          const labels: Record<string, string> = {
            conforme: "C", "não_conforme": "NC", "n/a": "N/A",
          };
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleAnswerChange(itemId, opt)}
              className={cn(
                "h-10 min-w-[46px] px-3 rounded-lg border text-xs font-black uppercase tracking-wide transition-all active:scale-95",
                colors[opt]
              )}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl w-[95vw] max-h-[92vh] flex flex-col overflow-hidden bg-white border-[#A0E9FF]/40 p-0">

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#0F4C5C]">
            <ClipboardCheck className="h-5 w-5 text-[#A0E9FF]" />
            Checklist de Auditoria
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            {location.name} — {location.number}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="px-5 py-3 shrink-0 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0F4C5C]/60">
              Progresso
            </span>
            <div className="flex items-center gap-2">
              {isSavingDraft && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> salvando…
                </span>
              )}
              <span className="text-xs font-black text-[#0F4C5C]">
                {completedTopics}/{TOPICS.length} tópicos
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#A0E9FF] transition-all duration-500"
              style={{ width: `${(completedTopics / TOPICS.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {TOPICS.map(t => {
              const done = isTopicComplete(t, answers);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex-1 h-1 rounded-full transition-colors duration-300",
                    done ? "bg-emerald-400" : "bg-gray-200"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Topics list */}
        <form id="audit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {TOPICS.map(topic => {
              const done     = isTopicComplete(topic, answers);
              const isOpen   = expanded[topic.id] ?? false;
              const ncCount  = topic.itens.filter(i => answers[i.id] === 'não_conforme').length;

              return (
                <div key={topic.id} className="bg-white">
                  {/* Topic header */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleTopic(topic.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {done
                        ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 h-5 w-5" />
                        : <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      }
                      <span className={cn(
                        "font-bold text-sm truncate",
                        done ? "text-gray-700" : "text-[#0F4C5C]"
                      )}>
                        {topic.titulo}
                      </span>
                      {ncCount > 0 && (
                        <span className="ml-1 text-[10px] bg-red-100 text-red-600 font-black px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {ncCount} NC
                        </span>
                      )}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ml-2",
                      isOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Topic items */}
                  {isOpen && (
                    <div className="px-5 pb-4 space-y-2 bg-gray-50/60">
                      {topic.isConclusao ? (
                        /* Conclusão — APTO / NÃO APTO */
                        <div className="pt-3 grid grid-cols-2 gap-3">
                          {[
                            { val: 'conforme' as Answer,       label: 'APTO',     cls: 'bg-emerald-500 hover:bg-emerald-600 text-white', sel: 'ring-2 ring-emerald-400 ring-offset-1' },
                            { val: 'não_conforme' as Answer,   label: 'NÃO APTO', cls: 'bg-red-500 hover:bg-red-600 text-white',         sel: 'ring-2 ring-red-400 ring-offset-1'     },
                          ].map(({ val, label, cls, sel }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleAnswerChange('conclusao', val)}
                              className={cn(
                                "h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95",
                                cls,
                                answers['conclusao'] === val ? sel : 'opacity-70'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        topic.itens.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm"
                          >
                            <span className="text-xs font-medium text-gray-700 leading-tight flex-1 min-w-0 pr-2">
                              {item.label}
                            </span>
                            <AnswerButtons itemId={item.id} />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Observations */}
          <div className="px-5 py-4 border-t border-gray-100">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
              Observações Adicionais
            </label>
            <Textarea
              placeholder="Descreva observações relevantes encontradas na auditoria…"
              className="min-h-[80px] rounded-xl border-[#A0E9FF]/50 focus-visible:ring-[#A0E9FF]/40 text-[#0F4C5C] text-sm resize-none"
              value={observations}
              onChange={e => setObservations(e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 shrink-0 border-t border-gray-100 bg-white">
          {!allComplete && (
            <p className="text-[11px] text-center text-gray-400 mb-2">
              {TOPICS.length - completedTopics} tópico(s) pendente(s)
            </p>
          )}
          <Button
            type="submit"
            form="audit-form"
            disabled={!allComplete || isPending}
            className={cn(
              "w-full h-13 font-black uppercase tracking-widest text-xs rounded-2xl transition-all h-12",
              allComplete
                ? "bg-[#0F4C5C] hover:bg-[#0a3844] text-white shadow-lg"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {isPending
              ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              : <ShieldCheck className="mr-2 h-5 w-5" />
            }
            Finalizar Auditoria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState, useMemo } from "react";
import { generateReport } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Download } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportsDialogProps {
  children: React.ReactNode;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Gerar Relatório
    </Button>
  );
}

const months = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
];

export function ReportsDialog({ children }: ReportsDialogProps) {
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(generateReport, null);
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const years = useMemo(() => Array.from({ length: 5 }, (_, i) => String(currentYear - i)), [currentYear]);

    const reportPeriodLabel = useMemo(() => {
        if (!state?.report?.filters) return null;
        const { month, year } = state.report.filters;
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    }, [state?.report?.filters]);

    return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>📈 Relatório de Higienizações</DialogTitle>
          <DialogDescription>
            Filtre e gere relatórios de desempenho da equipe de limpeza.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-6 pt-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-4 rounded-md border p-4">
                <h3 className="font-semibold text-lg">Filtros</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="month">Mês</Label>
                        <Select name="month" defaultValue={String(currentMonth)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="year">Ano</Label>
                        <Select name="year" defaultValue={String(currentYear)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Tipo de Limpeza</Label>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="concurrent" name="cleaningTypes" value="concurrent" defaultChecked />
                            <Label htmlFor="concurrent">Limpeza Concorrente</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terminal" name="cleaningTypes" value="terminal" defaultChecked />
                            <Label htmlFor="terminal">Limpeza Terminal</Label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button variant="outline" disabled><Download className="mr-2"/>Exportar</Button>
                <SubmitButton />
            </div>

            {state?.error && (
                <p className="text-sm text-destructive mt-2 text-center">{state.error}</p>
            )}

            {state?.success && state.report && (
                <div className="mt-6 space-y-4">
                    <Separator />
                    <div className="text-center">
                        <h3 className="font-semibold text-lg">Resultados do Relatório</h3>
                        {reportPeriodLabel && <p className="text-sm text-muted-foreground capitalize">{reportPeriodLabel}</p>}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="rounded-lg border p-4 space-y-2">
                            <h4 className="font-semibold">Resumo Geral</h4>
                            <p>Total de Higienizações: <span className="font-bold">{state.report.total}</span></p>
                        </div>
                        <div className="rounded-lg border p-4 space-y-2">
                            <h4 className="font-semibold">Detalhamento por Tipo</h4>
                            <p>Limpeza Concorrente: <span className="font-bold">{state.report.concurrent}</span> (Média: <span className="font-bold">{state.report.avgConcurrentTime} min</span>)</p>
                            <p>Limpeza Terminal: <span className="font-bold">{state.report.terminal}</span> (Média: <span className="font-bold">{state.report.avgTerminalTime} min</span>)</p>
                        </div>
                        <div className="rounded-lg border p-4 space-y-2 bg-card">
                            <h4 className="font-semibold">Desempenho</h4>
                            <p>Dentro do Prazo: <span className="font-bold text-green-600">{state.report.onTime} ({state.report.onTimePercent.toFixed(1)}%)</span></p>
                            <p>Com Atraso: <span className="font-bold text-destructive">{state.report.delayed} ({state.report.delayedPercent.toFixed(1)}%)</span></p>
                        </div>
                        <div className="rounded-lg border p-4 space-y-2 bg-card">
                            <h4 className="font-semibold">Detalhamento dos Atrasos</h4>
                            <p>Atrasos (Concorrente): <span className="font-bold">{state.report.delayedConcurrent}</span></p>
                            <p>Atrasos (Terminal): <span className="font-bold">{state.report.delayedTerminal}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

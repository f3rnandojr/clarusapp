
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState, useMemo } from "react";
import { generateReport } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Download, Filter, Calendar as CalendarIcon, ClipboardList, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "./ui/input";

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
    
    const [periodType, setPeriodType] = useState<'month' | 'range'>('month');
    const [scope, setScope] = useState<'general' | 'delays' | 'nc'>('general');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const years = useMemo(() => Array.from({ length: 5 }, (_, i) => String(currentYear - i)), [currentYear]);

    const reportPeriodLabel = useMemo(() => {
        if (!state?.report?.filters) return null;
        const { periodType, month, year, startDate, endDate } = state.report.filters;
        
        if (periodType === 'month') {
            const m = month || String(currentMonth);
            const y = year || String(currentYear);
            const date = new Date(parseInt(y), parseInt(m) - 1);
            return format(date, "MMMM 'de' yyyy", { locale: ptBR });
        } else {
            if (!startDate || !endDate) return "Período personalizado";
            return `De ${format(new Date(startDate), 'dd/MM/yy')} até ${format(new Date(endDate), 'dd/MM/yy')}`;
        }
    }, [state?.report?.filters, currentMonth, currentYear]);

    return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>📈 Central de Relatórios Inteligentes</DialogTitle>
          <DialogDescription>
            Extraia dados consolidados de desempenho, atrasos e não conformidades.
          </DialogDescription>
        </DialogHeader>
        
        <form action={formAction} className="flex-1 overflow-y-auto px-1 space-y-6 pt-2 pb-4 scroll-container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lado Esquerdo: Escopo e Tipos */}
                <div className="space-y-4 rounded-md border p-4 bg-muted/20">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Escopo do Relatório</h3>
                    
                    <RadioGroup name="scope" value={scope} onValueChange={(v: any) => setScope(v)} className="grid grid-cols-1 gap-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="general" id="scope-general" />
                            <Label htmlFor="scope-general" className="font-normal cursor-pointer">Geral (Consolidado)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="delays" id="scope-delays" />
                            <Label htmlFor="scope-delays" className="font-normal cursor-pointer">Apenas Ocorrências de Atraso</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="nc" id="scope-nc" />
                            <Label htmlFor="scope-nc" className="font-normal cursor-pointer">Apenas Não Conformidades (NC)</Label>
                        </div>
                    </RadioGroup>

                    {scope !== 'nc' && (
                        <div className="pt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Tipo de Higienização</Label>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="rep-concurrent" name="cleaningTypes" value="concurrent" defaultChecked />
                                    <Label htmlFor="rep-concurrent" className="text-xs font-normal cursor-pointer">Concorrente</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="rep-terminal" name="cleaningTypes" value="terminal" defaultChecked />
                                    <Label htmlFor="rep-terminal" className="text-xs font-normal cursor-pointer">Terminal</Label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lado Direito: Período */}
                <div className="space-y-4 rounded-md border p-4 bg-muted/20">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Período Detalhado</h3>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Button 
                            type="button" 
                            size="sm" 
                            variant={periodType === 'month' ? 'default' : 'outline'}
                            onClick={() => setPeriodType('month')}
                            className="h-7 text-[10px] sm:text-xs"
                        >Mês/Ano</Button>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant={periodType === 'range' ? 'default' : 'outline'}
                            onClick={() => setPeriodType('range')}
                            className="h-7 text-[10px] sm:text-xs"
                        >Data Específica</Button>
                        <input type="hidden" name="periodType" value={periodType} />
                    </div>

                    {periodType === 'month' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="month" className="text-xs">Mês</Label>
                                <Select name="month" defaultValue={String(currentMonth)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="year" className="text-xs">Ano</Label>
                                <Select name="year" defaultValue={String(currentYear)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="startDate" className="text-xs">Início</Label>
                                <Input id="startDate" name="startDate" type="date" className="h-8" required={periodType === 'range'} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="endDate" className="text-xs">Fim</Label>
                                <Input id="endDate" name="endDate" type="date" className="h-8" required={periodType === 'range'} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button variant="outline" type="button" disabled className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4"/>Exportar</Button>
                <SubmitButton />
            </div>

            {state?.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive text-center">
                    {state.error}
                </div>
            )}

            {state?.success && state.report && (
                <div className="mt-2 space-y-6 pb-6">
                    <Separator />
                    <div className="text-center">
                        <h3 className="font-semibold text-base sm:text-lg flex items-center justify-center gap-2">
                            {state.report.scope === 'general' && <ClipboardList className="h-5 w-5 text-primary" />}
                            {state.report.scope === 'delays' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                            {state.report.scope === 'nc' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                            Resultados: {state.report.scope === 'general' ? 'Resumo Geral' : state.report.scope === 'delays' ? 'Ocorrências de Atraso' : 'Não Conformidades'}
                        </h3>
                        {reportPeriodLabel && <p className="text-xs sm:text-sm text-muted-foreground capitalize">{reportPeriodLabel}</p>}
                    </div>
                    
                    {state.report.scope === 'general' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="rounded-lg border p-4 space-y-2 bg-card shadow-sm">
                                <h4 className="font-semibold text-primary">Volumetria</h4>
                                <div className="flex justify-between border-b pb-1"><span>Higienizações:</span> <span className="font-bold">{state.report.total}</span></div>
                                <div className="flex justify-between"><span>Não Conformidades:</span> <span className="font-bold text-destructive">{state.report.totalNCs}</span></div>
                            </div>
                            <div className="rounded-lg border p-4 space-y-2 bg-card shadow-sm">
                                <h4 className="font-semibold text-primary">Detalhamento</h4>
                                <div className="flex justify-between border-b pb-1"><span>Concorrente:</span> <span className="font-bold">{state.report.concurrent} (Média {state.report.avgConcurrentTime}m)</span></div>
                                <div className="flex justify-between"><span>Terminal:</span> <span className="font-bold">{state.report.terminal} (Média {state.report.avgTerminalTime}m)</span></div>
                            </div>
                            <div className="rounded-lg border p-4 space-y-2 bg-card shadow-sm sm:col-span-2 lg:col-span-1">
                                <h4 className="font-semibold text-primary">SLA e Prazos</h4>
                                <div className="flex justify-between border-b pb-1"><span>No Prazo:</span> <span className="font-bold text-green-600">{state.report.onTime} ({state.report.onTimePercent.toFixed(1)}%)</span></div>
                                <div className="flex justify-between"><span>Atrasados:</span> <span className="font-bold text-destructive">{state.report.delayed} ({state.report.delayedPercent.toFixed(1)}%)</span></div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="whitespace-nowrap">Data</TableHead>
                                        <TableHead className="whitespace-nowrap">Local</TableHead>
                                        <TableHead className="whitespace-nowrap">Responsável</TableHead>
                                        <TableHead className="whitespace-nowrap">{state.report.scope === 'delays' ? 'Atraso' : 'Relato'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {state.report.details && state.report.details.length > 0 ? (
                                        state.report.details.map((item: any) => (
                                            <TableRow key={item._id}>
                                                <TableCell className="text-[10px] sm:text-xs whitespace-nowrap">
                                                    {format(new Date(item.date || item.timestamp), 'dd/MM/yy HH:mm')}
                                                </TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">{item.locationName}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.userName}</TableCell>
                                                <TableCell className={cn("whitespace-nowrap", state.report.scope === 'delays' ? 'text-destructive font-bold' : 'text-[10px] sm:text-xs text-muted-foreground')}>
                                                    {state.report.scope === 'delays' 
                                                        ? `${item.actualDuration - item.expectedDuration} min`
                                                        : (item.description?.substring(0, 30) + (item.description?.length > 30 ? '...' : ''))
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                                Nenhum registro encontrado para este filtro.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

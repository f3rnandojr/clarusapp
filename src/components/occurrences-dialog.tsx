
"use client";

import { useState } from "react";
import type { CleaningOccurrence, NonConformity } from "@/lib/schemas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, AlertTriangle, X, BrainCircuit, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface OccurrencesDialogProps {
  occurrences: CleaningOccurrence[];
  nonConformities: NonConformity[];
  children: React.ReactNode;
}

export function OccurrencesDialog({ occurrences, nonConformities, children }: OccurrencesDialogProps) {
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Crítica': return 'destructive';
      case 'Alta': return 'destructive';
      case 'Média': return 'default';
      case 'Baixa': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-5xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>📊 Central de Eventos e Ocorrências</DialogTitle>
            <DialogDescription>
              Acompanhe atrasos e não conformidades registradas no sistema.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="delays" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="delays" className="text-xs sm:text-sm">
                <Clock className="mr-2 h-4 w-4 hidden sm:inline" />
                Atrasos ({occurrences.length})
              </TabsTrigger>
              <TabsTrigger value="ncs" className="text-xs sm:text-sm">
                <AlertTriangle className="mr-2 h-4 w-4 hidden sm:inline" />
                Não Conformidades ({nonConformities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="delays" className="mt-4">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="whitespace-nowrap">Local</TableHead>
                      <TableHead className="whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap">Responsável</TableHead>
                      <TableHead className="whitespace-nowrap">Atraso</TableHead>
                      <TableHead className="whitespace-nowrap">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occurrences.length > 0 ? occurrences.map((occ) => (
                      <TableRow key={occ._id.toString()}>
                        <TableCell className="font-medium whitespace-nowrap">{occ.locationName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={occ.cleaningType === 'concurrent' ? 'secondary' : 'default'}>
                            {occ.cleaningType === 'concurrent' ? 'Concorrente' : 'Terminal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{occ.userName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-bold text-destructive">{occ.delayInMinutes} min</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(occ.occurredAt), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                          Nenhuma ocorrência de atraso registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="ncs" className="mt-4">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="whitespace-nowrap">Local</TableHead>
                      <TableHead className="whitespace-nowrap">Prioridade (IA)</TableHead>
                      <TableHead className="whitespace-nowrap">Responsável</TableHead>
                      <TableHead className="whitespace-nowrap">Relato (Resumo)</TableHead>
                      <TableHead className="whitespace-nowrap">Evidência</TableHead>
                      <TableHead className="whitespace-nowrap">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonConformities.length > 0 ? nonConformities.map((nc) => (
                      <TableRow 
                        key={nc._id.toString()} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedNC(nc)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">{nc.locationName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {nc.aiPriority ? (
                            <Badge variant={getPriorityColor(nc.aiPriority)}>
                              {nc.aiPriority}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{nc.userName}</TableCell>
                        <TableCell className="max-w-[200px] truncate whitespace-nowrap">
                          {nc.description}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {nc.photoDataUri ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Eye className="h-3 w-3" /> Foto
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem foto</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(nc.timestamp), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                          Nenhuma não conformidade registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhe da NC */}
      <Dialog open={!!selectedNC} onOpenChange={(open) => !open && setSelectedNC(null)}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Detalhes da Não Conformidade
            </DialogTitle>
            <DialogDescription>
              Registrado por {selectedNC?.userName} em {selectedNC && format(new Date(selectedNC.timestamp), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">
              <div className="bg-muted p-2 rounded-md flex-1 min-w-[120px]">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Local</p>
                <p className="text-sm font-semibold">{selectedNC?.locationName}</p>
              </div>
              {selectedNC?.aiCategory && (
                <div className="bg-primary/5 p-2 rounded-md flex-1 min-w-[120px] border border-primary/10">
                  <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" /> Categoria (IA)
                  </p>
                  <p className="text-sm font-semibold">{selectedNC.aiCategory}</p>
                </div>
              )}
               {selectedNC?.aiPriority && (
                <div className={cn("p-2 rounded-md flex-1 min-w-[120px] border", 
                  selectedNC.aiPriority === 'Crítica' || selectedNC.aiPriority === 'Alta' ? "bg-destructive/5 border-destructive/10" : "bg-muted border-muted-foreground/10"
                )}>
                  <p className={cn("text-[10px] font-bold uppercase", 
                    selectedNC.aiPriority === 'Crítica' || selectedNC.aiPriority === 'Alta' ? "text-destructive" : "text-muted-foreground"
                  )}>Prioridade (IA)</p>
                  <p className="text-sm font-semibold">{selectedNC.aiPriority}</p>
                </div>
              )}
            </div>

            {selectedNC?.photoDataUri && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-black/5">
                <Image 
                  src={selectedNC.photoDataUri} 
                  alt="Evidência da Não Conformidade" 
                  fill 
                  className="object-contain"
                />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase">Descrição do Colaborador</p>
              <div className="bg-muted/50 p-3 rounded-md italic">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  "{selectedNC?.description}"
                </p>
              </div>
            </div>

            {selectedNC?.aiAnalysis && (
               <div className="space-y-1 bg-accent/5 p-3 rounded-md border border-accent/20">
                <p className="text-xs font-bold text-accent uppercase flex items-center gap-1">
                  <Info className="h-3 w-3" /> Análise Técnica da IA
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedNC.aiAnalysis}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" className="w-full" onClick={() => setSelectedNC(null)}>
              <X className="mr-2 h-4 w-4" /> Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

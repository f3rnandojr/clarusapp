"use client";

import { useState } from "react";
import type { CleaningOccurrence, NonConformity } from "@/lib/schemas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, AlertTriangle, X } from "lucide-react";
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

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-5xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base sm:text-xl flex items-center gap-2">
              <span className="hidden sm:inline">📊</span> Central de Eventos e Ocorrências
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Acompanhe atrasos e não conformidades registradas no sistema.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="delays" className="mt-4 flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="delays" className="text-[10px] sm:text-sm h-8">
                <Clock className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                Atrasos ({occurrences.length})
              </TabsTrigger>
              <TabsTrigger value="ncs" className="text-[10px] sm:text-sm h-8">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5 hidden sm:inline" />
                Não Conformidades ({nonConformities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="delays" className="mt-4 flex-1 overflow-hidden">
              <div className="h-full overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4">Local</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4">Responsável</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4 text-center">Atraso</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4 text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occurrences.length > 0 ? occurrences.map((occ) => (
                      <TableRow key={occ._id.toString()}>
                        <TableCell className="font-medium whitespace-nowrap text-[11px] sm:text-sm px-2 sm:px-4">{occ.locationName}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 sm:px-4">
                          <Badge variant={occ.cleaningType === 'concurrent' ? 'secondary' : 'default'} className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-5">
                            {occ.cleaningType === 'concurrent' ? 'Concorrente' : 'Terminal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[11px] sm:text-sm px-2 sm:px-4">{occ.userName}</TableCell>
                        <TableCell className="whitespace-nowrap text-center px-2 sm:px-4">
                          <span className="font-bold text-destructive text-[11px] sm:text-sm">{occ.delayInMinutes} min</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-[10px] sm:text-sm px-2 sm:px-4 text-muted-foreground">
                          {format(new Date(occ.occurredAt), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-xs">
                          Nenhuma ocorrência de atraso registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="ncs" className="mt-4 flex-1 overflow-hidden">
              <div className="h-full overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4">Local</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4">Responsável</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4">Relato (Resumo)</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4 text-center">Evidência</TableHead>
                      <TableHead className="whitespace-nowrap text-[10px] sm:text-xs px-2 sm:px-4 text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonConformities.length > 0 ? nonConformities.map((nc) => (
                      <TableRow 
                        key={nc._id.toString()} 
                        className="cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                        onClick={() => setSelectedNC(nc)}
                      >
                        <TableCell className="font-medium whitespace-nowrap text-[11px] sm:text-sm px-2 sm:px-4">{nc.locationName}</TableCell>
                        <TableCell className="whitespace-nowrap text-[11px] sm:text-sm px-2 sm:px-4">{nc.userName}</TableCell>
                        <TableCell className="max-w-[120px] sm:max-w-[200px] truncate text-[11px] sm:text-sm px-2 sm:px-4">
                          {nc.description}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center px-2 sm:px-4">
                          {nc.photoDataUri ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit mx-auto text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-5 text-accent border-accent/30 bg-accent/5">
                              <Eye className="h-2.5 w-2.5" /> Foto
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Sem foto</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-[10px] sm:text-sm px-2 sm:px-4 text-muted-foreground">
                          {format(new Date(nc.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-xs">
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
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Detalhes do Relato
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registrado por {selectedNC?.userName} em {selectedNC && format(new Date(selectedNC.timestamp), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="bg-muted/50 p-2 rounded-md flex-1 min-w-[120px]">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Localização</p>
                <p className="text-sm font-bold text-foreground">{selectedNC?.locationName}</p>
              </div>
            </div>

            {selectedNC?.photoDataUri && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border shadow-inner bg-black/5">
                <Image 
                  src={selectedNC.photoDataUri} 
                  alt="Evidência da Não Conformidade" 
                  fill 
                  className="object-contain"
                />
              </div>
            )}

            <div className="space-y-1.5 pb-4">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Descrição do Problema</p>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed italic">
                  "{selectedNC?.description}"
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 pt-2 shrink-0 bg-muted/20 border-t">
            <Button variant="outline" className="w-full font-bold uppercase text-xs tracking-wider" onClick={() => setSelectedNC(null)}>
              <X className="mr-2 h-4 w-4" /> Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
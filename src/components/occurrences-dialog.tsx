
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>📊 Central de Eventos e Ocorrências</DialogTitle>
            <DialogDescription>
              Acompanhe atrasos e não conformidades registradas no sistema.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="delays" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="delays">
                <Clock className="mr-2 h-4 w-4" />
                Atrasos ({occurrences.length})
              </TabsTrigger>
              <TabsTrigger value="ncs">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Não Conformidades ({nonConformities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="delays" className="mt-4">
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead>Tipo de Limpeza</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Atraso (min)</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {occurrences.length > 0 ? occurrences.map((occ) => (
                      <TableRow key={occ._id.toString()}>
                        <TableCell className="font-medium">{occ.locationName}</TableCell>
                        <TableCell>
                          <Badge variant={occ.cleaningType === 'concurrent' ? 'secondary' : 'default'}>
                            {occ.cleaningType === 'concurrent' ? 'Concorrente' : 'Terminal'}
                          </Badge>
                        </TableCell>
                        <TableCell>{occ.userName}</TableCell>
                        <TableCell>
                          <span className="font-bold text-destructive">{occ.delayInMinutes} min</span>
                        </TableCell>
                        <TableCell>{format(new Date(occ.occurredAt), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
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
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Relato (Resumo)</TableHead>
                      <TableHead>Evidência</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonConformities.length > 0 ? nonConformities.map((nc) => (
                      <TableRow 
                        key={nc._id.toString()} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedNC(nc)}
                      >
                        <TableCell className="font-medium">{nc.locationName}</TableCell>
                        <TableCell>{nc.userName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {nc.description}
                        </TableCell>
                        <TableCell>
                          {nc.photoDataUri ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Eye className="h-3 w-3" /> Foto
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem foto</span>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(nc.timestamp), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
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

      {/* Modal de Detalhe da NC (Clique Mágico) */}
      <Dialog open={!!selectedNC} onOpenChange={(open) => !open && setSelectedNC(null)}>
        <DialogContent className="sm:max-w-[500px]">
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
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-semibold mb-1">Local:</p>
              <p className="text-sm">{selectedNC?.locationName}</p>
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
              <p className="text-sm font-semibold">Descrição completa:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {selectedNC?.description}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedNC(null)}>
              <X className="mr-2 h-4 w-4" /> Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

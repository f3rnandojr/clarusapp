"use client";

import type { CleaningOccurrence } from "@/lib/schemas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OccurrencesDialogProps {
  occurrences: CleaningOccurrence[];
  children: React.ReactNode;
}

export function OccurrencesDialog({ occurrences, children }: OccurrencesDialogProps) {

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>📋 Ocorrências de Atraso</DialogTitle>
          <DialogDescription>
            Lista de higienizações que ultrapassaram o tempo esperado.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto mt-4">
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
                            <TableCell>{format(new Date(occ.occurredAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Nenhuma ocorrência de atraso registrada.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getLogs } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface LogsDialogProps {
  children: React.ReactNode;
}

type LogEntry = {
  _id: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
  user: string;
}

export function LogsDialog({ children }: LogsDialogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const fetchedLogs = await getLogs();
      // @ts-ignore
      setLogs(fetchedLogs || []); // Garante que logs seja sempre um array
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setLogs([]); // Em caso de erro, define como array vazio
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>📄 Logs da Aplicação</DialogTitle>
          <DialogDescription>
            Atividades recentes registradas no sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Button onClick={fetchLogs} disabled={loading} size="sm" variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Logs
            </Button>
        </div>
        <ScrollArea className="h-[60vh] mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Detalhes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.length > 0 ? logs.map((log) => (
                        <TableRow key={log._id}>
                            <TableCell className="text-xs">
                                {format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{log.user}</TableCell>
                            <TableCell>
                                <Badge variant="secondary">{log.action}</Badge>
                            </TableCell>
                             <TableCell>
                                <Badge variant={log.details.result === 'success' ? 'default' : 'destructive'}>
                                    {log.details.result}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                               <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(log.details, null, 2)}
                               </pre>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {loading ? "Carregando logs..." : "Nenhum log encontrado."}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Location, LocationStatus, User, ScheduledRequest } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { QrCode, Hospital, LogOut, User as UserIcon, Bell, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout, acceptRequest } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SetorGroup = {
  nome: string;
  locais: Location[];
};

const statusIndicatorClasses: Record<LocationStatus, string> = {
    available: 'bg-green-500',
    in_cleaning: 'bg-yellow-500 animate-pulse',
    occupied: 'bg-orange-500',
};

const statusTextClasses: Record<LocationStatus, string> = {
    available: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    in_cleaning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    occupied: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
};

const statusText: Record<LocationStatus, string> = {
    available: 'Disponível',
    in_cleaning: 'Em Higienização',
    occupied: 'Ocupado'
}

const profileLabels: Record<string, string> = {
    admin: 'Admin',
    gestor: 'Gestor',
    usuario: 'Usuário',
};

interface UserDashboardProps {
    locations: Location[];
    user: User;
    pendingRequests: ScheduledRequest[];
}

export function UserDashboard({ locations, user, pendingRequests: initialPendingRequests }: UserDashboardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
    const [isAccepting, startAcceptingTransition] = useTransition();

    const filteredLocations = useMemo(() => {
        if (!searchTerm) {
            return locations;
        }
        return locations.filter(loc => 
            loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.setor.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [locations, searchTerm]);

    const setoresAgrupados: SetorGroup[] = useMemo(() => {
        const grupos: Record<string, Location[]> = filteredLocations.reduce((acc, local) => {
          const setor = local.setor || 'Sem Setor';
          if (!acc[setor]) {
            acc[setor] = [];
          }
          acc[setor].push(local);
          return acc;
        }, {} as Record<string, Location[]>);

        return Object.entries(grupos).map(([nome, locais]) => ({
          nome,
          locais,
        })).sort((a,b) => a.nome.localeCompare(b.nome));
    }, [filteredLocations]);

    const handleScanClick = () => {
        // Esta funcionalidade dependeria de uma biblioteca de scanner QR
        // Por agora, vamos apenas simular ou redirecionar
        toast({ title: "Scanner Ativado", description: "Aponte para um QR code para iniciar a limpeza."});
    };
    
    const handleAcceptRequest = async (requestId: string) => {
        startAcceptingTransition(async () => {
            const result = await acceptRequest(requestId);
            if (result.success) {
                toast({ title: 'Sucesso!', description: result.message });
                // Atualiza a lista de pendentes removendo a que foi aceita
                setPendingRequests(prev => prev.filter(req => req._id.toString() !== requestId));
            } else {
                toast({ title: 'Erro', description: result.error, variant: 'destructive' });
            }
        });
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-accent">Basiclean</h1>
                </div>
                 <div className='flex items-center gap-4'>
                    <div className="relative">
                        <Button variant="outline" size="icon">
                            <Bell className="h-5 w-5" />
                        </Button>
                        {pendingRequests.length > 0 && (
                             <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs justify-center items-center">
                                    {pendingRequests.length}
                                </span>
                            </span>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="font-semibold text-sm flex items-center gap-2">
                           <UserIcon className="h-4 w-4 text-muted-foreground" />
                           {user.name}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize mt-0.5">
                           {profileLabels[user.perfil] || 'Usuário'}
                        </Badge>
                    </div>
                    <form action={logout}>
                        <Button variant="outline" type="submit">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </Button>
                    </form>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden">

                <div className="px-4 pb-4 flex-shrink-0">
                    <Button size="lg" className="w-full text-lg" onClick={handleScanClick}>
                        <QrCode className="mr-3 h-6 w-6" />
                        Escanear QR Code para Iniciar Higienização
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
                    <div className='flex flex-col gap-2'>
                        <h2 className='font-bold text-lg px-4'>Solicitações Pendentes</h2>
                         <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-2">
                             {pendingRequests.length > 0 ? (
                                pendingRequests.map(req => (
                                    <Card key={req._id.toString()}>
                                        <CardHeader className="p-3">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                <span>{req.locationName}</span>
                                                 <Badge variant={req.cleaningType === 'terminal' ? 'default' : 'secondary'}>
                                                    {req.cleaningType === 'terminal' ? 'Terminal' : 'Concorrente'}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0 text-sm text-muted-foreground flex justify-between items-center">
                                            <div>
                                                <p>Solicitado por: {req.requestedBy.userName}</p>
                                                <p>Há {formatDistanceToNowStrict(new Date(req.requestedAt), { locale: ptBR, addSuffix: false })}</p>
                                            </div>
                                             <Button 
                                                size="sm" 
                                                onClick={() => handleAcceptRequest(req._id.toString())}
                                                disabled={isAccepting}
                                            >
                                                {isAccepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                Aceitar e Iniciar
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                             ) : (
                                <div className="text-center text-muted-foreground italic py-10">Nenhuma solicitação pendente.</div>
                             )}
                        </div>
                    </div>
                     <div className='flex flex-col gap-2'>
                        <h2 className='font-bold text-lg px-4'>Consulta de Status</h2>
                         <div className="px-4 pb-2 flex-shrink-0">
                            <Input 
                                placeholder="Buscar por nome, número ou setor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-2">
                            {setoresAgrupados.map((setor) => (
                                <div key={setor.nome} className="border rounded-lg bg-card shadow-sm">
                                    <div className="flex justify-between items-center p-3 md:p-4 cursor-default">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <Hospital className="h-6 w-6 text-primary" />
                                            <div>
                                                <h3 className="font-semibold text-card-foreground">{setor.nome}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t bg-muted/30">
                                        {setor.locais.map((local) => (
                                            <div
                                            key={local._id.toString()}
                                            className="flex items-center gap-4 p-3 border-b last:border-b-0"
                                            >
                                            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusIndicatorClasses[local.status])} />
                                            
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                <span className="font-medium text-sm text-foreground">{local.name} - {local.number}</span>
                                                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusTextClasses[local.status])}>
                                                    {statusText[local.status]}
                                                </span>
                                                </div>
                                            </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}

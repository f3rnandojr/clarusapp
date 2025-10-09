
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Location, LocationStatus } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { QrCode, Hospital, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/actions';
import { Input } from './ui/input';

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

export function UserDashboard({ locations }: { locations: Location[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

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
        // Esta rota é um placeholder, o middleware irá interceptá-la
        // e, se o usuário estiver no celular, o navegador deve abrir
        // a câmera para escanear o QR code. No desktop, ele irá para /clean
        // que pode mostrar uma mensagem para o usuário.
        router.push('/clean');
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-accent">Basiclean</h1>
                </div>
                <form action={logout}>
                    <Button variant="outline" type="submit">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </form>
            </header>

            <main className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden">
                <div className="text-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-semibold">Consulta de Status</h2>
                    <p className="text-muted-foreground text-sm">Use o botão abaixo para escanear um QR Code e iniciar uma limpeza.</p>
                </div>

                <div className="px-4 pb-4 flex-shrink-0">
                    <Button size="lg" className="w-full text-lg" onClick={handleScanClick}>
                        <QrCode className="mr-3 h-6 w-6" />
                        Escanear QR Code
                    </Button>
                </div>
                
                <div className="px-4 pb-4 flex-shrink-0">
                    <Input 
                        placeholder="Buscar por nome, número ou setor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pb-4">
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
            </main>
        </div>
    );
}

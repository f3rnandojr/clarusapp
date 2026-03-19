"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Location, LocationStatus, User, ScheduledRequest, CleaningSettings, ActiveCleaning } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { QrCode, Hospital, LogOut, User as UserIcon, Bell, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout, acceptRequest, finishCleaning, getLocations, getPendingRequests, getLocationByCode } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from './ui/separator';
import LocationCard from './location-card';
import { StartCleaningDialog } from './start-cleaning-dialog';
import { QrScannerDialog } from './qr-scanner-dialog';

type SetorGroup = {
  nome: string;
  locais: Location[];
};

const statusIndicatorClasses: Record<LocationStatus, string> = {
    available: 'bg-emerald-500',
    in_cleaning: 'bg-sky-400 animate-pulse',
    occupied: 'bg-orange-500',
};

const statusTextClasses: Record<LocationStatus, string> = {
    available: 'bg-emerald-500/10 text-emerald-400',
    in_cleaning: 'bg-sky-500/10 text-sky-400',
    occupied: 'bg-orange-500/10 text-orange-400',
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
    auditor: 'Auditor',
};

interface UserDashboardProps {
    locations?: Location[];
    user: User;
    pendingRequests?: ScheduledRequest[];
    myActiveCleanings?: ActiveCleaning[];
    cleaningSettings: CleaningSettings;
}

export function UserDashboard({ 
    locations: initialLocations = [], 
    user, 
    pendingRequests: initialPendingRequests = [], 
    myActiveCleanings: initialMyActiveCleanings = [], 
    cleaningSettings 
}: UserDashboardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [allLocations, setAllLocations] = useState<Location[]>(initialLocations);
    const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
    
    const [isAccepting, startAcceptingTransition] = useTransition();
    const [isFinalizing, startFinalizingTransition] = useTransition();

    const [cleaningLocation, setCleaningLocation] = useState<Location | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    useEffect(() => {
        setAllLocations(initialLocations || []);
        setPendingRequests(initialPendingRequests || []);
    }, [initialLocations, initialPendingRequests]);

    const refreshData = async () => {
        try {
            const [refreshedLocations, refreshedRequests] = await Promise.all([
                getLocations(),
                getPendingRequests(),
            ]);
            setAllLocations(refreshedLocations || []);
            setPendingRequests(refreshedRequests || []);
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível atualizar os dados.', variant: 'destructive' });
        }
    };
    
    useEffect(() => {
        const handleStartCleaningByCode = async (code: string) => {
            const location = await getLocationByCode(code);
            if (location) {
                setCleaningLocation(location);
                setIsDialogOpen(true);
            } else {
                toast({ title: "Local não encontrado", description: `O código de local "${code}" não foi encontrado.`, variant: "destructive" });
            }
        };

        const startCleaningParam = searchParams.get('startCleaning');
        if (startCleaningParam) {
            handleStartCleaningByCode(startCleaningParam);
            router.replace('/dashboard', { scroll: false });
        }
    }, [searchParams, router, toast]);
    
    const myCleaningJobs = useMemo(() => {
      const locations = allLocations || [];
      return locations.filter(loc => 
        loc.status === 'in_cleaning' && 
        loc.currentCleaning?.userId === user._id
      );
    }, [allLocations, user._id]);

    const filteredLocations = useMemo(() => {
        const locations = allLocations || [];
        if (!searchTerm) {
            return locations;
        }
        const myJobIds = new Set(myCleaningJobs.map(job => job._id.toString()));
        return locations.filter(loc => {
            const isMyJob = myJobIds.has(loc._id.toString());
            if(isMyJob) return false;

            return loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (loc.setor && loc.setor.toLowerCase().includes(searchTerm.toLowerCase()))
        });
    }, [allLocations, searchTerm, myCleaningJobs]);

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

    const handleScanSuccess = (decodedText: string) => {
        let code = decodedText;
        if (decodedText.includes('/clean/')) {
            const parts = decodedText.split('/clean/');
            code = parts[parts.length - 1];
        }
        code = code.split('?')[0];
        
        toast({ title: "QR Code Lido", description: `Local identificado: ${code}` });
        handleStartCleaningByCode(code);
    };

    const handleStartCleaningByCode = async (code: string) => {
        const location = await getLocationByCode(code);
        if (location) {
            setCleaningLocation(location);
            setIsDialogOpen(true);
        } else {
            toast({ title: "Erro", description: `Local "${code}" não encontrado.`, variant: "destructive" });
        }
    };
    
    const handleAcceptRequest = async (requestId: string) => {
        startAcceptingTransition(async () => {
            const result = await acceptRequest(requestId);
            if (result.success) {
                toast({ title: 'Sucesso!', description: result.message });
                await refreshData();
            } else {
                toast({ title: 'Erro', description: result.error || "Não foi possível aceitar a solicitação.", variant: 'destructive' });
            }
        });
    };

    const handleFinalizeCleaning = async (locationId: string) => {
        startFinalizingTransition(async () => {
            const result = await finishCleaning(locationId);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: result.success,
                });
                await refreshData();
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Erro ao finalizar limpeza.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setCleaningLocation(null);
        refreshData();
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
             <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-sm shrink-0 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-sky-400 tracking-tighter">Basiclean</h1>
                </div>
                 <div className='flex items-center gap-4'>
                    <div className="relative">
                        <Button variant="outline" size="icon" className="border-slate-700 bg-slate-800/50 hover:bg-slate-700">
                            <Bell className="h-5 w-5 text-sky-400" />
                        </Button>
                        {pendingRequests.length > 0 && (
                             <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] font-bold justify-center items-center">
                                    {pendingRequests.length}
                                </span>
                            </span>
                        )}
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                           <UserIcon className="h-4 w-4 text-sky-400/60" />
                           {user.name}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-sky-500/20 text-sky-400/60 mt-0.5 px-1.5 h-4">
                           {profileLabels[user.perfil] || 'Usuário'}
                        </Badge>
                    </div>
                    <form action={logout}>
                        <Button variant="ghost" type="submit" size="sm" className="text-muted-foreground hover:text-white hover:bg-red-500/10">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline font-bold">Sair</span>
                        </Button>
                    </form>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 pb-20">
                
                <div className="flex justify-center px-4 pb-12 pt-4">
                    <Button 
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full max-w-[320px] h-16 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-2xl flex items-center justify-center gap-4 shadow-[0_8px_30px_rgb(56,189,248,0.3)] transition-all active:scale-95 group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <QrCode className="h-7 w-7 transition-transform group-hover:rotate-12" />
                        <span className="font-black tracking-widest uppercase text-sm">Escanear QR Code</span>
                    </Button>
                </div>

                {myCleaningJobs.length > 0 && (
                  <div className="mb-12">
                    <h2 className="font-black text-xs uppercase tracking-[0.3em] px-4 mb-6 text-sky-400 flex items-center gap-3">
                        <Sparkles className="h-4 w-4" /> {user.perfil === 'auditor' ? 'Minha Auditoria' : 'Minha Atividade'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
                      {myCleaningJobs.map(local => (
                        <LocationCard 
                          key={local._id.toString()} 
                          location={local} 
                          cleaningSettings={cleaningSettings}
                          onFinalizeClick={handleFinalizeCleaning}
                          isFinalizing={isFinalizing}
                          userProfile={user.perfil}
                          currentUserId={user._id}
                        />
                      ))}
                    </div>
                    <Separator className="my-10 bg-slate-800/50" />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    <div className='flex flex-col gap-6'>
                        <h2 className='font-black text-xs uppercase tracking-[0.3em] px-4 flex items-center gap-3 text-muted-foreground'>
                            <Bell className="h-4 w-4" />
                            Solicitações
                        </h2>
                         <div className="space-y-4 px-2">
                             {pendingRequests.length > 0 ? (
                                pendingRequests.map(req => (
                                    <Card key={req._id.toString()} className="bg-slate-800/30 border-slate-800 shadow-md hover:border-sky-500/30 transition-colors">
                                        <CardHeader className="p-5">
                                            <CardTitle className="text-lg flex justify-between items-start">
                                                <span className="font-black text-white tracking-tight">{req.locationName}</span>
                                                 <Badge variant="outline" className="border-sky-500/20 text-sky-400 bg-sky-500/5 text-[10px] font-black uppercase tracking-widest h-5 px-2">
                                                    {req.cleaningType === 'terminal' ? 'Terminal' : 'Concorrente'}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-5 pt-0 text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                            <div>
                                                <p className="flex items-center gap-2 font-medium"><UserIcon className="h-3.5 w-3.5 text-sky-400/60" /> {req.requestedBy.userName}</p>
                                                <p className="text-xs mt-1.5 font-bold text-sky-400/40 uppercase tracking-widest">Há {formatDistanceToNowStrict(new Date(req.requestedAt), { locale: ptBR, addSuffix: false })}</p>
                                            </div>
                                             <Button 
                                                className="w-full sm:w-auto bg-slate-100 hover:bg-white text-slate-900 font-black uppercase tracking-widest text-xs h-10 rounded-xl transition-all shadow-lg active:scale-95"
                                                size="sm" 
                                                onClick={() => handleAcceptRequest(req._id.toString())}
                                                disabled={isAccepting}
                                            >
                                                {isAccepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                Aceitar
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                             ) : (
                                <div className="text-center text-muted-foreground/40 font-bold uppercase tracking-widest text-xs py-16 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">Sem solicitações</div>
                             )}
                        </div>
                    </div>

                     <div className='flex flex-col gap-6'>
                        <h2 className='font-black text-xs uppercase tracking-[0.3em] px-4 flex items-center gap-3 text-muted-foreground'>
                            <Hospital className="h-4 w-4" />
                            Status Geral
                        </h2>
                          <div className="px-4">
                              <Input 
                                  placeholder="Localizar setor ou leito..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 h-12 rounded-xl focus:ring-sky-500/20"
                              />
                          </div>
                          <div className="space-y-6 px-2">
                          
                          {setoresAgrupados.length > 0 ? setoresAgrupados.map((setor) => (
                              <div key={setor.nome} className="border border-slate-800 bg-slate-900/30 rounded-2xl overflow-hidden shadow-sm">
                                  <div className="bg-slate-800/40 p-4 border-b border-slate-800">
                                      <div className="flex items-center gap-3">
                                          <Hospital className="h-4 w-4 text-sky-400" />
                                          <h3 className="font-black text-sm text-white uppercase tracking-wider">{setor.nome}</h3>
                                      </div>
                                  </div>
                                  <div className="divide-y divide-slate-800/50">
                                      {setor.locais.map((local) => (
                                          <div
                                          key={local._id.toString()}
                                          className="flex items-center gap-4 p-4 hover:bg-slate-800/20 transition-colors"
                                          >
                                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]', statusIndicatorClasses[local.status])} />
                                          
                                          <div className="flex-1">
                                              <div className="flex justify-between items-center gap-2">
                                              <span className="font-bold text-sm text-slate-200">{local.name} - {local.number}</span>
                                              <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-black whitespace-nowrap uppercase tracking-widest', statusTextClasses[local.status])}>
                                                  {statusText[local.status]}
                                              </span>
                                              </div>
                                          </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )) : (
                              <div className="text-center text-muted-foreground/40 font-bold uppercase tracking-widest text-xs py-16">Nenhum resultado</div>
                          )}
                      </div>
                    </div>
                </div>

            </main>
            
            <QrScannerDialog 
                open={isScannerOpen} 
                onOpenChange={setIsScannerOpen} 
                onScanSuccess={handleScanSuccess} 
            />

            {cleaningLocation && (
                <StartCleaningDialog
                    location={cleaningLocation}
                    userProfile={user.perfil}
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onCleaningStarted={handleDialogClose}
                />
            )}
        </div>
    );
}

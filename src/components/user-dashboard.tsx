"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Location, LocationStatus, User, ScheduledRequest, CleaningSettings, ActiveCleaning } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { QrCode, Hospital, LogOut, User as UserIcon, Bell, Loader2, CheckCircle, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout, acceptRequest, finishCleaning, getLocations, getPendingRequests, getLocationByCode } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from './ui/separator';
import LocationCard from './location-card';
import { StartCleaningDialog } from './start-cleaning-dialog';
import { QrScannerDialog } from './qr-scanner-dialog';
import Image from 'next/image';

type SetorGroup = {
  nome: string;
  locais: Location[];
};

const statusIndicatorClasses: Record<LocationStatus, string> = {
  available:   'bg-emerald-500',
  in_cleaning: 'bg-sky-400 animate-pulse',
  occupied:    'bg-orange-400',
};

const statusTextClasses: Record<LocationStatus, string> = {
  available:   'bg-emerald-50 text-emerald-700',
  in_cleaning: 'bg-sky-50 text-sky-700',
  occupied:    'bg-orange-50 text-orange-700',
};

const statusText: Record<LocationStatus, string> = {
  available:   'Disponível',
  in_cleaning: 'Higienizando',
  occupied:    'Ocupado',
};

const profileLabels: Record<string, string> = {
  admin:   'Admin',
  gestor:  'Gestor',
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
  cleaningSettings,
}: UserDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm]           = useState('');
  const [allLocations, setAllLocations]       = useState<Location[]>(initialLocations);
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [expandedSetores, setExpandedSetores] = useState<Record<string, boolean>>({});

  const [isAccepting, startAcceptingTransition]   = useTransition();
  const [isFinalizing, startFinalizingTransition] = useTransition();
  const [cleaningLocation, setCleaningLocation]   = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen]           = useState(false);
  const [isScannerOpen, setIsScannerOpen]         = useState(false);

  useEffect(() => {
    setAllLocations(initialLocations || []);
    setPendingRequests(initialPendingRequests || []);
  }, [initialLocations, initialPendingRequests]);

  const refreshData = async () => {
    try {
      const [locs, reqs] = await Promise.all([getLocations(), getPendingRequests()]);
      setAllLocations(locs || []);
      setPendingRequests(reqs || []);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar os dados.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const handleStartByCode = async (code: string) => {
      const location = await getLocationByCode(code);
      if (location) { setCleaningLocation(location); setIsDialogOpen(true); }
      else toast({ title: "Local não encontrado", description: `"${code}" não encontrado.`, variant: "destructive" });
    };
    const param = searchParams.get('startCleaning');
    if (param) { handleStartByCode(param); router.replace('/dashboard', { scroll: false }); }
  }, [searchParams, router, toast]);

  const myCleaningJobs = useMemo(() =>
    (allLocations || []).filter(loc =>
      loc.status === 'in_cleaning' && loc.currentCleaning?.userId === user._id
    ), [allLocations, user._id]);

  const filteredLocations = useMemo(() => {
    const locs = allLocations || [];
    if (!searchTerm) return locs;
    const myIds = new Set(myCleaningJobs.map(j => j._id.toString()));
    return locs.filter(loc => {
      if (myIds.has(loc._id.toString())) return false;
      return (
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loc.setor && loc.setor.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [allLocations, searchTerm, myCleaningJobs]);

  const setoresAgrupados: SetorGroup[] = useMemo(() => {
    const grupos: Record<string, Location[]> = filteredLocations.reduce((acc, local) => {
      const s = local.setor || 'Sem Setor';
      if (!acc[s]) acc[s] = [];
      acc[s].push(local);
      return acc;
    }, {} as Record<string, Location[]>);
    return Object.entries(grupos).map(([nome, locais]) => ({ nome, locais }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredLocations]);

  // default expanded = true
  const isSetorExpanded = (nome: string) => expandedSetores[nome] !== false;
  const toggleSetor = (nome: string) =>
    setExpandedSetores(prev => ({ ...prev, [nome]: !isSetorExpanded(nome) }));

  const handleScanSuccess = (decodedText: string) => {
    let code = decodedText;
    if (code.includes('/clean/')) code = code.split('/clean/').pop()!;
    code = code.split('?')[0];
    toast({ title: "QR Code Lido", description: `Código: ${code}` });
    handleStartCleaningByCode(code);
  };

  const handleStartCleaningByCode = async (code: string) => {
    const location = await getLocationByCode(code);
    if (location) { setCleaningLocation(location); setIsDialogOpen(true); }
    else toast({ title: "Erro", description: `Local "${code}" não encontrado.`, variant: "destructive" });
  };

  const handleAcceptRequest = async (requestId: string) => {
    startAcceptingTransition(async () => {
      const result = await acceptRequest(requestId);
      if (result.success) { toast({ title: 'Sucesso!', description: result.message }); await refreshData(); }
      else toast({ title: 'Erro', description: result.error || "Não foi possível aceitar.", variant: 'destructive' });
    });
  };

  const handleFinalizeCleaning = async (locationId: string) => {
    startFinalizingTransition(async () => {
      const result = await finishCleaning(locationId);
      if (result.success) { toast({ title: "Sucesso!", description: result.success }); await refreshData(); }
      else toast({ title: "Erro", description: result.error || "Erro ao finalizar.", variant: "destructive" });
    });
  };

  const handleDialogClose = () => { setIsDialogOpen(false); setCleaningLocation(null); refreshData(); };

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#A0E9FF]/50 bg-white shadow-sm shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="Basiclean" width={28} height={28} className="rounded-md" />
          <h1 className="text-lg font-black text-[#0F4C5C] tracking-tight">Basiclean</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-[#A0E9FF]/50 bg-white hover:bg-[#A0E9FF]/15 text-[#0F4C5C]"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] font-bold justify-center items-center">
                  {pendingRequests.length}
                </span>
              </span>
            )}
          </div>

          {/* User info */}
          <div className="text-right hidden sm:block">
            <div className="font-semibold text-sm text-[#0F4C5C] flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-[#0F4C5C]/40" />
              {user.name}
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase tracking-widest border-[#A0E9FF]/60 text-[#0F4C5C]/50 mt-0.5 px-1.5 h-4"
            >
              {profileLabels[user.perfil] || 'Usuário'}
            </Badge>
          </div>

          <form action={logout}>
            <Button
              variant="ghost"
              type="submit"
              size="sm"
              className="h-9 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Sair</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-4 pb-20 max-w-2xl mx-auto w-full space-y-8">

        {/* ── QR Code ─────────────────────────────────────────── */}
        <div className="pt-4">
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="w-full h-14 bg-[#A0E9FF] hover:bg-[#7ed8f0] text-[#0F4C5C] font-black uppercase tracking-widest rounded-2xl shadow-md active:scale-[.98] transition-all flex items-center justify-center gap-3"
          >
            <QrCode className="h-6 w-6" />
            Escanear QR Code
          </Button>
        </div>

        {/* ── My active jobs ──────────────────────────────────── */}
        {myCleaningJobs.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#0F4C5C] flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-[#A0E9FF]" />
              {user.perfil === 'auditor' ? 'Minha Auditoria' : 'Minha Atividade'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Separator className="mt-8 bg-gray-100" />
          </section>
        )}

        {/* ── Solicitações ────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#0F4C5C] flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-[#A0E9FF]" />
            Solicitações
            {pendingRequests.length > 0 && (
              <span className="ml-1 bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </h2>

          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div
                  key={req._id.toString()}
                  className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-[#A0E9FF] shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-bold text-[#0F4C5C] text-base leading-tight">{req.locationName}</span>
                    <Badge
                      variant="outline"
                      className="bg-[#A0E9FF]/15 border-[#A0E9FF]/50 text-[#0F4C5C] text-[9px] font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0"
                    >
                      {req.cleaningType === 'terminal' ? 'Terminal' : 'Concorrente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-4">
                    <UserIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    {req.requestedBy.userName}
                    <span className="text-xs text-gray-400">
                      · há {formatDistanceToNowStrict(new Date(req.requestedAt), { locale: ptBR, addSuffix: false })}
                    </span>
                  </p>
                  <Button
                    className="w-full h-12 bg-[#A0E9FF] hover:bg-[#7ed8f0] text-[#0F4C5C] font-black uppercase tracking-widest rounded-xl shadow-sm active:scale-[.98] transition-all"
                    onClick={() => handleAcceptRequest(req._id.toString())}
                    disabled={isAccepting}
                  >
                    {isAccepting
                      ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      : <CheckCircle className="mr-2 h-5 w-5" />}
                    Aceitar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-300 font-bold uppercase tracking-widest text-xs py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Sem solicitações
            </div>
          )}
        </section>

        {/* ── Status Geral ────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#0F4C5C] flex items-center gap-2 mb-4">
            <Hospital className="h-4 w-4 text-[#A0E9FF]" />
            Status Geral
          </h2>

          <div className="mb-3">
            <Input
              placeholder="Localizar setor ou leito..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border-[#A0E9FF]/60 h-11 rounded-xl focus:ring-[#A0E9FF]/30 text-[#0F4C5C] placeholder:text-gray-400"
            />
          </div>

          {setoresAgrupados.length > 0 ? (
            <div className="space-y-3">
              {setoresAgrupados.map((setor) => {
                const expanded = isSetorExpanded(setor.nome);
                return (
                  <div
                    key={setor.nome}
                    className="border border-[#A0E9FF]/40 rounded-xl bg-white shadow-sm overflow-hidden"
                  >
                    {/* Sector header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#A0E9FF]/10 transition-colors"
                      onClick={() => toggleSetor(setor.nome)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-[#A0E9FF]/20 p-1.5 rounded-lg flex-shrink-0">
                          <Hospital className="h-3.5 w-3.5 text-[#0F4C5C]" />
                        </div>
                        <span className="font-bold text-[14px] text-[#0F4C5C] truncate">{setor.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-[#0F4C5C]/50 uppercase tracking-widest">
                          {setor.locais.length} unid
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-gray-400 transform transition-transform duration-300',
                            expanded && 'rotate-180 text-[#0F4C5C]'
                          )}
                        />
                      </div>
                    </div>

                    {/* Location rows */}
                    {expanded && (
                      <div className="border-t border-[#A0E9FF]/20 divide-y divide-gray-50">
                        {setor.locais.map((local) => (
                          <div
                            key={local._id.toString()}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                statusIndicatorClasses[local.status]
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm text-gray-800">
                                {local.name} — {local.number}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap uppercase tracking-widest',
                                statusTextClasses[local.status]
                              )}
                            >
                              {statusText[local.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-300 font-bold uppercase tracking-widest text-xs py-10">
              Nenhum resultado
            </div>
          )}
        </section>

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

"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Location, User, CleaningSettings } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { QrCode, LogOut, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { logout, finishCleaning, getLocations, getLocationByCode } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { Badge } from './ui/badge';
import LocationCard from './location-card';
import { StartCleaningDialog } from './start-cleaning-dialog';
import { QrScannerDialog } from './qr-scanner-dialog';
import Image from 'next/image';

const profileLabels: Record<string, string> = {
  admin:   'Admin',
  gestor:  'Gestor',
  usuario: 'Colaborador',
  auditor: 'Auditor',
};

interface UserDashboardProps {
  locations?: Location[];
  user: User;
  pendingRequests?: any[];
  myActiveCleanings?: any[];
  cleaningSettings: CleaningSettings;
}

export function UserDashboard({
  locations: initialLocations = [],
  user,
  cleaningSettings,
}: UserDashboardProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { toast }    = useToast();

  const [allLocations, setAllLocations]         = useState<Location[]>(initialLocations);
  const [isFinalizing, startFinalizingTransition] = useTransition();
  const [cleaningLocation, setCleaningLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen]         = useState(false);
  const [isScannerOpen, setIsScannerOpen]       = useState(false);

  useEffect(() => { setAllLocations(initialLocations || []); }, [initialLocations]);

  const refreshData = async () => {
    try {
      const locs = await getLocations();
      setAllLocations(locs || []);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
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

  const handleFinalizeCleaning = async (locationId: string) => {
    startFinalizingTransition(async () => {
      const result = await finishCleaning(locationId);
      if (result.success) { toast({ title: "Sucesso!", description: result.success }); await refreshData(); }
      else toast({ title: "Erro", description: result.error || "Erro ao finalizar.", variant: "destructive" });
    });
  };

  const handleDialogClose = () => { setIsDialogOpen(false); setCleaningLocation(null); refreshData(); };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F0E8] dark:bg-slate-900">

      {/* Navbar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#A0E9FF]/50 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <Image src="/logo_32x32.png" alt="NAVI" width={28} height={28} className="rounded-md" />
          <h1 className="text-lg font-black text-[#0F4C5C] tracking-tight">NAVI</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="font-semibold text-sm text-[#0F4C5C] dark:text-[#A0E9FF] flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-[#0F4C5C]/40 dark:text-[#A0E9FF]/40 hidden sm:inline" />
              <span className="max-w-[120px] sm:max-w-none truncate">{user.name}</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-[#A0E9FF]/60 text-[#0F4C5C]/50 dark:text-[#A0E9FF]/60 mt-0.5 px-1.5 h-4">
              {profileLabels[user.perfil] || 'Usuário'}
            </Badge>
          </div>
          <ThemeToggle />
          <form action={logout}>
            <Button variant="ghost" type="submit" size="sm" className="h-9 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50">
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Sair</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-14 pb-16 gap-10">

        {/* Hero QR Button */}
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => setIsScannerOpen(true)}
            style={{ boxShadow: '0 8px 32px 0 rgba(160,233,255,0.55), 0 2px 8px 0 rgba(15,76,92,0.10)' }}
            className="w-full h-52 bg-[#A0E9FF] hover:bg-[#8de0f7] active:scale-[.97] transition-all rounded-3xl flex flex-col items-center justify-center gap-4 group"
          >
            <div className="w-24 h-24 rounded-2xl bg-white/35 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <QrCode className="h-12 w-12 text-[#0F4C5C]" strokeWidth={1.5} />
            </div>
            <span className="text-[#0F4C5C] font-black text-base tracking-widest uppercase">QR Code</span>
          </button>
          <p className="text-center text-xs text-gray-400 font-medium">
            Aponte a câmera para o código do leito ou sala
          </p>
        </div>

        {/* Active tasks */}
        {myCleaningJobs.length > 0 && (
          <section className="w-full max-w-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0F4C5C]/50">
                {user.perfil === 'auditor' ? 'Em Auditoria' : 'Em Limpeza'}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="space-y-3">
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
          </section>
        )}

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

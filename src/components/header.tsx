import type { Area, Asg, CleaningOccurrence, CleaningSettings, User, NonConformity } from '@/lib/schemas';
import { SettingsDialog } from '@/components/settings-dialog';
import { OccurrencesDialog } from '@/components/occurrences-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Settings, ClipboardList, LogOut, User as UserIcon } from 'lucide-react';
import { logout } from '@/lib/actions';
import { Badge } from './ui/badge';
import Image from 'next/image';

type HeaderProps = {
  asgs: Asg[];
  users: User[];
  nextAsgCode: string;
  cleaningSettings: CleaningSettings;
  occurrences: CleaningOccurrence[];
  nonConformities: NonConformity[];
  allAreas: Area[];
  user: User;
};

const profileLabels: Record<string, string> = {
  admin:   'Admin',
  gestor:  'Gestor',
  usuario: 'Usuário',
  auditor: 'Auditor',
};

export default function Header({ asgs, users, nextAsgCode, cleaningSettings, occurrences, nonConformities, allAreas, user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#A0E9FF]/50 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-2.5">
        <Image src="/logo_32x32.png" alt="navi" width={28} height={28} className="rounded-full" />
        <h1 className="text-lg font-black text-[#1565C0] tracking-tight">navi</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-semibold text-sm text-[#0F4C5C] dark:text-[#A0E9FF] flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5 text-[#0F4C5C]/40 dark:text-[#A0E9FF]/40 hidden sm:inline" />
            <span className="max-w-[120px] sm:max-w-none truncate">{user.name}</span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-widest border-[#A0E9FF]/60 text-[#0F4C5C]/50 dark:text-[#A0E9FF]/60 mt-0.5 px-1.5 h-4"
          >
            {profileLabels[user.perfil] || 'Usuário'}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <OccurrencesDialog occurrences={occurrences} nonConformities={nonConformities}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 border-[#A0E9FF]/50 text-[#0F4C5C] hover:bg-[#A0E9FF]/20 hover:border-[#A0E9FF] bg-white shadow-none"
            >
              <ClipboardList className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Ocorrências</span>
            </Button>
          </OccurrencesDialog>

          <SettingsDialog
            allAsgs={asgs}
            allUsers={users}
            nextAsgCode={nextAsgCode}
            cleaningSettings={cleaningSettings}
            allAreas={allAreas}
            userProfile={user.perfil}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 border-[#A0E9FF]/50 text-[#0F4C5C] hover:bg-[#A0E9FF]/20 hover:border-[#A0E9FF] bg-white shadow-none"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Ajustes</span>
            </Button>
          </SettingsDialog>

          <form action={logout}>
            <Button
              variant="ghost"
              type="submit"
              size="sm"
              className="h-9 px-3 text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Sair</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

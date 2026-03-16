import type { Area, Asg, CleaningOccurrence, CleaningSettings, User, NonConformity } from '@/lib/schemas';
import { SettingsDialog } from '@/components/settings-dialog';
import { OccurrencesDialog } from '@/components/occurrences-dialog';
import { Button } from '@/components/ui/button';
import { Settings, ClipboardList, LogOut, User as UserIcon } from 'lucide-react';
import { logout } from '@/lib/actions';
import { Badge } from './ui/badge';

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
    admin: 'Admin',
    gestor: 'Gestor',
    usuario: 'Usuário',
    auditor: 'Auditor',
};

export default function Header({ asgs, users, nextAsgCode, cleaningSettings, occurrences, nonConformities, allAreas, user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-sm shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-black text-sky-400 tracking-tighter">Basiclean</h1>
      </div>
      <div className='flex items-center gap-4'>
        <div className="text-right hidden sm:block">
            <div className="font-bold text-sm text-white flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-sky-400/60" />
                {user.name}
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-sky-500/20 text-sky-400/60 mt-0.5 px-1.5 h-4">
              {profileLabels[user.perfil] || 'Usuário'}
            </Badge>
        </div>

        <div className="flex items-center gap-2">
            <OccurrencesDialog occurrences={occurrences} nonConformities={nonConformities}>
                <Button variant="outline" size="sm" className="h-10 px-2 sm:px-4 border-slate-700 bg-slate-800/50 hover:bg-slate-700 shadow-lg">
                    <ClipboardList className="h-4 w-4 text-sky-400 sm:mr-2" />
                    <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Ocorrências</span>
                </Button>
            </OccurrencesDialog>
            <SettingsDialog allAsgs={asgs} allUsers={users} nextAsgCode={nextAsgCode} cleaningSettings={cleaningSettings} allAreas={allAreas}>
                <Button variant="outline" size="sm" className="h-10 px-2 sm:px-4 border-slate-700 bg-slate-800/50 hover:bg-slate-700 shadow-lg">
                    <Settings className="h-4 w-4 text-sky-400 sm:mr-2" />
                    <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Ajustes</span>
                </Button>
            </SettingsDialog>
            <form action={logout}>
              <Button variant="ghost" type="submit" size="sm" className="h-10 px-2 sm:px-4 text-muted-foreground hover:text-white hover:bg-red-500/10">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline font-bold uppercase tracking-widest text-xs">Sair</span>
              </Button>
            </form>
        </div>
      </div>
    </header>
  );
}

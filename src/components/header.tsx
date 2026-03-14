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
};

export default function Header({ asgs, users, nextAsgCode, cleaningSettings, occurrences, nonConformities, allAreas, user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-accent">Basiclean</h1>
      </div>
      <div className='flex items-center gap-4'>
        <div className="text-right hidden sm:block">
            <div className="font-semibold text-sm flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                {user.name}
            </div>
            <Badge variant="outline" className="text-xs capitalize mt-0.5">
              {profileLabels[user.perfil] || 'Usuário'}
            </Badge>
        </div>

        <div className="flex items-center gap-2">
            <OccurrencesDialog occurrences={occurrences} nonConformities={nonConformities}>
                <Button variant="outline" size="sm" className="h-9 px-2 sm:px-4">
                    <ClipboardList className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Ocorrências</span>
                </Button>
            </OccurrencesDialog>
            <SettingsDialog allAsgs={asgs} allUsers={users} nextAsgCode={nextAsgCode} cleaningSettings={cleaningSettings} allAreas={allAreas}>
                <Button variant="outline" size="sm" className="h-9 px-2 sm:px-4">
                    <Settings className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Configurações</span>
                </Button>
            </SettingsDialog>
            <form action={logout}>
              <Button variant="outline" type="submit" size="sm" className="h-9 px-2 sm:px-4">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
        </div>
      </div>
    </header>
  );
}

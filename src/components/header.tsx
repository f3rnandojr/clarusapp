import type { Area, Asg, CleaningOccurrence, CleaningSettings, User } from '@/lib/schemas';
import { SettingsDialog } from '@/components/settings-dialog';
import { OccurrencesDialog } from '@/components/occurrences-dialog';
import { Button } from '@/components/ui/button';
import { Settings, ClipboardList, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions';

type HeaderProps = {
  asgs: Asg[];
  users: User[];
  nextAsgCode: string;
  cleaningSettings: CleaningSettings;
  occurrences: CleaningOccurrence[];
  allAreas: Area[];
};

export default function Header({ asgs, users, nextAsgCode, cleaningSettings, occurrences, allAreas }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-accent">Basiclean</h1>
      </div>
      <div className='flex items-center gap-2'>
        <OccurrencesDialog occurrences={occurrences}>
            <Button variant="outline">
                <ClipboardList className="mr-2 h-4 w-4" />
                Ocorrências
            </Button>
        </OccurrencesDialog>
        <SettingsDialog allAsgs={asgs} allUsers={users} nextAsgCode={nextAsgCode} cleaningSettings={cleaningSettings} allAreas={allAreas}>
            <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
            </Button>
        </SettingsDialog>
        <form action={logout}>
          <Button variant="outline" type="submit">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}

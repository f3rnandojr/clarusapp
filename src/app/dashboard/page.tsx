
"use server";

import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas } from "@/lib/actions";
import { getSession } from "@/lib/session";
import { AdminDashboard } from "@/components/admin-dashboard";
import { UserDashboard } from "@/components/user-dashboard";

export default async function DashboardPage() {
  const session = await getSession();
  const userProfile = session?.user?.perfil || 'usuario';
  
  // Carregar todos os dados necessários para qualquer perfil
  const [
    locations,
    asgs,
    users,
    nextAsgCode,
    cleaningSettings,
    occurrences,
    areas,
  ] = await Promise.all([
    getLocations(),
    getAsgs(),
    getUsers(),
    getNextAsgCode(),
    getCleaningSettings(),
    getCleaningOccurrences(),
    getAreas(),
  ]);
  
  const dashboardData = {
    locations,
    asgs,
    users,
    nextAsgCode,
    cleaningSettings,
    occurrences,
    areas,
  };

  if (userProfile === 'usuario') {
    return <UserDashboard locations={locations} />;
  }
  
  // Admin e Gestor veem o dashboard completo
  return <AdminDashboard initialData={dashboardData} />;
}

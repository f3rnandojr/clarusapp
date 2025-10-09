
"use server";

import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas } from "@/lib/actions";
import { getSession } from "@/lib/session";
import { AdminDashboard } from "@/components/admin-dashboard";
import { UserDashboard } from "@/components/user-dashboard";
import type { User } from "@/lib/schemas";

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user as User | null;

  if (!user) {
    // Should be handled by middleware, but as a safeguard
    return null;
  }
  
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

  if (user.perfil === 'usuario') {
    return <UserDashboard locations={locations} user={user} />;
  }
  
  // Admin e Gestor veem o dashboard completo
  return <AdminDashboard initialData={dashboardData} user={user} />;
}

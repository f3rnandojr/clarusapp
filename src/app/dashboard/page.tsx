"use server";

import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getPendingRequests, getActiveCleanings, getNonConformities } from "@/lib/actions";
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
  // Adicionando tratamento defensivo para garantir que variáveis sejam arrays
  const [
    locationsResult,
    asgsResult,
    usersResult,
    nextAsgCodeResult,
    cleaningSettingsResult,
    occurrencesResult,
    areasResult,
    pendingRequestsResult,
    activeCleaningsResult,
    nonConformitiesResult,
  ] = await Promise.all([
    getLocations(),
    getAsgs(),
    getUsers(),
    getNextAsgCode(),
    getCleaningSettings(),
    getCleaningOccurrences(),
    getAreas(),
    getPendingRequests(),
    getActiveCleanings(),
    getNonConformities(),
  ]);

  const locations = locationsResult || [];
  const asgs = asgsResult || [];
  const users = usersResult || [];
  const nextAsgCode = nextAsgCodeResult || 'ASG001';
  const cleaningSettings = cleaningSettingsResult || { concurrent: 30, terminal: 45 };
  const occurrences = occurrencesResult || [];
  const areas = areasResult || [];
  const pendingRequests = pendingRequestsResult || [];
  const activeCleanings = activeCleaningsResult || [];
  const nonConformities = nonConformitiesResult || [];
  
  const dashboardData = {
    locations,
    asgs,
    users,
    nextAsgCode,
    cleaningSettings,
    occurrences,
    areas,
    nonConformities,
    pendingRequests,
  };

  // Usuários comuns e Auditores veem a interface simplificada (Scanner + Status)
  if (user.perfil === 'usuario' || user.perfil === 'auditor') {
    // Trava de segurança no filtro para evitar crash se activeCleanings for indefinido
    const myActiveCleanings = (activeCleanings || []).filter(ac => ac.userId === user._id);
    
    return (
      <UserDashboard 
        locations={locations} 
        user={user} 
        pendingRequests={pendingRequests} 
        myActiveCleanings={myActiveCleanings}
        cleaningSettings={cleaningSettings}
      />
    );
  }
  
  // Admin e Gestor veem o dashboard completo
  return <AdminDashboard initialData={dashboardData} user={user} />;
}

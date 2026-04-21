"use server";

import { getLocations, getAsgs, getNextAsgCode, getCleaningSettings, getCleaningOccurrences, getUsers, getAreas, getPendingRequests, getActiveCleanings, getNonConformities, getViewMode } from "@/lib/actions";
import { getSession } from "@/lib/session";
import { AdminDashboard } from "@/components/admin-dashboard";
import { UserDashboard } from "@/components/user-dashboard";
import { VisualizadorDashboard } from "@/components/visualizador-dashboard";
import type { User } from "@/lib/schemas";

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user as User | null;

  if (!user) {
    return null;
  }

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
    viewModeResult,
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
    getViewMode(),
  ]);

  const locations       = locationsResult || [];
  const asgs            = asgsResult || [];
  const users           = usersResult || [];
  const nextAsgCode     = nextAsgCodeResult || 'ASG001';
  const cleaningSettings = cleaningSettingsResult || { concurrent: 30, terminal: 45 };
  const occurrences     = occurrencesResult || [];
  const areas           = areasResult || [];
  const pendingRequests = pendingRequestsResult || [];
  const activeCleanings = activeCleaningsResult || [];
  const nonConformities = nonConformitiesResult || [];
  const viewMode        = viewModeResult || 'solicitation';

  const dashboardData = {
    locations, asgs, users, nextAsgCode, cleaningSettings,
    occurrences, areas, nonConformities, pendingRequests,
  };

  if (user.perfil === 'visualizador') {
    return (
      <VisualizadorDashboard
        locations={locations}
        user={user}
        cleaningSettings={cleaningSettings}
      />
    );
  }

  if (user.perfil === 'usuario' || user.perfil === 'auditor') {
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

  return <AdminDashboard initialData={dashboardData} user={user} viewMode={viewMode} />;
}

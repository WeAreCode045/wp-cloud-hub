import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

import StatsOverview from "../components/dashboard/StatsOverview";
import RecentPlugins from "../components/dashboard/RecentPlugins";
import RecentSites from "../components/dashboard/RecentSites";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: plugins = [] } = useQuery({
    queryKey: ['plugins', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allPlugins = await base44.entities.Plugin.list("-updated_date");
      return allPlugins.filter(p => p.created_by === user.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allSites = await base44.entities.Site.list("-updated_date");
      return allSites.filter(s => s.created_by === user.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const localPluginsCount = plugins.filter(p => !p.is_external).length;
  const remotePluginsCount = plugins.filter(p => p.is_external).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welkom terug, {user?.full_name?.split(" ")[0] || "Gebruiker"} 👋
          </h1>
          <p className="text-gray-600">Hier is een overzicht van je platform activiteiten</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-6">
          <StatsOverview 
            pluginsCount={plugins.length}
            localPluginsCount={localPluginsCount}
            remotePluginsCount={remotePluginsCount}
            sitesCount={sites.length}
          />
        </div>

        {/* Recent Items Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentSites sites={sites} allPlugins={plugins} />
          <RecentPlugins plugins={plugins} allSites={sites} />
        </div>
      </div>
    </div>
  );
}
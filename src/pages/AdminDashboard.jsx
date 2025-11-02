import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Users,
  Globe,
  Package,
  Ban,
  CheckCircle,
  Trash2,
  RefreshCw,
  Loader2,
  Eye,
  Settings,
  Crown
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatsOverview from "../components/dashboard/StatsOverview";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    if (currentUser.role !== "admin") {
      navigate(createPageUrl("Dashboard"));
    }
  };

  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites-admin'],
    queryFn: () => base44.entities.Site.list("-updated_date", 10),
    initialData: [],
  });

  const { data: allPlugins = [] } = useQuery({
    queryKey: ['all-plugins-admin'],
    queryFn: () => base44.entities.Plugin.list("-updated_date", 10),
    initialData: [],
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list("-created_date", 10),
    initialData: [],
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-admin'],
    queryFn: () => base44.entities.Team.list("-updated_date", 10),
    initialData: [],
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: () => base44.entities.Notification.list("-created_date"),
    initialData: [],
  });

  const syncAllSitesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncAllSitesPlugins', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-admin'] });
      queryClient.invalidateQueries({ queryKey: ['all-plugins-admin'] });
      alert('✅ Synchronisatie succesvol!');
    },
    onError: (error) => {
      alert('❌ Fout bij synchroniseren: ' + error.message);
    }
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (site) => {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_email: user.email,
        action: `Site verwijderd: ${site.name}`,
        entity_type: "site",
        entity_id: site.id,
        details: `URL: ${site.url}`
      });
      return base44.asServiceRole.entities.Site.delete(site.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-admin'] });
      alert('✅ Site succesvol verwijderd');
    },
  });

  const deletePluginMutation = useMutation({
    mutationFn: async (plugin) => {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_email: user.email,
        action: `Plugin verwijderd: ${plugin.name}`,
        entity_type: "plugin",
        entity_id: plugin.id,
        details: `Slug: ${plugin.slug}`
      });
      return base44.asServiceRole.entities.Plugin.delete(plugin.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-plugins-admin'] });
      alert('✅ Plugin succesvol verwijderd');
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (team) => {
      await base44.asServiceRole.entities.ActivityLog.create({
        user_email: user.email,
        action: `Team verwijderd: ${team.name}`,
        entity_type: "team",
        entity_id: team.id
      });
      return base44.asServiceRole.entities.Team.delete(team.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-teams-admin'] });
      alert('✅ Team succesvol verwijderd');
    },
  });

  const blockTeamMutation = useMutation({
    mutationFn: async (team) => {
      await base44.asServiceRole.entities.Team.update(team.id, {
        is_blocked: true
      });
      await base44.asServiceRole.entities.ActivityLog.create({
        user_email: user.email,
        action: `Team geblokkeerd: ${team.name}`,
        entity_type: "team",
        entity_id: team.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-teams-admin'] });
      alert('✅ Team succesvol geblokkeerd');
    },
  });

  const unblockTeamMutation = useMutation({
    mutationFn: async (team) => {
      await base44.asServiceRole.entities.Team.update(team.id, {
        is_blocked: false
      });
      await base44.asServiceRole.entities.ActivityLog.create({
        user_email: user.email,
        action: `Team gedeblokkeerd: ${team.name}`,
        entity_type: "team",
        entity_id: team.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-teams-admin'] });
      alert('✅ Team succesvol gedeblokkeerd');
    },
  });

  const getUserById = (userId) => allUsers.find(u => u.id === userId);

  const localPluginsCount = allPlugins.filter(p => !p.is_external).length;
  const remotePluginsCount = allPlugins.filter(p => p.is_external).length;
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500">Toegang geweigerd. Alleen admins kunnen deze pagina bekijken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500">Platform overzicht en beheer</p>
            </div>
            <Button
              onClick={() => syncAllSitesMutation.mutate()}
              disabled={syncAllSitesMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              {syncAllSitesMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span className="text-xs">Synchroniseren...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  <span className="text-xs">Sync Alle Sites</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <StatsOverview 
          pluginsCount={allPlugins.length}
          localPluginsCount={localPluginsCount}
          remotePluginsCount={remotePluginsCount}
          sitesCount={allSites.length}
        />

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* Sites Card */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Alle Sites ({allSites.length})
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={createPageUrl("Sites")}>
                    <span className="text-xs">Bekijk alle</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {allSites.slice(0, 5).map((site) => {
                  const owner = getUserById(site.owner_id);
                  const isDisabled = site.status === "error";
                  
                  return (
                    <div 
                      key={site.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isDisabled ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{site.name}</p>
                            {isDisabled && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs h-4 px-1.5">
                                <Ban className="w-2.5 h-2.5 mr-0.5" />
                                Uit
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{site.url}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {owner?.full_name || 'Onbekend'}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                            title="Bekijken"
                          >
                            <Link to={createPageUrl(`SiteDetail?id=${site.id}`)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Weet je zeker dat je "${site.name}" wilt verwijderen?`)) {
                                deleteSiteMutation.mutate(site);
                              }
                            }}
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Plugins Card */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Alle Plugins ({allPlugins.length})
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={createPageUrl("Plugins")}>
                    <span className="text-xs">Bekijk alle</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {allPlugins.slice(0, 5).map((plugin) => {
                  const owner = getUserById(plugin.owner_id);
                  const isDisabled = plugin.is_disabled;
                  
                  return (
                    <div 
                      key={plugin.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isDisabled ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{plugin.name}</p>
                            {isDisabled && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs h-4 px-1.5">
                                <Ban className="w-2.5 h-2.5 mr-0.5" />
                                Uit
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{plugin.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {owner?.full_name || 'Onbekend'}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                            title="Bekijken"
                          >
                            <Link to={createPageUrl(`PluginDetail?id=${plugin.id}`)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Weet je zeker dat je "${plugin.name}" wilt verwijderen?`)) {
                                deletePluginMutation.mutate(plugin);
                              }
                            }}
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Users Card */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Alle Gebruikers ({allUsers.length})
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={createPageUrl("UserManager")}>
                    <span className="text-xs">Bekijk alle</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {allUsers.slice(0, 5).map((u) => (
                  <div 
                    key={u.id}
                    className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                          {u.role === "admin" && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs h-4 px-1.5">
                              <Crown className="w-2.5 h-2.5 mr-0.5" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                          title="Bekijken"
                        >
                          <Link to={createPageUrl(`UserDetail?id=${u.id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teams Card */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Alle Teams ({allTeams.length})
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={createPageUrl("Teams")}>
                    <span className="text-xs">Bekijk alle</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {allTeams.slice(0, 5).map((team) => {
                  const owner = getUserById(team.owner_id);
                  const isBlocked = team.is_blocked;
                  
                  return (
                    <div 
                      key={team.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isBlocked ? 'border-red-200 bg-red-50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{team.name}</p>
                            {isBlocked && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs h-4 px-1.5">
                                <Ban className="w-2.5 h-2.5 mr-0.5" />
                                Geblokkeerd
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{team.description || 'Geen beschrijving'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {owner?.full_name || 'Onbekend'} • {team.members?.length || 0} leden
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {isBlocked ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => unblockTeamMutation.mutate(team)}
                              title="Deblokkeren"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                if (confirm(`Weet je zeker dat je "${team.name}" wilt blokkeren?`)) {
                                  blockTeamMutation.mutate(team);
                                }
                              }}
                              title="Blokkeren"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Weet je zeker dat je "${team.name}" wilt verwijderen?`)) {
                                deleteTeamMutation.mutate(team);
                              }
                            }}
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
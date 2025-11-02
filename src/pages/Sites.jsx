
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  Crown,
  Settings,
  Trash2,
  RefreshCw,
  Loader2,
  MoreVertical,
  Mail,
  Bell,
  Grid3x3,
  List
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import SendMessageDialog from "../components/messaging/SendMessageDialog";
import SendNotificationDialog from "../components/messaging/SendNotificationDialog";

export default function Sites() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSite, setNewSite] = useState({ name: "", url: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const isAdmin = user?.role === "admin";

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allSites = await base44.entities.Site.list("-updated_date");
      return allSites.filter(site => site.owner_type === "user" && site.owner_id === user.id);
    },
    enabled: !!user,
    initialData: [],
  });

  const createSiteMutation = useMutation({
    mutationFn: async (siteData) => {
      const currentUser = await base44.auth.me();
      const apiKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const newSite = await base44.entities.Site.create({
        name: siteData.name,
        url: siteData.url,
        api_key: apiKey,
        owner_type: "user",
        owner_id: currentUser.id,
        shared_with_teams: [],
        connection_status: "inactive"
      });

      await base44.entities.ActivityLog.create({
        user_email: currentUser.email,
        action: `Site toegevoegd: ${siteData.name}`,
        entity_type: "site",
        details: siteData.url
      });

      return newSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setShowAddDialog(false);
      setNewSite({ name: "", url: "" });
      toast({
        variant: "success",
        title: "Site toegevoegd",
        description: "De site is succesvol toegevoegd",
      });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (site) => {
      const user = await base44.auth.me();
      
      const allPlugins = await base44.entities.Plugin.list();
      for (const plugin of allPlugins) {
        const installedOn = plugin.installed_on || [];
        const updatedInstalledOn = installedOn.filter(entry => entry.site_id !== site.id);
        
        if (installedOn.length !== updatedInstalledOn.length) {
          await base44.entities.Plugin.update(plugin.id, {
            installed_on: updatedInstalledOn
          });
        }
      }
      
      await base44.entities.ActivityLog.create({
        user_email: user.email,
        action: `Site verwijderd: ${site.name}`,
        entity_type: "site",
        details: site.url
      });
      
      return base44.entities.Site.delete(site.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: "Site verwijderd",
        description: "De site is succesvol verwijderd",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (siteId) => {
      const response = await base44.functions.invoke('testSiteConnection', {
        site_id: siteId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      if (data.success) {
        toast({
          title: "Verbinding succesvol",
          description: `WordPress versie: ${data.wp_version || 'N/A'}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Verbinding mislukt",
          description: data.error,
        });
      }
    },
  });

  const handleAddSite = () => {
    if (newSite.name && newSite.url) {
      createSiteMutation.mutate(newSite);
    }
  };

  const handleTestConnection = (siteId) => {
    testConnectionMutation.mutate(siteId);
  };

  const handleOpenMessageDialog = (site) => {
    setSelectedSite(site);
    setShowMessageDialog(true);
  };

  const handleOpenNotificationDialog = (site) => {
    setSelectedSite(site);
    setShowNotificationDialog(true);
  };

  const filteredSites = sites.filter(site =>
    site.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "inactive":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-amber-100 text-amber-700 border-amber-200",
      error: "bg-red-100 text-red-700 border-red-200"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const SiteCard = ({ site }) => {
    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
        <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-100 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate text-gray-900">{site.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={`${getStatusBadge(site.connection_status)} text-xs`}>
                    {site.connection_status === "active" ? "Actief" : site.connection_status === "inactive" ? "Inactief" : "Fout"}
                  </Badge>
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Eigenaar
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {getStatusIcon(site.connection_status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenMessageDialog(site)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Bericht Sturen
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleOpenNotificationDialog(site)}>
                      <Bell className="w-4 h-4 mr-2" />
                      Notificatie Sturen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">URL</p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline truncate"
            >
              {site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>

          {site.wp_version && (
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">WordPress Versie</p>
              <p className="text-sm font-semibold text-gray-900">{site.wp_version}</p>
            </div>
          )}

          {site.connection_checked_at && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1 font-medium">Laatste Controle</p>
              <p className="text-xs text-gray-700">
                {format(new Date(site.connection_checked_at), "d MMM yyyy HH:mm", { locale: nl })}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button
              onClick={() => handleTestConnection(site.id)}
              disabled={testConnectionMutation.isPending}
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test
                </>
              )}
            </Button>
            <Button 
              asChild 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-md"
            >
              <Link to={createPageUrl(`SiteDetail?id=${site.id}`)}>
                <Settings className="w-4 h-4 mr-2" />
                Beheren
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Weet je zeker dat je "${site.name}" wilt verwijderen?`)) {
                  deleteSiteMutation.mutate(site);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const SiteListItem = ({ site }) => {
    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Globe className="w-7 h-7 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{site.name}</h3>
                {getStatusIcon(site.connection_status)}
                <Badge className={`${getStatusBadge(site.connection_status)} text-xs ml-auto`}>
                  {site.connection_status === "active" ? "Actief" : site.connection_status === "inactive" ? "Inactief" : "Fout"}
                </Badge>
              </div>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
              >
                {site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>

            {site.wp_version && (
              <div className="text-sm text-gray-600">
                WP: <span className="font-semibold text-gray-900">{site.wp_version}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleTestConnection(site.id)}
                disabled={testConnectionMutation.isPending}
                variant="outline"
                size="sm"
                className="hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button 
                asChild 
                size="sm" 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
              >
                <Link to={createPageUrl(`SiteDetail?id=${site.id}`)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Beheren
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hover:bg-gray-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenMessageDialog(site)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Bericht Sturen
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleOpenNotificationDialog(site)}>
                      <Bell className="w-4 h-4 mr-2" />
                      Notificatie Sturen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => {
                      if (confirm(`Weet je zeker dat je "${site.name}" wilt verwijderen?`)) {
                        deleteSiteMutation.mutate(site);
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Verwijderen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mijn Sites</h1>
            <p className="text-gray-600">Beheer je WordPress sites</p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Site Toevoegen
          </Button>
        </div>

        <Card className="border-0 shadow-lg mb-6 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Zoek sites op naam of URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-0 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex gap-1 border border-gray-200 rounded-xl p-1 bg-gray-50">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={`h-9 w-9 rounded-lg ${
                    viewMode === "grid" 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={`h-9 w-9 rounded-lg ${
                    viewMode === "list" 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredSites.length === 0 ? (
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "Geen sites gevonden" : "Nog geen sites"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? "Probeer een andere zoekterm" 
                  : "Voeg je eerste WordPress site toe om te beginnen"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Site Toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredSites.map((site) => (
              viewMode === "grid" ? (
                <SiteCard key={site.id} site={site} />
              ) : (
                <SiteListItem key={site.id} site={site} />
              )
            ))}
          </div>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nieuwe Site Toevoegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="site-name">Site Naam *</Label>
                <Input
                  id="site-name"
                  placeholder="Bijv: Mijn WordPress Site"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="site-url">Site URL *</Label>
                <Input
                  id="site-url"
                  placeholder="https://example.com"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                  required
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Inclusief https:// of http://
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddSite}
                  disabled={createSiteMutation.isPending || !newSite.name || !newSite.url}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                >
                  {createSiteMutation.isPending ? "Toevoegen..." : "Site Toevoegen"}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuleren
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {selectedSite && (
          <SendMessageDialog
            open={showMessageDialog}
            onOpenChange={setShowMessageDialog}
            user={user}
            context={{
              type: "site",
              id: selectedSite.id,
              name: selectedSite.name
            }}
          />
        )}

        {selectedSite && isAdmin && (
          <SendNotificationDialog
            open={showNotificationDialog}
            onOpenChange={setShowNotificationDialog}
            user={user}
            context={{
              type: "site",
              id: selectedSite.id,
              name: selectedSite.name
            }}
          />
        )}
      </div>
    </div>
  );
}

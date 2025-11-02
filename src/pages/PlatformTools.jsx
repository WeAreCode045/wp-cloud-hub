import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wrench, 
  Globe, 
  Package, 
  Trash2, 
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Users
} from "lucide-react";

export default function PlatformTools() {
  const [user, setUser] = useState(null);
  const [orphanedSites, setOrphanedSites] = useState([]);
  const [orphanedPlugins, setOrphanedPlugins] = useState([]);
  const [orphanedVersions, setOrphanedVersions] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferType, setTransferType] = useState(null); // 'site' or 'plugin'
  const [selectedItem, setSelectedItem] = useState(null);
  const [transferToType, setTransferToType] = useState("user"); // 'user' or 'team'
  const [transferToId, setTransferToId] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites'],
    queryFn: () => base44.entities.Site.list(),
    initialData: [],
  });

  const { data: allPlugins = [] } = useQuery({
    queryKey: ['all-plugins'],
    queryFn: () => base44.entities.Plugin.list(),
    initialData: [],
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
  });

  const scanOrphanedSites = async () => {
    setScanning(true);
    const orphaned = allSites.filter(site => {
      if (site.owner_type === "user") {
        return !allUsers.find(u => u.id === site.owner_id);
      } else if (site.owner_type === "team") {
        return !allTeams.find(t => t.id === site.owner_id);
      }
      return false;
    });
    setOrphanedSites(orphaned);
    setScanning(false);
  };

  const scanOrphanedPlugins = async () => {
    setScanning(true);
    const orphaned = allPlugins.filter(plugin => {
      if (plugin.owner_type === "user") {
        return !allUsers.find(u => u.id === plugin.owner_id);
      } else if (plugin.owner_type === "team") {
        return !allTeams.find(t => t.id === plugin.owner_id);
      }
      return false;
    });
    setOrphanedPlugins(orphaned);
    setScanning(false);
  };

  const scanOrphanedVersions = async () => {
    setScanning(true);
    const orphaned = [];
    
    allPlugins.forEach(plugin => {
      const versions = plugin.versions || [];
      versions.forEach(version => {
        if (!version.download_url || version.download_url === "") {
          orphaned.push({
            plugin_id: plugin.id,
            plugin_name: plugin.name,
            version: version.version,
            reason: "Geen download URL"
          });
        }
      });
    });
    
    setOrphanedVersions(orphaned);
    setScanning(false);
  };

  const transferOwnershipMutation = useMutation({
    mutationFn: async ({ type, item, toType, toId }) => {
      const updateData = {
        owner_type: toType,
        owner_id: toId
      };

      if (type === 'site') {
        await base44.entities.Site.update(item.id, updateData);
        await base44.entities.ActivityLog.create({
          user_email: user.email,
          action: `Site eigendom overgedragen: ${item.name}`,
          entity_type: "site",
          entity_id: item.id,
          details: `Naar ${toType}: ${toId}`
        });
      } else if (type === 'plugin') {
        await base44.entities.Plugin.update(item.id, updateData);
        await base44.entities.ActivityLog.create({
          user_email: user.email,
          action: `Plugin eigendom overgedragen: ${item.name}`,
          entity_type: "plugin",
          entity_id: item.id,
          details: `Naar ${toType}: ${toId}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites'] });
      queryClient.invalidateQueries({ queryKey: ['all-plugins'] });
      setShowTransferDialog(false);
      setSelectedItem(null);
      setTransferToId("");
      alert('✅ Eigendom succesvol overgedragen');
      
      // Refresh scan results
      if (transferType === 'site') {
        scanOrphanedSites();
      } else if (transferType === 'plugin') {
        scanOrphanedPlugins();
      }
    },
    onError: (error) => {
      alert('❌ Fout bij overdragen: ' + error.message);
    }
  });

  const cleanOrphanedSites = async () => {
    if (!confirm(`Weet je zeker dat je ${orphanedSites.length} verweesde sites wilt verwijderen?`)) {
      return;
    }
    
    setCleaning(true);
    try {
      for (const site of orphanedSites) {
        await base44.entities.Site.delete(site.id);
      }
      queryClient.invalidateQueries({ queryKey: ['all-sites'] });
      setOrphanedSites([]);
      alert('✅ Verweesde sites succesvol verwijderd');
    } catch (error) {
      alert('❌ Fout bij verwijderen: ' + error.message);
    }
    setCleaning(false);
  };

  const cleanOrphanedPlugins = async () => {
    if (!confirm(`Weet je zeker dat je ${orphanedPlugins.length} verweesde plugins wilt verwijderen?`)) {
      return;
    }
    
    setCleaning(true);
    try {
      for (const plugin of orphanedPlugins) {
        await base44.entities.Plugin.delete(plugin.id);
      }
      queryClient.invalidateQueries({ queryKey: ['all-plugins'] });
      setOrphanedPlugins([]);
      alert('✅ Verweesde plugins succesvol verwijderd');
    } catch (error) {
      alert('❌ Fout bij verwijderen: ' + error.message);
    }
    setCleaning(false);
  };

  const cleanOrphanedVersions = async () => {
    if (!confirm(`Weet je zeker dat je ${orphanedVersions.length} corrupte versies wilt verwijderen?`)) {
      return;
    }
    
    setCleaning(true);
    try {
      for (const item of orphanedVersions) {
        const plugin = allPlugins.find(p => p.id === item.plugin_id);
        if (plugin) {
          const updatedVersions = (plugin.versions || []).filter(v => v.version !== item.version);
          await base44.entities.Plugin.update(plugin.id, {
            versions: updatedVersions,
            latest_version: updatedVersions.length > 0 
              ? updatedVersions[updatedVersions.length - 1].version 
              : null
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['all-plugins'] });
      setOrphanedVersions([]);
      alert('✅ Corrupte versies succesvol verwijderd');
    } catch (error) {
      alert('❌ Fout bij verwijderen: ' + error.message);
    }
    setCleaning(false);
  };

  const handleTransferClick = (type, item) => {
    setTransferType(type);
    setSelectedItem(item);
    setShowTransferDialog(true);
  };

  const handleTransferConfirm = () => {
    if (!transferToId) {
      alert('Selecteer een gebruiker of team');
      return;
    }

    transferOwnershipMutation.mutate({
      type: transferType,
      item: selectedItem,
      toType: transferToType,
      toId: transferToId
    });
  };

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Geen toegang
            </h3>
            <p className="text-gray-500">Je hebt geen toegang tot deze pagina</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Gereedschap</h1>
          <p className="text-gray-500">Data schoonmaak en onderhoud tools</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Orphaned Sites */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Verweesde Sites
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Scan en beheer sites waarvan de eigenaar niet meer bestaat
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={scanOrphanedSites}
                  disabled={scanning}
                  className="w-full"
                  variant="outline"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scannen...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Scan Sites
                    </>
                  )}
                </Button>

                {orphanedSites.length > 0 && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-900">
                          {orphanedSites.length} verweesde sites gevonden
                        </p>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {orphanedSites.map((site) => (
                          <div key={site.id} className="flex items-center justify-between text-xs text-amber-700 bg-white p-2 rounded border border-amber-100">
                            <span>• {site.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTransferClick('site', site)}
                              className="h-6 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Transfer
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={cleanOrphanedSites}
                      disabled={cleaning}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {cleaning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verwijderen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijder Alle ({orphanedSites.length})
                        </>
                      )}
                    </Button>
                  </>
                )}

                {orphanedSites.length === 0 && !scanning && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-900">
                        Geen verweesde sites gevonden
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Orphaned Plugins */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Verweesde Plugins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Scan en beheer plugins waarvan de eigenaar niet meer bestaat
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={scanOrphanedPlugins}
                  disabled={scanning}
                  className="w-full"
                  variant="outline"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scannen...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Scan Plugins
                    </>
                  )}
                </Button>

                {orphanedPlugins.length > 0 && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-900">
                          {orphanedPlugins.length} verweesde plugins gevonden
                        </p>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {orphanedPlugins.map((plugin) => (
                          <div key={plugin.id} className="flex items-center justify-between text-xs text-amber-700 bg-white p-2 rounded border border-amber-100">
                            <span>• {plugin.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTransferClick('plugin', plugin)}
                              className="h-6 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Transfer
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={cleanOrphanedPlugins}
                      disabled={cleaning}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {cleaning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verwijderen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijder Alle ({orphanedPlugins.length})
                        </>
                      )}
                    </Button>
                  </>
                )}

                {orphanedPlugins.length === 0 && !scanning && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-900">
                        Geen verweesde plugins gevonden
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Orphaned Versions */}
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                Corrupte Versies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Scan en verwijder plugin versies zonder download URL
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={scanOrphanedVersions}
                  disabled={scanning}
                  className="w-full"
                  variant="outline"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scannen...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Scan Versies
                    </>
                  )}
                </Button>

                {orphanedVersions.length > 0 && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-900">
                          {orphanedVersions.length} corrupte versies gevonden
                        </p>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {orphanedVersions.map((item, idx) => (
                          <div key={idx} className="text-xs text-amber-700 bg-white p-2 rounded border border-amber-100">
                            • {item.plugin_name} v{item.version}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={cleanOrphanedVersions}
                      disabled={cleaning}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {cleaning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verwijderen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijder Alle ({orphanedVersions.length})
                        </>
                      )}
                    </Button>
                  </>
                )}

                {orphanedVersions.length === 0 && !scanning && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-900">
                        Geen corrupte versies gevonden
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Eigendom Overdragen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedItem && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">
                  {transferType === 'site' ? 'Site' : 'Plugin'}: {selectedItem.name}
                </p>
                <p className="text-xs text-gray-600">
                  {transferType === 'site' ? selectedItem.url : selectedItem.slug}
                </p>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                ℹ️ Draag het eigendom over aan een bestaande gebruiker of team om het item te behouden.
              </p>
            </div>

            <div>
              <Label>Overdragen aan</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant={transferToType === 'user' ? 'default' : 'outline'}
                  onClick={() => {
                    setTransferToType('user');
                    setTransferToId("");
                  }}
                  className="w-full"
                >
                  Gebruiker
                </Button>
                <Button
                  variant={transferToType === 'team' ? 'default' : 'outline'}
                  onClick={() => {
                    setTransferToType('team');
                    setTransferToId("");
                  }}
                  className="w-full"
                >
                  Team
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="transfer-to">
                {transferToType === 'user' ? 'Selecteer Gebruiker' : 'Selecteer Team'}
              </Label>
              <Select value={transferToId} onValueChange={setTransferToId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={`Selecteer ${transferToType === 'user' ? 'gebruiker' : 'team'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {transferToType === 'user' ? (
                    allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))
                  ) : (
                    allTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTransferConfirm}
                disabled={!transferToId || transferOwnershipMutation.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {transferOwnershipMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Overdragen...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Overdragen
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTransferDialog(false);
                  setSelectedItem(null);
                  setTransferToId("");
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
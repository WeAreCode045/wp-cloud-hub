
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Package,
  Plus,
  Search,
  Upload,
  Globe,
  Loader2,
  ExternalLink,
  Download,
  Crown,
  Users,
  Trash2,
  Edit,
  Share2,
  MoreVertical,
  HardDrive,
  Cloud,
  Grid3x3,
  List,
  Mail,
  Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import SendMessageDialog from "../components/messaging/SendMessageDialog";
import SendNotificationDialog from "../components/messaging/SendNotificationDialog";

export default function Plugins() {
  const [user, setUser] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [wpSearchQuery, setWpSearchQuery] = useState("");
  const [wpSearchResults, setWpSearchResults] = useState([]);
  const [isSearchingWp, setIsSearchingWp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
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

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ['plugins', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allPlugins = await base44.entities.Plugin.list("-updated_date");
      return allPlugins.filter(p => p.owner_type === "user" && p.owner_id === user.id);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: allSites = [] } = useQuery({
    queryKey: ['sites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Site.list();
    },
    enabled: !!user,
    initialData: [],
  });

  const uploadPluginMutation = useMutation({
    mutationFn: async (file) => {
      // Step 1: Upload the file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      // Step 2: Parse the uploaded ZIP to get plugin data
      const parseResponse = await base44.functions.invoke('parsePluginZip', {
        file_url: fileUrl
      });
      
      if (!parseResponse.data.success) {
        throw new Error(parseResponse.data.error || 'Failed to parse plugin');
      }

      const plugin_data = parseResponse.data.plugin;
      const currentUser = await base44.auth.me();

      // Step 3: Check for duplicates
      const allExistingPlugins = await base44.entities.Plugin.list();
      const existingPlugin = allExistingPlugins.find(p =>
        p.slug === plugin_data.slug &&
        p.owner_type === "user" &&
        p.owner_id === currentUser.id
      );

      if (existingPlugin) {
        throw new Error(`Plugin "${plugin_data.name}" bestaat al in je library`);
      }

      // Step 4: Create the plugin entity
      const newPlugin = await base44.entities.Plugin.create({
        name: plugin_data.name,
        slug: plugin_data.slug,
        description: plugin_data.description || '',
        author: plugin_data.author || '',
        author_url: plugin_data.author_url || '',
        owner_type: "user",
        owner_id: currentUser.id,
        source: "upload",
        versions: [{
          version: plugin_data.version,
          download_url: fileUrl, // Use the fileUrl obtained from the first step
          created_at: new Date().toISOString()
        }],
        latest_version: plugin_data.version,
        installed_on: [],
        shared_with_teams: []
      });

      // Step 5: Log activity
      await base44.entities.ActivityLog.create({
        user_email: currentUser.email,
        action: `Plugin geüpload: ${plugin_data.name}`,
        entity_type: "plugin",
        details: `Versie ${plugin_data.version}`
      });

      return newPlugin;
    },
    onSuccess: (newPlugin) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      setShowUploadDialog(false);
      setUploadFile(null);
      toast({
        title: "Plugin toegevoegd",
        description: `De plugin "${newPlugin.name}" is succesvol geüpload.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Upload mislukt",
        description: error.message,
      });
    }
  });

  const addFromWpMutation = useMutation({
    mutationFn: async (wpPlugin) => {
      const currentUser = await base44.auth.me();
      
      // Check for duplicates before adding
      const allExistingPlugins = await base44.entities.Plugin.list();
      const existingPlugin = allExistingPlugins.find(p =>
        p.slug === wpPlugin.slug &&
        p.owner_type === "user" &&
        p.owner_id === currentUser.id
      );

      if (existingPlugin) {
        throw new Error(`Plugin "${wpPlugin.name}" bestaat al in je library`);
      }

      const newPlugin = await base44.entities.Plugin.create({
        name: wpPlugin.name,
        slug: wpPlugin.slug,
        description: wpPlugin.description || '',
        author: wpPlugin.author || '',
        author_url: wpPlugin.author_profile || '',
        owner_type: "user",
        owner_id: currentUser.id,
        source: "wplibrary",
        versions: [{
          version: wpPlugin.version,
          download_url: wpPlugin.download_url,
          created_at: new Date().toISOString()
        }],
        latest_version: wpPlugin.version,
        installed_on: [],
        shared_with_teams: []
      });

      await base44.entities.ActivityLog.create({
        user_email: currentUser.email,
        action: `Plugin toegevoegd uit WP Library: ${wpPlugin.name}`,
        entity_type: "plugin",
        details: `Versie ${wpPlugin.version}`
      });

      return newPlugin;
    },
    onSuccess: (newPlugin) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      // Keep dialog open to allow adding more, or close if desired.
      // setShowSearchDialog(false); 
      toast({
        title: "Plugin toegevoegd",
        description: `De plugin "${newPlugin.name}" is succesvol toegevoegd aan je bibliotheek.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Toevoegen mislukt",
        description: error.message,
      });
    }
  });

  const deletePluginMutation = useMutation({
    mutationFn: async (pluginId) => {
      const currentUser = await base44.auth.me();
      const pluginToDelete = plugins.find(p => p.id === pluginId);
      
      if (pluginToDelete) {
        await base44.entities.ActivityLog.create({
          user_email: currentUser.email,
          action: `Plugin verwijderd: ${pluginToDelete.name}`,
          entity_type: "plugin"
        });
      }
      
      return base44.entities.Plugin.delete(pluginId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      toast({
        title: "Plugin verwijderd",
        description: "De plugin is succesvol verwijderd.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verwijderen mislukt",
        description: error.message,
      });
    }
  });

  const handleUploadPlugin = () => {
    if (uploadFile) {
      uploadPluginMutation.mutate(uploadFile);
    } else {
      toast({
        variant: "destructive",
        title: "Geen bestand geselecteerd",
        description: "Selecteer een ZIP-bestand om te uploaden.",
      });
    }
  };

  const handleSearchWpPlugins = async () => {
    if (!wpSearchQuery.trim()) return;
    
    setIsSearchingWp(true);
    setWpSearchResults([]); // Clear previous results
    try {
      const response = await base44.functions.invoke('searchWordPressPlugins', {
        search: wpSearchQuery,
        page: 1,
        per_page: 20
      });

      if (response.data.success) {
        setWpSearchResults(response.data.plugins);
      } else {
        toast({
          variant: "destructive",
          title: "Zoeken mislukt",
          description: response.data.error || "Onbekende fout bij het zoeken in de WP Library.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Zoeken mislukt",
        description: error.message,
      });
    }
    setIsSearchingWp(false);
  };

  const handleAddFromWp = (wpPlugin) => {
    addFromWpMutation.mutate(wpPlugin);
  };

  const handleOpenMessageDialog = (plugin) => {
    setSelectedPlugin(plugin);
    setShowMessageDialog(true);
  };

  const handleOpenNotificationDialog = (plugin) => {
    setSelectedPlugin(plugin);
    setShowNotificationDialog(true);
  };

  const getInstalledSitesCount = (plugin) => {
    return plugin.installed_on?.length || 0;
  };

  const filteredPlugins = plugins.filter(plugin =>
    plugin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PluginCard = ({ plugin }) => {
    const isExternal = plugin.source === 'wplibrary'; // 'is_external' field is not directly available, using 'source'
    const installedCount = getInstalledSitesCount(plugin);
    
    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
        <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-100 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                {isExternal ? (
                  <Cloud className="w-6 h-6 text-white" />
                ) : (
                  <HardDrive className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate text-gray-900">{plugin.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                    {isExternal ? 'Remote' : 'Local'}
                  </Badge>
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Eigenaar
                  </Badge>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-100">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenMessageDialog(plugin)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Bericht Sturen
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => handleOpenNotificationDialog(plugin)}>
                    <Bell className="w-4 h-4 mr-2" />
                    Notificatie Sturen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {plugin.description ? (
            <p className="text-sm text-gray-600 line-clamp-2">{plugin.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic line-clamp-2">Geen beschrijving</p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
              <span>{installedCount} {installedCount === 1 ? 'site' : 'sites'}</span>
            </div>
            {plugin.latest_version && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>v{plugin.latest_version}</span>
              </div>
            )}
          </div>

          {plugin.author && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1 font-medium">Auteur</p>
              <p className="text-sm text-gray-900">{plugin.author}</p>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button 
              asChild 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-md"
            >
              <Link to={createPageUrl(`PluginDetail?id=${plugin.id}`)}>
                <Edit className="w-4 h-4 mr-2" />
                Beheren
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Weet je zeker dat je "${plugin.name}" wilt verwijderen?`)) {
                  deletePluginMutation.mutate(plugin.id);
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

  const PluginListItem = ({ plugin }) => {
    const isExternal = plugin.source === 'wplibrary';
    const installedCount = getInstalledSitesCount(plugin);

    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              {isExternal ? (
                <Cloud className="w-7 h-7 text-white" />
              ) : (
                <HardDrive className="w-7 h-7 text-white" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{plugin.name}</h3>
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                  {isExternal ? 'Remote' : 'Local'}
                </Badge>
                {plugin.latest_version && (
                  <Badge variant="outline" className="text-xs">
                    v{plugin.latest_version}
                  </Badge>
                )}
              </div>
              {plugin.description ? (
                <p className="text-sm text-gray-600 line-clamp-1">{plugin.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic line-clamp-1">Geen beschrijving</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>{installedCount} sites</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                asChild 
                size="sm" 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
              >
                <Link to={createPageUrl(`PluginDetail?id=${plugin.id}`)}>
                  <Edit className="w-4 h-4 mr-2" />
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
                  <DropdownMenuItem onClick={() => handleOpenMessageDialog(plugin)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Bericht Sturen
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleOpenNotificationDialog(plugin)}>
                      <Bell className="w-4 h-4 mr-2" />
                      Notificatie Sturen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => {
                      if (confirm(`Weet je zeker dat je "${plugin.name}" wilt verwijderen?`)) {
                        deletePluginMutation.mutate(plugin.id);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mijn Plugins</h1>
            <p className="text-gray-600">Beheer je WordPress plugins</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Plugin
            </Button>
            <Button 
              onClick={() => setShowSearchDialog(true)}
              variant="outline"
              className="hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
            >
              <Globe className="w-4 h-4 mr-2" />
              WP Library
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg mb-6 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Zoek plugins op naam of beschrijving..."
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
        ) : filteredPlugins.length === 0 ? (
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "Geen plugins gevonden" : "Nog geen plugins"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? "Probeer een andere zoekterm" 
                  : "Upload je eerste plugin of voeg er één toe uit de WordPress Library"}
              </p>
              {!searchQuery && (
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => setShowUploadDialog(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Plugin
                  </Button>
                  <Button 
                    onClick={() => setShowSearchDialog(true)}
                    variant="outline"
                    className="hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    WP Library
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredPlugins.map((plugin) => (
              viewMode === "grid" ? (
                <PluginCard key={plugin.id} plugin={plugin} />
              ) : (
                <PluginListItem key={plugin.id} plugin={plugin} />
              )
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Plugin Uploaden</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="plugin-file">Plugin ZIP Bestand *</Label>
                <Input
                  id="plugin-file"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload een WordPress plugin als ZIP bestand. De plugin details worden automatisch uitgelezen.
                </p>
                {uploadFile && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      📦 Geselecteerd: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUploadPlugin}
                  disabled={uploadPluginMutation.isPending || !uploadFile}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                >
                  {uploadPluginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploaden...
                    </>
                  ) : (
                    "Plugin Uploaden"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Annuleren
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* WordPress Library Search Dialog */}
        <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>WordPress Plugin Library</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="wp-search">Zoek in WordPress Plugin Directory</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="wp-search"
                    placeholder="Bijv: Yoast SEO, Contact Form 7..."
                    value={wpSearchQuery}
                    onChange={(e) => setWpSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchWpPlugins()}
                    className="focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Button
                    onClick={handleSearchWpPlugins}
                    disabled={isSearchingWp || !wpSearchQuery.trim()}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                  >
                    {isSearchingWp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {wpSearchResults.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {wpSearchResults.map((wpPlugin) => {
                    const alreadyAdded = plugins.some(p => p.slug === wpPlugin.slug);
                    
                    return (
                      <Card key={wpPlugin.slug} className="border border-gray-200 rounded-xl">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{wpPlugin.name}</CardTitle>
                              <p className="text-xs text-gray-500 mt-1">{wpPlugin.author}</p>
                            </div>
                            {alreadyAdded && (
                              <Badge className="bg-green-100 text-green-700 ml-2">
                                Toegevoegd
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-gray-600 line-clamp-2 min-h-[2rem]">
                            {wpPlugin.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <ExternalLink className="w-3 h-3 mr-1 text-gray-400" />
                              <a 
                                href={wpPlugin.homepage} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline text-blue-500"
                              >
                                Bekijk
                              </a>
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3 inline mr-1 text-gray-400" />
                              {wpPlugin.active_installs?.toLocaleString()}+ actief
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <Badge variant="outline" className="text-xs">
                              v{wpPlugin.version}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleAddFromWp(wpPlugin)}
                              disabled={alreadyAdded || addFromWpMutation.isPending}
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                            >
                              {alreadyAdded ? 'Toegevoegd' : addFromWpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Toevoegen'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {wpSearchResults.length === 0 && wpSearchQuery && !isSearchingWp && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Geen plugins gevonden voor "{wpSearchQuery}"</p>
                    </div>
                  )}
            </div>
          </DialogContent>
        </Dialog>

        {selectedPlugin && (
          <SendMessageDialog
            open={showMessageDialog}
            onOpenChange={setShowMessageDialog}
            user={user}
            context={{
              type: "plugin",
              id: selectedPlugin.id,
              name: selectedPlugin.name
            }}
          />
        )}

        {selectedPlugin && isAdmin && (
          <SendNotificationDialog
            open={showNotificationDialog}
            onOpenChange={setShowNotificationDialog}
            user={user}
            context={{
              type: "plugin",
              id: selectedPlugin.id,
              name: selectedPlugin.name
            }}
          />
        )}
      </div>
    </div>
  );
}

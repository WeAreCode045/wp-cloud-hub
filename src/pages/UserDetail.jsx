
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Shield,
  User,
  Package,
  Globe,
  Send,
  CheckCircle,
  XCircle,
  Bell,
  Crown, // New import
  Edit,  // New import
  Ban    // New import
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // New import for dialog buttons
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import SendMessageDialog from "../components/messaging/SendMessageDialog"; // New import
import SendNotificationDialog from "../components/messaging/SendNotificationDialog"; // New import

export default function UserDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null); // State for the currently logged-in user
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", company: "", phone: "", role: "" }); // Added role
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate(createPageUrl("UserManager"));
    }
  }, [userId, navigate]);

  // Effect to fetch the currently logged-in user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const me = await base44.auth.me();
        setCurrentUser(me);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Renamed 'user' to 'targetUser' to distinguish from 'currentUser' (logged-in user)
  const { data: targetUser, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      // Assuming base44.entities.User.list() can be used to find a single user by ID
      // For performance, a direct base44.entities.User.get(userId) might be preferred if available.
      const users = await base44.entities.User.list();
      const foundUser = users.find(u => u.id === userId) || null;
      if (foundUser) {
        // Initialize edit form when target user data is loaded
        setEditForm({
          full_name: foundUser.full_name || "",
          email: foundUser.email || "",
          company: foundUser.company || "",
          phone: foundUser.phone || "",
          role: foundUser.role || "user" // Default role if not explicitly set
        });
      }
      return foundUser;
    },
    enabled: !!userId,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', userId],
    queryFn: async () => {
      if (!userId || !targetUser) return [];
      const allSites = await base44.entities.Site.list();
      return allSites.filter(site => site.created_by === targetUser.email); // Filter by targetUser's email
    },
    enabled: !!userId && !!targetUser,
    initialData: [],
  });

  const { data: plugins = [] } = useQuery({
    queryKey: ['plugins', userId],
    queryFn: async () => {
      if (!userId || !targetUser) return [];
      const allPlugins = await base44.entities.Plugin.list();
      return allPlugins.filter(plugin => plugin.created_by === targetUser.email); // Filter by targetUser's email
    },
    enabled: !!userId && !!targetUser,
    initialData: [],
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      return base44.entities.Notification.filter({ recipient_id: userId }, "-created_date", 10);
    },
    enabled: !!userId,
    initialData: [],
  });

  // Mutation to update user details
  const updateUserMutation = useMutation({
    mutationFn: async (updatedData) => {
      if (!userId) throw new Error("User ID is missing.");
      await base44.entities.User.update(userId, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] }); // Invalidate user data to refetch
      setShowEditDialog(false);
      alert('✅ Gebruiker succesvol bijgewerkt!');
    },
    onError: (error) => {
      alert('❌ Fout bij bijwerken: ' + error.message);
    }
  });

  // Mutation to change user status (block/unblock)
  const blockUserMutation = useMutation({
    mutationFn: async (status) => {
      if (!userId) throw new Error("User ID is missing.");
      await base44.entities.User.update(userId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] }); // Invalidate user data to refetch
      alert('✅ Gebruiker status succesvol bijgewerkt!');
    },
    onError: (error) => {
      alert('❌ Fout bij bijwerken status: ' + error.message);
    }
  });

  const handleEditSubmit = () => {
    updateUserMutation.mutate(editForm);
  };

  const handleBlockUser = () => {
    if (!targetUser) return;
    const newStatus = targetUser.status === "active" ? "inactive" : "active";
    if (window.confirm(`Weet je zeker dat je deze gebruiker wilt ${newStatus === "inactive" ? "blokkeren" : "deblokkeren"}?`)) {
      blockUserMutation.mutate(newStatus);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Show loading state if target user or current user data is not yet available
  if (userLoading || !currentUser) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500">Gebruiker wordt geladen...</p>
        </div>
      </div>
    );
  }

  // Show error/not found state if target user is null after loading
  if (!targetUser) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Gebruiker niet gevonden</h3>
          <p className="text-gray-500 mb-6">Deze gebruiker bestaat niet of is verwijderd</p>
          <Button asChild>
            <Link to={createPageUrl("UserManager")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar Gebruikers
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isActive = targetUser.status === "active" || !targetUser.status; // Assume active if status is not set
  const canEdit = currentUser?.role === "admin"; // Only admins can edit or block users

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to={createPageUrl("UserManager")}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Avatar className="w-16 h-16 border-2 border-indigo-100">
            <AvatarImage src={targetUser.avatar_url} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-lg">
              {getInitials(targetUser.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              {targetUser.full_name}
              {targetUser.role === "admin" && (
                <Crown className="w-6 h-6 text-amber-500" fill="currentColor" />
              )}
            </h1>
            <p className="text-gray-500 mt-1">{targetUser.email}</p>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowMessageDialog(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Bericht
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowNotificationDialog(true)}>
            <Bell className="w-4 h-4 mr-2" />
            Notificatie
          </Button>

          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Bewerken
              </Button>
              {/* Do not allow an admin to block their own account */}
              {targetUser.id !== currentUser?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBlockUser}
                  className={targetUser.status === "active" ? "text-red-600 hover:text-red-700 border-red-200" : "text-green-600 hover:text-green-700 border-green-200"}
                  disabled={blockUserMutation.isPending}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {blockUserMutation.isPending
                    ? "Bezig..."
                    : targetUser.status === "active" ? "Blokkeer" : "Deblokkeer"}
                </Button>
              )}
            </>
          )}
        </div>

        {/* The previous inline Dialog for sending notifications has been replaced by SendNotificationDialog component */}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Verbonden Sites</p>
                  <p className="text-3xl font-bold">{sites.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Plugins</p>
                  <p className="text-3xl font-bold">{plugins.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notificaties</p>
                  <p className="text-3xl font-bold">{notifications.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <Tabs defaultValue="account" className="w-full">
              <CardHeader className="border-b border-gray-100">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="account" className="gap-2">
                    <User className="w-4 h-4" />
                    Account Info
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="gap-2">
                    <Bell className="w-4 h-4" />
                    Notificaties
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="account" className="m-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-20 h-20 border-4 border-purple-100">
                      <AvatarImage src={targetUser.avatar_url} />
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-2xl font-semibold">
                        {getInitials(targetUser.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{targetUser.full_name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={`${
                            targetUser.role === "admin"
                              ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {targetUser.role === "admin" ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 mr-1" />
                              Gebruiker
                            </>
                          )}
                        </Badge>
                        {isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Actief
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactief
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">E-mailadres</p>
                        <p className="text-sm font-medium text-gray-900">{targetUser.email}</p>
                      </div>
                    </div>

                    {targetUser.company && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Building className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Bedrijf</p>
                          <p className="text-sm font-medium text-gray-900">{targetUser.company}</p>
                        </div>
                      </div>
                    )}

                    {targetUser.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Telefoonnummer</p>
                          <p className="text-sm font-medium text-gray-900">{targetUser.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Lid sinds</p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(targetUser.created_date), "d MMMM yyyy", { locale: nl })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="notifications" className="m-0">
                <CardContent className="p-6">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nog geen notificaties</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-lg border transition-all ${
                            notif.is_read
                              ? "border-gray-100 bg-white"
                              : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                            {!notif.is_read && (
                              <Badge variant="secondary" className="text-xs">Nieuw</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{notif.message}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(notif.created_date), "d MMM yyyy HH:mm", { locale: nl })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="border-none shadow-lg">
            <Tabs defaultValue="sites" className="w-full">
              <CardHeader className="border-b border-gray-100">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sites" className="gap-2">
                    <Globe className="w-4 h-4" />
                    Sites ({sites.length})
                  </TabsTrigger>
                  <TabsTrigger value="plugins" className="gap-2">
                    <Package className="w-4 h-4" />
                    Plugins ({plugins.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="sites" className="m-0">
                <CardContent className="p-6">
                  {sites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nog geen sites</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sites.map((site) => (
                        <Link
                          key={site.id}
                          to={createPageUrl(`SiteDetail?id=${site.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                              <Globe className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{site.name}</p>
                              <p className="text-xs text-gray-500">{site.url}</p>
                            </div>
                          </div>
                          <Badge
                            className={
                              site.status === "active"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {site.status || "inactive"}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="plugins" className="m-0">
                <CardContent className="p-6">
                  {plugins.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nog geen plugins</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {plugins.map((plugin) => (
                        <Link
                          key={plugin.id}
                          to={createPageUrl(`PluginDetail?id=${plugin.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{plugin.name}</p>
                              <p className="text-xs text-gray-500">
                                {plugin.latest_version ? `v${plugin.latest_version}` : "Geen versie"}
                              </p>
                            </div>
                          </div>
                          <Badge className={plugin.is_public ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {plugin.is_public ? "Public" : "Privé"}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gebruiker Bewerken</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-full_name">Volledige Naam</Label>
                <Input
                  id="edit-full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">E-mailadres</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  // Email is generally not editable directly, it might break user login or be handled by a separate flow
                  disabled={true}
                />
              </div>
              <div>
                <Label htmlFor="edit-company">Bedrijf</Label>
                <Input
                  id="edit-company"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telefoonnummer</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Rol</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                  disabled={targetUser.id === currentUser?.id} // Prevent user from changing their own role
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Selecteer rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Gebruiker</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={handleEditSubmit} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Message Dialog */}
        <SendMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          user={currentUser} // The user initiating the message is the currentUser
          context={{
            type: "user",
            id: targetUser.id,
            name: targetUser.full_name
          }}
          defaultRecipientType="user"
          defaultRecipientId={targetUser.id}
        />

        {/* Notification Dialog */}
        <SendNotificationDialog
          open={showNotificationDialog}
          onOpenChange={setShowNotificationDialog}
          user={currentUser} // The user initiating the notification is the currentUser
          context={{
            type: "user",
            id: targetUser.id,
            name: targetUser.full_name
          }}
          defaultRecipientType="user"
          defaultRecipientId={targetUser.id}
        />
      </div>
    </div>
  );
}

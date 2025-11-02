
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, Mail, Shield, User, Plus, Edit2, Trash2, CheckCircle, XCircle, MoreVertical, Crown, Bell, Settings, Ban, Building2, Phone, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import SendMessageDialog from "../components/messaging/SendMessageDialog";
import SendNotificationDialog from "../components/messaging/SendNotificationDialog";

export default function UserManager() {
  const [searchTerm, setSearchTerm] = useState(""); // Renamed from searchQuery
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null); // Current logged-in user
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // For message/notification dialogs

  const [showEditDialog, setShowEditDialog] = useState(false); // Renamed from showAddDialog
  const [editingUser, setEditingUser] = useState(null);
  const [editedUserData, setEditedUserData] = useState({ // Renamed from newUser, only for editable fields
    role: "user",
    company: "",
    phone: "",
    status: "active"
  });
  const queryClient = useQueryClient();

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load current user:", error);
      }
    };
    loadCurrentUser();
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list("-created_date"),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      const currentUser = await base44.auth.me(); // Fetch current user for activity log
      const targetUser = users.find(u => u.id === userId);
      await base44.entities.ActivityLog.create({
        user_email: currentUser.email,
        action: `Gebruiker bijgewerkt: ${targetUser?.full_name || targetUser?.email}`,
        entity_type: "user",
        entity_id: userId
      });
      return base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setShowEditDialog(false); // Use showEditDialog
      alert('✅ Gebruiker succesvol bijgewerkt!');
    },
    onError: (error) => {
      alert('❌ Fout bij bijwerken: ' + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const currentUser = await base44.auth.me(); // Fetch current user for activity log
      const targetUser = users.find(u => u.id === userId);
      await base44.entities.ActivityLog.create({
        user_email: currentUser.email,
        action: `Gebruiker verwijderd: ${targetUser?.full_name || targetUser?.email}`,
        entity_type: "user",
        entity_id: userId
      });
      return base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('✅ Gebruiker succesvol verwijderd!');
    },
    onError: (error) => {
      alert('❌ Fout bij verwijderen: ' + error.message);
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, newStatus }) => {
      const currentUser = await base44.auth.me();
      const targetUser = users.find(u => u.id === userId);
      const actionText = newStatus === "active" ? "gedeblokkeerd" : "geblokkeerd";
      await base44.entities.ActivityLog.create({
        user_email: currentUser.email,
        action: `Gebruiker ${actionText}: ${targetUser?.full_name || targetUser?.email}`,
        entity_type: "user",
        entity_id: userId
      });
      return base44.entities.User.update(userId, { status: newStatus });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert(`✅ Gebruiker succesvol ${variables.newStatus === "active" ? "gedeblokkeerd" : "geblokkeerd"}!`);
    },
    onError: (error) => {
      alert('❌ Fout bij status wijzigen: ' + error.message);
    }
  });

  const handleSaveUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        data: editedUserData
      });
    }
  };

  const handleEditUser = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditedUserData({
      role: userToEdit.role,
      company: userToEdit.company || "",
      phone: userToEdit.phone || "",
      status: userToEdit.status || "active"
    });
    setShowEditDialog(true);
  };

  const handleBlockUser = (targetUser) => {
    const newStatus = (targetUser.status === "active" || !targetUser.status) ? "inactive" : "active";
    if (confirm(`Weet je zeker dat je ${targetUser.full_name} wilt ${newStatus === "active" ? "deblokkeren" : "blokkeren"}?`)) {
      blockUserMutation.mutate({ userId: targetUser.id, newStatus });
    }
  };

  const handleOpenMessageDialog = (targetUser) => {
    setSelectedUser(targetUser);
    setShowMessageDialog(true);
  };

  const handleOpenNotificationDialog = (targetUser) => {
    setSelectedUser(targetUser);
    setShowNotificationDialog(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && (u.status === "active" || !u.status)) ||
                          (statusFilter === "inactive" && u.status === "inactive");
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const adminCount = users.filter(u => u.role === "admin").length;
  const regularCount = users.filter(u => u.role === "user").length;
  const activeCount = users.filter(u => u.status === "active" || !u.status).length;
  const inactiveCount = users.filter(u => u.status === "inactive").length;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gebruikersbeheer</h1>
            <p className="text-gray-500">Beheer alle gebruikers van het platform</p>
          </div>
          
          {/* The DialogTrigger for "Gebruiker Toevoegen" is removed from here */}
          
          <Dialog open={showEditDialog} onOpenChange={(open) => { // Using showEditDialog
            setShowEditDialog(open);
            if (!open) {
              setEditingUser(null);
              setEditedUserData({ role: "user", company: "", phone: "", status: "active" }); // Reset editedUserData
            }
          }}>
            {/* The DialogTrigger is removed as there is no direct add user button in the new design.
                The Dialog remains for editing, potentially triggered from elsewhere like UserDetail. */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gebruiker Bewerken</DialogTitle> {/* Always "Gebruiker Bewerken" */}
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {editingUser && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Naam: {editingUser.full_name}</p>
                    <p className="text-sm text-gray-500">Email: {editingUser.email}</p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="role">Rol *</Label>
                  <Select
                    value={editedUserData.role} // Use editedUserData
                    onValueChange={(value) => setEditedUserData({ ...editedUserData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Gebruiker</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="company">Bedrijf</Label>
                  <Input
                    id="company"
                    placeholder="Bedrijfsnaam"
                    value={editedUserData.company} // Use editedUserData
                    onChange={(e) => setEditedUserData({ ...editedUserData, company: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefoonnummer</Label>
                  <Input
                    id="phone"
                    placeholder="+31 6 12345678"
                    value={editedUserData.phone} // Use editedUserData
                    onChange={(e) => setEditedUserData({ ...editedUserData, phone: e.target.value })}
                  />
                </div>

                {editingUser && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base">Account Status</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        {editedUserData.status === "active" ? "Account is actief" : "Account is gedeactiveerd"}
                      </p>
                    </div>
                    <Switch
                      checked={editedUserData.status === "active"}
                      onCheckedChange={(checked) => 
                        setEditedUserData({ ...editedUserData, status: checked ? "active" : "inactive" })
                      }
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveUser}
                    disabled={updateUserMutation.isPending} // Button enabled when editingUser is set
                    className="flex-1"
                  >
                    Wijzigingen Opslaan
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowEditDialog(false)} // Use setShowEditDialog
                  >
                    Annuleren
                  </Button>
                </div>
                {/* Removed the info message about inviting users */}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Totaal Gebruikers</p>
                  <p className="text-3xl font-bold">{users.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Admins</p>
                  <p className="text-3xl font-bold">{adminCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Actieve Accounts</p>
                  <p className="text-3xl font-bold">{activeCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Inactieve Accounts</p>
                  <p className="text-3xl font-bold">{inactiveCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Zoek gebruikers op naam, email of bedrijf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter op rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Rollen</SelectItem>
              <SelectItem value="user">Gebruiker</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Statussen</SelectItem>
              <SelectItem value="active">Actief</SelectItem>
              <SelectItem value="inactive">Inactief</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => {
            const isActive = u.status === "active" || !u.status; // Define isActive here
            return (
            <Card key={u.id} className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="border-b border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-12 h-12 border-2 border-indigo-100">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {u.full_name}
                        {u.role === "admin" && (
                          <Crown className="w-4 h-4 text-amber-500" fill="currentColor" />
                        )}
                      </CardTitle>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(`UserDetail?id=${u.id}`)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Beheren
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenMessageDialog(u)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Bericht Sturen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenNotificationDialog(u)}>
                        <Bell className="w-4 h-4 mr-2" />
                        Notificatie Sturen
                      </DropdownMenuItem>
                      {user && u.id !== user.id && ( // Prevent blocking self
                        <DropdownMenuItem 
                          onClick={() => handleBlockUser(u)}
                          className="text-red-600"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          {isActive ? "Blokkeer" : "Deblokkeer"} Gebruiker
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {u.company && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    {u.company}
                  </div>
                )}
                {u.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {u.phone}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarDays className="w-4 h-4 mr-2 text-gray-400" />
                  Lid sinds {format(new Date(u.created_date), "d MMM yyyy", { locale: nl })}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge 
                    className={`${
                      u.role === "admin" 
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200" 
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {u.role === "admin" ? (
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
                  {!isActive && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      Inactief
                    </Badge>
                  )}
                  {isActive && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                      Actief
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )})}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || roleFilter !== "all" || statusFilter !== "all" ? "Geen gebruikers gevonden" : "Nog geen gebruikers"}
            </h3>
            <p className="text-gray-500">
              {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && "Probeer een andere zoekopdracht of pas de filters aan"}
            </p>
          </div>
        )}

        {/* Message Dialog */}
        {selectedUser && (
          <SendMessageDialog
            open={showMessageDialog}
            onOpenChange={setShowMessageDialog}
            user={user}
            context={{
              type: "user",
              id: selectedUser.id,
              name: selectedUser.full_name
            }}
            defaultRecipientType="user"
            defaultRecipientId={selectedUser.id}
          />
        )}

        {/* Notification Dialog */}
        {selectedUser && (
          <SendNotificationDialog
            open={showNotificationDialog}
            onOpenChange={setShowNotificationDialog}
            user={user}
            context={{
              type: "user",
              id: selectedUser.id,
              name: selectedUser.full_name
            }}
            defaultRecipientType="user"
            defaultRecipientId={selectedUser.id}
          />
        )}
      </div>
    </div>
  );
}

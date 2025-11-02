
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Search,
  Crown,
  ShieldCheck,
  Eye,
  ArrowRight,
  Package,
  Globe,
  MoreVertical,
  Mail,
  Bell,
  Settings,
  Trash2,
  Grid3x3, // New import
  List // New import
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from
"@/components/ui/dialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import SendMessageDialog from "../components/messaging/SendMessageDialog";
import SendNotificationDialog from "../components/messaging/SendNotificationDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export default function Teams() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allTeams = await base44.entities.Team.list("-updated_date");

      // Filter teams where user is owner or member
      return allTeams.filter((team) => {
        if (team.owner_id === user.id) return true;
        if (team.members?.some((m) => m.user_id === user.id)) return true;
        return false;
      });
    },
    enabled: !!user,
    initialData: []
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['team-invites', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.TeamInvite.filter({
        invited_email: user.email,
        status: "pending"
      }, "-created_date");
    },
    enabled: !!user,
    initialData: []
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData) => {
      // Create team with owner as member with "Owner" role
      const newTeam = await base44.entities.Team.create({
        name: teamData.name,
        description: teamData.description,
        owner_id: user.id,
        members: [{
          user_id: user.id,
          email: user.email,
          team_role_id: "Owner", // Default role string
          status: "active",
          joined_at: new Date().toISOString()
        }],
        settings: {
          allow_member_invites: false,
          default_team_role_id: "Member"
        }
      });

      // Log activity
      await base44.entities.ActivityLog.create({
        user_email: user.email,
        action: `Team aangemaakt: ${newTeam.name}`,
        entity_type: "team",
        entity_id: newTeam.id
      });

      return newTeam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateDialog(false);
      setNewTeam({ name: "", description: "" });
    }
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (invite) => {
      // Update invite status
      await base44.entities.TeamInvite.update(invite.id, {
        status: "accepted",
        accepted_at: new Date().toISOString()
      });

      // Get team
      const teams = await base44.entities.Team.filter({ id: invite.team_id });
      if (teams.length === 0) throw new Error("Team not found");

      const team = teams[0];
      const currentMembers = team.members || [];

      // Check if user is already in members array
      const existingMemberIndex = currentMembers.findIndex((m) => m.user_id === user.id);

      let updatedMembers;
      if (existingMemberIndex !== -1) {
        // User already exists (was added as pending) - update status to active
        updatedMembers = currentMembers.map((m, index) =>
          index === existingMemberIndex ?
            { ...m, status: "active" } :
            m
        );
      } else {
        // User doesn't exist yet - add new member with active status
        updatedMembers = [
          ...currentMembers,
          {
            user_id: user.id,
            email: user.email,
            team_role_id: invite.team_role_id,
            status: "active",
            joined_at: new Date().toISOString()
          }];

      }

      await base44.entities.Team.update(team.id, { members: updatedMembers });

      // Mark related notification as read
      const notifications = await base44.entities.Notification.filter({
        recipient_id: user.id,
        team_invite_id: invite.id
      });

      for (const notif of notifications) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }

      // Log activity
      await base44.entities.ActivityLog.create({
        user_email: user.email,
        action: `Toegetreden tot team: ${team.name}`,
        entity_type: "team",
        entity_id: team.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const declineInviteMutation = useMutation({
    mutationFn: (invite) =>
      base44.entities.TeamInvite.update(invite.id, { status: "declined" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
    }
  });

  const deleteTeamMutation = useMutation({ // New mutation
    mutationFn: async (teamId) => {
      await base44.entities.Team.delete(teamId);
      // Optional: Delete related invites, notifications etc. (Or handle cascading deletion on backend)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-invites'] }); // In case a team with pending invites is deleted
      setSelectedTeam(null); // Clear selected team if it was the one deleted
    },
    onError: (error) => {
      console.error("Error deleting team:", error);
      // Optionally show a toast notification
    }
  });

  const handleCreateTeam = () => {
    if (newTeam.name) {
      createTeamMutation.mutate(newTeam);
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserRole = (team) => {
    if (team.owner_id === user?.id) return "owner";
    const member = team?.members?.find((m) => m.user_id === user?.id);
    if (!member) return "member";

    // Check for default roles
    const roleId = member.team_role_id;
    if (roleId === "Owner") return "owner";
    if (roleId === "Admin") return "admin";
    if (roleId === "Manager") return "manager";
    if (roleId === "Member") return "member";

    return "member";
  };

  const getUserMemberStatus = (team) => {
    const member = team?.members?.find((m) => m.user_id === user?.id);
    return member?.status || null;
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3 h-3" />;
      case "admin":
        return <ShieldCheck className="w-3 h-3" />;
      case "manager":
        return <Users className="w-3 h-3" />;
      default:
        return <Eye className="w-3 h-3" />;
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      owner: "bg-amber-100 text-amber-700 border-amber-200",
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      manager: "bg-blue-100 text-blue-700 border-blue-200",
      member: "bg-gray-100 text-gray-700 border-gray-200"
    };
    return colors[role] || colors.member;
  };

  const isAdmin = user?.role === "admin"; // New derived state

  const handleOpenMessageDialog = (team) => {// New handler
    setSelectedTeam(team);
    setShowMessageDialog(true);
  };

  const handleOpenNotificationDialog = (team) => {// New handler
    setSelectedTeam(team);
    setShowNotificationDialog(true);
  };

  const TeamCard = ({ team }) => {// New component
    const userRole = getUserRole(team);
    const memberStatus = getUserMemberStatus(team);
    const activeMembersCount = team.members?.filter((m) => m.status === "active").length || 0;
    const isPending = memberStatus === "pending";
    const invite = invites.find((i) => i.team_id === team.id);
    const isOwner = userRole === "owner";
    const isMember = team.members?.some((m) => m.user_id === user?.id);

    return (
      <Card key={team.id} className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="w-12 h-12 border-2 border-indigo-100">
                <AvatarImage src={team.avatar_url} alt={team.name} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                  {team.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <Badge className={`${getRoleBadge(userRole)}`}>
                    {getRoleIcon(userRole)}
                    <span className="ml-1 capitalize">{userRole}</span>
                  </Badge>
                  {isPending && (
                    <Badge className="bg-amber-100 text-amber-700">
                      In afwachting
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                  {team.description || "Geen beschrijving"}
                </p>
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
                  <Link to={createPageUrl(`TeamDetail?id=${team.id}`)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Beheren
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenMessageDialog(team)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Bericht Sturen
                </DropdownMenuItem>
                {(isOwner || isAdmin) && (
                  <DropdownMenuItem onClick={() => handleOpenNotificationDialog(team)}>
                    <Bell className="w-4 h-4 mr-2" />
                    Notificatie Sturen
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (window.confirm(`Weet je zeker dat je team "${team.name}" wilt verwijderen?`)) {
                        deleteTeamMutation.mutate(team.id);
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Verwijderen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{activeMembersCount} {activeMembersCount === 1 ? 'lid' : 'leden'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            {isPending && invite ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => acceptInviteMutation.mutate(invite)}
                  disabled={acceptInviteMutation.isPending}
                >
                  Accepteer Uitnodiging
                </Button>
                <Button
                  variant="outline"
                  onClick={() => declineInviteMutation.mutate(invite)}
                  disabled={declineInviteMutation.isPending}
                >
                  Weiger
                </Button>
              </div>
            ) : (
              <Button asChild className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                <Link to={createPageUrl(`TeamDetail?id=${team.id}`)}>
                  Team Bekijken
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const TeamListItem = ({ team }) => {
    const userRole = getUserRole(team);
    const memberStatus = getUserMemberStatus(team);
    const activeMembersCount = team.members?.filter((m) => m.status === "active").length || 0;
    const isPending = memberStatus === "pending";
    const invite = invites.find((i) => i.team_id === team.id);
    const isOwner = userRole === "owner";

    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-indigo-100 flex-shrink-0">
              <AvatarImage src={team.avatar_url} alt={team.name} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                {team.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
                <Badge className={`${getRoleBadge(userRole)} text-xs`}>
                  {getRoleIcon(userRole)}
                  <span className="ml-1 capitalize">{userRole}</span>
                </Badge>
                {isPending &&
                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                    In afwachting
                  </Badge>
                }
              </div>
              <p className="text-sm text-gray-600 line-clamp-1">
                {team.description || "Geen beschrijving"}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
              <Users className="w-4 h-4" />
              <span>{activeMembersCount} {activeMembersCount === 1 ? 'lid' : 'leden'}</span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {isPending && invite ?
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 h-9"
                    onClick={() => acceptInviteMutation.mutate(invite)}
                    disabled={acceptInviteMutation.isPending}>

                    Accepteren
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => declineInviteMutation.mutate(invite)}
                    disabled={declineInviteMutation.isPending}>

                    Weigeren
                  </Button>
                </> :

                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    asChild>

                    <Link to={createPageUrl(`TeamDetail?id=${team.id}`)}>
                      <Settings className="w-4 h-4" />
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(`TeamDetail?id=${team.id}`)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Beheren
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenMessageDialog(team)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Bericht Sturen
                      </DropdownMenuItem>
                      {(isOwner || isAdmin) &&
                        <DropdownMenuItem onClick={() => handleOpenNotificationDialog(team)}>
                          <Bell className="w-4 h-4 mr-2" />
                          Notificatie Sturen
                        </DropdownMenuItem>
                      }
                      {isOwner &&
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm(`Weet je zeker dat je team "${team.name}" wilt verwijderen?`)) {
                              deleteTeamMutation.mutate(team.id);
                            }
                          }}
                          className="text-red-600">

                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      }
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            </div>
          </div>
        </CardContent>
      </Card>);

  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teams</h1>
            <p className="text-gray-500">Werk samen in teams en deel resources</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-5 h-5 mr-2" />
                Nieuw Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Team Aanmaken</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Team Naam *</Label>
                  <Input
                    id="name"
                    placeholder="Mijn Team"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} />

                </div>
                <div>
                  <Label htmlFor="description">Beschrijving</Label>
                  <Textarea
                    id="description"
                    placeholder="Wat is het doel van dit team?"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    rows={3} />

                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateTeam}
                    disabled={!newTeam.name || createTeamMutation.isPending}
                    className="flex-1">

                    {createTeamMutation.isPending ? "Aanmaken..." : "Team Aanmaken"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}>

                    Annuleren
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {invites.length > 0 &&
          <Card className="border-none shadow-lg mb-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Team Uitnodigingen ({invites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invites.map((invite) =>
                <div
                  key={invite.id}
                  className="p-4 bg-white rounded-lg border border-indigo-200">

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{invite.team_name}</p>
                      <p className="text-sm text-gray-500">
                        Uitgenodigd door {invite.invited_by_name}
                      </p>
                      <Badge className="mt-2 bg-gray-100 text-gray-700">
                        {invite.team_role_id}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptInviteMutation.mutate(invite)}
                        disabled={acceptInviteMutation.isPending}>

                        Accepteren
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineInviteMutation.mutate(invite)}
                        disabled={declineInviteMutation.isPending}>

                        Weigeren
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        }

        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Zoek teams op naam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10" />

              </div>
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8">

                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8">

                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredTeams.length === 0 ?
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? "Geen teams gevonden" : "Nog geen teams"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ?
                  "Probeer een andere zoekopdracht" :
                  "Maak je eerste team aan om samen te werken"
                }
              </p>
              {!searchQuery &&
                <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Nieuw Team
                </Button>
              }
            </CardContent>
          </Card> :

          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredTeams.map((team) =>
              viewMode === "grid" ?
                <TeamCard key={team.id} team={team} /> :

                <TeamListItem key={team.id} team={team} />

            )}
          </div>
        }

        {/* Message Dialog */}
        {selectedTeam &&
          <SendMessageDialog
            open={showMessageDialog}
            onOpenChange={setShowMessageDialog}
            user={user}
            context={{
              type: "team",
              id: selectedTeam.id,
              name: selectedTeam.name
            }}
            defaultRecipientType="team"
            defaultRecipientId={selectedTeam.id} />

        }

        {/* Notification Dialog */}
        {selectedTeam && (isAdmin || selectedTeam.owner_id === user?.id) &&
          <SendNotificationDialog
            open={showNotificationDialog}
            onOpenChange={setShowNotificationDialog}
            user={user}
            context={{
              type: "team",
              id: selectedTeam.id,
              name: selectedTeam.name
            }}
            defaultRecipientType="team"
            defaultRecipientId={selectedTeam.id} />

        }
      </div>
    </div>);

}

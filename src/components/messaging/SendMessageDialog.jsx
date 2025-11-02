
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SendMessageDialog({ 
  open, 
  onOpenChange, 
  user, 
  context = null,
  defaultRecipientType = null,
  defaultRecipientId = null 
}) {
  const [messageData, setMessageData] = useState({
    subject: "",
    message: "",
    recipient_type: defaultRecipientType || "admin",
    recipient_id: defaultRecipientId || "",
    recipient_ids: [],
    team_id: "",
    priority: "normal",
    category: "general"
  });
  const [selectedTeamForTeammates, setSelectedTeamForTeammates] = useState("");
  const [teammateSelectionMode, setTeammateSelectionMode] = useState("individual");
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (defaultRecipientType) {
      setMessageData(prev => ({ ...prev, recipient_type: defaultRecipientType }));
    }
    if (defaultRecipientId) {
      setMessageData(prev => ({ ...prev, recipient_id: defaultRecipientId }));
    }
  }, [defaultRecipientType, defaultRecipientId]);

  // Pre-fill subject with context name when dialog opens
  useEffect(() => {
    if (open && context && context.name) {
      const prefix = {
        site: "Site:",
        plugin: "Plugin:",
        team: "Team:",
        user: "Gebruiker:"
      }[context.type] || "";
      
      setMessageData(prev => ({
        ...prev,
        subject: prev.subject || `${prefix} ${context.name}`.trim()
      }));
    }
  }, [open, context]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin && open,
    initialData: [],
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: open,
    initialData: [],
  });

  const { data: userTeams = [] } = useQuery({
    queryKey: ['user-teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return allTeams.filter(t => 
        t.owner_id === user.id || 
        t.members?.some(m => m.user_id === user.id && m.status === "active")
      );
    },
    enabled: !!user && open,
    initialData: [],
  });

  const { data: teammates = [] } = useQuery({
    queryKey: ['teammates', selectedTeamForTeammates],
    queryFn: async () => {
      if (!selectedTeamForTeammates) return [];
      
      const team = allTeams.find(t => t.id === selectedTeamForTeammates);
      if (!team) return [];
      
      const teammateIds = new Set();
      if (team.owner_id !== user.id) teammateIds.add(team.owner_id);
      
      team.members?.forEach(member => {
        if (member.user_id !== user.id && member.status === "active") {
          teammateIds.add(member.user_id);
        }
      });
      
      const allUsersData = await base44.entities.User.list();
      return allUsersData.filter(u => teammateIds.has(u.id));
    },
    enabled: !!selectedTeamForTeammates && open,
    initialData: [],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const messagePayload = {
        ...data,
        sender_id: user.id,
        sender_email: user.email,
        sender_name: user.full_name,
        context: context || {}
      };

      // Handle different recipient types
      if (data.recipient_type === "teammates") {
        if (teammateSelectionMode === "individual") {
          messagePayload.recipient_type = "user";
          const recipient = teammates.find(u => u.id === data.recipient_id);
          messagePayload.recipient_email = recipient?.email;
        } else if (teammateSelectionMode === "all") {
          messagePayload.recipient_type = "multiple_users";
          messagePayload.recipient_ids = teammates.map(t => t.id);
          delete messagePayload.recipient_id;
        } else if (teammateSelectionMode === "team_inbox") {
          messagePayload.recipient_type = "team";
          messagePayload.team_id = selectedTeamForTeammates;
          messagePayload.recipient_id = selectedTeamForTeammates;
          delete messagePayload.recipient_email;
        } else if (teammateSelectionMode === "owner") {
          const team = allTeams.find(t => t.id === selectedTeamForTeammates);
          messagePayload.recipient_type = "user";
          messagePayload.recipient_id = team.owner_id;
          const owner = teammates.find(u => u.id === team.owner_id) || allUsers.find(u => u.id === team.owner_id);
          messagePayload.recipient_email = owner?.email;
        } else if (teammateSelectionMode === "selection") {
          messagePayload.recipient_type = "multiple_users";
          delete messagePayload.recipient_id;
        }
      }

      // Set recipient details based on type
      if (data.recipient_type === "user" && data.recipient_id) {
        const recipient = allUsers.find(u => u.id === data.recipient_id);
        messagePayload.recipient_email = recipient?.email;
      } else if (data.recipient_type === "team" && data.team_id) {
        messagePayload.recipient_id = data.team_id;
      } else if (data.recipient_type === "admin") {
        messagePayload.recipient_id = "platform_admin";
      }

      return base44.entities.Message.create(messagePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['all-messages'] }); // Added this line
      onOpenChange(false);
      resetForm();
      alert('✅ Bericht succesvol verzonden');
    },
    onError: (error) => {
      alert('❌ Fout: ' + error.message);
    }
  });

  const resetForm = () => {
    setMessageData({
      subject: "",
      message: "",
      recipient_type: defaultRecipientType || "admin",
      recipient_id: defaultRecipientId || "",
      recipient_ids: [],
      team_id: "",
      priority: "normal",
      category: "general"
    });
    setSelectedTeamForTeammates("");
    setTeammateSelectionMode("individual");
  };

  const handleSend = () => {
    if (!messageData.subject || !messageData.message) {
      alert('Vul alle verplichte velden in');
      return;
    }
    
    sendMessageMutation.mutate(messageData);
  };

  const toggleRecipient = (userId) => {
    setMessageData(prev => ({
      ...prev,
      recipient_ids: prev.recipient_ids.includes(userId)
        ? prev.recipient_ids.filter(id => id !== userId)
        : [...prev.recipient_ids, userId]
    }));
  };

  const toggleAllUsers = () => {
    const currentSelection = messageData.recipient_ids;
    const availableIds = (messageData.recipient_type === "teammates" ? teammates : allUsers).map(u => u.id);
    
    if (currentSelection.length === availableIds.length) {
      setMessageData(prev => ({ ...prev, recipient_ids: [] }));
    } else {
      setMessageData(prev => ({ ...prev, recipient_ids: availableIds }));
    }
  };

  const toggleAllTeams = () => {
    const currentSelection = messageData.recipient_ids;
    const availableIds = allTeams.map(t => t.id);
    
    if (currentSelection.length === availableIds.length) {
      setMessageData(prev => ({ ...prev, recipient_ids: [] }));
    } else {
      setMessageData(prev => ({ ...prev, recipient_ids: availableIds }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw Bericht Versturen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Ontvanger Type</Label>
            <Select 
              value={messageData.recipient_type} 
              onValueChange={(value) => {
                setMessageData({...messageData, recipient_type: value, recipient_id: "", recipient_ids: [], team_id: ""});
                setSelectedTeamForTeammates("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Platform Admin</SelectItem>
                {!isAdmin && (
                  <SelectItem value="teammates">Teamgenoten</SelectItem>
                )}
                {isAdmin && (
                  <>
                    <SelectItem value="user">Specifieke Gebruiker</SelectItem>
                    <SelectItem value="multiple_users">Selectie van Gebruikers</SelectItem>
                    <SelectItem value="all_users">Alle Gebruikers</SelectItem>
                    <SelectItem value="all_team_owners">Alle Team Owners</SelectItem>
                    <SelectItem value="team">Team Inbox</SelectItem>
                    <SelectItem value="multiple_teams">Selectie van Team Inboxes</SelectItem>
                    <SelectItem value="all_team_inboxes">Alle Team Inboxes</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Teammates Selection */}
          {messageData.recipient_type === "teammates" && (
            <>
              <div>
                <Label>Selecteer Team</Label>
                <Select 
                  value={selectedTeamForTeammates} 
                  onValueChange={setSelectedTeamForTeammates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een team" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTeams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTeamForTeammates && (
                <>
                  <div>
                    <Label>Verstuur naar</Label>
                    <Select 
                      value={teammateSelectionMode} 
                      onValueChange={setTeammateSelectionMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individuele teamgenoot</SelectItem>
                        <SelectItem value="all">Alle teamgenoten</SelectItem>
                        <SelectItem value="team_inbox">Team inbox</SelectItem>
                        <SelectItem value="owner">Team owner</SelectItem>
                        <SelectItem value="selection">Selectie van teamgenoten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {teammateSelectionMode === "individual" && (
                    <div>
                      <Label>Teamgenoot</Label>
                      <Select 
                        value={messageData.recipient_id} 
                        onValueChange={(value) => setMessageData({...messageData, recipient_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer teamgenoot" />
                        </SelectTrigger>
                        <SelectContent>
                          {teammates.map(teammate => (
                            <SelectItem key={teammate.id} value={teammate.id}>
                              {teammate.full_name} ({teammate.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {teammateSelectionMode === "selection" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Selecteer Teamgenoten</Label>
                        <Button size="sm" variant="outline" onClick={toggleAllUsers}>
                          {messageData.recipient_ids.length === teammates.length ? "Deselecteer alles" : "Selecteer alles"}
                        </Button>
                      </div>
                      <ScrollArea className="h-48 border rounded-lg p-2">
                        <div className="space-y-2">
                          {teammates.map(teammate => (
                            <div key={teammate.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                checked={messageData.recipient_ids.includes(teammate.id)}
                                onCheckedChange={() => toggleRecipient(teammate.id)}
                              />
                              <span className="text-sm">{teammate.full_name} ({teammate.email})</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <p className="text-xs text-gray-500 mt-1">{messageData.recipient_ids.length} teamgenoten geselecteerd</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Admin: Single User */}
          {isAdmin && messageData.recipient_type === "user" && (
            <div>
              <Label>Gebruiker</Label>
              <Select 
                value={messageData.recipient_id} 
                onValueChange={(value) => setMessageData({...messageData, recipient_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer gebruiker" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Admin: Multiple Users Selection */}
          {isAdmin && messageData.recipient_type === "multiple_users" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Selecteer Gebruikers</Label>
                <Button size="sm" variant="outline" onClick={toggleAllUsers}>
                  {messageData.recipient_ids.length === allUsers.length ? "Deselecteer alles" : "Selecteer alles"}
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {allUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        checked={messageData.recipient_ids.includes(u.id)}
                        onCheckedChange={() => toggleRecipient(u.id)}
                      />
                      <span className="text-sm">{u.full_name} ({u.email}) {u.role === "admin" && "- Admin"}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-gray-500 mt-1">{messageData.recipient_ids.length} gebruikers geselecteerd</p>
            </div>
          )}

          {/* Admin: Single Team */}
          {isAdmin && messageData.recipient_type === "team" && (
            <div>
              <Label>Team Inbox</Label>
              <Select 
                value={messageData.team_id} 
                onValueChange={(value) => setMessageData({...messageData, team_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer team" />
                </SelectTrigger>
                <SelectContent>
                  {allTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Admin: Multiple Teams Selection */}
          {isAdmin && messageData.recipient_type === "multiple_teams" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Selecteer Team Inboxes</Label>
                <Button size="sm" variant="outline" onClick={toggleAllTeams}>
                  {messageData.recipient_ids.length === allTeams.length ? "Deselecteer alles" : "Selecteer alles"}
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {allTeams.map(team => (
                    <div key={team.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        checked={messageData.recipient_ids.includes(team.id)}
                        onCheckedChange={() => toggleRecipient(team.id)}
                      />
                      <span className="text-sm">{team.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-gray-500 mt-1">{messageData.recipient_ids.length} teams geselecteerd</p>
            </div>
          )}

          {/* Subject and Message */}
          <div>
            <Label htmlFor="subject">Onderwerp *</Label>
            <Input
              id="subject"
              value={messageData.subject}
              onChange={(e) => setMessageData({...messageData, subject: e.target.value})}
              placeholder="Onderwerp van het bericht"
            />
          </div>

          <div>
            <Label htmlFor="message">Bericht *</Label>
            <Textarea
              id="message"
              value={messageData.message}
              onChange={(e) => setMessageData({...messageData, message: e.target.value})}
              placeholder="Schrijf je bericht..."
              rows={6}
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioriteit</Label>
              <Select 
                value={messageData.priority} 
                onValueChange={(value) => setMessageData({...messageData, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Laag</SelectItem>
                  <SelectItem value="normal">Normaal</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categorie</Label>
              <Select 
                value={messageData.category} 
                onValueChange={(value) => setMessageData({...messageData, category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Algemeen</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleSend}
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Versturen...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Verstuur Bericht
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

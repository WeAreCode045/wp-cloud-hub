
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Globe,
  Package,
  Users,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  Download,
  ShieldCheck,
  Crown,
  Wrench,
  Activity,
  Mail,
  Briefcase,
  Menu,
  X,
  Search,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout: authLogout } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [prevUnreadMessagesCount, setPrevUnreadMessagesCount] = useState(0);
  const [showMessagesAnimation, setShowMessagesAnimation] = useState(false);
  const [activeConnector, setActiveConnector] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({
    name: "WP Plugin Hub",
    subtitle: "Plugin Management",
    icon: null
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed from sidebarCollapsed
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authUser) {
      loadUser();
      loadUnreadNotifications();
      loadUnreadMessages();
      loadActiveConnector();
      loadPlatformSettings();

      const interval = setInterval(() => {
        loadUnreadNotifications();
        loadUnreadMessages();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [authUser]);

  useEffect(() => {
    if (unreadCount > prevUnreadCount && prevUnreadCount !== null) {
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 1000);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (unreadMessagesCount > prevUnreadMessagesCount && prevUnreadMessagesCount !== null) {
      setShowMessagesAnimation(true);
      setTimeout(() => setShowMessagesAnimation(false), 1500);
    }
    setPrevUnreadMessagesCount(unreadMessagesCount);
  }, [unreadMessagesCount]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const currentUser = await base44.auth.me();
      const notifications = await base44.entities.Notification.filter({
        recipient_id: currentUser.id,
        is_read: false
      });
      setUnreadCount(notifications.length);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const loadUnreadMessages = async () => {
    try {
      const currentUser = await base44.auth.me();
      const allMessages = await base44.entities.Message.list();

      const allTeams = await base44.entities.Team.list();
      const userTeams = allTeams.filter(t =>
        t.owner_id === currentUser.id ||
        t.members?.some(m => m.user_id === currentUser.id && m.status === "active")
      );
      const userTeamIds = userTeams.map(t => t.id);

      const unreadPersonalMessages = allMessages.filter(m =>
        m.recipient_id === currentUser.id &&
        !m.is_read &&
        m.recipient_type === "user"
      );

      const unreadTeamMessages = allMessages.filter(m =>
        m.recipient_type === "team" &&
        userTeamIds.includes(m.team_id) &&
        !m.is_read
      );

      const messagesWithNewReplies = allMessages.filter(m => {
        if (!m.replies || m.replies.length === 0) return false;

        const isRecipient = (m.recipient_id === currentUser.id && m.recipient_type === "user") ||
                            (m.recipient_type === "team" && userTeamIds.includes(m.team_id));

        if (!isRecipient) return false;

        return !m.is_read;
      });

      const totalUnread = unreadPersonalMessages.length +
                          unreadTeamMessages.length +
                          messagesWithNewReplies.length;

      setUnreadMessagesCount(totalUnread);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadActiveConnector = async () => {
    try {
      const settings = await base44.entities.SiteSettings.list();
      const activeVersion = settings.find(s => s.setting_key === 'active_connector_version')?.setting_value;

      if (activeVersion) {
        const connectors = await base44.entities.Connector.list();
        const connector = connectors.find(c => c.version === activeVersion);
        setActiveConnector(connector);
      }
    } catch (error) {
      console.error("Error loading connector:", error);
    }
  };

  const loadPlatformSettings = async () => {
    try {
      const settings = await base44.entities.SiteSettings.list();
      const name = settings.find(s => s.setting_key === 'platform_name')?.setting_value;
      const subtitle = settings.find(s => s.setting_key === 'platform_subtitle')?.setting_value;
      const icon = settings.find(s => s.setting_key === 'platform_icon')?.setting_value;

      setPlatformSettings({
        name: name || "WP Plugin Hub",
        subtitle: subtitle || "Plugin Management",
        icon: icon || null
      });
    } catch (error) {
      console.error("Error loading platform settings:", error);
    }
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['header-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Notification.filter({ recipient_id: user.id }, "-created_date", 5);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['header-activities', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allActivities = await base44.entities.ActivityLog.filter({ user_email: user.email }, "-created_date", 5);
      return allActivities.filter(activity => activity.entity_type !== "connector");
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['header-messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allMessages = await base44.entities.Message.list("-created_date");

      const allTeams = await base44.entities.Team.list();
      const userTeams = allTeams.filter(t =>
        t.owner_id === user.id ||
        t.members?.some(m => m.user_id === user.id && m.status === "active")
      );
      const userTeamIds = userTeams.map(t => t.id);

      const filteredMessages = allMessages.filter(m =>
        (m.recipient_id === user.id && m.recipient_type === "user") ||
        (m.recipient_type === "team" && userTeamIds.includes(m.team_id))
      );

      return filteredMessages
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5);
    },
    enabled: !!user,
    initialData: [],
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (notification) => {
      if (!notification.team_invite_id) throw new Error('Geen team uitnodiging ID');

      const invites = await base44.entities.TeamInvite.filter({ id: notification.team_invite_id });
      if (invites.length === 0) throw new Error('Uitnodiging niet gevonden');

      const invite = invites[0];
      await base44.entities.TeamInvite.update(invite.id, {
        status: "accepted",
        accepted_at: new Date().toISOString()
      });

      const teams = await base44.entities.Team.filter({ id: invite.team_id });
      if (teams.length === 0) throw new Error("Team niet gevonden");

      const team = teams[0];
      const currentMembers = team.members || [];
      const existingMemberIndex = currentMembers.findIndex(m => m.user_id === user.id);

      let updatedMembers;
      if (existingMemberIndex !== -1) {
        updatedMembers = currentMembers.map((m, index) =>
          index === existingMemberIndex ? { ...m, status: "active" } : m
        );
      } else {
        updatedMembers = [
          ...currentMembers,
          {
            user_id: user.id,
            email: user.email,
            team_role_id: invite.team_role_id,
            status: "active",
            joined_at: new Date().toISOString()
          }
        ];
      }

      await base44.entities.Team.update(team.id, { members: updatedMembers });
      await base44.entities.Notification.update(notification.id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      loadUnreadNotifications();
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
      loadUnreadNotifications();
    },
  });

  const markMessageAsReadMutation = useMutation({
    mutationFn: (messageId) =>
      base44.entities.Message.update(messageId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-messages'] });
      loadUnreadMessages();
    },
  });

  const handleLogout = async () => {
    sessionStorage.removeItem('2fa_session_id');

    if (user?.two_fa_enabled) {
      base44.functions.invoke('reset2FAStatus', {}).catch(err => {
        console.error('Error resetting 2FA status:', err);
      });
    }

    await authLogout();
    navigate('/Auth');
  };

  const isAdmin = user?.role === "admin";

  const myWorkspaceItems = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Sites", url: createPageUrl("Sites"), icon: Globe },
    { title: "Plugins", url: createPageUrl("Plugins"), icon: Package },
    { title: "Berichten", url: createPageUrl("Messages"), icon: Mail }
  ];

  const teamsWorkspaceItems = [
    { title: "Mijn Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Projecten", url: createPageUrl("Projects"), icon: Briefcase }
  ];

  const adminPlatformItems = [
    { title: "Dashboard", url: createPageUrl("AdminDashboard"), icon: ShieldCheck },
    { title: "Gebruikers", url: createPageUrl("UserManager"), icon: Users },
    { title: "Activiteiten", url: createPageUrl("PlatformActivities"), icon: Activity },
    { title: "Settings", url: createPageUrl("SiteSettings"), icon: Settings },
    { title: "Tools", url: createPageUrl("PlatformTools"), icon: Wrench }
  ];

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const publicPages = [createPageUrl("Info"), "/"];
  const authPages = [createPageUrl("TwoFactorAuth")];

  const isPublicPage = publicPages.includes(location.pathname);
  const isAuthPage = authPages.includes(location.pathname);

  if (location.pathname === createPageUrl("Info")) {
    return children;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user && !isPublicPage && !isAuthPage) {
    window.location.href = createPageUrl("Info");
    return null;
  }

  if (user && !isPublicPage && !isAuthPage) {
    if (user.two_fa_enabled) {
      const sessionId = sessionStorage.getItem('2fa_session_id');
      const isVerified = sessionId && sessionId === user.two_fa_verified_session;

      if (!isVerified) {
        window.location.href = createPageUrl("TwoFactorAuth");
        return null;
      }
    }
  }

  if (isAuthPage) {
    return children;
  }

  // The getNotificationIcon function is no longer needed with the new notification rendering
  // const getNotificationIcon = (type) => {
  //   switch (type) {
  //     case "team_invite":
  //       return <Users className="w-4 h-4 text-primary" />;
  //     case "success":
  //       return <ShieldCheck className="w-4 h-4 text-success" />;
  //     case "error":
  //       return <Bell className="w-4 h-4 text-danger" />;
  //     default:
  //       return <Bell className="w-4 h-4 text-primary" />;
  //   }
  // };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      {user && (
        <>
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Logo */}
            <div className="h-20 flex items-center px-6 border-b border-gray-200">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  {platformSettings.icon ? (
                    <img src={platformSettings.icon} alt={platformSettings.name} className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Package className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-sm">{platformSettings.name}</h1>
                  <p className="text-xs text-gray-500">{platformSettings.subtitle}</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 py-6">
              <div className="space-y-6">
                {/* My Workspace */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                    Mijn Workspace
                  </p>
                  <nav className="space-y-1">
                    {myWorkspaceItems.map((item) => (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          location.pathname === item.url
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Teams Workspace */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                    Teams Workspace
                  </p>
                  <nav className="space-y-1">
                    {teamsWorkspaceItems.map((item) => (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          location.pathname === item.url
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Admin Platform */}
                {isAdmin && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                      Admin Platform
                    </p>
                    <nav className="space-y-1">
                      {adminPlatformItems.map((item) => (
                        <Link
                          key={item.title}
                          to={item.url}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            location.pathname === item.url
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Connector Card */}
            {activeConnector && (
              <div className="p-4 border-t border-gray-200">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Connector</h3>
                      <p className="text-xs text-gray-500">v{activeConnector.version}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (activeConnector && activeConnector.file_url) {
                        try {
                          const response = await fetch(activeConnector.file_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `wp-plugin-hub-connector-v${activeConnector.version}.zip`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Error downloading connector:', error);
                          window.open(activeConnector.file_url, '_blank');
                        }
                      }
                    }}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {user && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentPageName}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: nl })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <>
                {/* Search */}
                <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 mr-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Zoeken..."
                    className="bg-transparent border-none focus:outline-none text-sm text-gray-600 w-48"
                  />
                </div>

                {/* Activity Icon - Original was present here, but outline removed it. Re-adding for consistency, assuming it should remain. */}
                <Popover open={activityOpen} onOpenChange={setActivityOpen}>
                  <PopoverTrigger asChild>
                    <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                      <Activity className="w-5 h-5 text-gray-600" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white rounded-2xl shadow-xl border-gray-200" align="end">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Recente Activiteiten</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Jouw laatste acties</p>
                    </div>
                    <ScrollArea className="h-80">
                      <div className="p-2">
                        {recentActivities.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nog geen activiteiten</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {recentActivities.map((activity) => (
                              <div
                                key={activity.id}
                                className="p-3 rounded-xl hover:bg-gray-50 transition-colors"
                              >
                                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                {activity.details && (
                                  <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {format(new Date(activity.created_date), "d MMM HH:mm", { locale: nl })}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Messages */}
                <Popover open={messagesOpen} onOpenChange={setMessagesOpen}>
                  <PopoverTrigger asChild>
                    <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                      <Mail className="w-5 h-5 text-gray-600" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white rounded-2xl shadow-xl border-gray-200" align="end">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Berichten</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{unreadMessagesCount} ongelezen</p>
                    </div>
                    <ScrollArea className="h-80">
                      {recentMessages.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Geen berichten</p>
                        </div>
                      ) : (
                        <div className="p-2">
                          {recentMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-xl mb-2 cursor-pointer transition-colors ${
                                message.is_read ? 'hover:bg-gray-50' : 'bg-indigo-50 hover:bg-indigo-100'
                              }`}
                              onClick={() => {
                                if (!message.is_read) {
                                  markMessageAsReadMutation.mutate(message.id);
                                }
                              }}
                            >
                              <p className="text-sm font-medium text-gray-900">{message.subject}</p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{message.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {format(new Date(message.created_date), "d MMM HH:mm", { locale: nl })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Notifications */}
                <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                      <Bell className="w-5 h-5 text-gray-600" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white rounded-2xl shadow-xl border-gray-200" align="end">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notificaties</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{unreadCount} ongelezen</p>
                    </div>
                    <ScrollArea className="h-80">
                      {notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Geen notificaties</p>
                        </div>
                      ) : (
                        <div className="p-2">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 rounded-xl mb-2 ${
                                notification.is_read ? '' : 'bg-amber-50'
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {format(new Date(notification.created_date), "d MMM HH:mm", { locale: nl })}
                              </p>
                              {notification.type === "team_invite" && !notification.is_read && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => acceptInviteMutation.mutate(notification)}
                                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                                  >
                                    Accepteren
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                  >
                                    Negeren
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-colors ml-2">
                      <Avatar className="w-9 h-9 border-2 border-gray-200">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold">
                          {getInitials(user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left hidden xl:block">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          {user?.full_name || "Gebruiker"}
                          {isAdmin && <Crown className="w-3 h-3 text-amber-500" />}
                        </p>
                        <p className="text-xs text-gray-500">Admin</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 hidden xl:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white rounded-2xl shadow-xl border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-sm text-gray-900">{user?.full_name || "Gebruiker"}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AccountSettings")} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Account Instellingen
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Uitloggen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

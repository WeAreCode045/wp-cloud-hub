
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  Users,
  Globe,
  ArrowRight,
  Grid3x3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  Layers
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Projects() {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    team_id: "",
    site_id: "",
    status: "planning",
    priority: "medium",
    start_date: new Date().toISOString().split('T')[0],
    template_id: ""
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  // Get user's teams
  const { data: userTeams = [] } = useQuery({
    queryKey: ['user-teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allTeams = await base44.entities.Team.list();
      return allTeams.filter(t =>
        t.owner_id === user.id ||
        t.members?.some(m => m.user_id === user.id && m.status === "active")
      );
    },
    enabled: !!user,
    initialData: [],
  });

  // Get all projects for user's teams
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allProjects = await base44.entities.Project.list("-updated_date");
      const teamIds = userTeams.map(t => t.id);
      return allProjects.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!user && userTeams.length > 0,
    initialData: [],
  });

  // Get all sites for dropdown
  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allSites = await base44.entities.Site.list();
      const teamIds = userTeams.map(t => t.id);
      return allSites.filter(s =>
        (s.owner_type === "user" && s.owner_id === user.id) ||
        (s.owner_type === "team" && teamIds.includes(s.owner_id)) ||
        s.shared_with_teams?.some(tid => teamIds.includes(tid))
      );
    },
    enabled: !!user && userTeams.length > 0,
    initialData: [],
  });

  // Get project templates
  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.ProjectTemplate.list();
    },
    enabled: !!user,
    initialData: [],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData) => {
      // If template is selected, get plugins from template
      let plugins = [];
      if (projectData.template_id) {
        const template = templates.find(t => t.id === projectData.template_id);
        if (template && template.plugins) {
          plugins = template.plugins.map(p => ({
            plugin_id: p.plugin_id,
            version: p.version,
            installed: false
          }));
        }
      }

      const newProject = await base44.entities.Project.create({
        ...projectData,
        plugins,
        assigned_members: [{ user_id: user.id, role_on_project: "Project Lead" }],
        timeline_events: [],
        attachments: [],
        notes: ""
      });

      // Log activity
      await base44.entities.ActivityLog.create({
        user_email: user.email,
        action: `Project aangemaakt: ${newProject.title}`,
        entity_type: "project",
        entity_id: newProject.id
      });

      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateDialog(false);
      setNewProject({
        title: "",
        description: "",
        team_id: "",
        site_id: "",
        status: "planning",
        priority: "medium",
        start_date: new Date().toISOString().split('T')[0],
        template_id: ""
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId) => base44.entities.Project.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreateProject = () => {
    if (newProject.title && newProject.team_id && newProject.site_id) {
      createProjectMutation.mutate(newProject);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      planning: "bg-blue-100 text-blue-700",
      in_progress: "bg-indigo-100 text-indigo-700",
      completed: "bg-green-100 text-green-700",
      on_hold: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return colors[status] || colors.planning;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700"
    };
    return colors[priority] || colors.medium;
  };

  const getTeamName = (teamId) => {
    const team = userTeams.find(t => t.id === teamId);
    return team?.name || "Onbekend team";
  };

  const getSiteName = (siteId) => {
    const site = allSites.find(s => s.id === siteId);
    return site?.name || "Onbekende site";
  };

  const ProjectCard = ({ project }) => (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">{project.title}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              <Badge className={getPriorityColor(project.priority)}>
                {project.priority}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Bekijken
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Weet je zeker dat je project "${project.title}" wilt verwijderen?`)) {
                    deleteProjectMutation.mutate(project.id);
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
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2">
          {project.description || "Geen beschrijving"}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{getTeamName(project.team_id)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Globe className="w-4 h-4" />
            <span>{getSiteName(project.site_id)}</span>
          </div>
          {project.start_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(project.start_date), "d MMM yyyy", { locale: nl })}</span>
            </div>
          )}
          {project.plugins && project.plugins.length > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Package className="w-4 h-4" />
              <span>{project.plugins.length} plugins</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-4 border-t">
          <div className="flex -space-x-2">
            {project.assigned_members?.slice(0, 3).map((member, idx) => (
              <Avatar key={idx} className="w-8 h-8 border-2 border-white">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                  {member.user_id?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {project.assigned_members && project.assigned_members.length > 3 && (
            <span className="text-xs text-gray-500">
              +{project.assigned_members.length - 3} meer
            </span>
          )}
        </div>

        <Button asChild className="w-full">
          <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
            Bekijk Project
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  const ProjectListItem = ({ project }) => (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-6 h-6 text-indigo-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
              <Badge className={`${getStatusColor(project.status)} text-xs`}>
                {project.status}
              </Badge>
              <Badge className={`${getPriorityColor(project.priority)} text-xs`}>
                {project.priority}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">
              {project.description || "Geen beschrijving"}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{getTeamName(project.team_id)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>{getSiteName(project.site_id)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" asChild>
              <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
                <Edit className="w-4 h-4" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Weet je zeker dat je project "${project.title}" wilt verwijderen?`)) {
                      deleteProjectMutation.mutate(project.id);
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

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Projecten</h1>
            <p className="text-gray-500">Beheer je team projecten en milestones</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={createPageUrl("ProjectTemplates")}>
                <Layers className="w-5 h-5 mr-2" />
                Templates
              </Link>
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Nieuw Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuw Project Aanmaken</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Project Titel *</Label>
                    <Input
                      id="title"
                      placeholder="Website Redesign"
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Beschrijving</Label>
                    <Textarea
                      id="description"
                      placeholder="Beschrijf het project..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="team">Team *</Label>
                      <Select value={newProject.team_id} onValueChange={(value) => setNewProject({ ...newProject, team_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer team" />
                        </SelectTrigger>
                        <SelectContent>
                          {userTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="site">Site *</Label>
                      <Select value={newProject.site_id} onValueChange={(value) => setNewProject({ ...newProject, site_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer site" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template">Project Template (optioneel)</Label>
                    <Select value={newProject.template_id} onValueChange={(value) => setNewProject({ ...newProject, template_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Geen template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Geen template</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Prioriteit</Label>
                      <Select value={newProject.priority} onValueChange={(value) => setNewProject({ ...newProject, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="start_date">Startdatum</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProject.title || !newProject.team_id || !newProject.site_id || createProjectMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    >
                      {createProjectMutation.isPending ? "Aanmaken..." : "Project Aanmaken"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Zoek projecten..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredProjects.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? "Geen projecten gevonden" : "Nog geen projecten"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? "Probeer een andere zoekopdracht"
                  : "Maak je eerste project aan om te beginnen"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Nieuw Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredProjects.map((project) => (
              viewMode === "grid" ? (
                <ProjectCard key={project.id} project={project} />
              ) : (
                <ProjectListItem key={project.id} project={project} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import SiteDetail from './pages/SiteDetail';
import Plugins from './pages/Plugins';
import PluginDetail from './pages/PluginDetail';
import UserManager from './pages/UserManager';
import AccountSettings from './pages/AccountSettings';
import SiteSettings from './pages/SiteSettings';
import UserDetail from './pages/UserDetail';
import AdminDashboard from './pages/AdminDashboard';
import PlatformActivities from './pages/PlatformActivities';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import TeamSettings from './pages/TeamSettings';
import RoleManager from './pages/RoleManager';
import TeamRoles from './pages/TeamRoles';
import PlatformTools from './pages/PlatformTools';
import Messages from './pages/Messages';
import Info from './pages/Info';
import TwoFactorAuth from './pages/TwoFactorAuth';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectTemplates from './pages/ProjectTemplates';
import Auth from './pages/Auth';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Sites": Sites,
    "SiteDetail": SiteDetail,
    "Plugins": Plugins,
    "PluginDetail": PluginDetail,
    "UserManager": UserManager,
    "AccountSettings": AccountSettings,
    "SiteSettings": SiteSettings,
    "UserDetail": UserDetail,
    "AdminDashboard": AdminDashboard,
    "PlatformActivities": PlatformActivities,
    "Teams": Teams,
    "TeamDetail": TeamDetail,
    "TeamSettings": TeamSettings,
    "RoleManager": RoleManager,
    "TeamRoles": TeamRoles,
    "PlatformTools": PlatformTools,
    "Messages": Messages,
    "Info": Info,
    "TwoFactorAuth": TwoFactorAuth,
    "Projects": Projects,
    "ProjectDetail": ProjectDetail,
    "ProjectTemplates": ProjectTemplates,
    "Auth": Auth,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};
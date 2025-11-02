import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Globe,
  Users,
  Shield,
  Zap,
  RefreshCw,
  Download,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Lock,
  BarChart3,
  Settings,
  Bell,
  Crown,
  LogIn,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";

export default function Info() {
  const [platformSettings, setPlatformSettings] = useState({
    name: "WP Plugin Hub",
    subtitle: "Plugin Management",
    icon: null
  });
  
  const { user, loading: isCheckingAuth } = useAuth();

  useEffect(() => {
    loadPlatformSettings();
  }, []);

  const loadPlatformSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('site_settings')
        .select('*');
      
      if (error) throw error;

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

  const handleLogin = () => {
    window.location.href = '/Auth';
  };

  const features = [
    {
      icon: Package,
      title: "Plugin Beheer",
      description: "Beheer al je WordPress plugins vanaf één centrale locatie. Upload, versies beheren en distribueren naar meerdere sites.",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: Globe,
      title: "Multi-Site Ondersteuning",
      description: "Verbind onbeperkt aantal WordPress sites en beheer ze allemaal vanuit één dashboard.",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      icon: Zap,
      title: "Instant Deployment",
      description: "Installeer en activeer plugins op meerdere sites tegelijk met één klik. Bespaar uren werk.",
      color: "from-amber-500 to-amber-600"
    },
    {
      icon: RefreshCw,
      title: "Automatische Updates",
      description: "Houd al je plugins up-to-date over alle sites. Push updates naar specifieke of alle sites tegelijk.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Users,
      title: "Team Samenwerking",
      description: "Werk samen met je team. Deel plugins en sites met teamleden met verschillende toegangsniveaus.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Shield,
      title: "Veilig & Betrouwbaar",
      description: "Enterprise-grade beveiliging met API key authenticatie en geëncrypteerde communicatie.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: BarChart3,
      title: "Uitgebreide Analytics",
      description: "Krijg inzicht in plugin gebruik, activiteit logs en site statistieken.",
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: Bell,
      title: "Notificaties & Alerts",
      description: "Blijf op de hoogte met real-time notificaties over plugin updates en site activiteiten.",
      color: "from-cyan-500 to-cyan-600"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "€29",
      period: "/maand",
      description: "Perfect voor freelancers en kleine projecten",
      features: [
        "Tot 5 WordPress sites",
        "Tot 10 plugins beheren",
        "Basis team samenwerking",
        "Email ondersteuning",
        "Automatische backups",
        "SSL certificaat"
      ],
      highlighted: false,
      color: "border-gray-200"
    },
    {
      name: "Professional",
      price: "€79",
      period: "/maand",
      description: "Ideaal voor agencies en groeiende teams",
      features: [
        "Tot 25 WordPress sites",
        "Onbeperkt plugins beheren",
        "Uitgebreide team samenwerking",
        "Priority support",
        "Automatische backups",
        "SSL certificaat",
        "Custom roles & permissions",
        "Advanced analytics"
      ],
      highlighted: true,
      badge: "Meest Populair",
      color: "border-indigo-500"
    },
    {
      name: "Enterprise",
      price: "€199",
      period: "/maand",
      description: "Voor grote organisaties met specifieke behoeften",
      features: [
        "Onbeperkt WordPress sites",
        "Onbeperkt plugins beheren",
        "Advanced team management",
        "24/7 dedicated support",
        "Automatische backups",
        "SSL certificaat",
        "Custom roles & permissions",
        "Advanced analytics",
        "White-label optie",
        "Custom integrations",
        "SLA garantie"
      ],
      highlighted: false,
      color: "border-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            {platformSettings.icon ? (
              <img 
                src={platformSettings.icon} 
                alt={platformSettings.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Package className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-base text-gray-900">{platformSettings.name}</h2>
          </div>
        </div>
        
        {!isCheckingAuth && (
          user ? (
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link to={createPageUrl("Dashboard")}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button 
              onClick={handleLogin}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Inloggen
            </Button>
          )
        )}
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-70"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="text-center">
            <Badge className="mb-6 bg-indigo-100 text-indigo-700 border-indigo-200 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              WordPress Plugin Management Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Beheer al je WordPress
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"> Plugins</span>
              <br />vanaf één plek
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Upload, versie beheer, en distribueer je WordPress plugins naar meerdere sites met één klik. 
              Bespaar tijd en verhoog efficiëntie.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button asChild size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <Link to={createPageUrl("Dashboard")}>
                    <LayoutDashboard className="w-5 h-5 mr-2" />
                    Ga naar Dashboard
                  </Link>
                </Button>
              ) : (
                <Button 
                  onClick={handleLogin}
                  size="lg" 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  Start Gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-2 hover:bg-gray-50"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Connector
              </Button>
            </div>
            
            {!user && (
              <p className="text-sm text-gray-500 mt-6">
                Geen credit card vereist • 14 dagen gratis proberen • Opzeggen wanneer je wilt
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
            Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Alles wat je nodig hebt
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Krachtige tools om je WordPress plugin workflow te optimaliseren
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">50K+</div>
              <div className="text-indigo-100">Plugins Beheerd</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">10K+</div>
              <div className="text-indigo-100">WordPress Sites</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">99.9%</div>
              <div className="text-indigo-100">Uptime</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-indigo-100">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-indigo-100 text-indigo-700 border-indigo-200">
            Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Kies het plan dat bij je past
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Flexibele prijzen voor teams van elke grootte
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index}
              className={`border-2 ${plan.color} shadow-lg hover:shadow-2xl transition-all duration-300 ${
                plan.highlighted ? 'ring-4 ring-indigo-200 transform scale-105' : ''
              }`}
            >
              <CardHeader className="text-center pb-8">
                {plan.badge && (
                  <Badge className="mb-4 bg-indigo-600 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    {plan.badge}
                  </Badge>
                )}
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                {user ? (
                  <Button asChild className={`w-full mt-6 ${
                    plan.highlighted 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`} size="lg">
                    <Link to={createPageUrl("Dashboard")}>
                      Ga naar Dashboard
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    onClick={handleLogin}
                    className={`w-full mt-6 ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                    size="lg"
                  >
                    Start Gratis Trial
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-gray-500 mt-8">
          Alle prijzen zijn exclusief BTW • Jaarlijks betalen = 2 maanden gratis
        </p>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl text-indigo-200 mb-10">
            Sluit je aan bij duizenden WordPress professionals die hun workflow al hebben geoptimaliseerd
          </p>
          {user ? (
            <Button asChild size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 text-lg px-8 py-6 shadow-xl">
              <Link to={createPageUrl("Dashboard")}>
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Ga naar Dashboard
              </Link>
            </Button>
          ) : (
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-white text-indigo-900 hover:bg-gray-100 text-lg px-8 py-6 shadow-xl"
            >
              Start Nu - Het is Gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
}

import React from 'react';
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ScrollText,
  Settings,
  Info,
  Mail,
  Shield,
  FileText,
  CreditCard,
  Compass,
  User,
  Menu,
  Bell,
  PlusSquare,
  LucideIcon,
  Globe,
  Camera,
  ImagePlus,
  Film,
  Layout,
  MessageSquare,
  BarChartBig,
  ClipboardList // Added icon for Admin Tasks
} from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar/context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/hooks/multi-agent/project-context"; // Import project context hook
import { Notification } from "@/types/custom-order";
import { 
  BaseNavigationItem, 
  NavigationItem, 
  NavigationItemWithBadge, 
  IntegrationsNavigationItem 
} from "@/components/ui/sidebar/types";

export const Navigation = () => {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [customOrderNotifications, setCustomOrderNotifications] = useState<number>(0);
  const { activeProject } = useProjectContext(); // Get active project ID from context
  console.log('[Navigation.tsx] Active Project ID from context:', activeProject); // DEBUG LOG

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAdmin(false);
          setIsLoadingAdmin(false);
          return;
        }
        
        const { data: adminData, error: adminError } = await supabase.rpc(
          'check_is_admin'
        );
        
        if (adminError) {
          console.error("Error checking admin status:", adminError);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!adminData);
        }
        
        setIsLoadingAdmin(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        setIsLoadingAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoadingNotifications(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('read', false)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setNotifications(data as unknown as Notification[]);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:user_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'user_notifications' }, 
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_notifications' },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          if (updatedNotification.read) {
            setNotifications(prev => prev.filter(n => n.id !== updatedNotification.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      const orderNotifications = notifications.filter(n => n.type === 'custom_order');
      setCustomOrderNotifications(orderNotifications.length);
    }
  }, [notifications]);

  const baseNavigation: NavigationItemWithBadge[] = [
    {
      name: "Canvas",
      subtext: "Video Project Canvas",
      to: "/canvas",
      icon: Layout,
      current: location.pathname === "/canvas",
    },
    {
      name: "Multi-Agent Chat",
      subtext: "AI Collaboration",
      // Dynamically set the 'to' link based on activeProject
      to: activeProject ? `/multi-agent-chat/${activeProject}` : "/multi-agent-chat",
      icon: MessageSquare,
      current: location.pathname === "/multi-agent-chat",
    },
    {
      name: "Trace Analytics",
      subtext: "Agent Interaction Analysis",
      to: "/trace-analytics",
      icon: BarChartBig,
      current: location.pathname === "/trace-analytics", 
    },
    {
      name: "Browser Worker AI",
      subtext: "Web Browser Automation",
      to: "/browser-use",
      icon: Globe,
      current: location.pathname === "/browser-use",
    },
    {
      name: "Dashboard",
      subtext: "Your Content Overview",
      to: "/",
      icon: ScrollText,
      badge: notifications.length > 0 ? notifications.length : undefined,
      current: location.pathname === "/" || location.pathname === "/dashboard",
    },
    {
      name: "Custom Orders",
      subtext: "Request Personalized Content",
      to: "/custom-orders",
      icon: PlusSquare,
      badge: customOrderNotifications > 0 ? customOrderNotifications : undefined,
    },
    {
      name: "Explore",
      subtext: "Discover Amazing Content",
      to: "/explore",
      icon: Compass,
    },
    {
      name: "Product Shot V1",
      subtext: "Basic Product Photography",
      to: "/product-shoot",
      icon: Camera,
    },
    {
      name: "Advanced Shot",
      subtext: "Enhanced Product Photography",
      to: "/product-shoot-v2",
      icon: ImagePlus,
    },
    {
      name: "Image to Video",
      subtext: "Convert Images to Videos",
      to: "/image-to-video",
      icon: Film,
    },
    {
      name: "Plans & Billing",
      to: "/plans",
      icon: CreditCard,
    },
    {
      name: "Profile Settings",
      to: "/profile",
      icon: User,
    },
  ];

  const disabledItems: NavigationItemWithBadge[] = [];

  const combinedNavigation = [...baseNavigation, ...disabledItems];

  const adminItem: NavigationItem = {
    name: "Admin",
    subtext: "Admin Dashboard",
    to: "/admin",
    icon: Shield,
    adminOnly: true,
  };

  const adminTasksItem: NavigationItem = {
    name: "Admin Tasks",
    subtext: "Manage Admin Tasks",
    to: "/admin/tasks",
    icon: ClipboardList, // Use the imported icon
    adminOnly: true,
  };

  const integrationsItem: IntegrationsNavigationItem = {
    name: "Integrations",
    icon: Settings,
    disabled: true,
    comingSoon: true,
  };

  const mainNavigation: NavigationItem[] = isLoadingAdmin
    ? combinedNavigation
    : isAdmin
      ? [...combinedNavigation, adminItem, adminTasksItem, integrationsItem] // Add adminTasksItem here
      : [...combinedNavigation, integrationsItem];

  const legalNavigation: BaseNavigationItem[] = [
    {
      name: "About Us",
      to: "/about",
      icon: Info,
    },
    {
      name: "Contact",
      to: "/contact",
      icon: Mail,
    },
    {
      name: "Privacy Policy",
      to: "/privacy",
      icon: Shield,
    },
    {
      name: "Terms of Service",
      to: "/terms",
      icon: FileText,
    },
  ];

  const hasBadge = (item: NavigationItem): item is NavigationItemWithBadge => {
    return 'badge' in item && item.badge !== undefined;
  };

  const isDisabled = (item: NavigationItem): boolean => {
    return 'disabled' in item && item.disabled === true;
  };

  const hasComingSoon = (item: NavigationItem): boolean => {
    return 'comingSoon' in item && item.comingSoon === true;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>
      <nav className="space-y-6 px-2">
        <div className="space-y-1">
          {mainNavigation.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                item.to && location.pathname === item.to
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
                isDisabled(item) && "opacity-50 cursor-not-allowed"
              )}
              asChild={!isDisabled(item) && item.to !== undefined}
              disabled={isDisabled(item)}
            >
              {!isDisabled(item) && item.to ? (
                <Link to={item.to} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>{item.name}</div>
                    {item.subtext && (
                      <div className="text-xs text-muted-foreground">
                        {item.subtext}
                      </div>
                    )}
                  </div>
                  {hasBadge(item) && item.badge && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                  {hasComingSoon(item) && (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  )}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>{item.name}</div>
                    {item.subtext && (
                      <div className="text-xs text-muted-foreground">
                        {item.subtext}
                      </div>
                    )}
                  </div>
                  {hasBadge(item) && item.badge && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                  {hasComingSoon(item) && (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  )}
                </div>
              )}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400">Information</h3>
          </div>
          {legalNavigation.map((item) => (
            <Link key={item.name} to={item.to || "#"}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 text-sm",
                  item.to && location.pathname === item.to && "bg-gray-800 text-white"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

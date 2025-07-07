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
import { useUser } from "@/hooks/use-user"; // Import useUser hook
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
  const { user, isAdmin, isLoading: isUserLoading } = useUser(); // Use the hook
  // const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // Remove local state
  // const [isLoadingAdmin, setIsLoadingAdmin] = useState(true); // Remove local state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [customOrderNotifications, setCustomOrderNotifications] = useState<number>(0);
  // const { activeProject } = useProjectContext(); // No longer needed for this link
  const [latestProjectId, setLatestProjectId] = useState<string | null>(null);
  const [isLoadingLatestProject, setIsLoadingLatestProject] = useState(true);

  // Remove the local useEffect for checking admin status, as useUser handles it.
  // useEffect(() => {
  //   const checkAdminStatus = async () => { ... };
  //   checkAdminStatus();
  // }, []);
  useEffect(() => {
    const fetchLatestProject = async () => {
      setIsLoadingLatestProject(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          console.log('[Navigation.tsx] No user session found for fetching latest project.');
          setLatestProjectId(null);
          setIsLoadingLatestProject(false);
          return;
        }

        console.log('[Navigation.tsx] Fetching latest project for user:', session.user.id);
        const { data, error } = await supabase
          .from('canvas_projects')
          .select('id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to handle 0 or 1 result

        if (error) {
          console.error("[Navigation.tsx] Error fetching latest project:", error);
          setLatestProjectId(null);
        } else {
          console.log('[Navigation.tsx] Fetched latest project ID:', data?.id);
          setLatestProjectId(data?.id || null);
        }
      } catch (error) {
        console.error("[Navigation.tsx] Exception fetching latest project:", error);
        setLatestProjectId(null);
      } finally {
        setIsLoadingLatestProject(false);
      }
    };

    fetchLatestProject();
  }, []); // Fetch only once on mount

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
    // Removed Trace Analytics from baseNavigation
    // Removed Browser Worker AI from baseNavigation
    {
      name: "Dashboard",
      subtext: "Your Content Overview",
      to: "/",
      icon: ScrollText,
      badge: notifications.length > 0 ? notifications.length : undefined,
      current: location.pathname === "/" || location.pathname === "/dashboard",
    },
    {
      name: "Explore",
      subtext: "Discover Amazing Content",
      to: "/explore",
      icon: Compass,
    },
    {
      name: "AI UGC Video",
      subtext: "powered by context flux",
      to: "/create-video",
      icon: Film, // Using Film icon as Video icon wasn't imported
      current: location.pathname === "/create-video",
    },
    {
      name: "Plans & Billing",
      to: "/plans",
      icon: CreditCard,
    },
    {
      name: "Profile Settings",
      to: "/settings", // Updated path to match the new route
      icon: User,
    },
  ];

  const disabledItems: NavigationItemWithBadge[] = [];

  const combinedNavigation = [...baseNavigation, ...disabledItems];

  // Define Trace Analytics item separately
  const traceAnalyticsItem: NavigationItem = {
    name: "Trace Analytics",
    subtext: "Agent Interaction Analysis",
    to: "/trace-analytics",
    icon: BarChartBig,
    current: location.pathname === "/trace-analytics",
    adminOnly: true, // Mark as admin only
  };

  // Define Browser Worker AI item separately
  const browserWorkerItem: NavigationItem = {
    name: "Browser Worker AI",
    subtext: "Web Browser Automation",
    to: "/browser-use",
    icon: Globe,
    current: location.pathname === "/browser-use",
    adminOnly: true, // Mark as admin only
  };

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

  // Define allowed item names for non-admins
  const nonAdminAllowedNames = ["Dashboard", "Custom Orders", "Plans & Billing", "Profile Settings", "AI UGC Video", "Explore"];

  // Construct mainNavigation based on user loading state and admin status
  const mainNavigation: NavigationItem[] = isUserLoading
    ? baseNavigation.filter(item => nonAdminAllowedNames.includes(item.name)) // Show filtered base items while loading
    : isAdmin
      ? [...combinedNavigation, adminItem, integrationsItem] // If admin (and not loading), show all combined + admin items (removed Browser Worker AI, Trace Analytics, Admin Tasks)
      : [...baseNavigation.filter(item => nonAdminAllowedNames.includes(item.name)), integrationsItem]; // If not admin (and not loading), show filtered base items + integrations

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
 
  // Removed debug logs
 
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

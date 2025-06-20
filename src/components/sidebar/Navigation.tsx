
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
  Layout,
  ClipboardList
} from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar/context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-user";
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
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [customOrderNotifications, setCustomOrderNotifications] = useState<number>(0);

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
      name: "Product Video",
      subtext: "Create Videos from Products",
      to: "/create-video",
      icon: Layout,
      current: location.pathname === "/create-video",
    },
    {
      name: "Plans & Billing",
      to: "/plans",
      icon: CreditCard,
    },
    {
      name: "Profile Settings",
      to: "/settings",
      icon: User,
    },
  ];

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
    icon: ClipboardList,
    adminOnly: true,
  };

  const integrationsItem: IntegrationsNavigationItem = {
    name: "Integrations",
    icon: Settings,
    disabled: true,
    comingSoon: true,
  };

  // Define allowed item names for non-admins
  const nonAdminAllowedNames = ["Dashboard", "Custom Orders", "Plans & Billing", "Profile Settings", "Product Video", "Canvas", "Explore"];

  // Construct mainNavigation based on user loading state and admin status
  const mainNavigation: NavigationItem[] = isUserLoading
    ? baseNavigation.filter(item => nonAdminAllowedNames.includes(item.name))
    : isAdmin
      ? [...baseNavigation, adminItem, adminTasksItem, integrationsItem]
      : [...baseNavigation.filter(item => nonAdminAllowedNames.includes(item.name)), integrationsItem];

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

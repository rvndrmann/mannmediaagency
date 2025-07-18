
import { Compass, ScrollText, Settings, Package, Globe, Camera, ImagePlus, Film } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  {
    label: "Browser",
    icon: Globe,
    href: "/browser-use"
  },
  {
    label: "Dashboard",
    icon: ScrollText,
    href: "/"
  },
  {
    label: "Orders",
    icon: Package,
    href: "/custom-orders"
  },
  {
    label: "Explore",
    icon: Compass,
    href: "/explore"
  },
  {
    label: "Shot V1",
    icon: Camera,
    href: "/product-shoot"
  },
  {
    label: "Shot V2",
    icon: ImagePlus,
    href: "/product-shoot-v2"
  },
  {
    label: "Img to Video",
    icon: Film,
    href: "/image-to-video"
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/profile"
  }
  // Multi-Agent Chat and AI UGC Video items removed
];

export const BottomNav = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check if current route is an auth route
  const isAuthRoute = location.pathname.startsWith('/auth/') || 
                     (location.pathname === '/' && !isAuthenticated);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Don't render the navigation on auth routes
  if (isAuthRoute) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      <nav className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full px-2 gap-1",
              "text-muted-foreground hover:text-foreground transition-colors",
              (location.pathname === item.href || 
               (item.href === "/" && location.pathname === "/dashboard"))
                && "text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

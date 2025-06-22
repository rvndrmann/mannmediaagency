
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  ShoppingCart, 
  LayoutGrid,
  Settings,
  Shield
} from "lucide-react";
import { useUser } from "@/hooks/use-user";

export const Navigation = () => {
  const location = useLocation();
  const { isAdmin } = useUser();

  const navigationItems = [
    {
      title: "Create Video",
      href: "/create-video",
      icon: Video,
      description: "Generate professional videos"
    },
    {
      title: "Custom Orders",
      href: "/custom-orders", 
      icon: ShoppingCart,
      description: "Order custom content"
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      description: "Manage your account"
    }
  ];

  const adminItems = [
    {
      title: "Canvas",
      href: "/canvas",
      icon: LayoutGrid,
      description: "Admin canvas workspace"
    },
    {
      title: "Admin Panel",
      href: "/admin",
      icon: Shield,
      description: "System administration"
    }
  ];

  const isActiveRoute = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {navigationItems.map((item) => (
          <Link key={item.href} to={item.href}>
            <Button
              variant={isActiveRoute(item.href) ? "secondary" : "ghost"}
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <item.icon className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </Button>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <>
          <div className="border-t border-gray-200 my-4"></div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              Admin
            </div>
            {adminItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActiveRoute(item.href) ? "secondary" : "ghost"}
                  className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

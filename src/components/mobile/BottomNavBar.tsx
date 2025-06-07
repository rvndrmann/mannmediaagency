
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export const BottomNavBar = () => {
  const location = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/create-video", label: "Video", icon: Video },
    { href: "/plans", label: "Plans", icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-2 md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/" && location.pathname === "/dashboard");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};


import { Bot, Compass, ScrollText, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "AI Agent",
    icon: Bot,
    href: "/ai-agent"
  },
  {
    label: "Explore",
    icon: Compass,
    href: "/explore"
  },
  {
    label: "Dashboard",
    icon: ScrollText,
    href: "/dashboard"
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/profile"
  }
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      <nav className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full px-2 gap-1",
              "text-muted-foreground hover:text-foreground transition-colors",
              location.pathname === item.href && "text-foreground"
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

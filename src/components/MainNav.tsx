
import React from 'react';
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";
import { useUser } from "@/hooks/use-user"; // Import useUser hook

export function MainNav() {
  const location = useLocation();
  const { isAdmin, isLoading: isUserLoading } = useUser(); // Get admin status and loading state
  const links = [
    {
      name: "Browser Worker AI",
      href: "/browser-use",
      active: location.pathname === "/browser-use",
      icon: <Globe className="w-4 h-4 mr-2" />,
    },
    {
      name: "Dashboard",
      href: "/",
      active: location.pathname === "/" || location.pathname === "/dashboard",
    },
  ].filter(link => {
    // Always show dashboard
    if (link.href === "/" || link.href === "/dashboard") return true;
    // Only show Browser Worker AI if user is admin
    if (link.href === "/browser-use") return isAdmin;
    // Include other links by default if any are added later
    return true;
  });

  return (
    <nav className="flex items-center space-x-6 font-medium">
      {/* Only render links once user loading is complete to avoid flicker */}
      {!isUserLoading && links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className={cn(
            "flex items-center transition-colors hover:text-foreground/80",
            link.active ? "text-foreground" : "text-foreground/60"
          )}
        >
          {link.icon}
          {link.name}
        </Link>
      ))}
    </nav>
  );
}

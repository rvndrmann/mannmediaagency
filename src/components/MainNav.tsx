
import React from 'react';
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

export function MainNav() {
  const location = useLocation();

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
      active: location.pathname === "/",
    },
  ];

  return (
    <nav className="flex items-center space-x-6 font-medium">
      {links.map((link) => (
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

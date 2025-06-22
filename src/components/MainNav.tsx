
import React, { useState } from 'react';
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export function MainNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, isLoading: isUserLoading } = useUser();
  
  const links = [
    {
      name: "Dashboard",
      href: "/",
      active: location.pathname === "/" || location.pathname === "/dashboard",
    },
  ];

  return (
    <nav className="flex items-center justify-between w-full py-4 px-6 md:px-0">
      {/* Hamburger Menu for Mobile */}
      <button
        className="md:hidden"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Navigation Links */}
      <div className={`md:flex items-center space-x-6 font-medium ${isMenuOpen ? 'flex flex-col absolute top-16 left-0 w-full bg-background z-50 p-4 md:relative md:flex md:flex-row md:top-0 md:left-auto md:w-auto md:bg-transparent md:p-0' : 'hidden md:flex'}`}>
        {!isUserLoading && links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              "flex items-center transition-colors hover:text-foreground/80 py-2 md:py-0",
              link.active ? "text-foreground" : "text-foreground/60"
            )}
          >
            {link.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

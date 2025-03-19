
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Computer } from "lucide-react";

export function MainNav() {
  const pathname = usePathname();

  const links = [
    {
      name: "Dashboard",
      href: "/",
      active: pathname === "/",
    },
    {
      name: "Computer Agent",
      href: "/computer-use",
      active: pathname === "/computer-use",
    },
    {
      name: "Browser API",
      href: "/browser-use",
      active: pathname === "/browser-use",
      icon: <Computer className="w-4 h-4 mr-2" />,
    },
  ];

  return (
    <nav className="flex items-center space-x-6 font-medium">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
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


import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ScrollText,
  GalleryHorizontalEnd,
  Video,
  Settings,
  FileVideo,
  Image,
  Database,
  Info,
  Mail,
  Shield,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export const Navigation = () => {
  const location = useLocation();

  const mainNavigation = [
    {
      name: "AI Agent",
      to: "/ai-agent",
      icon: GalleryHorizontalEnd,
    },
    {
      name: "Stories",
      to: "/",
      icon: ScrollText,
    },
    {
      name: "Product Shoot",
      to: "/product-shoot",
      icon: Image,
    },
    {
      name: "Image to Video",
      to: "/image-to-video",
      icon: FileVideo,
    },
    {
      name: "Faceless Video",
      to: "/create-video",
      icon: Video,
    },
    {
      name: "Metadata Manager",
      to: "/metadata",
      icon: Database,
    },
    {
      name: "Integrations",
      to: "/integrations",
      icon: Settings,
    },
  ];

  const legalNavigation = [
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

  return (
    <nav className="space-y-2">
      <div className="space-y-2">
        {mainNavigation.map((item) => (
          <Link key={item.name} to={item.to}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800",
                location.pathname === item.to && "bg-gray-800 text-white"
              )}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Button>
          </Link>
        ))}
      </div>
      
      <Separator className="my-4 bg-gray-800" />
      
      <div className="space-y-1">
        <div className="px-2 py-1">
          <h3 className="text-xs font-semibold text-gray-400">Information</h3>
        </div>
        {legalNavigation.map((item) => (
          <Link key={item.name} to={item.to}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 text-sm",
                location.pathname === item.to && "bg-gray-800 text-white"
              )}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  );
};

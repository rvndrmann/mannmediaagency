
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
      subtext: "Powered by ChatGPT-4o",
      logo: "/lovable-uploads/4fef3d5e-6027-4434-ac33-efd08f0819df.png",
      to: "/ai-agent",
      icon: GalleryHorizontalEnd,
    },
    {
      name: "Stories",
      subtext: "Powered by King AI",
      to: "/",
      icon: ScrollText,
    },
    {
      name: "Product Shoot",
      subtext: "Powered by Fal.ai",
      to: "/product-shoot",
      icon: Image,
    },
    {
      name: "Image to Video",
      subtext: "Powered by Kling AI",
      logo: "/lovable-uploads/e22e8141-25e1-46b8-9b6f-139efcb4b84d.png",
      to: "/image-to-video",
      icon: FileVideo,
    },
    {
      name: "Faceless Video",
      subtext: "Powered by Kling AI",
      logo: "/lovable-uploads/e22e8141-25e1-46b8-9b6f-139efcb4b84d.png",
      to: "/create-video",
      icon: Video,
    },
    {
      name: "Metadata Manager",
      subtext: "Powered by ChatGPT-4o",
      logo: "/lovable-uploads/4fef3d5e-6027-4434-ac33-efd08f0819df.png",
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
              <div className="flex items-center w-full">
                <item.icon className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <div>{item.name}</div>
                  <div className="flex items-center gap-2">
                    {item.logo && (
                      <img 
                        src={item.logo} 
                        alt={`${item.name} provider logo`} 
                        className="h-4 w-4 object-contain"
                      />
                    )}
                    <div className="text-xs text-gray-500">{item.subtext}</div>
                  </div>
                </div>
              </div>
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

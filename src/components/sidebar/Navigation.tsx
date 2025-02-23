
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
  Camera,
  Database,
  Info,
  Mail,
  Shield,
  FileText,
  CreditCard,
  Compass,
  User,
  Menu,
  Bot,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar/context";

export const Navigation = () => {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();

  const mainNavigation = [
    {
      name: "Explore",
      subtext: "Discover Amazing Content",
      to: "/explore",
      icon: Compass,
    },
    {
      name: "Dashboard",
      subtext: "Your Content Overview",
      to: "/dashboard",
      icon: ScrollText,
    },
    {
      name: "AI Agent",
      subtext: "Intelligent Assistant",
      to: "/ai-agent",
      icon: Bot,
    },
    {
      name: "Product Shot V1",
      logo: "/lovable-uploads/6339ca58-18ce-4e6a-9e56-116de738e55b.png",
      to: "/product-shoot",
      icon: Image,
    },
    {
      name: "Product Shot V2",
      subtext: "Enhanced AI Product Shots",
      to: "/product-shoot-v2",
      icon: Camera,
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
      logo: "/lovable-uploads/b9716efa-12d6-414b-b000-c32233ecfa73.png",
      to: "/metadata",
      icon: Database,
    },
    {
      name: "Plans & Billing",
      to: "/plans",
      icon: CreditCard,
    },
    {
      name: "Profile Settings",
      to: "/profile",
      icon: User,
    },
    {
      name: "Integrations",
      icon: Settings,
      disabled: true,
      comingSoon: true,
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
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>
      <nav className="space-y-6 px-2">
        <div className="space-y-1">
          {mainNavigation.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                location.pathname === item.to
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              asChild={!item.disabled}
              disabled={item.disabled}
            >
              {!item.disabled ? (
                <Link to={item.to} className="flex items-center gap-2">
                  {item.logo ? (
                    <img src={item.logo} alt="" className="w-4 h-4" />
                  ) : (
                    <item.icon className="h-4 w-4" />
                  )}
                  <div className="flex-1 text-left">
                    <div>{item.name}</div>
                    {item.subtext && (
                      <div className="text-xs text-muted-foreground">
                        {item.subtext}
                      </div>
                    )}
                  </div>
                  {item.comingSoon && (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  )}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>{item.name}</div>
                    {item.subtext && (
                      <div className="text-xs text-muted-foreground">
                        {item.subtext}
                      </div>
                    )}
                  </div>
                  {item.comingSoon && (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  )}
                </div>
              )}
            </Button>
          ))}
        </div>

        <Separator />

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
    </>
  );
};

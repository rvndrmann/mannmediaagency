
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
} from "lucide-react";
import { Link } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();

  const navigation = [
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
      name: "Metadata Manager",
      to: "/metadata",
      icon: Database,
    },
    {
      name: "Image to Video",
      to: "/image-to-video",
      icon: FileVideo,
    },
    {
      name: "Video Editor",
      to: "/create-video",
      icon: Video,
    },
    {
      name: "AI Agent",
      to: "/ai-agent",
      icon: GalleryHorizontalEnd,
    },
    {
      name: "Integrations",
      to: "/integrations",
      icon: Settings,
    },
  ];

  return (
    <nav className="space-y-2">
      {navigation.map((item) => (
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
    </nav>
  );
};

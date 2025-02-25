import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar/menu";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  Image,
  ImagePlus,
  LayoutGrid,
  Play,
  Cog,
  FileSpreadsheet,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export const Navigation = () => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <NavLink to="/" end>
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-muted"
              )}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          )}
        </NavLink>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <NavLink to="/work-requests">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-muted"
              )}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Work Requests
            </Button>
          )}
        </NavLink>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <NavLink to="/video-generator">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-muted"
              )}
            >
              <Play className="mr-2 h-4 w-4" />
              Video Generator
            </Button>
          )}
        </NavLink>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <NavLink to="/image-generator">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-muted"
              )}
            >
              <Image className="mr-2 h-4 w-4" />
              Image Generator
            </Button>
          )}
        </NavLink>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <NavLink to="/product-ad-generator">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-muted"
              )}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Product Ad Generator
            </Button>
          )}
        </NavLink>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <NavLink to="/profile-settings">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-muted"
              )}
            >
              <Cog className="mr-2 h-4 w-4" />
              Settings
            </Button>
          )}
        </NavLink>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

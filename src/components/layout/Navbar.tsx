import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Cog6Tooth,
  Github,
  Image,
  LayoutDashboard,
  LucideIcon,
  Settings,
  User2,
  Video,
  Zap,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCanvasProjects } from "@/hooks/use-canvas-projects";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

const NavItem = ({ href, icon, label }: NavItemProps) => {
  return (
    <Link
      to={href}
      className={({ isActive }) =>
        isActive
          ? "flex items-center px-4 py-2 text-sm font-medium bg-slate-800 text-white"
          : "flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
      }
    >
      <icon className="w-4 h-4 mr-2" />
      {label}
    </Link>
  );
};

export function Navbar() {
  const { user, signOut } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { projects, isLoading: projectsLoading } = useCanvasProjects();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showSidebar, setShowSidebar] = useLocalStorage(
    "showSidebar",
    !isMobile
  );

  useEffect(() => {
    if (isMobile) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isMobile, setShowSidebar]);

  return (
    <div className="h-full border-r border-slate-800">
      <div className="px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center text-lg font-semibold">
          <Zap className="w-6 h-6 mr-2 text-yellow-500" />
          <span className="text-white">CanvasAI</span>
        </Link>
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <ArrowLeft /> : <LayoutDashboard />}
          </Button>
        )}
      </div>
      {showSidebar && (
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="space-y-4">
            <div className="pb-2">
              <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
              <NavItem href="/ai-agent" icon={Zap} label="AI Agent" />
              <NavItem href="/image-to-video" icon={Video} label="Image to Video" />
              <NavItem href="/product-shoot-v2" icon={Image} label="Product Shot V2" />
              <Link 
                to="/product-shot" 
                className={({ isActive }) => 
                  isActive 
                    ? "flex items-center px-4 py-2 text-sm font-medium bg-slate-800 text-white" 
                    : "flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                }
              >
                <Image className="w-5 h-5 mr-2" />
                Product Shot
              </Link>
            </div>

            {projects?.length > 0 && (
              <Collapsible
                open={!isCollapsed}
                onOpenChange={setIsCollapsed}
                className="border-t border-slate-800"
              >
                <div className="px-6 py-2 flex items-center justify-between">
                  <CollapsibleTrigger className="text-sm font-medium text-slate-300 hover:text-white flex items-center">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Your Projects
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="space-y-1 px-4">
                    {projectsLoading ? (
                      <div className="text-sm text-slate-400">Loading...</div>
                    ) : (
                      projects.map((project) => (
                        <Link
                          key={project.id}
                          to={`/canvas/${project.id}`}
                          className="flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          {project.title}
                        </Link>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="border-t border-slate-800">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start px-6 py-2">
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-300">
                      {user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-80"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/account")}
                    className="cursor-pointer"
                  >
                    <User2 className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/statistics")}
                    className="cursor-pointer"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Statistics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(
                        "https://github.com/steven-tey/novel-ai",
                        "_blank"
                      );
                    }}
                    className="cursor-pointer"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    <span>Github</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      toast({
                        title: "Success",
                        description: "Signed out successfully.",
                      });
                      navigate("/auth/login");
                    }}
                    className="cursor-pointer"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

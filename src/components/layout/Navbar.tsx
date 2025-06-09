import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  User as UserIcon, 
  LogOut, 
  Settings, 
  CreditCard,
  MessageSquare,
  Palette,
  Video,
  Globe,
  Menu,
  X
} from "lucide-react";
import { useUserCredits } from "@/hooks/use-user-credits";
import { toast } from "sonner";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, refetch } = useUserCredits();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Refetch credits when user changes
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate('/');
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "Guest";
    return user.user_metadata?.full_name || user.email?.split('@')[0] || "User";
  };

  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Palette className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">AI Studio</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <Link to="/canvas">
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4 mr-2" />
                    Canvas
                  </Button>
                </Link>
                <Link to="/multi-agent-chat">
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    AI Chat
                  </Button>
                </Link>
                <Link to="/browser-use">
                  <Button variant="ghost" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    Browser Use
                  </Button>
                </Link>
              </>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                {credits && (
                  <Badge variant="outline" className="bg-white">
                    {credits.credits_remaining.toFixed(2)} Credits
                  </Badge>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      {getUserAvatar() ? (
                        <img 
                          src={getUserAvatar()!} 
                          alt="Profile" 
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <UserIcon className="h-4 w-4" />
                      )}
                      <span className="hidden lg:inline">{getUserDisplayName()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <Settings className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pricing')}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              {user && (
                <>
                  <Link to="/canvas" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Video className="h-4 w-4 mr-2" />
                      Canvas
                    </Button>
                  </Link>
                  <Link to="/multi-agent-chat" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      AI Chat
                    </Button>
                  </Link>
                  <Link to="/browser-use" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Globe className="h-4 w-4 mr-2" />
                      Browser Use
                    </Button>
                  </Link>
                </>
              )}
              
              {user ? (
                <div className="pt-2 border-t border-gray-200">
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-2 mb-2">
                      {getUserAvatar() ? (
                        <img 
                          src={getUserAvatar()!} 
                          alt="Profile" 
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                      <span className="font-medium">{getUserDisplayName()}</span>
                    </div>
                    {credits && (
                      <Badge variant="outline" className="bg-white">
                        {credits.credits_remaining.toFixed(2)} Credits
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/dashboard');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button size="sm" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

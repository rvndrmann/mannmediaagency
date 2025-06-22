
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { Home, Settings, Image, Video, Bot, HelpCircle, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  const location = useLocation();
  const { user } = useUser();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
    { path: '/product-shot', label: 'Product Shot', icon: <Image className="h-5 w-5" /> },
    { path: '/image-to-video', label: 'Image to Video', icon: <Video className="h-5 w-5" /> },
    { path: '/video-creator', label: 'Video Creator', icon: <Video className="h-5 w-5" /> },
    { path: '/ai-agent', label: 'AI Agent', icon: <Bot className="h-5 w-5" /> },
    { path: '/help', label: 'Help', icon: <HelpCircle className="h-5 w-5" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="border-b border-gray-700 bg-gray-800">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center">
          <Link to="/" className="text-white font-bold text-xl mr-6">
            VideoGen AI
          </Link>
        </div>
        
        <nav className="hidden md:flex flex-1 mx-6 space-x-1">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`px-3 py-2 rounded-md flex items-center space-x-2 ${
                isActive(item.path) 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || ''} alt={user.email || 'User'} />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/plans">Subscription</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-0" 
                    onClick={() => {}}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default">
              <Link to="/auth/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

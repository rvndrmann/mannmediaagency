
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/custom-order";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCustomOrders } from "@/components/admin/AdminCustomOrders";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { AdminUsageStats } from "@/components/admin/AdminUsageStats";
import { CustomOrderLinks } from "@/components/admin/CustomOrderLinks";
import { AIToolsOverview } from "@/components/admin/AIToolsOverview";
import { toast } from "sonner";
import { NewMessageForm } from "@/components/admin/NewMessageForm";
import { HeaderNotificationBell } from "@/components/messages/HeaderNotificationBell";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }
        
        // Check if user is in admin_users table using RPC
        const { data: adminData, error: adminError } = await supabase.rpc(
          'check_is_admin'
        );
        
        if (adminError) {
          console.error("Error checking admin status:", adminError);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!adminData);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // This will trigger a re-render of child components
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Data refreshed");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-8">You don't have permission to access the admin dashboard.</p>
        <Button onClick={() => navigate("/")}>Return to Home</Button>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background">
        <header className="border-b p-4 flex items-center justify-between bg-card">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span>Back</span>
            </Button>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <HeaderNotificationBell />
            <NewMessageForm />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </header>

        <div className="container mx-auto py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full max-w-[750px] mx-auto mb-6">
              <TabsTrigger value="orders">Custom Orders</TabsTrigger>
              <TabsTrigger value="links">Order Links</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="stats">Usage Stats</TabsTrigger>
              <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
            </TabsList>
            
            <TabsContent value="orders" className="mt-6">
              <AdminCustomOrders key={isRefreshing ? 'refresh-orders' : 'orders'} />
            </TabsContent>
            
            <TabsContent value="links" className="mt-6">
              <CustomOrderLinks key={isRefreshing ? 'refresh-links' : 'links'} />
            </TabsContent>
            
            <TabsContent value="users" className="mt-6">
              <AdminUsersList key={isRefreshing ? 'refresh-users' : 'users'} />
            </TabsContent>
            
            <TabsContent value="stats" className="mt-6">
              <AdminUsageStats key={isRefreshing ? 'refresh-stats' : 'stats'} />
            </TabsContent>
            
            <TabsContent value="ai-tools" className="mt-6">
              <AIToolsOverview key={isRefreshing ? 'refresh-ai-tools' : 'ai-tools'} />
            </TabsContent>
          </Tabs>
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default Admin;

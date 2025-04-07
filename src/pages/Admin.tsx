import AdminChatInput from "@/components/admin/AdminChatInput";
import { CanvasMcpProvider } from "@/contexts/CanvasMcpContext";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat.tsx";
import { Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Attachment } from "@/types/message"; // Moved import here

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
import { AdminCanvasIntervention } from "@/components/admin/AdminCanvasIntervention"; // Import the new component
import { toast } from "sonner";

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
    <CanvasMcpProvider projectId="admin">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </header>

          <div className="container mx-auto py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-6 w-full max-w-[900px] mx-auto mb-6"> {/* Updated grid-cols and max-w */}
                <TabsTrigger value="orders">Custom Orders</TabsTrigger>
                <TabsTrigger value="links">Order Links</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="stats">Usage Stats</TabsTrigger>
                <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
                <TabsTrigger value="canvas-updates">Canvas Updates</TabsTrigger>{" "}
                {/* Added new tab trigger */}
                <TabsTrigger value="user-messages">User Messages</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-6">
                <AdminCustomOrders
                  key={isRefreshing ? "refresh-orders" : "orders"}
                />
              </TabsContent>

              <TabsContent value="links" className="mt-6">
                <CustomOrderLinks key={isRefreshing ? "refresh-links" : "links"} />
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                <AdminUsersList key={isRefreshing ? "refresh-users" : "users"} />
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <AdminUsageStats key={isRefreshing ? "refresh-stats" : "stats"} />
              </TabsContent>

              <TabsContent value="ai-tools" className="mt-6">
                <AIToolsOverview
                  key={isRefreshing ? "refresh-ai-tools" : "ai-tools"}
                />
              </TabsContent>

              <TabsContent value="canvas-updates" className="mt-6">
                {" "}
                {/* Added new tab content */}
                <AdminCanvasIntervention
                  key={isRefreshing ? "refresh-canvas" : "canvas"}
                />
              </TabsContent>

              <TabsContent value="user-messages" className="mt-6">
                {/* User Messages UI will be implemented here */}
                <AdminUserMessages />
              </TabsContent>
            </Tabs>
          </div>
          <Toaster />
        </div>
      </ThemeProvider>
    </CanvasMcpProvider>
  );
};

import { AdminChatUserList } from "@/components/admin/AdminChatUserList";
import { AdminChatConversation } from "@/components/admin/AdminChatConversation";

// Placeholder Data (Replace with actual data fetching)
const placeholderUsers = [
  { id: 'user1', name: 'Alice', lastMessageSnippet: 'Okay, thanks!', lastMessageTimestamp: '10:30 AM' },
  { id: 'user2', name: 'Bob', lastMessageSnippet: 'Can you check scene 3?', lastMessageTimestamp: 'Yesterday' },
  { id: 'user3', name: 'Charlie', lastMessageSnippet: 'Image generation failed.', lastMessageTimestamp: '2 days ago' },
];

const placeholderMessages: { [userId: string]: Message[] } = {
  user1: [
    { id: 'm1', role: 'user', content: 'Hi there!', createdAt: new Date(Date.now() - 600000).toISOString(), projectId: 'projA' },
    { id: 'm2', role: 'assistant', content: 'Hello Alice!', createdAt: new Date(Date.now() - 500000).toISOString(), projectId: 'projA' },
    { id: 'm3', role: 'user', content: 'Okay, thanks!', createdAt: new Date(Date.now() - 400000).toISOString(), projectId: 'projA' },
  ],
  user2: [
    { id: 'm4', role: 'user', content: 'Need help with my video.', createdAt: new Date(Date.now() - 86400000).toISOString(), projectId: 'projB' },
    { id: 'm5', role: 'user', content: 'Can you check scene 3?', createdAt: new Date(Date.now() - 86000000).toISOString(), projectId: 'projB' },
  ],
  user3: [],
};

const placeholderProjects: { [userId: string]: { id: string, name: string }[] } = {
  user1: [{ id: 'projA', name: 'Project Alpha' }],
  user2: [{ id: 'projB', name: 'Project Beta Test' }, { id: 'projC', name: 'Another Project' }],
  user3: [],
};
// --- End Placeholder Data ---

const AdminUserMessages = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // TODO: Replace placeholders with actual state and data fetching logic
  const [users, setUsers] = useState(placeholderUsers);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    // Fetch initial list of users with chats
    const fetchUsers = async () => {
      console.log("fetchUsers called");
      setIsLoadingUsers(true);
      try {
        // Assume an RPC function 'get_chat_users' exists
        const { data, error } = await supabase.rpc('get_chat_users');
        console.log("get_chat_users response:", data, error);

        if (error) {
          console.error("Error fetching chat users:", error);
          toast.error("Failed to load chat users: " + error.message);
          setUsers([]); // Set to empty on error
        } else {
          // TODO: Adapt the received 'data' structure to the 'ChatUser' interface if needed
          console.log("Fetched chat users:", data);
          setUsers(data || []); // Assuming data is array of ChatUser or similar
        }
      } catch (err) {
        console.error("Client-side error fetching chat users:", err);
        toast.error("An error occurred while loading chat users.");
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []); // Fetch users only on initial mount

  useEffect(() => {
    // Fetch messages and projects when selectedUserId changes
    const fetchUserData = async () => {
      if (!selectedUserId) {
        setMessages([]);
        setProjects([]);
        return;
      }

      setIsLoadingMessages(true);
      try {
        // Fetch messages and projects concurrently
        const [messagesResponse, projectsResponse] = await Promise.all([
          supabase.rpc('get_user_messages', { user_id: selectedUserId }),
          supabase.rpc('get_user_projects', { user_id: selectedUserId })
        ]);

        // Handle messages response
        if (messagesResponse.error) {
          console.error(`Error fetching messages for user ${selectedUserId}:`, messagesResponse.error);
          toast.error("Failed to load messages.");
          setMessages([]);
        } else {
          // Adapt message data structure
          const fetchedMessages = (messagesResponse.data || []).map((item: any) => ({
            id: item.id,
            role: item.sender === 'assistant' ? 'assistant' : 'user', // Adjust role mapping as needed
            content: item.message,
            createdAt: item.created_at,
            projectId: item.project_id,
            user_id: item.user_id,
            // Add other properties as needed based on your Message interface
          } as Message));
          // Apply project filter if selectedProjectId is set
          const filteredMessages = selectedProjectId
            ? fetchedMessages.filter((m: Message) => m.projectId === selectedProjectId)
            : fetchedMessages;
          setMessages(filteredMessages);
          console.log(`Fetched ${fetchedMessages.length} messages, displaying ${filteredMessages.length} for user ${selectedUserId}, project ${selectedProjectId || 'All'}`);
        }

        // Handle projects response
        if (projectsResponse.error) {
          console.error(`Error fetching projects for user ${selectedUserId}:`, projectsResponse.error);
          toast.error("Failed to load user projects.");
          setProjects([]);
        } else {
          // TODO: Adapt project data structure if needed
          setProjects(projectsResponse.data || []);
           console.log(`Fetched ${projectsResponse.data?.length || 0} projects for user ${selectedUserId}`);
        }

      } catch (err) {
        console.error(`Client-side error fetching data for user ${selectedUserId}:`, err);
        toast.error("An error occurred while loading user data.");
        setMessages([]);
        setProjects([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchUserData();
  }, [selectedUserId, selectedProjectId]); // Refetch/filter when user or project changes

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedProjectId(null); // Reset project filter when user changes
  };

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    // Messages will refilter via the useEffect dependency
  };

  // Attachment type is imported at the top level now

  const handleSendMessage = async (messageText: string, attachments?: Attachment[], projectId?: string) => { // Added attachments parameter
    if (!selectedUserId) {
      toast.error("Cannot send message: No user selected.");
      return;
    }
    // Allow sending if there's text OR attachments
    if (!messageText.trim() && (!attachments || attachments.length === 0)) {
      toast.error("Cannot send an empty message without attachments.");
      return;
    }

    console.log(`Attempting to send to ${selectedUserId} (Project: ${projectId || 'N/A'}): "${messageText}" with ${attachments?.length || 0} attachments`);
    setIsSendingMessage(true);

    // Optimistically add the message with attachments to the UI
    const newMessage: Message = {
      id: uuidv4(), // Temporary ID for UI
      role: 'assistant', // Admin sends as 'assistant' or a dedicated 'admin' role
      content: messageText,
      createdAt: new Date().toISOString(),
      projectId: projectId,
      senderName: 'Admin', // Identify sender
      status: 'pending', // Indicate pending status
      attachments: attachments && attachments.length > 0 ? attachments : undefined // Add attachments
    };
    setMessages(prev => [...prev, newMessage]);

    // TODO: Implement actual file upload logic here if needed before sending to backend.
    // For now, assume the backend RPC handles the attachment data (e.g., URLs, IDs).
    // Prepare attachment data for RPC (this structure is an assumption)
    const attachmentsData = attachments?.map(att => ({
        name: att.name,
        type: att.mimeType,
        url: att.url, // This might be a temporary blob URL or a final uploaded URL
        size: att.size
    }));

    try {
      // Assume RPC function 'admin_send_message' accepts attachments_data
      const { data, error } = await supabase.rpc('admin_send_message', {
        target_user_id: selectedUserId,
        message_content: messageText,
        project_id: projectId, // Pass project_id if provided
        attachments_data: attachmentsData // Pass attachment info
      });

      if (error) {
        console.error("Error sending admin message:", error);
        toast.error(`Failed to send message: ${error.message}`);
        // Update message status to error
        setMessages(prev => prev.map(msg =>
          msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
        ));
      } else {
        console.log("Admin message sent successfully:", data);
        // Optionally update message status to 'completed' or replace optimistic message with backend response
         setMessages(prev => prev.map(msg =>
           msg.id === newMessage.id ? { ...msg, status: 'completed' } : msg // Example status update
         ));
        // toast.success("Message sent."); // Optional success toast
      }
    } catch (err) {
      console.error("Client-side error sending admin message:", err);
      toast.error("An error occurred while sending the message.");
       // Update message status to error
       setMessages(prev => prev.map(msg =>
         msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
       ));
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    // Use a fixed height container and flex/grid for layout
    <div className="flex border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}> {/* Adjust height as needed */}
      {/* Left Panel: User List */}
      <div className="w-1/3 border-r">
        <AdminChatUserList
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={handleSelectUser}
          isLoading={isLoadingUsers}
        />
      </div>

      {/* Right Panel: Conversation */}
      <div className="w-2/3">
        <AdminChatConversation
          selectedUserId={selectedUserId}
          selectedProject={projects.find(p => p.id === selectedProjectId) || null}
          onSelectProject={handleSelectProject}
          userProjects={projects}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoadingMessages={isLoadingMessages}
          isSendingMessage={isSendingMessage}
        />
      </div>
    </div>
  );
};

export default Admin;

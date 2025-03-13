
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MessageThread } from "./MessageThread";
import { AdminMessage } from "@/types/message";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function MessageInbox() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const fetchMessages = async () => {
    if (!session?.user.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user.id) {
      fetchMessages();
    }
  }, [session]);

  useEffect(() => {
    // Subscribe to realtime updates for messages
    const channel = supabase
      .channel('admin_messages_channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'admin_messages' }, 
        payload => {
          const newMessage = payload.new as AdminMessage;
          // Only add if it's related to current user
          if (newMessage.sender_id === session?.user.id || newMessage.receiver_id === session?.user.id) {
            setMessages(prevMessages => [newMessage, ...prevMessages]);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'admin_messages' },
        payload => {
          const updatedMessage = payload.new as AdminMessage;
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const markAsRead = async (messageId: string) => {
    if (!session?.user.id) return;
    
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true })
        .eq('id', messageId)
        .eq('receiver_id', session.user.id)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleMessageClick = (message: AdminMessage) => {
    setSelectedMessage(message);
    if (!message.read && message.receiver_id === session?.user.id) {
      markAsRead(message.id);
    }
  };

  const handleRefresh = () => {
    fetchMessages();
  };

  const filteredMessages = activeTab === "all" 
    ? messages 
    : activeTab === "unread" 
      ? messages.filter(msg => !msg.read && msg.receiver_id === session?.user.id)
      : activeTab === "sent"
        ? messages.filter(msg => msg.sender_id === session?.user.id)
        : messages.filter(msg => msg.receiver_id === session?.user.id);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="overflow-hidden">
            <Tabs 
              defaultValue="all" 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="p-0">
                {isLoading ? (
                  <div className="p-4 text-center">
                    <p>Loading messages...</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>No messages found</p>
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {filteredMessages.map((message) => (
                      <div key={message.id}>
                        <div 
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedMessage?.id === message.id 
                              ? 'bg-accent' 
                              : !message.read && message.receiver_id === session.user.id 
                                ? 'bg-accent/20 hover:bg-accent/30' 
                                : 'hover:bg-accent/10'
                          }`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium truncate">
                                {message.sender_id === session.user.id ? 'You' : 'Admin'}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {message.content.substring(0, 50)}
                                {message.content.length > 50 ? '...' : ''}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {!message.read && message.receiver_id === session.user.id && (
                                <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Separator />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="md:col-span-2">
          {selectedMessage ? (
            <MessageThread 
              userId={session.user.id} 
              message={selectedMessage}
              onSend={fetchMessages}
            />
          ) : (
            <Card className="p-6 flex items-center justify-center h-full min-h-[300px]">
              <p className="text-muted-foreground">Select a message to view the conversation</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

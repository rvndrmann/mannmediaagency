
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminMessage } from "@/types/message";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageThreadProps {
  userId: string;
  message: AdminMessage;
  onSend: () => void;
}

export function MessageThread({ userId, message, onSend }: MessageThreadProps) {
  const [replyContent, setReplyContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<AdminMessage[]>([]);
  const { toast } = useToast();

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase.rpc("check_is_admin");
        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
  }, []);

  // Get conversation history based on the selected message
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        // Find related messages to create a thread
        const { data, error } = await supabase
          .from('admin_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${message.sender_id},receiver_id.eq.${message.receiver_id}),` +
            `and(sender_id.eq.${message.receiver_id},receiver_id.eq.${message.sender_id})`
          )
          .order('created_at', { ascending: true });

        if (error) throw error;
        setConversation(data || []);
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    if (message) {
      fetchConversation();
    }
  }, [message]);

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Determine message type and receiver based on user role
      const messageType = isAdmin ? 'admin_to_user' : 'user_to_admin';
      const receiverId = isAdmin 
        ? message.sender_id === userId ? message.receiver_id : message.sender_id
        : (await getFirstAdminId());

      if (!receiverId) {
        toast({
          title: "Error",
          description: "No admin users found to receive message",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('admin_messages')
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          content: replyContent,
          message_type: messageType
        });

      if (error) throw error;
      
      setReplyContent("");
      onSend();
      
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get the first admin ID for users to message
  const getFirstAdminId = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0].user_id : null;
    } catch (error) {
      console.error('Error fetching admin ID:', error);
      return null;
    }
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[500px]">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {conversation.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.sender_id === userId 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              <p>{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Type your reply..."
          className="resize-none"
          rows={3}
        />
        <Button 
          className="self-end"
          onClick={handleSendReply}
          disabled={isLoading || !replyContent.trim()}
        >
          {isLoading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
}


import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, TraceData } from "@/integrations/supabase/rpc-types";
import { TraceDashboard } from "@/components/traces/TraceDashboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Clock, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function TraceAnalytics() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user and load conversation data
    async function getUserIdAndConversations() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("You must be signed in to view trace analytics");
          return;
        }
        
        setUserId(user.id);
        
        // Get conversations for this user
        const { data, error: rpcError } = await supabase
          .rpc<Conversation[]>('get_user_conversations', { 
            user_id_param: user.id 
          });
        
        if (rpcError) {
          console.error("RPC error:", rpcError);
          throw rpcError;
        }
        
        if (data) {
          setConversations(data);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load conversation data");
        toast.error("Failed to load conversation data");
      } finally {
        setLoading(false);
      }
    }
    
    getUserIdAndConversations();
  }, []);
  
  const getConversationTrace = async (conversationId: string) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc<TraceData>('get_conversation_trace', { 
          conversation_id: conversationId,
          user_id_param: userId
        });
      
      if (error) {
        console.error("Error fetching trace:", error);
        throw error;
      }
      
      if (data) {
        setTraceData(data);
        setSelectedConversation(conversationId);
      }
    } catch (err) {
      console.error("Error fetching trace:", err);
      toast.error("Failed to load trace data");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle back button click
  const handleBack = () => {
    setSelectedConversation(null);
    setTraceData(null);
  };
  
  // If no user is logged in
  if (!userId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <h1 className="text-2xl font-bold mb-4">Sign in to view trace analytics</h1>
        <Button asChild>
          <Link to="/login">Sign In</Link>
        </Button>
      </div>
    );
  }
  
  // Loading state
  if (loading && !traceData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading analytics...</span>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center bg-red-50 text-red-500">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Show trace details for a specific conversation
  if (selectedConversation && traceData) {
    return (
      <div className="container mx-auto py-8">
        <Button 
          variant="outline" 
          onClick={handleBack} 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Button>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Trace Details</CardTitle>
            <CardDescription>Conversation ID: {selectedConversation}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-medium">{(traceData.summary.duration / 1000).toFixed(2)}s</div>
                </div>
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Messages</div>
                  <div className="font-medium">{traceData.summary.message_count}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Agent Types</div>
                  <div className="font-medium">{traceData.summary.agent_types.join(', ')}</div>
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-3">Conversation Flow</h3>
            <div className="border rounded-md p-4 max-h-[600px] overflow-y-auto">
              {traceData.messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 p-3 rounded-lg ${
                    message.agent_type ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">
                      {message.agent_type || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.assistant_response || message.user_message}</p>
                  
                  {message.trace && message.trace.summary && (
                    <div className="mt-2 text-xs text-gray-500">
                      {message.trace.summary.handoffs > 0 && (
                        <div className="mt-1">Handoffs: {message.trace.summary.handoffs}</div>
                      )}
                      {message.trace.summary.toolCalls > 0 && (
                        <div className="mt-1">Tool Calls: {message.trace.summary.toolCalls}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Default view with conversation list and analytics
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Agent Trace Analytics</h1>
      
      {userId && <TraceDashboard userId={userId} />}
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Click on a conversation to view detailed traces</CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No conversations found
            </div>
          ) : (
            <Table>
              <TableCaption>A list of your recent conversations with AI agents</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conversation) => (
                  <TableRow key={conversation.conversation_id}>
                    <TableCell className="font-medium">
                      {conversation.conversation_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(conversation.start_time), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{conversation.message_count}</TableCell>
                    <TableCell>{Array.isArray(conversation.agent_types) 
                      ? conversation.agent_types.join(', ') 
                      : 'Unknown'}</TableCell>
                    <TableCell>{conversation.model_used || 'Unknown'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => getConversationTrace(conversation.conversation_id)}
                      >
                        View Trace
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

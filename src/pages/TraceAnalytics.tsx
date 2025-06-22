import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, TraceData } from "@/integrations/supabase/rpc-types";
import { TraceDashboard } from "@/components/traces/TraceDashboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user"; // Import useUser hook
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
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { OpenAITraceIntegration } from "@/components/traces/OpenAITraceIntegration";
import { AlertCircle } from "lucide-react"; // Import icon for access denied

export default function TraceAnalytics() {
  const { user, isAdmin, isLoading: isUserLoading } = useUser(); // Use the hook
  const navigate = useNavigate(); // Hook for navigation

  // Local state for conversation/trace data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true); // Renamed to avoid conflict
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id; // Get userId from the hook

  useEffect(() => {
    async function getConversations() { // Renamed function
      if (!userId) return; // Guard against missing userId

      try {
        setLoadingData(true); // Use renamed state setter
        // No need to fetch user again, already available from useUser hook
        
        const { data, error: rpcError } = await supabase
          .rpc<Conversation[]>('get_user_conversations', {
            user_id_param: userId // Use userId from hook
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
        setLoadingData(false); // Use renamed state setter
      }
    }

    // Fetch conversations only if user is loaded, is an admin, and has an ID
    if (!isUserLoading && isAdmin && userId) {
      getConversations();
    } else if (!isUserLoading && !isAdmin) {
      // If loaded and not admin, clear loading state and potentially show message later
      setLoadingData(false);
    }
    // If user is not signed in, the useUser hook handles it, and the admin check will fail.
  }, [userId, isAdmin, isUserLoading]); // Add dependencies
  
  const getConversationTrace = async (conversationId: string) => {
    if (!userId) return;
    
    try {
      setLoadingData(true); // Use renamed state setter
      const { data, error } = await supabase
        .rpc<TraceData>('get_conversation_trace', {
          conversation_id: conversationId,
          user_id_param: userId // Use userId from hook
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
      setLoadingData(false); // Use renamed state setter
    }
  };
  
  const handleBack = () => {
    setSelectedConversation(null);
    setTraceData(null);
  };
  
  // --- Loading State ---
  // Show loading spinner while user data or conversation data is loading
  if (isUserLoading || (isAdmin && loadingData && !traceData && !error)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading analytics...</span>
      </div>
    );
  }

  // --- Access Denied State ---
  // Show access denied if user is loaded but not an admin
  if (!isUserLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
         <Card className="w-full max-w-md text-center">
           <CardHeader>
             <CardTitle className="flex items-center justify-center text-destructive">
               <AlertCircle className="h-6 w-6 mr-2" /> Access Denied
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p>You do not have permission to view this page.</p>
           </CardContent>
           <CardFooter className="justify-center">
             <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
           </CardFooter>
         </Card>
       </div>
    );
  }

  // --- Error State (Keep existing error handling) ---
  
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
                    <span className="font-medium text-black">
                      {message.agent_type || 'User'}
                    </span>
                    <span className="text-xs text-gray-700">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-black">
                    {message.assistant_response || message.user_message}
                  </p>
                  
                  {message.trace && message.trace.events && message.trace.events.length > 0 && (
                    <div className="mt-2 text-xs text-gray-800">
                      {message.trace.summary.handoffs > 0 && (
                        <div className="mt-1 text-black">
                          Handoffs: {message.trace.summary.handoffs}
                        </div>
                      )}
                      {message.trace.summary.toolCalls > 0 && (
                        <div className="mt-1 text-black">
                          Tool Calls: {message.trace.summary.toolCalls}
                        </div>
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
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Agent Trace Analytics</h1>
      
      <OpenAITraceIntegration />
      
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

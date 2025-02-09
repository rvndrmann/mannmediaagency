
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ai_agent_chat_history";

const AIAgent = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Query user credits
  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if user has enough credits
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to continue chatting. Each 1000 words costs 1 credit.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = { 
      role: "user", 
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${(supabase.functions as any).url}/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from AI');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');

      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  } else {
                    newMessages.push({ role: 'assistant', content: assistantMessage });
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderChat = () => (
    <div className="flex-1 relative">
      <div className="absolute top-0 right-0 p-2 bg-gray-800 rounded-bl-lg z-10">
        <span className="text-sm text-gray-300">
          Credits: {userCredits?.credits_remaining || 0}
        </span>
      </div>
      <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1A1F2C]">
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">AI Agent</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)] flex flex-col">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
              <TabsList className="w-full bg-[#333333] mb-4">
                <TabsTrigger 
                  value="chat" 
                  className="flex-1 text-white data-[state=active]:bg-[#444444]"
                >
                  Chat
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                {renderChat()}
                <div className="pt-4 sticky bottom-0 bg-[#222222]/60 backdrop-blur-xl">
                  <ChatInput
                    input={input}
                    isLoading={isLoading}
                    onInputChange={setInput}
                    onSubmit={handleSubmit}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="bg-[#222222]/60 backdrop-blur-xl border-white/10 p-4 h-[calc(100vh-8rem)]">
            <ScriptBuilderTab messages={messages} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;

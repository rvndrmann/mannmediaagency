
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Send, MessageSquare, Search, BookMarked, PenTool } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { ResearchTab } from "@/components/research/ResearchTab";
import { SavedMaterialsTab } from "@/components/research/SavedMaterialsTab";
import { ScriptBuilderTab } from "@/components/research/ScriptBuilderTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ResearchMaterial {
  id: string;
  content_type: 'text' | 'url' | 'image';
  content: string;
  summary: string;
  created_at: string;
}

const AIAgent = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [researchMaterials, setResearchMaterials] = useState<ResearchMaterial[]>([]);
  const [processedMaterialIds, setProcessedMaterialIds] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchResearchMaterials();
  }, []);

  const fetchResearchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('research_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Validate and transform the data
      const validMaterials = data
        .filter(item => ['text', 'url', 'image'].includes(item.content_type))
        .map(item => ({
          id: item.id,
          content_type: item.content_type as 'text' | 'url' | 'image',
          content: item.content,
          summary: item.summary || '',
          created_at: item.created_at
        }));

      setResearchMaterials(validMaterials);
    } catch (error) {
      console.error('Error fetching research materials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch research materials",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Get only new research materials that haven't been processed
    const newMaterials = researchMaterials.filter(material => !processedMaterialIds.has(material.id));

    let userMessageContent = input;

    // Only include context if there are new materials
    if (newMaterials.length > 0) {
      const researchContext = newMaterials
        .map(material => `${material.content_type.toUpperCase()}: ${material.content}\nSummary: ${material.summary}`)
        .join('\n\n');

      userMessageContent = `New research materials:\n${researchContext}\n\nUser question: ${input}`;
      
      // Mark these materials as processed
      setProcessedMaterialIds(prev => {
        const newSet = new Set(prev);
        newMaterials.forEach(material => newSet.add(material.id));
        return newSet;
      });
    }

    const userMessage: Message = { 
      role: "user", 
      content: userMessageContent
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
        throw new Error('Failed to get response from AI');
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
        description: "Failed to get response from AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderChat = () => (
    <div className="flex-1 overflow-y-auto mb-4 space-y-4 pb-20">
      {messages.map((message, index) => (
        <Card
          key={index}
          className={`p-4 max-w-[80%] ${
            message.role === "user"
              ? "ml-auto bg-blue-500 text-white"
              : "bg-gray-50 text-gray-800"
          }`}
        >
          <ReactMarkdown
            components={{
              code({ children, className, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return (
                  <code
                    className={`${match ? 'bg-gray-100 p-2 block rounded' : 'bg-gray-100 px-1 py-0.5 rounded'} ${className}`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </Card>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );

  return (
    <div className="flex-1 p-4 flex flex-col h-[calc(100vh-2rem)]">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="research">
            <Search className="h-4 w-4 mr-2" />
            Research
          </TabsTrigger>
          <TabsTrigger value="saved">
            <BookMarked className="h-4 w-4 mr-2" />
            Saved Materials
          </TabsTrigger>
          <TabsTrigger value="script">
            <PenTool className="h-4 w-4 mr-2" />
            Script Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col relative">
          {renderChat()}
          <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="research" className="flex-1 overflow-y-auto">
          <ResearchTab />
        </TabsContent>

        <TabsContent value="saved" className="flex-1 overflow-y-auto">
          <SavedMaterialsTab />
        </TabsContent>

        <TabsContent value="script" className="flex-1 overflow-y-auto">
          <ScriptBuilderTab messages={messages} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAgent;

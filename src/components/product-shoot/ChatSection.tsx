
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function ChatSection({ expanded, onToggle }: ChatSectionProps) {
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you with your product shots today?",
      sender: "assistant",
      timestamp: new Date()
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Chat functionality will be implemented later
    setMessage("");
  };

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-white/10 transition-all duration-300",
        expanded ? "h-[30vh]" : "h-12"
      )}
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">AI Assistant</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white"
          onClick={onToggle}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col h-[calc(30vh-3rem)]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[80%] rounded-lg p-3",
                    msg.sender === "assistant" 
                      ? "bg-purple-500/10 text-white ml-0" 
                      : "bg-purple-500 text-white ml-auto"
                  )}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Button 
                type="submit"
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

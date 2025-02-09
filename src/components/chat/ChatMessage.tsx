
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <Card
      className={`p-4 max-w-[80%] ${
        message.role === "user"
          ? "ml-auto bg-[#9b87f5] text-white"
          : "bg-[#333333] text-white/90 border-white/10"
      }`}
    >
      <ReactMarkdown
        components={{
          code({ children, className, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return (
              <code
                className={`${match ? 'bg-black/30 p-2 block rounded' : 'bg-black/30 px-1 py-0.5 rounded'} ${className}`}
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
  );
};

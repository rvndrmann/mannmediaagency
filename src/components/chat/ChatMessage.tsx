
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <Card
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
  );
};

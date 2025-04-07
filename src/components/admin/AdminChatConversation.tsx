import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For Project Selector
import { ChatMessage } from '@/components/chat/ChatMessage'; // Use the modified component
import AdminChatInput from '@/components/admin/AdminChatInput';
import { Message, Attachment } from '@/types/message'; // Added Attachment import

// Placeholder types - replace when actual data structure is known
interface Project {
  id: string;
  name: string;
}

interface AdminChatConversationProps {
  selectedUserId: string | null;
  selectedProject: Project | null; // Or just projectId: string | null
  onSelectProject: (projectId: string | null) => void; // Allow clearing selection
  userProjects: Project[];
  messages: Message[];
  // Update onSendMessage prop type to include attachments
  onSendMessage: (messageText: string, attachments?: Attachment[], projectId?: string) => void;
  isLoadingMessages?: boolean;
  isSendingMessage?: boolean;
}

export const AdminChatConversation: React.FC<AdminChatConversationProps> = ({
  selectedUserId,
  selectedProject,
  onSelectProject,
  userProjects = [],
  messages = [],
  onSendMessage,
  isLoadingMessages = false,
  isSendingMessage = false,
}) => {

  // Update internal handler to pass attachments through
  const handleSendMessage = (messageText: string, attachments?: Attachment[]) => {
    onSendMessage(messageText, attachments, selectedProject?.id);
  };

  const handleProjectChange = (value: string) => {
    // Assuming value is projectId or "all"
    onSelectProject(value === "all" ? null : value);
  };

  if (!selectedUserId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <p>Select a user from the list to view their messages.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l">
      {/* Header with Project Selector */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Conversation</h2> {/* TODO: Add User Name */}
        {userProjects.length > 0 && (
          <Select
            value={selectedProject?.id || "all"}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {userProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name || project.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Message Area */}
      <ScrollArea className="flex-1 p-4 bg-muted/30">
        {isLoadingMessages ? (
          <div className="text-center text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">No messages in this conversation yet.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
              // Add props like onEditSceneScript etc. if needed later
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t">
        <AdminChatInput
          onSend={handleSendMessage}
          isLoading={isSendingMessage}
          projectId={selectedProject?.id} // Pass selected project ID
        />
      </div>
    </div>
  );
};
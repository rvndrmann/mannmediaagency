import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Placeholder types - replace with actual types when available
interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessageSnippet?: string;
  lastMessageTimestamp?: string; // Or Date object
  unreadCount?: number;
}

interface AdminChatUserListProps {
  users: ChatUser[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  isLoading?: boolean;
}

export const AdminChatUserList: React.FC<AdminChatUserListProps> = ({
  users = [], // Default to empty array
  selectedUserId,
  onSelectUser,
  isLoading = false,
}) => {
  if (isLoading) {
    return <div className="p-4 text-center">Loading users...</div>;
  }

  if (users.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No active chats.</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectUser(user.id)}
            className={`flex items-center gap-3 p-2 rounded-md text-left w-full hover:bg-muted ${
              selectedUserId === user.id ? 'bg-muted font-semibold' : ''
            }`}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm truncate">{user.name || 'Unknown User'}</p>
              {user.lastMessageSnippet && (
                <p className="text-xs text-muted-foreground truncate">
                  {user.lastMessageSnippet}
                </p>
              )}
            </div>
            {/* Optional: Timestamp and Unread Count */}
            {/* <div className="text-xs text-muted-foreground self-start">
              {user.lastMessageTimestamp}
              {user.unreadCount && user.unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {user.unreadCount}
                </span>
              )}
            </div> */}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
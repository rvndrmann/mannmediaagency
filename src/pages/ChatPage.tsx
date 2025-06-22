// src/pages/ChatPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { SidePanel } from '@/components/chat/SidePanel';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Message } from '@/types/message';
import { User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'; // Import generated types

// Define types based on generated Supabase types
type ChatMessageRecord = Database['public']['Tables']['chat_messages']['Row'];
type UserProfile = Database['public']['Tables']['profiles']['Row']; // Assuming profiles table exists

// !!! IMPORTANT: Replace with the actual Admin User ID from Supabase Auth users table
const ADMIN_USER_ID = 'YOUR_ADMIN_USER_ID_REPLACE_ME';

export const ChatPage = () => {
  const { user, isAdmin, isLoading: isUserLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // --- Fetch Users (for Admin) ---
  useEffect(() => {
    if (isAdmin && user) {
      const fetchUsers = async () => {
        setIsFetchingUsers(true);
        setError(null);
        // Use generated types for better inference
        const { data, error: fetchUserError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url'); // Select columns defined in UserProfile

        if (fetchUserError) {
          console.error('Error fetching users:', fetchUserError);
          setError('Failed to load users.');
          setUsers([]);
        } else {
          const filteredUsers = data?.filter(u => u.id !== user.id) || [];
          setUsers(filteredUsers as UserProfile[]); // Cast should be safer now
        }
        setIsFetchingUsers(false);
      };
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [isAdmin, user]);

  // --- Fetch Messages ---
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    if (isAdmin && !selectedUserId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const otherUserId = isAdmin ? selectedUserId : ADMIN_USER_ID;
    if (!otherUserId) {
      console.warn("Cannot fetch messages: otherUserId is null");
      setIsLoading(false);
      setMessages([]);
      return;
    }

    // Use generated types for query
    const { data, error: fetchError } = await supabase
      .from('chat_messages')
      .select('*') // Select all columns defined in ChatMessageRecord
      .or(`(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching messages:', fetchError);
      setError('Failed to load messages.');
      setMessages([]);
    } else if (data) {
      // Map using the correct types
      const formattedMessages: Message[] = data.map((msg: ChatMessageRecord) => ({
        id: msg.id,
        role: msg.sender_id === user.id ? 'user' : 'assistant',
        content: msg.content,
        createdAt: msg.created_at, // Keep as string
        senderName: msg.sender_id === user.id ? 'You' : (isAdmin ? 'User' : 'Admin'),
        // Add default values for other required Message fields
        type: 'text',
        agentType: undefined,
        sceneId: undefined,
        projectId: undefined,
        metadata: undefined,
        status: undefined,
        attachments: undefined,
        tool_name: undefined,
        tool_arguments: undefined,
        tasks: undefined,
        command: undefined,
        handoffRequest: undefined,
        timestamp: msg.created_at,
        continuityData: undefined,
        structured_output: undefined,
        selectedTool: undefined,
        workflow: undefined,
        canvasContent: undefined,
        runId: undefined,
      }));
      setMessages(formattedMessages);
    } else {
      setMessages([]);
    }
    setIsLoading(false);
  }, [user, isAdmin, selectedUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // --- Real-time Subscription ---
   useEffect(() => {
    if (!user) return;

    const otherUserId = isAdmin ? selectedUserId : ADMIN_USER_ID;
    if (!otherUserId) return; // Don't subscribe without a partner

    const channelName = `chat_messages_${[user.id, otherUserId].sort().join('_')}`;
    console.log(`Attempting to subscribe to channel: ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on<ChatMessageRecord>( // Use specific generated type
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          // More specific filter: listen only for messages sent TO the current user FROM the other user
          filter: `recipient_id=eq.${user.id}` // Filter on recipient
        },
        (payload) => {
          console.log('New message received via subscription:', payload);
          const newMessageRecord = payload.new as ChatMessageRecord; // Assert type

          // Additional check: ensure the sender is the person we're currently chatting with
          if (newMessageRecord.sender_id === otherUserId) {
            const newMessage: Message = {
              id: newMessageRecord.id,
              role: 'assistant', // Incoming message is from the 'other' party
              content: newMessageRecord.content,
              createdAt: newMessageRecord.created_at,
              senderName: isAdmin ? 'User' : 'Admin',
              type: 'text',
               // ... add other default fields from Message type
            };
            // Use functional update to avoid stale state issues
            setMessages(prevMessages => [...prevMessages, newMessage]);
          } else {
             console.log(`Received message from ${newMessageRecord.sender_id}, but current chat is with ${otherUserId}. Ignoring.`);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error on ${channelName}:`, status, err);
          setError('Chat connection issue. Please refresh.');
        } else {
            console.log(`Subscription status on ${channelName}: ${status}`);
        }
      });

    return () => {
      console.log(`Removing channel subscription: ${channelName}`);
      supabase.removeChannel(channel).catch(err => console.error("Error removing channel", err));
    };
  }, [user, isAdmin, selectedUserId]); // Re-run when chat partner changes

  // --- Handle Message Submission ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    if (isAdmin && !selectedUserId) {
      setError("Please select a user to chat with.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const recipientId = isAdmin ? selectedUserId : ADMIN_USER_ID;
    if (!recipientId) {
      setError("Cannot determine message recipient.");
      setIsLoading(false);
      return;
    }

    // Use generated types for insert
    const messageToInsert: Database['public']['Tables']['chat_messages']['Insert'] = {
        sender_id: user.id,
        recipient_id: recipientId,
        content: input.trim(),
        // order_id: extractedOrderId || null, // Add if needed
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert(messageToInsert)
      .select() // Select the inserted row
      .single();

    if (insertError) {
      console.error('Error sending message:', insertError);
      setError(`Failed to send message: ${insertError.message}`);
    } else {
      setInput('');
      // Optimistic update (optional but good for UX)
      if (insertedMessage) {
         const newMessage: Message = {
           id: insertedMessage.id,
           role: 'user',
           content: insertedMessage.content,
           createdAt: insertedMessage.created_at,
           senderName: 'You',
           type: 'text',
            // ... add other default fields
         };
         setMessages(prev => [...prev, newMessage]);
      }
    }
    setIsLoading(false);
  };

  // --- Admin UI for selecting user ---
  const renderAdminUserSelection = () => {
    if (!isAdmin) return null;
    return (
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-lg font-semibold mb-2 text-white">Chat With User</h2>
        {isFetchingUsers ? (
            <p className="text-gray-400">Loading users...</p>
        ) : (
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
              className="w-full p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isFetchingUsers}
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username || u.id} {/* Display username or ID */}
                </option>
              ))}
            </select>
        )}
      </div>
    );
  };

  // --- Loading and Auth Checks ---
  if (isUserLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading User...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Please log in to chat.</div>;
  }

  // --- Render Component ---
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {isAdmin && (
         <div className="w-64 border-r border-gray-700 flex-shrink-0 flex flex-col">
             {renderAdminUserSelection()}
         </div>
      )}
      <div className="flex-1 flex flex-col">
        {(selectedUserId || !isAdmin) ? (
          <SidePanel
            messages={messages}
            input={input}
            isLoading={isLoading}
            userCredits={null}
            onInputChange={setInput}
            onSubmit={handleSendMessage} // Use the internal handler
            onBack={() => {}}
            // userRole prop is removed as it's handled internally now
          />
        ) : (
           isAdmin && <div className="flex-1 flex items-center justify-center text-gray-500">Please select a user to start chatting.</div>
        )}
        {error && <div className="p-2 text-red-400 bg-red-900/50 text-center text-sm">{error}</div>}
      </div>
    </div>
  );
};

export default ChatPage;
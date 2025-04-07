import React, { useState, useRef, useCallback } from "react"; // Added useRef, useCallback
import { Paperclip, X } from "lucide-react"; // Added X icon
import { Attachment } from "@/types/message"; // Import Attachment type
import { v4 as uuidv4 } from "uuid"; // For generating attachment IDs

interface AdminChatInputProps {
  // Update onSend to accept attachments
  onSend: (message: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
  projectId?: string;
}

const AdminChatInput: React.FC<AdminChatInputProps> = ({ onSend, isLoading, projectId }) => {
  const [message, setMessage] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSend = () => {
    // Send if message OR attachments exist
    if (message.trim() !== "" || pendingAttachments.length > 0) {
      onSend(message, pendingAttachments);
      setMessage("");
      setPendingAttachments([]); // Clear attachments after sending
    }
  };

  const handleAttachClick = () => {
    // Trigger the hidden file input
    // TODO: Instead of a generic file input, this should ideally trigger
    // the modal/logic to select specific project data (scenes, images).
    // For now, we'll use a standard file input as a placeholder.
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    // TODO: This currently handles generic file uploads.
    // The actual implementation should handle selecting specific project assets.
    // For now, create placeholder Attachment objects.
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: uuidv4(), // Temporary ID
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
      url: URL.createObjectURL(file), // Temporary URL for preview
      name: file.name,
      size: file.size,
      mimeType: file.type,
      // metadata: { fileObject: file } // Optionally store the File object if needed for upload later
    }));

    setPendingAttachments(prev => [...prev, ...newAttachments]);

    // Reset file input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const removePendingAttachment = (idToRemove: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== idToRemove));
    // Optional: Revoke object URL if created
    // const attachmentToRemove = pendingAttachments.find(att => att.id === idToRemove);
    // if (attachmentToRemove?.url.startsWith('blob:')) {
    //   URL.revokeObjectURL(attachmentToRemove.url);
    // }
  };
  
  return (
    <div className="flex flex-col w-full">
      {/* Display Pending Attachments */}
      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
          {pendingAttachments.map(att => (
            <div key={att.id} className="flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 py-1">
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{att.name}</span>
              <button
                onClick={() => removePendingAttachment(att.id)}
                className="ml-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                title="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple // Allow multiple file selection
        // TODO: Add 'accept' attribute for specific file types if needed
        // accept="image/*,video/*"
      />

      <textarea
        value={message}
        onChange={handleInputChange}
        placeholder="Type your message..."
        className="w-full h-24 p-4 bg-gray-100 dark:bg-gray-900 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" // Added dark mode bg
        disabled={isLoading}
      />
      <div className="flex justify-end items-center mt-2 gap-2">
        {/* Attachment Button */}
        <button
          onClick={handleAttachClick} // Corrected handler name
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed" // Added dark mode colors
          disabled={isLoading} // Only disable if loading
          title={"Attach files"} // Updated title
        >
          <Paperclip className="h-5 w-5" />
        </button>
        {/* Send Button */}
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed" // Added dark mode disabled bg
          // Disable send if loading OR if both message and attachments are empty
          disabled={isLoading || (message.trim() === "" && pendingAttachments.length === 0)}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
  };

export default AdminChatInput;

import React from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { MessageStatus as MessageStatusType } from "@/types/message";

interface MessageStatusProps {
  status: MessageStatusType;
  message?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status, message }) => {
  let icon;
  let statusText;
  let statusColor;

  switch (status) {
    case "pending":
    case "thinking":
    case "working":
    case "in-progress":
      icon = <Loader2 className="animate-spin h-3 w-3 mr-1" />;
      statusText = message || "Working...";
      statusColor = "text-amber-500 dark:text-amber-400";
      break;
    case "completed":
    case "complete":
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
      statusText = message || "Completed";
      statusColor = "text-green-500 dark:text-green-400";
      break;
    case "error":
      icon = <AlertCircle className="h-3 w-3 mr-1" />;
      statusText = message || "Error";
      statusColor = "text-red-500 dark:text-red-400";
      break;
    default:
      icon = <Loader2 className="animate-spin h-3 w-3 mr-1" />;
      statusText = message || "Processing...";
      statusColor = "text-amber-500 dark:text-amber-400";
  }

  return (
    <div className={`flex items-center text-xs ${statusColor}`}>
      {icon}
      <span>{statusText}</span>
    </div>
  );
};

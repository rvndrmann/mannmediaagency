
import React from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { MessageStatus as StatusType } from '@/types/message';

interface MessageStatusProps {
  status: StatusType;
  message?: string;
}

export function MessageStatus({ status, message }: MessageStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {status === 'pending' || status === 'working' || status === 'thinking' ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          <span className="text-blue-500">
            {message || 'Processing...'}
          </span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="h-3 w-3 text-red-500" />
          <span className="text-red-500">
            {message || 'Error processing request'}
          </span>
        </>
      ) : (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-green-500">
            {message || 'Complete'}
          </span>
        </>
      )}
    </div>
  );
}

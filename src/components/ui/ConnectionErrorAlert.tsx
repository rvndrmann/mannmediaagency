
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ConnectionErrorAlertProps {
  errorMessage: string | null;
  onRetry: () => void;
}

export function ConnectionErrorAlert({ errorMessage, onRetry }: ConnectionErrorAlertProps) {
  if (!errorMessage) return null;
  
  return (
    <Alert variant="destructive" className="mb-2 bg-red-900/40 border-red-800">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Connection Issue</AlertTitle>
      <AlertDescription className="flex justify-between items-center">
        <span>{errorMessage}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="ml-2 text-xs border-red-700 bg-red-900/50 hover:bg-red-800/70"
        >
          Retry Connection
        </Button>
      </AlertDescription>
    </Alert>
  );
}

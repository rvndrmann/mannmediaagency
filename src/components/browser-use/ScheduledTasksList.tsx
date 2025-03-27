
import React from "react";
import { 
  CalendarClock, 
  AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export function ScheduledTasksList() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <CalendarClock className="h-5 w-5 mr-2" /> 
          Scheduled Tasks
        </h2>
      </div>

      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <CalendarClock className="h-16 w-16 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">Scheduled Tasks Coming Soon</h3>
          <p className="text-muted-foreground max-w-md">
            The ability to schedule browser automation tasks is coming soon. This feature will allow you to set up recurring tasks or schedule them for specific times.
          </p>
          
          <Alert variant="default" className="mt-4 max-w-md bg-blue-50 dark:bg-blue-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              We're actively working on this feature and it will be available in an upcoming update.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}

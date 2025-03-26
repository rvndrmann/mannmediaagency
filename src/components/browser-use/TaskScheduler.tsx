
import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, addWeeks, addMonths, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrowserConfig, SensitiveDataItem } from "@/hooks/browser-use/types";
import { CalendarDays, Clock, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SensitiveDataManager } from "./SensitiveDataManager";
import { Separator } from "@/components/ui/separator";

interface TaskSchedulerProps {
  taskInput: string;
  browserConfig: BrowserConfig;
  triggerId?: string;
}

export function TaskScheduler({ taskInput, browserConfig, triggerId }: TaskSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(addDays(new Date(), 1));
  const [time, setTime] = useState("09:00");
  const [scheduleType, setScheduleType] = useState<string>("once");
  const [repeatInterval, setRepeatInterval] = useState<string>("1 day");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<SensitiveDataItem[]>(
    browserConfig.sensitiveData || []
  );

  const handleScheduleTask = async () => {
    if (!taskInput.trim()) {
      toast.error("Task description is required");
      return;
    }

    // Validate time format
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      toast.error("Invalid time format. Please use HH:MM (24-hour format)");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to schedule tasks");
        return;
      }

      // Parse time
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledDate = setMinutes(setHours(date, hours), minutes);

      // Calculate next run date for recurring tasks
      let nextRunDate = null;
      if (scheduleType === "recurring") {
        switch (repeatInterval) {
          case "1 day":
            nextRunDate = addDays(scheduledDate, 1);
            break;
          case "1 week":
            nextRunDate = addWeeks(scheduledDate, 1);
            break;
          case "1 month":
            nextRunDate = addMonths(scheduledDate, 1);
            break;
          case "2 weeks":
            nextRunDate = addWeeks(scheduledDate, 2);
            break;
          default:
            nextRunDate = addDays(scheduledDate, 1);
        }
      }

      // Update browser config with sensitive data if changed
      const updatedBrowserConfig = {
        ...browserConfig,
        sensitiveData: sensitiveData
      };

      // Prepare the browser_config for database insertion by converting to a JSON-compatible object
      const { error } = await supabase
        .from('scheduled_browser_tasks')
        .insert({
          task_input: taskInput,
          browser_config: updatedBrowserConfig as any,
          schedule_type: scheduleType,
          scheduled_time: scheduledDate.toISOString(),
          repeat_interval: scheduleType === "recurring" ? repeatInterval : null,
          next_run_at: nextRunDate ? nextRunDate.toISOString() : null,
          status: 'pending',
          user_id: session.user.id
        });

      if (error) throw error;

      toast.success(`Task scheduled for ${format(scheduledDate, "MMM d, yyyy 'at' h:mm a")}`);
      setOpen(false);
    } catch (error) {
      console.error("Error scheduling task:", error);
      toast.error("Failed to schedule task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id={triggerId} variant="outline" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Schedule Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Browser Task</DialogTitle>
          <DialogDescription>
            Set up a time to automatically run this browser task
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-md mb-2">
            <h3 className="font-medium text-sm mb-2">Task to Schedule:</h3>
            <p className="text-sm break-words line-clamp-3">{taskInput}</p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="schedule-type">Schedule Type</Label>
            <Select 
              value={scheduleType} 
              onValueChange={setScheduleType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Run Once</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {scheduleType === "recurring" && (
            <div className="grid gap-2">
              <Label htmlFor="repeat-interval">Repeat Every</Label>
              <Select 
                value={repeatInterval} 
                onValueChange={setRepeatInterval}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 day">Daily</SelectItem>
                  <SelectItem value="1 week">Weekly</SelectItem>
                  <SelectItem value="2 weeks">Bi-weekly</SelectItem>
                  <SelectItem value="1 month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setDate(date)}
              initialFocus
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time (24-hour format)
            </Label>
            <Input
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="HH:MM"
            />
          </div>

          <Separator className="my-2" />

          {/* Sensitive Data Configuration */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                Sensitive Data
              </Label>
              {sensitiveData.length > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {sensitiveData.length} secret{sensitiveData.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure any passwords or secrets needed for this scheduled task
            </p>
            
            <SensitiveDataManager
              sensitiveData={sensitiveData}
              onChange={setSensitiveData}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleScheduleTask} disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

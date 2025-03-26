
import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
import { BrowserConfig } from "@/hooks/browser-use/types";
import { CalendarDays, Clock } from "lucide-react";

interface TaskSchedulerProps {
  taskInput: string;
  browserConfig: BrowserConfig;
}

export function TaskScheduler({ taskInput, browserConfig }: TaskSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(addDays(new Date(), 1));
  const [time, setTime] = useState("09:00");
  const [scheduleType, setScheduleType] = useState<string>("once");
  const [repeatInterval, setRepeatInterval] = useState<string>("1 day");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const { error } = await supabase
        .from('scheduled_browser_tasks')
        .insert({
          task_input: taskInput,
          browser_config: browserConfig as any,
          schedule_type: scheduleType,
          scheduled_time: scheduledDate.toISOString(),
          repeat_interval: scheduleType === "recurring" ? repeatInterval : null,
          next_run_at: nextRunDate ? nextRunDate.toISOString() : null,
          status: 'pending'
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
        <Button variant="outline" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Schedule Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Browser Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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

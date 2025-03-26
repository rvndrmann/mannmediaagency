
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { BrowserConfig } from "@/hooks/browser-use/types";
import { CalendarIcon, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";

interface TaskSchedulerProps {
  taskInput: string;
  browserConfig: BrowserConfig;
  templateId?: string;
  onScheduled?: () => void;
}

export function TaskScheduler({
  taskInput,
  browserConfig,
  templateId,
  onScheduled
}: TaskSchedulerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleType, setScheduleType] = useState("once");
  const [repeatInterval, setRepeatInterval] = useState("daily");

  const handleSchedule = async () => {
    if (!scheduleDate) {
      toast.error("Please select a date");
      return;
    }

    if (!taskInput.trim()) {
      toast.error("Task input is required");
      return;
    }

    // Combine date and time
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const scheduledDateTime = new Date(scheduleDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    // Ensure the scheduled time is in the future
    if (scheduledDateTime < new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    try {
      setIsLoading(true);

      // Calculate next run time based on repeat interval
      let nextRunAt = null;
      let repeatIntervalValue = null;

      if (scheduleType === "recurring") {
        if (repeatInterval === "daily") {
          nextRunAt = addDays(scheduledDateTime, 1);
          repeatIntervalValue = '1 day';
        } else if (repeatInterval === "weekly") {
          nextRunAt = addWeeks(scheduledDateTime, 1);
          repeatIntervalValue = '1 week';
        } else if (repeatInterval === "monthly") {
          nextRunAt = addMonths(scheduledDateTime, 1);
          repeatIntervalValue = '1 month';
        }
      }

      const { data, error } = await supabase
        .from('scheduled_browser_tasks')
        .insert({
          task_input: taskInput,
          browser_config: browserConfig,
          template_id: templateId || null,
          schedule_type: scheduleType,
          scheduled_time: scheduledDateTime.toISOString(),
          repeat_interval: repeatIntervalValue,
          next_run_at: nextRunAt?.toISOString() || null,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Task scheduled successfully");
      setShowDialog(false);
      
      if (onScheduled) {
        onScheduled();
      }
    } catch (error) {
      console.error("Error scheduling task:", error);
      toast.error("Failed to schedule task");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time options for dropdown (every 30 minutes)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2"
      >
        <CalendarIcon className="h-4 w-4" />
        Schedule Task
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
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
              <div className="space-y-2">
                <Label>Repeat Interval</Label>
                <Select
                  value={repeatInterval}
                  onValueChange={setRepeatInterval}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select repeat interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? format(scheduleDate, 'PPP') : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Select
                value={scheduleTime}
                onValueChange={setScheduleTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={isLoading}>
              {isLoading ? "Scheduling..." : "Schedule Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

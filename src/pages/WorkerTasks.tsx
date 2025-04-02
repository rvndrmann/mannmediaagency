import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth'; // To get current user
import { supabase } from '@/integrations/supabase/client'; // To interact with Supabase

// Define the structure of a Task (similar to Admin page, might need adjustments based on DB schema)
interface Task {
  id: string;
  title: string;
  description: string;
  admin_media_url?: string; // Media provided by admin
  status: 'Pending Task' | 'On Revision' | 'Done Task Approved';
  assigned_to?: string; // User ID of the assigned worker
  // Add fields for worker submissions later
}

// Define the structure for worker submissions (will likely be stored separately)
interface WorkerSubmission {
  taskId: string;
  text?: string;
  mediaUrl?: string; // URL for worker's uploaded image/video/doc
  submittedAt: string;
}

const WorkerTasks: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for handling submission for a specific task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionMedia, setSubmissionMedia] = useState<File | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'Pending Task' | 'On Revision' | 'Done Task Approved'>('Pending Task');

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setLoadingTasks(false);
        return; // Not logged in
      }

      setLoadingTasks(true);
      setError(null);
      try {
        // --- TODO: Replace with actual Supabase query ---
        // This needs a 'tasks' table with an 'assigned_to' column matching user.id
        // Example placeholder query:
        // const { data, error } = await supabase
        //   .from('tasks')
        //   .select('*')
        //   .eq('assigned_to', user.id);
        // if (error) throw error;
        // setAssignedTasks(data || []);

        // Placeholder data for now:
        console.warn("Using placeholder task data. Implement Supabase fetch.");
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        const placeholderTasks: Task[] = [
          // { id: 'TASK-123', title: 'Sample Task 1', description: 'Do the thing.', status: 'Pending Task', assigned_to: user.id },
          // { id: 'TASK-456', title: 'Sample Task 2', description: 'Do the other thing.', status: 'Pending Task', assigned_to: user.id },
        ];
        setAssignedTasks(placeholderTasks);
        // --- End of Placeholder ---

      } catch (err) {
        console.error("Error fetching assigned tasks:", err);
        setError("Failed to load tasks.");
        setAssignedTasks([]);
      } finally {
        setLoadingTasks(false);
      }
    };

    if (!authLoading) {
      fetchTasks();
    }
  }, [user, authLoading]);

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSubmissionMedia(event.target.files[0]);
      // TODO: Add file upload logic (e.g., using useSupabaseUpload hook)
      console.log('Selected file for submission:', event.target.files[0]);
    }
  };

  const handleStartSubmission = (task: Task) => {
    setSelectedTaskId(task.id);
    setSubmissionText('');
    setSubmissionMedia(null);
    setSubmissionStatus(task.status); // Start with current status
  };

  const handleCancelSubmission = () => {
    setSelectedTaskId(null);
  };

  const handleSubmitUpdate = async () => {
    if (!selectedTaskId || !user) return;

    // --- TODO: Implement actual submission logic ---
    // 1. Upload media file if present, get URL.
    // 2. Save submission details (text, media URL) to a 'task_submissions' table (linked to selectedTaskId).
    // 3. Update the status of the task in the 'tasks' table.
    console.warn("Submitting update (placeholder):", {
      taskId: selectedTaskId,
      text: submissionText,
      media: submissionMedia?.name,
      status: submissionStatus,
    });

    // Example placeholder update:
    setAssignedTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === selectedTaskId ? { ...task, status: submissionStatus } : task
      )
    );
    // --- End of Placeholder ---

    setSelectedTaskId(null); // Close submission form
    alert('Task updated (placeholder). Implement actual submission logic.');
  };


  if (authLoading || loadingTasks) {
    return <div className="container mx-auto p-4">Loading tasks...</div>;
  }

  if (error) {
     return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">Please log in to view your tasks.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Assigned Tasks</h1>

      {assignedTasks.length === 0 ? (
        <p>You have no tasks assigned.</p>
      ) : (
        <div className="space-y-4">
          {assignedTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>ID: {task.id} | Status: {task.status}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2">{task.description}</p>
                {/* TODO: Display admin-provided media if available */}

                {selectedTaskId === task.id ? (
                  // Submission Form
                  <div className="mt-4 p-4 border rounded-md space-y-4 bg-muted/40">
                    <h3 className="font-semibold">Update Task Progress</h3>
                     <div>
                       <label htmlFor={`submissionText-${task.id}`} className="block text-sm font-medium mb-1">Notes / Text Update</label>
                       <Textarea
                         id={`submissionText-${task.id}`}
                         value={submissionText}
                         onChange={(e) => setSubmissionText(e.target.value)}
                         placeholder="Add your notes or text update here..."
                       />
                     </div>
                     <div>
                       <label htmlFor={`submissionMedia-${task.id}`} className="block text-sm font-medium mb-1">Upload File (Image/Video/Doc)</label>
                       <Input
                         id={`submissionMedia-${task.id}`}
                         type="file"
                         accept="image/*,video/*,.pdf,.doc,.docx,.txt" // Adjust accepted types as needed
                         onChange={handleMediaChange}
                       />
                       {/* TODO: Add preview for selected media */}
                     </div>
                     <div>
                       <label htmlFor={`submissionStatus-${task.id}`} className="block text-sm font-medium mb-1">Update Status</label>
                       <Select value={submissionStatus} onValueChange={(value: Task['status']) => setSubmissionStatus(value)}>
                         <SelectTrigger id={`submissionStatus-${task.id}`}>
                           <SelectValue placeholder="Select new status" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Pending Task">Pending Task</SelectItem>
                           <SelectItem value="On Revision">On Revision</SelectItem>
                           <SelectItem value="Done Task Approved">Done Task Approved</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handleCancelSubmission}>Cancel</Button>
                        <Button onClick={handleSubmitUpdate}>Submit Update</Button>
                     </div>
                  </div>
                ) : (
                  // Button to start update
                  <div className="mt-4">
                    <Button onClick={() => handleStartSubmission(task)}>Update Progress</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerTasks;
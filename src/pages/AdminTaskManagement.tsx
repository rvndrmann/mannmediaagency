import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, X, UploadCloud, Maximize, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

// Define the structure matching the 'tasks' table
type TaskStatus = 'Pending Task' | 'On Revision' | 'Done Task Approved';
interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string;
  status: TaskStatus;
  created_by?: string;
  task_image_url?: string;
  task_image_type?: string;
  result_image_url?: string;
  result_image_type?: string;
  result_text?: string | null;
}

const AdminTaskManagement: React.FC = () => {
  const { user } = useAuth();
  const { handleFileUpload, uploadProgress, previewUrl: uploadPreviewUrl } = useSupabaseUpload();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('Pending Task');
  const [newTaskImageFile, setNewTaskImageFile] = useState<File | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>('Pending Task');
  const [editResultImageFile, setEditResultImageFile] = useState<File | null>(null);
  const [editResultText, setEditResultText] = useState<string>('');

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(`Failed to load tasks: ${err.message}`);
      toast.error(`Failed to load tasks: ${err.message}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleNewTaskImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setNewTaskImageFile(event.target.files[0]);
    } else {
      setNewTaskImageFile(null);
    }
  };

  const handleEditResultImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     if (event.target.files && event.target.files[0]) {
       setEditResultImageFile(event.target.files[0]);
     } else {
       setEditResultImageFile(null);
     }
   };

  const handleCreateTask = async () => {
    if (!newTaskTitle || !user) {
      toast.error('Title is required.');
      return;
    }
    setIsUploading(true);
    let taskImageUrl: string | null = null;
    let taskImageType: string | undefined = undefined;
    if (newTaskImageFile) {
      try {
        taskImageUrl = await handleFileUpload(newTaskImageFile, 'task-images', 'image');
        if (!taskImageUrl) { setIsUploading(false); return; }
        taskImageType = newTaskImageFile.type;
      } catch (uploadErr: any) {
        console.error("Error during task image upload call:", uploadErr);
        toast.error(`Failed to upload task image: ${uploadErr.message}`);
        setIsUploading(false); return;
      }
    }
    try {
      const { error: insertError } = await supabase.from('tasks').insert({
        title: newTaskTitle, description: newTaskDescription, status: newTaskStatus,
        created_by: user.id, task_image_url: taskImageUrl, task_image_type: taskImageType,
      });
      if (insertError) throw insertError;
      toast.success('Task created successfully!');
      setShowCreateForm(false); setNewTaskTitle(''); setNewTaskDescription('');
      setNewTaskStatus('Pending Task'); setNewTaskImageFile(null);
      fetchTasks();
    } catch (err: any) {
      console.error("Error creating task:", err);
      toast.error(`Failed to create task: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditStatus(task.status);
    setEditResultImageFile(null);
    setEditResultText(task.result_text || '');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditResultText('');
  };

  const handleUpdateTask = async () => {
    if (!editingTaskId || !user) return;
    setIsUploading(true);
    let resultImageUrl: string | null = null;
    let resultImageType: string | undefined = undefined;
    const taskToUpdate = tasks.find(t => t.id === editingTaskId);
    if (!taskToUpdate) { setIsUploading(false); return; }

    if (editResultImageFile) {
       try {
         resultImageUrl = await handleFileUpload(editResultImageFile, 'result-images', 'image');
         if (!resultImageUrl) { setIsUploading(false); return; }
         resultImageType = editResultImageFile.type;
       } catch (uploadErr: any) {
         console.error("Error during result image upload call:", uploadErr);
         toast.error(`Failed to upload result image: ${uploadErr.message}`);
         setIsUploading(false); return;
       }
    }

    const updateData: Partial<Task> = { status: editStatus, result_text: editResultText };
    if (resultImageUrl) {
        updateData.result_image_url = resultImageUrl;
        updateData.result_image_type = resultImageType;
    } else if (editStatus === taskToUpdate.status && editResultText === (taskToUpdate.result_text || '')) {
        toast.info("No changes detected.");
        setEditingTaskId(null); setEditResultText(''); setIsUploading(false); return;
    }

    try {
      const { error: updateError } = await supabase.from('tasks').update(updateData).eq('id', editingTaskId);
      if (updateError) throw updateError;
      toast.success('Task updated successfully!');
      setEditingTaskId(null); setEditResultText(''); fetchTasks();
    } catch (err: any) {
      console.error("Error updating task:", err);
      toast.error(`Failed to update task: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => { // Add taskId parameter here
    // taskToDeleteId is passed directly now
    if (!taskId) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success('Task deleted successfully!');
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err: any) {
      console.error("Error deleting task:", err);
      toast.error(`Failed to delete task: ${err.message}`);
    } finally {
      // No need to manage separate state anymore
    }
  };

  const openImageModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  const renderImage = (url?: string | null, alt?: string) => {
    if (!url) return null;
    if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
      return (
        <button onClick={() => openImageModal(url)} className="mt-2 rounded border overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" aria-label={`View full image for ${alt || 'Task Image'}`}>
          <img src={url} alt={alt || 'Task Image'} className="block max-w-xs max-h-48 object-contain" />
        </button>
      );
    }
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-2 block">View Media File</a>;
  };

  if (loading) { return <div className="container mx-auto p-4 text-center">Loading tasks...</div>; }
  if (error) { return <div className="container mx-auto p-4 text-red-600 bg-red-100 border border-red-400 rounded p-4">{error}</div>; }

  return (
    <Fragment>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Task Management</h1>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="outline" size="icon" aria-label="Create New Task">
            {showCreateForm ? <X className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
          </Button>
        </div>

        {/* Create Task Form */}
        {showCreateForm && (
          <Card className="mb-6 bg-muted/20">
            <CardHeader><CardTitle>Create New Task</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="taskTitle" className="block text-sm font-medium mb-1">Title *</label>
                <Input id="taskTitle" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Enter task title" required />
              </div>
              <div>
                <label htmlFor="taskDescription" className="block text-sm font-medium mb-1">Description</label>
                <Textarea id="taskDescription" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Enter task description" />
              </div>
              <div>
                <label htmlFor="taskImage" className="block text-sm font-medium mb-1">Task Image</label>
                <Input id="taskImage" type="file" accept="image/*" onChange={handleNewTaskImageChange} disabled={isUploading} />
                {isUploading && newTaskImageFile && <Progress value={uploadProgress} className="w-full h-2 mt-2" />}
                {newTaskImageFile && !isUploading && <p className="text-xs mt-1 text-muted-foreground">Selected: {newTaskImageFile.name}</p>}
                {uploadPreviewUrl && newTaskImageFile && !isUploading && <img src={uploadPreviewUrl} alt="Preview" className="max-w-xs max-h-32 mt-2 rounded border object-contain" />}
              </div>
              <div>
                <label htmlFor="taskStatus" className="block text-sm font-medium mb-1">Initial Status</label>
                <Select value={newTaskStatus} onValueChange={(value: TaskStatus) => setNewTaskStatus(value)} disabled={isUploading}>
                  <SelectTrigger id="taskStatus"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending Task">Pending Task</SelectItem>
                    <SelectItem value="On Revision">On Revision</SelectItem>
                    <SelectItem value="Done Task Approved">Done Task Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                 <Button variant="outline" onClick={() => setShowCreateForm(false)} disabled={isUploading}>Cancel</Button>
                 <Button onClick={handleCreateTask} disabled={isUploading}>
                   {isUploading ? (<><UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> Uploading...</>) : 'Create Task'}
                 </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Tasks</h2>
          {tasks.length === 0 ? (
            <p>No tasks created yet.</p>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className={editingTaskId === task.id ? 'border-primary shadow-md' : ''}>
                <CardHeader className="flex flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle>{task.title}</CardTitle>
                    <CardDescription>ID: {task.id} | Status: <span className="font-medium">{task.status}</span></CardDescription>
                    <CardDescription>Created: {new Date(task.created_at).toLocaleString()}</CardDescription>
                     {task.updated_at && task.updated_at !== task.created_at && (
                       <CardDescription>Updated: {new Date(task.updated_at).toLocaleString()}</CardDescription>
                     )}
                  </div>
                  {/* Action Buttons: Edit and Delete */}
                  <div className="flex items-center space-x-1">
                    {editingTaskId !== task.id && (
                      <Button onClick={() => handleStartEdit(task)} variant="ghost" size="icon" aria-label="Edit Task">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Delete Button AlertDialog structure moved inside map */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Delete Task" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task "{task.title}"
                            and any associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          {/* Pass task.id directly to handleDeleteTask */}
                          <AlertDialogAction onClick={() => handleDeleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {/* Removed extra closing tags here */}
                </CardHeader>
                <CardContent>
                  {task.description && <p className="mb-3 whitespace-pre-wrap">{task.description}</p>}

                  {/* Task Image Display */}
                  {task.task_image_url && (
                    <div className="mb-3">
                      <p className="text-sm font-medium">Task Image:</p>
                      {renderImage(task.task_image_url, 'Task Image')}
                    </div>
                  )}

                  {/* Result Image Display */}
                   {task.result_image_url && (
                     <div className="mb-3">
                       <p className="text-sm font-medium">Result Report/Image:</p>
                       {renderImage(task.result_image_url, 'Result Image')}
                     </div>
                   )}

                  {/* Result Text Display */}
                  {task.result_text && (
                    <div className="mb-3 mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium mb-1">Result Text/Notes:</p>
                      <p className="text-sm whitespace-pre-wrap text-foreground">{task.result_text}</p>
                    </div>
                  )}

                  {/* Edit Task Form (Inline) */}
                  {editingTaskId === task.id && (
                    <div className="mt-4 p-4 border rounded-md space-y-4 bg-muted/20">
                      <h3 className="font-semibold text-base mb-3">Update Task</h3>
                      <div>
                         <label htmlFor={`editStatus-${task.id}`} className="block text-sm font-medium mb-1">Update Status</label>
                         <Select value={editStatus} onValueChange={(value: TaskStatus) => setEditStatus(value)} disabled={isUploading}>
                           <SelectTrigger id={`editStatus-${task.id}`}><SelectValue placeholder="Select new status" /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Pending Task">Pending Task</SelectItem>
                             <SelectItem value="On Revision">On Revision</SelectItem>
                             <SelectItem value="Done Task Approved">Done Task Approved</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div>
                         <label htmlFor={`editResultImage-${task.id}`} className="block text-sm font-medium mb-1">Upload/Replace Result Image</label>
                         <Input id={`editResultImage-${task.id}`} type="file" accept="image/*" onChange={handleEditResultImageChange} disabled={isUploading} />
                         {isUploading && editResultImageFile && <Progress value={uploadProgress} className="w-full h-2 mt-2" />}
                         {editResultImageFile && !isUploading && <p className="text-xs mt-1 text-muted-foreground">Selected: {editResultImageFile.name}</p>}
                         {task.result_image_url && !editResultImageFile && <p className="text-xs mt-1 text-muted-foreground">Current result image will be kept unless a new one is uploaded.</p>}
                       </div>
                       {/* Text Input for Result */}
                       <div>
                         <label htmlFor={`editResultText-${task.id}`} className="block text-sm font-medium mb-1">Result Text/Notes</label>
                         <Textarea id={`editResultText-${task.id}`} value={editResultText} onChange={(e) => setEditResultText(e.target.value)} placeholder="Add text report or notes here..." rows={4} disabled={isUploading} />
                       </div>
                       <div className="flex justify-end space-x-2 pt-2">
                          <Button variant="outline" onClick={handleCancelEdit} disabled={isUploading}>Cancel</Button>
                          <Button onClick={handleUpdateTask} disabled={isUploading}>
                            {isUploading ? (<><UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> Uploading...</>) : 'Save Changes'}
                          </Button>
                       </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div> {/* Closing main container div */}

      {/* Image Modal/Dialog */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="mt-4 flex justify-center items-center">
            {modalImageUrl ? (
              <img src={modalImageUrl} alt="Full size preview" className="max-w-full max-h-[80vh] object-contain" />
            ) : (
              <p>No image selected.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog structure moved inside the map loop */}

    </Fragment>
  );
};

export default AdminTaskManagement;
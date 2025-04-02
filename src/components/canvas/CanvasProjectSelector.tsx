import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { CanvasProject } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowLeft } from 'lucide-react'; // Import Trash icon and ArrowLeft
interface CanvasProjectSelectorProps {
  projects: CanvasProject[];
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
  onDeleteProject: (projectId: string) => Promise<boolean>; // Add delete prop
}

export function CanvasProjectSelector({ projects, onSelectProject, onCreateNew, onDeleteProject }: CanvasProjectSelectorProps) {
  const navigate = useNavigate(); // Initialize useNavigate

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 relative"> {/* Added relative positioning */}
      {/* Back Button - Positioned top-left */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4" // Position the button
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Select a Project</h2>
          <Button onClick={onCreateNew} variant="outline">
            Create New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400">No projects found.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex justify-between items-center relative group" // Added relative group
                // onClick={() => onSelectProject(project.id)} // Remove main click, use inner div
              >
                {/* Make main content clickable */}
                <div className="flex-grow cursor-pointer mr-4" onClick={() => onSelectProject(project.id)}>
                  <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100 mb-1">{project.title}</h4>
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description}</p>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(project.updatedAt || project.updated_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={async (e) => {
                    e.stopPropagation(); // Prevent card click
                    if (confirm(`Are you sure you want to delete project "${project.title}"?`)) {
                      await onDeleteProject(project.id);
                      // List should refresh automatically if parent state updates
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
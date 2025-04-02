import React from 'react';
import { CanvasProject } from '@/types/canvas';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

interface CanvasProjectSelectorProps {
  projects: CanvasProject[];
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void; // Function to switch back to create new form
}

export function CanvasProjectSelector({ projects, onSelectProject, onCreateNew }: CanvasProjectSelectorProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
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
                className="border dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition flex justify-between items-center"
                onClick={() => onSelectProject(project.id)}
              >
                <div>
                  <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100 mb-1">{project.title}</h4>
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description}</p>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(project.updatedAt || project.updated_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <Button size="sm" variant="ghost">Select</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
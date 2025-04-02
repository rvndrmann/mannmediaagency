import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react'; // Import Trash icon
import { Button } from '@/components/ui/button'; // Import Button
import { MCPServerService } from '../../services/mcpService';
import { VideoProject } from '../../types/video-project';

interface VideoProjectHistoryProps {
  mcpService: MCPServerService;
  onSelectProject?: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => Promise<void>; // Add delete prop
}

export function VideoProjectHistory({ mcpService, onSelectProject, onDeleteProject }: VideoProjectHistoryProps) { // Destructure delete prop
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpService.callTool('list_video_projects', {});
      if (!result.success) {
        throw new Error(result.error || 'Failed to load projects');
      }
      setProjects(result.data.projects || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mcpService.isConnected()) {
      loadProjects();
    } else {
      mcpService.connect().then(() => {
        loadProjects();
      }).catch(err => {
        setError(new Error(`Failed to connect to MCP: ${err.message}`));
      });
    }
  }, [mcpService]);

  const handleSelectProject = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
    } else {
      navigate(`/video-projects/${projectId}`);
    }
  };

  if (loading) {
    return <div className="p-4">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Project History</h3>
        <button
          onClick={loadProjects}
          className="px-3 py-1 bg-blue-100 rounded hover:bg-blue-200 text-blue-800 text-sm"
        >
          Refresh
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-gray-500">No projects found. Create your first project!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition relative group" // Added relative group for positioning delete button
              // Removed main onClick from div, selection happens on title/description click now
            >
              {/* Delete Button */}
              {onDeleteProject && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 text-gray-400 hover:text-red-500" /* Removed hover opacity classes */
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {/* Make title/description clickable for selection */}
              <div onClick={() => handleSelectProject(project.id)} className="cursor-pointer">
                <h4 className="font-medium text-lg mb-1 pr-8">{project.name}</h4> {/* Added padding-right */}
                <p className="text-sm text-gray-600 mb-2">{project.description}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-800">
                  {project.status}
                </span>
                <span className="text-xs text-gray-500">
                  {project.scenes?.length || 0} scenes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
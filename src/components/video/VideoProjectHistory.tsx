import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MCPServerService } from '../../services/mcpService';
import { VideoProject } from '../../types/video-project';

interface VideoProjectHistoryProps {
  mcpService: MCPServerService;
  onSelectProject?: (projectId: string) => void;
}

export function VideoProjectHistory({ mcpService, onSelectProject }: VideoProjectHistoryProps) {
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
              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => handleSelectProject(project.id)}
            >
              <h4 className="font-medium text-lg mb-1">{project.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{project.description}</p>
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
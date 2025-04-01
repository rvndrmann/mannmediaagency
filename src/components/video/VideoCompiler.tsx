import React, { useState, useEffect } from 'react';
import { MCPServerService } from '../../services/mcpService';
import { AgentSDKService } from '../../services/agentSDKService';
import { VideoProject } from '../../types/video-project';
import { createVideo, getVideoStatus } from '../../services/json2videoService';

interface VideoCompilerProps {
  mcpService: MCPServerService;
  agentSDK: AgentSDKService;
  projectId: string;
}

export function VideoCompiler({ mcpService, agentSDK, projectId }: VideoCompilerProps) {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [compiling, setCompiling] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm'>('mp4');
  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compilationStatus, setCompilationStatus] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mcpService.callTool('get_video_project', { projectId });
      if (!result.success || !result.data.project) {
        throw new Error(result.error || 'Failed to load project');
      }
      setProject(result.data.project);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error loading project: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompileVideo = async () => {
    if (!project || !projectId) return;
    
    setCompiling(true);
    setError(null);
    setCompilationStatus('Starting video compilation...');
    
    try {
      // Step 1: Check if all scenes are ready for compilation
      const allScenesReady = project.scenes.every(scene =>
        scene.videoUrl && scene.status === 'completed'
      );
      
      if (!allScenesReady) {
        setCompilationStatus('Preparing scenes for compilation...');
        
        // Use Agent SDK to optimize the compilation process
        await agentSDK.executeFunction('prepare_scenes_for_compilation', {
          projectId
        });
        
        // Refresh project data
        const refreshResult = await mcpService.callTool('get_video_project', { projectId });
        if (!refreshResult.success) {
          throw new Error('Failed to refresh project data');
        }
        setProject(refreshResult.data.project);
      }
      
      // Step 2: Generate video configuration using Agent SDK
      setCompilationStatus('Generating optimal video configuration...');
      const configResult = await agentSDK.executeFunction('generate_video_config', {
        projectId,
        outputFormat
      });
      
      if (!configResult.success) {
        throw new Error('Failed to generate video configuration');
      }
      
      // Step 3: Create a video project with json2videoService
      setCompilationStatus('Creating video project with json2video service...');
      
      // First notify MCP about the compilation
      await mcpService.callTool('compile_video', {
        projectId,
        outputFormat,
        config: configResult.data.configuration
      });
      
      // Then use json2videoService directly for better control
      const json2videoProject = await createVideo(configResult.data.configuration);
      const json2videoProjectId = json2videoProject.project;
      
      // Step 4: Poll for completion
      setCompilationStatus('Processing video... This may take a few minutes');
      
      let videoUrl = null;
      let statusCheckAttempts = 0;
      const maxStatusCheckAttempts = 20; // Limit the number of status checks
      
      while (!videoUrl && statusCheckAttempts < maxStatusCheckAttempts) {
        statusCheckAttempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between checks
        
        const statusResult = await getVideoStatus(json2videoProjectId);
        setCompilationStatus(`Processing video... Status: ${statusResult.status}`);
        
        if (statusResult.status === 'completed' && statusResult.url) {
          videoUrl = statusResult.url;
          break;
        } else if (statusResult.status === 'failed') {
          throw new Error('Video compilation failed in json2video service');
        }
      }
      
      if (!videoUrl) {
        throw new Error('Video compilation timed out. Please check project status later.');
      }
      
      setCompiledVideoUrl(videoUrl);
      setCompilationStatus('Video compilation complete!');
      
      // Update project status
      await mcpService.callTool('update_video_project', {
        projectId,
        status: 'completed'
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Compilation error: ${errorMessage}`);
      setCompilationStatus('Video compilation failed');
    } finally {
      setCompiling(false);
    }
  };
  
  if (loading) {
    return <div className="p-4">Loading project data...</div>;
  }
  
  if (error && !project) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!project) {
    return <div className="p-4">No project data available</div>;
  }

  const canCompile = project.scenes.length > 0;
  
  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Video Compilation</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Compile all scenes into a complete video. Make sure all scenes are properly configured before compilation.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Output Format</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as 'mp4' | 'webm')}
              className="w-full p-2 border rounded"
              disabled={compiling}
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50 rounded mb-4">
            <h4 className="text-sm font-medium mb-2">Project Status</h4>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`}></div>
              <span className="ml-2 text-sm capitalize">{project.status}</span>
            </div>
            <p className="text-xs mt-2">
              {project.scenes.length} scene{project.scenes.length !== 1 ? 's' : ''} available
            </p>
          </div>
          
          <button
            onClick={handleCompileVideo}
            disabled={compiling || !canCompile}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {compiling ? 'Compiling...' : 'Compile Full Video'}
          </button>
        </div>
        
        {compilationStatus && (
          <div className="p-3 bg-blue-50 text-blue-800 rounded">
            <p className="text-sm font-medium">{compilationStatus}</p>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        
        {compiledVideoUrl && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Compiled Video</h4>
            <video
              src={compiledVideoUrl}
              controls
              className="w-full rounded border"
            />
            <div className="mt-2">
              <a 
                href={compiledVideoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Open in new tab
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get the status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-400';
    case 'in_progress':
      return 'bg-yellow-400';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}
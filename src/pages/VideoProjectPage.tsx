import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoProjectManager } from '../components/video/VideoProjectManager';
import { VideoProjectHistory } from '../components/video/VideoProjectHistory';
import { AutomatedSceneCreator } from '../components/video/AutomatedSceneCreator';
import { VideoCompiler } from '../components/video/VideoCompiler';
import { VideoProjectCanvas } from '../components/video/VideoProjectCanvas';
import { MCPServerService } from '../services/mcpService';
import { AgentSDKService } from '../services/agentSDKService';
import { useAIChat } from '../hooks/use-ai-chat';
import { VideoScene, VideoProject } from '../types/video-project';

export function VideoProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [mcpService] = useState(() => new MCPServerService('http://localhost:3000', projectId));
  const [agentSDK] = useState(() => new AgentSDKService());
  const { messages, input, setInput, isLoading, handleSubmit } = useAIChat();
  const [showCanvas, setShowCanvas] = useState<boolean>(false);
  const [sceneCreated, setSceneCreated] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(!projectId);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [projectData, setProjectData] = useState<VideoProject | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Connect to MCP
        await mcpService.connect();
        console.log('Connected to MCP server');
        
        // Initialize Agent SDK
        await agentSDK.initialize({
          apiKey: 'dummy-api-key', // Replace with actual API key in production
        });
        console.log('Initialized Agent SDK');
        
        setConnectionStatus('connected');
        
        // If we have a project ID, fetch project data
        if (projectId) {
          const result = await mcpService.callTool('get_video_project', { projectId });
          if (result.success && result.data.project) {
            setProjectData(result.data.project);
            console.log('Loaded project data:', result.data.project);
          }
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setConnectionStatus('disconnected');
      }
    };

    initialize();

    return () => {
      mcpService.disconnect().catch(console.error);
      agentSDK.cleanup().catch(console.error);
      setConnectionStatus('disconnected');
    };
  }, [mcpService, agentSDK, projectId]);
  
  // Synchronize project data when scenes are updated
  useEffect(() => {
    if (sceneCreated && projectId) {
      mcpService.callTool('get_video_project', { projectId })
        .then(result => {
          if (result.success && result.data.project) {
            setProjectData(result.data.project);
          }
        })
        .catch(console.error);
    }
  }, [sceneCreated, projectId, mcpService]);

  // MCP tools are handled through the VideoProjectManager component

  const handleSelectProject = (selectedProjectId: string) => {
    navigate(`/video-projects/${selectedProjectId}`);
    setShowHistory(false); // Keep history open after selection? Maybe remove this line?
  };
  
  // Function to handle project deletion
  const handleDeleteProject = async (idToDelete: string) => {
    console.log(`Attempting to delete project: ${idToDelete}`);
    try {
      const result = await mcpService.callTool('delete_video_project', { projectId: idToDelete });
      if (result.success) {
        console.log(`Project ${idToDelete} deleted successfully.`);
        // How to refresh the list in VideoProjectHistory?
        // Option 1: Pass a 'refresh' callback down (complex prop drilling)
        // Option 2: Add a key to VideoProjectHistory that changes on delete (forces remount/refetch)
        // Option 3: Modify VideoProjectHistory to expose a refresh method (less ideal)
        // Option 4: Use a state management library (if available)
        // For now, let's just log success. Refresh needs more thought.
        // Maybe navigate away if the deleted project is the current one?
        if (projectId === idToDelete) {
          navigate('/video-projects'); // Navigate back if current project deleted
          setShowHistory(true); // Show history after deleting current project
        } else {
          // Need a way to tell VideoProjectHistory to reload...
          // Let's try forcing a remount with a key for now
          setProjectListKey(prev => prev + 1);
        }
      } else {
        console.error(`Failed to delete project ${idToDelete}:`, result.error);
        alert(`Failed to delete project: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error calling delete_video_project tool:`, error);
      alert(`Error deleting project: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Add state for forcing VideoProjectHistory remount
  const [projectListKey, setProjectListKey] = useState(0);
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">Video Project Management</h1>
          <p className="text-gray-600">
            Create and manage video projects with AI-powered assistance
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {showHistory ? 'Hide History' : 'Project History'}
          </button>
          {projectId && (
            <button
              onClick={() => setShowCanvas(prev => !prev)}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              {showCanvas ? 'Hide Canvas View' : 'Show Canvas View'}
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="mb-8 bg-white rounded-lg shadow-lg overflow-hidden">
          <VideoProjectHistory
            mcpService={mcpService}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject} // Pass delete handler down
            key={projectListKey} // Add key to force remount on change
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <VideoProjectManager
              mcpService={mcpService}
              agentSDK={agentSDK}
              projectId={projectId}
            />
          </div>
          
          {showCanvas && projectId && (
            <div className="mt-8">
              <VideoProjectCanvas
                mcpService={mcpService}
                agentSDK={agentSDK}
                projectId={projectId}
              />
            </div>
          )}
          
          {projectId && (
            <>
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <AutomatedSceneCreator
                  mcpService={mcpService}
                  agentSDK={agentSDK}
                  projectId={projectId}
                  onSceneCreated={(scene: VideoScene) => {
                    setSceneCreated(true);
                    // Trigger a refresh or update in the VideoProjectManager
                  }}
                />
              </div>
              
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <VideoCompiler
                  mcpService={mcpService}
                  agentSDK={agentSDK}
                  projectId={projectId}
                />
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">AI Assistant</h2>
            <div className="h-[500px] overflow-y-auto border rounded p-4 mb-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="text-center text-gray-500">
                  AI is thinking...
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI assistant..."
                className="flex-1 p-2 border rounded"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
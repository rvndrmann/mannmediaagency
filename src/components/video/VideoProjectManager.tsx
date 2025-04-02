import React, { useEffect, useState } from 'react';
import { useAgentEnhancedVideoProject } from '../../hooks/use-agent-enhanced-video-project';
import { MCPServerService } from '../../services/mcpService';
import { AgentSDKService } from '../../services/agentSDKService';
import { VideoProject, VideoScene } from '../../types/video-project';
import { AgentResponse } from '../../types/agent-sdk';

interface VideoProjectManagerProps {
  mcpService: MCPServerService;
  agentSDK: AgentSDKService;
  projectId?: string;
}

export function VideoProjectManager({ mcpService, agentSDK, projectId }: VideoProjectManagerProps) {
  const {
    project,
    loading,
    error,
    agentAnalysis,
    createProject,
    getProject,
    updateProject,
    addScene,
    generateSceneAssets,
    compileVideo,
    analyzeProject,
    optimizeScenes,
    enhanceScene,
    suggestImprovements
  } = useAgentEnhancedVideoProject({ mcpService, agentSDK });

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      getProject(projectId).catch(console.error);
    }
  }, [projectId, getProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject(projectName, projectDescription);
      setProjectName('');
      setProjectDescription('');
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleAddScene = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[VideoProjectManager] handleAddScene triggered!'); // <-- ADD THIS LINE
    if (!project) return;

    try {
      await addScene(project.id, sceneName, sceneDescription);
      setSceneName('');
      setSceneDescription('');
    } catch (err) {
      console.error('Failed to add scene:', err);
    }
  };

  const handleGenerateAssets = async (sceneId: string) => {
    if (!project) return;

    try {
      await generateSceneAssets(project.id, sceneId);
    } catch (err) {
      console.error('Failed to generate assets:', err);
    }
  };

  const handleCompileVideo = async () => {
    if (!project) return;

    try {
      const videoUrl = await compileVideo(project.id);
      setCompiledVideoUrl(videoUrl);
    } catch (err) {
      console.error('Failed to compile video:', err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {!project ? (
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Project
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
            <p className="text-gray-600">{project.description}</p>
            <div className="mt-2">
              <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                Status: {project.status}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Scenes</h3>
            <form onSubmit={handleAddScene} className="mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Scene Name</label>
                <input
                  type="text"
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Scene
              </button>
            </form>

            <div className="space-y-4">
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => analyzeProject(project.id)}
                  className="px-3 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
                >
                  Analyze Project
                </button>
                <button
                  onClick={() => optimizeScenes(project.id)}
                  className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                >
                  Optimize Scenes
                </button>
              </div>

              {agentAnalysis && (
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">AI Analysis</h4>
                  <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(agentAnalysis.data, null, 2)}</pre>
                </div>
              )}

              {project.scenes.map((scene: VideoScene) => (
                <div key={scene.id} className="border p-4 rounded">
                  <h4 className="font-medium">{scene.name}</h4>
                  <p className="text-sm text-gray-600">{scene.description}</p>
                  <div className="mt-2 space-x-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      Status: {scene.status}
                    </span>
                    {scene.imageUrl && (
                      <span className="px-2 py-1 bg-green-100 rounded text-sm">
                        Has Image
                      </span>
                    )}
                    {scene.videoUrl && (
                      <span className="px-2 py-1 bg-blue-100 rounded text-sm">
                        Has Video
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={() => handleGenerateAssets(scene.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Generate Assets
                    </button>
                    <button
                      onClick={() => enhanceScene(project.id, scene.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Enhance Scene
                    </button>
                    <button
                      onClick={() => suggestImprovements(project.id, scene.id)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                    >
                      Suggest Improvements
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={handleCompileVideo}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              disabled={project.scenes.length === 0}
            >
              Compile Video
            </button>

            {compiledVideoUrl && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Compiled Video</h4>
                <video
                  src={compiledVideoUrl}
                  controls
                  className="w-full max-w-2xl rounded shadow"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
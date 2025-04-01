import React, { useState, useCallback } from 'react';
import { MCPServerService } from '../../services/mcpService';
import { AgentSDKService } from '../../services/agentSDKService';
import { VideoProject, VideoScene } from '../../types/video-project';
import { AgentResponse } from '../../types/agent-sdk';

interface AutomatedSceneCreatorProps {
  mcpService: MCPServerService;
  agentSDK: AgentSDKService;
  projectId: string;
  onSceneCreated?: (scene: VideoScene) => void;
}

export function AutomatedSceneCreator({
  mcpService,
  agentSDK,
  projectId,
  onSceneCreated
}: AutomatedSceneCreatorProps) {
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScene, setGeneratedScene] = useState<VideoScene | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProductImage(e.target.files[0]);
    }
  };

  const handleImagePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setImagePrompt(e.target.value);
  };

  const createSceneAutomatically = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus('Starting automated scene creation...');

    try {
      if (!productImage) {
        throw new Error('Product image is required');
      }

      // Step 1: Upload product image to MCP
      setStatus('Uploading product image...');
      const uploadResult = await mcpService.callTool('upload_product_image', {
        projectId,
        filename: productImage.name,
        // In a real implementation, you would convert the file to base64 or use FormData
        fileData: 'mock-file-data' 
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload product image');
      }

      const imageUrl = uploadResult.data.imageUrl;

      // Step 2: Create a new scene
      setStatus('Creating scene...');
      const createSceneResult = await mcpService.callTool('add_scene', {
        projectId,
        name: `Scene from ${productImage.name}`,
        description: imagePrompt || `Automated scene based on ${productImage.name}`
      });

      if (!createSceneResult.success || !createSceneResult.data.scene) {
        throw new Error(createSceneResult.error || 'Failed to create scene');
      }

      const scene = createSceneResult.data.scene;

      // Step 3: Analyze product image with Agent SDK
      setStatus('Analyzing product image...');
      const imageAnalysisResult = await agentSDK.executeFunction('analyze_product_image', {
        projectId,
        sceneId: scene.id,
        imageUrl
      });

      if (!imageAnalysisResult.success) {
        throw new Error(imageAnalysisResult.error || 'Failed to analyze product image');
      }

      // Step 4: Generate improved image prompt based on analysis
      setStatus('Generating optimized image prompt...');
      const improvedPromptResult = await agentSDK.executeFunction('generate_optimized_prompt', {
        projectId,
        sceneId: scene.id,
        userPrompt: imagePrompt,
        imageAnalysis: imageAnalysisResult.data.analysis
      });

      if (!improvedPromptResult.success) {
        throw new Error(improvedPromptResult.error || 'Failed to generate optimized prompt');
      }

      // Step 5: Generate scene image with the improved prompt
      setStatus('Generating scene image...');
      await mcpService.callTool('generate_scene_image', {
        projectId,
        sceneId: scene.id,
        imagePrompt: improvedPromptResult.data.optimizedPrompt
      });

      // Step 6: Generate scene script
      setStatus('Generating script...');
      await mcpService.callTool('generate_scene_script', {
        projectId,
        sceneId: scene.id
      });

      // Step 7: Generate scene video
      setStatus('Generating video...');
      await mcpService.callTool('generate_scene_video', {
        projectId,
        sceneId: scene.id
      });

      // Step 8: Get updated scene data
      setStatus('Finalizing scene...');
      const getProjectResult = await mcpService.callTool('get_video_project', { projectId });
      
      if (!getProjectResult.success) {
        throw new Error(getProjectResult.error || 'Failed to get updated project data');
      }

      const project = getProjectResult.data.project as VideoProject;
      const updatedScene = project.scenes.find(s => s.id === scene.id);

      if (updatedScene) {
        setGeneratedScene(updatedScene);
        if (onSceneCreated) {
          onSceneCreated(updatedScene);
        }
      }

      setStatus('Scene created successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('Failed to create scene');
    } finally {
      setLoading(false);
    }
  }, [projectId, productImage, imagePrompt, mcpService, agentSDK, onSceneCreated]);

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Automated Scene Creation</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleProductImageChange}
            className="w-full p-2 border rounded"
            disabled={loading}
          />
          {productImage && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">{productImage.name}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Scene Description / Image Prompt</label>
          <textarea
            value={imagePrompt}
            onChange={handleImagePromptChange}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Describe the scene you want to create..."
            disabled={loading}
          />
        </div>

        <button
          onClick={createSceneAutomatically}
          disabled={loading || !productImage}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Scene...' : 'Create Scene Automatically'}
        </button>

        {status && (
          <div className="p-3 bg-blue-50 text-blue-800 rounded">
            <p className="text-sm font-medium">{status}</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded">
            <p className="text-sm font-medium">Error: {error}</p>
          </div>
        )}

        {generatedScene && (
          <div className="p-4 border rounded bg-gray-50">
            <h4 className="font-medium mb-2">Generated Scene: {generatedScene.name}</h4>
            {generatedScene.imageUrl && (
              <div className="mb-3">
                <img 
                  src={generatedScene.imageUrl} 
                  alt="Generated scene" 
                  className="w-full h-auto rounded" 
                />
              </div>
            )}
            <p className="text-sm text-gray-700">{generatedScene.description}</p>
            {generatedScene.videoUrl && (
              <div className="mt-3">
                <h5 className="text-sm font-medium mb-1">Scene Video</h5>
                <video 
                  src={generatedScene.videoUrl} 
                  controls
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
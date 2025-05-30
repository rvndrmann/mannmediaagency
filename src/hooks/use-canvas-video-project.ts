import { useState, useEffect, useCallback } from 'react';
import { MCPServerService } from '../services/mcpService';
import { AgentSDKService } from '../services/agentSDKService';
import { VideoProject, VideoScene } from '../types/video-project';

interface UseCanvasVideoProjectProps {
  mcpService: MCPServerService;
  agentSDK: AgentSDKService;
  projectId?: string;
}

interface CanvasNode {
  id: string;
  type: 'project' | 'scene' | 'asset';
  label: string;
  data: any;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export function useCanvasVideoProject({
  mcpService,
  agentSDK,
  projectId
}: UseCanvasVideoProjectProps) {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [canvasData, setCanvasData] = useState<CanvasData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [canvasVisible, setCanvasVisible] = useState<boolean>(true); // Start with canvas visible
  const [refreshInterval, setRefreshInterval] = useState<number>(1000); // Refresh every 1 second
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if MCP service is connected before proceeding
      if (!mcpService.isConnected()) {
        await mcpService.connect().catch(e => {
          console.error("Failed to connect to MCP service:", e);
          throw new Error("MCP service is disconnected. Please try again.");
        });
      }
      
      const result = await mcpService.callTool('get_video_project', { projectId });
      if (!result.success) {
        throw new Error(result.error || 'Failed to load project');
      }
      
      if (result.data && result.data.project) {
        setProject(result.data.project);
        setLastRefresh(Date.now());
      } else {
        console.warn('Project data is missing or incomplete:', result);
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error loading project:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [mcpService, projectId]);

  // Generate canvas data based on project information
  const generateCanvasData = useCallback(() => {
    if (!project) return;
    
    try {
      const nodes: CanvasNode[] = [];
      const edges: CanvasEdge[] = [];
      
      // Create project node
      const projectNode: CanvasNode = {
        id: `project-${project.id}`,
        type: 'project',
        label: project.name,
        data: project,
        x: 400,
        y: 100,
        width: 200,
        height: 100
      };
      
      nodes.push(projectNode);
      
      // Safely iterate over scenes if they exist
      if (project.scenes && Array.isArray(project.scenes)) {
        project.scenes.forEach((scene, index) => {
          if (!scene) return; // Skip if scene is null or undefined
          
          const sceneNode: CanvasNode = {
            id: `scene-${scene.id}`,
            type: 'scene',
            label: scene.name || `Scene ${index + 1}`,
            data: scene,
            x: 200 + (index * 250),
            y: 300,
            width: 180,
            height: 100
          };
          
          nodes.push(sceneNode);
          
          // Connect scene to project
          edges.push({
            id: `edge-project-scene-${scene.id}`,
            source: projectNode.id,
            target: sceneNode.id,
            label: `Scene ${index + 1}`
          });
          
          // If the scene has assets, create nodes for them
          if (scene.imageUrl) {
            const imageNode: CanvasNode = {
              id: `asset-image-${scene.id}`,
              type: 'asset',
              label: 'Scene Image',
              data: { url: scene.imageUrl, type: 'image' },
              x: sceneNode.x - 100,
              y: 450,
              width: 150,
              height: 80
            };
            
            nodes.push(imageNode);
            
            edges.push({
              id: `edge-scene-image-${scene.id}`,
              source: sceneNode.id,
              target: imageNode.id
            });
          }
          
          if (scene.videoUrl) {
            const videoNode: CanvasNode = {
              id: `asset-video-${scene.id}`,
              type: 'asset',
              label: 'Scene Video',
              data: { url: scene.videoUrl, type: 'video' },
              x: sceneNode.x + 100,
              y: 450,
              width: 150,
              height: 80
            };
            
            nodes.push(videoNode);
            
            edges.push({
              id: `edge-scene-video-${scene.id}`,
              source: sceneNode.id,
              target: videoNode.id
            });
          }
        });
      }
      
      setCanvasData({ nodes, edges });
    } catch (err) {
      console.error('Error generating canvas data:', err);
    }
  }, [project]);

  // Initialize canvas data when project changes
  useEffect(() => {
    if (project) {
      generateCanvasData();
    }
  }, [project, generateCanvasData]);

  // Load project when projectId changes
  useEffect(() => {
    if (projectId) {
      loadProject().catch(err => {
        console.error('Failed to load project on initial effect:', err);
      });
    }
    
    return () => {
      // Clean up on unmount
      setCanvasData({ nodes: [], edges: [] });
      setProject(null);
    };
  }, [projectId, loadProject]);
  
  // Set up interval for refreshing project data
  useEffect(() => {
    if (!projectId || !canvasVisible) return;
    
    const intervalId = setInterval(() => {
      // Only refresh if canvas is visible and the last refresh was more than refreshInterval ms ago
      if (canvasVisible && Date.now() - lastRefresh > refreshInterval) {
        loadProject().catch(err => console.error('Error refreshing project data:', err));
      }
    }, refreshInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [projectId, canvasVisible, refreshInterval, lastRefresh, loadProject]);

  // Optimize canvas layout using Agent SDK
  const optimizeCanvasLayout = useCallback(async () => {
    if (!project || !canvasData) return;
    
    setLoading(true);
    
    try {
      const result = await agentSDK.executeFunction('optimize_canvas_layout', {
        projectId: project.id,
        currentLayout: canvasData
      });
      
      if (result.success && result.data.optimizedLayout) {
        setCanvasData(result.data.optimizedLayout);
      }
    } catch (err) {
      console.error('Failed to optimize canvas layout:', err);
    } finally {
      setLoading(false);
    }
  }, [agentSDK, project, canvasData]);

  // Reset canvas to default layout
  const resetCanvasLayout = useCallback(() => {
    if (project) {
      generateCanvasData();
    }
  }, [project, generateCanvasData]);

  // Toggle canvas visibility
  const toggleCanvasVisibility = useCallback(() => {
    setCanvasVisible(prev => !prev);
  }, []);

  return {
    project,
    canvasData,
    loading,
    error,
    canvasVisible,
    loadProject,
    optimizeCanvasLayout,
    resetCanvasLayout,
    toggleCanvasVisibility
  };
}
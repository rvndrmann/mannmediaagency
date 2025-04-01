import React, { useEffect, useState } from 'react';
import { useCanvasVideoProject } from '../../hooks/use-canvas-video-project';
import { MCPServerService } from '../../services/mcpService';
import { AgentSDKService } from '../../services/agentSDKService';

interface VideoProjectCanvasProps {
  mcpService: MCPServerService;
  agentSDK: AgentSDKService;
  projectId: string;
}

export function VideoProjectCanvas({
  mcpService,
  agentSDK,
  projectId
}: VideoProjectCanvasProps) {
  const {
    project,
    canvasData,
    loading,
    error,
    canvasVisible,
    optimizeCanvasLayout,
    resetCanvasLayout,
    toggleCanvasVisibility
  } = useCanvasVideoProject({
    mcpService,
    agentSDK,
    projectId
  });

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - canvasPosition.x, y: e.clientY - canvasPosition.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCanvasPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => {
    setCanvasScale(prev => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setCanvasScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const resetZoom = () => {
    setCanvasScale(1);
    setCanvasPosition({ x: 0, y: 0 });
  };

  const getNodeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'project':
        return 'bg-blue-100 border-blue-500';
      case 'scene':
        return 'bg-green-100 border-green-500';
      case 'asset':
        return 'bg-purple-100 border-purple-500';
      default:
        return 'bg-gray-100 border-gray-500';
    }
  };

  const renderNode = (node: any) => {
    const isSelected = selectedNode === node.id;
    const nodeColor = getNodeColor(node.type);
    
    return (
      <div
        key={node.id}
        className={`absolute p-3 border-2 rounded shadow ${nodeColor} ${isSelected ? 'ring-2 ring-offset-2 ring-blue-600' : ''}`}
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          transform: `scale(${canvasScale})`,
          transformOrigin: 'top left',
          cursor: 'pointer'
        }}
        onClick={() => handleNodeClick(node.id)}
      >
        <div className="text-sm font-medium mb-1">{node.label}</div>
        {node.type === 'project' && (
          <div className="text-xs">Status: {node.data?.status || 'unknown'}</div>
        )}
        {node.type === 'scene' && (
          <div className="text-xs">Status: {node.data?.status || 'unknown'}</div>
        )}
        {node.type === 'asset' && node.data?.type === 'image' && (
          <div className="w-full h-10 bg-gray-200 flex items-center justify-center overflow-hidden rounded">
            <img 
              src={node.data?.url || 'https://via.placeholder.com/150?text=Preview'} 
              alt="Scene thumbnail" 
              className="w-full h-full object-cover"
              onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Preview'} 
            />
          </div>
        )}
        {node.type === 'asset' && node.data?.type === 'video' && (
          <div className="w-full h-10 bg-gray-800 flex items-center justify-center text-white text-xs rounded">
            <span>Video Asset</span>
          </div>
        )}
      </div>
    );
  };

  const renderEdge = (edge: any) => {
    const sourceNode = canvasData?.nodes?.find(n => n.id === edge.source);
    const targetNode = canvasData?.nodes?.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;
    
    // Calculate edge coordinates
    const startX = sourceNode.x + (sourceNode.width / 2);
    const startY = sourceNode.y + sourceNode.height;
    const endX = targetNode.x + (targetNode.width / 2);
    const endY = targetNode.y;
    
    // Calculate control points for a curved line
    const midY = (startY + endY) / 2;
    
    const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    
    return (
      <g key={edge.id}>
        <path 
          d={pathD} 
          stroke="#9CA3AF" 
          strokeWidth="2" 
          fill="none" 
          markerEnd="url(#arrowhead)" 
        />
        {edge.label && (
          <text 
            x={(startX + endX) / 2} 
            y={midY - 10} 
            textAnchor="middle" 
            className="text-xs"
            fill="#4B5563"
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  };

  if (!canvasVisible) {
    return (
      <div className="p-4">
        <button
          onClick={toggleCanvasVisibility}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          Show Project Canvas
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">Loading canvas data...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  if (!project) {
    return <div className="p-4">No project data available for canvas</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Project Canvas</h3>
        <div className="flex space-x-2">
          <button
            onClick={zoomIn}
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={zoomOut}
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={optimizeCanvasLayout}
            className="p-1.5 bg-indigo-100 rounded hover:bg-indigo-200 text-indigo-800"
            title="Optimize Layout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={toggleCanvasVisibility}
            className="p-1.5 bg-red-100 rounded hover:bg-red-200 text-red-800"
            title="Close Canvas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="border rounded bg-gray-50 overflow-hidden relative" style={{ height: '600px' }}>
        {/* Canvas container */}
        <div
          className="absolute w-full h-full"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          {/* SVG layer for edges */}
          <svg
            className="absolute w-full h-full"
            style={{
              transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasScale})`,
              transformOrigin: 'top left'
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
              </marker>
            </defs>
            {canvasData?.edges?.map(renderEdge) || null}
          </svg>

          {/* Node layer */}
          <div
            className="absolute w-full h-full"
            style={{
              transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px)`,
            }}
          >
            {canvasData?.nodes?.map(renderNode) || null}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded-sm mr-1"></div>
            <span>Project</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 border border-green-500 rounded-sm mr-1"></div>
            <span>Scene</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-100 border border-purple-500 rounded-sm mr-1"></div>
            <span>Asset</span>
          </div>
        </div>
      </div>
    </div>
  );
}
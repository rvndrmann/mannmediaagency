
# Model Context Protocol (MCP) Integration for Canvas

This document explains how the Model Context Protocol (MCP) is integrated with the Canvas multi-agent system to enable AI-assisted content creation and editing.

## Overview

MCP provides a standardized way for AI models to interact with tools and data sources. In our Canvas app, we've implemented MCP to allow the AI agents to:

1. Generate and update scene descriptions
2. Create and refine image prompts 
3. Generate scene images using ProductShot v1/v2
4. Convert scene images to videos

## Components

### 1. MCP Service

The `MCPServerService` in `src/services/mcpService.ts` provides a client interface to interact with MCP servers. It handles:

- Connection management
- Tool discovery and caching
- Tool execution

### 2. Canvas Agent Hook

The `useCanvasAgent` hook in `src/hooks/use-canvas-agent.ts` has been enhanced to:

- Connect to MCP servers
- Toggle between MCP and legacy modes
- Process agent requests using MCP tools

### 3. Scene Editor UI

The Scene Editor component has been updated with:

- MCP toggle switch 
- Buttons for generating scene images and videos
- Status indicators for ongoing processes

### 4. Edge Function

A Supabase Edge Function (`mcp-server/index.ts`) implements an MCP server that:

- Exposes tools for Canvas operations
- Processes tool calls and updates the database
- Interfaces with AI services

## Usage

To use the MCP integration:

1. Enable MCP using the toggle switch in the Scene Editor
2. Use the AI generation buttons to create content
3. The system will automatically use MCP to process the requests

## Implementation Details

### Tool Definitions

The MCP server exposes these tools:

- `update_scene_description`: Analyzes images and scripts to create detailed scene descriptions
- `update_image_prompt`: Generates optimized prompts for image generation
- `generate_scene_image`: Creates images using ProductShot v1/v2
- `create_scene_video`: Converts images to videos with specified aspect ratios

### Error Handling

The implementation includes comprehensive error handling:

- Connection failures
- Tool execution errors
- Database update errors

Error messages are propagated to the UI via toast notifications.

## Future Enhancements

Potential future improvements include:

1. Real-time collaboration using MCP events
2. More sophisticated image analysis
3. Expanded tool set for audio processing and editing
4. Plugin system for custom MCP tools

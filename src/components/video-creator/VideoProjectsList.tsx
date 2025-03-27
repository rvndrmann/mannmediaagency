
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoProject } from "@/services/json2videoService";
import { Play, ExternalLink, RefreshCw } from "lucide-react";

interface VideoProjectsListProps {
  projects: VideoProject[];
  isLoading: boolean;
  onRefreshStatus: (projectId: string) => Promise<void>;
}

export function VideoProjectsList({ 
  projects, 
  isLoading,
  onRefreshStatus 
}: VideoProjectsListProps) {
  const [refreshingProjects, setRefreshingProjects] = useState<Record<string, boolean>>({});
  
  const handleRefresh = async (projectId: string) => {
    setRefreshingProjects(prev => ({ ...prev, [projectId]: true }));
    await onRefreshStatus(projectId);
    setRefreshingProjects(prev => ({ ...prev, [projectId]: false }));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'rendering':
        return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'done':
        return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed':
        return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-full max-w-[250px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Videos Yet</CardTitle>
          <CardDescription>
            Create your first video to see it here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((project) => (
        <Card key={project.projectId}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Project: {project.projectId}</CardTitle>
                <CardDescription>
                  Created: {formatDate(project.createdAt)}
                </CardDescription>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.thumbnailUrl && (
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                  <img 
                    src={project.thumbnailUrl} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={refreshingProjects[project.projectId] || project.status.toLowerCase() === 'done'}
                  onClick={() => handleRefresh(project.projectId)}
                >
                  {refreshingProjects[project.projectId] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh Status
                </Button>
                
                {project.url && (
                  <Button
                    size="sm"
                    onClick={() => window.open(project.url, '_blank')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Watch Video
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

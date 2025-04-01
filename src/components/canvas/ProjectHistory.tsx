
import React, { useState, useEffect } from 'react';
import { CanvasProject } from "@/types/canvas";
import { CanvasService } from "@/services/canvas/CanvasService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton";

const canvasService = CanvasService.getInstance();

export const ProjectHistory = () => {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const projects = await canvasService.fetchProjects();
        setProjects(projects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectClick = (projectId: string) => {
    navigate(`/canvas/${projectId}`);
  };

  const handleNewProjectClick = () => {
    navigate('/canvas/new');
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Canvas Projects</h1>
        <Button onClick={handleNewProjectClick}>Create New Project</Button>
      </div>
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle><Skeleton className="h-5 w-3/4" /></CardTitle>
                <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={() => handleProjectClick(project.id)}>
              <CardHeader>
                <CardTitle>{project.title}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} alt={project.title} className="w-full h-32 object-cover rounded-md" />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                    No Cover Image
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-sm text-gray-500">
                Created: {new Date(project.createdAt || project.created_at).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No projects found. Create a new project to get started!</p>
        </div>
      )}
    </div>
  );
};

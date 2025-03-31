
import React from 'react';
import { WorkflowStatus } from '../workflow/WorkflowStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Film, Play, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CanvasProject } from '@/types/canvas';

interface WorkflowPanelProps {
  project: CanvasProject;
  userId: string;
  onWorkflowComplete?: () => void;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ 
  project, 
  userId,
  onWorkflowComplete 
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Film className="mr-2 h-5 w-5" />
          Video Creation Workflow
        </CardTitle>
        <CardDescription>
          Automated multi-agent workflow to create a complete video
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="workflow">
          <TabsList className="mb-4">
            <TabsTrigger value="workflow">Workflow Status</TabsTrigger>
            <TabsTrigger value="info">How It Works</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workflow">
            <WorkflowStatus 
              projectId={project.id}
              userId={userId}
              onComplete={onWorkflowComplete}
            />
          </TabsContent>
          
          <TabsContent value="info">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Multi-Agent Video Creation</h3>
                <p className="text-sm text-muted-foreground">
                  This workflow uses multiple AI agents to automate the entire video creation process,
                  from script writing to final video assembly.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Script Generation & Scene Splitting</h4>
                    <p className="text-sm text-muted-foreground">
                      AI writes a complete script and divides it into logical scenes with voice-over text.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Image Generation</h4>
                    <p className="text-sm text-muted-foreground">
                      For each scene, AI creates custom images using ProductShot technology.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Scene Description & Video Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      AI generates descriptive text for each scene and creates short videos.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Final Video Assembly</h4>
                    <p className="text-sm text-muted-foreground">
                      All scene videos are compiled into a final video with transitions.
                    </p>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Credits Usage</AlertTitle>
                <AlertDescription>
                  This workflow uses credits for image and video generation.
                  Make sure you have enough credits before starting.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end">
                <Button className="mt-2" onClick={() => document.querySelector('[value="workflow"]')?.dispatchEvent(new Event('click'))}>
                  <Play className="h-4 w-4 mr-2" />
                  Go to Workflow
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

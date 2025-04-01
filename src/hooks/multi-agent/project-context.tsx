
import React, { createContext, useContext, useState } from "react";

interface ProjectContextType {
  activeProject: string | null;
  setActiveProject: (projectId: string | null) => void;
  activeScene: string | null;
  setActiveScene: (sceneId: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  activeProject: null,
  setActiveProject: () => {},
  activeScene: null,
  setActiveScene: () => {}
});

export const useProjectContext = () => useContext(ProjectContext);

export const ProjectContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  
  return (
    <ProjectContext.Provider value={{
      activeProject,
      setActiveProject,
      activeScene,
      setActiveScene
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

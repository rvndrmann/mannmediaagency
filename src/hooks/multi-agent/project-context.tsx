import React, { createContext, useContext, ReactNode } from "react";
import { useProjectContext } from "./project-context";

// Create a context type for the project context
type ProjectContextType = ReturnType<typeof useProjectContext>;

// Create the context with a default value
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Create the provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const projectContext = useProjectContext();
  
  return (
    <ProjectContext.Provider value={projectContext}>
      {children}
    </ProjectContext.Provider>
  );
};

// Export the hook for using the context
export const useProjectContextConsumer = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContextConsumer must be used within a ProjectProvider");
  }
  return context;
};

// Keep the original useProjectContext implementation
export { useProjectContext } from './project-context';

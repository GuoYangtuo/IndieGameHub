import React, { createContext, useContext, useState } from 'react';

interface ProjectTitleContextType {
  projectTitle: string | null;
  projectSlug: string | null;
  demoLink: string | null;
  setProjectTitle: (title: string | null) => void;
  setProjectSlug: (slug: string | null) => void;
  setDemoLink: (link: string | null) => void;
}

const ProjectTitleContext = createContext<ProjectTitleContextType>({
  projectTitle: null,
  projectSlug: null,
  demoLink: null,
  setProjectTitle: () => {},
  setProjectSlug: () => {},
  setDemoLink: () => {}
});

export const useProjectTitle = () => useContext(ProjectTitleContext);

export const ProjectTitleProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  return (
    <ProjectTitleContext.Provider 
      value={{ 
        projectTitle, 
        projectSlug,
        demoLink, 
        setProjectTitle, 
        setProjectSlug,
        setDemoLink 
      }}
    >
      {children}
    </ProjectTitleContext.Provider>
  );
}; 
import React, { createContext, useContext, useState, useCallback } from 'react';

// 项目详情页共享给 Navbar 的项目数据
interface SharedProjectData {
  id: string;
  createdBy: string;
  members: string[];
  isFavorite: boolean;
  userContribution: number | null;
}

interface ProjectTitleContextType {
  projectTitle: string | null;
  projectSlug: string | null;
  demoLink: string | null;
  sharedProjectData: SharedProjectData | null;
  setProjectTitle: (title: string | null) => void;
  setProjectSlug: (slug: string | null) => void;
  setDemoLink: (link: string | null) => void;
  setSharedProjectData: (data: SharedProjectData | null) => void;
  updateFavoriteStatus: (isFavorite: boolean) => void;
}

const ProjectTitleContext = createContext<ProjectTitleContextType>({
  projectTitle: null,
  projectSlug: null,
  demoLink: null,
  sharedProjectData: null,
  setProjectTitle: () => {},
  setProjectSlug: () => {},
  setDemoLink: () => {},
  setSharedProjectData: () => {},
  updateFavoriteStatus: () => {}
});

export const useProjectTitle = () => useContext(ProjectTitleContext);

export const ProjectTitleProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const [sharedProjectData, setSharedProjectData] = useState<SharedProjectData | null>(null);

  const updateFavoriteStatus = useCallback((isFavorite: boolean) => {
    setSharedProjectData(prev => prev ? { ...prev, isFavorite } : null);
  }, []);

  return (
    <ProjectTitleContext.Provider 
      value={{ 
        projectTitle, 
        projectSlug,
        demoLink, 
        sharedProjectData,
        setProjectTitle, 
        setProjectSlug,
        setDemoLink,
        setSharedProjectData,
        updateFavoriteStatus
      }}
    >
      {children}
    </ProjectTitleContext.Provider>
  );
}; 
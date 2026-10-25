import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Citation, UserProfile, Workspace } from '../types';
import { INITIAL_USER, INITIAL_WORKSPACES } from '../api/mockData';

export type AppView = 'signup' | 'login' | 'setup' | 'workspace' | 'chat' | 'materials' | 'settings' | 'profile';

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  setCurrentWorkspace: (ws: Workspace) => void;
  
  // Right drawer for citations / document context
  isDocDrawerOpen: boolean;
  setIsDocDrawerOpen: (open: boolean) => void;
  selectedCitation: Citation | null;
  setSelectedCitation: (citation: Citation | null) => void;
  
  // Left sidebar collapse state
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;

  // Modals
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isErrorModalOpen: boolean;
  setIsErrorModalOpen: (open: boolean) => void;
  errorInfo: { title: string; message: string; details?: string };
  showError: (title: string, message: string, details?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('signup');
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [workspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(INITIAL_WORKSPACES[0]);

  const [isDocDrawerOpen, setIsDocDrawerOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; details?: string }>({
    title: 'Authentication Error',
    message: 'Primary API key rate limit exceeded or quota exhausted.',
    details: 'Provider response: HTTP 429 Too Many Requests (Rate limit reached for model gpt-4o). Automatic fallback engaged.',
  });

  const showError = (title: string, message: string, details?: string) => {
    setErrorInfo({ title, message, details });
    setIsErrorModalOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        user,
        setUser,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        isDocDrawerOpen,
        setIsDocDrawerOpen,
        selectedCitation,
        setSelectedCitation,
        isSidebarOpen,
        setIsSidebarOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isErrorModalOpen,
        setIsErrorModalOpen,
        errorInfo,
        showError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

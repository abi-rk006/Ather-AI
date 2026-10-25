import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ChatProvider } from './context/ChatContext';
import { MaterialsProvider } from './context/MaterialsContext';
import { SettingsProvider } from './context/SettingsContext';

import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ErrorModal } from './components/common/ErrorModal';
import { AddSubjectModal } from './components/common/AddSubjectModal';

import { SignUpView } from './components/auth/SignUpView';
import { SetupProfileWizard } from './components/auth/SetupProfileWizard';
import { LoginView } from './components/auth/LoginView';

import { ChatInterface } from './components/chat/ChatInterface';
import { MaterialsList } from './components/materials/MaterialsList';
import { SettingsView } from './components/settings/SettingsView';
import { ProfileView } from './components/profile/ProfileView';

const MainLayout: React.FC = () => {
  const { currentView } = useApp();

  const isAuthView =
    currentView === 'signup' ||
    currentView === 'login' ||
    currentView === 'setup';

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col antialiased selection:bg-primary-container selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Body */}
      <div className="flex-1 flex pt-16">
        {/* Sidebar (hidden on onboarding and auth flows) */}
        {!isAuthView && <Sidebar />}

        {/* Dynamic Main View */}
        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          {currentView === 'signup' && <SignUpView />}
          {currentView === 'login' && <LoginView />}
          {currentView === 'setup' && <SetupProfileWizard />}
          {currentView === 'workspace' && <ChatInterface />}
          {currentView === 'chat' && <ChatInterface />}
          {currentView === 'materials' && <MaterialsList />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Global Modals */}
      <ErrorModal />
      <AddSubjectModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <SettingsProvider>
        <MaterialsProvider>
          <ChatProvider>
            <MainLayout />
          </ChatProvider>
        </MaterialsProvider>
      </SettingsProvider>
    </AppProvider>
  );
}

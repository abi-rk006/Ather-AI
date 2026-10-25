import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import { INITIAL_SETTINGS } from '../api/mockData';
import { apiClient } from '../api/client';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  testConnection: (key: string, provider: string) => Promise<{ success: boolean; latencyMs: number }>;
  isSaved: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    apiClient.getSettings().then((s) => setSettings(s));
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    setIsSaved(false);
  };

  const saveSettings = async () => {
    await apiClient.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const resetSettings = () => {
    setSettings(INITIAL_SETTINGS);
    apiClient.saveSettings(INITIAL_SETTINGS);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const testConnection = async (key: string, provider: string) => {
    return await apiClient.verifyApiKey(key, provider);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        saveSettings,
        resetSettings,
        testConnection,
        isSaved,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

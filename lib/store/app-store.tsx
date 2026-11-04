
'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type AppStore = {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

const AppStoreContext = createContext<AppStore | null>(null);

export const useAppStore = () => {
  const context = useContext(AppStoreContext);

  if (!context) {
    return {
      theme: 'light' as const,
      setTheme: (_theme: 'light' | 'dark' | 'system') => {},
      sidebarOpen: true,
      toggleSidebar: () => {},
    };
  }

  return context;
};

export const AppStoreProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen((previous) => !previous);
  };

  return (
    <AppStoreContext.Provider
      value={{ theme, setTheme, sidebarOpen, toggleSidebar }}
    >
      {children}
    </AppStoreContext.Provider>
  );
};

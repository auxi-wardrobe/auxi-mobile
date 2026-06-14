import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// Global open-state for the app-level push-drawer (RootDrawer). Replaces the
// per-screen `isSidebarOpen` useState + per-screen <Sidebar> overlay mounts, so
// the menu lives at a single root host (Z-Index rule §4.1 / docs/Z_INDEX_LAYERING.md).
type SidebarContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );
  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => useContext(SidebarContext);

"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type RightPanelContent = {
  type: "bulk-shipping" | null;
  props?: Record<string, unknown>;
};

type RightPanelContextType = {
  isOpen: boolean;
  content: RightPanelContent;
  openPanel: (content: RightPanelContent) => void;
  closePanel: () => void;
};

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<RightPanelContent>({ type: null });

  const openPanel = useCallback((newContent: RightPanelContent) => {
    setContent(newContent);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setContent({ type: null });
  }, []);

  return (
    <RightPanelContext.Provider value={{ isOpen, content, openPanel, closePanel }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel(): RightPanelContextType {
  const context = useContext(RightPanelContext);
  if (context === undefined) {
    throw new Error("useRightPanel must be used within a RightPanelProvider");
  }
  return context;
}

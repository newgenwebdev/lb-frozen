"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/Card";

type MenuAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
};

type StatCardProps = {
  title: string;
  value?: string | number;
  isEmpty?: boolean;
  menuActions?: MenuAction[];
  children?: React.ReactNode;
  className?: string;
};

export function StatCard({
  title,
  value,
  isEmpty = false,
  menuActions,
  children,
  className = "",
}: StatCardProps): React.JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.right - 160,
    });
    setIsMenuOpen(!isMenuOpen);
  };

  const handleActionClick = (action: MenuAction): void => {
    action.onClick();
    setIsMenuOpen(false);
  };

  return (
    <Card
      className={className}
      title={title}
      titleClassName="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]"
      action={
        menuActions && menuActions.length > 0 ? (
          <button
            ref={buttonRef}
            onClick={handleMenuClick}
            className="cursor-pointer text-[#030712] transition-colors hover:text-[#6A7282]"
            aria-label="Menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12.3388 8.00339C12.3388 8.18757 12.1895 8.33687 12.0053 8.33687C11.8212 8.33687 11.6719 8.18757 11.6719 8.00339C11.6719 7.81922 11.8212 7.66992 12.0053 7.66992C12.1895 7.66992 12.3388 7.81922 12.3388 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.33687 8.00339C8.33687 8.18757 8.18757 8.33687 8.00339 8.33687C7.81922 8.33687 7.66992 8.18757 7.66992 8.00339C7.66992 7.81922 7.81922 7.66992 8.00339 7.66992C8.18757 7.66992 8.33687 7.81922 8.33687 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.33491 8.00339C4.33491 8.18757 4.18561 8.33687 4.00144 8.33687C3.81727 8.33687 3.66797 8.18757 3.66797 8.00339C3.66797 7.81922 3.81727 7.66992 4.00144 7.66992C4.18561 7.66992 4.33491 7.81922 4.33491 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : undefined
      }
    >
      {/* Dropdown Menu Portal */}
      {isMenuOpen && menuPosition && menuActions && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-[160px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            role="menu"
          >
            {menuActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
                role="menuitem"
              >
                {action.icon && <span className="text-[#6A7282]">{action.icon}</span>}
                <span className="font-public text-[13px] text-[#030712]">{action.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}

      {isEmpty ? (
        <div className="flex h-[100px] items-center justify-center text-[#E5E5E5]">
          No data
        </div>
      ) : (
        <>
          {value && <p className="mb-2 font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">{value}</p>}
          {children}
        </>
      )}
    </Card>
  );
}

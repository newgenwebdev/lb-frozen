import React from "react";

type SidebarMenuItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isCollapsed?: boolean;
  title?: string;
};

export function SidebarMenuItem({
  href,
  label,
  icon,
  isActive = false,
  isCollapsed = false,
  title,
}: SidebarMenuItemProps): React.JSX.Element {
  const baseClasses = "font-public flex items-center gap-3 px-3 py-2 rounded-lg border text-[14px] font-medium tracking-[-0.14px] transition-all";

  const activeClasses = isActive
    ? "border-[#D9D9D9] bg-[#FBFBFB] text-[#2F2F2F] shadow-[0_1px_1.5px_0_rgba(44,54,53,0.03)]"
    : "border-transparent text-[#6A7282] hover:border-[#D9D9D9] hover:bg-[#FBFBFB]";

  const layoutClasses = isCollapsed ? "justify-center" : "";

  return (
    <a
      href={href}
      className={`${baseClasses} ${activeClasses} ${layoutClasses}`}
      title={title || label}
    >
      <div className="shrink-0">{icon}</div>
      {!isCollapsed && label}
    </a>
  );
}

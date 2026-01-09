import React from "react";
import { SearchInput, Button } from "@/components/ui";

type MembersToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalMembers: number;
  onAddClick?: () => void;
};

export function MembersToolbar({
  searchQuery,
  onSearchChange,
  totalMembers,
  onAddClick,
}: MembersToolbarProps): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Page Title */}
      <div>
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Members
        </h1>
        <p className="mt-1 font-public text-[14px] text-[#6A7282]">
          {totalMembers} {totalMembers === 1 ? "member" : "members"} total
        </p>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={onSearchChange}
        />
        {onAddClick && (
          <Button variant="primary" onClick={onAddClick}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="mr-2"
            >
              <path
                d="M8 3.5V12.5M3.5 8H12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add Member
          </Button>
        )}
      </div>
    </div>
  );
}

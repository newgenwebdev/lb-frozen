"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MembersTable,
  MembersToolbar,
  MembershipPromoPagination,
} from "@/components/admin/membership";
import { useMembers } from "@/lib/api/queries";

const MEMBERS_PER_PAGE = 10;

export default function MembershipPage(): React.JSX.Element {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(MEMBERS_PER_PAGE);

  // Debounced search - only search after user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input with useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search change
  const handleSearchChange = useCallback((value: string): void => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * itemsPerPage;

  // Fetch members from API
  const { data: membersData, isLoading } = useMembers({
    search: debouncedSearch || undefined,
    limit: itemsPerPage,
    offset,
  });

  // Calculate pagination
  const totalMembers = membersData?.count || 0;
  const totalPages = Math.ceil(totalMembers / itemsPerPage);
  const members = membersData?.members || [];

  // Handle page change
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Handle add member click
  const handleAddMember = (): void => {
    router.push("/admin/membership/members/add");
  };

  return (
    <div className="px-4 md:px-8">
      {/* Toolbar with search */}
      <MembersToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalMembers={totalMembers}
        onAddClick={handleAddMember}
      />

      {/* Members Table */}
      <MembersTable members={members} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 0 && (
        <MembershipPromoPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}

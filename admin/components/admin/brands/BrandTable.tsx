"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import type { Brand } from "@/lib/validators/brand"

export type SortField = "id" | "name" | "handle" | "status"
export type SortDirection = "asc" | "desc"

type BrandTableProps = {
  brands: Brand[]
  isLoading: boolean
  currentPage: number
  totalPages: number
  totalBrands: number
  brandsPerPage: number
  sortField: SortField | null
  sortDirection: SortDirection
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onSort: (field: SortField, direction: SortDirection) => void
  onEdit: (brand: Brand) => void
  onDelete: (brand: Brand) => void
}

const perPageOptions = [10, 20, 50, 100]

export function BrandTable({
  brands,
  isLoading,
  currentPage,
  totalPages,
  totalBrands,
  brandsPerPage,
  sortField,
  sortDirection,
  onPageChange,
  onPerPageChange,
  onSort,
  onEdit,
  onDelete,
}: BrandTableProps): React.JSX.Element {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null)
  const [isPerPageOpen, setIsPerPageOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const perPageRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
        setMenuPosition(null)
      }
      if (
        perPageRef.current &&
        !perPageRef.current.contains(event.target as Node)
      ) {
        setIsPerPageOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      const newDirection = sortDirection === "asc" ? "desc" : "asc"
      onSort(field, newDirection)
    } else {
      onSort(field, "asc")
    }
  }

  const getSortIcon = (field: SortField): React.JSX.Element => {
    const isActive = sortField === field
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`transition-transform ${isActive ? "text-[#030712]" : ""} ${isActive && sortDirection === "desc" ? "rotate-180" : ""}`}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // Display brand ID - show shortened version for long UUIDs
  const getBrandDisplayId = (id: string): string => {
    if (id.length > 12) {
      return id.slice(-8).toUpperCase()
    }
    return id
  }

  // Generate page numbers for pagination
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("..")
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("..")
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E8E8E9] bg-white">
        {/* Loading skeleton for table */}
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="grid grid-cols-5 gap-4 border-b border-[#E8E8E9] p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-gray-200"></div>
            ))}
          </div>
          {/* Row skeletons */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4 border-b border-[#E8E8E9] p-4 last:border-b-0"
            >
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-4 rounded bg-gray-100"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (brands.length === 0) {
    return (
      <div className="rounded-xl border border-[#E8E8E9] bg-white p-12 text-center">
        <p className="font-public text-[16px] text-[#6A7282]">
          No brands found
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E8E8E9] bg-white">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E9] bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <div
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                  onClick={() => handleSort("id")}
                >
                  <span>Brand ID</span>
                  {getSortIcon("id")}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <span>Logo</span>
              </th>
              <th className="px-4 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <div
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                  onClick={() => handleSort("name")}
                >
                  <span>Name</span>
                  {getSortIcon("name")}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <div
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                  onClick={() => handleSort("handle")}
                >
                  <span>Handle</span>
                  {getSortIcon("handle")}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <div
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                  onClick={() => handleSort("status")}
                >
                  <span>Status</span>
                  {getSortIcon("status")}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => {
              const isActive = brand.is_active !== false

              return (
                <tr
                  key={brand.id}
                  className="border-b border-[#E8E8E9] transition-colors last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-4">
                    <span className="font-public text-[14px] font-normal text-[#030712]">
                      {getBrandDisplayId(brand.id)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-[10px] text-gray-400">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-public text-[14px] font-normal text-[#030712]">
                      {brand.name}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-public text-[14px] font-normal text-[#6A7282]">
                      {brand.handle}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-[#22C55E]" : "bg-[#F59E0B]"}`}
                      ></span>
                      <span className="font-public text-[14px] font-normal text-[#030712]">
                        {isActive ? "Active" : "Non Active"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={(e) => {
                        if (openMenuId === brand.id) {
                          setOpenMenuId(null)
                          setMenuPosition(null)
                        } else {
                          const buttonRect = e.currentTarget.getBoundingClientRect()
                          const viewportHeight = window.innerHeight
                          const openUp = buttonRect.bottom > viewportHeight - 200
                          setMenuPosition({
                            top: openUp ? buttonRect.top : buttonRect.bottom + 4,
                            left: buttonRect.right - 140, // 140px is menu width
                            openUp,
                          })
                          setOpenMenuId(brand.id)
                        }
                      }}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="13" r="1.5" fill="currentColor" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-[#E8E8E9] px-4 py-4 sm:flex-row">
        {/* Page info */}
        <div className="font-public text-[14px] text-[#6A7282]">
          Page of {currentPage} of {totalPages}
        </div>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Page numbers */}
          {getPageNumbers().map((page, index) =>
            typeof page === "string" ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 w-9 items-center justify-center font-public text-[14px] text-[#6A7282]"
              >
                {page}
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg font-public text-[14px] font-medium transition-colors ${
                  currentPage === page
                    ? "border border-[#030712] bg-white text-[#030712]"
                    : "text-[#6A7282] hover:bg-[#F3F4F6]"
                }`}
              >
                {page}
              </button>
            )
          )}

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Per page selector */}
        <div className="relative" ref={perPageRef}>
          <button
            onClick={() => setIsPerPageOpen(!isPerPageOpen)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-public text-[14px] text-[#030712] transition-colors hover:bg-[#F3F4F6]"
          >
            {brandsPerPage} data per row
            <svg
              className={`h-4 w-4 transition-transform ${isPerPageOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isPerPageOpen && (
            <div className="absolute bottom-full right-0 mb-1 w-[140px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
              {perPageOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onPerPageChange(option)
                    setIsPerPageOpen(false)
                  }}
                  className={`w-full cursor-pointer px-4 py-2 text-left font-public text-[14px] transition-colors hover:bg-[#F3F4F6] ${
                    brandsPerPage === option
                      ? "bg-[#F3F4F6] text-[#030712]"
                      : "text-[#6A7282]"
                  }`}
                >
                  {option} data per row
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portal-rendered dropdown menu - floats outside table */}
      {openMenuId && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed w-[140px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg z-[9999]"
          style={{
            top: menuPosition.openUp ? "auto" : menuPosition.top,
            bottom: menuPosition.openUp ? `${window.innerHeight - menuPosition.top + 4}px` : "auto",
            left: menuPosition.left,
          }}
        >
          <button
            onClick={() => {
              const brand = brands.find(b => b.id === openMenuId)
              if (brand) {
                onEdit(brand)
              }
              setOpenMenuId(null)
              setMenuPosition(null)
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#030712] transition-colors hover:bg-[#F3F4F6]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.915 1.44775 13.1602 1.49653 13.389 1.59129C13.6178 1.68605 13.8256 1.82494 14.0007 2.00004C14.1757 2.17513 14.3146 2.383 14.4094 2.61178C14.5041 2.84055 14.5529 3.08575 14.5529 3.33337C14.5529 3.58099 14.5041 3.82619 14.4094 4.05497C14.3146 4.28374 14.1757 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Edit
          </button>
          <button
            onClick={() => {
              const brand = brands.find(b => b.id === openMenuId)
              if (brand) {
                onDelete(brand)
              }
              setOpenMenuId(null)
              setMenuPosition(null)
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 4H14"
                stroke="#EF4444"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.6673 4V13.3333C12.6673 14 12.0007 14.6667 11.334 14.6667H4.66732C4.00065 14.6667 3.33398 14 3.33398 13.3333V4"
                stroke="#EF4444"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.33398 4.00004V2.66671C5.33398 2.00004 6.00065 1.33337 6.66732 1.33337H9.33398C10.0007 1.33337 10.6673 2.00004 10.6673 2.66671V4.00004"
                stroke="#EF4444"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.66602 7.33337V11.3334"
                stroke="#EF4444"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.33398 7.33337V11.3334"
                stroke="#EF4444"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

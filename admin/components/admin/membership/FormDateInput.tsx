"use client";

import React, { useState, useRef, useEffect } from "react";

type FormDateInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FormDateInput({
  label,
  value,
  onChange,
  error,
  placeholder = "Select date",
  className = "",
}: FormDateInputProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize currentMonth from value
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        setCurrentMonth(new Date(year, month, 1));
      }
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format date for display (DD/MM/YYYY) - parse string directly to avoid timezone issues
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return "";
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  };

  // Get days in month
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Navigate months
  const goToPrevMonth = (): void => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = (): void => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // Format date as YYYY-MM-DD without timezone conversion
  const formatDateToISO = (
    year: number,
    month: number,
    day: number
  ): string => {
    const y = String(year);
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Select date
  const handleSelectDate = (day: number): void => {
    const isoDate = formatDateToISO(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(isoDate);
    setIsOpen(false);
  };

  // Parse date string (YYYY-MM-DD) without timezone conversion
  const parseDateString = (
    dateString: string
  ): { year: number; month: number; day: number } | null => {
    if (!dateString) return null;
    const parts = dateString.split("-");
    if (parts.length !== 3) return null;
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1, // 0-indexed month
      day: parseInt(parts[2], 10),
    };
  };

  // Check if date is selected
  const isSelected = (day: number): boolean => {
    const parsed = parseDateString(value);
    if (!parsed) return false;
    return (
      parsed.day === day &&
      parsed.month === currentMonth.getMonth() &&
      parsed.year === currentMonth.getFullYear()
    );
  };

  // Check if date is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  // Generate calendar days
  const renderCalendarDays = (): React.JSX.Element[] => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: React.JSX.Element[] = [];

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const selected = isSelected(day);
      const today = isToday(day);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleSelectDate(day)}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full font-public text-[13px] transition-colors ${
            selected
              ? "bg-[#030712] font-medium text-white"
              : today
              ? "bg-[#F3F4F6] font-medium text-[#030712] hover:bg-[#E5E7EB]"
              : "text-[#030712] hover:bg-[#F3F4F6]"
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={className} ref={containerRef}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        {/* Input field */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full cursor-pointer items-center rounded-lg border bg-white py-2 pl-10 pr-4 text-left font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors ${
            !value ? "text-[#9CA3AF]" : "text-[#030712]"
          } ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626]"
              : isOpen
              ? "border-[#030712]"
              : "border-[#E5E5E5] hover:border-[#D1D5DB]"
          }`}
        >
          {/* Calendar icon */}
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M12.6667 2.66667H3.33333C2.59667 2.66667 2 3.26333 2 4V13.3333C2 14.07 2.59667 14.6667 3.33333 14.6667H12.6667C13.4033 14.6667 14 14.07 14 13.3333V4C14 3.26333 13.4033 2.66667 12.6667 2.66667Z"
                stroke="#6A7282"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.6667 1.33333V4M5.33333 1.33333V4M2 6.66667H14"
                stroke="#6A7282"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Display value */}
          <span>{value ? formatDateForDisplay(value) : placeholder}</span>

          {/* Dropdown chevron */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="#6A7282"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>

        {/* Calendar dropdown */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-lg">
            {/* Header with month/year navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[#F3F4F6]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="#030712"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <span className="font-geist text-[14px] font-medium text-[#030712]">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>

              <button
                type="button"
                onClick={goToNextMonth}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[#F3F4F6]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="#030712"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Day names header */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex h-8 w-8 items-center justify-center font-public text-[11px] font-medium text-[#6A7282]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>

            {/* Today button */}
            <div className="mt-3 border-t border-[#E5E7EB] pt-3">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const isoDate = formatDateToISO(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );
                  onChange(isoDate);
                  setIsOpen(false);
                }}
                className="w-full cursor-pointer rounded-lg bg-[#F3F4F6] py-2 font-public text-[13px] font-medium text-[#030712] transition-colors hover:bg-[#E5E7EB]"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}
